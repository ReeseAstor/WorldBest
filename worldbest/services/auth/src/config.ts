import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  
  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://worldbest:worldbest123@localhost:5432/worldbest?schema=public',
  },
  
  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    issuer: process.env.JWT_ISSUER || 'worldbest-auth',
  },
  
  // Session
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10), // 24 hours
  },
  
  // CORS
  cors: {
    allowedOrigins: process.env.CORS_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'https://localhost:3000',
      'http://localhost',
      'https://localhost',
    ],
  },
  
  // Email
  email: {
    from: process.env.EMAIL_FROM || 'noreply@worldbest.ai',
    smtp: {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
  },
  
  // 2FA
  twoFactor: {
    serviceName: process.env.TWO_FACTOR_SERVICE_NAME || 'WorldBest',
    issuer: process.env.TWO_FACTOR_ISSUER || 'WorldBest',
  },
  
  // Rate limiting
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    loginAttempts: {
      windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
      max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '5', 10),
    },
  },
  
  // Password policy
  password: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
    requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS !== 'false',
    requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL_CHARS !== 'false',
    maxAge: parseInt(process.env.PASSWORD_MAX_AGE_DAYS || '90', 10) * 24 * 60 * 60 * 1000,
  },
  
  // Account lockout
  accountLockout: {
    maxAttempts: parseInt(process.env.ACCOUNT_LOCKOUT_MAX_ATTEMPTS || '5', 10),
    lockoutDuration: parseInt(process.env.ACCOUNT_LOCKOUT_DURATION || '900000', 10), // 15 minutes
  },
  
  // Feature flags
  features: {
    emailVerification: process.env.FEATURE_EMAIL_VERIFICATION !== 'false',
    twoFactorAuth: process.env.FEATURE_TWO_FACTOR_AUTH !== 'false',
    socialAuth: process.env.FEATURE_SOCIAL_AUTH === 'true',
    passwordReset: process.env.FEATURE_PASSWORD_RESET !== 'false',
  },
  
  // External services
  external: {
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    notificationService: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
} as const;

// Validate required configuration
const requiredEnvVars = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SESSION_SECRET',
];

if (config.env === 'production') {
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}