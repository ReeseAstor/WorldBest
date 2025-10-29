export interface ExportRequest {
  id: string;
  userId: string;
  projectId: string;
  format: ExportFormat;
  options: ExportOptions;
  status: ExportStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  filePath?: string;
  fileSize?: number;
  downloadUrl?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export enum ExportFormat {
  EPUB = 'epub',
  PDF = 'pdf',
  DOCX = 'docx',
  HTML = 'html',
  JSON = 'json',
  TXT = 'txt',
  MARKDOWN = 'markdown'
}

export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface ExportOptions {
  title?: string;
  author?: string;
  description?: string;
  language?: string;
  includeMetadata?: boolean;
  includeImages?: boolean;
  includeComments?: boolean;
  includeTOC?: boolean;
  pageSize?: 'A4' | 'Letter' | 'Legal';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  fontSize?: number;
  fontFamily?: string;
  lineHeight?: number;
  theme?: 'light' | 'dark' | 'sepia';
  customCSS?: string;
  watermark?: string;
  password?: string;
  quality?: 'low' | 'medium' | 'high';
  compression?: boolean;
  chapterBreaks?: boolean;
  pageNumbers?: boolean;
  header?: string;
  footer?: string;
}

export interface ExportJob {
  id: string;
  requestId: string;
  userId: string;
  projectId: string;
  format: ExportFormat;
  options: ExportOptions;
  content: ProjectContent;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  progress: number;
}

export interface ProjectContent {
  id: string;
  title: string;
  description?: string;
  author: string;
  chapters: Chapter[];
  metadata: Record<string, any>;
  settings: ProjectSettings;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  wordCount: number;
  metadata?: Record<string, any>;
  lastModified: Date;
}

export interface ProjectSettings {
  language: string;
  genre?: string;
  targetAudience?: string;
  customFields?: Record<string, any>;
}

export interface ExportProgress {
  requestId: string;
  stage: string;
  progress: number;
  message?: string;
  estimatedCompletion?: Date;
}

export interface ExportStats {
  totalRequests: number;
  completedRequests: number;
  failedRequests: number;
  averageProcessingTime: number;
  formatBreakdown: Record<ExportFormat, number>;
  popularOptions: Record<string, any>;
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: ExportFormat;
  options: Partial<ExportOptions>;
  template: string;
  variables: string[];
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchExportRequest {
  id: string;
  userId: string;
  projectIds: string[];
  format: ExportFormat;
  options: ExportOptions;
  status: ExportStatus;
  createdAt: Date;
  completedAt?: Date;
  results: ExportRequest[];
  failureCount: number;
  successCount: number;
}

export interface ExportQualityCheck {
  requestId: string;
  issues: QualityIssue[];
  score: number;
  recommendations: string[];
  passedChecks: string[];
  failedChecks: string[];
}

export interface QualityIssue {
  type: 'warning' | 'error' | 'info';
  category: string;
  message: string;
  location?: string;
  suggestion?: string;
}

export interface ExportNotification {
  requestId: string;
  userId: string;
  type: 'started' | 'progress' | 'completed' | 'failed';
  message: string;
  data?: Record<string, any>;
  sentAt: Date;
}