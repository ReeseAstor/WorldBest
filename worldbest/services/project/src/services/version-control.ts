import { PrismaClient } from '@worldbest/database';
import { createHash } from 'crypto';
import { diff_match_patch } from 'diff-match-patch';

interface VersionData {
  projectId: string;
  artifactType: 'content' | 'metadata' | 'structure';
  artifactId: string;
  content: any;
  userId: string;
  description?: string;
  tags?: string[];
}

interface DeltaCompression {
  type: 'full' | 'delta';
  data: string;
  baseVersionId?: string;
  compressionRatio: number;
  checksum: string;
}

interface VersionMetadata {
  id: string;
  projectId: string;
  artifactType: string;
  artifactId: string;
  versionNumber: number;
  parentVersionId?: string;
  userId: string;
  description?: string;
  tags: string[];
  createdAt: Date;
  size: number;
  deltaCompression: DeltaCompression;
  metadata: Record<string, any>;
}

class VersionControlService {
  private prisma: PrismaClient;
  private dmp: diff_match_patch;
  private readonly MAX_DELTA_CHAIN_LENGTH = 10;
  private readonly COMPRESSION_THRESHOLD = 0.7; // 70% compression required for delta

  constructor() {
    this.prisma = new PrismaClient();
    this.dmp = new diff_match_patch();
    this.dmp.Diff_Timeout = 1.0; // 1 second timeout for diff operations
    this.dmp.Diff_EditCost = 4; // Cost of an edit operation
  }

  /**
   * Create a new version of a project artifact
   */
  async createVersion(data: VersionData): Promise<VersionMetadata> {
    const { projectId, artifactType, artifactId, content, userId, description, tags = [] } = data;

    // Get the latest version for this artifact
    const latestVersion = await this.getLatestVersion(projectId, artifactType, artifactId);
    const versionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    // Serialize content
    const serializedContent = JSON.stringify(content);
    const contentSize = Buffer.byteLength(serializedContent, 'utf8');

    // Calculate checksum
    const checksum = this.calculateChecksum(serializedContent);

    // Determine compression strategy
    let deltaCompression: DeltaCompression;
    
    if (!latestVersion || this.shouldCreateFullVersion(latestVersion)) {
      // Create full version
      deltaCompression = {
        type: 'full',
        data: serializedContent,
        compressionRatio: 1.0,
        checksum
      };
    } else {
      // Create delta version
      const latestContent = await this.reconstructContent(latestVersion.id);
      const delta = this.createDelta(latestContent, serializedContent);
      
      if (delta.compressionRatio < this.COMPRESSION_THRESHOLD) {
        // Delta is efficient, use it
        deltaCompression = {
          type: 'delta',
          data: delta.data,
          baseVersionId: latestVersion.id,
          compressionRatio: delta.compressionRatio,
          checksum
        };
      } else {
        // Delta is not efficient, create full version
        deltaCompression = {
          type: 'full',
          data: serializedContent,
          compressionRatio: 1.0,
          checksum
        };
      }
    }

    // Store version in database
    const version = await this.prisma.projectVersion.create({
      data: {
        projectId,
        artifactType,
        artifactId,
        versionNumber,
        parentVersionId: latestVersion?.id,
        userId,
        description,
        tags,
        size: contentSize,
        deltaType: deltaCompression.type,
        deltaData: deltaCompression.data,
        baseVersionId: deltaCompression.baseVersionId,
        compressionRatio: deltaCompression.compressionRatio,
        checksum: deltaCompression.checksum,
        metadata: {}
      }
    });

    return this.mapToVersionMetadata(version);
  }

  /**
   * Get a specific version by ID
   */
  async getVersion(versionId: string): Promise<VersionMetadata | null> {
    const version = await this.prisma.projectVersion.findUnique({
      where: { id: versionId }
    });

    return version ? this.mapToVersionMetadata(version) : null;
  }

