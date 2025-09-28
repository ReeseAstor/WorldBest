// API Request and Response Types

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string;
  timestamp: Date;
  request_id?: string;
}

export interface ResponseMetadata {
  page?: number;
  limit?: number;
  total?: number;
  has_more?: boolean;
  cursor?: string;
  processing_time_ms?: number;
  cache_hit?: boolean;
  version?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string | string[];
  created_after?: Date;
  created_before?: Date;
  updated_after?: Date;
  updated_before?: Date;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface BulkOperationRequest<T> {
  operations: BulkOperation<T>[];
  atomic?: boolean;
  continue_on_error?: boolean;
}

export interface BulkOperation<T> {
  operation: 'create' | 'update' | 'delete';
  data: T;
  id?: string;
}

export interface BulkOperationResponse {
  success: boolean;
  results: BulkOperationResult[];
  total_operations: number;
  successful_operations: number;
  failed_operations: number;
}

export interface BulkOperationResult {
  index: number;
  operation: string;
  success: boolean;
  id?: string;
  error?: ApiError;
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
  timestamp: Date;
  sequence?: number;
  correlation_id?: string;
}

export enum WebSocketMessageType {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  PING = 'ping',
  PONG = 'pong',
  
  // Authentication
  AUTH_REQUEST = 'auth_request',
  AUTH_SUCCESS = 'auth_success',
  AUTH_FAILURE = 'auth_failure',
  
  // Subscriptions
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  SUBSCRIPTION_UPDATE = 'subscription_update',
  
  // Collaboration
  CURSOR_UPDATE = 'cursor_update',
  SELECTION_UPDATE = 'selection_update',
  CONTENT_UPDATE = 'content_update',
  PRESENCE_UPDATE = 'presence_update',
  
  // Notifications
  NOTIFICATION = 'notification',
  ALERT = 'alert',
  
  // AI
  AI_GENERATION_START = 'ai_generation_start',
  AI_GENERATION_PROGRESS = 'ai_generation_progress',
  AI_GENERATION_COMPLETE = 'ai_generation_complete',
  AI_GENERATION_ERROR = 'ai_generation_error',
  
  // System
  SYSTEM_MESSAGE = 'system_message',
  ERROR = 'error'
}

export interface CollaborationUpdate {
  project_id: string;
  document_id: string;
  user_id: string;
  type: 'insert' | 'delete' | 'format';
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, any>;
  version: number;
  timestamp: Date;
}

export interface PresenceUpdate {
  project_id: string;
  user_id: string;
  user_info: {
    display_name: string;
    avatar_url?: string;
    color: string;
  };
  cursor?: {
    document_id: string;
    position: number;
  };
  selection?: {
    document_id: string;
    start: number;
    end: number;
  };
  status: 'online' | 'idle' | 'editing' | 'away';
  last_seen: Date;
}

export interface ExportRequest {
  project_id: string;
  format: ExportFormat;
  options: ExportOptions;
}

export enum ExportFormat {
  JSON = 'json',
  EPUB = 'epub',
  PDF = 'pdf',
  DOCX = 'docx',
  MARKDOWN = 'markdown',
  HTML = 'html',
  LATEX = 'latex',
  SCRIVENER = 'scrivener',
  FINAL_DRAFT = 'final_draft'
}

export interface ExportOptions {
  include_metadata?: boolean;
  include_comments?: boolean;
  include_revision_history?: boolean;
  include_character_sheets?: boolean;
  include_world_bible?: boolean;
  apply_placeholders?: boolean;
  placeholder_mode?: 'full' | 'redacted' | 'summary';
  style_profile_id?: string;
  format_options?: FormatSpecificOptions;
  chapters?: string[];
  date_range?: {
    start: Date;
    end: Date;
  };
}

export interface FormatSpecificOptions {
  // PDF options
  page_size?: 'A4' | 'Letter' | 'A5';
  margins?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  font_family?: string;
  font_size?: number;
  line_height?: number;
  
  // EPUB options
  cover_image?: string;
  toc_depth?: number;
  chapter_break?: 'page' | 'none';
  
