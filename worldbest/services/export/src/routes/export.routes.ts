import express from 'express';
import { ExportController } from '../controllers/export.controller.js';

const router = express.Router();
const exportController = new ExportController();

// Export a single project
router.post(
  '/export',
  ExportController.validateExportRequest,
  exportController.exportProject.bind(exportController)
);

// Batch export multiple projects
router.post(
  '/batch-export',
  ExportController.validateBatchExportRequest,
  exportController.batchExport.bind(exportController)
);

// Preview export (limited content)
router.post(
  '/preview',
  ExportController.validateExportRequest,
  exportController.previewExport.bind(exportController)
);

// Get export status and progress
router.get(
  '/status/:requestId',
  ExportController.validateRequestId,
  exportController.getExportStatus.bind(exportController)
);

// Download exported file
router.get(
  '/download/:requestId',
  ExportController.validateRequestId,
  exportController.downloadExport.bind(exportController)
);

// Get user's export history
router.get(
  '/history',
  exportController.getExportHistory.bind(exportController)
);

// Cancel export request
router.post(
  '/cancel/:requestId',
  ExportController.validateRequestId,
  exportController.cancelExport.bind(exportController)
);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'export-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;