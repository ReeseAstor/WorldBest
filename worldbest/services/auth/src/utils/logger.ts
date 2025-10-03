import winston from 'winston';
import { config } from '../config';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Tell winston about our colors
winston.addColors(colors);

// Define format based on environment
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define different formats for different environments
const developmentFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// Define transports
const transports: winston.transport[] = [];

// Console transport
if (config.env === 'development') {
  transports.push(
    new winston.transports.Console({
      format: developmentFormat,
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format,
    })
  );
}

// File transports for production
if (config.env === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format,
    })
  );
}

// Create the logger
export const logger = winston.createLogger({
  level: config.logging.level,
  levels,
  format,
  transports,
  exitOnError: false,
});

// Create a stream object for HTTP request logging
export const logStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper functions for structured logging
export const logWithContext = (level: string, message: string, context?: Record<string, any>) => {
  logger.log(level, message, context);
};

export const logError = (error: Error, context?: Record<string, any>) => {
  logger.error(error.message, {
    ...context,
    stack: error.stack,
    name: error.name,
  });
};

export const logRequest = (req: any, res: any, responseTime?: number) => {
  logger.http('HTTP Request', {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: responseTime ? `${responseTime}ms` : undefined,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
  });
};

export const logAuth = (event: string, userId?: string, context?: Record<string, any>) => {
  logger.info(`Auth: ${event}`, {
    ...context,
    userId,
    timestamp: new Date().toISOString(),
  });
};

export const logSecurity = (event: string, context?: Record<string, any>) => {
  logger.warn(`Security: ${event}`, {
    ...context,
    timestamp: new Date().toISOString(),
  });
};