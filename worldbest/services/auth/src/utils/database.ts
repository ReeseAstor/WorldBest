import { PrismaClient } from '@worldbest/database';
import { logger } from './logger';

let prisma: PrismaClient;

export async function connectDatabase() {
  try {
    prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'info', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    });

    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      prisma.$on('query', (e) => {
        logger.debug('Query: ' + e.query);
        logger.debug('Params: ' + e.params);
        logger.debug('Duration: ' + e.duration + 'ms');
      });
    }

    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return prisma;
}

export async function disconnectDatabase() {
  if (prisma) {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  }
}