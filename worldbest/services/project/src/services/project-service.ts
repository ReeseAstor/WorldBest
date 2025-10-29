import { prisma } from '@worldbest/database';
import { logger } from '../utils/logger';

export interface CreateProjectData {
  title: string;
  description?: string;
  genre?: string;
  type?: string;
  settings?: any;
  ownerId: string;
}

export interface ProjectFilters {
  search?: string;
  genre?: string;
  type?: string;
  status?: string;
}

export interface ProjectPagination {
  page: number;
  limit: number;
}

export interface ProjectSorting {
  field: string;
  order: 'asc' | 'desc';
}

export interface ProjectStatistics {
  totalWords: number;
  totalChapters: number;
  totalCharacters: number;
  completionPercentage: number;
  lastModified: Date;
  createdAt: Date;
}

export class ProjectService {
  /**
   * Create a new project
   */
  async createProject(data: CreateProjectData) {
    try {
      const project = await prisma.project.create({
        data: {
          title: data.title,
          description: data.description,
          genre: data.genre,
          type: data.type || 'novel',
          settings: data.settings || {},
          ownerId: data.ownerId,
          status: 'draft',
        },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      });

      return project;
    } catch (error) {
      logger.error('Error creating project:', error);
      throw error;
    }
  }

  /**
   * Get project by ID with access control
   */
  async getProjectById(projectId: string, userId: string) {
    try {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { ownerId: userId },
            {
              collaborations: {
                some: {
                  userId: userId,
                  status: 'active',
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
          collaborations: {
            where: { status: 'active' },
            include: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                },
              },
            },
          },
          books: {
            where: { deletedAt: null },
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              order: true,
              status: true,
              chaptersCount: true,
            },
          },
          _count: {
            select: {
              books: true,
              characters: true,
              locations: true,
            },
          },
        },
      });

      return project;
    } catch (error) {
      logger.error('Error getting project:', error);
      throw error;
    }
  }

  /**
   * Get user's projects with filtering, pagination, and sorting
   */
  async getUserProjects(
    userId: string,
    filters: ProjectFilters,
    pagination: ProjectPagination,
    sorting: ProjectSorting
  ) {
    try {
      const whereClause: any = {
        OR: [
          { ownerId: userId },
          {
            collaborations: {
              some: {
                userId: userId,
                status: 'active',
              },
            },
          },
        ],
        deletedAt: null,
      };

      // Apply filters
      if (filters.search) {
        whereClause.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.genre) {
        whereClause.genre = filters.genre;
      }

      if (filters.type) {
        whereClause.type = filters.type;
      }

      if (filters.status) {
        whereClause.status = filters.status;
      }

      // Apply archival filter
      if (filters.status !== 'archived') {
        whereClause.archivedAt = null;
      } else {
        whereClause.archivedAt = { not: null };
      }

      const [projects, totalCount] = await Promise.all([
        prisma.project.findMany({
          where: whereClause,
          include: {
            owner: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
            _count: {
              select: {
                books: true,
                characters: true,
                collaborations: true,
              },
            },
          },
          orderBy: {
            [sorting.field]: sorting.order,
          },
          skip: (pagination.page - 1) * pagination.limit,
          take: pagination.limit,
        }),
        prisma.project.count({ where: whereClause }),
      ]);

      return {
        projects,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: totalCount,
          pages: Math.ceil(totalCount / pagination.limit),
        },
      };
    } catch (error) {
      logger.error('Error getting user projects:', error);
      throw error;
    }
  }

  /**
   * Update project
   */
  async updateProject(projectId: string, userId: string, updateData: any) {
    try {
      // Check if user has permission to update
      const project = await this.getProjectById(projectId, userId);
      if (!project) {
        return null;
      }

      // Check if user is owner or has write permissions
      const canUpdate = project.ownerId === userId || 
        project.collaborations.some(
          collab => collab.userId === userId && 
          ['editor', 'admin'].includes(collab.role)
        );

      if (!canUpdate) {
        throw new Error('Insufficient permissions to update project');
      }

      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      });

      return updatedProject;
    } catch (error) {
      logger.error('Error updating project:', error);
      throw error;
    }
  }

  /**
   * Delete project (soft delete or permanent)
   */
  async deleteProject(projectId: string, userId: string, permanent: boolean = false) {
    try {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          ownerId: userId, // Only owner can delete
        },
      });

      if (!project) {
        return false;
      }

      if (permanent) {
        // Permanent deletion - remove all related data
        await prisma.$transaction(async (tx) => {
          // Delete in correct order to respect foreign key constraints
          await tx.collaboration.deleteMany({ where: { projectId } });
          await tx.chapter.deleteMany({ where: { book: { projectId } } });
          await tx.book.deleteMany({ where: { projectId } });
          await tx.character.deleteMany({ where: { projectId } });
          await tx.location.deleteMany({ where: { projectId } });
          await tx.project.delete({ where: { id: projectId } });
        });
      } else {
        // Soft delete
        await prisma.project.update({
          where: { id: projectId },
          data: { deletedAt: new Date() },
        });
      }

      return true;
    } catch (error) {
      logger.error('Error deleting project:', error);
      throw error;
    }
  }

  /**
   * Restore project from trash
   */
  async restoreProject(projectId: string, userId: string) {
    try {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          ownerId: userId,
          deletedAt: { not: null },
        },
      });

      if (!project) {
        return null;
      }

      const restoredProject = await prisma.project.update({
        where: { id: projectId },
        data: { deletedAt: null },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      });

      return restoredProject;
    } catch (error) {
      logger.error('Error restoring project:', error);
      throw error;
    }
  }

  /**
   * Duplicate project
   */
  async duplicateProject(
    projectId: string,
    userId: string,
    newTitle?: string,
    includeContent: boolean = true
  ) {
    try {
      const originalProject = await this.getProjectById(projectId, userId);
      if (!originalProject) {
        return null;
      }

      const duplicatedProject = await prisma.$transaction(async (tx) => {
        // Create new project
        const newProject = await tx.project.create({
          data: {
            title: newTitle || `${originalProject.title} (Copy)`,
            description: originalProject.description,
            genre: originalProject.genre,
            type: originalProject.type,
            settings: originalProject.settings,
            ownerId: userId,
            status: 'draft',
          },
        });

        if (includeContent) {
          // Duplicate books and chapters
          const books = await tx.book.findMany({
            where: { projectId: originalProject.id, deletedAt: null },
            include: {
              chapters: {
                where: { deletedAt: null },
                orderBy: { order: 'asc' },
              },
            },
          });

          for (const book of books) {
            const newBook = await tx.book.create({
              data: {
                title: book.title,
                description: book.description,
                order: book.order,
                projectId: newProject.id,
                status: 'draft',
              },
            });

            // Duplicate chapters
            for (const chapter of book.chapters) {
              await tx.chapter.create({
                data: {
                  title: chapter.title,
                  content: chapter.content,
                  order: chapter.order,
                  bookId: newBook.id,
                  status: 'draft',
                },
              });
            }
          }

          // Duplicate characters
          const characters = await tx.character.findMany({
            where: { projectId: originalProject.id, deletedAt: null },
          });

          for (const character of characters) {
            await tx.character.create({
              data: {
                name: character.name,
                description: character.description,
                role: character.role,
                attributes: character.attributes,
                projectId: newProject.id,
              },
            });
          }

          // Duplicate locations
          const locations = await tx.location.findMany({
            where: { projectId: originalProject.id, deletedAt: null },
          });

          for (const location of locations) {
            await tx.location.create({
              data: {
                name: location.name,
                description: location.description,
                type: location.type,
                attributes: location.attributes,
                projectId: newProject.id,
              },
            });
          }
        }

        return newProject;
      });

      return await this.getProjectById(duplicatedProject.id, userId);
    } catch (error) {
      logger.error('Error duplicating project:', error);
      throw error;
    }
  }

  /**
   * Toggle archive status
   */
  async toggleArchiveProject(projectId: string, userId: string) {
    try {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          ownerId: userId,
          deletedAt: null,
        },
      });

      if (!project) {
        return null;
      }

      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          archivedAt: project.archivedAt ? null : new Date(),
        },
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      });

      return updatedProject;
    } catch (error) {
      logger.error('Error toggling project archive status:', error);
      throw error;
    }
  }

  /**
   * Get project statistics
   */
  async getProjectStatistics(projectId: string, userId: string): Promise<ProjectStatistics | null> {
    try {
      const project = await this.getProjectById(projectId, userId);
      if (!project) {
        return null;
      }

      const stats = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          books: {
            where: { deletedAt: null },
            include: {
              chapters: {
                where: { deletedAt: null },
                select: {
                  content: true,
                  wordCount: true,
                },
              },
            },
          },
          characters: {
            where: { deletedAt: null },
          },
        },
      });

      if (!stats) {
        return null;
      }

      let totalWords = 0;
      let totalChapters = 0;

      stats.books.forEach(book => {
        totalChapters += book.chapters.length;
        book.chapters.forEach(chapter => {
          totalWords += chapter.wordCount || 0;
        });
      });

      return {
        totalWords,
        totalChapters,
        totalCharacters: stats.characters.length,
        completionPercentage: this.calculateCompletionPercentage(stats),
        lastModified: stats.updatedAt,
        createdAt: stats.createdAt,
      };
    } catch (error) {
      logger.error('Error getting project statistics:', error);
      throw error;
    }
  }

  /**
   * Get project collaborators
   */
  async getProjectCollaborators(projectId: string, userId: string) {
    try {
      const project = await this.getProjectById(projectId, userId);
      if (!project) {
        return null;
      }

      const collaborators = await prisma.collaboration.findMany({
        where: {
          projectId,
          status: 'active',
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return collaborators;
    } catch (error) {
      logger.error('Error getting project collaborators:', error);
      throw error;
    }
  }

  /**
   * Add collaborator to project
   */
  async addCollaborator(
    projectId: string,
    ownerId: string,
    collaboratorEmail: string,
    role: string = 'viewer',
    permissions?: any
  ) {
    try {
      // Check if user is project owner
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          ownerId: ownerId,
        },
      });

      if (!project) {
        return null;
      }

      // Find user by email
      const collaboratorUser = await prisma.user.findUnique({
        where: { email: collaboratorEmail.toLowerCase() },
      });

      if (!collaboratorUser) {
        throw new Error('User not found');
      }

      // Check if already collaborating
      const existingCollaboration = await prisma.collaboration.findFirst({
        where: {
          projectId,
          userId: collaboratorUser.id,
        },
      });

      if (existingCollaboration) {
        return null;
      }

      const collaboration = await prisma.collaboration.create({
        data: {
          projectId,
          userId: collaboratorUser.id,
          role,
          permissions: permissions || {},
          status: 'active',
          invitedBy: ownerId,
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      return collaboration;
    } catch (error) {
      logger.error('Error adding collaborator:', error);
      throw error;
    }
  }

  /**
   * Update collaborator permissions
   */
  async updateCollaborator(
    projectId: string,
    ownerId: string,
    collaboratorId: string,
    updateData: { role?: string; permissions?: any }
  ) {
    try {
      // Check if user is project owner
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          ownerId: ownerId,
        },
      });

      if (!project) {
        return null;
      }

      const updatedCollaboration = await prisma.collaboration.update({
        where: {
          id: collaboratorId,
          projectId,
        },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      return updatedCollaboration;
    } catch (error) {
      logger.error('Error updating collaborator:', error);
      throw error;
    }
  }

  /**
   * Remove collaborator from project
   */
  async removeCollaborator(projectId: string, ownerId: string, collaboratorId: string) {
    try {
      // Check if user is project owner
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          ownerId: ownerId,
        },
      });

      if (!project) {
        return false;
      }

      const deletedCollaboration = await prisma.collaboration.deleteMany({
        where: {
          id: collaboratorId,
          projectId,
        },
      });

      return deletedCollaboration.count > 0;
    } catch (error) {
      logger.error('Error removing collaborator:', error);
      throw error;
    }
  }

  // Private helper methods

  private calculateCompletionPercentage(project: any): number {
    // Simple completion calculation based on content availability
    // This can be enhanced with more sophisticated logic
    let totalPossibleChapters = 0;
    let completedChapters = 0;

    project.books.forEach((book: any) => {
      totalPossibleChapters += Math.max(book.chapters.length, 1);
      book.chapters.forEach((chapter: any) => {
        if (chapter.content && chapter.content.length > 100) {
          completedChapters++;
        }
      });
    });

    return totalPossibleChapters > 0 
      ? Math.round((completedChapters / totalPossibleChapters) * 100)
      : 0;
  }
}

export const projectService = new ProjectService();