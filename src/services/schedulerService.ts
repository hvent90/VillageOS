// Scheduler service for background tasks
import * as cron from 'node-cron';
import { MediaGenerationQueueService } from './mediaGenerationQueueService';

export class SchedulerService {
  private queueService?: MediaGenerationQueueService;

  constructor(gameLogic: any, queueService?: MediaGenerationQueueService) {
    this.queueService = queueService;
  }

  startJobs(): void {
    console.log('Scheduler service initialized');

    // Schedule queue processing if queue service is available
    if (this.queueService) {
      this.scheduleQueueProcessing();
      this.scheduleQueueCleanup();
    }
  }

  private scheduleQueueProcessing(): void {
    // Run every 30 seconds to process queue jobs
    cron.schedule('*/1 * * * * *', async () => {
      if (!this.queueService || this.queueService.getIsProcessing()) return;

      try {
        await this.queueService.processNextJob();
      } catch (error) {
        console.error('Error during queue processing:', error);
      }
    });
  }

  private scheduleQueueCleanup(): void {
    // Run every hour to cleanup old completed jobs
    cron.schedule('0 * * * *', async () => {
      if (!this.queueService) return;

      try {
        await this.queueService.cleanupJobs();
      } catch (error) {
        console.error('Error during queue cleanup:', error);
      }
    });
  }
}
