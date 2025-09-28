import mongoose, { Schema, Document } from 'mongoose';

// AI Generation Cache Schema
export interface IAIGenerationCache extends Document {
  id: string;
  userId: string;
  projectId?: string;
  requestHash: string;
  content: string;
  metadata: {
    model: string;
    temperature: number;
    maxTokens: number;
    persona: string;
    intent: string;
  };
  createdAt: Date;
  expiresAt: Date;
}

const AIGenerationCacheSchema = new Schema<IAIGenerationCache>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  projectId: { type: String, index: true },
  requestHash: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  metadata: {
    model: { type: String, required: true },
    temperature: { type: Number, required: true },
    maxTokens: { type: Number, required: true },
    persona: { type: String, required: true },
    intent: { type: String, required: true },
  },
  createdAt: { type: Date, default: Date.now, expires: 0 }, // TTL will be set by expiresAt
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
});

// User Activity Log Schema
export interface IUserActivityLog extends Document {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, any>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

const UserActivityLogSchema = new Schema<IUserActivityLog>({
  userId: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  resourceType: { type: String, required: true, index: true },
  resourceId: { type: String, required: true, index: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true },
  ipAddress: { type: String },
  userAgent: { type: String },
});

// Document Collaboration Schema
export interface IDocumentCollaboration extends Document {
  documentId: string;
  documentType: 'scene' | 'chapter' | 'book' | 'project';
  collaborators: Array<{
    userId: string;
    role: 'owner' | 'editor' | 'reviewer' | 'reader';
    permissions: string[];
    joinedAt: Date;
    lastActiveAt: Date;
  }>;
  activeUsers: Array<{
    userId: string;
    cursorPosition: number;
    selection: {
      start: number;
      end: number;
    };
    lastSeen: Date;
  }>;
  changes: Array<{
    userId: string;
    type: 'insert' | 'delete' | 'format';
    position: number;
    content: string;
    timestamp: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentCollaborationSchema = new Schema<IDocumentCollaboration>({
  documentId: { type: String, required: true, unique: true, index: true },
  documentType: { type: String, required: true, enum: ['scene', 'chapter', 'book', 'project'], index: true },
  collaborators: [{
    userId: { type: String, required: true },
    role: { type: String, required: true, enum: ['owner', 'editor', 'reviewer', 'reader'] },
    permissions: [{ type: String }],
    joinedAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
  }],
  activeUsers: [{
    userId: { type: String, required: true },
    cursorPosition: { type: Number, default: 0 },
    selection: {
      start: { type: Number, default: 0 },
      end: { type: Number, default: 0 },
    },
    lastSeen: { type: Date, default: Date.now },
  }],
  changes: [{
    userId: { type: String, required: true },
    type: { type: String, required: true, enum: ['insert', 'delete', 'format'] },
    position: { type: Number, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// AI Model Performance Schema
export interface IAIModelPerformance extends Document {
  model: string;
  persona: string;
  intent: string;
  metrics: {
    averageResponseTime: number;
    successRate: number;
    userSatisfactionScore: number;
    tokenUsage: {
      prompt: number;
      completion: number;
      total: number;
    };
    cost: number;
  };
  period: {
    start: Date;
    end: Date;
  };
  sampleSize: number;
  createdAt: Date;
}

const AIModelPerformanceSchema = new Schema<IAIModelPerformance>({
  model: { type: String, required: true, index: true },
  persona: { type: String, required: true, index: true },
  intent: { type: String, required: true, index: true },
  metrics: {
    averageResponseTime: { type: Number, required: true },
    successRate: { type: Number, required: true },
    userSatisfactionScore: { type: Number, required: true },
    tokenUsage: {
      prompt: { type: Number, required: true },
      completion: { type: Number, required: true },
      total: { type: Number, required: true },
    },
    cost: { type: Number, required: true },
  },
  period: {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },
  sampleSize: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Export models
export const AIGenerationCache = mongoose.model<IAIGenerationCache>('AIGenerationCache', AIGenerationCacheSchema);
export const UserActivityLog = mongoose.model<IUserActivityLog>('UserActivityLog', UserActivityLogSchema);
export const DocumentCollaboration = mongoose.model<IDocumentCollaboration>('DocumentCollaboration', DocumentCollaborationSchema);
export const AIModelPerformance = mongoose.model<IAIModelPerformance>('AIModelPerformance', AIModelPerformanceSchema);