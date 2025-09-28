import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { projectRouter } from './routes/project.routes';
import { bookRouter } from './routes/book.routes';
import { chapterRouter } from './routes/chapter.routes';
import { sceneRouter } from './routes/scene.routes';
import { characterRouter } from './routes/character.routes';
import { locationRouter } from './routes/location.routes';
import { errorHandler } from './middleware/error.middleware';
import { rateLimiter } from './middleware/rate-limit.middleware';
import { logger } from './utils/logger';
import { initializeDatabase } from './utils/database';
import { initializeRedis } from './utils/redis';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3002;

// Initialize services
async function initializeServices() {
  try {
    await initializeDatabase();
    await initializeRedis();
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'project-service',
    timestamp: new Date().toISOString() 
  });
});

// Routes
app.use('/api/v1/projects', projectRouter);
app.use('/api/v1/books', bookRouter);
app.use('/api/v1/chapters', chapterRouter);
app.use('/api/v1/scenes', sceneRouter);
app.use('/api/v1/characters', characterRouter);
app.use('/api/v1/locations', locationRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
async function startServer() {
  await initializeServices();
  
  app.listen(PORT, () => {
    logger.info(`Project service running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});