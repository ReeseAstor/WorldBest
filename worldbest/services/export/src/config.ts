import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3004', 10),
  
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
  },
};