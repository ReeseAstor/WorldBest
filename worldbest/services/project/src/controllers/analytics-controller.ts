import { Request, Response } from 'express';
import { AnalyticsService } from '../services/analytics-service';
import { AuthenticatedRequest } from '../types/auth';

class AnalyticsController {
  private analyticsService = new AnalyticsService();

  async startSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.body;
      const sessionId = await this.analyticsService.startWritingSession(projectId, req.user.id);
      res.status(201).json({ success: true, data: { sessionId } });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
    }
  }

  async endSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { wordsWritten } = req.body;
      await this.analyticsService.endWritingSession(sessionId, wordsWritten);
      res.json({ success: true, message: 'Session ended' });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
    }
  }

  async getProgress(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const progress = await this.analyticsService.getProjectProgress(projectId);
      res.json({ success: true, data: progress });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
    }
  }

  async createBackup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.body;
      const backup = await this.analyticsService.createBackup(projectId, req.user.id);
      res.status(201).json({ success: true, data: backup });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
    }
  }

  async restoreBackup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { backupId } = req.params;
      await this.analyticsService.restoreBackup(backupId);
      res.json({ success: true, message: 'Backup restored' });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Error' });
    }
  }
}

export default new AnalyticsController();