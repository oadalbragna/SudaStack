export type SudaResponseMode = 'coding' | 'romantic' | 'hacker' | 'cybersecurity' | 'custom';

export type ProjectType =
  | 'static'
  | 'html-css-js'
  | 'php'
  | 'react'
  | 'nextjs'
  | 'nodejs'
  | 'telegram-bot'


export interface ProjectFile {
  id: string;
  path: string; // e.g., "index.html", "css/style.css", "js/app.js"
  name: string;
  content: string;
  type: 'html' | 'css' | 'javascript' | 'typescript' | 'json' | 'markdown' | 'php' | 'python' | 'text' | 'image' | 'binary';
  sizeBytes: number;
  updatedAt: string;
  isBinary?: boolean;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  type: ProjectType;
  status: 'active' | 'building' | 'deployed' | 'paused' | 'draft';
  deployedUrl?: string;
  customDomain?: string;
  files: ProjectFile[];
  createdAt: string;
  updatedAt: string;
  sizeBytes: number;
  tags: string[];
  versionHistory: Array<{
    id: string;
    version: string;
    description: string;
    timestamp: string;
    fileCount: number;
  }>;
}

export interface WorkspaceFile {
  id: string;
  name: string;
  path: string;
  category: 'projects' | 'documents' | 'images' | 'backups' | 'media' | 'archives';
  type: string;
  sizeBytes: number;
  updatedAt: string;
  projectId?: string;
  tags?: string[];
  contentPreview?: string;
}

export interface StoragePlan {
  id: 'free' | 'developer' | 'pro' | 'business';
  nameAr: string;
  nameEn: string;
  name?: string;
  isPopular?: boolean;
  period?: string;
  storageGb: number;
  maxProjects: number | 'unlimited';
  price: string;
  features: string[];
}

export interface StorageQuota {
  usedBytes: number;
  totalBytes: number;
  byCategory: {
    projects: number;
    documents: number;
    images: number;
    backups: number;
  };
  plan: 'free' | 'developer' | 'pro' | 'business';
}

export interface AIAgentTask {
  id: string;
  userPrompt: string;
  status: 'idle' | 'planning' | 'creating-files' | 'writing-code' | 'testing' | 'fixing' | 'deploying' | 'completed' | 'error';
  steps: Array<{
    id: string;
    title: string;
    description: string;
    status: 'pending' | 'active' | 'completed' | 'error';
    duration?: string;
  }>;
  resultSummary?: string;
  affectedFiles?: string[];
}

export interface TelegramBotMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: string;
  fileAttachment?: {
    name: string;
    size: string;
    type: string;
  };
  quickActions?: Array<{
    label: string;
    command: string;
  }>;
}

export interface ProjectTemplate {
  id: string;
  title: string;
  name?: string;
  thumbnail?: string;
  titleEn: string;
  category: string;
  description: string;
  badge: string;
  icon: string;
  tags: string[];
  files: Array<{
    path: string;
    content: string;
    type: ProjectFile['type'];
  }>;
}

export interface SandboxConfig {
  ramLimitMb: number;
  cpuLimit: string;
  executionTimeoutSec: number;
  isolatedContainer: boolean;
}

export interface SecuritySandboxStatus {
  cpuUsagePercent: number;
  ramUsageMb: number;
  maxRamMb: number;
  processStatus: 'isolated' | 'sandboxed';
  malwareScanStatus: 'clean' | 'scanning' | 'alert';
  networkPolicy: 'restricted-egress';
  rateLimitTokens: number;
  activeContainers: number;
}

export type TelegramFileType =
  | 'html'
  | 'css'
  | 'javascript'
  | 'python'
  | 'cpp'
  | 'json'
  | 'markdown'
  | 'text'
  | 'image'
  | 'document'
  | 'archive';

export interface TelegramStorageFile {
  id: string;
  name: string;
  type: TelegramFileType;
  sizeBytes: number;
  content: string;
  createdAt: string;
  createdBy: 'ai' | 'user' | 'system';
  category: 'web' | 'code' | 'docs' | 'data' | 'other';
  description?: string;
  telegramMessageId?: number;
  isPastedText?: boolean;
  charCount?: number;
  folder?: string; // e.g. "ecommerce-store" or "my-portfolio"
  subfolder?: string; // e.g. "assets" or "image"
  path?: string;   // e.g. "ecommerce-store/index.html"
  isProjectMain?: boolean;
  dataUrl?: string;
  base64?: string;
  mimeType?: string;
  imageDimensions?: { width: number; height: number };
  isImage?: boolean;
  isPdf?: boolean;
}

export interface CommandExecution {
  id: string;
  type: 'curl' | 'python' | 'web-scrape' | 'web-search' | 'web-explore' | 'bash' | 'terminal';
  command: string;
  status: 'running' | 'success' | 'error';
  stdout?: string;
  stderr?: string;
  result?: string;
  exitCode?: number;
  executionTimeMs?: number;
  metadata?: {
    statusCode?: number;
    url?: string;
    title?: string;
    description?: string;
    contentType?: string;
    error?: string;
    actionTarget?: string;
    actionPerformed?: string;
    interactiveElementsCount?: number;
    [key: string]: any;
  };
}

export interface CommandExecutionResult {
  success: boolean;
  type: 'curl' | 'python' | 'web-scrape' | 'web-search' | 'web-explore' | 'bash' | 'terminal';
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  metadata?: Record<string, any>;
}

export interface CreatedProjectMeta {
  folder: string;
  name: string;
  description: string;
  filesCount: number;
  files: string[];
}

export interface AIChatMessage {
  id: string;
  sender: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
  createdFiles?: TelegramStorageFile[];
  isGenerating?: boolean;
  commandExecution?: CommandExecution;
  createdProject?: CreatedProjectMeta;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  formattedTime: string;
  messages: AIChatMessage[];
  responseMode?: SudaResponseMode;
}

export interface SystemConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  showImageOptions: boolean;
  showVoiceInput: boolean;
  showFileUpload: boolean;
  adminKey: string;
  allowPublicChat: boolean;
  systemNotice?: string;
  platformTitle?: string;
  updatedAt?: number;
}

export type SudaDbActionType = 'get' | 'patch' | 'post' | 'delete' | 'stream';

export interface SudaDbOptions {
  action: SudaDbActionType;
  path?: string;
  data?: any;
  apiKey?: string;
  onMessage?: (data: any) => void;
  onError?: (err: any) => void;
}

export interface AdminAuthResult {
  success: boolean;
  isNewKeyCreated: boolean;
  message: string;
}

export interface RuntimeProcess {
  runId: string;
  projectId: string;
  sessionId?: string;
  type: 'python' | 'shell' | 'polling';
  status: 'queued' | 'running' | 'cancelling' | 'stopped' | 'failed';
  startedAt: number;
  stoppedAt?: number;
  exitCode?: number;
  pollingIntervalMs?: number;
  abortToken: string;
  command?: string;
}

export interface DispatchCommandOptions {
  commandId?: string;
  runId?: string;
  sessionId?: string;
  command: string;
  projectName: string;
  files?: Array<{ name: string; content: string; size?: number }>;
  cwd?: string;
  stdin?: string;
  signal?: AbortSignal;
}

export interface DispatchCommandResult {
  commandId: string;
  runId: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  timeMs: number;
  filesUpdated?: Array<{ name: string; content: string; size?: number }>;
  cwd?: string;
  cancelled?: boolean;
}

