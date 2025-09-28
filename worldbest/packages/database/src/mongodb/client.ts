import mongoose, { Connection } from 'mongoose';
import {
  SceneDraft,
  AIContextCache,
  CollaborationSession,
  AnalyticsEvent,
  PluginMetadata
} from './schemas';

export class MongoDBClient {
  private static connection: Connection | null = null;
  private static connectionPromise: Promise<Connection> | null = null;

  static async connect(): Promise<Connection> {
    if (this.connection && this.connection.readyState === 1) {
      return this.connection;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.createConnection();
    this.connection = await this.connectionPromise;
    this.connectionPromise = null;

    return this.connection;
  }

  private static async createConnection(): Promise<Connection> {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/worldbest';
    
    try {
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
      });

      console.log('MongoDB connected successfully');

      // Set up connection event handlers
      mongoose.connection.on('error', (error) => {
        console.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected');
        this.connection = null;
      });

      return mongoose.connection;
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      this.connectionPromise = null;
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    if (this.connection) {
      await mongoose.disconnect();
      this.connection = null;
      this.connectionPromise = null;
    }
  }

  static getModels() {
    return {
      SceneDraft,
      AIContextCache,
      CollaborationSession,
      AnalyticsEvent,
      PluginMetadata
    };
  }

  // Utility methods for common operations
  static async createSceneDraft(data: any) {
    await this.connect();
    const draft = new SceneDraft(data);
    return draft.save();
  }

  static async getSceneDraft(sceneId: string, version?: number) {
    await this.connect();
    const query: any = { sceneId };
    if (version) {
      query.version = version;
    }
    return SceneDraft.findOne(query).sort({ version: -1 }).exec();
  }

  static async updateSceneDraft(sceneId: string, updates: any) {
    await this.connect();
    return SceneDraft.findOneAndUpdate(
      { sceneId },
      { ...updates, updatedAt: new Date() },
      { new: true, upsert: true }
    ).exec();
  }

  static async cacheAIContext(data: any) {
    await this.connect();
    const expiresAt = new Date(Date.now() + (data.ttl || 86400) * 1000);
    const cache = new AIContextCache({ ...data, expiresAt });
    return cache.save();
  }

  static async getAIContext(contextHash: string) {
    await this.connect();
    const context = await AIContextCache.findOne({ contextHash }).exec();
    
    if (context) {
      // Update access count and last accessed
      await AIContextCache.updateOne(
        { _id: context._id },
        { 
          $inc: { accessCount: 1 },
          $set: { lastAccessed: new Date() }
        }
      ).exec();
    }
    
    return context;
  }

  static async startCollaborationSession(data: any) {
    await this.connect();
    const session = new CollaborationSession(data);
    return session.save();
  }

  static async updateCollaborationSession(sessionId: string, updates: any) {
    await this.connect();
    return CollaborationSession.findByIdAndUpdate(
      sessionId,
      updates,
      { new: true }
    ).exec();
  }

  static async getActiveCollaborationSessions(projectId: string) {
    await this.connect();
    return CollaborationSession.find({
      projectId,
      isActive: true
    }).exec();
  }

  static async logAnalyticsEvent(event: any) {
    await this.connect();
    const analyticsEvent = new AnalyticsEvent(event);
    return analyticsEvent.save();
  }

  static async getAnalyticsEvents(filters: any, options: any = {}) {
    await this.connect();
    const { limit = 100, skip = 0, sort = { timestamp: -1 } } = options;
    
    return AnalyticsEvent
      .find(filters)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .exec();
  }

  static async registerPlugin(pluginData: any) {
    await this.connect();
    const plugin = new PluginMetadata(pluginData);
    return plugin.save();
  }

  static async getPublicPlugins(category?: string) {
    await this.connect();
    const query: any = { isPublic: true, isActive: true };
    if (category) {
      query.category = category;
    }
    
    return PluginMetadata
      .find(query)
      .sort({ 'stats.rating': -1, 'stats.downloads': -1 })
      .exec();
  }
}

// Export singleton instance methods
export const mongoClient = MongoDBClient;