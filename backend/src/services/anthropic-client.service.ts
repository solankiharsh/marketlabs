/**
 * Anthropic (Claude) Client Service - For news synthesis and analysis
 * Based on cur8-news implementation
 */

import Anthropic from '@anthropic-ai/sdk';
import { env } from '../lib/env';

export class AnthropicClientService {
  private client: Anthropic | null;
  private model: string = 'claude-3-5-sonnet-20240620'; // Use stable version

  constructor() {
    if (env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic({
        apiKey: env.ANTHROPIC_API_KEY,
      });
    } else {
      this.client = null;
      console.warn('[Anthropic] API key not configured');
    }
  }

  /**
   * Check if Anthropic is configured
   */
  isConfigured(): boolean {
    return !!this.client;
  }

  /**
   * Generate a summary for a news article
   */
  async generateSummary(title: string, content: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: `Summarize this financial news article in 2-3 sentences:\n\nTitle: ${title}\n\nContent: ${content.substring(0, 2000)}`,
          },
        ],
      });

      const text = response.content[0];
      if (text.type === 'text') {
        return text.text;
      }
      return null;
    } catch (error: any) {
      console.error('[Anthropic] Error generating summary:', error.message);
      return null;
    }
  }

  /**
   * Extract key facts from a news article
   */
  async extractKeyFacts(title: string, content: string): Promise<string[]> {
    if (!this.client) {
      // Fallback: extract first 3 sentences
      return content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 20)
        .slice(0, 3);
    }

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Extract 3-5 key facts from this financial news article. Return only the facts, one per line:\n\nTitle: ${title}\n\nContent: ${content.substring(0, 2000)}`,
          },
        ],
      });

      const text = response.content[0];
      if (text.type === 'text') {
        return text.text
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0 && !line.match(/^\d+\./))
          .slice(0, 5);
      }
      return [];
    } catch (error: any) {
      console.error('[Anthropic] Error extracting key facts:', error.message);
      // Fallback
      return content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 20)
        .slice(0, 3);
    }
  }

  /**
   * Analyze sentiment of a news article
   */
  async analyzeSentiment(title: string, content: string): Promise<'bullish' | 'bearish' | 'neutral' | 'mixed'> {
    if (!this.client) {
      // Fallback: simple keyword-based sentiment
      const text = `${title} ${content}`.toLowerCase();
      const bullishKeywords = ['surge', 'rally', 'gain', 'rise', 'up', 'bullish', 'positive', 'growth'];
      const bearishKeywords = ['drop', 'fall', 'decline', 'down', 'bearish', 'negative', 'loss', 'crash'];
      
      const bullishCount = bullishKeywords.filter(k => text.includes(k)).length;
      const bearishCount = bearishKeywords.filter(k => text.includes(k)).length;
      
      if (bullishCount > bearishCount) return 'bullish';
      if (bearishCount > bullishCount) return 'bearish';
      return 'neutral';
    }

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 50,
        messages: [
          {
            role: 'user',
            content: `Analyze the sentiment of this financial news article. Respond with only one word: "bullish", "bearish", "neutral", or "mixed".\n\nTitle: ${title}\n\nContent: ${content.substring(0, 1500)}`,
          },
        ],
      });

      const text = response.content[0];
      if (text.type === 'text') {
        const sentiment = text.text.toLowerCase().trim();
        if (sentiment.includes('bullish')) return 'bullish';
        if (sentiment.includes('bearish')) return 'bearish';
        if (sentiment.includes('mixed')) return 'mixed';
        return 'neutral';
      }
      return 'neutral';
    } catch (error: any) {
      console.error('[Anthropic] Error analyzing sentiment:', error.message);
      return 'neutral';
    }
  }

  /**
   * Generate AI analysis with custom prompt and system message
   * General-purpose method for market analysis
   */
  async generateAnalysis(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 500,
    temperature: number = 0.7
  ): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const text = response.content[0];
      if (text.type === 'text') {
        return text.text;
      }
      return null;
    } catch (error: any) {
      console.error('[Anthropic] Error generating analysis:', error.message);
      return null;
    }
  }

  /**
   * Generate structured JSON analysis
   */
  async generateStructuredAnalysis(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 1000
  ): Promise<any | null> {
    if (!this.client) {
      return null;
    }

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: maxTokens,
        temperature: 0.7,
        system: systemPrompt + '\n\nIMPORTANT: Return valid JSON only. Do not include any text outside of the JSON object.',
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const text = response.content[0];
      if (text.type === 'text') {
        try {
          // Try to extract JSON from the response (in case there's extra text)
          const jsonMatch = text.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          return JSON.parse(text.text);
        } catch (e) {
          console.error('[Anthropic] Failed to parse JSON response:', e);
          return null;
        }
      }
      return null;
    } catch (error: any) {
      console.error('[Anthropic] Error generating structured analysis:', error.message);
      return null;
    }
  }
}

let anthropicClientService: AnthropicClientService | null = null;

export function getAnthropicClientService(): AnthropicClientService {
  if (!anthropicClientService) {
    anthropicClientService = new AnthropicClientService();
  }
  return anthropicClientService;
}

