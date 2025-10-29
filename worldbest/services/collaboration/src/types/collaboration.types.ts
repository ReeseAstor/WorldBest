export interface Document {
  id: string;
  projectId: string;
  title: string;
  content: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastModifiedBy: string;
  collaborators: Collaborator[];
  permissions: DocumentPermissions;
  metadata?: Record<string, any>;
}

export interface Collaborator {
  userId: string;
  username: string;
  email: string;
  role: CollaboratorRole;
  permissions: CollaboratorPermissions;
  joinedAt: Date;
  lastActive: Date;
  isOnline: boolean;
  cursor?: CursorPosition;
  selection?: TextSelection;
  color: string; // For visual identification
}

export enum CollaboratorRole {
  OWNER = 'owner',
  EDITOR = 'editor',
  REVIEWER = 'reviewer',
  VIEWER = 'viewer'
}

export interface CollaboratorPermissions {
  canEdit: boolean;
  canComment: boolean;
  canSuggest: boolean;
  canShare: boolean;
  canDelete: boolean;
  canManagePermissions: boolean;
}

export interface DocumentPermissions {
  isPublic: boolean;
  allowComments: boolean;
  allowSuggestions: boolean;
  requireApproval: boolean;
  canInviteOthers: boolean;
}

export interface CursorPosition {
  line: number;
  column: number;
  timestamp: Date;
}

export interface TextSelection {
  start: CursorPosition;
  end: CursorPosition;
  text: string;
}

// Operational Transform Types
export interface Operation {
  id: string;
  documentId: string;
  userId: string;
  type: OperationType;
  position: number;
  content?: string;
  length?: number;
  version: number;
  timestamp: Date;
  clientId: string;
  metadata?: Record<string, any>;
}

export enum OperationType {
  INSERT = 'insert',
  DELETE = 'delete',
  RETAIN = 'retain'
}

export interface TransformResult {
  operation: Operation;
  transformed: boolean;
  priority: number;
}

export interface OperationResult {
  success: boolean;
  newVersion: number;
  transformedOperations: Operation[];
  conflicts?: OperationConflict[];
  error?: string;
}

export interface OperationConflict {
  operationId: string;
  conflictType: ConflictType;
  description: string;
  suggestedResolution?: string;
}

export enum ConflictType {
  CONCURRENT_EDIT = 'concurrent_edit',
  VERSION_MISMATCH = 'version_mismatch',
  PERMISSION_DENIED = 'permission_denied',
  CONTENT_LOCKED = 'content_locked'
}

// Comment System Types
export interface Comment {
  id: string;
  documentId: string;
  userId: string;
  username: string;
  content: string;
  position: CommentPosition;
  thread?: CommentThread;
  status: CommentStatus;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  reactions: CommentReaction[];
  metadata?: Record<string, any>;
}

export interface CommentPosition {
  start: number;
  end: number;
  line?: number;
  column?: number;
  selectedText?: string;
}

export interface CommentThread {
  id: string;
  parentCommentId?: string;
  replies: Comment[];
  participants: string[];
  isResolved: boolean;
}

export enum CommentStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  DELETED = 'deleted'
}

export interface CommentReaction {
  userId: string;
  emoji: string;
  timestamp: Date;
}

// Suggestion System Types
export interface Suggestion {
  id: string;
  documentId: string;
  userId: string;
  username: string;
  type: SuggestionType;
  position: SuggestionPosition;
  originalText: string;
  suggestedText: string;
  description?: string;
  status: SuggestionStatus;
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewComment?: string;
}

export enum SuggestionType {
  INSERTION = 'insertion',
  DELETION = 'deletion',
  REPLACEMENT = 'replacement',
  FORMATTING = 'formatting'
}

export interface SuggestionPosition {
  start: number;
  end: number;
  line?: number;
  column?: number;
}

export enum SuggestionStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  SUPERSEDED = 'superseded'
}

// Real-time Events
export interface CollaborationEvent {
  id: string;
  type: EventType;
  documentId: string;
  userId: string;
  timestamp: Date;
  data: any;
  broadcast: boolean;
}

export enum EventType {
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  CURSOR_MOVED = 'cursor_moved',
  SELECTION_CHANGED = 'selection_changed',
  OPERATION_APPLIED = 'operation_applied',
  COMMENT_ADDED = 'comment_added',
  COMMENT_RESOLVED = 'comment_resolved',
  SUGGESTION_MADE = 'suggestion_made',
  SUGGESTION_REVIEWED = 'suggestion_reviewed',
  DOCUMENT_SAVED = 'document_saved',
  TYPING_STARTED = 'typing_started',
  TYPING_STOPPED = 'typing_stopped'
}

// Session Management
export interface CollaborationSession {
  id: string;
  documentId: string;
  userId: string;
  socketId: string;
  joinedAt: Date;
  lastActivity: Date;
  permissions: CollaboratorPermissions;
  metadata?: Record<string, any>;
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  activeUsers: number;
  documentSessions: Map<string, number>;
  userSessions: Map<string, number>;
}

// Conflict Resolution
export interface ConflictResolution {
  id: string;
  documentId: string;
  conflictId: string;
  resolutionType: ResolutionType;
  resolvedBy: string;
  resolution: any;
  timestamp: Date;
}

export enum ResolutionType {
  ACCEPT_LOCAL = 'accept_local',
  ACCEPT_REMOTE = 'accept_remote',
  MERGE = 'merge',
  MANUAL = 'manual'
}

// Presence Types
export interface UserPresence {
  userId: string;
  username: string;
  documentId: string;
  cursor?: CursorPosition;
  selection?: TextSelection;
  isTyping: boolean;
  lastSeen: Date;
  color: string;
  metadata?: Record<string, any>;
}

export interface PresenceUpdate {
  userId: string;
  documentId: string;
  cursor?: CursorPosition;
  selection?: TextSelection;
  isTyping?: boolean;
}

// Lock System
export interface DocumentLock {
  id: string;
  documentId: string;
  userId: string;
  lockType: LockType;
  position?: {
    start: number;
    end: number;
  };
  expiresAt: Date;
  createdAt: Date;
}

export enum LockType {
  FULL_DOCUMENT = 'full_document',
  PARAGRAPH = 'paragraph',
  SELECTION = 'selection'
}

// Analytics and Metrics
export interface CollaborationMetrics {
  documentId: string;
  totalCollaborators: number;
  activeCollaborators: number;
  totalOperations: number;
  operationsPerHour: number;
  averageSessionDuration: number;
  conflictResolutionRate: number;
  commentActivity: {
    totalComments: number;
    resolvedComments: number;
    averageResolutionTime: number;
  };
  suggestionActivity: {
    totalSuggestions: number;
    acceptedSuggestions: number;
    rejectedSuggestions: number;
    acceptanceRate: number;
  };
  lastUpdated: Date;
}