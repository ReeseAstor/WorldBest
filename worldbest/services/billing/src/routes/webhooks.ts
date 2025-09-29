import { Router, Request, Response } from 'express';
import { PrismaClient } from '@worldbest/database';
import { StripeService } from '../services/stripe';
import { logger } from '../utils/logger';

const router = Router();
const prisma = PrismaClient.getInstance();

// Stripe webhook handler
router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const body = req.body;

  try {
    const event = StripeService.constructWebhookEvent(body, sig);

    logger.info('Processing Stripe webhook event', {
      eventId: event.id,
      type: event.type,
    });

    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object);
        break;
      default:
        logger.info('Unhandled webhook event type', { type: event.type });
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook signature verification failed' });
  }
});

async function handleSubscriptionCreated(subscription: any) {
  try {
    const existingSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (existingSubscription) {
      logger.warn('Subscription already exists', { subscriptionId: subscription.id });
      return;
    }

    // Find user by Stripe customer ID
    const user = await prisma.user.findFirst({
      where: { billingCustomerId: subscription.customer },
    });

    if (!user) {
      logger.error('User not found for subscription', { customerId: subscription.customer });
      return;
    }

    // Get plan from metadata or price
    const plan = subscription.metadata?.plan || 'story_starter';
    const planConfig = require('../config').config.plans[plan];

    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer,
        seats: planConfig?.features?.seats || 1,
        aiTokensPerMonth: planConfig?.features?.aiTokensPerMonth || 1000,
        storageGb: planConfig?.features?.storageGb || 1,
      },
    });

    logger.info('Subscription created from webhook', {
      subscriptionId: subscription.id,
      userId: user.id,
      plan,
    });
  } catch (error) {
    logger.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    const existingSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existingSubscription) {
      logger.warn('Subscription not found for update', { subscriptionId: subscription.id });
      return;
    }

    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      },
    });

    logger.info('Subscription updated from webhook', {
      subscriptionId: subscription.id,
      status: subscription.status,
    });
  } catch (error) {
    logger.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  try {
    const existingSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existingSubscription) {
      logger.warn('Subscription not found for deletion', { subscriptionId: subscription.id });
      return;
    }

    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
      },
    });

    logger.info('Subscription canceled from webhook', {
      subscriptionId: subscription.id,
    });
  } catch (error) {
    logger.error('Error handling subscription deleted:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription },
    });

    if (!subscription) {
      logger.warn('Subscription not found for invoice', { subscriptionId: invoice.subscription });
      return;
    }

    // Create or update invoice record
    await prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      update: {
        status: 'paid',
        amountPaid: invoice.amount_paid,
        paidAt: new Date(invoice.status_transitions.paid_at * 1000),
        pdfUrl: invoice.invoice_pdf,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
      },
      create: {
        subscriptionId: subscription.id,
        stripeInvoiceId: invoice.id,
        invoiceNumber: invoice.number,
        status: 'paid',
        amountDue: invoice.amount_due,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        paidAt: new Date(invoice.status_transitions.paid_at * 1000),
        periodStart: new Date(invoice.period_start * 1000),
        periodEnd: new Date(invoice.period_end * 1000),
        pdfUrl: invoice.invoice_pdf,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
      },
    });

    logger.info('Invoice payment succeeded', {
      invoiceId: invoice.id,
      subscriptionId: subscription.id,
      amount: invoice.amount_paid,
    });
  } catch (error) {
    logger.error('Error handling invoice payment succeeded:', error);
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription },
    });

    if (!subscription) {
      logger.warn('Subscription not found for failed invoice', { subscriptionId: invoice.subscription });
      return;
    }

    // Update subscription status
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'past_due',
      },
    });

    logger.info('Invoice payment failed', {
      invoiceId: invoice.id,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    logger.error('Error handling invoice payment failed:', error);
  }
}

async function handleTrialWillEnd(subscription: any) {
  try {
    const existingSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existingSubscription) {
      logger.warn('Subscription not found for trial end', { subscriptionId: subscription.id });
      return;
    }

    // Create notification for user
    const user = await prisma.user.findUnique({
      where: { id: existingSubscription.userId },
    });

    if (user) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'trial_ending',
          title: 'Trial Ending Soon',
          message: 'Your free trial will end soon. Please add a payment method to continue using WorldBest.',
          priority: 'high',
          actionUrl: '/billing',
        },
      });
    }

    logger.info('Trial ending notification created', {
      subscriptionId: subscription.id,
      userId: existingSubscription.userId,
    });
  } catch (error) {
    logger.error('Error handling trial will end:', error);
  }
}

export { router as webhookRoutes };