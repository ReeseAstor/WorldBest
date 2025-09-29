import { PrismaClient } from '@worldbest/database';
import { ProjectData, BookData, ChapterData, SceneData, ExportOptions } from '../types';
import { logger } from '../utils/logger';

export class DataCollector {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = PrismaClient.getInstance();
  }

  async collectProjectData(
    projectId: string,
    userId: string,
    options: ExportOptions
  ): Promise<ProjectData> {
    try {
      // Verify user has access to the project
      const project = await this.prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { ownerId: userId },
            {
              collaborators: {
                some: {
                  userId,
                },
              },
            },
          ],
          deletedAt: null,
        },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
          styleProfile: true,
        },
      });

      if (!project) {
        throw new Error('Project not found or insufficient permissions');
      }

      // Collect books and chapters
      const books = await this.collectBooks(projectId, options);

      // Collect worldbuilding data if requested
      const characters = options.includeCharacterProfiles 
        ? await this.collectCharacters(projectId)
        : [];

      const locations = options.includeWorldbuilding
        ? await this.collectLocations(projectId)
        : [];

      const cultures = options.includeWorldbuilding
        ? await this.collectCultures(projectId)
        : [];

      const languages = options.includeWorldbuilding
        ? await this.collectLanguages(projectId)
        : [];

      const economies = options.includeWorldbuilding
        ? await this.collectEconomies(projectId)
        : [];

      const timelines = options.includeTimeline
        ? await this.collectTimelines(projectId)
        : [];

      return {
        project,
        books,
        characters,
        locations,
        cultures,
        languages,
        economies,
        timelines,
      };
    } catch (error) {
      logger.error('Error collecting project data', { error, projectId, userId });
      throw error;
    }
  }

  private async collectBooks(projectId: string, options: ExportOptions): Promise<BookData[]> {
    const where: any = { projectId };
    
    if (options.includeBooks?.length) {
      where.id = { in: options.includeBooks };
    }

    const books = await this.prisma.book.findMany({
      where,
      include: {
        chapters: {
          where: options.includeChapters?.length 
            ? { id: { in: options.includeChapters } }
            : undefined,
          include: {
            scenes: {
              where: options.includeScenes?.length
                ? { id: { in: options.includeScenes } }
                : undefined,
              include: {
                textVersions: {
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
                characters: {
                  include: {
                    character: {
                      select: {
                        id: true,
                        name: true,
                        aliases: true,
                      },
                    },
                  },
                },
                location: {
                  select: {
                    id: true,
                    name: true,
                    region: true,
                  },
                },
                povCharacter: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                placeholders: options.includePlaceholders ? true : false,
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { number: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    return books.map(book => ({
      book,
      chapters: book.chapters.map(chapter => ({
        chapter,
        scenes: chapter.scenes.map(scene => ({
          scene,
          textVersions: scene.textVersions,
          characters: scene.characters.map(sc => sc.character),
          location: scene.location,
        })),
      })),
    }));
  }

  private async collectCharacters(projectId: string) {
    return this.prisma.character.findMany({
      where: { projectId },
      include: {
        relationships: {
          include: {
            relatedChar: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        secrets: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  private async collectLocations(projectId: string) {
    return this.prisma.location.findMany({
      where: { projectId },
      include: {
        locationCultures: {
          include: {
            culture: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  private async collectCultures(projectId: string) {
    return this.prisma.culture.findMany({
      where: { projectId },
      include: {
        language: {
          select: {
            id: true,
            name: true,
          },
        },
        economy: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        locations: {
          include: {
            location: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  private async collectLanguages(projectId: string) {
    return this.prisma.language.findMany({
      where: { projectId },
      include: {
        cultures: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  private async collectEconomies(projectId: string) {
    return this.prisma.economy.findMany({
      where: { projectId },
      include: {
        cultures: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  private async collectTimelines(projectId: string) {
    return this.prisma.timeline.findMany({
      where: { projectId },
      include: {
        events: {
          orderBy: { date: 'asc' },
        },
        eras: {
          orderBy: { startDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }
}