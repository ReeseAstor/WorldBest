import { PrismaClient } from '@prisma/client';

// Global variable to store the Prisma client instance
let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

// Create Prisma client instance
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error'],
  });
} else {
  // In development, use a global variable to prevent multiple instances
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['query', 'error', 'warn', 'info'],
    });
  }
  prisma = global.__prisma;
}

export { prisma };