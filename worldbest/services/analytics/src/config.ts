import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3006', 10),
  env: process.env.NODE_ENV || 'development',
  cors: {
    allowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/worldbest',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  analytics: {
    retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS || '365', 10),
    aggregationInterval: process.env.AGGREGATION_INTERVAL || '1h',
    batchSize: parseInt(process.env.ANALYTICS_BATCH_SIZE || '1000', 10),
    enableRealTime: process.env.ENABLE_REALTIME_ANALYTICS === 'true',
  },
};