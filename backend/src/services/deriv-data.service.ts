/**
 * Deriv Data Service - Fetches market data from Deriv API
 */

import WebSocket from 'ws';
import { env } from '../lib/env';

export interface DerivSymbol {
  symbol: string;
  displayName: string;
  market: string;
  category: 'forex' | 'crypto' | 'commodities' | 'indices';
}

export interface DerivPrice {
  symbol: string;
  bid: number;
  ask: number;
  quote: number;
  timestamp: number;
}

export interface DerivOHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  time: number; // milliseconds
  timestamp?: number; // seconds (for compatibility)
}

// Symbol mappings for base symbols to Deriv symbols (matching satori-x)
const SYMBOL_MAP: Record<string, string> = {
  'btc': 'cryBTCUSD',
  'bitcoin': 'cryBTCUSD',
  'gold': 'frxXAUUSD',
  'xauusd': 'frxXAUUSD',
  'silver': 'frxXAGUSD',
  'xagusd': 'frxXAGUSD',
  'eurusd': 'frxEURUSD',
  'usdjpy': 'frxUSDJPY',
};

// Base symbols supported for real-time price fetching
const BASE_SYMBOLS = new Set(['btc', 'bitcoin', 'gold', 'xauusd', 'silver', 'xagusd', 'eurusd', 'usdjpy']);

class DerivDataService {
  private ws: WebSocket | null = null;
  private appId: string;
  private wsUrl: string;
  private connected: boolean = false;
  private requestId: number = 0;
  private pendingRequests: Map<number, { resolve: (value: any) => void; reject: (error: any) => void }> = new Map();

  constructor() {
    this.appId = env.DERIV_APP_ID || '1089';
    this.wsUrl = env.DERIV_WS_URL || 'wss://ws.binaryws.com/websockets/v3';
  }

  async connect(): Promise<void> {
    if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const url = `${this.wsUrl}?app_id=${this.appId}`;
        this.ws = new WebSocket(url);

        this.ws.on('open', () => {
          this.connected = true;
          console.log('[DerivData] Connected to Deriv WebSocket');
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const response = JSON.parse(data.toString());
            
            // Deriv API returns req_id at top level or in echo_req
            let reqId = response.req_id;
            if (!reqId && response.echo_req) {
              reqId = response.echo_req.req_id;
            }
            
            // Log for debugging
            if (reqId) {
              console.log(`[DerivData] Received response for req_id ${reqId}, msg_type: ${response.msg_type}`);
            }
            
            // Check if this is a response to a pending request
            if (reqId && this.pendingRequests.has(reqId)) {
              const { resolve } = this.pendingRequests.get(reqId)!;
              this.pendingRequests.delete(reqId);
              console.log(`[DerivData] Resolving request ${reqId}`);
              resolve(response);
              return;
            }
            
            // Handle errors - reject the first pending request
            if (response.error) {
              console.error('[DerivData] API error:', response.error);
              const firstPending = Array.from(this.pendingRequests.entries())[0];
              if (firstPending) {
                const [id, { reject }] = firstPending;
                this.pendingRequests.delete(id);
                reject(new Error(response.error.message || response.error.code || 'Deriv API error'));
              }
              return;
            }
            
            // Handle subscription messages (forget, tick) - ignore if no pending request
            if (response.msg_type === 'forget' || (response.msg_type === 'tick' && !reqId)) {
              // These are subscription-related, not request responses
              return;
            }
            
            // Log unmatched responses for debugging
            if (!reqId) {
              console.warn('[DerivData] Received response without req_id:', response.msg_type);
            } else {
              console.warn(`[DerivData] Received response for unknown req_id ${reqId}`);
            }
          } catch (error) {
            console.error('[DerivData] Error parsing message:', error);
          }
        });

        this.ws.on('error', (error) => {
          console.error('[DerivData] WebSocket error:', error);
          this.connected = false;
          reject(error);
        });

