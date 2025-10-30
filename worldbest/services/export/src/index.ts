import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
<<<<<<< HEAD
import { config } from 'dotenv';

// Load environment variables
config();

// Import routes
import exportRoutes from './routes/export.routes.js';

const app = express();
const PORT = process.env.PORT || 3005;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for file serving
=======
import { config } from './config';
import { logger } from './utils/logger';
import { authMiddleware } from './middleware/auth';
import { exportRoutes } from './routes/exports';
import { healthRoutes } from './routes/health';
import { ExportManager } from './services/export-manager';
import { PrismaClient } from '@worldbest/database';

const app = express();

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
>>>>>>> 96f231cb21277b8c88265b316e50036aaa665227
}));

// CORS configuration
app.use(cors({
<<<<<<< HEAD
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Rate limiting
const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 export requests per windowMs
  message: {
    success: false,
    error: 'Too many export requests, please try again later'
=======
  origin: config.cors.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimiting.windowMs,
  max: config.rateLimiting.maxRequests,
  message: {
    error: 'Too many requests from this IP, please try again later.',
>>>>>>> 96f231cb21277b8c88265b316e50036aaa665227
  },
  standardHeaders: true,
  legacyHeaders: false,
});

<<<<<<< HEAD
const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Higher limit for downloads
  message: {
    success: false,
    error: 'Too many download requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to specific routes
app.use('/api/export/export', exportLimiter);
app.use('/api/export/batch-export', exportLimiter);
app.use('/api/export/download', downloadLimiter);

// Authentication middleware (simplified - in production, use proper JWT validation)
app.use((req, res, next) => {
  // Extract user info from JWT token
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      // In production, verify JWT token and extract user info
      // For now, using mock user data
      req.user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'user'
      };
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
  }
  
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// Routes
app.use('/api/export', exportRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'WorldBest Export Service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'WorldBest Export Service',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      export: '/api/export/export',
      batchExport: '/api/export/batch-export',
      preview: '/api/export/preview',
      status: '/api/export/status/:requestId',
      download: '/api/export/download/:requestId',
      history: '/api/export/history',
      cancel: '/api/export/cancel/:requestId'
    }
  });
});
=======
app.use(limiter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.headers['x-request-id'],
  });
  next();
});

// Serve static export files
app.use('/exports', express.static(config.export.outputDirectory));

// Routes
app.use('/health', healthRoutes);
app.use('/exports', authMiddleware, exportRoutes);
>>>>>>> 96f231cb21277b8c88265b316e50036aaa665227

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
<<<<<<< HEAD
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);
  
  // Don't send error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack }),
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
=======
    error: 'Not Found',
    message: 'The requested resource was not found.',
  });
});

// Error handling
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const statusCode = error.statusCode || 500;
  const errorCode = error.code || 'INTERNAL_ERROR';
  
  // Log error
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Send error response
  res.status(statusCode).json({
    error: errorCode,
    message: error.message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
});

// Initialize database connections
async function initializeDatabase() {
  try {
    await PrismaClient.connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, closing server...');
  
  try {
    await PrismaClient.disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Error disconnecting database', { error });
  }
  
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const PORT = config.port;
const server = app.listen(PORT, '0.0.0.0', async () => {
  logger.info(`Export service listening on port ${PORT}`, {
    environment: config.env,
    nodeVersion: process.version,
  });
  
  // Initialize database
  await initializeDatabase();
  
  // Setup cleanup job for expired exports
  const exportManager = new ExportManager();
  
  // Run cleanup every hour
  setInterval(async () => {
    try {
      await exportManager.cleanupExpiredJobs();
    } catch (error) {
      logger.error('Error during scheduled cleanup', { error });
    }
  }, 60 * 60 * 1000); // 1 hour
>>>>>>> 96f231cb21277b8c88265b316e50036aaa665227
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
<<<<<<< HEAD
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Export Service running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 API docs: http://localhost:${PORT}/`);
});

// Export for testing
export default app;
export { server };
=======
  logger.error('Unhandled Rejection at:', { promise, reason });
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  server.close(() => {
    process.exit(1);
  });
});

export { app };
>>>>>>> 96f231cb21277b8c88265b316e50036aaa665227
