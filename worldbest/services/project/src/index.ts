import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';
import { projectRoutes } from './routes/projects';
import { characterRoutes } from './routes/characters';
import { worldbuildingRoutes } from './routes/worldbuilding';
import { healthRoutes } from './routes/health';
import versionControlRoutes from './routes/version-control';
import collaborativeEditingRoutes from './routes/collaborative-editing';
import templatesRoutes from './routes/templates';
import analyticsRoutes from './routes/analytics';
import { CollaborativeWebSocketServer } from './websocket/collaborative-websocket';

const app = express();
const server = createServer(app);

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
}));

// CORS configuration
app.use(cors({
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Higher limit for project service
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

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

// Auth middleware for protected routes
app.use('/projects', authMiddleware);
app.use('/characters', authMiddleware);
app.use('/worldbuilding', authMiddleware);
app.use('/versions', authMiddleware);
app.use('/collaborative', authMiddleware);
app.use('/templates', authMiddleware);
app.use('/analytics', authMiddleware);

// Routes
app.use('/health', healthRoutes);
app.use('/projects', projectRoutes);
app.use('/characters', characterRoutes);
app.use('/worldbuilding', worldbuildingRoutes);
app.use('/versions', versionControlRoutes);
app.use('/collaborative', collaborativeEditingRoutes);
app.use('/templates', templatesRoutes);
app.use('/analytics', analyticsRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found.',
  });
});

// Error handling
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, closing server...');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const PORT = config.port;

// Initialize WebSocket server for collaborative editing
const collaborativeWS = new CollaborativeWebSocketServer(server);

const httpServer = server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Project service listening on port ${PORT}`, {
    environment: config.env,
    nodeVersion: process.version,
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
  httpServer.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  httpServer.close(() => {
    process.exit(1);
  });
});

export { app, server, collaborativeWS };