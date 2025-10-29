export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3004', 10),
  
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
  },
};