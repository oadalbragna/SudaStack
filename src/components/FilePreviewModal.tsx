import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Eye,
  Code,
  Download,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Tablet,
  Monitor,
  RefreshCw,
  Terminal,
  Sun,
  Moon,
  Grid as GridIcon,
  Link as LinkIcon,
  Save,
  AlertCircle,
  Play,
  Folder,
  Trash2,
  Columns,
  Plus,
  FileCode,
  Layers,
  ChevronRight,
  PlayCircle
} from 'lucide-react';
import { TelegramStorageFile, CommandExecutionResult } from '../types';
import { downloadFilesAsZip } from '../utils/zipUtils';
import { executePythonUniversal } from '../utils/pythonRunner';

interface ConsoleLogItem {
  id: string;
  level: 'log' | 'info' | 'warn' | 'error';
  text: string;
  timestamp: string;
}

export interface FilePreviewModalProps {
  file: TelegramStorageFile | null;
  isOpen: boolean;
  onClose: () => void;
  onRequestAIEdit?: (file: TelegramStorageFile) => void;
  onSaveFile?: (updatedFile: TelegramStorageFile) => void;
  onAddNewFile?: (newFile: TelegramStorageFile) => void;
  onDeleteFile?: (fileId: string) => void;
  initialMode?: 'preview' | 'code' | 'split';
  allFiles?: TelegramStorageFile[];
  isArabic: boolean;
  onOpenInTerminalSandbox?: (code: string, fileName: string) => void;
}

interface FilePreviewModalContentProps {
  file: TelegramStorageFile;
  onClose: () => void;
  onRequestAIEdit?: (file: TelegramStorageFile) => void;
  onSaveFile?: (updatedFile: TelegramStorageFile) => void;
  onAddNewFile?: (newFile: TelegramStorageFile) => void;
  onDeleteFile?: (fileId: string) => void;
  initialMode?: 'preview' | 'code' | 'split';
  allFiles?: TelegramStorageFile[];
  isArabic: boolean;
  onOpenInTerminalSandbox?: (code: string, fileName: string) => void;
}

