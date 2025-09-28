import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3002', 10),
  
  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://worldbest:worldbest123@localhost:5432/worldbest',
  },
  
  // MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://worldbest:worldbest123@localhost:27017/worldbest?authSource=admin',
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://:worldbest123@localhost:6379',
  },
  
  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
  
  // File upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    uploadDir: process.env.UPLOAD_DIR || './uploads',
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),
  },
};