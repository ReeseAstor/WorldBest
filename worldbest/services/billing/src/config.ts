import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3004', 10),
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
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    apiVersion: '2023-10-16',
  },
  plans: {
    story_starter: {
      name: 'Story Starter',
      price: 0,
      currency: 'usd',
      interval: 'month',
      features: {
        projects: 2,
        aiTokensPerMonth: 1000,
        storageGb: 1,
        exports: 5,
        collaboration: false,
        apiAccess: false,
      },
    },
    solo_author: {
      name: 'Solo Author',
      price: 1500, // $15.00 in cents
      currency: 'usd',
      interval: 'month',
      features: {
        projects: 10,
        aiTokensPerMonth: 10000,
        storageGb: 10,
        exports: 50,
        collaboration: false,
        apiAccess: false,
      },
    },
    pro_creator: {
      name: 'Pro Creator',
      price: 3500, // $35.00 in cents
      currency: 'usd',
      interval: 'month',
      features: {
        projects: -1, // unlimited
        aiTokensPerMonth: 50000,
        storageGb: 100,
        exports: -1, // unlimited
        collaboration: true,
        apiAccess: true,
      },
    },
    studio_team: {
      name: 'Studio Team',
      price: 14900, // $149.00 in cents
      currency: 'usd',
      interval: 'month',
      features: {
        projects: -1, // unlimited
        aiTokensPerMonth: 200000,
        storageGb: 500,
        exports: -1, // unlimited
        collaboration: true,
        apiAccess: true,
        seats: 5,
      },
    },
  },
};