const FilePreviewModalContent: React.FC<FilePreviewModalContentProps> = ({
  file,
  onClose,
  onRequestAIEdit,
  onSaveFile,
  onAddNewFile,
  onDeleteFile,
  initialMode,
  allFiles = [],
  isArabic,
  onOpenInTerminalSandbox,
}) => {
  const [currentFile, setCurrentFile] = useState<TelegramStorageFile>(file);

  const projectFolder = currentFile.folder;
  const projectFiles = projectFolder
    ? allFiles.filter((f) => f.folder === projectFolder)
    : [];

  const isImage =
    currentFile.type === 'image' ||
    /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i.test(currentFile.name) ||
    (typeof currentFile.content === 'string' &&
      (currentFile.content.startsWith('data:image/') || currentFile.content.trim().startsWith('<svg')));
  const isPdf =
    currentFile.name.toLowerCase().endsWith('.pdf') ||
    currentFile.mimeType === 'application/pdf' ||
    (typeof currentFile.content === 'string' && currentFile.content.startsWith('data:application/pdf'));
  const isHtml = currentFile.type === 'html' || currentFile.name.endsWith('.html') || currentFile.name.endsWith('.htm');
  const isCss = currentFile.type === 'css' || currentFile.name.endsWith('.css');
  const isJs =
    currentFile.type === 'javascript' ||
    currentFile.name.endsWith('.js') ||
    currentFile.name.endsWith('.jsx') ||
    currentFile.name.endsWith('.ts') ||
    currentFile.name.endsWith('.mjs');
  const isPython =
    currentFile.type === 'python' ||
    currentFile.name.endsWith('.py');

  const procfileFile = projectFiles.find((f) => f.name.toLowerCase() === 'procfile');
  const requirementsFile = projectFiles.find((f) => f.name.toLowerCase() === 'requirements.txt');
  const runtimeFile = projectFiles.find((f) => f.name.toLowerCase() === 'runtime.txt');

  const isPythonProject =
    isPython ||
    Boolean(procfileFile) ||
    Boolean(runtimeFile) ||
    projectFiles.some((f) => f.type === 'python' || f.name.endsWith('.py'));

  const mainPyFile =
    projectFiles.find((f) => f.name.toLowerCase() === 'main.py' || f.isProjectMain) ||
    projectFiles.find((f) => f.type === 'python' || f.name.endsWith('.py'));

  const procfileCmd = procfileFile?.content
    ? procfileFile.content.split('\n')[0].replace(/^worker:\s*/i, '').replace(/^web:\s*/i, '').trim()
    : 'python main.py';

  const runtimeVersion = runtimeFile?.content?.trim() || 'python-3.10.12';

  const subfolders = React.useMemo(() => {
    const set = new Set<string>();
    projectFiles.forEach((f) => {
      if (f.subfolder) set.add(f.subfolder);
    });
    return Array.from(set).sort();
  }, [projectFiles]);

  const [selectedSubfolder, setSelectedSubfolder] = useState<string>('all');

  const displayedProjectFiles = React.useMemo(() => {
    if (selectedSubfolder === 'all') return projectFiles;
    if (selectedSubfolder === '__root__' || selectedSubfolder === '') {
      return projectFiles.filter((f) => !f.subfolder);
    }
    return projectFiles.filter((f) => f.subfolder === selectedSubfolder);
  }, [projectFiles, selectedSubfolder]);

  const [pythonExecution, setPythonExecution] = useState<CommandExecutionResult | null>(null);
  const [isRunningPython, setIsRunningPython] = useState<boolean>(false);
  const [pythonStdin, setPythonStdin] = useState<string>('');

  const isLivePreviewable =
    isHtml || isCss || isJs || isImage || isPdf || isPython || isPythonProject || projectFiles.length > 1;

  // View state: 'preview' (Live run), 'split' (Side-by-side run + edit), 'code' (Full Editor)
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'split'>(
    initialMode || (projectFiles.length > 1 || isPythonProject ? 'split' : isLivePreviewable ? 'preview' : 'code')
  );
  const [viewportMode, setViewportMode] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [canvasBg, setCanvasBg] = useState<'light' | 'dark' | 'checker'>('checker');
  const [imageZoom, setImageZoom] = useState<number>(100);
  const [showConsole, setShowConsole] = useState<boolean>(false);
  const [showLinkFiles, setShowLinkFiles] = useState<boolean>(false);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogItem[]>([]);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // New file creation in project folder
  const [isAddingFile, setIsAddingFile] = useState<boolean>(false);
  const [newFileNameInput, setNewFileNameInput] = useState<string>('');

  // Editable code state
  const [editableCode, setEditableCode] = useState<string>(currentFile.content);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Selected linked files for bundling (e.g. adding a CSS or JS from telegram storage)
  const [selectedLinkedFileIds, setSelectedLinkedFileIds] = useState<string[]>([]);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleRunPython = async (codeToRun?: string, fileNameToRun?: string) => {
    const code =
      codeToRun ||
      (currentFile.type === 'python' || currentFile.name.endsWith('.py')
        ? editableCode
        : mainPyFile?.content || '');
    const filename =
      fileNameToRun ||
      (currentFile.type === 'python' || currentFile.name.endsWith('.py')
        ? currentFile.name
        : mainPyFile?.name || 'main.py');

    if (!code) return;
    setIsRunningPython(true);
    try {
      const res = await executePythonUniversal(code, filename);
      setPythonExecution(res);
    } catch (err: any) {
      setPythonExecution({
        success: false,
        type: 'python',
        command: `python ${filename}`,
        stdout: '',
        stderr: err?.message || String(err),
        exitCode: 1,
        executionTimeMs: 0,
      });
    } finally {
      setIsRunningPython(false);
    }
  };

  const handleRunProcfile = () => {
    const target = mainPyFile || (currentFile.name.endsWith('.py') ? currentFile : null);
    if (target) {
      const code = target.id === currentFile.id ? editableCode : target.content;
      handleRunPython(code, target.name);
    } else {
      handleRunPython(editableCode, 'main.py');
    }
  };

  // Reset when initial file prop changes
  useEffect(() => {
    setCurrentFile(file);
    setEditableCode(file.content);
    setHasUnsavedChanges(false);
    if (initialMode) {
      setActiveTab(initialMode);
    } else {
      setActiveTab(projectFiles.length > 1 ? 'split' : isLivePreviewable ? 'preview' : 'code');
    }
    setConsoleLogs([]);
    setReloadKey((prev) => prev + 1);

    // Auto-link compatible files if available
    const initialLinked: string[] = [];
    if (isHtml) {
      allFiles.forEach((f) => {
        if (f.id !== file.id && (f.type === 'css' || f.type === 'javascript')) {
          initialLinked.push(f.id);
        }
      });
    }
    setSelectedLinkedFileIds(initialLinked);
  }, [file.id, file.content]);

  // Handle switching active file inside an integrated project
  const handleSwitchFile = (targetFile: TelegramStorageFile) => {
    if (targetFile.id === currentFile.id) return;

    if (hasUnsavedChanges && onSaveFile) {
      onSaveFile({
        ...currentFile,
        content: editableCode,
        sizeBytes: new Blob([editableCode]).size,
      });
    }

    setCurrentFile(targetFile);
    setEditableCode(targetFile.content);
    setHasUnsavedChanges(false);
    setReloadKey((prev) => prev + 1);
  };

  // Keyboard shortcut: Ctrl+S / Cmd+S to save instantly & reload live preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editableCode, currentFile]);

  // Handle creating a new file in the current project folder
  const handleCreateNewProjectFile = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const ext = trimmed.split('.').pop()?.toLowerCase() || 'text';
    let type: any = 'text';
    if (ext === 'html' || ext === 'htm') type = 'html';
    else if (ext === 'css') type = 'css';
    else if (ext === 'js' || ext === 'ts' || ext === 'jsx') type = 'javascript';
    else if (ext === 'json') type = 'json';
    else if (ext === 'py') type = 'python';

    const defaultContent =
      type === 'html'
        ? `<!DOCTYPE html>\n<html>\n<head>\n  <title>${trimmed}</title>\n</head>\n<body>\n  <h2>${trimmed}</h2>\n</body>\n</html>`
        : type === 'css'
        ? `/* Styles for ${trimmed} */\n`
        : type === 'javascript'
        ? `// Logic for ${trimmed}\nconsole.log('${trimmed} loaded');\n`
        : type === 'json'
        ? `{\n  "name": "${trimmed}",\n  "items": []\n}`
        : '';

    const newFileObj: TelegramStorageFile = {
      id: `tg-ai-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: trimmed,
      type,
      folder: projectFolder || 'web-project',
      path: `${projectFolder || 'web-project'}/${trimmed}`,
      content: defaultContent,
      sizeBytes: defaultContent.length,
      createdAt: new Date().toISOString(),
      createdBy: 'user',
      category: type === 'html' ? 'web' : 'code',
      description: `ملف جديد داخل مجلد [${projectFolder || 'web-project'}]`,
    };

    if (onAddNewFile) {
      onAddNewFile(newFileObj);
    }
    handleSwitchFile(newFileObj);
    setIsAddingFile(false);
    setNewFileNameInput('');
  };

  // Listen to postMessage from iframe for live console logs
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'LIVE_PREVIEW_CONSOLE') {
        const newLog: ConsoleLogItem = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          level: event.data.level || 'log',
          text: event.data.text || '',
          timestamp: event.data.timestamp || new Date().toLocaleTimeString(),
        };
        setConsoleLogs((prev) => [...prev.slice(-49), newLog]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(editableCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([editableCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    if (onSaveFile) {
      const updated: TelegramStorageFile = {
        ...currentFile,
        content: editableCode,
        sizeBytes: new Blob([editableCode]).size,
      };
      onSaveFile(updated);
      setCurrentFile(updated);
      setHasUnsavedChanges(false);
      setIsSaved(true);
      setReloadKey((prev) => prev + 1);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  // Compile the live preview HTML document
  const generateLiveHtml = (): string => {
    const sourceCode = editableCode;

    // Get content of linked CSS and JS files
    const linkedCss = allFiles
      .filter((f) => selectedLinkedFileIds.includes(f.id) && (f.type === 'css' || f.name.endsWith('.css')))
      .map((f) => `/* Injected from SudaStack Cloud: ${f.name} */\n${f.content}`)
      .join('\n\n');

    const linkedJs = allFiles
      .filter((f) => selectedLinkedFileIds.includes(f.id) && (f.type === 'javascript' || f.name.endsWith('.js')))
      .map((f) => `// Injected from SudaStack Cloud: ${f.name}\n${f.content}`)
      .join('\n\n');

    // Console interceptor script injected into the iframe
    const consoleInterceptorScript = `
      <script>
        (function() {
          const originalLog = console.log;
          const originalWarn = console.warn;
          const originalError = console.error;
          const originalInfo = console.info;

          function sendToParent(level, args) {
            try {
              const text = Array.from(args).map(item => {
                if (typeof item === 'object') {
                  try { return JSON.stringify(item, null, 2); } catch(e) { return String(item); }
                }
                return String(item);
              }).join(' ');

              window.parent.postMessage({
                type: 'LIVE_PREVIEW_CONSOLE',
                level: level,
                text: text,
                timestamp: new Date().toLocaleTimeString()
              }, '*');
            } catch(e) {}
          }

          console.log = function(...args) { sendToParent('log', args); originalLog.apply(console, args); };
          console.info = function(...args) { sendToParent('info', args); originalInfo.apply(console, args); };
          console.warn = function(...args) { sendToParent('warn', args); originalWarn.apply(console, args); };
          console.error = function(...args) { sendToParent('error', args); originalError.apply(console, args); };

          window.addEventListener('error', function(err) {
            sendToParent('error', [err.message || 'Script Execution Error']);
          });
        })();
      </script>
    `;

    // CASE 0: Multi-file Integrated Web Project (HTML + CSS + JS + JSON)
    if (projectFiles.length > 1) {
      const htmlFile = projectFiles.find((f) => f.type === 'html' || f.name.endsWith('.html'));
      const cssFiles = projectFiles.filter((f) => f.type === 'css' || f.name.endsWith('.css'));
      const jsFiles = projectFiles.filter((f) => f.type === 'javascript' || f.name.endsWith('.js') || f.name.endsWith('.ts'));
      const jsonFiles = projectFiles.filter((f) => f.type === 'json' || f.name.endsWith('.json'));

      let htmlSource = currentFile.id === htmlFile?.id ? editableCode : (htmlFile?.content || '');

      // Combine all CSS in the project (injecting editableCode for the currently active CSS file)
      const combinedProjectCss = cssFiles
        .map((cf) => {
          const content = cf.id === currentFile.id ? editableCode : cf.content;
          return `/* SudaStack: ${cf.name} */\n${content}`;
        })
        .join('\n\n');

      // Combine all JS in the project (injecting editableCode for the currently active JS file)
      const combinedProjectJs = jsFiles
        .map((jf) => {
          const content = jf.id === currentFile.id ? editableCode : jf.content;
          return `// SudaStack: ${jf.name}\n${content}`;
        })
        .join('\n\n');

      // Prepare JSON mock data
      const projectDataScript = jsonFiles.length > 0
        ? `<script id="tg-project-data">\ntry { window.PROJECT_DATA = ${jsonFiles[0].id === currentFile.id ? editableCode : jsonFiles[0].content}; } catch(e) {}\n</script>`
        : '';

      if (htmlSource) {
        let doc = htmlSource;

        // Inject active/companion CSS
        if (combinedProjectCss) {
          if (doc.includes('style.css')) {
            doc = doc.replace(/<link[^>]+href=["'][^"']*style\.css["'][^>]*>/i, `<style id="tg-project-styles">\n${combinedProjectCss}\n</style>`);
          } else if (doc.includes('</head>')) {
            doc = doc.replace('</head>', `<style id="tg-project-styles">\n${combinedProjectCss}\n</style>\n</head>`);
          } else {
            doc = `<style id="tg-project-styles">\n${combinedProjectCss}\n</style>\n` + doc;
          }
        }

        // Inject JSON data if available
        if (projectDataScript) {
          if (doc.includes('<head>')) {
            doc = doc.replace('<head>', `<head>\n${projectDataScript}\n`);
          } else {
            doc = projectDataScript + '\n' + doc;
          }
        }

        // Inject active/companion JS
        if (combinedProjectJs) {
          if (doc.includes('app.js')) {
            doc = doc.replace(/<script[^>]+src=["'][^"']*app\.js["'][^>]*><\/script>/i, `<script id="tg-project-scripts">\n${combinedProjectJs}\n</script>`);
          } else if (doc.includes('</body>')) {
            doc = doc.replace('</body>', `<script id="tg-project-scripts">\n${combinedProjectJs}\n</script>\n</body>`);
          } else {
            doc = doc + `\n<script id="tg-project-scripts">\n${combinedProjectJs}\n</script>`;
          }
        }

        // Inject console interceptor
        if (doc.includes('<head>')) {
          doc = doc.replace('<head>', `<head>${consoleInterceptorScript}`);
        } else if (doc.includes('<html>')) {
          doc = doc.replace('<html>', `<html><head>${consoleInterceptorScript}</head>`);
        } else {
          doc = `<!DOCTYPE html><html><head>${consoleInterceptorScript}</head><body>${doc}</body></html>`;
        }

        return doc;
      }
    }

    // CASE 1: HTML Document
    if (isHtml) {
      let doc = sourceCode;

      // Inject console interceptor
      if (doc.includes('<head>')) {
        doc = doc.replace('<head>', `<head>${consoleInterceptorScript}`);
      } else if (doc.includes('<html>')) {
        doc = doc.replace('<html>', `<html><head>${consoleInterceptorScript}</head>`);
      } else {
        doc = `<!DOCTYPE html><html><head>${consoleInterceptorScript}</head><body>${doc}</body></html>`;
      }

      // Inject linked CSS
      if (linkedCss) {
        doc = doc.replace('</head>', `<style id="tg-linked-styles">\n${linkedCss}\n</style></head>`);
      }

      // Inject linked JS
      if (linkedJs) {
        doc = doc.replace('</body>', `<script id="tg-linked-scripts">\n${linkedJs}\n</script></body>`);
      }

      return doc;
    }

    // CASE 2: CSS Document (Render live styling showcase)
    if (isCss) {
      return `<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${isArabic ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live CSS Preview — ${file.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  ${consoleInterceptorScript}
  <style>
    /* Base Preview Studio Shell */
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: 'Cairo', 'Inter', system-ui, sans-serif;
      transition: background-color 0.2s, color 0.2s;
    }
    .preview-banner {
      background: #0284c7;
      color: #fff;
      padding: 10px 18px;
      border-radius: 12px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      font-weight: bold;
    }
    .preview-section {
      margin-bottom: 28px;
      padding: 20px;
      border: 1px dashed rgba(100, 116, 139, 0.3);
      border-radius: 16px;
    }
    .preview-section-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.6;
      margin-bottom: 14px;
      font-weight: 700;
    }
    .demo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }
    .demo-flex {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }
    /* Applied User CSS */
    ${sourceCode}
    ${linkedCss}
  </style>
</head>
<body>
  <div class="preview-banner">
    <span>⚡ ${isArabic ? `معاينة حية لملف التنسيقات: ${file.name}` : `Live CSS Preview: ${file.name}`}</span>
    <span>🎨 ${isArabic ? 'الأنماط مطبقة مباشرة' : 'Active Styles'}</span>
  </div>

  <div class="preview-section">
    <div class="preview-section-title">${isArabic ? 'العناوين والنصوص (Typography)' : 'Typography & Headings'}</div>
    <h1 class="showcase-title">${isArabic ? 'عنوان رئيسي H1 أنيق' : 'Primary Display Heading H1'}</h1>
    <h2>${isArabic ? 'عنوان فرعي H2 متجاوب' : 'Secondary Heading H2'}</h2>
    <p class="lead">${isArabic ? 'هذا نص تجريبي لمعاينة كيف تبدو الخطوط، أحجام النصوص، وارتفاع السطور والمسافات البينية مع ملف الـ CSS المرفوع.' : 'This is sample paragraph text demonstrating font-family, line-height, sizing, and text colors with your CSS.'}</p>
  </div>

  <div class="preview-section">
    <div class="preview-section-title">${isArabic ? 'البطاقات والمربعات (Cards & Containers)' : 'Cards & Containers'}</div>
    <div class="demo-grid">
      <div class="card glass-card">
        <h3>${isArabic ? 'بطاقة مميزة 1' : 'Featured Card 1'}</h3>
        <p>${isArabic ? 'محتوى توضيحي داخل بطاقة مصممة.' : 'Interactive card with applied stylesheet effects.'}</p>
        <span class="badge badge-glow">${isArabic ? 'نشط الآن' : 'Active'}</span>
      </div>
      <div class="card glass-card">
        <h3>${isArabic ? 'بطاقة مميزة 2' : 'Featured Card 2'}</h3>
        <p>${isArabic ? 'تأثيرات الظلال والحدود والانحناءات.' : 'Hover states, shadows, and smooth borders.'}</p>
        <span class="badge badge-glow">${isArabic ? 'سحابي' : 'Cloud'}</span>
      </div>
    </div>
  </div>

  <div class="preview-section">
    <div class="preview-section-title">${isArabic ? 'الأزرار وعناصر التحكم (Buttons & Actions)' : 'Buttons & Controls'}</div>
    <div class="demo-flex">
      <button class="btn btn-primary" onclick="console.log('Button clicked!')">${isArabic ? 'زر رئيسي Primary' : 'Primary Button'}</button>
      <button class="btn btn-secondary" onclick="console.log('Secondary clicked!')">${isArabic ? 'زر ثانوي Secondary' : 'Secondary Button'}</button>
      <span class="badge badge-glow">${isArabic ? 'شارة توهج Glow' : 'Glow Badge'}</span>
    </div>
  </div>

  <div class="preview-section">
    <div class="preview-section-title">${isArabic ? 'حقول الإدخال (Form Inputs)' : 'Form Inputs'}</div>
    <div style="max-width: 400px; display: flex; flex-direction: column; gap: 10px;">
      <input type="text" class="input input-custom" placeholder="${isArabic ? 'اكتب نص تجريبي هنا...' : 'Type sample text here...'}" value="" />
      <input type="email" class="input input-custom" placeholder="user@example.com" />
    </div>
  </div>

  ${linkedJs ? `<script>${linkedJs}</script>` : ''}
  <script>
    console.log('🎨 تم تطبيق ملف CSS "${file.name}" بنجاح في المعاينة الحية.');
  </script>
</body>
</html>`;
    }

    // CASE 3: JavaScript Document (Interactive sandbox environment)
    if (isJs) {
      return `<!DOCTYPE html>
<html lang="${isArabic ? 'ar' : 'en'}" dir="${isArabic ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Live JS Sandbox — ${file.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  ${consoleInterceptorScript}
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: 'Cairo', system-ui, sans-serif;
      background: #0f172a;
      color: #f8fafc;
    }
    .sandbox-header {
      background: linear-gradient(135deg, #1e293b, #0f172a);
      border: 1px solid #334155;
      padding: 16px 20px;
      border-radius: 16px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .sandbox-header h2 { margin: 0; font-size: 1.1rem; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
    .status-badge { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: bold; }
    .app-canvas {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
      min-height: 180px;
    }
    .canvas-title { font-size: 12px; text-transform: uppercase; color: #94a3b8; margin-bottom: 12px; font-weight: bold; }
    .interactive-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 16px;
    }
    .btn {
      background: #0284c7;
      color: white;
      border: none;
      padding: 10px 18px;
      border-radius: 10px;
      font-weight: bold;
      cursor: pointer;
      font-size: 13px;
      transition: 0.2s;
    }
    .btn:hover { background: #0369a1; }
    .btn-secondary { background: #334155; }
    .btn-secondary:hover { background: #475569; }
    .counter-badge {
      font-size: 2.5rem;
      font-weight: 800;
      color: #38bdf8;
      display: inline-block;
      min-width: 60px;
      transition: transform 0.15s ease;
    }
    .console-box {
      background: #090d16;
      border: 1px solid #1e293b;
      border-radius: 14px;
      padding: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      color: #e2e8f0;
      max-height: 220px;
      overflow-y: auto;
    }
    .console-header {
      display: flex;
      justify-content: space-between;
      color: #64748b;
      font-size: 11px;
      margin-bottom: 8px;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 6px;
    }
    .log-line { margin: 4px 0; line-height: 1.5; }
    .log-log { color: #38bdf8; }
    .log-info { color: #818cf8; }
    .log-warn { color: #fbbf24; }
    .log-error { color: #f87171; }
    ${linkedCss}
  </style>
</head>
<body>
  <div class="sandbox-header">
    <h2><span>⚡</span> ${isArabic ? `بيئة تشغيل جافاسكريبت المباشرة: ${file.name}` : `Live JS Sandbox: ${file.name}`}</h2>
    <span class="status-badge">${isArabic ? 'تشغيل فوري متصل' : 'Running Live'}</span>
  </div>

  <div class="app-canvas" id="app">
    <div class="canvas-title">${isArabic ? 'واجهة تفاعلية للحاوية (#app)' : 'Interactive Container (#app)'}</div>
    <div style="text-align: center; padding: 20px 0;">
      <div class="counter-badge" id="counter-display">0</div>
      <p style="color: #94a3b8; font-size: 13px; margin: 8px 0 16px;">${isArabic ? 'انقر لتجربة تفاعل كود JavaScript المباشر' : 'Click below to trigger interactive JS logic'}</p>
      <div class="interactive-controls" style="justify-content: center;">
        <button class="btn" onclick="if (typeof handleIncrement === 'function') { handleIncrement(); } else { console.log('Clicked test button!'); }">${isArabic ? 'زيادة العداد (+1)' : 'Increment (+1)'}</button>
        <button class="btn btn-secondary" onclick="if (typeof handleReset === 'function') { handleReset(); } else { console.warn('Reset button clicked'); }">${isArabic ? 'إعادة ضبط' : 'Reset'}</button>
      </div>
    </div>
    <div id="output" style="margin-top: 12px; font-size: 13px; color: #38bdf8;"></div>
  </div>

  <div class="console-box">
    <div class="console-header">
      <span>${isArabic ? 'مخرجات الكونسول المباشرة (Virtual Console)' : 'Virtual Live Console Output'}</span>
      <span id="log-count">0 logs</span>
    </div>
    <div id="console-logs-container"></div>
  </div>

  <script>
    // Live in-page virtual logger
    const logContainer = document.getElementById('console-logs-container');
    const logCountEl = document.getElementById('log-count');
    let inPageLogs = 0;

    function appendInPageLog(type, text) {
      inPageLogs++;
      if (logCountEl) logCountEl.innerText = inPageLogs + ' logs';
      if (logContainer) {
        const div = document.createElement('div');
        div.className = 'log-line log-' + type;
        div.innerText = '[' + new Date().toLocaleTimeString() + '] ' + text;
        logContainer.appendChild(div);
        logContainer.scrollTop = logContainer.scrollHeight;
      }
    }

    const _nativeLog = console.log;
    console.log = function(...args) {
      appendInPageLog('log', args.join(' '));
      _nativeLog.apply(console, args);
    };
    const _nativeWarn = console.warn;
    console.warn = function(...args) {
      appendInPageLog('warn', args.join(' '));
      _nativeWarn.apply(console, args);
    };
    const _nativeError = console.error;
    console.error = function(...args) {
      appendInPageLog('error', args.join(' '));
      _nativeError.apply(console, args);
    };
  </script>

  ${linkedJs ? `<script>${linkedJs}</script>` : ''}
  <script>
    try {
      ${sourceCode}
    } catch (err) {
      console.error('Execution Exception: ' + (err.message || err));
    }
  </script>
</body>
</html>`;
    }

    // Default fallback for other text/data files
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;background:#0b0f19;color:#fff;"><pre>${sourceCode}</pre></body></html>`;
  };

  const liveHtmlDocument = generateLiveHtml();

  const handleOpenInNewTab = () => {
    const blob = new Blob([liveHtmlDocument], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Viewport widths
  const getViewportStyle = () => {
    if (viewportMode === 'mobile') {
      return 'w-[375px] max-w-full h-full shadow-2xl rounded-2xl border-4 border-slate-800 transition-all duration-300';
    }
    if (viewportMode === 'tablet') {
      return 'w-[768px] max-w-full h-full shadow-2xl rounded-2xl border-4 border-slate-800 transition-all duration-300';
    }
    return 'w-full h-full transition-all duration-300';
  };

  const getCanvasBackgroundClass = () => {
    if (canvasBg === 'dark') return 'bg-slate-950';
    if (canvasBg === 'checker') {
      return 'bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] bg-slate-900';
    }
    return 'bg-white';
  };

  const renderPythonExecutionPanel = () => {
    return (
      <div className="w-full h-full flex flex-col bg-[#0b0d13] text-slate-100 overflow-hidden font-sans">
        {/* Runner Header */}
        <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2 bg-[#12141c] border-b border-white/10 text-xs shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0">
              🐍
            </div>
            <div>
              <div className="font-bold text-slate-100 flex items-center gap-1.5 font-mono">
                <span>{currentFile.name}</span>
                {projectFolder && (
                  <span className="text-[10px] text-cyan-400 font-sans">
                    [{projectFolder}{currentFile.subfolder ? `/${currentFile.subfolder}` : ''}]
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                <span className="text-emerald-400 font-semibold">{runtimeVersion}</span>
                <span>•</span>
                <span className="text-cyan-300">Procfile: {procfileCmd}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleRunProcfile}
              disabled={isRunningPython}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition active:scale-95 shadow-sm disabled:opacity-50"
              title={isArabic ? `تشغيل تلقائي لمشروع بايثون عبر أمر Procfile (${procfileCmd})` : `Run Procfile (${procfileCmd})`}
            >
              {isRunningPython ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-black" />
              )}
              <span>{isArabic ? '⚡ تشغيل تلقائي (Procfile)' : '⚡ Run Procfile'}</span>
            </button>

            {(currentFile.type === 'python' || currentFile.name.endsWith('.py')) && (
              <button
                type="button"
                onClick={() => handleRunPython()}
                disabled={isRunningPython}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 font-bold text-xs transition active:scale-95 disabled:opacity-50"
                title={isArabic ? `تشغيل السكربت الحالي (${currentFile.name})` : `Run script (${currentFile.name})`}
              >
                <Play className="w-3 h-3 text-sky-400" />
                <span>{isArabic ? '▶️ تشغيل السكربت' : 'Run Script'}</span>
              </button>
            )}

            {onOpenInTerminalSandbox && (
              <button
                type="button"
                onClick={() => {
                  onOpenInTerminalSandbox(
                    currentFile.type === 'python' || currentFile.name.endsWith('.py') ? editableCode : mainPyFile?.content || '',
                    currentFile.name
                  );
                  onClose();
                }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
                title={isArabic ? 'فتح في الطرفية الكاملة' : 'Open in CLI'}
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              </button>
            )}
          </div>
        </div>

        {/* Requirements & Info Pills */}
        <div className="px-3 sm:px-4 py-1.5 bg-[#0f1118] border-b border-white/5 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-1 shrink-0 font-mono">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-slate-500 font-sans">{isArabic ? 'المكتبات المكتشفة:' : 'Requirements:'}</span>
            <span className="px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-bold text-[10px]">
              pyTelegramBotAPI
            </span>
            <span className="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-500/30 text-amber-300 font-bold text-[10px]">
              pyrebase
            </span>
            <span className="px-1.5 py-0.2 rounded bg-blue-950/80 border border-blue-500/30 text-blue-300 font-bold text-[10px]">
              requests & urllib3
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
              setuptools & wheel
            </span>
          </div>

          {pythonExecution && (
            <div className="flex items-center gap-2 text-[10px]">
              <span
                className={`px-1.5 py-0.2 rounded font-bold ${
                  pythonExecution.exitCode === 0
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                Exit {pythonExecution.exitCode}
              </span>
              <span>{pythonExecution.executionTimeMs}ms</span>
            </div>
          )}
        </div>

        {/* Terminal Screen */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 font-mono text-xs select-text bg-[#07090e]">
          {!pythonExecution && !isRunningPython ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl">
                ⚡
              </div>
              <div className="text-slate-300 font-bold text-sm">
                {isArabic ? 'جاهز لتشغيل مشروع وكود بايثون' : 'Ready to execute Python'}
              </div>
              <p className="text-xs text-slate-500 max-w-md">
                {isArabic
                  ? `اضغط على "⚡ تشغيل تلقائي (Procfile)" لتشغيل أمر "${procfileCmd}"، أو "▶️ تشغيل السكربت" لتشغيل الكود الحالي.`
                  : `Click "⚡ Run Procfile" to execute "${procfileCmd}", or "Run Script" to run the active script.`}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRunProcfile}
                  className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition active:scale-95 shadow-md"
                >
                  {isArabic ? '⚡ تشغيل المشروع تلقائياً' : '⚡ Execute Project Now'}
                </button>
              </div>
            </div>
          ) : isRunningPython ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12 space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
              <div className="font-bold text-slate-200">
                {isArabic ? 'جارٍ تشغيل مشروع بايثون ومعالجة الأكواد...' : 'Running Python script in Cloud Sandbox...'}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                command: {procfileCmd}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-slate-200">{isArabic ? 'مخرجات الطرفية:' : 'Terminal Output:'}</span>
                  <span className="text-slate-500 font-mono">[{pythonExecution.command || procfileCmd}]</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPythonExecution(null)}
                  className="px-2 py-0.5 rounded text-[10px] bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  {isArabic ? 'مسح' : 'Clear'}
                </button>
              </div>

              {pythonExecution.stdout && (
                <pre className="whitespace-pre-wrap break-all text-emerald-300 leading-relaxed m-0 selection:bg-emerald-500/30">
                  {pythonExecution.stdout}
                </pre>
              )}

              {pythonExecution.stderr && (
                <pre className="whitespace-pre-wrap break-all text-rose-400 leading-relaxed m-0 p-2 rounded-lg bg-rose-950/30 border border-rose-500/20 selection:bg-rose-500/30">
                  {pythonExecution.stderr}
                </pre>
              )}

              {!pythonExecution.stdout && !pythonExecution.stderr && (
                <div className="text-slate-500 italic">
                  {isArabic ? '(تم التنفيذ بنجاح دون أي مخرجات نصية)' : '(Executed successfully with no output)'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stdin Bar */}
        <div className="p-2 bg-[#12141c] border-t border-white/10 flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-mono text-slate-400 shrink-0 font-bold">
            stdin &gt;
          </span>
          <input
            type="text"
            value={pythonStdin}
            onChange={(e) => setPythonStdin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRunPython();
              }
            }}
            placeholder={isArabic ? 'أدخل مدخلات البرنامج (input) واضغط Enter...' : 'Enter program input and press Enter...'}
            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono text-cyan-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="button"
            onClick={() => handleRunPython()}
            disabled={isRunningPython}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition disabled:opacity-50"
          >
            {isArabic ? 'إرسال وتنفيذ' : 'Send'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      id="file-preview-modal-root"
      dir="ltr"
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-0 sm:p-3 lg:p-4 animate-in fade-in duration-150 text-left"
    >
      <div className="bg-white border-0 sm:border border-slate-200 rounded-none sm:rounded-2xl w-full sm:max-w-6xl h-[100dvh] sm:h-[92vh] flex flex-col shadow-xl overflow-hidden text-slate-800">
        
        {/* ================= MODAL TOP HEADER ================= */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-slate-200 bg-white shrink-0 pt-[max(0.5rem,env(safe-area-inset-top))]">
          {/* File Identity */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <button
              id="preview-close-btn"
              onClick={onClose}
              className="p-1.5 -mr-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition active:scale-95 min-h-[36px] min-w-[36px] flex items-center justify-center"
              title={isArabic ? 'رجوع' : 'Back'}
            >
              {isArabic ? <ArrowRight className="w-4 h-4 sm:hidden" /> : <ArrowLeft className="w-4 h-4 sm:hidden" />}
              <X className="w-4 h-4 hidden sm:block" />
            </button>

            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center font-mono text-sm shrink-0">
              {currentFile.type === 'html' ? '🌐' : currentFile.type === 'css' ? '🎨' : currentFile.type === 'javascript' ? '⚡' : currentFile.type === 'python' ? '🐍' : currentFile.type === 'json' ? '{ }' : '📄'}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate font-mono">
                  {currentFile.name}
                </h3>
                {isLivePreviewable && (
                  <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium whitespace-nowrap">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    {isArabic ? 'معاينة حية' : 'Live'}
                  </span>
                )}
                {projectFolder && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 border border-cyan-300 font-mono hidden sm:inline truncate max-w-[140px]">
                    📁 {projectFolder}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                {formatSize(currentFile.sizeBytes)} • {currentFile.description || (isArabic ? 'ملف سحابي' : 'Cloud file')}
                {hasUnsavedChanges && (
                  <span className="text-amber-600 font-bold ml-1 mr-1">
                    ({isArabic ? 'تعديلات غير محفوظة' : 'Unsaved'})
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Mode Switcher: Live Preview vs Split vs Code */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              {isLivePreviewable && (
                <button
                  id="tab-live-preview-btn"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition font-medium text-xs min-h-[30px] ${
                    activeTab === 'preview'
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={isArabic ? 'معاينة حية وتشغيل كامل' : 'Live Preview'}
                >
                  <Eye className="w-3 h-3" />
                  <span>{isArabic ? 'المعاينة' : 'Preview'}</span>
                </button>
              )}
              {isLivePreviewable && (
                <button
                  id="tab-split-btn"
                  onClick={() => setActiveTab('split')}
                  className={`hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md transition font-medium text-xs min-h-[30px] ${
                    activeTab === 'split'
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={isArabic ? 'معاينة وتعديل جنباً إلى جنب' : 'Split View'}
                >
                  <Columns className="w-3 h-3" />
                  <span>{isArabic ? 'تقسيم' : 'Split'}</span>
                </button>
              )}
              <button
                id="tab-code-btn"
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition font-medium text-xs min-h-[30px] ${
                  activeTab === 'code'
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={isArabic ? 'محرر الأكواد' : 'Code Editor'}
              >
                <Code className="w-3 h-3" />
                <span>{isArabic ? 'الكود' : 'Code'}</span>
              </button>
            </div>

            {/* Standalone Window Button */}
            {isLivePreviewable && (
              <button
                id="open-standalone-btn"
                onClick={handleOpenInNewTab}
                title={isArabic ? 'فتح في نافذة مستقلة' : 'Open in window'}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition min-h-[32px] min-w-[32px] flex items-center justify-center active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              title={isArabic ? 'نسخ الكود' : 'Copy code'}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition flex items-center justify-center min-h-[32px] min-w-[32px] active:scale-95"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              title={isArabic ? 'تحميل الملف' : 'Download file'}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition min-h-[32px] min-w-[32px] flex items-center justify-center active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Auto-run Procfile top action button for Python projects */}
            {isPythonProject && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('split');
                  handleRunProcfile();
                }}
                disabled={isRunningPython}
                title={isArabic ? `تشغيل تلقائي لمشروع بايثون عبر Procfile (${procfileCmd})` : `Run Procfile (${procfileCmd})`}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition min-h-[32px] active:scale-95 shadow-xs disabled:opacity-50"
              >
                {isRunningPython ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-white" />
                )}
                <span>{isArabic ? '⚡ تشغيل تلقائي (Procfile)' : '⚡ Run Procfile'}</span>
              </button>
            )}

            {/* Terminal / Python Sandbox Run button */}
            {onOpenInTerminalSandbox && (currentFile.type === 'python' || currentFile.name.endsWith('.py')) && (
              <button
                type="button"
                onClick={() => {
                  onOpenInTerminalSandbox(currentFile.content, currentFile.name);
                  onClose();
                }}
                title={isArabic ? 'تشغيل السكربت في ساندبوكس بايثون ومشغل الطرفية' : 'Run script in Python Sandbox & Terminal'}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition min-h-[32px] active:scale-95 shadow-2xs"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">{isArabic ? 'الطرفية' : 'Terminal'}</span>
              </button>
            )}

            {/* AI Edit */}
            {onRequestAIEdit && (
              <button
                onClick={() => {
                  onRequestAIEdit(currentFile);
                  onClose();
                }}
                title={isArabic ? 'تعديل بالذكاء الاصطناعي' : 'Edit with AI'}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-medium transition min-h-[32px] active:scale-95"
              >
                <Sparkles className="w-3 h-3" />
                <span className="hidden md:inline">{isArabic ? 'تعديل بالـ AI' : 'AI Edit'}</span>
              </button>
            )}
          </div>
        </div>

        {/* ================= PROJECT FILES BAR WITH SUBFOLDERS (e.g. mubarak/assets, mubarak/image) ================= */}
        {projectFiles.length > 1 && (
          <div className="flex flex-col bg-slate-900 border-b border-slate-800 text-xs shrink-0">
            {/* Top Row: Folder, Subfolder Tabs, and Download */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 gap-2 overflow-x-auto border-b border-slate-800/80">
              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto" dir="ltr">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold font-mono text-[11px] shrink-0">
                  <Folder className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{projectFolder || 'project'}</span>
                </div>

                {/* Subfolder Navigation Chips */}
                {subfolders.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto">
                    <button
                      type="button"
                      onClick={() => setSelectedSubfolder('all')}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition shrink-0 border ${
                        selectedSubfolder === 'all'
                          ? 'bg-cyan-500 text-black font-extrabold border-cyan-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {isArabic ? `الكل (${projectFiles.length})` : `All (${projectFiles.length})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubfolder('__root__')}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-mono transition shrink-0 border ${
                        selectedSubfolder === '__root__'
                          ? 'bg-cyan-500 text-black font-extrabold border-cyan-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                      }`}
                      title={isArabic ? 'الملفات في المجلد الرئيسي فقط' : 'Root directory only'}
                    >
                      📁 {projectFolder}/
                    </button>
                    {subfolders.map((sf) => {
                      const count = projectFiles.filter((f) => f.subfolder === sf).length;
                      const isSelected = selectedSubfolder === sf;
                      return (
                        <button
                          key={sf}
                          type="button"
                          onClick={() => setSelectedSubfolder(sf)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono transition shrink-0 border ${
                            isSelected
                              ? 'bg-cyan-500 text-black font-extrabold border-cyan-400'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                          }`}
                          title={`مجلد ${projectFolder}/${sf}`}
                        >
                          <span>📂</span>
                          <span>
                            {projectFolder}/{sf}
                          </span>
                          <span className="text-[10px] opacity-80">({count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Procfile & Download Action */}
              <div className="flex items-center gap-2 shrink-0">
                {isPythonProject && procfileFile && (
                  <button
                    type="button"
                    onClick={handleRunProcfile}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold hover:bg-emerald-900/60 transition"
                    title={isArabic ? 'تشغيل تلقائي لأمر Procfile' : 'Run Procfile command'}
                  >
                    <span>⚡ {procfileCmd}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => downloadFilesAsZip(projectFiles, projectFolder || 'project')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 font-bold text-xs border border-cyan-500/30 transition shrink-0"
                  title={isArabic ? 'تحميل مجلد المشروع كاملاً كملف مضغوط ZIP' : 'Download project folder as ZIP'}
                >
                  <Download className="w-3 h-3" />
                  <span className="hidden sm:inline">{isArabic ? 'تحميل ZIP' : 'ZIP'}</span>
                </button>
              </div>
            </div>

            {/* Bottom Row: File Pills in current subfolder */}
            <div className="flex items-center gap-1 px-3 sm:px-4 py-1.5 overflow-x-auto" dir="ltr">
              {displayedProjectFiles.map((pf) => {
                const isPy = pf.type === 'python' || pf.name.endsWith('.py');
                const isProc = pf.name.toLowerCase() === 'procfile';
                const isReq = pf.name.toLowerCase() === 'requirements.txt';
                const isRun = pf.name.toLowerCase() === 'runtime.txt';
                const isImg =
                  pf.type === 'image' ||
                  /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(pf.name);

                const icon = isPy
                  ? '🐍'
                  : isProc
                  ? '⚡'
                  : isReq
                  ? '📦'
                  : isRun
                  ? '⚙️'
                  : isImg
                  ? '🖼️'
                  : pf.type === 'html'
                  ? '🌐'
                  : pf.type === 'css'
                  ? '🎨'
                  : pf.type === 'javascript'
                  ? '⚡'
                  : pf.type === 'json'
                  ? '{ }'
                  : '📄';

                const displayLabel =
                  pf.subfolder && selectedSubfolder === 'all'
                    ? `${pf.subfolder}/${pf.name}`
                    : pf.name;

                return (
                  <button
                    key={pf.id}
                    type="button"
                    onClick={() => handleSwitchFile(pf)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-xs transition shrink-0 ${
                      pf.id === currentFile.id
                        ? 'bg-cyan-500 text-black font-extrabold shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60'
                    }`}
                  >
                    <span>{icon}</span>
                    <span>{displayLabel}</span>
                    {pf.id === currentFile.id && hasUnsavedChanges && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5" />
                    )}
                  </button>
                );
              })}

              {/* Add New File to Project */}
              {isAddingFile ? (
                <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-cyan-500/50">
                  <input
                    type="text"
                    autoFocus
                    value={newFileNameInput}
                    onChange={(e) => setNewFileNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateNewProjectFile(newFileNameInput);
                      if (e.key === 'Escape') setIsAddingFile(false);
                    }}
                    placeholder="e.g. data.json"
                    className="bg-transparent text-cyan-200 px-2 py-0.5 text-xs font-mono focus:outline-none w-28"
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateNewProjectFile(newFileNameInput)}
                    className="p-1 rounded bg-cyan-500 text-black hover:bg-cyan-400"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingFile(false)}
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingFile(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 border border-dashed border-slate-700 font-mono text-xs transition shrink-0"
                  title={isArabic ? 'إضافة ملف جديد للمشروع' : 'Add new file to project'}
                >
                  <Plus className="w-3 h-3" />
                  <span>{isArabic ? 'ملف جديد' : 'New File'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ================= LIVE PREVIEW SUB-CONTROLS BAR ================= */}
        {(activeTab === 'preview' || activeTab === 'split') && isLivePreviewable && (
          <div className="px-3 sm:px-4 py-1.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-1.5 text-xs shrink-0">
            {/* Viewport Width Switchers */}
            <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-slate-200">
              <button
                id="viewport-mobile-btn"
                onClick={() => setViewportMode('mobile')}
                title={isArabic ? 'هاتف (375px)' : 'Mobile (375px)'}
                className={`p-1 rounded transition ${
                  viewportMode === 'mobile'
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Smartphone className="w-3 h-3" />
              </button>
              <button
                id="viewport-tablet-btn"
                onClick={() => setViewportMode('tablet')}
                title={isArabic ? 'لوحي (768px)' : 'Tablet (768px)'}
                className={`p-1 rounded transition ${
                  viewportMode === 'tablet'
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Tablet className="w-3 h-3" />
              </button>
              <button
                id="viewport-desktop-btn"
                onClick={() => setViewportMode('desktop')}
                title={isArabic ? 'شاشة كاملة (100%)' : 'Desktop (100%)'}
                className={`p-1 rounded transition ${
                  viewportMode === 'desktop'
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Monitor className="w-3 h-3" />
              </button>
              <span className="text-[9px] text-slate-400 px-1 font-mono hidden sm:inline">
                {viewportMode === 'mobile' ? '375px' : viewportMode === 'tablet' ? '768px' : '100%'}
              </span>
            </div>

            {/* Frame Background Canvas Mode */}
            <div className="flex items-center gap-1">
              <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-slate-200 text-[11px]">
                <button
                  onClick={() => setCanvasBg('light')}
                  title={isArabic ? 'خلفية فاتحة' : 'Light Canvas'}
                  className={`p-1 rounded transition ${canvasBg === 'light' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-700'}`}
                >
                  <Sun className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setCanvasBg('dark')}
                  title={isArabic ? 'خلفية داكنة' : 'Dark Canvas'}
                  className={`p-1 rounded transition ${canvasBg === 'dark' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-700'}`}
                >
                  <Moon className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setCanvasBg('checker')}
                  title={isArabic ? 'خلفية شبكية للشفافية' : 'Checkerboard'}
                  className={`p-1 rounded transition ${canvasBg === 'checker' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-700'}`}
                >
                  <GridIcon className="w-3 h-3" />
                </button>
              </div>

              {/* Reload Frame Button */}
              <button
                id="preview-reload-btn"
                onClick={() => setReloadKey((k) => k + 1)}
                title={isArabic ? 'إعادة تحميل' : 'Reload'}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition active:scale-95"
              >
                <RefreshCw className="w-3 h-3" />
                <span className="hidden sm:inline text-[11px]">{isArabic ? 'إعادة' : 'Reload'}</span>
              </button>

              {/* Link Project Files (CSS / JS) */}
              {allFiles.length > 1 && (
                <button
                  onClick={() => setShowLinkFiles(!showLinkFiles)}
                  title={isArabic ? 'ربط ملفات إضافية' : 'Link files'}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition active:scale-95 text-[11px] ${
                    showLinkFiles || selectedLinkedFileIds.length > 0
                      ? 'bg-sky-50 text-sky-700 border-sky-300'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <LinkIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">
                    {isArabic ? 'ربط ملفات' : 'Link'}
                  </span>
                  {selectedLinkedFileIds.length > 0 && (
                    <span className="w-3.5 h-3.5 rounded-full bg-sky-600 text-white text-[8px] font-bold flex items-center justify-center">
                      {selectedLinkedFileIds.length}
                    </span>
                  )}
                </button>
              )}

              {/* Console Log Toggle */}
              <button
                id="toggle-console-btn"
                onClick={() => setShowConsole(!showConsole)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition active:scale-95 text-[11px] ${
                  showConsole || consoleLogs.some((l) => l.level === 'error')
                    ? 'bg-sky-50 text-sky-700 border-sky-300'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                }`}
                title={isArabic ? 'الكونسول' : 'Console'}
              >
                <Terminal className="w-3 h-3" />
                <span className="hidden sm:inline">{isArabic ? 'الكونسول' : 'Console'}</span>
                {consoleLogs.length > 0 && (
                  <span className={`text-[9px] px-1 rounded-full font-bold ${
                    consoleLogs.some((l) => l.level === 'error')
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {consoleLogs.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ================= LINKED FILES DRAWER ================= */}
        {showLinkFiles && (
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-sky-600" />
                {isArabic
                  ? 'ربط ملفات أخرى من مساحة SudaStack السحابية مع المعاينة الحية:'
                  : 'Link other SudaStack files into Live Preview:'}
              </span>
              <button
                onClick={() => setShowLinkFiles(false)}
                className="text-[11px] text-slate-500 hover:text-slate-800"
              >
                {isArabic ? 'إغلاق' : 'Close'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allFiles
                .filter((f) => f.id !== file.id && (f.type === 'css' || f.type === 'javascript' || f.name.endsWith('.css') || f.name.endsWith('.js')))
                .map((f) => {
                  const isSelected = selectedLinkedFileIds.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        setSelectedLinkedFileIds((prev) =>
                          isSelected ? prev.filter((id) => id !== f.id) : [...prev, f.id]
                        );
                        setReloadKey((k) => k + 1);
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono transition border ${
                        isSelected
                          ? 'bg-sky-50 text-sky-700 border-sky-300 shadow-2xs font-semibold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span>{f.type === 'css' ? '🎨' : '⚡'}</span>
                      <span>{f.name}</span>
                      {isSelected ? <Check className="w-3 h-3 text-sky-600" /> : null}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* ================= MODAL BODY ================= */}
        <div className="flex-1 overflow-hidden bg-slate-50 flex flex-col relative">
          {activeTab === 'split' && isLivePreviewable ? (
            /* Split View: Live Preview on left/top, Code Editor on right/bottom */
            <div className="w-full h-full flex flex-col md:flex-row overflow-hidden">
              <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col border-b md:border-b-0 md:border-r border-slate-200 overflow-hidden relative">
                {isImage ? (
                  <div className={`w-full h-full flex flex-col ${getCanvasBackgroundClass()} overflow-hidden select-none`}>
                    <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                      <img
                        src={
                          currentFile.content.startsWith('data:image/') ||
                          currentFile.content.startsWith('http://') ||
                          currentFile.content.startsWith('https://') ||
                          currentFile.content.startsWith('/')
                            ? currentFile.content
                            : currentFile.name.endsWith('.svg') || currentFile.content.trim().startsWith('<svg')
                            ? `data:image/svg+xml;utf8,${encodeURIComponent(currentFile.content)}`
                            : currentFile.content
                        }
                        alt={currentFile.name}
                        className="max-w-full max-h-[70vh] object-contain block"
                      />
                    </div>
                  </div>
                ) : isPython || (isPythonProject && !isHtml) ? (
                  renderPythonExecutionPanel()
                ) : (
                  <div className={`w-full h-full flex items-center justify-center p-0 ${getCanvasBackgroundClass()} overflow-hidden`}>
                    <iframe
                      ref={iframeRef}
                      key={`frame-${currentFile.id}-${reloadKey}`}
                      title={currentFile.name}
                      srcDoc={liveHtmlDocument}
                      className="w-full h-full"
                      sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
                    />
                  </div>
                )}
              </div>

              <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col overflow-hidden">
                {/* Embedded Code Editor in Split View */}
                <div dir="ltr" className="w-full h-full flex flex-col bg-white text-left">
                  <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-slate-800 truncate">{currentFile.name}</span>
                      <span>•</span>
                      <span className="shrink-0">{editableCode.split('\n').length} {isArabic ? 'سطر' : 'lines'}</span>
                      {hasUnsavedChanges && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 shrink-0 font-medium">
                          ● {isArabic ? 'تعديلات غير محفوظة' : 'Unsaved'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono hidden xl:inline">
                        Ctrl+S {isArabic ? 'للحفظ' : 'to save'}
                      </span>
                      {onSaveFile && (
                        <button
                          onClick={handleSave}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-white font-medium text-xs transition active:scale-95 shadow-2xs ${
                            hasUnsavedChanges
                              ? 'bg-emerald-600 hover:bg-emerald-500 font-bold'
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                          }`}
                          title={isArabic ? 'حفظ التعديلات وتحديث المعاينة (Ctrl+S)' : 'Save & Hot Reload (Ctrl+S)'}
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isSaved ? (isArabic ? 'تم الحفظ ✅' : 'Saved ✅') : isArabic ? 'حفظ وتحديث' : 'Save'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Code Editor with Line Numbers */}
                  <div dir="ltr" className="flex-1 overflow-auto flex font-mono text-xs sm:text-sm bg-[#0e1017] text-slate-100 select-text text-left">
                    <div className="select-none py-3 px-3 bg-[#13151f] border-r border-white/10 text-slate-500 text-right font-mono min-w-[46px] shrink-0">
                      {editableCode.split('\n').map((_, idx) => (
                        <div key={idx} className="leading-6 text-[11px]">
                          {(idx + 1).toString().padStart(2, '0')}
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 p-3">
                      <textarea
                        dir="ltr"
                        value={editableCode}
                        onChange={(e) => {
                          setEditableCode(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        spellCheck={false}
                        className="w-full h-full bg-transparent border-0 text-cyan-200 font-mono text-xs sm:text-sm focus:outline-none resize-none leading-6 text-left selection:bg-cyan-500/30 selection:text-white"
                        placeholder={isArabic ? 'كود الملف...' : 'File code...'}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'preview' && isLivePreviewable ? (
            isImage ? (
              <div className={`w-full h-full flex flex-col ${getCanvasBackgroundClass()} overflow-hidden select-none`}>
                {/* Image Toolbar */}
                <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-slate-900/80 backdrop-blur border-b border-white/10 text-xs text-slate-200 z-10 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      {isArabic ? 'معاينة الصورة' : 'Image Preview'}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 font-mono text-[11px]">{formatSize(currentFile.sizeBytes)}</span>
                  </div>

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-black/40 rounded-lg border border-white/10 p-0.5 font-mono text-[11px]">
                      <button
                        onClick={() => setImageZoom((prev) => Math.max(25, prev - 25))}
                        className="px-2 py-0.5 rounded hover:bg-white/10 text-slate-300 hover:text-white"
                        title={isArabic ? 'تصغير' : 'Zoom out'}
                      >
                        -
                      </button>
                      <span className="px-2 text-cyan-400 min-w-[45px] text-center font-bold">{imageZoom}%</span>
                      <button
                        onClick={() => setImageZoom((prev) => Math.min(400, prev + 25))}
                        className="px-2 py-0.5 rounded hover:bg-white/10 text-slate-300 hover:text-white"
                        title={isArabic ? 'تكبير' : 'Zoom in'}
                      >
                        +
                      </button>
                      <button
                        onClick={() => setImageZoom(100)}
                        className="px-1.5 py-0.5 ml-1 rounded hover:bg-white/10 text-slate-400 hover:text-white text-[10px]"
                        title={isArabic ? 'إعادة ضبط' : 'Reset'}
                      >
                        100%
                      </button>
                    </div>

                    {/* Canvas Background toggle */}
                    <div className="flex items-center bg-black/40 rounded-lg border border-white/10 p-0.5">
                      <button
                        onClick={() => setCanvasBg('checker')}
                        className={`p-1 rounded ${canvasBg === 'checker' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'}`}
                        title={isArabic ? 'خلفية مربعات شفافة' : 'Checkerboard background'}
                      >
                        <GridIcon className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setCanvasBg('dark')}
                        className={`p-1 rounded ${canvasBg === 'dark' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'}`}
                        title={isArabic ? 'خلفية داكنة' : 'Dark background'}
                      >
                        <Moon className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setCanvasBg('light')}
                        className={`p-1 rounded ${canvasBg === 'light' ? 'bg-cyan-500/20 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'}`}
                        title={isArabic ? 'خلفية فاتحة' : 'Light background'}
                      >
                        <Sun className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Centered Image Canvas */}
                <div className="flex-1 overflow-auto flex items-center justify-center p-4 sm:p-8">
                  <div
                    className="transition-transform duration-150 flex items-center justify-center shadow-2xl rounded-lg overflow-hidden border border-white/10 max-w-full max-h-full bg-black/20"
                    style={{ transform: `scale(${imageZoom / 100})`, transformOrigin: 'center center' }}
                  >
                    <img
                      src={
                        currentFile.content.startsWith('data:image/') ||
                        currentFile.content.startsWith('http://') ||
                        currentFile.content.startsWith('https://') ||
                        currentFile.content.startsWith('/')
                          ? currentFile.content
                          : currentFile.name.endsWith('.svg') || currentFile.content.trim().startsWith('<svg')
                          ? `data:image/svg+xml;utf8,${encodeURIComponent(currentFile.content)}`
                          : currentFile.content
                      }
                      alt={currentFile.name}
                      className="max-w-full max-h-[70vh] object-contain block"
                    />
                  </div>
                </div>
              </div>
            ) : isPdf ? (
              <div className="w-full h-full flex flex-col bg-slate-900 overflow-hidden select-none">
                <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-slate-900 border-b border-white/10 text-xs text-slate-200 z-10 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="text-rose-400">📑</span>
                      {isArabic ? 'معاينة مستند PDF' : 'PDF Document Preview'}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 font-mono text-[11px]">{formatSize(currentFile.sizeBytes)}</span>
                  </div>
                  <span className="text-[11px] text-cyan-300 font-mono">
                    {isArabic ? 'جاهز للرؤية والتحليل بالذكاء الاصطناعي' : 'Ready for AI Multimodal Analysis'}
                  </span>
                </div>
                <div className="flex-1 w-full h-full bg-[#1e2029]">
                  <iframe
                    src={currentFile.dataUrl || currentFile.content}
                    title={currentFile.name}
                    className="w-full h-full border-0"
                  />
                </div>
              </div>
            ) : isPython || (isPythonProject && !isHtml) ? (
              renderPythonExecutionPanel()
            ) : (
              <div className={`w-full h-full flex items-center justify-center p-0 ${getCanvasBackgroundClass()} overflow-hidden`}>
                <iframe
                  ref={iframeRef}
                  key={`frame-${currentFile.id}-${reloadKey}`}
                  title={currentFile.name}
                  srcDoc={liveHtmlDocument}
                  className={getViewportStyle()}
                  sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
                />
              </div>
            )
          ) : (
            /* Source Code & Inline Editor (LTR) */
            <div dir="ltr" className="w-full h-full flex flex-col bg-white text-left">
              <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-800">{currentFile.name}</span>
                  <span>•</span>
                  <span>{editableCode.split('\n').length} {isArabic ? 'سطر' : 'lines'}</span>
                  {hasUnsavedChanges && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                      ● {isArabic ? 'تعديلات غير محفوظة' : 'Unsaved'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                    Ctrl+S {isArabic ? 'للحفظ السريع' : 'to save'}
                  </span>
                  {onSaveFile && (
                    <button
                      onClick={handleSave}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-white font-medium text-xs transition active:scale-95 shadow-2xs ${
                        hasUnsavedChanges ? 'bg-emerald-600 hover:bg-emerald-500 font-bold' : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaved ? (isArabic ? 'تم الحفظ ✅' : 'Saved ✅') : isArabic ? 'حفظ التعديلات' : 'Save'}</span>
                    </button>
                  )}

                  {isLivePreviewable && (
                    <button
                      onClick={() => setActiveTab('preview')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium text-xs transition active:scale-95 shadow-2xs"
                    >
                      <Play className="w-3 h-3" />
                      <span>{isArabic ? 'معاينة حية' : 'Live Preview'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Code Editor with Line Numbers (LTR) */}
              <div dir="ltr" className="flex-1 overflow-auto flex font-mono text-xs sm:text-sm bg-[#0e1017] text-slate-100 select-text text-left">
                {/* Line Numbers Gutter */}
                <div className="select-none py-3 px-3 bg-[#13151f] border-r border-white/10 text-slate-500 text-right font-mono min-w-[46px] shrink-0">
                  {editableCode.split('\n').map((_, idx) => (
                    <div key={idx} className="leading-6 text-[11px]">
                      {(idx + 1).toString().padStart(2, '0')}
                    </div>
                  ))}
                </div>
                {/* Editor Textarea */}
                <div className="flex-1 p-3">
                  <textarea
                    dir="ltr"
                    value={editableCode}
                    onChange={(e) => {
                      setEditableCode(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    spellCheck={false}
                    className="w-full h-full bg-transparent border-0 text-cyan-200 font-mono text-xs sm:text-sm focus:outline-none resize-none leading-6 text-left selection:bg-cyan-500/30 selection:text-white"
                    placeholder={isArabic ? 'كود الملف...' : 'File code...'}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= COLLAPSIBLE LIVE CONSOLE DRAWER ================= */}
          {showConsole && (activeTab === 'preview' || activeTab === 'split') && (
            <div className="absolute bottom-0 left-0 right-0 max-h-[40%] h-44 bg-white/95 border-t border-slate-200 backdrop-blur-md flex flex-col z-30 shadow-lg animate-in slide-in-from-bottom duration-150 font-mono text-xs">
              <div className="flex items-center justify-between px-3 py-1 bg-slate-50 border-b border-slate-200 text-slate-700">
                <div className="flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-sky-600" />
                  <span className="font-bold text-[11px]">
                    {isArabic ? 'وحدة التحكم (Console)' : 'Frame Console'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    ({consoleLogs.length})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setConsoleLogs([])}
                    title={isArabic ? 'مسح السجل' : 'Clear logs'}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowConsole(false)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-2 overflow-y-auto space-y-1 select-text bg-white">
                {consoleLogs.length === 0 ? (
                  <div className="text-slate-400 text-center py-5 text-xs">
                    {isArabic
                      ? 'لا توجد سجلات في الكونسول حتى الآن.'
                      : 'No console messages yet.'}
                  </div>
                ) : (
                  consoleLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`px-2 py-0.5 rounded text-[11px] leading-relaxed flex items-start gap-1.5 ${
                        log.level === 'error'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : log.level === 'warn'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="text-slate-400 shrink-0 text-[10px]">{log.timestamp}</span>
                      <span className="font-bold uppercase text-[9px] shrink-0 opacity-75">
                        [{log.level}]
                      </span>
                      <span className="flex-1 whitespace-pre-wrap break-all">{log.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div className="px-3 sm:px-4 py-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>
              {isArabic ? 'التخزين السحابي • معاينة حية' : 'Cloud Storage • Live Preview'}
            </span>
            {isSaved && (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" />
                {isArabic ? 'تم الحفظ!' : 'Saved!'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {onSaveFile && hasUnsavedChanges && (
              <button
                onClick={handleSave}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition active:scale-95 shadow-2xs"
              >
                {isArabic ? 'حفظ التعديلات' : 'Save'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium transition active:scale-95"
            >
              {isArabic ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export const FilePreviewModal: React.FC<FilePreviewModalProps> = (props) => {
  if (!props.isOpen || !props.file) return null;
  return (
    <FilePreviewModalContent
      file={props.file}
      onClose={props.onClose}
      onRequestAIEdit={props.onRequestAIEdit}
      onSaveFile={props.onSaveFile}
      onAddNewFile={props.onAddNewFile}
      onDeleteFile={props.onDeleteFile}
      initialMode={props.initialMode}
      allFiles={props.allFiles}
      isArabic={props.isArabic}
      onOpenInTerminalSandbox={props.onOpenInTerminalSandbox}
    />
  );
};
