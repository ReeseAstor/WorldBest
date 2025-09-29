import { Router, Request, Response } from 'express';
import { prisma } from '@worldbest/database';
import { redisService } from '../services/redis';
import { config } from '../config';

const router = Router();

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    redis: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
  };
}

/**
 * Basic health check endpoint
 */
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'auth-service',
    version: process.env.npm_package_version || '1.0.0',
  });
});

/**
 * Detailed health check with dependency status
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const healthCheck: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'auth-service',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env,
    checks: {
      database: { status: 'unhealthy' },
      redis: { status: 'unhealthy' },
    },
  };

  // Check database connection
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - start;
    
    healthCheck.checks.database = {
      status: 'healthy',
      responseTime,
    };
  } catch (error) {
    healthCheck.checks.database = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
    healthCheck.status = 'unhealthy';
  }

  // Check Redis connection
  try {
    const start = Date.now();
    await redisService.set('health_check', 'ok', 10);
    const responseTime = Date.now() - start;
    
    healthCheck.checks.redis = {
      status: 'healthy',
      responseTime,
    };
  } catch (error) {
    healthCheck.checks.redis = {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown Redis error',
    };
    healthCheck.status = 'unhealthy';
  }

  // Return appropriate status code
  const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

/**
 * Readiness probe (for Kubernetes)
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if service is ready to accept traffic
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Service not ready',
    });
  }
});

/**
 * Liveness probe (for Kubernetes)
 */
router.get('/live', (req: Request, res: Response) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export { router as healthRoutes };