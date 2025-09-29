import { Router } from 'express';
import { PrismaClient } from '@worldbest/database';

const router = Router();
const prisma = PrismaClient.getInstance();

router.get('/', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'export-service',
      version: '1.0.0',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'export-service',
      error: 'Database connection failed',
    });
  }
});

export { router as healthRoutes };