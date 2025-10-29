import { VersionControlService } from '../services/version-control';

/**
 * Auto-versioning utility for project operations
 * Automatically creates versions when project content changes
 */
class AutoVersioningUtil {
  private versionService: VersionControlService;
  
  constructor() {
    this.versionService = new VersionControlService();
  }

  /**
   * Auto-version project content on save
   */
  async versionProjectContent(
    projectId: string,
    content: any,
    userId: string,
    description?: string
  ): Promise<string> {
    return this.createVersion(
      projectId,
      'content',
      'main',
      content,
      userId,
      description || 'Auto-save content'
    );
  }

  /**
   * Auto-version project metadata on update
   */
  async versionProjectMetadata(
    projectId: string,
    metadata: any,
    userId: string,
    description?: string
  ): Promise<string> {
    return this.createVersion(
      projectId,
      'metadata',
      'main',
      metadata,
      userId,
      description || 'Auto-update metadata'
    );
  }

  /**
   * Auto-version project structure on changes
   */
  async versionProjectStructure(
    projectId: string,
    structure: any,
    userId: string,
    description?: string
  ): Promise<string> {
    return this.createVersion(
      projectId,
      'structure',
      'main',
      structure,
      userId,
      description || 'Auto-update structure'
    );
  }

  /**
   * Auto-version chapter content
   */
  async versionChapterContent(
    projectId: string,
    chapterId: string,
    content: any,
    userId: string,
    description?: string
  ): Promise<string> {
    return this.createVersion(
      projectId,
      'content',
      `chapter:${chapterId}`,
      content,
      userId,
      description || `Auto-save chapter ${chapterId}`
    );
  }

  /**
   * Auto-version character data
   */
  async versionCharacterData(
    projectId: string,
    characterId: string,
    data: any,
    userId: string,
    description?: string
  ): Promise<string> {
    return this.createVersion(
      projectId,
      'metadata',
      `character:${characterId}`,
      data,
      userId,
      description || `Auto-update character ${characterId}`
    );
  }

  /**
   * Auto-version worldbuilding data
   */
  async versionWorldbuildingData(
    projectId: string,
    elementId: string,
    data: any,
    userId: string,
    description?: string
  ): Promise<string> {
    return this.createVersion(
      projectId,
      'metadata',
      `worldbuilding:${elementId}`,
      data,
      userId,
      description || `Auto-update worldbuilding ${elementId}`
    );
  }

  /**
   * Create a milestone version with tags
   */
  async createMilestone(
    projectId: string,
    artifactType: 'content' | 'metadata' | 'structure',
    artifactId: string,
    content: any,
    userId: string,
    milestoneName: string,
    description?: string
  ): Promise<string> {
    return this.createVersion(
      projectId,
      artifactType,
      artifactId,
      content,
      userId,
      description || `Milestone: ${milestoneName}`,
      ['milestone', milestoneName.toLowerCase().replace(/\s+/g, '-')]
    );
  }

  /**
   * Restore project to a specific version
   */
  async restoreProjectToVersion(
    versionId: string,
    userId: string,
    createBackup: boolean = true
  ): Promise<{
    restored: any;
    backupVersionId?: string;
  }> {
    const version = await this.versionService.getVersion(versionId);
    if (!version) {
      throw new Error('Version not found');
    }

    const restoredContent = await this.versionService.reconstructContent(versionId);
    const parsedContent = JSON.parse(restoredContent);

    let backupVersionId: string | undefined;

    if (createBackup) {
      // Create a backup of current state before restoration
      backupVersionId = await this.createVersion(
        version.projectId,
        version.artifactType,
        version.artifactId,
        parsedContent, // This would need to be the current content
        userId,
        `Backup before restore to v${version.versionNumber}`,
        ['backup', 'pre-restore']
      );
    }

    return {
      restored: parsedContent,
      backupVersionId
    };
  }

  /**
   * Get version diff for content changes
   */
  async getContentDiff(
    projectId: string,
    artifactType: string,
    artifactId: string,
    fromVersionId?: string,
    toVersionId?: string
  ): Promise<any> {
    if (!fromVersionId || !toVersionId) {
      // Get the latest two versions
      const history = await this.versionService.getVersionHistory(
        projectId,
        artifactType,
        artifactId,
        { limit: 2 }
      );

      if (history.versions.length < 2) {
        return { changes: [], stats: { additions: 0, deletions: 0, modifications: 0 } };
      }

      fromVersionId = history.versions[1].id;
      toVersionId = history.versions[0].id;
    }

    return this.versionService.compareVersions(fromVersionId, toVersionId);
  }

  /**
   * Auto-cleanup versions based on project settings
   */
  async autoCleanupVersions(
    projectId: string,
    settings: {
      maxVersionsPerArtifact?: number;
      maxAge?: number;
      keepMilestones?: boolean;
      keepDaily?: boolean;
    } = {}
  ): Promise<{
    deletedCount: number;
    preservedCount: number;
  }> {
    const {
      maxVersionsPerArtifact = 100,
      maxAge = 90, // 90 days
      keepMilestones = true,
      keepDaily = true
    } = settings;

    return this.versionService.cleanupVersions(projectId, {
      maxVersions: maxVersionsPerArtifact,
      maxAge,
      keepTagged: keepMilestones,
      keepMajorVersions: keepDaily
    });
  }

  /**
   * Get version analytics for a project
   */
  async getVersionAnalytics(projectId: string): Promise<{
    totalVersions: number;
    totalSize: number;
    compressionEfficiency: number;
    mostActiveArtifacts: Array<{
      type: string;
      id: string;
      versionCount: number;
    }>;
    versioningTrends: Array<{
      date: string;
      count: number;
    }>;
  }> {
    const stats = await this.versionService.getVersionStatistics(projectId);

    return {
      totalVersions: stats.totalVersions,
      totalSize: stats.totalSize,
      compressionEfficiency: 1 - stats.compressionRatio,
      mostActiveArtifacts: Object.entries(stats.artifactTypes).map(([type, count]) => ({
        type,
        id: 'main', // This would need more detailed artifact tracking
        versionCount: count
      })),
      versioningTrends: stats.activityTimeline
    };
  }

  // Private helper method
  private async createVersion(
    projectId: string,
    artifactType: 'content' | 'metadata' | 'structure',
    artifactId: string,
    content: any,
    userId: string,
    description?: string,
    tags?: string[]
  ): Promise<string> {
    const version = await this.versionService.createVersion({
      projectId,
      artifactType,
      artifactId,
      content,
      userId,
      description,
      tags
    });

    return version.id;
  }
}

// Export singleton instance
export const autoVersioning = new AutoVersioningUtil();
export default AutoVersioningUtil;