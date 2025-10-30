import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3003', 10),
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/worldbest',
  mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/worldbest',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // AI Services
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    defaultModel: process.env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4000', 10),
  },
  
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    baseUrl: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
    defaultModel: process.env.ANTHROPIC_DEFAULT_MODEL || 'claude-3-sonnet-20240229',
    maxTokens: parseInt(process.env.ANTHROPIC_MAX_TOKENS || '4000', 10),
  },
  
  // Vector Database
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    environment: process.env.PINECONE_ENVIRONMENT || '',
    indexName: process.env.PINECONE_INDEX_NAME || 'worldbest-context',
  },
  
  // Context Management
  context: {
    maxContextLength: parseInt(process.env.MAX_CONTEXT_LENGTH || '8000', 10),
    embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
    similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD || '0.7'),
  },
  
  // Rate Limiting
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // Conservative for AI service
  },
  
  // Caching
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || '3600', 10), // 1 hour
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};