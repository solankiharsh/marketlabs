/**
 * Scan Job Service - Wraps market scanner in job context
 */

import { getMarketScannerService } from './market-scanner.service';
import { getJobQueueService } from './job-queue.service';
import { getDerivDataService } from './deriv-data.service';

export class ScanJobService {
  /**
   * Process a scan job asynchronously
   */
  async processScanJob(jobId: string): Promise<void> {
    const jobQueue = getJobQueueService();
    const scanner = getMarketScannerService();
    const derivService = getDerivDataService();

    // Check if already processing
    if (!(await jobQueue.startProcessing(jobId))) {
      console.log(`[ScanJob] Job ${jobId} is already being processed`);
      return;
    }

    try {
      // Get all assets to scan
      const assets = await derivService.getAllTrackedAssets();
      const totalAssets = assets.length;

      await jobQueue.updateJobStatus(jobId, {
        totalAssets,
        progress: 0,
        scannedAssets: 0,
      });

      // Scan assets one by one, updating progress
      const results: any[] = [];
      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        const result = await scanner.scanAsset(asset);

        if (result) {
          results.push(result);
        }

        // Update progress
        const progress = Math.round(((i + 1) / totalAssets) * 100);
        await jobQueue.updateJobStatus(jobId, {
          progress,
          scannedAssets: i + 1,
        });
      }

      // Mark job as completed
      await jobQueue.updateJobStatus(jobId, {
        status: 'completed',
        progress: 100,
        results: {
          scanned: results.length,
          total: totalAssets,
          results,
        },
      });

      console.log(`[ScanJob] Job ${jobId} completed: ${results.length}/${totalAssets} assets scanned`);
    } catch (error: any) {
      console.error(`[ScanJob] Job ${jobId} failed:`, error);
      await jobQueue.updateJobStatus(jobId, {
        status: 'failed',
        error: error.message || 'Unknown error',
      });
    } finally {
      await jobQueue.finishProcessing(jobId);
    }
  }

  /**
   * Start processing a job in the background (non-blocking)
   */
  async startJobAsync(jobId: string): Promise<void> {
    // Process in background (don't await)
    this.processScanJob(jobId).catch((error) => {
      console.error(`[ScanJob] Background job ${jobId} error:`, error);
    });
  }
}

let scanJobService: ScanJobService | null = null;

export function getScanJobService(): ScanJobService {
  if (!scanJobService) {
    scanJobService = new ScanJobService();
  }
  return scanJobService;
}

