/**
 * News Scheduler Service - Periodically fetches and stores news
 */

import { getNewsService } from './news.service';
import { db } from '../lib/db';

export class NewsSchedulerService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Start periodic news fetching
   */
  start(intervalMinutes: number = 60) {
    if (this.isRunning) {
      console.log('[NewsScheduler] Already running');
      return;
    }

    this.isRunning = true;
    console.log(`[NewsScheduler] Starting news scheduler (every ${intervalMinutes} minutes)`);

    // Fetch immediately
    this.fetchNewsForAllAssets();

    // Then fetch periodically
    this.intervalId = setInterval(() => {
      this.fetchNewsForAllAssets();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop periodic news fetching
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[NewsScheduler] Stopped');
  }

  /**
   * Fetch news for all active assets
   */
  private async fetchNewsForAllAssets() {
    try {
      console.log('[NewsScheduler] Fetching news for all assets...');
      
      const assets = await db.marketAsset.findMany({
        where: { active: true },
        take: 20, // Limit to top 20 assets
      });

      const newsService = getNewsService();

      // Fetch news for each asset (with delay to avoid rate limits)
      for (const asset of assets) {
        try {
          await newsService.aggregateNews(asset.symbol);
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`[NewsScheduler] Error fetching news for ${asset.symbol}:`, error);
        }
      }

      console.log(`[NewsScheduler] Completed fetching news for ${assets.length} assets`);
    } catch (error) {
      console.error('[NewsScheduler] Error in fetchNewsForAllAssets:', error);
    }
  }
}

let newsSchedulerService: NewsSchedulerService | null = null;

export function getNewsSchedulerService(): NewsSchedulerService {
  if (!newsSchedulerService) {
    newsSchedulerService = new NewsSchedulerService();
  }
  return newsSchedulerService;
}

