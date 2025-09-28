import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  
  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://worldbest:worldbest123@localhost:5432/worldbest',
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://:worldbest123@localhost:6379',
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
  
  // Email
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    from: process.env.SMTP_FROM || 'noreply@worldbest.ai',
  },
  
  // OAuth
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    },
  },
  
  // Security
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    sessionSecret: process.env.SESSION_SECRET || 'your-session-secret',
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '900000', 10), // 15 minutes
  },
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
  
  // Frontend URLs
  frontend: {
    baseUrl: process.env.FRONTEND_BASE_URL || 'http://localhost:3000',
    verifyEmailUrl: process.env.VERIFY_EMAIL_URL || 'http://localhost:3000/auth/verify-email',
    resetPasswordUrl: process.env.RESET_PASSWORD_URL || 'http://localhost:3000/auth/reset-password',
  },
};