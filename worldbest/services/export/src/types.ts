export interface ExportJob {
  id: string;
  userId: string;
  projectId: string;
  format: ExportFormat;
  status: ExportStatus;
  progress: number;
  options: ExportOptions;
  fileUrl?: string;
  fileSize?: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

export enum ExportFormat {
  EPUB = 'epub',
  PDF = 'pdf',
  DOCX = 'docx',
  MARKDOWN = 'markdown',
  HTML = 'html',
  JSON = 'json',
  TXT = 'txt'
}

export enum ExportStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
  EXPIRED = 'expired'
}

export interface ExportOptions {
  // Content selection
  includeBooks?: string[]; // Book IDs to include
  includeChapters?: string[]; // Chapter IDs to include
  includeScenes?: string[]; // Scene IDs to include
  
  // Content filtering
  includeCharacterProfiles?: boolean;
  includeWorldbuilding?: boolean;
  includeTimeline?: boolean;
  includePlaceholders?: boolean;
  
  // Formatting options
  chapterBreaks?: boolean;
  sceneBreaks?: boolean;
  includeMetadata?: boolean;
  includeTableOfContents?: boolean;
  includeCoverPage?: boolean;
  
  // PDF-specific options
  pdfOptions?: {
    pageSize?: 'A4' | 'Letter' | 'Legal';
    orientation?: 'portrait' | 'landscape';
    margins?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
    headerFooter?: boolean;
    pageNumbers?: boolean;
    fontSize?: number;
    fontFamily?: string;
  };
  
  // ePub-specific options
  epubOptions?: {
    language?: string;
    publisher?: string;
    coverImage?: string;
    customCSS?: string;
    includeImages?: boolean;
  };
  
  // Redaction options
  redactionMode?: 'none' | 'placeholder' | 'remove';
  redactionTypes?: string[];
  
  // Compression
  compress?: boolean;
  compressionLevel?: number;
}

export interface ExportRequest {
  projectId: string;
  format: ExportFormat;
  options: ExportOptions;
  filename?: string;
}

export interface ExportResponse {
  success: boolean;
  data?: {
    jobId: string;
    status: ExportStatus;
    estimatedCompletionTime?: Date;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ProjectData {
  project: any;
  books: BookData[];
  characters: any[];
  locations: any[];
  cultures: any[];
  languages: any[];
  economies: any[];
  timelines: any[];
}

export interface BookData {
  book: any;
  chapters: ChapterData[];
}

export interface ChapterData {
  chapter: any;
  scenes: SceneData[];
}

export interface SceneData {
  scene: any;
  textVersions: any[];
  characters: any[];
  location?: any;
}

export interface ExportTemplate {
  name: string;
  format: ExportFormat;
  template: string;
  styles?: string;
  helpers?: Record<string, Function>;
}

export interface FileOutput {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  size: number;
}