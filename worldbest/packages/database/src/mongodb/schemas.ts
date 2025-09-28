import mongoose, { Schema, Document } from 'mongoose';

// Scene Draft Schema - for storing working drafts and AI-generated content
export interface ISceneDraft extends Document {
  sceneId: string;
  projectId: string;
  authorId: string;
  content: {
    raw: string;
    formatted: any; // Rich text format (Slate/ProseMirror)
    wordCount: number;
    lastEditPosition?: number;
  };
  metadata: {
    mood?: string;
    pacing?: string;
    tension?: number;
    sensoryDetails?: string[];
    emotionalBeats?: string[];
  };
  aiSuggestions?: Array<{
    id: string;
    type: 'continuation' | 'alternative' | 'improvement';
    content: string;
    confidence: number;
    accepted?: boolean;
    timestamp: Date;
  }>;
  collaborators?: Array<{
    userId: string;
    cursor?: number;
    selection?: { start: number; end: number };
    lastSeen: Date;
  }>;
  revisionHistory: Array<{
    content: string;
    authorId: string;
    timestamp: Date;
    changeDescription?: string;
  }>;
  comments?: Array<{
    id: string;
    authorId: string;
    content: string;
    position: { start: number; end: number };
    resolved: boolean;
    replies?: Array<{
      authorId: string;
      content: string;
      timestamp: Date;
    }>;
    timestamp: Date;
  }>;
  status: 'draft' | 'review' | 'approved' | 'published';
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const SceneDraftSchema = new Schema({
  sceneId: { type: String, required: true, index: true },
  projectId: { type: String, required: true, index: true },
  authorId: { type: String, required: true, index: true },
  content: {
    raw: { type: String, required: true },
    formatted: { type: Schema.Types.Mixed },
    wordCount: { type: Number, default: 0 },
    lastEditPosition: Number
  },
  metadata: {
    mood: String,
    pacing: String,
    tension: Number,
    sensoryDetails: [String],
    emotionalBeats: [String]
  },
  aiSuggestions: [{
    id: String,
    type: { type: String, enum: ['continuation', 'alternative', 'improvement'] },
    content: String,
    confidence: Number,
    accepted: Boolean,
    timestamp: { type: Date, default: Date.now }
  }],
  collaborators: [{
    userId: String,
    cursor: Number,
    selection: {
      start: Number,
      end: Number
    },
    lastSeen: Date
  }],
  revisionHistory: [{
    content: String,
    authorId: String,
    timestamp: { type: Date, default: Date.now },
    changeDescription: String
  }],
  comments: [{
    id: String,
    authorId: String,
    content: String,
    position: {
      start: Number,
      end: Number
    },
    resolved: { type: Boolean, default: false },
    replies: [{
      authorId: String,
      content: String,
      timestamp: { type: Date, default: Date.now }
    }],
    timestamp: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['draft', 'review', 'approved', 'published'],
    default: 'draft'
  },
  version: { type: Number, default: 1 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SceneDraftSchema.index({ sceneId: 1, version: -1 });
SceneDraftSchema.index({ projectId: 1, status: 1 });
SceneDraftSchema.index({ 'collaborators.userId': 1 });

export const SceneDraft = mongoose.model<ISceneDraft>('SceneDraft', SceneDraftSchema);

// AI Context Cache Schema
export interface IAIContextCache extends Document {
  projectId: string;
  contextType: 'project' | 'book' | 'chapter' | 'character' | 'world';
  contextId: string;
  contextHash: string;
  summary: string;
  keyPoints: string[];
  entities: {
    characters: Array<{ id: string; name: string; relevance: number }>;
    locations: Array<{ id: string; name: string; relevance: number }>;
    events: Array<{ description: string; importance: number }>;
  };
  embedding?: number[];
  metadata: Record<string, any>;
  ttl: number;
  accessCount: number;
  lastAccessed: Date;
  createdAt: Date;
  expiresAt: Date;
}

const AIContextCacheSchema = new Schema({
  projectId: { type: String, required: true, index: true },
  contextType: {
    type: String,
    enum: ['project', 'book', 'chapter', 'character', 'world'],
    required: true
  },
  contextId: { type: String, required: true },
  contextHash: { type: String, required: true, unique: true },
  summary: { type: String, required: true },
  keyPoints: [String],
  entities: {
    characters: [{
      id: String,
      name: String,
      relevance: Number
    }],
    locations: [{
      id: String,
      name: String,
      relevance: Number
    }],
    events: [{
      description: String,
      importance: Number
    }]
  },
  embedding: [Number],
  metadata: { type: Schema.Types.Mixed },
  ttl: { type: Number, default: 86400 }, // 24 hours default
  accessCount: { type: Number, default: 0 },
  lastAccessed: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

AIContextCacheSchema.index({ contextHash: 1 });
AIContextCacheSchema.index({ projectId: 1, contextType: 1 });
AIContextCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AIContextCache = mongoose.model<IAIContextCache>('AIContextCache', AIContextCacheSchema);

// Collaboration Session Schema
export interface ICollaborationSession extends Document {
  projectId: string;
  documentId: string;
  documentType: 'scene' | 'chapter' | 'character' | 'worldbuilding';
  participants: Array<{
    userId: string;
    userName: string;
    avatarUrl?: string;
    color: string;
    role: 'owner' | 'editor' | 'viewer';
    joinedAt: Date;
    leftAt?: Date;
    isActive: boolean;
    cursor?: {
      position: number;
      timestamp: Date;
    };
    selection?: {
      start: number;
      end: number;
      timestamp: Date;
    };
  }>;
  operations: Array<{
    userId: string;
    type: 'insert' | 'delete' | 'format' | 'comment';
    position: number;
    content?: string;
    length?: number;
    attributes?: Record<string, any>;
    timestamp: Date;
    version: number;
  }>;
  chat: Array<{
    userId: string;
    message: string;
    timestamp: Date;
  }>;
  documentVersion: number;
  isActive: boolean;
  startedAt: Date;
  endedAt?: Date;
}

const CollaborationSessionSchema = new Schema({
  projectId: { type: String, required: true, index: true },
  documentId: { type: String, required: true, index: true },
  documentType: {
    type: String,
    enum: ['scene', 'chapter', 'character', 'worldbuilding'],
    required: true
  },
  participants: [{
    userId: { type: String, required: true },
    userName: String,
    avatarUrl: String,
    color: String,
    role: { type: String, enum: ['owner', 'editor', 'viewer'] },
    joinedAt: { type: Date, default: Date.now },
    leftAt: Date,
    isActive: { type: Boolean, default: true },
    cursor: {
      position: Number,
      timestamp: Date
    },
    selection: {
      start: Number,
      end: Number,
      timestamp: Date
    }
  }],
  operations: [{
    userId: String,
    type: { type: String, enum: ['insert', 'delete', 'format', 'comment'] },
    position: Number,
    content: String,
    length: Number,
    attributes: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
    version: Number
  }],
  chat: [{
    userId: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  documentVersion: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  startedAt: { type: Date, default: Date.now },
  endedAt: Date
});

CollaborationSessionSchema.index({ projectId: 1, isActive: 1 });
CollaborationSessionSchema.index({ documentId: 1, documentType: 1 });
CollaborationSessionSchema.index({ 'participants.userId': 1 });

export const CollaborationSession = mongoose.model<ICollaborationSession>('CollaborationSession', CollaborationSessionSchema);

// Analytics Event Schema
export interface IAnalyticsEvent extends Document {
  userId?: string;
  sessionId: string;
  eventType: string;
  eventCategory: string;
  eventData: Record<string, any>;
  projectId?: string;
  documentId?: string;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  performance?: {
    loadTime?: number;
    renderTime?: number;
    apiLatency?: number;
  };
}

const AnalyticsEventSchema = new Schema({
  userId: { type: String, index: true },
  sessionId: { type: String, required: true, index: true },
  eventType: { type: String, required: true, index: true },
  eventCategory: { type: String, required: true, index: true },
  eventData: { type: Schema.Types.Mixed },
  projectId: { type: String, index: true },
  documentId: String,
  timestamp: { type: Date, default: Date.now, index: true },
  userAgent: String,
  ipAddress: String,
  location: {
    country: String,
    region: String,
    city: String
  },
  performance: {
    loadTime: Number,
    renderTime: Number,
    apiLatency: Number
  }
});

AnalyticsEventSchema.index({ userId: 1, timestamp: -1 });
AnalyticsEventSchema.index({ projectId: 1, eventType: 1 });
AnalyticsEventSchema.index({ timestamp: -1 });

export const AnalyticsEvent = mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema);

// Plugin Metadata Schema
export interface IPluginMetadata extends Document {
  pluginId: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: 'prompt' | 'export' | 'import' | 'analysis' | 'visualization' | 'integration';
  tags: string[];
  icon?: string;
  screenshots?: string[];
  documentation?: string;
  pricing: {
    type: 'free' | 'paid' | 'subscription';
    price?: number;
    currency?: string;
    billingCycle?: 'monthly' | 'yearly' | 'one-time';
  };
  requirements: {
    minPlan?: string;
    permissions?: string[];
    dependencies?: Array<{ pluginId: string; version: string }>;
  };
  stats: {
    downloads: number;
    activeUsers: number;
    rating: number;
    reviewCount: number;
  };
  configuration?: Record<string, any>;
  webhooks?: Array<{
    event: string;
    url: string;
    secret?: string;
  }>;
  isActive: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PluginMetadataSchema = new Schema({
  pluginId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  version: { type: String, required: true },
  author: { type: String, required: true },
  description: String,
  category: {
    type: String,
    enum: ['prompt', 'export', 'import', 'analysis', 'visualization', 'integration'],
    required: true
  },
  tags: [String],
  icon: String,
  screenshots: [String],
  documentation: String,
  pricing: {
    type: { type: String, enum: ['free', 'paid', 'subscription'] },
    price: Number,
    currency: String,
    billingCycle: { type: String, enum: ['monthly', 'yearly', 'one-time'] }
  },
  requirements: {
    minPlan: String,
    permissions: [String],
    dependencies: [{
      pluginId: String,
      version: String
    }]
  },
  stats: {
    downloads: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 }
  },
  configuration: { type: Schema.Types.Mixed },
  webhooks: [{
    event: String,
    url: String,
    secret: String
  }],
  isActive: { type: Boolean, default: true },
  isPublic: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

PluginMetadataSchema.index({ pluginId: 1 });
PluginMetadataSchema.index({ category: 1, isPublic: 1 });
PluginMetadataSchema.index({ tags: 1 });
PluginMetadataSchema.index({ 'stats.rating': -1 });

export const PluginMetadata = mongoose.model<IPluginMetadata>('PluginMetadata', PluginMetadataSchema);

// Export all models
export default {
  SceneDraft,
  AIContextCache,
  CollaborationSession,
  AnalyticsEvent,
  PluginMetadata
};