  /**
   * Get version history for an artifact
   */
  async getVersionHistory(
    projectId: string,
    artifactType: string,
    artifactId: string,
    options: {
      limit?: number;
      offset?: number;
      includeContent?: boolean;
      tags?: string[];
      fromDate?: Date;
      toDate?: Date;
    } = {}
  ): Promise<{
    versions: VersionMetadata[];
    total: number;
    hasMore: boolean;
  }> {
    const { limit = 50, offset = 0, tags, fromDate, toDate } = options;

    const where: any = {
      projectId,
      artifactType,
      artifactId
    };

    if (tags && tags.length > 0) {
      where.tags = {
        hasEvery: tags
      };
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const [versions, total] = await Promise.all([
      this.prisma.projectVersion.findMany({
        where,
        orderBy: { versionNumber: 'desc' },
        skip: offset,
        take: limit
      }),
      this.prisma.projectVersion.count({ where })
    ]);

    return {
      versions: versions.map(v => this.mapToVersionMetadata(v)),
      total,
      hasMore: offset + versions.length < total
    };
  }

  /**
   * Reconstruct content from a specific version
   */
  async reconstructContent(versionId: string): Promise<string> {
    const version = await this.prisma.projectVersion.findUnique({
      where: { id: versionId }
    });

    if (!version) {
      throw new Error('Version not found');
    }

    if (version.deltaType === 'full') {
      return version.deltaData;
    }

    // Reconstruct from delta chain
    const chain = await this.buildDeltaChain(versionId);
    let content = chain[0].deltaData; // Start with base full version

    // Apply deltas in order
    for (let i = 1; i < chain.length; i++) {
      const patches = this.dmp.patch_fromText(chain[i].deltaData);
      const [reconstructed] = this.dmp.patch_apply(patches, content);
      content = reconstructed;
    }

    // Verify checksum
    const expectedChecksum = version.checksum;
    const actualChecksum = this.calculateChecksum(content);
    
    if (expectedChecksum !== actualChecksum) {
      throw new Error('Content reconstruction failed: checksum mismatch');
    }

    return content;
  }

  /**
   * Compare two versions and return differences
   */
  async compareVersions(
    versionId1: string,
    versionId2: string,
    options: {
      format?: 'text' | 'html' | 'json';
      contextLines?: number;
    } = {}
  ): Promise<{
    changes: any[];
    stats: {
      additions: number;
      deletions: number;
      modifications: number;
    };
  }> {
    const [content1, content2] = await Promise.all([
      this.reconstructContent(versionId1),
      this.reconstructContent(versionId2)
    ]);

    const diffs = this.dmp.diff_main(content1, content2);
    this.dmp.diff_cleanupSemantic(diffs);

    const stats = {
      additions: 0,
      deletions: 0,
      modifications: 0
    };

    const changes = diffs.map(([operation, text]) => {
      switch (operation) {
        case 1: // Insert
          stats.additions += text.length;
          return { type: 'addition', content: text };
        case -1: // Delete
          stats.deletions += text.length;
          return { type: 'deletion', content: text };
        case 0: // Equal
          return { type: 'unchanged', content: text };
        default:
          return { type: 'unknown', content: text };
      }
    });

    stats.modifications = Math.min(stats.additions, stats.deletions);

    return { changes, stats };
  }

  /**
   * Create a branch from a specific version
   */
  async createBranch(
    versionId: string,
    branchName: string,
    userId: string,
    description?: string
  ): Promise<{
    branchId: string;
    baseVersionId: string;
  }> {
    const version = await this.prisma.projectVersion.findUnique({
      where: { id: versionId }
    });

    if (!version) {
      throw new Error('Base version not found');
    }

    const branch = await this.prisma.projectBranch.create({
      data: {
        name: branchName,
        projectId: version.projectId,
        baseVersionId: versionId,
        createdBy: userId,
        description,
        isActive: true
      }
    });

    return {
      branchId: branch.id,
      baseVersionId: versionId
    };
  }

  /**
   * Merge branches with conflict resolution
   */
  async mergeBranches(
    sourceBranchId: string,
    targetBranchId: string,
    userId: string,
    resolveConflicts: 'auto' | 'manual' = 'auto',
    conflictResolutions?: Record<string, 'source' | 'target' | 'custom'>
  ): Promise<{
    success: boolean;
    conflicts?: any[];
    mergeVersionId?: string;
  }> {
    // Implementation for branch merging with conflict resolution
    // This is a complex operation that would require additional logic
    throw new Error('Branch merging not yet implemented');
  }

  /**
   * Clean up old versions based on retention policy
   */
  async cleanupVersions(
    projectId: string,
    policy: {
      maxVersions?: number;
      maxAge?: number; // days
      keepTagged?: boolean;
      keepMajorVersions?: boolean;
    }
  ): Promise<{
    deletedCount: number;
    preservedCount: number;
  }> {
    const { maxVersions, maxAge, keepTagged = true, keepMajorVersions = true } = policy;

    let deleteConditions: any = { projectId };

    if (maxAge) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAge);
      deleteConditions.createdAt = { lt: cutoffDate };
    }

    if (keepTagged) {
      deleteConditions.tags = { isEmpty: true };
    }

    const versions = await this.prisma.projectVersion.findMany({
      where: deleteConditions,
      orderBy: { createdAt: 'desc' }
    });

    let toDelete = versions;

    if (maxVersions && versions.length > maxVersions) {
      toDelete = versions.slice(maxVersions);
    }