        this.ws.on('close', () => {
          console.log('[DerivData] WebSocket closed');
          this.connected = false;
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private async sendRequest(request: any): Promise<any> {
    if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    const reqId = ++this.requestId;
    const requestWithId = { ...request, req_id: reqId };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(reqId, { resolve, reject });

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log(`[DerivData] Sending request ${reqId}:`, JSON.stringify(requestWithId).substring(0, 100));
        this.ws.send(JSON.stringify(requestWithId));
      } else {
        this.pendingRequests.delete(reqId);
        reject(new Error('WebSocket not connected'));
        return;
      }

      // Timeout after 15 seconds (increased for OHLCV requests)
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(reqId)) {
          this.pendingRequests.delete(reqId);
          console.error(`[DerivData] Request ${reqId} timed out`);
          reject(new Error(`Request timeout after 15s: ${JSON.stringify(request).substring(0, 50)}`));
        }
      }, 15000);
      
      // Store timeout to clear if resolved
      const originalResolve = this.pendingRequests.get(reqId)?.resolve;
      if (originalResolve) {
        this.pendingRequests.set(reqId, {
          resolve: (value) => {
            clearTimeout(timeout);
            originalResolve(value);
          },
          reject: (error) => {
            clearTimeout(timeout);
            reject(error);
          },
        });
      }
    });
  }

  /**
   * Get active symbols for a category
   */
  async getActiveSymbols(category: 'forex' | 'crypto' | 'commodities' | 'indices'): Promise<DerivSymbol[]> {
    try {
      console.log(`[DerivData] Fetching ${category} symbols...`);
      
      // Deriv API requires active_symbols: "brief" or "full", and product_type: "basic"
      const response = await this.sendRequest({
        active_symbols: 'brief',
        product_type: 'basic',
      });

      console.log(`[DerivData] Response keys:`, Object.keys(response));
      
      const symbols = response.active_symbols || [];
      console.log(`[DerivData] Found ${symbols.length} raw symbols total`);
      
      if (symbols.length === 0) {
        console.warn(`[DerivData] No symbols returned. Response:`, JSON.stringify(response).substring(0, 200));
        return [];
      }
      
      // Filter by category based on symbol patterns or market
      const categoryPatterns: Record<string, (s: any) => boolean> = {
        forex: (s: any) => s.symbol?.startsWith('frx') && !s.symbol?.includes('XAU') && !s.symbol?.includes('XAG') && !s.symbol?.includes('XPD'),
        crypto: (s: any) => s.symbol?.startsWith('cry'),
        commodities: (s: any) => s.symbol?.includes('XAU') || s.symbol?.includes('XAG') || s.symbol?.includes('XPD') || s.market_display_name?.toLowerCase().includes('commodit'),
        indices: (s: any) => s.symbol?.startsWith('R_') || s.symbol?.startsWith('1HZ') || s.market_display_name?.toLowerCase().includes('synthetic'),
      };
      
      const filterFn = categoryPatterns[category];
      const filtered = filterFn 
        ? symbols.filter((s: any) => {
            const matchesCategory = filterFn(s);
            const isOpen = s.exchange_is_open === 1 || s.exchange_is_open === undefined;
            return matchesCategory && isOpen;
          })
        : symbols.filter((s: any) => s.exchange_is_open === 1 || s.exchange_is_open === undefined);
      
      console.log(`[DerivData] After filtering for ${category}: ${filtered.length} symbols`);
      
      return filtered.map((s: any) => ({
        symbol: s.symbol || s.symbol_name || '',
        displayName: s.display_name || s.name || s.symbol || '',
        market: s.market_display_name || s.market || category,
        category,
      }));
    } catch (error) {
      console.error(`[DerivData] Failed to fetch ${category} symbols:`, error);
      return [];
    }
  }

  /**
   * Get Deriv symbol from base symbol (matching satori-x approach)
   */
  private getDerivSymbol(symbol: string): string {
    const normalized = symbol.toLowerCase();
    return SYMBOL_MAP[normalized] || symbol;
  }

  /**
   * Check if symbol is a base symbol (not a contract symbol)
   */
  private isBaseSymbol(symbol: string): boolean {
    const normalized = symbol.toLowerCase();
    return BASE_SYMBOLS.has(normalized) || SYMBOL_MAP[normalized] !== undefined;
  }

  /**
   * Get current price for a symbol
   * Uses ticks endpoint (not ticks_history) for real-time data, matching satori-x approach
   */
  async getPrice(symbol: string): Promise<DerivPrice | null> {
    try {
      // Map base symbols to Deriv symbols (e.g., 'btc' -> 'cryBTCUSD')
      const derivSymbol = this.getDerivSymbol(symbol);
      
      // Use ticks endpoint with subscribe: 1 to get a single tick (matching satori-x)
      // This is the correct endpoint for real-time prices, not ticks_history
      const response = await this.sendRequest({
        ticks: derivSymbol,
        subscribe: 1,
      });

      // Check for errors
      if (response.error) {
        console.warn(`[DerivData] API error for ${symbol}:`, response.error);
        return null;
      }

      // Handle tick response format (from ticks endpoint)
      if (response.tick) {
        const tick = response.tick;
        const quote = parseFloat(tick.quote || '0');
        const bid = parseFloat(tick.bid || tick.quote || '0');
        const ask = parseFloat(tick.ask || tick.quote || '0');

        // Unsubscribe immediately after getting the tick
        const subscriptionId = response.subscription?.id;
        if (subscriptionId) {
          try {
            await this.sendRequest({ forget: subscriptionId });
          } catch (e) {
            // Ignore unsubscribe errors
          }
        }

        return {
          symbol: derivSymbol,
          bid,
          ask,
          quote,
          timestamp: tick.epoch || Date.now() / 1000,
        };
      }

      // Fallback: Try to parse as history format (for backward compatibility)
      if (response.history?.prices && response.history.prices.length > 0) {
        const price = response.history.prices[response.history.prices.length - 1];
        const time = response.history.times?.[response.history.times.length - 1] || Date.now() / 1000;
        
        return {
          symbol: derivSymbol,
          bid: price,
          ask: price,
          quote: price,
          timestamp: time,
        };
      }

      console.warn(`[DerivData] No tick data for ${symbol}. Response:`, JSON.stringify(response).substring(0, 200));
      return null;
    } catch (error) {
      console.error(`[DerivData] Failed to fetch price for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get OHLCV data for a symbol
   * Uses ticks_history endpoint with style="candles" (matching satori-x)
   */
  async getOHLCV(
    symbol: string,
    count: number = 100,
    granularity: number = 60 // 1 minute
  ): Promise<DerivOHLCV[]> {
    try {
      // Map base symbols to Deriv symbols
      const derivSymbol = this.getDerivSymbol(symbol);
      
      // Calculate start time (count candles back from now)
      const end = Math.floor(Date.now() / 1000);
      const start = end - (count * granularity); // Approximate start time

      const response = await this.sendRequest({
        ticks_history: derivSymbol,
        adjust_start_time: 1,
        count: count,
        end: 'latest',
        start: start,
        style: 'candles', // Critical: must be "candles" not "ticks"
        granularity: granularity,
      });

      // Check for errors
      if (response.error) {
        if (response.error.code === 'MarketIsClosed') {
          console.warn(`[DerivData] Market closed for ${symbol}, returning empty OHLCV`);
          return [];
        }
        console.warn(`[DerivData] API error for OHLCV ${symbol}:`, response.error);
        return [];
      }

      // Response format: { candles: [...] } (not { ohlc: { candles: [...] } })
      const candles = response.candles || [];

      if (candles.length === 0) {
        console.warn(`[DerivData] No OHLCV candles for ${symbol}`);
        return [];
      }

      return candles.map((c: any) => {
        const epoch = c.epoch || Date.now() / 1000;
        return {
          open: parseFloat(c.open || '0'),
          high: parseFloat(c.high || '0'),
          low: parseFloat(c.low || '0'),
          close: parseFloat(c.close || '0'),
          volume: c.volume ? parseFloat(c.volume) : undefined,
          time: epoch * 1000, // milliseconds
          timestamp: epoch, // seconds (for compatibility)
        };
      });
    } catch (error: any) {
      console.error(`[DerivData] Failed to fetch OHLCV for ${symbol}:`, error.message || error);
      return [];
    }
  }

  /**
   * Get fallback list of common Deriv symbols (used if API fails)
   */
  private getFallbackSymbols(): DerivSymbol[] {
    return [
      // Forex
      { symbol: 'frxEURUSD', displayName: 'EUR/USD', market: 'Forex', category: 'forex' },
      { symbol: 'frxGBPUSD', displayName: 'GBP/USD', market: 'Forex', category: 'forex' },
      { symbol: 'frxUSDJPY', displayName: 'USD/JPY', market: 'Forex', category: 'forex' },
      { symbol: 'frxAUDUSD', displayName: 'AUD/USD', market: 'Forex', category: 'forex' },
      { symbol: 'frxUSDCAD', displayName: 'USD/CAD', market: 'Forex', category: 'forex' },
      // Crypto
      { symbol: 'cryBTCUSD', displayName: 'Bitcoin/USD', market: 'Crypto', category: 'crypto' },
      { symbol: 'cryETHUSD', displayName: 'Ethereum/USD', market: 'Crypto', category: 'crypto' },
      { symbol: 'cryLTCUSD', displayName: 'Litecoin/USD', market: 'Crypto', category: 'crypto' },
      // Commodities
      { symbol: 'frxXAUUSD', displayName: 'Gold/USD', market: 'Commodities', category: 'commodities' },
      { symbol: 'frxXAGUSD', displayName: 'Silver/USD', market: 'Commodities', category: 'commodities' },
      { symbol: 'frxXPDUSD', displayName: 'Palladium/USD', market: 'Commodities', category: 'commodities' },
      // Indices (Synthetic)
      { symbol: 'R_10', displayName: 'Volatility 10 Index', market: 'Indices', category: 'indices' },
      { symbol: 'R_25', displayName: 'Volatility 25 Index', market: 'Indices', category: 'indices' },
      { symbol: 'R_50', displayName: 'Volatility 50 Index', market: 'Indices', category: 'indices' },
      { symbol: 'R_75', displayName: 'Volatility 75 Index', market: 'Indices', category: 'indices' },
      { symbol: 'R_100', displayName: 'Volatility 100 Index', market: 'Indices', category: 'indices' },
      { symbol: '1HZ100V', displayName: '100 Volatility Index', market: 'Indices', category: 'indices' },
      { symbol: '1HZ150V', displayName: '150 Volatility Index', market: 'Indices', category: 'indices' },
      { symbol: '1HZ200V', displayName: '200 Volatility Index', market: 'Indices', category: 'indices' },
    ];
  }

  /**
   * Get all tracked assets (20+ assets across categories)
   * Filters out contract symbols and prioritizes base symbols for BTC/Gold/Silver
   */
  async getAllTrackedAssets(): Promise<DerivSymbol[]> {
    const categories: Array<'forex' | 'crypto' | 'commodities' | 'indices'> = [
      'forex',
      'crypto',
      'commodities',
      'indices',
    ];

    const allSymbols: DerivSymbol[] = [];
    
    // First, add base symbols for BTC, ETH, Gold, Silver (matching satori-x priority)
    const baseSymbols: DerivSymbol[] = [
      { symbol: 'cryBTCUSD', displayName: 'Bitcoin/USD', market: 'Crypto', category: 'crypto' },
      { symbol: 'cryETHUSD', displayName: 'Ethereum/USD', market: 'Crypto', category: 'crypto' },
      { symbol: 'frxXAUUSD', displayName: 'Gold/USD', market: 'Commodities', category: 'commodities' },
      { symbol: 'frxXAGUSD', displayName: 'Silver/USD', market: 'Commodities', category: 'commodities' },
    ];
    allSymbols.push(...baseSymbols);

    for (const category of categories) {
      const symbols = await this.getActiveSymbols(category);
      console.log(`[DerivData] Got ${symbols.length} symbols from ${category}`);
      
      // Filter out contract symbols (indices like R_100, 1HZ90V) and prioritize base symbols
      const filtered = symbols.filter((s: DerivSymbol) => {
        // Skip contract symbols (volatility indices)
        if (s.symbol.startsWith('R_') || s.symbol.startsWith('1HZ')) {
          return false;
        }
        // Skip if already added as base symbol
        return !allSymbols.some(existing => existing.symbol === s.symbol);
      });
      
      allSymbols.push(...filtered);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Limit to top symbols per category to keep total around 20-30
      if (allSymbols.length >= 25) break;
    }

    console.log(`[DerivData] Total symbols collected: ${allSymbols.length}`);
    
    // If API returned no symbols (except base symbols), use fallback list
    if (allSymbols.length <= baseSymbols.length) {
      console.warn('[DerivData] No symbols from API, using fallback list');
      const fallback = this.getFallbackSymbols();
      // Filter out contract symbols from fallback too
      const filteredFallback = fallback.filter(s => !s.symbol.startsWith('R_') && !s.symbol.startsWith('1HZ'));
      return [...baseSymbols, ...filteredFallback].slice(0, 25);
    }
    
    return allSymbols.slice(0, 25); // Return top 25 assets
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.connected = false;
    }
  }
}

// Singleton instance
let derivDataService: DerivDataService | null = null;

export function getDerivDataService(): DerivDataService {
  if (!derivDataService) {
    derivDataService = new DerivDataService();
  }
  return derivDataService;
}

