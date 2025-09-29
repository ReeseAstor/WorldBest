import Stripe from 'stripe';
import { PrismaClient } from '@worldbest/database';
import { config } from '../config';
import { logger } from '../utils/logger';

export class StripeService {
  private stripe: Stripe;
  private prisma: PrismaClient;

  constructor() {
    this.stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: config.stripe.apiVersion,
    });
    this.prisma = PrismaClient.getInstance();
  }

  // Customer management
  async createCustomer(userId: string, email: string, name: string): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          userId,
        },
      });

      // Update user with customer ID
      await this.prisma.user.update({
        where: { id: userId },
        data: { billingCustomerId: customer.id },
      });

      logger.info('Stripe customer created', { userId, customerId: customer.id });
      return customer.id;
    } catch (error) {
      logger.error('Error creating Stripe customer', { error, userId, email });
      throw error;
    }
  }

  async getOrCreateCustomer(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.billingCustomerId) {
        // Verify customer exists in Stripe
        try {
          await this.stripe.customers.retrieve(user.billingCustomerId);
          return user.billingCustomerId;
        } catch (error) {
          // Customer doesn't exist in Stripe, create new one
          logger.warn('Stripe customer not found, creating new one', { 
            userId, 
            customerId: user.billingCustomerId 
          });
        }
      }

      // Create new customer
      return await this.createCustomer(userId, user.email, user.displayName);
    } catch (error) {
      logger.error('Error getting or creating customer', { error, userId });
      throw error;
    }
  }

  // Subscription management
  async createSubscription(
    userId: string,
    planId: string,
    paymentMethodId?: string
  ): Promise<{ subscriptionId: string; clientSecret?: string }> {
    try {
      const customerId = await this.getOrCreateCustomer(userId);
      const plan = config.plans[planId as keyof typeof config.plans];

      if (!plan || !plan.stripePriceId) {
        throw new Error(`Invalid plan: ${planId}`);
      }

      const subscriptionData: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: plan.stripePriceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId,
          planId,
        },
      };

      // Add payment method if provided
      if (paymentMethodId) {
        subscriptionData.default_payment_method = paymentMethodId;
      }

      // Add trial period for new users
      const existingSubscriptions = await this.prisma.subscription.count({
        where: { userId },
      });

      if (existingSubscriptions === 0 && config.billing.trialPeriodDays > 0) {
        subscriptionData.trial_period_days = config.billing.trialPeriodDays;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionData);

      // Save subscription to database
      await this.createSubscriptionRecord(subscription);

      const result: { subscriptionId: string; clientSecret?: string } = {
        subscriptionId: subscription.id,
      };

      // If payment intent exists, return client secret for confirmation
      if (subscription.latest_invoice && 
          typeof subscription.latest_invoice !== 'string' &&
          subscription.latest_invoice.payment_intent &&
          typeof subscription.latest_invoice.payment_intent !== 'string') {
        result.clientSecret = subscription.latest_invoice.payment_intent.client_secret || undefined;
      }

      logger.info('Subscription created', { userId, subscriptionId: subscription.id, planId });
      return result;
    } catch (error) {
      logger.error('Error creating subscription', { error, userId, planId });
      throw error;
    }
  }

  async updateSubscription(subscriptionId: string, planId: string): Promise<void> {
    try {
      const plan = config.plans[planId as keyof typeof config.plans];
      if (!plan || !plan.stripePriceId) {
        throw new Error(`Invalid plan: ${planId}`);
      }

      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      
      await this.stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscription.items.data[0].id,
          price: plan.stripePriceId,
        }],
        proration_behavior: config.billing.prorationBehavior as any,
        metadata: {
          ...subscription.metadata,
          planId,
        },
      });

      // Update subscription record
      await this.prisma.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: { plan: planId },
      });

      logger.info('Subscription updated', { subscriptionId, planId });
    } catch (error) {
      logger.error('Error updating subscription', { error, subscriptionId, planId });
      throw error;
    }
  }

  async cancelSubscription(subscriptionId: string, immediate: boolean = false): Promise<void> {
    try {
      if (immediate) {
        await this.stripe.subscriptions.cancel(subscriptionId);
        
        // Update subscription record
        await this.prisma.subscription.update({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            status: 'canceled',
            canceledAt: new Date(),
          },
        });
      } else {
        await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
        
        // Update subscription record
        await this.prisma.subscription.update({
          where: { stripeSubscriptionId: subscriptionId },
          data: { cancelAtPeriodEnd: true },
        });
      }

      logger.info('Subscription canceled', { subscriptionId, immediate });
    } catch (error) {
      logger.error('Error canceling subscription', { error, subscriptionId });
      throw error;
    }
  }

  async reactivateSubscription(subscriptionId: string): Promise<void> {
    try {
      await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
      
      // Update subscription record
      await this.prisma.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: { 
          cancelAtPeriodEnd: false,
          canceledAt: null,
        },
      });

      logger.info('Subscription reactivated', { subscriptionId });
    } catch (error) {
      logger.error('Error reactivating subscription', { error, subscriptionId });
      throw error;
    }
  }

  // Payment methods
  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    try {
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      logger.info('Payment method attached', { customerId, paymentMethodId });
    } catch (error) {
      logger.error('Error attaching payment method', { error, customerId, paymentMethodId });
      throw error;
    }
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    try {
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      logger.info('Default payment method set', { customerId, paymentMethodId });
    } catch (error) {
      logger.error('Error setting default payment method', { error, customerId, paymentMethodId });
      throw error;
    }
  }

  // Invoices
  async getInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
    try {
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit,
      });

      return invoices.data;
    } catch (error) {
      logger.error('Error fetching invoices', { error, customerId });
      throw error;
    }
  }

  async createInvoiceItem(
    customerId: string,
    amount: number,
    description: string,
    metadata: Record<string, string> = {}
  ): Promise<string> {
    try {
      const invoiceItem = await this.stripe.invoiceItems.create({
        customer: customerId,
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        description,
        metadata,
      });

      logger.info('Invoice item created', { customerId, amount, description });
      return invoiceItem.id;
    } catch (error) {
      logger.error('Error creating invoice item', { error, customerId, amount, description });
      throw error;
    }
  }

  // Usage and billing
  async recordUsage(subscriptionItemId: string, quantity: number, timestamp?: number): Promise<void> {
    try {
      await this.stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
        quantity,
        timestamp: timestamp || Math.floor(Date.now() / 1000),
        action: 'increment',
      });

      logger.info('Usage recorded', { subscriptionItemId, quantity });
    } catch (error) {
      logger.error('Error recording usage', { error, subscriptionItemId, quantity });
      throw error;
    }
  }

  // Helper methods
  private async createSubscriptionRecord(stripeSubscription: Stripe.Subscription): Promise<void> {
    const userId = stripeSubscription.metadata.userId;
    const planId = stripeSubscription.metadata.planId;
    
    if (!userId) {
      throw new Error('Missing userId in subscription metadata');
    }

    const plan = config.plans[planId as keyof typeof config.plans];
    if (!plan) {
      throw new Error(`Invalid plan: ${planId}`);
    }

    await this.prisma.subscription.create({
      data: {
        userId,
        plan: planId,
        status: stripeSubscription.status,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        trialStart: stripeSubscription.trial_start ? 
          new Date(stripeSubscription.trial_start * 1000) : null,
        trialEnd: stripeSubscription.trial_end ? 
          new Date(stripeSubscription.trial_end * 1000) : null,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: stripeSubscription.customer as string,
        seats: 1,
        aiTokensPerMonth: plan.features.aiTokensPerMonth,
        storageGb: plan.features.storageGb,
      },
    });
  }

  // Webhook helpers
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          logger.info('Unhandled webhook event', { type: event.type });
      }
    } catch (error) {
      logger.error('Error handling webhook event', { error, eventType: event.type });
      throw error;
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    await this.prisma.subscription.upsert({
      where: { stripeSubscriptionId: subscription.id },
      create: {
        userId: subscription.metadata.userId || '',
        plan: subscription.metadata.planId || 'story_starter',
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        seats: 1,
        aiTokensPerMonth: 10000,
        storageGb: 1,
      },
      update: {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
      },
    });

    logger.info('Subscription updated from webhook', { subscriptionId: subscription.id });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    await this.prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
      },
    });

    logger.info('Subscription deleted from webhook', { subscriptionId: subscription.id });
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    // Create or update invoice record
    await this.prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        subscriptionId: '', // Will be filled by subscription lookup
        stripeInvoiceId: invoice.id,
        invoiceNumber: invoice.number || '',
        status: invoice.status || 'paid',
        amountDue: invoice.amount_due / 100,
        amountPaid: invoice.amount_paid / 100,
        currency: invoice.currency,
        dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        paidAt: new Date(),
        periodStart: new Date(invoice.period_start! * 1000),
        periodEnd: new Date(invoice.period_end! * 1000),
        pdfUrl: invoice.invoice_pdf,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
      },
      update: {
        status: invoice.status || 'paid',
        amountPaid: invoice.amount_paid / 100,
        paidAt: new Date(),
      },
    });

    logger.info('Invoice payment succeeded', { invoiceId: invoice.id });
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    await this.prisma.invoice.upsert({
      where: { stripeInvoiceId: invoice.id },
      create: {
        subscriptionId: '', // Will be filled by subscription lookup
        stripeInvoiceId: invoice.id,
        invoiceNumber: invoice.number || '',
        status: invoice.status || 'open',
        amountDue: invoice.amount_due / 100,
        amountPaid: invoice.amount_paid / 100,
        currency: invoice.currency,
        dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        periodStart: new Date(invoice.period_start! * 1000),
        periodEnd: new Date(invoice.period_end! * 1000),
        pdfUrl: invoice.invoice_pdf,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
      },
      update: {
        status: invoice.status || 'open',
      },
    });

    logger.warn('Invoice payment failed', { invoiceId: invoice.id });
  }
}