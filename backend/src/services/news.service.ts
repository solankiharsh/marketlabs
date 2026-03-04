/**
 * News Service - Aggregates news from multiple sources
 * Inspired by cur8-news structure
 */

import { db } from '../lib/db';
import { getFMPClientService } from './fmp-client.service';
import { getAnthropicClientService } from './anthropic-client.service';

export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url?: string;
  content?: string;
  publishedAt: Date;
  fetchedAt: Date;
  assetId?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  keyFacts?: string[];
  summary?: string;
}

export class NewsService {
  /**
   * Fetch news for a specific asset
   */
  async getNewsForAsset(assetId: string, limit: number = 10): Promise<NewsArticle[]> {
    const articles = await db.newsArticle.findMany({
      where: {
        assetId,
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: limit,
    });

    return articles.map((article) => ({
      id: article.id,
      title: article.title,
      source: article.source,
      url: article.url || undefined,
      content: article.content || undefined,
      publishedAt: article.publishedAt,
      fetchedAt: article.fetchedAt,
      assetId: article.assetId || undefined,
      sentiment: article.sentiment as any || undefined,
      keyFacts: article.keyFacts ? (Array.isArray(article.keyFacts) ? article.keyFacts : []) : undefined,
      summary: article.summary || undefined,
    }));
  }

  /**
   * Fetch news by symbol (searches by asset symbol)
   */
  async getNewsBySymbol(
    symbol: string,
    limit: number = 10,
    sentiment?: 'bullish' | 'bearish' | 'neutral' | 'mixed',
    hours?: number
  ): Promise<NewsArticle[]> {
    // Find asset by symbol
    const asset = await db.marketAsset.findUnique({
      where: { symbol },
    });

    if (!asset) {
      return [];
    }

    const where: any = { assetId: asset.id };
    
    if (sentiment) {
      where.sentiment = sentiment;
    }
    
    if (hours) {
      const cutoff = new Date(Date.now() - hours * 3600 * 1000);
      where.publishedAt = { gte: cutoff };
    }

    const articles = await db.newsArticle.findMany({
      where,
      orderBy: {
        publishedAt: 'desc',
      },
      take: limit,
    });

    return articles.map((article) => ({
      id: article.id,
      title: article.title,
      source: article.source,
      url: article.url || undefined,
      content: article.content || undefined,
      publishedAt: article.publishedAt,
      fetchedAt: article.fetchedAt,
      assetId: article.assetId || undefined,
      sentiment: article.sentiment as any || undefined,
      keyFacts: article.keyFacts ? (Array.isArray(article.keyFacts) ? article.keyFacts : []) : undefined,
      summary: article.summary || undefined,
    }));
  }

  /**
   * Aggregate news from multiple sources (EODHD, etc.)
   * Fetches from EODHD API and stores in database
   */
  async aggregateNews(symbol: string, keywords?: string[]): Promise<NewsArticle[]> {
    const asset = await db.marketAsset.findUnique({
      where: { symbol },
    });

    if (!asset) {
      return [];
    }

    // Try to fetch from FMP (Financial Modeling Prep)
    const fmpClient = getFMPClientService();
    if (fmpClient.isConfigured()) {
      try {
        const fmpArticles = await fmpClient.getNews(symbol, 20);
        
        // Store new articles in database
        for (const fmpArticle of fmpArticles) {
          // Check if article already exists (by URL)
          const existing = await db.newsArticle.findFirst({
            where: {
              url: fmpArticle.url,
            },
          });

          if (!existing) {
            // Use Anthropic for AI-powered analysis (if available)
            const anthropicClient = getAnthropicClientService();
            
            let sentiment: 'bullish' | 'bearish' | 'neutral' | null = null;
            let keyFacts: string[] | null = null;
            let summary: string | null = null;

            if (anthropicClient.isConfigured()) {
              try {
                // Analyze sentiment and extract facts in parallel
                const [sentimentResult, factsResult, summaryResult] = await Promise.all([
                  anthropicClient.analyzeSentiment(fmpArticle.title, fmpArticle.text),
                  anthropicClient.extractKeyFacts(fmpArticle.title, fmpArticle.text),
                  anthropicClient.generateSummary(fmpArticle.title, fmpArticle.text),
                ]);
                
                sentiment = sentimentResult;
                keyFacts = factsResult;
                summary = summaryResult;
              } catch (error) {
                console.error(`[NewsService] Error in Anthropic analysis for ${symbol}:`, error);
                // Fallback to simple extraction
                const sentences = fmpArticle.text
                  .split(/[.!?]+/)
                  .map(s => s.trim())
                  .filter(s => s.length > 20)
                  .slice(0, 3);
                keyFacts = sentences.length > 0 ? sentences : null;
                sentiment = 'neutral';
              }
            } else {
              // Fallback: simple extraction
              const sentences = fmpArticle.text
                .split(/[.!?]+/)
                .map(s => s.trim())
                .filter(s => s.length > 20)
                .slice(0, 3);
              keyFacts = sentences.length > 0 ? sentences : null;
              
              // Simple keyword-based sentiment
              const text = fmpArticle.text.toLowerCase();
              const title = fmpArticle.title.toLowerCase();
              const combined = `${title} ${text}`;
              
              const bullishKeywords = ['surge', 'rally', 'gain', 'rise', 'up', 'bullish', 'positive', 'growth', 'profit', 'increase', 'soar'];
              const bearishKeywords = ['drop', 'fall', 'decline', 'down', 'bearish', 'negative', 'loss', 'decrease', 'crash', 'plunge', 'tumble'];
              
              const bullishCount = bullishKeywords.filter(k => combined.includes(k)).length;
              const bearishCount = bearishKeywords.filter(k => combined.includes(k)).length;
              
              if (bullishCount > bearishCount && bullishCount > 0) {
                sentiment = 'bullish';
              } else if (bearishCount > bullishCount && bearishCount > 0) {
                sentiment = 'bearish';
              } else {
                sentiment = 'neutral';
              }
            }

            await db.newsArticle.create({
              data: {
                assetId: asset.id,
                title: fmpArticle.title,
                source: fmpArticle.site,
                url: fmpArticle.url,
                content: fmpArticle.text,
                publishedAt: new Date(fmpArticle.publishedDate),
                sentiment: sentiment,
                keyFacts: keyFacts,
                summary: summary,
              },
            });
          }
        }
      } catch (error) {
        console.error(`[NewsService] Error fetching from FMP for ${symbol}:`, error);
      }
    }

    // Return articles from database
    const articles = await this.getNewsBySymbol(symbol, 20);

    // If no articles found and FMP not configured, create placeholder articles
    if (articles.length === 0 && !fmpClient.isConfigured()) {
      return this.createPlaceholderNews(symbol);
    }

    return articles;
  }

  /**
   * Create placeholder news articles
   * In production, this would be replaced with actual news aggregation
   */
  private async createPlaceholderNews(symbol: string): Promise<NewsArticle[]> {
    const asset = await db.marketAsset.findUnique({
      where: { symbol },
    });

    if (!asset) {
      return [];
    }

    const placeholders = [
      {
        title: `${asset.displayName} Prices Stabilize After Recent Volatility`,
        source: 'Market News International',
        content: `Traders are closely watching key support levels as institutional buyers re-enter after recent market movements.`,
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        title: `Market Analysis: ${asset.displayName} Technical Outlook`,
        source: 'The Trading Institute',
        content: `Technical indicators suggest a potential shift in market dynamics. Analysts are monitoring key resistance and support levels.`,
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        title: `${asset.displayName} Market Update: Current Trends and Forecasts`,
        source: 'Financial Markets Daily',
        content: `Recent price action indicates consolidation after previous movements. Market participants are evaluating structural factors.`,
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
    ];

    const createdArticles: NewsArticle[] = [];

    for (const placeholder of placeholders) {
      const article = await db.newsArticle.create({
        data: {
          assetId: asset.id,
          title: placeholder.title,
          source: placeholder.source,
          content: placeholder.content,
          publishedAt: placeholder.publishedAt,
        },
      });

      createdArticles.push({
        id: article.id,
        title: article.title,
        source: article.source,
        url: article.url || undefined,
        content: article.content || undefined,
        publishedAt: article.publishedAt,
        fetchedAt: article.fetchedAt,
        assetId: article.assetId || undefined,
        sentiment: article.sentiment as any || undefined,
        keyFacts: article.keyFacts ? (Array.isArray(article.keyFacts) ? article.keyFacts : []) : undefined,
        summary: article.summary || undefined,
      });
    }

    return createdArticles;
  }

  /**
   * Store news article in database
   */
  async storeNewsArticle(
    assetId: string | null,
    title: string,
    source: string,
    url?: string,
    content?: string,
    publishedAt?: Date
  ): Promise<NewsArticle> {
    const article = await db.newsArticle.create({
      data: {
        assetId: assetId || null,
        title,
        source,
        url: url || null,
        content: content || null,
        publishedAt: publishedAt || new Date(),
      },
    });

    return {
      id: article.id,
      title: article.title,
      source: article.source,
      url: article.url || undefined,
      content: article.content || undefined,
      publishedAt: article.publishedAt,
      fetchedAt: article.fetchedAt,
      assetId: article.assetId || undefined,
    };
  }

  /**
   * Search news by keywords
   */
  async searchNews(keywords: string[], limit: number = 10): Promise<NewsArticle[]> {
    // Simple keyword search in title and content
    const articles = await db.newsArticle.findMany({
      where: {
        OR: [
          ...keywords.map((keyword) => ({
            title: {
              contains: keyword,
              mode: 'insensitive' as const,
            },
          })),
          ...keywords.map((keyword) => ({
            content: {
              contains: keyword,
              mode: 'insensitive' as const,
            },
          })),
        ],
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: limit,
    });

    return articles.map((article) => ({
      id: article.id,
      title: article.title,
      source: article.source,
      url: article.url || undefined,
      content: article.content || undefined,
      publishedAt: article.publishedAt,
      fetchedAt: article.fetchedAt,
      assetId: article.assetId || undefined,
      sentiment: article.sentiment as any || undefined,
      keyFacts: article.keyFacts ? (Array.isArray(article.keyFacts) ? article.keyFacts : []) : undefined,
      summary: article.summary || undefined,
    }));
  }
}

let newsService: NewsService | null = null;

export function getNewsService(): NewsService {
  if (!newsService) {
    newsService = new NewsService();
  }
  return newsService;
}

