import { Pinecone } from '@pinecone-database/pinecone';

export interface VectorMetadata {
  id: string;
  projectId: string;
  type: 'scene' | 'character' | 'location' | 'summary' | 'dialogue';
  content: string;
  chapterId?: string;
  bookId?: string;
  wordCount?: number;
  createdAt: string;
  [key: string]: any;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: VectorMetadata;
}

export class VectorDBClient {
  private static instance: Pinecone | null = null;
  private static indexName: string = process.env.PINECONE_INDEX || 'worldbest';

  static async getInstance(): Promise<Pinecone> {
    if (!this.instance) {
      const apiKey = process.env.PINECONE_API_KEY;
      
      if (!apiKey) {
        throw new Error('PINECONE_API_KEY is not set');
      }

      // Pinecone v1 SDK requires environment
      const environment = process.env.PINECONE_ENVIRONMENT || process.env.PINECONE_REGION || 'us-east-1-aws';
      this.instance = new Pinecone({ apiKey, environment } as any);
    }

    return this.instance;
  }

  static async getIndex() {
    const client = await this.getInstance();
    return client.index(this.indexName);
  }

  // Embedding generation (using OpenAI or another service)
  static async generateEmbedding(text: string): Promise<number[]> {
    // This would integrate with your AI service
    // For now, returning a placeholder
    // In production, this would call OpenAI's embedding API or similar
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate embedding: ${response.statusText}`);
    }

    const data: any = await response.json();
    return (data.data && data.data[0] && data.data[0].embedding) || [];
  }

  // Store vector with metadata
  static async upsertVector(
    id: string,
    text: string,
    metadata: VectorMetadata
  ): Promise<void> {
    const index = await this.getIndex();
    const embedding = await this.generateEmbedding(text);

    await index.upsert([
      {
        id,
        values: embedding,
        metadata: {
          ...metadata,
          content: text.substring(0, 1000), // Limit content size in metadata
        },
      },
    ]);
  }

  // Batch upsert for efficiency
  static async upsertVectors(
    vectors: Array<{
      id: string;
      text: string;
      metadata: VectorMetadata;
    }>
  ): Promise<void> {
    const index = await this.getIndex();
    const batchSize = 100;

    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      
      const embeddingsPromises = batch.map(v => this.generateEmbedding(v.text));
      const embeddings = await Promise.all(embeddingsPromises);

      const records = batch.map((v, idx) => ({
        id: v.id,
        values: embeddings[idx],
        metadata: {
          ...v.metadata,
          content: v.text.substring(0, 1000),
        },
      }));

      await index.upsert(records);
    }
  }

  // Semantic search
  static async search(
    query: string,
    options: {
      projectId?: string;
      type?: string;
      limit?: number;
      threshold?: number;
      filter?: Record<string, any>;
    } = {}
  ): Promise<VectorSearchResult[]> {
    const index = await this.getIndex();
    const embedding = await this.generateEmbedding(query);

    const filter: Record<string, any> = {};
    
    if (options.projectId) {
      filter.projectId = options.projectId;
    }
    
    if (options.type) {
      filter.type = options.type;
    }
    
    if (options.filter) {
      Object.assign(filter, options.filter);
    }

    const results = await index.query({
      vector: embedding,
      topK: options.limit || 10,
      includeMetadata: true,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });

    return results.matches
      .filter(match => !options.threshold || (match.score || 0) >= options.threshold)
      .map(match => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata as VectorMetadata,
      }));
  }

  // Find similar content
  static async findSimilar(
    id: string,
    options: {
      limit?: number;
      threshold?: number;
      filter?: Record<string, any>;
    } = {}
  ): Promise<VectorSearchResult[]> {
    const index = await this.getIndex();

    // Fetch the vector for the given ID
    const fetchResult = await index.fetch([id]);
    const record = fetchResult.records[id];

    if (!record || !record.values) {
      throw new Error(`Vector with ID ${id} not found`);
    }

    const results = await index.query({
      vector: record.values,
      topK: (options.limit || 10) + 1, // +1 to exclude self
      includeMetadata: true,
      filter: options.filter,
    });

    return results.matches
      .filter(match => match.id !== id) // Exclude self
      .filter(match => !options.threshold || (match.score || 0) >= options.threshold)
      .map(match => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata as VectorMetadata,
      }));
  }

  // Delete vectors
  static async deleteVector(id: string): Promise<void> {
    const index = await this.getIndex();
    await index.deleteOne(id);
  }

  static async deleteVectors(ids: string[]): Promise<void> {
    const index = await this.getIndex();
    await index.deleteMany(ids);
  }

  static async deleteByMetadata(filter: Record<string, any>): Promise<void> {
    const index = await this.getIndex();
    await index.deleteMany(filter);
  }

  // Project-specific operations
  static async indexProject(projectId: string, content: Array<{
    id: string;
    type: string;
    text: string;
    metadata?: Record<string, any>;
  }>): Promise<void> {
    const vectors = content.map(item => ({
      id: `${projectId}:${item.id}`,
      text: item.text,
      metadata: {
        id: item.id,
        projectId,
        type: item.type,
        content: item.text,
        createdAt: new Date().toISOString(),
        ...item.metadata,
      } as VectorMetadata,
    }));

    await this.upsertVectors(vectors);
  }

  static async searchProjectContent(
    projectId: string,
    query: string,
    options: {
      type?: string;
      limit?: number;
      threshold?: number;
    } = {}
  ): Promise<VectorSearchResult[]> {
    return this.search(query, {
      ...options,
      projectId,
    });
  }

  static async findRelatedContent(
    projectId: string,
    contentId: string,
    options: {
      type?: string;
      limit?: number;
      threshold?: number;
    } = {}
  ): Promise<VectorSearchResult[]> {
    return this.findSimilar(`${projectId}:${contentId}`, {
      ...options,
      filter: { projectId },
    });
  }

  static async deleteProjectVectors(projectId: string): Promise<void> {
    await this.deleteByMetadata({ projectId });
  }

  // Character relationship analysis
  static async analyzeCharacterRelationships(
    projectId: string,
    characterId: string
  ): Promise<Array<{ characterId: string; relevance: number }>> {
    const results = await this.search(`character:${characterId}`, {
      projectId,
      type: 'scene',
      limit: 50,
    });

    const characterMentions = new Map<string, number>();

    for (const result of results) {
      // Extract character IDs from metadata
      const characters = result.metadata.characterIds || [];
      for (const char of characters) {
        if (char !== characterId) {
          const current = characterMentions.get(char) || 0;
          characterMentions.set(char, current + result.score);
        }
      }
    }

    return Array.from(characterMentions.entries())
      .map(([characterId, relevance]) => ({ characterId, relevance }))
      .sort((a, b) => b.relevance - a.relevance);
  }

  // Theme extraction
  static async extractThemes(
    projectId: string,
    limit: number = 10
  ): Promise<Array<{ theme: string; relevance: number }>> {
    // This would use more sophisticated NLP in production
    // For now, we'll search for common theme-related queries
    const themeQueries = [
      'love', 'betrayal', 'redemption', 'power', 'sacrifice',
      'identity', 'freedom', 'justice', 'family', 'friendship',
      'courage', 'loss', 'hope', 'revenge', 'destiny'
    ];

    const themeScores = new Map<string, number>();

    for (const theme of themeQueries) {
      const results = await this.search(theme, {
        projectId,
        limit: 10,
        threshold: 0.7,
      });

      if (results.length > 0) {
        const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
        themeScores.set(theme, avgScore * results.length);
      }
    }

    return Array.from(themeScores.entries())
      .map(([theme, relevance]) => ({ theme, relevance }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, limit);
  }

  // Continuity checking
  static async checkContinuity(
    projectId: string,
    sceneText: string,
    context: {
      chapterId?: string;
      characterIds?: string[];
      locationId?: string;
    }
  ): Promise<Array<{ issue: string; confidence: number; relatedContent: VectorSearchResult[] }>> {
    const issues: Array<{ issue: string; confidence: number; relatedContent: VectorSearchResult[] }> = [];

    // Search for similar scenes to detect potential duplicates or contradictions
    const similarScenes = await this.search(sceneText, {
      projectId,
      type: 'scene',
      limit: 5,
      threshold: 0.85,
    });

    if (similarScenes.length > 0 && similarScenes[0].score > 0.95) {
      issues.push({
        issue: 'Potential duplicate content detected',
        confidence: similarScenes[0].score,
        relatedContent: [similarScenes[0]],
      });
    }

    // Check character consistency
    if (context.characterIds) {
      for (const characterId of context.characterIds) {
        const characterScenes = await this.search(`character behavior ${characterId}`, {
          projectId,
          type: 'scene',
          filter: { characterIds: characterId },
          limit: 10,
        });

        // Analyze for inconsistencies (simplified version)
        // In production, this would use more sophisticated NLP
        if (characterScenes.length > 0) {
          const avgScore = characterScenes.reduce((sum, s) => sum + s.score, 0) / characterScenes.length;
          if (avgScore < 0.6) {
            issues.push({
              issue: `Character ${characterId} behavior may be inconsistent`,
              confidence: 1 - avgScore,
              relatedContent: characterScenes.slice(0, 3),
            });
          }
        }
      }
    }

    // Check location consistency
    if (context.locationId) {
      const locationScenes = await this.search(`location description ${context.locationId}`, {
        projectId,
        type: 'scene',
        filter: { locationId: context.locationId },
        limit: 10,
      });

      if (locationScenes.length > 0) {
        const avgScore = locationScenes.reduce((sum, s) => sum + s.score, 0) / locationScenes.length;
        if (avgScore < 0.7) {
          issues.push({
            issue: `Location ${context.locationId} description may be inconsistent`,
            confidence: 1 - avgScore,
            relatedContent: locationScenes.slice(0, 3),
          });
        }
      }
    }

    return issues;
  }
}

// Export singleton instance
export const vectorDB = VectorDBClient;