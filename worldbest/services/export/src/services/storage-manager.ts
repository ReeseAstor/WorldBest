import * as fs from 'fs/promises';
import * as path from 'path';
import { FileOutput } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';

export class StorageManager {
  constructor() {
    this.ensureDirectoriesExist();
  }

  async uploadFile(fileOutput: FileOutput, filePath: string): Promise<string> {
    try {
      switch (config.storage.provider) {
        case 'local':
          return await this.uploadToLocal(fileOutput, filePath);
        case 's3':
          return await this.uploadToS3(fileOutput, filePath);
        case 'gcs':
          return await this.uploadToGCS(fileOutput, filePath);
        default:
          throw new Error(`Unsupported storage provider: ${config.storage.provider}`);
      }
    } catch (error) {
      logger.error('Error uploading file', { error, filePath });
      throw error;
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      switch (config.storage.provider) {
        case 'local':
          await this.deleteFromLocal(fileUrl);
          break;
        case 's3':
          await this.deleteFromS3(fileUrl);
          break;
        case 'gcs':
          await this.deleteFromGCS(fileUrl);
          break;
        default:
          throw new Error(`Unsupported storage provider: ${config.storage.provider}`);
      }
    } catch (error) {
      logger.error('Error deleting file', { error, fileUrl });
      throw error;
    }
  }

  private async uploadToLocal(fileOutput: FileOutput, filePath: string): Promise<string> {
    const fullPath = path.join(config.export.outputDirectory, filePath);
    const directory = path.dirname(fullPath);
    
    // Ensure directory exists
    await fs.mkdir(directory, { recursive: true });
    
    // Write file
    await fs.writeFile(fullPath, fileOutput.buffer);
    
    // Return public URL
    const publicUrl = `${config.export.cdnUrl}/${filePath}`;
    
    logger.info('File uploaded to local storage', { filePath, size: fileOutput.size });
    
    return publicUrl;
  }

  private async deleteFromLocal(fileUrl: string): Promise<void> {
    // Extract file path from URL
    const filePath = fileUrl.replace(config.export.cdnUrl + '/', '');
    const fullPath = path.join(config.export.outputDirectory, filePath);
    
    try {
      await fs.unlink(fullPath);
      logger.info('File deleted from local storage', { filePath });
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, which is fine
    }
  }

  private async uploadToS3(fileOutput: FileOutput, filePath: string): Promise<string> {
    // TODO: Implement S3 upload using AWS SDK
    // This would require AWS SDK dependency and proper configuration
    throw new Error('S3 upload not implemented yet');
  }

  private async deleteFromS3(fileUrl: string): Promise<void> {
    // TODO: Implement S3 delete using AWS SDK
    throw new Error('S3 delete not implemented yet');
  }

  private async uploadToGCS(fileOutput: FileOutput, filePath: string): Promise<string> {
    // TODO: Implement Google Cloud Storage upload
    throw new Error('GCS upload not implemented yet');
  }

  private async deleteFromGCS(fileUrl: string): Promise<void> {
    // TODO: Implement Google Cloud Storage delete
    throw new Error('GCS delete not implemented yet');
  }

  private async ensureDirectoriesExist(): Promise<void> {
    try {
      await fs.mkdir(config.export.outputDirectory, { recursive: true });
      await fs.mkdir(config.export.tempDirectory, { recursive: true });
    } catch (error) {
      logger.error('Error creating directories', { error });
    }
  }

  // Get file info without downloading
  async getFileInfo(fileUrl: string): Promise<{ exists: boolean; size?: number; lastModified?: Date }> {
    try {
      switch (config.storage.provider) {
        case 'local':
          return await this.getLocalFileInfo(fileUrl);
        case 's3':
          return await this.getS3FileInfo(fileUrl);
        case 'gcs':
          return await this.getGCSFileInfo(fileUrl);
        default:
          return { exists: false };
      }
    } catch (error) {
      logger.error('Error getting file info', { error, fileUrl });
      return { exists: false };
    }
  }

  private async getLocalFileInfo(fileUrl: string): Promise<{ exists: boolean; size?: number; lastModified?: Date }> {
    const filePath = fileUrl.replace(config.export.cdnUrl + '/', '');
    const fullPath = path.join(config.export.outputDirectory, filePath);
    
    try {
      const stats = await fs.stat(fullPath);
      return {
        exists: true,
        size: stats.size,
        lastModified: stats.mtime,
      };
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return { exists: false };
      }
      throw error;
    }
  }

  private async getS3FileInfo(fileUrl: string): Promise<{ exists: boolean; size?: number; lastModified?: Date }> {
    // TODO: Implement S3 file info
    throw new Error('S3 file info not implemented yet');
  }

  private async getGCSFileInfo(fileUrl: string): Promise<{ exists: boolean; size?: number; lastModified?: Date }> {
    // TODO: Implement GCS file info
    throw new Error('GCS file info not implemented yet');
  }
}