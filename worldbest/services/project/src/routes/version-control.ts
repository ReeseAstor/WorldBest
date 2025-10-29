import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkProjectAccess } from '../middleware/project-access';
import {
  createVersion,
  getVersion,
  getVersionContent,
  getVersionHistory,
  compareVersions,
  createBranch,
  getVersionStatistics,
  cleanupVersions,
  tagVersion,
  restoreVersion,
  getVersionTree
} from '../controllers/version-control';

const router = Router();

// All version control routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/versions
 * @desc    Create a new version of a project artifact
 * @access  Private
 * @body    {projectId, artifactType, artifactId, content, description?, tags?}
 */
router.post('/', createVersion);

/**
 * @route   GET /api/versions/:versionId
 * @desc    Get a specific version by ID
 * @access  Private
 * @params  versionId - Version ID
 */
router.get('/:versionId', getVersion);

/**
 * @route   GET /api/versions/:versionId/content
 * @desc    Get reconstructed content from a specific version
 * @access  Private
 * @params  versionId - Version ID
 */
router.get('/:versionId/content', getVersionContent);

/**
 * @route   GET /api/versions/history/:projectId/:artifactType/:artifactId
 * @desc    Get version history for an artifact
 * @access  Private
 * @params  projectId, artifactType, artifactId
 * @query   limit?, offset?, includeContent?, tags?, fromDate?, toDate?
 */
router.get(
  '/history/:projectId/:artifactType/:artifactId',
  checkProjectAccess(['viewer', 'commenter', 'editor', 'admin']),
  getVersionHistory
);

/**
 * @route   GET /api/versions/compare/:versionId1/:versionId2
 * @desc    Compare two versions and return differences
 * @access  Private
 * @params  versionId1, versionId2 - Version IDs to compare
 * @query   format?, contextLines?
 */
router.get('/compare/:versionId1/:versionId2', compareVersions);

/**
 * @route   GET /api/versions/tree/:projectId/:artifactType/:artifactId
 * @desc    Get version tree/graph for visualization
 * @access  Private
 * @params  projectId, artifactType, artifactId
 */
router.get(
  '/tree/:projectId/:artifactType/:artifactId',
  checkProjectAccess(['viewer', 'commenter', 'editor', 'admin']),
  getVersionTree
);

/**
 * @route   GET /api/versions/stats/:projectId
 * @desc    Get version statistics for a project
 * @access  Private
 * @params  projectId - Project ID
 */
router.get(
  '/stats/:projectId',
  checkProjectAccess(['viewer', 'commenter', 'editor', 'admin']),
  getVersionStatistics
);

/**
 * @route   POST /api/versions/branch
 * @desc    Create a branch from a specific version
 * @access  Private
 * @body    {versionId, branchName, description?}
 */
router.post('/branch', createBranch);

/**
 * @route   POST /api/versions/:versionId/tag
 * @desc    Tag a version
 * @access  Private
 * @params  versionId - Version ID
 * @body    {tags: string[]}
 */
router.post('/:versionId/tag', tagVersion);

/**
 * @route   POST /api/versions/:versionId/restore
 * @desc    Restore content from a specific version
 * @access  Private
 * @params  versionId - Version ID
 * @body    {createNewVersion?: boolean}
 */
router.post('/:versionId/restore', restoreVersion);

/**
 * @route   POST /api/versions/cleanup/:projectId
 * @desc    Clean up old versions based on retention policy
 * @access  Private (Admin only)
 * @params  projectId - Project ID
 * @body    {maxVersions?, maxAge?, keepTagged?, keepMajorVersions?}
 */
router.post(
  '/cleanup/:projectId',
  checkProjectAccess(['admin']),
  cleanupVersions
);

export default router;