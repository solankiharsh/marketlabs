/**
 * Job Queue Service - Simple in-memory job queue for async processing
 * Can be upgraded to Redis/BullMQ for production
 */

import { db } from '../lib/db';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface JobResult {
  scanned: number;
  total: number;
  results: any[];
}

export class JobQueueService {
  private processingQueue: Set<string> = new Set();

  /**
   * Create a new scan job
   */
  async createJob(): Promise<string> {
    const job = await db.scanJob.create({
      data: {
        status: 'pending',
        progress: 0,
        scannedAssets: 0,
      },
    });

    return job.id;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string) {
    const job = await db.scanJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return null;
    }

    return {
      id: job.id,
      status: job.status as JobStatus,
      progress: job.progress,
      totalAssets: job.totalAssets,
      scannedAssets: job.scannedAssets,
      results: job.results as JobResult | null,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    };
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    jobId: string,
    updates: {
      status?: JobStatus;
      progress?: number;
      totalAssets?: number;
      scannedAssets?: number;
      results?: JobResult;
      error?: string;
    }
  ): Promise<void> {
    const updateData: any = { ...updates };
    
    if (updates.status === 'completed' || updates.status === 'failed') {
      updateData.completedAt = new Date();
    }

    await db.scanJob.update({
      where: { id: jobId },
      data: updateData,
    });
  }

  /**
   * Process a job (mark as processing and return if already processing)
   */
  async startProcessing(jobId: string): Promise<boolean> {
    if (this.processingQueue.has(jobId)) {
      return false; // Already processing
    }

    this.processingQueue.add(jobId);
    await this.updateJobStatus(jobId, { status: 'processing' });
    return true;
  }

  /**
   * Finish processing a job
   */
  async finishProcessing(jobId: string): Promise<void> {
    this.processingQueue.delete(jobId);
  }

  /**
   * Check if job is currently being processed
   */
  isProcessing(jobId: string): boolean {
    return this.processingQueue.has(jobId);
  }
}

let jobQueueService: JobQueueService | null = null;

export function getJobQueueService(): JobQueueService {
  if (!jobQueueService) {
    jobQueueService = new JobQueueService();
  }
  return jobQueueService;
}