    if (keepMajorVersions) {
      toDelete = toDelete.filter(v => v.versionNumber % 10 !== 0); // Keep every 10th version
    }

    const deleteIds = toDelete.map(v => v.id);
    
    const { count } = await this.prisma.projectVersion.deleteMany({
      where: { id: { in: deleteIds } }
    });

    return {
      deletedCount: count,
      preservedCount: versions.length - count
    };
  }

  /**
   * Get version statistics for a project
   */
  async getVersionStatistics(projectId: string): Promise<{
    totalVersions: number;
    totalSize: number;
    compressionRatio: number;
    artifactTypes: Record<string, number>;
    topContributors: Array<{ userId: string; versionCount: number }>;
    activityTimeline: Array<{ date: string; versionCount: number }>;
  }> {
    const [totalStats, artifactStats, contributorStats, activityStats] = await Promise.all([
      this.prisma.projectVersion.aggregate({
        where: { projectId },
        _count: { id: true },
        _sum: { size: true },
        _avg: { compressionRatio: true }
      }),
      this.prisma.projectVersion.groupBy({
        by: ['artifactType'],
        where: { projectId },
        _count: { id: true }
      }),
      this.prisma.projectVersion.groupBy({
        by: ['userId'],
        where: { projectId },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }),
      this.prisma.$queryRaw`
        SELECT DATE_TRUNC('day', "createdAt") as date, COUNT(*) as versionCount
        FROM "ProjectVersion"
        WHERE "projectId" = ${projectId}
        AND "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY date DESC
      `
    ]);

    return {
      totalVersions: totalStats._count.id || 0,
      totalSize: totalStats._sum.size || 0,
      compressionRatio: totalStats._avg.compressionRatio || 1.0,
      artifactTypes: Object.fromEntries(
        artifactStats.map(stat => [stat.artifactType, stat._count.id])
      ),
      topContributors: contributorStats.map(stat => ({
        userId: stat.userId,
        versionCount: stat._count.id
      })),
      activityTimeline: (activityStats as any[]).map(stat => ({
        date: stat.date.toISOString().split('T')[0],
        versionCount: parseInt(stat.versioncount)
      }))
    };
  }

  // Private helper methods

  private async getLatestVersion(
    projectId: string,
    artifactType: string,
    artifactId: string
  ): Promise<VersionMetadata | null> {
    const version = await this.prisma.projectVersion.findFirst({
      where: { projectId, artifactType, artifactId },
      orderBy: { versionNumber: 'desc' }
    });

    return version ? this.mapToVersionMetadata(version) : null;
  }

  private shouldCreateFullVersion(latestVersion: VersionMetadata): boolean {
    // Create full version if:
    // 1. We've reached max delta chain length
    // 2. The latest version is too old
    // 3. The compression ratio is getting poor

    if (!latestVersion.deltaCompression.baseVersionId) {
      return false; // Latest is already full
    }

    // Check delta chain length
    // This would require traversing the chain - simplified for now
    return false;
  }

  private createDelta(oldContent: string, newContent: string): {
    data: string;
    compressionRatio: number;
  } {
    const patches = this.dmp.patch_make(oldContent, newContent);
    const deltaText = this.dmp.patch_toText(patches);
    
    const originalSize = Buffer.byteLength(newContent, 'utf8');
    const deltaSize = Buffer.byteLength(deltaText, 'utf8');
    
    return {
      data: deltaText,
      compressionRatio: deltaSize / originalSize
    };
  }

  private async buildDeltaChain(versionId: string): Promise<any[]> {
    const chain = [];
    let currentId = versionId;

    while (currentId) {
      const version = await this.prisma.projectVersion.findUnique({
        where: { id: currentId }
      });

      if (!version) break;

      chain.unshift(version);

      if (version.deltaType === 'full') {
        break;
      }

      currentId = version.baseVersionId || '';
    }

    return chain;
  }

  private calculateChecksum(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  private mapToVersionMetadata(version: any): VersionMetadata {
    return {
      id: version.id,
      projectId: version.projectId,
      artifactType: version.artifactType,
      artifactId: version.artifactId,
      versionNumber: version.versionNumber,
      parentVersionId: version.parentVersionId,
      userId: version.userId,
      description: version.description,
      tags: version.tags || [],
      createdAt: version.createdAt,
      size: version.size,
      deltaCompression: {
        type: version.deltaType,
        data: version.deltaData,
        baseVersionId: version.baseVersionId,
        compressionRatio: version.compressionRatio,
        checksum: version.checksum
      },
      metadata: version.metadata || {}
    };
  }
}

export { VersionControlService, VersionData, VersionMetadata, DeltaCompression };