import { createHash } from 'crypto';
import { RedisClient } from '@worldbest/database';

interface CacheEntry {
  content: string;
  metadata: {
    model: string;
    persona: string;
    intent: string;
    temperature: number;
    timestamp: number;
    usage: { promptTokens: number; completionTokens: number };
  };
  ttl: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  useSemanticCache?: boolean;
  cacheKey?: string;
}

class AICacheService {
  private redis: RedisClient;
  private defaultTTL = 3600; // 1 hour
  private semanticThreshold = 0.85; // Similarity threshold for semantic caching

  constructor() {
    this.redis = new RedisClient();
  }

  /**
   * Generate cache key from request parameters
   */
  generateCacheKey(params: {
    persona: string;
    intent: string;
    prompt: string;
    model: string;
    temperature: number;
    contextHash?: string;
  }): string {
    const keyData = {
      persona: params.persona,
      intent: params.intent,
      model: params.model,
      temperature: Math.round(params.temperature * 100), // Round to avoid precision issues
      promptHash: this.hashContent(params.prompt),
      contextHash: params.contextHash || 'none'
    };

    const keyString = JSON.stringify(keyData);
    return `ai_cache:${this.hashContent(keyString)}`;
  }

  /**
   * Get cached response
   */
  async getCachedResponse(cacheKey: string): Promise<CacheEntry | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      if (!cached) return null;

      const entry: CacheEntry = JSON.parse(cached);
      
      // Check if cache entry is still valid
      const age = (Date.now() - entry.metadata.timestamp) / 1000;
      if (age > entry.ttl) {
        await this.redis.del(cacheKey);
        return null;
      }

      return entry;
    } catch (error) {
      console.error('Error getting cached response:', error);
      return null;
    }
  }

  /**
   * Cache AI response
   */
  async cacheResponse(
    cacheKey: string,
    content: string,
    metadata: CacheEntry['metadata'],
    options: CacheOptions = {}
  ): Promise<void> {
    try {
      const entry: CacheEntry = {
        content,
        metadata: {
          ...metadata,
          timestamp: Date.now()
        },
        ttl: options.ttl || this.defaultTTL
      };

      await this.redis.setex(
        cacheKey,
        entry.ttl,
        JSON.stringify(entry)
      );

      // Also store in semantic cache if enabled
      if (options.useSemanticCache) {
        await this.addToSemanticCache(cacheKey, content, metadata);
      }
    } catch (error) {
      console.error('Error caching response:', error);
    }
  }

  /**
   * Find semantically similar cached responses
   */
  async findSemanticallySimilar(
    prompt: string,
    persona: string,
    intent: string,
    threshold: number = this.semanticThreshold
  ): Promise<CacheEntry | null> {
    try {
      // Get semantic cache entries for this persona/intent
      const semanticKey = `semantic:${persona}:${intent}`;
      const entries = await this.redis.zrevrange(semanticKey, 0, 50); // Get top 50 recent entries

      for (const entryKey of entries) {
        const entry = await this.getCachedResponse(entryKey);
        if (!entry) continue;

        // Calculate semantic similarity (simplified - in real implementation use embeddings)
        const similarity = this.calculateSimilarity(prompt, entry.content);
        if (similarity >= threshold) {
          return entry;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding semantic match:', error);
      return null;
    }
  }

  /**
   * Batch cache multiple responses
   */
  async batchCache(entries: Array<{
    key: string;
    content: string;
    metadata: CacheEntry['metadata'];
    options?: CacheOptions;
  }>): Promise<void> {
    const pipeline = this.redis.pipeline();

    for (const entry of entries) {
      const cacheEntry: CacheEntry = {
        content: entry.content,
        metadata: {
          ...entry.metadata,
          timestamp: Date.now()
        },
        ttl: entry.options?.ttl || this.defaultTTL
      };

      pipeline.setex(
        entry.key,
        cacheEntry.ttl,
        JSON.stringify(cacheEntry)
      );
    }

    await pipeline.exec();
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;

      const pipeline = this.redis.pipeline();
      keys.forEach(key => pipeline.del(key));
      await pipeline.exec();

      return keys.length;
    } catch (error) {
      console.error('Error invalidating cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    totalMemory: number;
    hitRate: number;
    topModels: Array<{ model: string; count: number }>;
    topPersonas: Array<{ persona: string; count: number }>;
  }> {
    try {
      // Get all cache keys
      const keys = await this.redis.keys('ai_cache:*');
      const totalEntries = keys.length;

      // Get memory usage
      const memoryInfo = await this.redis.memory('usage');
      const totalMemory = memoryInfo || 0;

      // Calculate hit rate from stats
      const hits = await this.redis.get('cache_hits') || '0';
      const misses = await this.redis.get('cache_misses') || '0';
      const hitRate = parseInt(hits) + parseInt(misses) > 0 
        ? parseInt(hits) / (parseInt(hits) + parseInt(misses)) 
        : 0;

      // Get top models and personas (simplified)
      const modelCounts = new Map<string, number>();
      const personaCounts = new Map<string, number>();

      // Sample some entries to get stats
      const sampleKeys = keys.slice(0, Math.min(100, keys.length));
      for (const key of sampleKeys) {
        const entry = await this.getCachedResponse(key);
        if (entry) {
          modelCounts.set(entry.metadata.model, (modelCounts.get(entry.metadata.model) || 0) + 1);
          personaCounts.set(entry.metadata.persona, (personaCounts.get(entry.metadata.persona) || 0) + 1);
        }
      }

      return {
        totalEntries,
        totalMemory,
        hitRate,
        topModels: Array.from(modelCounts.entries())
          .map(([model, count]) => ({ model, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        topPersonas: Array.from(personaCounts.entries())
          .map(([persona, count]) => ({ persona, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalEntries: 0,
        totalMemory: 0,
        hitRate: 0,
        topModels: [],
        topPersonas: []
      };
    }
  }

  /**
   * Warm up cache with common requests
   */
  async warmUpCache(commonRequests: Array<{
    persona: string;
    intent: string;
    prompt: string;
    expectedResponse: string;
    metadata: CacheEntry['metadata'];
  }>): Promise<void> {
    const batchEntries = commonRequests.map(req => {
      const cacheKey = this.generateCacheKey({
        persona: req.persona,
        intent: req.intent,
        prompt: req.prompt,
        model: req.metadata.model,
        temperature: req.metadata.temperature
      });

      return {
        key: cacheKey,
        content: req.expectedResponse,
        metadata: req.metadata,
        options: { ttl: this.defaultTTL * 2 } // Longer TTL for warm-up entries
      };
    });

    await this.batchCache(batchEntries);
  }

  // Private helper methods
  private hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  private async addToSemanticCache(
    cacheKey: string,
    content: string,
    metadata: CacheEntry['metadata']
  ): Promise<void> {
    const semanticKey = `semantic:${metadata.persona}:${metadata.intent}`;
    const score = Date.now(); // Use timestamp as score for recency
    await this.redis.zadd(semanticKey, score, cacheKey);

    // Keep only recent entries
    await this.redis.zremrangebyrank(semanticKey, 0, -101); // Keep last 100
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Simplified similarity calculation - in production use proper embedding similarity
    const words1 = new Set(text1.toLowerCase().split(/\\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Track cache hit/miss for analytics
   */
  async trackCacheHit(hit: boolean): Promise<void> {
    const key = hit ? 'cache_hits' : 'cache_misses';
    await this.redis.incr(key);
  }
}

export { AICacheService, CacheEntry, CacheOptions };"