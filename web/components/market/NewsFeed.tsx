'use client';

import { useState } from 'react';
import { ExternalLink, Calendar, Filter, RefreshCw } from 'lucide-react';
import { getNewsFeed as fetchNewsFeed } from '@/lib/api';

export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  url?: string;
  content?: string;
  publishedAt: Date | string;
  fetchedAt?: Date | string;
  sentiment?: 'bullish' | 'bearish' | 'neutral' | 'mixed';
  keyFacts?: string[];
  summary?: string;
}

interface NewsFeedProps {
  articles: NewsArticle[];
  loading?: boolean;
  symbol?: string;
  onRefresh?: () => void;
}

export function NewsFeed({ articles, loading, symbol, onRefresh }: NewsFeedProps) {
  const [filterSource, setFilterSource] = useState<string | null>(null);
  const [filterSentiment, setFilterSentiment] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const sources = Array.from(new Set(articles.map((a) => a.source)));

  const filteredArticles = articles.filter((a) => {
    if (filterSource && a.source !== filterSource) return false;
    if (filterSentiment && a.sentiment !== filterSentiment) return false;
    return true;
  });

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Grounded Intelligence Feed</h3>
        <div className="text-center py-8 text-text-muted">Loading news...</div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Grounded Intelligence Feed</h3>
        <div className="text-center py-8 text-text-muted">
          No news articles available at this time.
        </div>
      </div>
    );
  }

  const handleRefresh = async () => {
    if (!symbol || !onRefresh) return;
    
    setRefreshing(true);
    try {
      // Use API client with refresh parameter
      await fetchNewsFeed(symbol, 20, undefined, undefined, true);
      onRefresh();
    } catch (error) {
      console.error('Failed to refresh news:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold">Grounded Intelligence Feed</h3>
        <div className="flex items-center gap-3">
          {symbol && onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-accent-primary hover:text-accent-soft border border-accent-primary/30 rounded hover:bg-accent-primary/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          )}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-muted" />
            {sources.length > 1 && (
              <select
                value={filterSource || ''}
                onChange={(e) => setFilterSource(e.target.value || null)}
                className="bg-white/[0.02] border border-border rounded px-3 py-1 text-sm text-text-primary"
              >
                <option value="">All Sources</option>
                {sources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            )}
            <select
              value={filterSentiment || ''}
              onChange={(e) => setFilterSentiment(e.target.value || null)}
              className="bg-white/[0.02] border border-border rounded px-3 py-1 text-sm text-text-primary"
            >
              <option value="">All Sentiment</option>
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
              <option value="neutral">Neutral</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredArticles.map((article) => (
          <div
            key={article.id}
            className="p-4 bg-white/[0.02] border border-border rounded-lg hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-text-primary mb-1">{article.title}</h4>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <span className="px-2 py-0.5 bg-accent-primary/10 text-accent-primary rounded">
                      {article.source}
                    </span>
                  </span>
                  {article.sentiment && (
                    <span className={`px-2 py-0.5 rounded ${
                      article.sentiment === 'bullish' ? 'bg-success/10 text-success' :
                      article.sentiment === 'bearish' ? 'bg-error/10 text-error' :
                      'bg-text-muted/10 text-text-muted'
                    }`}>
                      {article.sentiment}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(article.publishedAt)}
                  </span>
                </div>
              </div>
              {article.url && (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-primary hover:text-accent-soft transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            {article.summary ? (
              <p className="text-sm text-text-secondary mt-2 line-clamp-2">{article.summary}</p>
            ) : article.keyFacts && article.keyFacts.length > 0 ? (
              <ul className="text-sm text-text-secondary mt-2 space-y-1">
                {article.keyFacts.slice(0, 2).map((fact, idx) => (
                  <li key={idx} className="line-clamp-1">• {fact}</li>
                ))}
              </ul>
            ) : article.content ? (
              <p className="text-sm text-text-secondary mt-2 line-clamp-2">{article.content}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

