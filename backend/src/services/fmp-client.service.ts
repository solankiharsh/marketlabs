/**
 * Financial Modeling Prep (FMP) Client Service - For fetching news articles
 * Based on cur8-news implementation
 */

import { env } from '../lib/env';

// Symbol mappings for FMP news
const FMP_SYMBOL_MAP: Record<string, string> = {
  'btc': 'BTCUSD',
  'bitcoin': 'BTCUSD',
  'cryBTCUSD': 'BTCUSD',
  'eth': 'ETHUSD',
  'ethereum': 'ETHUSD',
  'cryETHUSD': 'ETHUSD',
  'gold': 'XAUUSD',
  'xauusd': 'XAUUSD',
  'frxXAUUSD': 'XAUUSD',
  'silver': 'XAGUSD',
  'xagusd': 'XAGUSD',
  'frxXAGUSD': 'XAGUSD',
  'eurusd': 'EURUSD',
  'frxEURUSD': 'EURUSD',
  'usdjpy': 'USDJPY',
  'frxUSDJPY': 'USDJPY',
  'gbpusd': 'GBPUSD',
  'frxGBPUSD': 'GBPUSD',
  'oil': 'CL',
  'wti': 'CL',
  'crude': 'CL',
};

export interface FMPNewsArticle {
  symbol: string;
  publishedDate: string;
  title: string;
  image: string;
  site: string;
  text: string;
  url: string;
}

export class FMPClientService {
  private apiKey: string | null;
  private baseUrl: string = 'https://financialmodelingprep.com/api/v3';

  constructor() {
    this.apiKey = env.FMP_API_KEY || null;
  }

  /**
   * Check if FMP is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get news for a symbol
   */
  async getNews(
    symbol: string,
    limit: number = 50
  ): Promise<FMPNewsArticle[]> {
    if (!this.isConfigured()) {
      console.warn('[FMP] API key not configured, skipping news fetch');
      return [];
    }

    try {
      // Map symbol to FMP format
      const normalizedSymbol = symbol.toLowerCase();
      const fmpSymbol = FMP_SYMBOL_MAP[normalizedSymbol] || normalizedSymbol.toUpperCase();

      // Skip symbols that don't map well to FMP (like volatility indices)
      if (!FMP_SYMBOL_MAP[normalizedSymbol] && !['BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD', 'EURUSD', 'GBPUSD', 'USDJPY'].includes(fmpSymbol)) {
        console.log(`[FMP] Skipping ${symbol} (${fmpSymbol}) - not a supported symbol`);
        return [];
      }

      const url = `${this.baseUrl}/stock_news?tickers=${fmpSymbol}&limit=${limit}&apikey=${this.apiKey}`;
      console.log(`[FMP] Fetching news for ${symbol} (${fmpSymbol})`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MarketLabs/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          console.warn(`[FMP] 403 Forbidden for ${symbol} (${fmpSymbol}) - may be rate limited or unsupported symbol`);
        } else {
          console.error(`[FMP] API error: ${response.status} ${response.statusText}`);
        }
        return [];
      }

      const data = await response.json();

      // Handle error responses
      if (data.Error || (Array.isArray(data) && data.length === 0)) {
        console.warn(`[FMP] No news found for ${symbol}`);
        return [];
      }

      // FMP returns array directly
      const articles = Array.isArray(data) ? data : [];

      console.log(`[FMP] Fetched ${articles.length} articles for ${symbol}`);

      return articles.map((article: any) => ({
        symbol: article.symbol || fmpSymbol,
        publishedDate: article.publishedDate || article.date || new Date().toISOString(),
        title: article.title || '',
        image: article.image || '',
        site: article.site || article.source || 'FMP',
        text: article.text || article.content || '',
        url: article.url || '',
      }));
    } catch (error: any) {
      console.error(`[FMP] Failed to fetch news for ${symbol}:`, error.message);
      return [];
    }
  }

  /**
   * Get general market news (no symbol filter)
   */
  async getGeneralNews(limit: number = 50): Promise<FMPNewsArticle[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const url = `${this.baseUrl}/stock_news?limit=${limit}&apikey=${this.apiKey}`;
      console.log(`[FMP] Fetching general market news`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MarketLabs/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          console.warn(`[FMP] 403 Forbidden for ${symbol} (${fmpSymbol}) - may be rate limited or unsupported symbol`);
        } else {
          console.error(`[FMP] API error: ${response.status} ${response.statusText}`);
        }
        return [];
      }

      const data = await response.json();

      if (data.Error || !Array.isArray(data)) {
        return [];
      }

      return data.map((article: any) => ({
        symbol: article.symbol || 'GENERAL',
        publishedDate: article.publishedDate || article.date || new Date().toISOString(),
        title: article.title || '',
        image: article.image || '',
        site: article.site || article.source || 'FMP',
        text: article.text || article.content || '',
        url: article.url || '',
      }));
    } catch (error: any) {
      console.error(`[FMP] Failed to fetch general news:`, error.message);
      return [];
    }
  }
}

let fmpClientService: FMPClientService | null = null;

export function getFMPClientService(): FMPClientService {
  if (!fmpClientService) {
    fmpClientService = new FMPClientService();
  }
  return fmpClientService;
}

