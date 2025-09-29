import Stripe from 'stripe';
import { config } from '../config';
import { logger } from '../utils/logger';

export const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: config.stripe.apiVersion as any,
});

export class StripeService {
  static async createCustomer(email: string, name?: string, metadata?: Record<string, string>) {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata,
      });

      logger.info('Stripe customer created', {
        customerId: customer.id,
        email,
      });

      return customer;
    } catch (error) {
      logger.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  static async updateCustomer(customerId: string, updates: Stripe.CustomerUpdateParams) {
    try {
      const customer = await stripe.customers.update(customerId, updates);

      logger.info('Stripe customer updated', {
        customerId,
        updates: Object.keys(updates),
      });

      return customer;
    } catch (error) {
      logger.error('Error updating Stripe customer:', error);
      throw error;
    }
  }

  static async createSubscription(customerId: string, priceId: string, metadata?: Record<string, string>) {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        metadata,
        expand: ['latest_invoice.payment_intent'],
      });

      logger.info('Stripe subscription created', {
        subscriptionId: subscription.id,
        customerId,
        priceId,
      });

      return subscription;
    } catch (error) {
      logger.error('Error creating Stripe subscription:', error);
      throw error;
    }
  }

  static async updateSubscription(subscriptionId: string, updates: Stripe.SubscriptionUpdateParams) {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, updates);

      logger.info('Stripe subscription updated', {
        subscriptionId,
        updates: Object.keys(updates),
      });

      return subscription;
    } catch (error) {
      logger.error('Error updating Stripe subscription:', error);
      throw error;
    }
  }

  static async cancelSubscription(subscriptionId: string, immediately = false) {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: !immediately,
        ...(immediately && { status: 'canceled' }),
      });

      logger.info('Stripe subscription canceled', {
        subscriptionId,
        immediately,
      });

      return subscription;
    } catch (error) {
      logger.error('Error canceling Stripe subscription:', error);
      throw error;
    }
  }

  static async createPrice(planId: string, amount: number, currency = 'usd', interval = 'month') {
    try {
      const price = await stripe.prices.create({
        unit_amount: amount,
        currency,
        recurring: { interval: interval as any },
        product_data: {
          name: config.plans[planId as keyof typeof config.plans]?.name || planId,
        },
        metadata: {
          planId,
        },
      });

      logger.info('Stripe price created', {
        priceId: price.id,
        planId,
        amount,
        currency,
        interval,
      });

      return price;
    } catch (error) {
      logger.error('Error creating Stripe price:', error);
      throw error;
    }
  }

  static async createPaymentIntent(amount: number, currency = 'usd', customerId?: string, metadata?: Record<string, string>) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        customer: customerId,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      logger.info('Stripe payment intent created', {
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
        customerId,
      });

      return paymentIntent;
    } catch (error) {
      logger.error('Error creating Stripe payment intent:', error);
      throw error;
    }
  }

  static async createSetupIntent(customerId: string, metadata?: Record<string, string>) {
    try {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        metadata,
      });

      logger.info('Stripe setup intent created', {
        setupIntentId: setupIntent.id,
        customerId,
      });

      return setupIntent;
    } catch (error) {
      logger.error('Error creating Stripe setup intent:', error);
      throw error;
    }
  }

  static async constructWebhookEvent(body: string, signature: string) {
    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        config.stripe.webhookSecret
      );

      logger.info('Stripe webhook event received', {
        eventId: event.id,
        type: event.type,
      });

      return event;
    } catch (error) {
      logger.error('Error constructing Stripe webhook event:', error);
      throw error;
    }
  }
}