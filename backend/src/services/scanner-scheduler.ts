/**
 * Scanner Scheduler - Background worker to run market scans periodically
 */

import { getMarketScannerService } from './market-scanner.service';

export class ScannerScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private scanIntervalMinutes: number = 5; // Default: scan every 5 minutes

  constructor(scanIntervalMinutes: number = 5) {
    this.scanIntervalMinutes = scanIntervalMinutes;
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log('[ScannerScheduler] Already running');
      return;
    }

    console.log(`[ScannerScheduler] Starting with ${this.scanIntervalMinutes} minute interval`);
    this.isRunning = true;

    // Run initial scan immediately
    this.runScan().catch((error) => {
      console.error('[ScannerScheduler] Initial scan failed:', error);
    });

    // Schedule periodic scans
    const intervalMs = this.scanIntervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.runScan().catch((error) => {
        console.error('[ScannerScheduler] Scheduled scan failed:', error);
      });
    }, intervalMs);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('[ScannerScheduler] Stopping');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Run a single scan
   */
  private async runScan(): Promise<void> {
    const startTime = Date.now();
    console.log('[ScannerScheduler] Running market scan...');

    try {
      const scanner = getMarketScannerService();
      const results = await scanner.scanAllAssets();

      const duration = Date.now() - startTime;
      console.log(`[ScannerScheduler] Scan complete in ${duration}ms: ${results.length} assets scanned`);
    } catch (error) {
      console.error('[ScannerScheduler] Scan error:', error);
      throw error;
    }
  }

  /**
   * Manually trigger a scan
   */
  async triggerScan(): Promise<void> {
    await this.runScan();
  }
}

// Global scheduler instance
let globalScheduler: ScannerScheduler | null = null;

export function createScannerScheduler(scanIntervalMinutes: number = 5): ScannerScheduler {
  if (globalScheduler) {
    return globalScheduler;
  }

  globalScheduler = new ScannerScheduler(scanIntervalMinutes);
  return globalScheduler;
}

export function getScannerScheduler(): ScannerScheduler | null {
  return globalScheduler;
}

