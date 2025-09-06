// Media generation queue service for background job processing
import { MediaGenerationQueueRepository, QueueJobInput } from '../repositories/mediaGenerationQueueRepository';
import { MediaGenerationService } from './mediaGenerationService';
import { UserRepository } from '../repositories/userRepository';
import { VillageRepository } from '../repositories/villageRepository';
import { JobType } from '@prisma/client';

export class MediaGenerationQueueService {
  private isProcessing = false;

  constructor(
    public readonly repository: MediaGenerationQueueRepository, // Make public for polling access
    private mediaService: MediaGenerationService,
    private userRepository: UserRepository,
    private villageRepository: VillageRepository,
    private rateLimitDelayMs: number = 5000 // 5 second delay between API calls
  ) {}



  getIsProcessing(): boolean {
    return this.isProcessing;
  }

  // Enqueue new media generation job
  async enqueueJob(input: QueueJobInput): Promise<string> {
    console.log('Enqueuing media generation job', {
      event: 'queue_job_enqueued',
      userId: input.userId,
      command: input.command
    });

    const job = await this.repository.enqueue(input);

    if (!this.getIsProcessing()) {
      this.processNextJob();
    }

    return job.id;
  }

  // Process next job in queue (called by SchedulerService)
  async processNextJob(): Promise<void> {
    if (this.isProcessing) {
      return; // Prevent concurrent processing
    }

    // Use dependency-aware job retrieval
    const job = await this.repository.getNextPendingJobWithDependencies();
    if (!job) {
      return; // No jobs to process
    }

    this.isProcessing = true;

    try {
      console.log('Processing media generation job', {
        event: 'queue_job_processing',
        jobId: job.id,
        attempts: job.attempts + 1
      });

      // Mark as processing
      await this.repository.updateJobStatus(job.id, 'PROCESSING');

      // Process job based on type
      let result: any;
      if (job.jobType === 'BASELINE' || job.jobType === 'VILLAGE_BASELINE' || job.jobType === 'OBJECT_BASELINE') {
        result = await this.processBaselineJob(job);
      } else {
        result = await this.processMediaJob(job);
      }

      // Store result and mark complete
      const resultJson = JSON.stringify(result);
      await this.repository.updateJobStatus(job.id, 'COMPLETED', resultJson);

      console.log('Media generation job completed', {
        event: 'queue_job_completed',
        jobId: job.id
      });

      // Trigger dependent jobs
      await this.repository.markDependentJobsReady(job.id);

    } catch (error) {
      console.error('Media generation job failed', {
        event: 'queue_job_failed',
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error)
      });

      if (job.attempts + 1 < job.maxAttempts) {
        // Retry with exponential backoff
        await this.repository.retryJob(job.id);
        console.log('Job scheduled for retry', {
          event: 'queue_job_retry_scheduled',
          jobId: job.id,
          nextAttempt: job.attempts + 1
        });
      } else {
        // Mark as permanently failed
        await this.repository.updateJobStatus(job.id, 'FAILED', undefined, error instanceof Error ? error.message : String(error));
        console.warn('Job permanently failed after max attempts', {
          event: 'queue_job_permanently_failed',
          jobId: job.id
        });
      }
    } finally {
      this.isProcessing = false;

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelayMs));
    }
  }

  // Cleanup old completed jobs (called by SchedulerService)
  async cleanupJobs(): Promise<void> {
    await this.repository.cleanupCompletedJobs(24); // 24 hours
    console.log('Cleaned up old completed jobs', {
      event: 'queue_cleanup_completed'
    });
  }

  // Enqueue job with dependency support
  async enqueueJobWithDependency(input: QueueJobInput, parentJobId?: string, jobType?: JobType): Promise<string> {
    console.log('Enqueuing media generation job with dependency', {
      event: 'queue_job_enqueued_with_dependency',
      userId: input.userId,
      command: input.command,
      parentJobId,
      jobType
    });

    const job = await this.repository.enqueue({
      ...input,
      parentJobId,
      jobType,
      scheduledAt: parentJobId ? new Date('2099-01-01') : new Date() // Block dependent jobs until parent completes
    });

    if (!this.getIsProcessing()) {
      this.processNextJob();
    }

    return job.id;
  }

  // Process baseline-specific jobs
  private async processBaselineJob(job: any): Promise<any> {
    const user = await this.userRepository.findById(job.userId);
    if (!user) {
      throw new Error(`User not found: ${job.userId}`);
    }

    if (job.jobType === 'BASELINE') {
      // Generate user baseline
      const mediaData = await this.mediaService.generateMedia({
        prompt: job.prompt || `Generate a baseline image for user ${user.displayName || user.discordId}`,
        type: 'image'
      });
      return { type: 'baseline', url: mediaData.url };

    } else if (job.jobType === 'VILLAGE_BASELINE') {
      // Generate village baseline
      const mediaData = await this.mediaService.generateMedia({
        prompt: job.prompt || `Generate a village baseline scene`,
        type: 'image'
      });
      return { type: 'village-baseline', url: mediaData.url };

    } else if (job.jobType === 'OBJECT_BASELINE') {
      // Generate object baseline
      const mediaData = await this.mediaService.generateMedia({
        prompt: job.prompt || `Generate a village object baseline`,
        type: 'image'
      });
      return { type: 'object-baseline', url: mediaData.url };
    }

    throw new Error(`Unknown baseline job type: ${job.jobType}`);
  }



  // Process regular media generation jobs
  private async processMediaJob(job: any): Promise<any> {
    // Fetch user to get baseline URL
    const user = await this.userRepository.findById(job.userId);
    const baselineImageUrl = user?.baselineUrl;

    const mediaData = await this.mediaService.generateMedia({
      prompt: job.prompt || `Generate media for command: ${job.command}`,
      type: 'image',
      baselineImageUrl: baselineImageUrl || undefined,
    });

    return {
      type: 'image',
      url: mediaData.url,
      filename: mediaData.filename,
      mimeType: 'image/png',
    };
  }
}