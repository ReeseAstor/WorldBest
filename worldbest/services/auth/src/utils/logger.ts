import winston from 'winston';
import { config } from '../config';
import { AuditEventType, AuditSeverity } from '../services/audit';
import { Request } from 'express';

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

  // Import auditService dynamically to avoid circular dependency
  import('../services/audit').then(({ auditService }) => {
    auditService.logEvent(
      AuditEventType.LOGIN_SUCCESS, // Default, should be parameterized
      AuditSeverity.LOW,
      { event, ...context },
      undefined,
      userId
    ).catch(error => {
      logger.error('Failed to log auth event to audit service:', error);
    });
  });
};

export const logSecurity = (event: string, context?: Record<string, any>) => {
  logger.warn(`Security: ${event}`, {
    ...context,
    timestamp: new Date().toISOString(),
  });

  // Import auditService dynamically to avoid circular dependency
  import('../services/audit').then(({ auditService }) => {
    auditService.logEvent(
      AuditEventType.SUSPICIOUS_ACTIVITY,
      AuditSeverity.MEDIUM,
      { event, ...context },
      undefined,
      context?.userId
    ).catch(error => {
      logger.error('Failed to log security event to audit service:', error);
    });
  });
};

/**
 * Log audit events directly
 */
export const logAudit = (
  eventType: AuditEventType,
  severity: AuditSeverity,
  details: Record<string, any>,
  req?: Request,
  userId?: string
) => {
  logger.info('Audit event', {
    eventType,
    severity,
    userId,
    ...details,
  });

  // Import auditService dynamically to avoid circular dependency
  import('../services/audit').then(({ auditService }) => {
    auditService.logEvent(
      eventType,
      severity,
      details,
      req,
      userId
    ).catch(error => {
      logger.error('Failed to log audit event:', error);
    });
  });
};