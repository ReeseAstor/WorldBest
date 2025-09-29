import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@worldbest/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { createError } from '../middleware/error-handler';
import { logger } from '../utils/logger';
import { StripeService } from '../services/stripe';
import { config } from '../config';

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

// GET /subscriptions - List user's subscriptions
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const status = req.query.status;

      const where: any = {
        userId,
      };

      if (status) {
        where.status = status;
      }

      const [subscriptions, total] = await Promise.all([
        prisma.subscription.findMany({
          where,
          include: {
            addons: true,
            _count: {
              select: {
                invoices: true,
                usage: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.subscription.count({ where }),
      ]);

      res.json({
        data: subscriptions,
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

// GET /subscriptions/:id - Get subscription details
router.get(
  '/:id',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const subscriptionId = req.params.id;

      const subscription = await prisma.subscription.findFirst({
        where: {
          id: subscriptionId,
          userId,
        },
        include: {
          addons: true,
          invoices: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          usage: {
            orderBy: { periodStart: 'desc' },
            take: 12, // Last 12 months
          },
        },
      });

      if (!subscription) {
        throw createError('Subscription not found', 404);
      }

      res.json({ data: subscription });
    } catch (error) {
      next(error);
    }
  }
);

// POST /subscriptions - Create new subscription
router.post(
  '/',
  [
    body('plan').isString().isIn(Object.keys(config.plans)),
    body('paymentMethodId').optional().isString().trim(),
    body('teamId').optional().isString().trim(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const { plan, paymentMethodId, teamId } = req.body;

      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw createError('User not found', 404);
      }

      // Check if user already has an active subscription
      const existingSubscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: { in: ['active', 'trialing', 'past_due'] },
        },
      });

      if (existingSubscription) {
        throw createError('User already has an active subscription', 400);
      }

      // Get or create Stripe customer
      let stripeCustomerId = user.billingCustomerId;
      if (!stripeCustomerId) {
        const customer = await StripeService.createCustomer(
          user.email,
          user.displayName,
          { userId }
        );
        stripeCustomerId = customer.id;

        // Update user with Stripe customer ID
        await prisma.user.update({
          where: { id: userId },
          data: { billingCustomerId: stripeCustomerId },
        });
      }

      // Create Stripe price if it doesn't exist
      const planConfig = config.plans[plan as keyof typeof config.plans];
      if (!planConfig) {
        throw createError('Invalid plan', 400);
      }

      // For free plan, create subscription directly
      if (planConfig.price === 0) {
        const subscription = await prisma.subscription.create({
          data: {
            userId,
            teamId,
            plan,
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            stripeCustomerId,
            seats: 1,
            aiTokensPerMonth: planConfig.features.aiTokensPerMonth,
            storageGb: planConfig.features.storageGb,
          },
        });

        logger.info('Free subscription created', {
          subscriptionId: subscription.id,
          userId,
          plan,
        });

        return res.status(201).json({ data: subscription });
      }

      // Create Stripe price
      const price = await StripeService.createPrice(
        plan,
        planConfig.price,
        planConfig.currency,
        planConfig.interval
      );

      // Create Stripe subscription
      const stripeSubscription = await StripeService.createSubscription(
        stripeCustomerId,
        price.id,
        { userId, plan }
      );

      // Create database subscription
      const subscription = await prisma.subscription.create({
        data: {
          userId,
          teamId,
          plan,
          status: stripeSubscription.status,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          stripeSubscriptionId: stripeSubscription.id,
          stripeCustomerId,
          seats: planConfig.features.seats || 1,
          aiTokensPerMonth: planConfig.features.aiTokensPerMonth,
          storageGb: planConfig.features.storageGb,
        },
      });

      logger.info('Subscription created', {
        subscriptionId: subscription.id,
        stripeSubscriptionId: stripeSubscription.id,
        userId,
        plan,
      });

      res.status(201).json({ data: subscription });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /subscriptions/:id - Update subscription
router.put(
  '/:id',
  [
    param('id').isString().notEmpty(),
    body('plan').optional().isString().isIn(Object.keys(config.plans)),
    body('cancelAtPeriodEnd').optional().isBoolean(),
  ],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const subscriptionId = req.params.id;
      const { plan, cancelAtPeriodEnd } = req.body;

      const subscription = await prisma.subscription.findFirst({
        where: {
          id: subscriptionId,
          userId,
        },
      });

      if (!subscription) {
        throw createError('Subscription not found', 404);
      }

      let updateData: any = {};

      if (cancelAtPeriodEnd !== undefined) {
        updateData.cancelAtPeriodEnd = cancelAtPeriodEnd;
        
        if (subscription.stripeSubscriptionId) {
          await StripeService.cancelSubscription(subscription.stripeSubscriptionId, false);
        }
      }

      if (plan && plan !== subscription.plan) {
        const planConfig = config.plans[plan as keyof typeof config.plans];
        if (!planConfig) {
          throw createError('Invalid plan', 400);
        }

        // Update Stripe subscription if it exists
        if (subscription.stripeSubscriptionId) {
          const price = await StripeService.createPrice(
            plan,
            planConfig.price,
            planConfig.currency,
            planConfig.interval
          );

          await StripeService.updateSubscription(subscription.stripeSubscriptionId, {
            items: [{ price: price.id }],
            proration_behavior: 'create_prorations',
          });
        }

        updateData.plan = plan;
        updateData.aiTokensPerMonth = planConfig.features.aiTokensPerMonth;
        updateData.storageGb = planConfig.features.storageGb;
        updateData.seats = planConfig.features.seats || 1;
      }

      const updatedSubscription = await prisma.subscription.update({
        where: { id: subscriptionId },
        data: updateData,
        include: {
          addons: true,
        },
      });

      logger.info('Subscription updated', {
        subscriptionId,
        userId,
        changes: Object.keys(updateData),
      });

      res.json({ data: updatedSubscription });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /subscriptions/:id - Cancel subscription
router.delete(
  '/:id',
  [param('id').isString().notEmpty()],
  handleValidationErrors,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const userId = req.user!.id;
      const subscriptionId = req.params.id;

      const subscription = await prisma.subscription.findFirst({
        where: {
          id: subscriptionId,
          userId,
        },
      });

      if (!subscription) {
        throw createError('Subscription not found', 404);
      }

      // Cancel Stripe subscription if it exists
      if (subscription.stripeSubscriptionId) {
        await StripeService.cancelSubscription(subscription.stripeSubscriptionId, true);
      }

      // Update database subscription
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'canceled',
          canceledAt: new Date(),
        },
      });

      logger.info('Subscription canceled', {
        subscriptionId,
        userId,
      });

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// GET /subscriptions/plans - Get available plans
router.get(
  '/plans',
  async (req, res) => {
    try {
      const plans = Object.entries(config.plans).map(([id, plan]) => ({
        id,
        name: plan.name,
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
        features: plan.features,
      }));

      res.json({ data: plans });
    } catch (error) {
      next(error);
    }
  }
);

export { router as subscriptionRoutes };