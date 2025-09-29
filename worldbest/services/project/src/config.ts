import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3002', 10),
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/worldbest',
  mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/worldbest',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret',
  
  // CORS
  cors: {
    allowedOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  },
  
  // Rate limiting
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, // Higher limit for project service
  },
  
  // File upload
  upload: {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/json'],
  },
  
  // AI Service
  aiServiceUrl: process.env.AI_SERVICE_URL || 'http://localhost:3003',
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};