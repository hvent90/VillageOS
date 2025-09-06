// Media generation queue repository for managing job persistence
import { prisma } from '../config/database';
import { MediaGenerationQueue, JobStatus, JobType } from '@prisma/client';

// Type aliases for clarity
type MediaGenerationJob = MediaGenerationQueue;

export interface QueueJobInput {
  userId: string;
  command: string;
  prompt: string;
  priority?: number;
  parentJobId?: string;
  jobType?: JobType;
  scheduledAt?: Date;
}

export class MediaGenerationQueueRepository {
  // Get next job to process (ordered by priority, then created time)
  async getNextPendingJob(): Promise<MediaGenerationJob | null> {
    return prisma.mediaGenerationQueue.findFirst({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: new Date() }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });
  }

  // Create new job
  async enqueue(job: QueueJobInput): Promise<MediaGenerationJob> {
    return prisma.mediaGenerationQueue.create({
      data: {
        userId: job.userId,
        command: job.command,
        prompt: job.prompt,
        priority: job.priority || 0,
        status: 'PENDING',
        parentJobId: job.parentJobId || null,
        jobType: job.jobType || 'ACTION_IMAGE',
        scheduledAt: job.scheduledAt || new Date()
      }
    });
  }

  // Update job status and result
  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    result?: string,
    error?: string
  ): Promise<void> {
    await prisma.mediaGenerationQueue.update({
      where: { id: jobId },
      data: {
        status,
        result,
        error,
        completedAt: status === 'COMPLETED' || status === 'FAILED' ? new Date() : undefined
      }
    });
  }

  // Get job by ID for completion handling
  async getJobById(jobId: string): Promise<MediaGenerationJob | null> {
    return prisma.mediaGenerationQueue.findUnique({
      where: { id: jobId }
    });
  }

  // Cleanup old completed jobs (following ActionCooldown pattern)
  async cleanupCompletedJobs(olderThanHours: number = 24): Promise<void> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    await prisma.mediaGenerationQueue.deleteMany({
      where: {
        status: { in: ['COMPLETED', 'FAILED'] },
        completedAt: { lt: cutoff }
      }
    });
  }

  // Retry failed job with backoff
  async retryJob(jobId: string): Promise<void> {
    const job = await prisma.mediaGenerationQueue.findUnique({
      where: { id: jobId }
    });

    if (!job || job.attempts >= job.maxAttempts) {
      return;
    }

    // Exponential backoff: 2^attempts minutes
    const backoffMinutes = Math.pow(2, job.attempts);
    const scheduledAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

    await prisma.mediaGenerationQueue.update({
      where: { id: jobId },
      data: {
        status: 'RETRYING',
        attempts: job.attempts + 1,
        scheduledAt
      }
    });
  }

  // Get next job considering dependencies
  async getNextPendingJobWithDependencies(): Promise<MediaGenerationJob | null> {
    return prisma.mediaGenerationQueue.findFirst({
      where: {
        status: 'PENDING',
        scheduledAt: {
          lte: new Date(),
        },
        OR: [
          // Jobs with no dependencies
          { parentJobId: null },
          // Jobs whose parent is completed
          {
            parentJob: {
              status: 'COMPLETED'
            }
          }
        ]
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });
  }

  // Find child jobs for a parent job
  async findChildJobs(parentJobId: string): Promise<MediaGenerationJob[]> {
    return prisma.mediaGenerationQueue.findMany({
      where: { parentJobId },
      orderBy: { priority: 'desc' }
    });
  }

  // Mark dependent jobs ready when parent completes
  async markDependentJobsReady(parentJobId: string): Promise<void> {
    await prisma.mediaGenerationQueue.updateMany({
      where: {
        parentJobId,
        status: 'PENDING'
      },
      data: {
        scheduledAt: new Date() // Make immediately available
      }
    });
  }

  // Get completed media jobs for a user
  async getCompletedJobsByUserId(userId: string): Promise<MediaGenerationJob[]> {
    return prisma.mediaGenerationQueue.findMany({
      where: {
        userId,
        status: 'COMPLETED'
      },
      orderBy: { completedAt: 'desc' }
    });
  }
}