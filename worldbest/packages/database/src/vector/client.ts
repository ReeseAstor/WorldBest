import { Pinecone } from '@pinecone-database/pinecone';
import { config } from './config';

class VectorDBClient {
  private client: Pinecone | null = null;
  private index: any = null;

  async connect(): Promise<void> {
    try {
      this.client = new Pinecone({
        apiKey: config.pinecone.apiKey,
      });

      // Get the index
      this.index = this.client.index(config.pinecone.indexName);

      console.log('Pinecone connected successfully');
    } catch (error) {
      console.error('Failed to connect to Pinecone:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Pinecone doesn't require explicit disconnection
    this.client = null;
    this.index = null;
  }

  getIndex() {
    if (!this.index) {
      throw new Error('Pinecone not connected. Call connect() first.');
    }
    return this.index;
  }

  // Vector operations
  async upsert(vectors: Array<{ id: string; values: number[]; metadata?: any }>): Promise<void> {
    const index = this.getIndex();
    await index.upsert(vectors);
  }

  async query(vector: number[], options: {
    topK?: number;
    includeMetadata?: boolean;
    includeValues?: boolean;
    filter?: any;
  } = {}): Promise<any> {
    const index = this.getIndex();
    const queryResponse = await index.query({
      vector,
      topK: options.topK || 10,
      includeMetadata: options.includeMetadata || true,
      includeValues: options.includeValues || false,
      filter: options.filter,
    });

    return queryResponse.matches;
  }

  async delete(ids: string[]): Promise<void> {
    const index = this.getIndex();
    await index.deleteMany(ids);
  }

  async deleteAll(): Promise<void> {
    const index = this.getIndex();
    await index.deleteAll();
  }

  async getStats(): Promise<any> {
    const index = this.getIndex();
    return await index.describeIndexStats();
  }

  // AI generation embeddings
  async storeAIGenerationEmbedding(
    generationId: string,
    content: string,
    embedding: number[],
    metadata: {
      userId: string;
      projectId?: string;
      persona: string;
      intent: string;
      model: string;
      timestamp: Date;
    }
  ): Promise<void> {
    await this.upsert([{
      id: `ai_generation:${generationId}`,
      values: embedding,
      metadata: {
        type: 'ai_generation',
        content,
        ...metadata,
      },
    }]);
  }

  // Character embeddings
  async storeCharacterEmbedding(
    characterId: string,
    content: string,
    embedding: number[],
    metadata: {
      projectId: string;
      name: string;
      description: string;
      traits: string[];
      timestamp: Date;
    }
  ): Promise<void> {
    await this.upsert([{
      id: `character:${characterId}`,
      values: embedding,
      metadata: {
        type: 'character',
        content,
        ...metadata,
      },
    }]);
  }

  // Location embeddings
  async storeLocationEmbedding(
    locationId: string,
    content: string,
    embedding: number[],
    metadata: {
      projectId: string;
      name: string;
      description: string;
      region?: string;
      timestamp: Date;
    }
  ): Promise<void> {
    await this.upsert([{
      id: `location:${locationId}`,
      values: embedding,
      metadata: {
        type: 'location',
        content,
        ...metadata,
      },
    }]);
  }

  // Scene embeddings
  async storeSceneEmbedding(
    sceneId: string,
    content: string,
    embedding: number[],
    metadata: {
      projectId: string;
      chapterId: string;
      title: string;
      summary?: string;
      timestamp: Date;
    }
  ): Promise<void> {
    await this.upsert([{
      id: `scene:${sceneId}`,
      values: embedding,
      metadata: {
        type: 'scene',
        content,
        ...metadata,
      },
    }]);
  }

  // Search similar content
  async searchSimilarContent(
    queryEmbedding: number[],
    contentType: 'ai_generation' | 'character' | 'location' | 'scene',
    projectId?: string,
    topK: number = 10
  ): Promise<any[]> {
    const filter: any = { type: contentType };
    if (projectId) {
      filter.projectId = projectId;
    }

    return await this.query(queryEmbedding, {
      topK,
      includeMetadata: true,
      filter,
    });
  }

  // Search by text similarity
  async searchByText(
    text: string,
    contentType: 'ai_generation' | 'character' | 'location' | 'scene',
    projectId?: string,
    topK: number = 10
  ): Promise<any[]> {
    // This would require generating embeddings from text first
    // For now, return empty array as placeholder
    return [];
  }
}

export const VectorDBClient = new VectorDBClient();