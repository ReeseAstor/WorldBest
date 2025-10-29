import { PrismaClient } from '@worldbest/database';
import { subDays, startOfDay, endOfDay } from 'date-fns';

interface WritingSession {
  id: string;
  projectId: string;
  userId: string;
  startTime: Date;
  duration: number;
  wordsWritten: number;
}

interface ProgressMetrics {
  totalWords: number;
  averageWordsPerDay: number;
  streakDays: number;
  productivityScore: number;
}

interface ProjectBackup {
  id: string;
  projectId: string;
  structure: string;
  checksum: string;
  createdAt: Date;
}

class AnalyticsService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async startWritingSession(projectId: string, userId: string): Promise<string> {
    const session = await this.prisma.writingSession.create({
      data: {
        id: require('uuid').v4(),
        projectId,
        userId,
        startTime: new Date(),
        duration: 0,
        wordsWritten: 0
      }
    });
    return session.id;
  }

  async endWritingSession(sessionId: string, wordsWritten: number): Promise<void> {
    const session = await this.prisma.writingSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error('Session not found');

    const duration = Math.round((Date.now() - session.startTime.getTime()) / (1000 * 60));
    await this.prisma.writingSession.update({
      where: { id: sessionId },
      data: { duration, wordsWritten, endTime: new Date() }
    });
  }

  async getProjectProgress(projectId: string): Promise<ProgressMetrics> {
    const sessions = await this.prisma.writingSession.findMany({
      where: { projectId },
      orderBy: { startTime: 'desc' }
    });

    const totalWords = sessions.reduce((sum, s) => sum + s.wordsWritten, 0);
    const recentSessions = sessions.filter(s => s.startTime >= subDays(new Date(), 30));
    const averageWordsPerDay = recentSessions.length > 0 
      ? recentSessions.reduce((sum, s) => sum + s.wordsWritten, 0) / 30 
      : 0;
    const streakDays = this.calculateStreak(sessions);
    const productivityScore = Math.min(100, Math.round(
      (averageWordsPerDay / 500 * 60) + (streakDays / 7 * 40)
    ));

    return { totalWords, averageWordsPerDay, streakDays, productivityScore };
  }

  async createBackup(projectId: string, userId: string): Promise<ProjectBackup> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { chapters: true }
    });
    if (!project) throw new Error('Project not found');

    const structure = JSON.stringify({ project, timestamp: new Date() });
    const checksum = require('crypto').createHash('sha256').update(structure).digest('hex');

    return await this.prisma.projectBackup.create({
      data: {
        id: require('uuid').v4(),
        projectId,
        userId,
        structure,
        checksum,
        size: Buffer.byteLength(structure)
      }
    });
  }

  async restoreBackup(backupId: string): Promise<void> {
    const backup = await this.prisma.projectBackup.findUnique({ where: { id: backupId } });
    if (!backup) throw new Error('Backup not found');

    const data = JSON.parse(backup.structure);
    await this.prisma.project.update({
      where: { id: backup.projectId },
      data: {
        title: data.project.title,
        description: data.project.description,
        structure: data.project.structure
      }
    });
  }

  private calculateStreak(sessions: any[]): number {
    let streak = 0;
    let currentDate = startOfDay(new Date());

    while (true) {
      const dayStart = startOfDay(currentDate);
      const dayEnd = endOfDay(currentDate);
      const hasSession = sessions.some(s => 
        s.startTime >= dayStart && s.startTime <= dayEnd && s.wordsWritten > 0
      );

      if (hasSession) {
        streak++;
        currentDate = subDays(currentDate, 1);
      } else {
        break;
      }
    }
    return streak;
  }
}

export { AnalyticsService, WritingSession, ProgressMetrics, ProjectBackup };