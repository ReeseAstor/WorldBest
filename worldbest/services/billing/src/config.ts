import dotenv from 'dotenv';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3005', 10),
  
  // Database
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/worldbest',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key',
  
  // CORS
  cors: {
    allowedOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  },
  
  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    apiVersion: '2023-10-16' as const,
  },
  
  // Subscription plans
  plans: {
    story_starter: {
      name: 'Story Starter',
      price: 0,
      stripePriceId: null,
      features: {
        projects: 2,
        aiTokensPerMonth: 10000,
        storageGb: 1,
        exportFormats: ['json', 'txt', 'markdown'],
        collaborators: 0,
        aiModels: ['gpt-3.5-turbo'],
      },
    },
    solo_author: {
      name: 'Solo Author',
      price: 15,
      stripePriceId: process.env.STRIPE_SOLO_PRICE_ID || '',
      features: {
        projects: 10,
        aiTokensPerMonth: 100000,
        storageGb: 10,
        exportFormats: ['json', 'txt', 'markdown', 'pdf', 'epub', 'html'],
        collaborators: 0,
        aiModels: ['gpt-3.5-turbo', 'gpt-4'],
      },
    },
    pro_creator: {
      name: 'Pro Creator',
      price: 35,
      stripePriceId: process.env.STRIPE_PRO_PRICE_ID || '',
      features: {
        projects: -1, // unlimited
        aiTokensPerMonth: 500000,
        storageGb: 50,
        exportFormats: ['json', 'txt', 'markdown', 'pdf', 'epub', 'html', 'docx'],
        collaborators: 3,
        aiModels: ['gpt-3.5-turbo', 'gpt-4', 'claude-3-sonnet'],
        analytics: true,
        prioritySupport: true,
      },
    },
    studio_team: {
      name: 'Studio Team',
      price: 149,
      stripePriceId: process.env.STRIPE_TEAM_PRICE_ID || '',
      features: {
        projects: -1, // unlimited
        aiTokensPerMonth: 2000000,
        storageGb: 200,
        exportFormats: ['json', 'txt', 'markdown', 'pdf', 'epub', 'html', 'docx'],
        collaborators: 5,
        aiModels: ['gpt-3.5-turbo', 'gpt-4', 'claude-3-sonnet', 'claude-3-opus'],
        analytics: true,
        prioritySupport: true,
        apiAccess: true,
        customBranding: true,
      },
    },
  },
  
  // Add-ons
  addons: {
    extra_collaborator: {
      name: 'Extra Collaborator',
      price: 5,
      stripePriceId: process.env.STRIPE_COLLABORATOR_ADDON_PRICE_ID || '',
      description: 'Add one additional collaborator to your team',
    },
    extra_storage: {
      name: 'Extra Storage (10GB)',
      price: 2,
      stripePriceId: process.env.STRIPE_STORAGE_ADDON_PRICE_ID || '',
      description: 'Add 10GB of additional storage',
    },
    priority_support: {
      name: 'Priority Support',
      price: 10,
      stripePriceId: process.env.STRIPE_SUPPORT_ADDON_PRICE_ID || '',
      description: 'Get priority customer support',
    },
  },
  
  // Usage limits and overages
  usage: {
    aiTokenOverageRate: 0.001, // $0.001 per token over limit
    storageOverageRate: 0.1, // $0.10 per GB over limit
    gracePeriodDays: 3, // Grace period for overages
  },
  
  // Billing
  billing: {
    invoiceRetentionDays: 2555, // ~7 years for tax purposes
    dunningPeriodDays: 7, // How long to retry failed payments
    trialPeriodDays: 14, // Free trial period
    prorationBehavior: 'create_prorations', // How to handle mid-cycle changes
  },
  
  // Rate limiting
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // Conservative for billing service
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  
  // Webhooks
  webhooks: {
    retryAttempts: 3,
    retryDelayMs: 1000,
  },
};