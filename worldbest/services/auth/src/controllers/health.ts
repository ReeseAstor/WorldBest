import { Request, Response } from 'express';
import { getPrismaClient } from '../utils/database';
import { getRedisClient } from '../utils/redis';
import { logger } from '../utils/logger';

export const healthController = {
  async getHealth(req: Request, res: Response) {
    try {
      const prisma = getPrismaClient();
      const redis = getRedisClient();

      // Check database connection
      await prisma.$queryRaw`SELECT 1`;
      
      // Check Redis connection
      await redis.ping();

      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        version: process.env.npm_package_version || '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: 'connected',
        redis: 'connected',
      });
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  async getReadiness(req: Request, res: Response) {
    try {
      const prisma = getPrismaClient();
      const redis = getRedisClient();

      // Check if service is ready to accept requests
      await prisma.$queryRaw`SELECT 1`;
      await redis.ping();

      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Readiness check failed:', error);
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  async getLiveness(req: Request, res: Response) {
    // Simple liveness check - just return OK if the process is running
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  },
};