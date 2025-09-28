// Billing and Subscription Types

export interface Subscription {
  id: string;
  user_id?: string;
  team_id?: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
  canceled_at?: Date;
  trial_start?: Date;
  trial_end?: Date;
  stripe_subscription_id?: string;
  stripe_customer_id: string;
  created_at: Date;
  updated_at: Date;
  metadata: SubscriptionMetadata;
}

export interface SubscriptionMetadata {
  seats: number;
  addons: Addon[];
  usage_limits: UsageLimits;
  billing_email: string;
  billing_address?: BillingAddress;
  payment_method?: PaymentMethod;
}

export interface UsageLimits {
  projects: number;
  ai_tokens_per_month: number;
  storage_gb: number;
  collaborators_per_project: number;
  exports_per_month: number;
  api_calls_per_hour: number;
  custom_models: number;
  voice_minutes_per_month: number;
}

export interface Addon {
  id: string;
  name: string;
  slug: AddonSlug;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  active: boolean;
  activated_at: Date;
  expires_at?: Date;
}

export enum AddonSlug {
  NARRATION_PREVIEW = 'narration_preview',
  MULTILINGUAL = 'multilingual',
  PUBLISHING_TOOLKIT = 'publishing_toolkit',
  EXTRA_STORAGE = 'extra_storage',
  PRIORITY_SUPPORT = 'priority_support',
  WHITE_LABEL = 'white_label',
  API_ACCESS = 'api_access',
  CUSTOM_TRAINING = 'custom_training'
}

export interface PricingTier {
  id: string;
  name: string;
  slug: SubscriptionPlan;
  price_monthly: number;
  price_yearly: number;
  features: Feature[];
  limits: UsageLimits;
  highlighted: boolean;
  cta_text: string;
  description: string;
}

export interface Feature {
  name: string;
  description?: string;
  included: boolean;
  limit?: number | string;
  category: FeatureCategory;
}

export enum FeatureCategory {
  WRITING = 'writing',
  AI = 'ai',
  COLLABORATION = 'collaboration',
  EXPORT = 'export',
  ANALYTICS = 'analytics',
  SUPPORT = 'support',
  SECURITY = 'security',
  CUSTOMIZATION = 'customization'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  TRIALING = 'trialing',
  UNPAID = 'unpaid',
  PAUSED = 'paused'
}

export enum SubscriptionPlan {
  STORY_STARTER = 'story_starter',
  SOLO_AUTHOR = 'solo_author',
  PRO_CREATOR = 'pro_creator',
  STUDIO_TEAM = 'studio_team',
  ENTERPRISE = 'enterprise'
}

export interface Invoice {
  id: string;
  subscription_id: string;
  stripe_invoice_id?: string;
  invoice_number: string;
  status: InvoiceStatus;
  amount_due: number;
  amount_paid: number;
  currency: string;
  due_date?: Date;
  paid_at?: Date;
  period_start: Date;
  period_end: Date;
  line_items: LineItem[];
  created_at: Date;
  pdf_url?: string;
  hosted_invoice_url?: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_amount: number;
  amount: number;
  currency: string;
  type: 'subscription' | 'addon' | 'usage' | 'credit' | 'discount';
  metadata?: Record<string, any>;
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible'
}

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
  billing_details?: BillingAddress;
  created_at: Date;
}

export enum PaymentMethodType {
  CARD = 'card',
  BANK_ACCOUNT = 'bank_account',
  PAYPAL = 'paypal',
  APPLE_PAY = 'apple_pay',
  GOOGLE_PAY = 'google_pay'
}

export interface BillingAddress {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface Usage {
  id: string;
  user_id?: string;
  team_id?: string;
  subscription_id: string;
  period_start: Date;
  period_end: Date;
  metrics: UsageMetrics;
  created_at: Date;
  updated_at: Date;
}

export interface UsageMetrics {
  ai_tokens_used: number;
  storage_gb_used: number;
  api_calls_made: number;
  exports_generated: number;
  voice_minutes_used: number;
  projects_active: number;
  collaborators_active: number;
  custom_models_trained: number;
  words_written: number;
  scenes_generated: number;
}

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  bonus_percentage: number;
  valid_days: number;
  description: string;
}

export interface UserCredit {
  id: string;
  user_id: string;
  credits_remaining: number;
  credits_purchased: number;
  expires_at?: Date;
  purchase_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  id: string;
  user_id?: string;
  team_id?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  description: string;
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
  invoice_id?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export enum TransactionType {
  SUBSCRIPTION_PAYMENT = 'subscription_payment',
  ADDON_PURCHASE = 'addon_purchase',
  CREDIT_PURCHASE = 'credit_purchase',
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment'
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded'
}

export interface Coupon {
  id: string;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_amount: number;
  currency?: string;
  valid_from: Date;
  valid_until?: Date;
  max_uses?: number;
  used_count: number;
  applicable_plans: SubscriptionPlan[];
  applicable_addons?: AddonSlug[];
  minimum_amount?: number;
  metadata?: Record<string, any>;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_email: string;
  referred_user_id?: string;
  status: ReferralStatus;
  reward_type: 'credit' | 'discount' | 'free_month';
  reward_amount: number;
  reward_claimed: boolean;
  signed_up_at?: Date;
  converted_at?: Date;
  created_at: Date;
  expires_at?: Date;
}

export enum ReferralStatus {
  PENDING = 'pending',
  SIGNED_UP = 'signed_up',
  CONVERTED = 'converted',
  EXPIRED = 'expired',
  CANCELED = 'canceled'
}

export interface BillingEvent {
  id: string;
  type: BillingEventType;
  user_id?: string;
  team_id?: string;
  subscription_id?: string;
  amount?: number;
  currency?: string;
  description: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

export enum BillingEventType {
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELED = 'subscription_canceled',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',
  PAYMENT_SUCCEEDED = 'payment_succeeded',
  PAYMENT_FAILED = 'payment_failed',
  INVOICE_CREATED = 'invoice_created',
  INVOICE_PAID = 'invoice_paid',
  CREDIT_PURCHASED = 'credit_purchased',
  CREDIT_EXPIRED = 'credit_expired',
  ADDON_ACTIVATED = 'addon_activated',
  ADDON_DEACTIVATED = 'addon_deactivated',
  TRIAL_STARTED = 'trial_started',
  TRIAL_ENDING = 'trial_ending',
  TRIAL_ENDED = 'trial_ended'
}