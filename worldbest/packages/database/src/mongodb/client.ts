import mongoose from 'mongoose';
import { config } from './config';

class MongoDBClient {
  private connection: mongoose.Connection | null = null;

  async connect(): Promise<void> {
    try {
      const mongoUri = process.env.MONGODB_URI || config.mongodb.uri;
      
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0,
      });

      this.connection = mongoose.connection;

      this.connection.on('connected', () => {
        console.log('MongoDB connected successfully');
      });

      this.connection.on('error', (error) => {
        console.error('MongoDB connection error:', error);
      });

      this.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
      });

    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await mongoose.disconnect();
      this.connection = null;
    }
  }

  getConnection(): mongoose.Connection {
    if (!this.connection) {
      throw new Error('MongoDB not connected. Call connect() first.');
    }
    return this.connection;
  }

  isConnected(): boolean {
    return this.connection?.readyState === 1;
  }
}

export const MongoDBClient = new MongoDBClient();