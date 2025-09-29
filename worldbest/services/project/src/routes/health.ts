import { Router, Request, Response } from 'express';
import { PrismaClient } from '@worldbest/database';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    // Check database connection
    const prisma = PrismaClient.getInstance();
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      service: 'project-service',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'project-service',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as healthRoutes };