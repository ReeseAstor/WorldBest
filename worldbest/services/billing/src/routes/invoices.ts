import { Router } from 'express';
import { param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@worldbest/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/error-handler';
import { logger } from '../utils/logger';

const router = Router();
const prisma = PrismaClient.getInstance();

// Validation middleware
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

// GET /invoices - List user's invoices
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isString().trim(),
    query('subscriptionId').optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const status = req.query.status;
      const subscriptionId = req.query.subscriptionId;

      const where: any = {
        subscription: {
          userId,
        },
      };

      if (status) {
        where.status = status;
      }

      if (subscriptionId) {
        where.subscriptionId = subscriptionId;
      }

      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: {
            subscription: {
              select: {
                id: true,
                plan: true,
              },
            },
            lineItems: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.invoice.count({ where }),
      ]);

      res.json({
        data: invoices,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /invoices/:id - Get invoice details
router.get(
  '/:id',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const invoiceId = req.params.id;

      const invoice = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          subscription: {
            userId,
          },
        },
        include: {
          subscription: {
            select: {
              id: true,
              plan: true,
            },
          },
          lineItems: true,
        },
      });

      if (!invoice) {
        throw createError('Invoice not found', 404);
      }

      res.json({ data: invoice });
    } catch (error) {
      next(error);
    }
  }
);

// GET /invoices/:id/pdf - Get invoice PDF URL
router.get(
  '/:id/pdf',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const invoiceId = req.params.id;

      const invoice = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          subscription: {
            userId,
          },
        },
        select: {
          id: true,
          pdfUrl: true,
          hostedInvoiceUrl: true,
          status: true,
        },
      });

      if (!invoice) {
        throw createError('Invoice not found', 404);
      }

      if (invoice.status !== 'paid') {
        throw createError('Invoice is not paid', 400);
      }

      res.json({
        data: {
          pdfUrl: invoice.pdfUrl,
          hostedInvoiceUrl: invoice.hostedInvoiceUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as invoiceRoutes };