// Consolidated Enums for WorldBest Platform

export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test'
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export enum CacheStrategy {
  NO_CACHE = 'no_cache',
  CACHE_FIRST = 'cache_first',
  NETWORK_FIRST = 'network_first',
  CACHE_ONLY = 'cache_only',
  NETWORK_ONLY = 'network_only',
  STALE_WHILE_REVALIDATE = 'stale_while_revalidate'
}

export enum QueuePriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 20
}

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
  RETRYING = 'retrying'
}

export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  VIDEO = 'video',
  ARCHIVE = 'archive',
  OTHER = 'other'
}

export enum ImageFormat {
  JPEG = 'jpeg',
  PNG = 'png',
  WEBP = 'webp',
  GIF = 'gif',
  SVG = 'svg'
}

export enum DocumentFormat {
  PDF = 'pdf',
  DOCX = 'docx',
  ODT = 'odt',
  RTF = 'rtf',
  TXT = 'txt',
  MD = 'md'
}

export enum AudioFormat {
  MP3 = 'mp3',
  WAV = 'wav',
  OGG = 'ogg',
  M4A = 'm4a',
  FLAC = 'flac'
}

export enum Locale {
  EN_US = 'en-US',
  EN_GB = 'en-GB',
  ES_ES = 'es-ES',
  ES_MX = 'es-MX',
  FR_FR = 'fr-FR',
  DE_DE = 'de-DE',
  IT_IT = 'it-IT',
  PT_BR = 'pt-BR',
  PT_PT = 'pt-PT',
  RU_RU = 'ru-RU',
  ZH_CN = 'zh-CN',
  ZH_TW = 'zh-TW',
  JA_JP = 'ja-JP',
  KO_KR = 'ko-KR',
  AR_SA = 'ar-SA',
  HI_IN = 'hi-IN'
}

export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  CAD = 'CAD',
  AUD = 'AUD',
  JPY = 'JPY',
  CNY = 'CNY',
  INR = 'INR',
  BRL = 'BRL',
  MXN = 'MXN'
}

export enum TimeZone {
  UTC = 'UTC',
  EST = 'America/New_York',
  CST = 'America/Chicago',
  MST = 'America/Denver',
  PST = 'America/Los_Angeles',
  GMT = 'Europe/London',
  CET = 'Europe/Paris',
  JST = 'Asia/Tokyo',
  AEST = 'Australia/Sydney'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export enum Visibility {
  PRIVATE = 'private',
  TEAM = 'team',
  PUBLIC = 'public',
  UNLISTED = 'unlisted'
}

export enum SharePermission {
  VIEW = 'view',
  COMMENT = 'comment',
  EDIT = 'edit',
  ADMIN = 'admin'
}

export enum CommentStatus {
  OPEN = 'open',
  RESOLVED = 'resolved',
  ARCHIVED = 'archived'
}

export enum ReactionType {
  LIKE = 'like',
  LOVE = 'love',
  CELEBRATE = 'celebrate',
  INSIGHTFUL = 'insightful',
  CURIOUS = 'curious'
}

export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
  ESCALATED = 'escalated'
}

export enum ModerationReason {
  SPAM = 'spam',
  INAPPROPRIATE = 'inappropriate',
  VIOLENCE = 'violence',
  HATE_SPEECH = 'hate_speech',
  COPYRIGHT = 'copyright',
  PERSONAL_INFO = 'personal_info',
  OTHER = 'other'
}

export enum ErrorCode {
  // Authentication errors (1xxx)
  AUTH_INVALID_CREDENTIALS = 'AUTH_001',
  AUTH_TOKEN_EXPIRED = 'AUTH_002',
  AUTH_TOKEN_INVALID = 'AUTH_003',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_004',
  AUTH_ACCOUNT_LOCKED = 'AUTH_005',
  AUTH_2FA_REQUIRED = 'AUTH_006',
  AUTH_2FA_INVALID = 'AUTH_007',
  
  // Validation errors (2xxx)
  VALIDATION_REQUIRED_FIELD = 'VAL_001',
  VALIDATION_INVALID_FORMAT = 'VAL_002',
  VALIDATION_OUT_OF_RANGE = 'VAL_003',
  VALIDATION_DUPLICATE = 'VAL_004',
  VALIDATION_CONSTRAINT = 'VAL_005',
  
  // Resource errors (3xxx)
  RESOURCE_NOT_FOUND = 'RES_001',
  RESOURCE_ALREADY_EXISTS = 'RES_002',
  RESOURCE_LOCKED = 'RES_003',
  RESOURCE_QUOTA_EXCEEDED = 'RES_004',
  RESOURCE_DEPENDENCY = 'RES_005',
  
  // Billing errors (4xxx)
  BILLING_PAYMENT_FAILED = 'BILL_001',
  BILLING_SUBSCRIPTION_EXPIRED = 'BILL_002',
  BILLING_QUOTA_EXCEEDED = 'BILL_003',
  BILLING_INVALID_PLAN = 'BILL_004',
  BILLING_CARD_DECLINED = 'BILL_005',
  
  // AI errors (5xxx)
  AI_MODEL_UNAVAILABLE = 'AI_001',
  AI_GENERATION_FAILED = 'AI_002',
  AI_SAFETY_VIOLATION = 'AI_003',
  AI_TOKEN_LIMIT = 'AI_004',
  AI_RATE_LIMIT = 'AI_005',
  
  // System errors (9xxx)
  SYSTEM_INTERNAL_ERROR = 'SYS_001',
  SYSTEM_SERVICE_UNAVAILABLE = 'SYS_002',
  SYSTEM_RATE_LIMIT = 'SYS_003',
  SYSTEM_MAINTENANCE = 'SYS_004',
  SYSTEM_TIMEOUT = 'SYS_005'
}

export enum FeatureFlag {
  NEW_EDITOR = 'new_editor',
  AI_PERSONAS = 'ai_personas',
  COLLABORATION = 'collaboration',
  VOICE_INPUT = 'voice_input',
  CUSTOM_MODELS = 'custom_models',
  MARKETPLACE = 'marketplace',
  ADVANCED_EXPORT = 'advanced_export',
  BETA_FEATURES = 'beta_features'
}

export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}