<<<<<<< HEAD
=======
import dotenv from 'dotenv';

dotenv.config();

>>>>>>> 96f231cb21277b8c88265b316e50036aaa665227
export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3004', 10),
  
<<<<<<< HEAD
  database: {
    url: process.env.DATABASE_URL || 'postgresql://worldbest:worldbest123@localhost:5432/worldbest',
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://worldbest:worldbest123@localhost:27017/worldbest?authSource=admin',
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://:worldbest123@localhost:6379',
    },
  },
  
  storage: {
    minio: {
      endpoint: process.env.MINIO_ENDPOINT || 'localhost:9000',
      accessKey: process.env.MINIO_ACCESS_KEY || 'worldbest',
      secretKey: process.env.MINIO_SECRET_KEY || 'worldbest123',
      useSSL: process.env.MINIO_USE_SSL === 'true',
      bucket: process.env.MINIO_BUCKET || 'worldbest-exports',
    },
  },
  
  queue: {
    rabbitmq: {
      url: process.env.RABBITMQ_URL || 'amqp://worldbest:worldbest123@localhost:5672/worldbest',
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://:worldbest123@localhost:6379',
    },
  },
  
  cors: {
    allowedOrigins: process.env.CORS_ORIGINS 
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3001'],
  },
  
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret',
    authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  },
  
  export: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600', 10), // 100MB
    outputFormats: ['pdf', 'epub', 'docx', 'html', 'json', 'txt'],
    defaultTimeout: parseInt(process.env.EXPORT_TIMEOUT || '300000', 10), // 5 minutes
    concurrentJobs: parseInt(process.env.CONCURRENT_JOBS || '5', 10),
    retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3', 10),
  },
  
  puppeteer: {
    headless: process.env.PUPPETEER_HEADLESS !== 'false',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ],
=======
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/worldbest',
  mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/worldbest',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key',
  
  // CORS
  cors: {
    allowedOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  },
  
  // Export settings
  export: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    supportedFormats: ['epub', 'pdf', 'docx', 'markdown', 'html', 'json', 'txt'],
    outputDirectory: process.env.EXPORT_OUTPUT_DIR || './exports',
    tempDirectory: process.env.EXPORT_TEMP_DIR || './temp',
    cdnUrl: process.env.CDN_URL || 'http://localhost:3004/exports',
    retentionDays: parseInt(process.env.EXPORT_RETENTION_DAYS || '7', 10),
  },
  
  // File storage
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local', // local, s3, gcs
    s3: {
      bucket: process.env.S3_BUCKET || '',
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
  },
  
  // PDF generation
  pdf: {
    chromiumPath: process.env.CHROMIUM_PATH,
    timeout: parseInt(process.env.PDF_TIMEOUT || '30000', 10),
    format: 'A4' as const,
    margin: {
      top: '1in',
      right: '1in',
      bottom: '1in',
      left: '1in',
    },
  },
  
  // ePub generation
  epub: {
    language: 'en',
    publisher: 'WorldBest Platform',
    css: `
      body { font-family: 'Times New Roman', serif; line-height: 1.6; }
      h1, h2, h3 { font-family: 'Arial', sans-serif; }
      .chapter { page-break-before: always; }
      .scene-break { text-align: center; margin: 2em 0; }
    `,
  },
  
  // Rate limiting
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50, // Conservative for export service
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
>>>>>>> 96f231cb21277b8c88265b316e50036aaa665227
  },
};