  // Common options
  title_page?: boolean;
  table_of_contents?: boolean;
  page_numbers?: boolean;
  headers?: boolean;
  footers?: boolean;
}

export interface ExportJob {
  id: string;
  user_id: string;
  project_id: string;
  format: ExportFormat;
  status: ExportStatus;
  progress: number;
  file_url?: string;
  file_size?: number;
  error?: string;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  expires_at?: Date;
  metadata?: Record<string, any>;
}

export enum ExportStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
  EXPIRED = 'expired'
}

export interface ImportRequest {
  format: ImportFormat;
  file_url?: string;
  file_data?: string;
  options: ImportOptions;
}

export enum ImportFormat {
  JSON = 'json',
  DOCX = 'docx',
  MARKDOWN = 'markdown',
  SCRIVENER = 'scrivener',
  FINAL_DRAFT = 'final_draft',
  PLAIN_TEXT = 'plain_text'
}

export interface ImportOptions {
  project_id?: string;
  create_new_project?: boolean;
  project_name?: string;
  merge_strategy?: 'replace' | 'append' | 'merge';
  parse_chapters?: boolean;
  chapter_delimiter?: string;
  preserve_formatting?: boolean;
  auto_detect_characters?: boolean;
  auto_detect_locations?: boolean;
}

export interface ImportJob {
  id: string;
  user_id: string;
  format: ImportFormat;
  status: ImportStatus;
  progress: number;
  project_id?: string;
  statistics?: ImportStatistics;
  warnings?: string[];
  error?: string;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
}

export interface ImportStatistics {
  words_imported: number;
  chapters_created: number;
  scenes_created: number;
  characters_detected: number;
  locations_detected: number;
  processing_time_ms: number;
}

export enum ImportStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled'
}

export interface AnalyticsQuery {
  metrics: string[];
  dimensions?: string[];
  filters?: Record<string, any>;
  date_range: {
    start: Date;
    end: Date;
  };
  granularity?: 'hour' | 'day' | 'week' | 'month';
  limit?: number;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
}

export interface AnalyticsResponse {
  query: AnalyticsQuery;
  results: AnalyticsDataPoint[];
  totals?: Record<string, number>;
  metadata: {
    execution_time_ms: number;
    data_freshness: Date;
    partial_data?: boolean;
  };
}

export interface AnalyticsDataPoint {
  timestamp?: Date;
  dimensions?: Record<string, string>;
  metrics: Record<string, number>;
}

export interface NotificationPreferences {
  email: EmailNotificationSettings;
  in_app: InAppNotificationSettings;
  push: PushNotificationSettings;
}

export interface EmailNotificationSettings {
  enabled: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  categories: {
    project_updates: boolean;
    collaboration: boolean;
    billing: boolean;
    security: boolean;
    product_updates: boolean;
    marketing: boolean;
  };
}

export interface InAppNotificationSettings {
  enabled: boolean;
  sound: boolean;
  desktop: boolean;
  categories: Record<string, boolean>;
}

export interface PushNotificationSettings {
  enabled: boolean;
  devices: PushDevice[];
  quiet_hours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

export interface PushDevice {
  id: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  name?: string;
  last_used: Date;
  created_at: Date;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  read_at?: Date;
  action_url?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expires_at?: Date;
  created_at: Date;
}

export enum NotificationType {
  PROJECT_SHARED = 'project_shared',
  COMMENT_ADDED = 'comment_added',
  MENTION = 'mention',
  EXPORT_COMPLETE = 'export_complete',
  IMPORT_COMPLETE = 'import_complete',
  AI_GENERATION_COMPLETE = 'ai_generation_complete',
  SUBSCRIPTION_EXPIRING = 'subscription_expiring',
  PAYMENT_FAILED = 'payment_failed',
  ACHIEVEMENT_EARNED = 'achievement_earned',
  SECURITY_ALERT = 'security_alert',
  SYSTEM_ANNOUNCEMENT = 'system_announcement'
}