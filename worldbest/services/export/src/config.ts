import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3005', 10),
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
  storage: {
    minio: {
      endpoint: process.env.MINIO_ENDPOINT || 'localhost:9000',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
      bucket: process.env.MINIO_BUCKET || 'worldbest-exports',
      useSSL: process.env.MINIO_USE_SSL === 'true',
    },
  },
  export: {
    maxFileSize: parseInt(process.env.MAX_EXPORT_SIZE || '104857600', 10), // 100MB
    tempDir: process.env.TEMP_DIR || '/tmp/worldbest-exports',
    retentionDays: parseInt(process.env.EXPORT_RETENTION_DAYS || '7', 10),
    formats: {
      epub: {
        enabled: true,
        maxChapters: 1000,
      },
      pdf: {
        enabled: true,
        maxPages: 1000,
        pageSize: 'A4',
        margin: '1in',
      },
      docx: {
        enabled: true,
        maxChapters: 1000,
      },
      html: {
        enabled: true,
        maxChapters: 1000,
      },
      markdown: {
        enabled: true,
        maxChapters: 1000,
      },
      json: {
        enabled: true,
        maxSize: 50 * 1024 * 1024, // 50MB
      },
    },
  },
};