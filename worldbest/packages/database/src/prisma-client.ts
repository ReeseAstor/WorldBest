import { PrismaClient as PrismaClientBase } from '@prisma/client';

declare global {
  var prisma: PrismaClientBase | undefined;
}

export class PrismaClient {
  private static instance: PrismaClientBase;

  static getInstance(): PrismaClientBase {
    if (!this.instance) {
      this.instance = global.prisma || new PrismaClientBase({
        log: process.env.NODE_ENV === 'development' 
          ? ['query', 'error', 'warn'] 
          : ['error'],
      });

      if (process.env.NODE_ENV !== 'production') {
        global.prisma = this.instance;
      }
    }

    return this.instance;
  }

  static async connect(): Promise<void> {
    const client = this.getInstance();
    await client.$connect();
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.$disconnect();
    }
  }
}

// Export a singleton instance
export const prisma = PrismaClient.getInstance();