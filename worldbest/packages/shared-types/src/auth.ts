// Authentication and Authorization Types

export interface User {
  id: string;
  email: string;
  username?: string;
  display_name: string;
  avatar_url?: string;
  roles: UserRole[];
  plan: SubscriptionPlan;
  billing_customer_id?: string;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
  email_verified: boolean;
  two_factor_enabled: boolean;
  preferences: UserPreferences;
  metadata: UserMetadata;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  email_notifications: EmailNotificationSettings;
  editor_settings: EditorSettings;
  ai_settings: UserAISettings;
}

export interface EmailNotificationSettings {
  project_updates: boolean;
  collaboration_invites: boolean;
  billing_alerts: boolean;
  feature_announcements: boolean;
  writing_reminders: boolean;
  achievement_notifications: boolean;
}

export interface EditorSettings {
  font_family: string;
  font_size: number;
  line_height: number;
  auto_save: boolean;
  auto_save_interval: number;
  spell_check: boolean;
  grammar_check: boolean;
  show_word_count: boolean;
  show_reading_time: boolean;
  typewriter_mode: boolean;
  focus_mode: boolean;
  dark_mode_editor: boolean;
}

export interface UserAISettings {
  default_persona: 'muse' | 'editor' | 'coach';
  auto_suggest: boolean;
  suggestion_frequency: 'low' | 'medium' | 'high';
  content_filters: string[];
  preferred_models: {
    draft: string;
    polish: string;
  };
}

export interface UserMetadata {
  stripe_customer_id?: string;
  total_words_written: number;
  total_projects: number;
  total_ai_tokens_used: number;
  achievements: Achievement[];
  referral_code?: string;
  referred_by?: string;
  writing_streak: number;
  longest_streak: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  earned_at: Date;
  category: AchievementCategory;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export enum AchievementCategory {
  WRITING = 'writing',
  COLLABORATION = 'collaboration',
  CONSISTENCY = 'consistency',
  MILESTONE = 'milestone',
  COMMUNITY = 'community'
}

export enum UserRole {
  USER = 'user',
  PREMIUM_USER = 'premium_user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

export enum SubscriptionPlan {
  STORY_STARTER = 'story_starter',
  SOLO_AUTHOR = 'solo_author',
  PRO_CREATOR = 'pro_creator',
  STUDIO_TEAM = 'studio_team',
  ENTERPRISE = 'enterprise'
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  refresh_token: string;
  expires_at: Date;
  created_at: Date;
  ip_address?: string;
  user_agent?: string;
  device_id?: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_hash: string;
  key_preview: string;
  scopes: string[];
  expires_at?: Date;
  last_used?: Date;
  created_at: Date;
  revoked: boolean;
  revoked_at?: Date;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  is_system: boolean;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  permissions: string[];
  joined_at: Date;
  invited_by: string;
  status: TeamMemberStatus;
}

export enum TeamRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  EDITOR = 'editor',
  WRITER = 'writer',
  VIEWER = 'viewer'
}

export enum TeamMemberStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REMOVED = 'removed'
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  owner_id: string;
  plan: SubscriptionPlan;
  billing_email: string;
  seats_limit: number;
  seats_used: number;
  created_at: Date;
  updated_at: Date;
  settings: TeamSettings;
}

export interface TeamSettings {
  allow_guest_access: boolean;
  require_2fa: boolean;
  ip_allowlist: string[];
  sso_enabled: boolean;
  sso_provider?: string;
  sso_config?: Record<string, any>;
  audit_log_retention_days: number;
  default_project_visibility: 'private' | 'team' | 'public';
}

export interface AuditLog {
  id: string;
  user_id: string;
  team_id?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  changes?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface LoginRequest {
  email: string;
  password: string;
  two_factor_code?: string;
  remember_me?: boolean;
}

export interface SignupRequest {
  email: string;
  password: string;
  username?: string;
  display_name: string;
  referral_code?: string;
  accept_terms: boolean;
  marketing_consent?: boolean;
}

export interface AuthResponse {
  user: User;
  session: Session;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  new_password: string;
}

export interface EmailVerificationRequest {
  token: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  qr_code: string;
  backup_codes: string[];
}

export interface OAuth2Provider {
  id: string;
  name: string;
  client_id: string;
  authorization_url: string;
  token_url: string;
  user_info_url: string;
  scopes: string[];
  enabled: boolean;
}

export interface SSOConfig {
  id: string;
  team_id: string;
  provider: 'saml' | 'oidc';
  enabled: boolean;
  config: {
    issuer?: string;
    sso_url?: string;
    certificate?: string;
    metadata_url?: string;
    client_id?: string;
    client_secret?: string;
  };
  attribute_mapping: {
    email: string;
    name: string;
    groups?: string;
  };
  created_at: Date;
  updated_at: Date;
}