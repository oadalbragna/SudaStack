import React, { useState, useRef } from 'react';
import {
  X,
  HardDrive,
  Plus,
  Trash2,
  Eye,
  FileCode,
  Globe,
  MessageSquare,
  Clock,
  Search,
  Sparkles,
  Cpu,
  SlidersHorizontal,
  FolderOpen,
  Play,
  Code,
  Download,
  Folder,
  Sun,
  Moon,
  ChevronRight,
  Terminal,
  Layers,
  LayoutDashboard,
} from 'lucide-react';
import { TelegramStorageFile, SudaResponseMode, ChatSession } from '../types';
import { downloadFilesAsZip, extractZipToStorageFiles, detectFileTypeAndCategory } from '../utils/zipUtils';
import { useTheme } from '../context/ThemeContext';
import { useToast } from './ToastNotification';

interface StudioDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  files: TelegramStorageFile[];
  onOpenFile: (file: TelegramStorageFile, mode?: 'preview' | 'code' | 'split') => void;
  onDeleteFile: (id: string) => void;
  onDeleteFolder?: (folderName: string) => void;
  onUploadClick?: () => void;
  onSaveFilesBatch?: (files: TelegramStorageFile[]) => void;
  isArabic: boolean;
  setIsArabic: (val: boolean) => void;
  responseMode?: SudaResponseMode;
  systemPrompt?: string;
  onOpenSettings?: () => void;
  onOpenTerminalSandbox?: (code?: string, fileName?: string) => void;
  onOpenAdminDashboard?: () => void;
  sessions?: ChatSession[];
  currentSessionId?: string;
  onSelectSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  onNewSession?: () => void;
  onOpenAgentView?: () => void;
}

const formatSize = (bytes?: number) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

interface ProjectFolderCardProps {
  folderName: string;
  files: TelegramStorageFile[];
  isDark: boolean;
  isArabic: boolean;
  onOpenFile: (file: TelegramStorageFile, mode?: 'preview' | 'code' | 'split') => void;
  onClose: () => void;
  onDeleteFolder?: (folderName: string) => void;
  onOpenTerminalSandbox?: (code?: string, fileName?: string) => void;
}

const ProjectFolderCard: React.FC<ProjectFolderCardProps> = ({
  folderName,
  files,
  isDark,
  isArabic,
  onOpenFile,
  onClose,
  onDeleteFolder,
  onOpenTerminalSandbox,
}) => {
  const [selectedSubfolder, setSelectedSubfolder] = useState<string>('all');

  const isPyProject = files.some(
    (f) => f.type === 'python' || f.name.endsWith('.py') || f.name.toLowerCase() === 'procfile'
  );
  const procfile = files.find((f) => f.name.toLowerCase() === 'procfile');
  const procfileCmd = procfile?.content.trim() || 'worker: python main.py';
  const runtime = files.find((f) => f.name.toLowerCase() === 'runtime.txt')?.content.trim() || '';

  const mainPy = files.find((f) => f.name === 'main.py' || f.isProjectMain || f.name.endsWith('.py'));
  const mainFile =
    files.find((f) => f.isProjectMain || f.name.endsWith('.html') || f.name.endsWith('.py')) ||
    files[0];

  // Distinct subfolders (e.g. assets, image)
  const subfolders = Array.from(
    new Set(files.map((f) => f.subfolder).filter(Boolean))
  ) as string[];

  const displayedFiles = files.filter((f) => {
    if (selectedSubfolder === 'all') return true;
    if (selectedSubfolder === '__root__') return !f.subfolder;
    return f.subfolder === selectedSubfolder;
  });

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all shadow-sm space-y-2.5 ${
        isDark
          ? isPyProject
            ? 'bg-gradient-to-br from-[#121a22] to-[#0e131b] border-emerald-500/30 hover:border-emerald-500/50'
            : 'bg-gradient-to-br from-[#161a25] to-[#12141c] border-cyan-500/30 hover:border-cyan-500/50'
          : isPyProject
          ? 'bg-emerald-50/50 border-emerald-300 hover:border-emerald-400'
          : 'bg-cyan-50/50 border-cyan-300 hover:border-cyan-400'
      }`}
    >
      {/* Project Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${
              isPyProject
                ? isDark
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                : isDark
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-cyan-100 text-cyan-700 border-cyan-300'
            }`}
          >
            {isPyProject ? '🐍' : '📁'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4
                className={`text-xs font-mono font-bold truncate ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
                dir="ltr"
              >
                {folderName}
              </h4>
              {isPyProject && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-md font-mono font-bold border ${
                    isDark
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  Python
                </span>
              )}
            </div>
            <span
              className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              {files.length} {isArabic ? 'ملفات' : 'files'}
              {subfolders.length > 0 &&
                ` • ${subfolders.length} ${isArabic ? 'مجلدات فرعية' : 'subfolders'}`}
            </span>
          </div>
        </div>

        {/* Project Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Quick Procfile / Live Run */}
          {isPyProject && onOpenTerminalSandbox && mainPy ? (
            <button
              type="button"
              onClick={() => {
                onOpenTerminalSandbox(mainPy.content, mainPy.name);
                onClose();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[11px] transition active:scale-95 shadow-xs"
              title={
                isArabic
                  ? `تشغيل تلقائي عبر Procfile (${procfileCmd})`
                  : `Run Procfile (${procfileCmd})`
              }
            >
              <Terminal className="w-3 h-3 fill-black" />
              <span>{isArabic ? 'تشغيل' : 'Run'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onOpenFile(mainFile, 'preview');
                onClose();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-[11px] transition active:scale-95 shadow-xs"
              title={isArabic ? 'تشغيل وتجربة المنصة مباشرة' : 'Run Live'}
            >
              <Play className="w-3 h-3 fill-black" />
              <span>{isArabic ? 'تجربة حية' : 'Live'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onOpenFile(mainFile, 'split');
              onClose();
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-bold transition active:scale-95 ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-white/10'
                : 'bg-white hover:bg-slate-100 text-cyan-700 border-slate-200'
            }`}
            title={isArabic ? 'فتح محرر الأكواد المتكامل' : 'Code Editor'}
          >
            <Code className="w-3 h-3" />
            <span>{isArabic ? 'الكود' : 'Code'}</span>
          </button>

          <button
            type="button"
            onClick={() => downloadFilesAsZip(files, folderName)}
            className={`p-1 rounded-lg border transition ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-white/10'
                : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
            }`}
            title={isArabic ? 'تحميل مجلد المشروع ZIP' : 'Download ZIP'}
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {onDeleteFolder && (
            <button
              type="button"
              onClick={() => onDeleteFolder(folderName)}
              className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition"
              title={isArabic ? 'حذف مجلد المشروع' : 'Delete Project Folder'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Python Procfile & Runtime Info */}
      {isPyProject && (
        <div
          dir="ltr"
          className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-mono flex flex-wrap items-center justify-between gap-1.5 ${
            isDark
              ? 'bg-black/35 border-white/5 text-slate-300'
              : 'bg-white border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-emerald-400 font-bold">⚡ Procfile:</span>
            <span className="truncate">{procfileCmd}</span>
          </div>
          {runtime && (
            <span
              className={`px-1.5 py-0.2 rounded border font-bold ${
                isDark
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {runtime}
            </span>
          )}
        </div>
      )}

      {/* Subfolder Navigation Bar (e.g. mubarak/assets, mubarak/image) */}
      {subfolders.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 pt-0.5" dir="ltr">
          <button
            type="button"
            onClick={() => setSelectedSubfolder('all')}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition shrink-0 border ${
              selectedSubfolder === 'all'
                ? isDark
                  ? 'bg-cyan-500/25 text-cyan-200 border-cyan-500/40 font-bold'
                  : 'bg-cyan-100 text-cyan-900 border-cyan-300 font-bold'
                : isDark
                ? 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
          >
            {isArabic ? `الكل (${files.length})` : `All (${files.length})`}
          </button>
          <button
            type="button"
            onClick={() => setSelectedSubfolder('__root__')}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition shrink-0 border ${
              selectedSubfolder === '__root__'
                ? isDark
                  ? 'bg-cyan-500/25 text-cyan-200 border-cyan-500/40 font-bold'
                  : 'bg-cyan-100 text-cyan-900 border-cyan-300 font-bold'
                : isDark
                ? 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
          >
            📁 {folderName}/
          </button>
          {subfolders.map((sf) => {
            const count = files.filter((f) => f.subfolder === sf).length;
            const isSelected = selectedSubfolder === sf;
            return (
              <button
                key={sf}
                type="button"
                onClick={() => setSelectedSubfolder(sf)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono transition shrink-0 border ${
                  isSelected
                    ? isDark
                      ? 'bg-cyan-500/25 text-cyan-200 border-cyan-500/40 font-bold'
                      : 'bg-cyan-100 text-cyan-900 border-cyan-300 font-bold'
                    : isDark
                    ? 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
                }`}
                title={`الانتقال إلى مجلد ${folderName}/${sf}`}
              >
                <span>📂</span>
                <span>
                  {folderName}/{sf}
                </span>
                <span className="text-[9px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Files Pills inside Project */}
      <div
        className={`flex flex-wrap gap-1 pt-1.5 border-t ${
          isDark ? 'border-white/5' : 'border-cyan-200/70'
        }`}
        dir="ltr"
      >
        {displayedFiles.map((pf) => {
          const displayLabel =
            pf.subfolder && selectedSubfolder === 'all' ? `${pf.subfolder}/${pf.name}` : pf.name;

          return (
            <button
              key={pf.id}
              type="button"
              onClick={() => {
                onOpenFile(pf, 'split');
                onClose();
              }}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-mono transition ${
                isDark
                  ? 'bg-black/40 hover:bg-cyan-950/60 border-white/5 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300'
                  : 'bg-white hover:bg-cyan-50 border-slate-200 hover:border-cyan-300 text-slate-700 hover:text-cyan-800'
              }`}
              title={isArabic ? `فتح وتعديل ${pf.path || pf.name}` : `Edit ${pf.path || pf.name}`}
            >
              <span>
                {pf.type === 'python' || pf.name.endsWith('.py')
                  ? '🐍'
                  : pf.name.toLowerCase() === 'procfile'
                  ? '⚡'
                  : pf.name.toLowerCase() === 'requirements.txt'
                  ? '📦'
                  : pf.name.toLowerCase() === 'runtime.txt'
                  ? '⚙️'
                  : pf.type === 'html'
                  ? '🌐'
                  : pf.type === 'css'
                  ? '🎨'
                  : pf.type === 'javascript'
                  ? '⚡'
                  : pf.type === 'image'
                  ? '🖼️'
                  : pf.type === 'json'
                  ? '{ }'
                  : '📄'}
              </span>
              <span className="truncate max-w-[150px]">{displayLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const StudioDrawer: React.FC<StudioDrawerProps> = ({
  isOpen,
  onClose,
  files,
  onOpenFile,
  onDeleteFile,
  onDeleteFolder,
  onUploadClick,
  onSaveFilesBatch,
  isArabic,
  setIsArabic,
  responseMode = 'coding',
  systemPrompt = '',
  onOpenSettings,
  onOpenTerminalSandbox,
  onOpenAdminDashboard,
  sessions = [],
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onNewSession,
  onOpenAgentView,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'chats' | 'files'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const drawerUploadInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const modeLabels: Record<SudaResponseMode, string> = {
    coding: isArabic ? '💻 صياغة برمجية' : '💻 Coding',
    romantic: isArabic ? '🌹 صياغة رومانسية' : '🌹 Romantic',
    hacker: isArabic ? '🕶️ صياغة هاكر' : '🕶️ Hacker',
    cybersecurity: isArabic ? '🛡️ أمن سيبراني' : '🛡️ CyberSec',
    custom: isArabic ? '✨ صياغة مخصصة' : '✨ Custom',
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDrawerFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const toSaveBatch: TelegramStorageFile[] = [];
    let zipCount = 0;
    let pyCount = 0;
    let lastProjectName = '';

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const isZip = f.name.toLowerCase().endsWith('.zip') || f.type.includes('zip');
      if (isZip) {
        zipCount++;
        const zipRes = await extractZipToStorageFiles(f, isArabic);
        if (zipRes.files && zipRes.files.length > 0) {
          toSaveBatch.push(...zipRes.files);
          lastProjectName = zipRes.folderName;
          if (zipRes.isPythonProject) pyCount++;
        }
      } else {
        let content = '';
        try {
          content = await f.text();
        } catch {
          content = `// ${f.name}`;
        }
        const { type, category } = detectFileTypeAndCategory(f.name);
        toSaveBatch.push({
          id: `tg-up-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: f.name,
          type,
          category,
          sizeBytes: f.size,
          content,
          createdAt: new Date().toISOString(),
          createdBy: 'user',
          description: isArabic ? `تم رفعه يدوياً: ${f.name}` : `Uploaded manually: ${f.name}`,
          telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
        });
      }
    }

    if (toSaveBatch.length > 0 && onSaveFilesBatch) {
      onSaveFilesBatch(toSaveBatch);
    }

    if (pyCount > 0) {
      showToast(
        isArabic
          ? `🐍 تم فك ضغط وحفظ مشروع بايثون [${lastProjectName}] واكتشاف الإعدادات (requirements.txt, runtime.txt, Procfile)`
          : `🐍 Unzipped and saved Python project [${lastProjectName}] with requirements.txt, runtime.txt, Procfile`,
        'success',
        6000
      );
    } else if (zipCount > 0) {
      showToast(
        isArabic
          ? `📦 تم فك ضغط وحفظ المشروع [${lastProjectName}] في السحابة بنجاح`
          : `📦 Project [${lastProjectName}] unzipped and saved`,
        'success'
      );
    } else if (toSaveBatch.length > 0) {
      showToast(
        isArabic ? '✅ تم حفظ الملفات في مساحة SudaStack' : '✅ Files saved to SudaStack',
        'success'
      );
    }

    setActiveTab('files');
    if (drawerUploadInputRef.current) {
      drawerUploadInputRef.current.value = '';
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex ${!isArabic ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Slide-out Drawer */}
      <aside
        className={`relative w-[88vw] max-w-md h-full transition-colors duration-200 ${
          isDark ? 'bg-[#121318] text-slate-100' : 'bg-white text-slate-900'
        } ${
          !isArabic ? 'border-l' : 'border-r'
        } ${isDark ? 'border-white/10' : 'border-slate-200'} flex flex-col shadow-2xl z-10 animate-in ${
          !isArabic ? 'slide-in-from-right' : 'slide-in-from-left'
        } duration-200`}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* Drawer Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-white/10 bg-[#0e0f12]' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-400/40 text-cyan-500 flex items-center justify-center font-bold shadow-xs">
              ⚡
            </div>
            <div>
              <h2 className={`text-sm font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {isArabic ? 'منصة SudaStack السحابية' : 'SudaStack Cloud Studio'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isArabic ? 'المحادثات السابقة وإدارة الملفات' : 'Previous Chats & Storage'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Model & Response Style + System Prompt Section */}
        <div
          className={`p-3 border-b space-y-2 ${
            isDark ? 'border-white/10 bg-[#14151c]' : 'border-slate-200 bg-slate-50/70'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Cpu className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
              <code
                dir="ltr"
                className={`px-2 py-0.5 rounded border font-mono text-[11px] font-bold shrink-0 ${
                  isDark
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'bg-cyan-50 border-cyan-300 text-cyan-800'
                }`}
              >
                SudaMode V1.0
              </code>
              <span className={`text-[11px] font-semibold truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                {modeLabels[responseMode] || modeLabels.coding}
              </span>
            </div>

            {onOpenSettings && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[11px] transition shrink-0 shadow-2xs"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>{isArabic ? 'تعديل الـ Prompt' : 'Edit Prompt'}</span>
              </button>
            )}
          </div>

          {systemPrompt && (
            <div
              onClick={() => {
                if (onOpenSettings) {
                  onClose();
                  onOpenSettings();
                }
              }}
              className={`p-2 rounded-lg border cursor-pointer transition text-[11px] line-clamp-2 leading-relaxed ${
                isDark
                  ? 'bg-black/40 border-white/5 hover:border-cyan-500/30 text-slate-300'
                  : 'bg-white border-slate-200 hover:border-cyan-400 text-slate-600'
              }`}
              title={isArabic ? 'انقر لعرض وتعديل الـ System Prompt' : 'Click to view and edit System Prompt'}
            >
              <span className={`font-mono font-bold ml-1 ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                System Prompt:
              </span>
              {systemPrompt}
            </div>
          )}
        </div>



        {onOpenTerminalSandbox && (
          <div className="p-2.5 px-3 border-b dark:border-white/10 border-slate-200">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTerminalSandbox();
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition active:scale-98 ${
                isDark
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300 shadow-xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span>{isArabic ? 'ساندبوكس بايثون ومشغل الطرفية' : 'Python Sandbox & Terminal CLI'}</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-md font-mono text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                CLI
              </span>
            </button>
          </div>
        )}

        {onOpenAdminDashboard && (
          <div className="p-2.5 px-3 border-b dark:border-white/10 border-slate-200">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAdminDashboard();
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition active:scale-98 ${
                isDark
                  ? 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-300 shadow-xs'
                  : 'bg-cyan-50 hover:bg-cyan-100 border-cyan-300 text-cyan-800 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-cyan-400" />
                <span>{isArabic ? 'لوحة تحكم المنصة وسحابة Sudafile' : 'Platform Admin Dashboard & Sudafile'}</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-md font-mono text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                ADMIN
              </span>
            </button>
          </div>
        )}

        {/* Main Tab Switcher: Previous Chats vs Cloud Files */}
        <div
          className={`p-2.5 border-b flex items-center gap-2 ${
            isDark ? 'border-white/10 bg-[#0e0f12]' : 'border-slate-200 bg-slate-100/70'
          }`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('chats')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'chats'
                ? isDark
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-xs'
                  : 'bg-white border border-cyan-300 text-cyan-800 shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isArabic ? `المحادثات السابقة (${sessions.length})` : `Chats (${sessions.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'files'
                ? isDark
                  ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 shadow-xs'
                  : 'bg-white border border-cyan-300 text-cyan-800 shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>{isArabic ? `الملفات والمنصات (${files.length})` : `Files (${files.length})`}</span>
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div
          className={`p-3 border-b flex items-center gap-2 ${
            isDark ? 'border-white/5' : 'border-slate-200'
          }`}
        >
          <div className="relative flex-1">
            <Search
              className={`w-3.5 h-3.5 text-slate-400 absolute ${
                isArabic ? 'right-2.5' : 'left-2.5'
              } top-1/2 -translate-y-1/2`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'chats'
                  ? isArabic
                    ? 'البحث في المحادثات السابقة...'
                    : 'Search past chats...'
                  : isArabic
                  ? 'البحث في المنصات والملفات...'
                  : 'Search files...'
              }
              dir={isArabic ? 'rtl' : 'ltr'}
              className={`w-full border rounded-lg ${
                isArabic ? 'pr-8 pl-2.5 text-right' : 'pl-8 pr-2.5 text-left'
              } py-1.5 text-xs focus:outline-none focus:border-cyan-500/50 ${
                isDark
                  ? 'bg-[#181920] border-white/10 text-slate-100 placeholder:text-slate-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
              }`}
            />
          </div>

          {activeTab === 'chats' ? (
            <button
              onClick={() => {
                if (onNewSession) onNewSession();
                onClose();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 font-bold text-xs transition flex items-center gap-1 shrink-0"
              title={isArabic ? 'بدء محادثة جديدة' : 'Start New Chat'}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isArabic ? 'جديدة' : 'New'}</span>
            </button>
          ) : (
            <>
              <input
                ref={drawerUploadInputRef}
                type="file"
                multiple
                accept=".zip,.py,.html,.css,.js,.jsx,.ts,.tsx,.json,.txt,image/*"
                onChange={handleDrawerFileInputChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => {
                  if (drawerUploadInputRef.current) {
                    drawerUploadInputRef.current.click();
                  } else if (onUploadClick) {
                    onUploadClick();
                  }
                }}
                className="p-1.5 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 transition flex items-center justify-center shrink-0 shadow-xs active:scale-95"
                title={isArabic ? 'رفع ملف أو مشروع مضغوط ZIP إلى مساحة سوداستاك' : 'Upload file or ZIP project'}
              >
                <Plus className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {activeTab === 'chats' ? (
            /* PREVIOUS CONVERSATIONS LIST */
            filteredSessions.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500">
                {isArabic
                  ? 'لا توجد محادثات سابقة. ابدأ محادثة جديدة الآن!'
                  : 'No past conversations found. Start a new one!'}
              </div>
            ) : (
              filteredSessions.map((sess) => {
                const isCurrent = sess.id === currentSessionId;
                return (
                  <div
                    key={sess.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between group ${
                      isCurrent
                        ? isDark
                          ? 'bg-cyan-500/15 border-cyan-500/40 shadow-xs text-cyan-200'
                          : 'bg-cyan-50 border-cyan-300 shadow-xs text-cyan-900'
                        : isDark
                        ? 'bg-[#181920] border-white/5 hover:border-cyan-500/30 text-slate-200'
                        : 'bg-slate-50 border-slate-200 hover:border-cyan-300 text-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectSession) onSelectSession(sess.id);
                        onClose();
                      }}
                      className="flex items-start gap-2.5 min-w-0 flex-1 text-right"
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isCurrent
                            ? isDark
                              ? 'bg-cyan-500/25 text-cyan-300'
                              : 'bg-cyan-100 text-cyan-700'
                            : isDark
                            ? 'bg-white/5 text-slate-400'
                            : 'bg-slate-200/70 text-slate-500'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-xs font-bold truncate ${
                            isDark
                              ? 'text-white group-hover:text-cyan-300'
                              : 'text-slate-900 group-hover:text-cyan-700'
                          }`}
                        >
                          {sess.title}
                        </div>
                        <div className={`text-[10px] font-mono mt-0.5 flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {sess.formattedTime}
                          </span>
                          {isCurrent && (
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-sans font-bold ${
                                isDark ? 'bg-cyan-400/20 text-cyan-300' : 'bg-cyan-100 text-cyan-800'
                              }`}
                            >
                              {isArabic ? 'المحادثة الحالية' : 'Current'}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {onDeleteSession && (
                      <button
                        type="button"
                        onClick={() => onDeleteSession(sess.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 opacity-70 group-hover:opacity-100 transition shrink-0 ml-1"
                        title={isArabic ? 'حذف المحادثة' : 'Delete Chat'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })
            )
          ) : (
            /* CLOUD FILES LIST */
            filteredFiles.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500">
                {isArabic ? 'لم يتم العثور على منصات أو ملفات.' : 'No files found.'}
              </div>
            ) : (
              (() => {
                const sandboxFoldersMap: Record<string, TelegramStorageFile[]> = {};
                const updatedFoldersMap: Record<string, TelegramStorageFile[]> = {};
                const standaloneFiles: TelegramStorageFile[] = [];

                filteredFiles.forEach((file) => {
                  if (file.folder) {
                    if (file.folder.startsWith('Sandbox/') || file.folder.toLowerCase().includes('sandbox')) {
                      if (!sandboxFoldersMap[file.folder]) {
                        sandboxFoldersMap[file.folder] = [];
                      }
                      sandboxFoldersMap[file.folder].push(file);
                    } else {
                      if (!updatedFoldersMap[file.folder]) {
                        updatedFoldersMap[file.folder] = [];
                      }
                      updatedFoldersMap[file.folder].push(file);
                    }
                  } else {
                    standaloneFiles.push(file);
                  }
                });

                const sandboxEntries = Object.entries(sandboxFoldersMap);
                const updatedEntries = Object.entries(updatedFoldersMap);

                return (
                  <div className="space-y-4">
                    {/* Sandbox Projects Section */}
                    {sandboxEntries.length > 0 && (
                      <div className="space-y-2">
                        <div className={`flex items-center justify-between px-1 text-[11px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          <span className="flex items-center gap-1.5">
                            <Folder className="w-3.5 h-3.5" />
                            {isArabic ? 'مجلدات وملفات الـ Sandbox (Sandbox)' : 'Sandbox Storage'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {sandboxEntries.length} {isArabic ? 'مجلد' : 'folders'}
                          </span>
                        </div>

                        {sandboxEntries.map(([folderName, pFiles]) => (
                          <ProjectFolderCard
                            key={folderName}
                            folderName={folderName}
                            files={pFiles}
                            isDark={isDark}
                            isArabic={isArabic}
                            onOpenFile={onOpenFile}
                            onClose={onClose}
                            onDeleteFolder={onDeleteFolder}
                            onOpenTerminalSandbox={onOpenTerminalSandbox}
                          />
                        ))}
                      </div>
                    )}

                    {/* Updated Files & Projects Section */}
                    {updatedEntries.length > 0 && (
                      <div className="space-y-2">
                        <div className={`flex items-center justify-between px-1 text-[11px] font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                          <span className="flex items-center gap-1.5">
                            <FolderOpen className="w-3.5 h-3.5" />
                            {isArabic ? 'مجلدات الملفات المحدثة (Updated Files)' : 'Updated Files & Projects'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {updatedEntries.length} {isArabic ? 'مجلد' : 'folders'}
                          </span>
                        </div>

                        {updatedEntries.map(([folderName, pFiles]) => (
                          <ProjectFolderCard
                            key={folderName}
                            folderName={folderName}
                            files={pFiles}
                            isDark={isDark}
                            isArabic={isArabic}
                            onOpenFile={onOpenFile}
                            onClose={onClose}
                            onDeleteFolder={onDeleteFolder}
                            onOpenTerminalSandbox={onOpenTerminalSandbox}
                          />
                        ))}
                      </div>
                    )}

                    {/* Standalone Files Section */}
                    {standaloneFiles.length > 0 && (
                      <div className="space-y-1.5">
                        {(sandboxEntries.length > 0 || updatedEntries.length > 0) && (
                          <div className="text-[11px] font-bold text-slate-400 px-1 pt-2">
                            {isArabic ? 'الملفات المستقلة (Individual Files)' : 'Individual Files'}
                          </div>
                        )}

                        {standaloneFiles.map((file) => {
                          const isImage =
                            file.type === 'image' ||
                            /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i.test(file.name);
                          const imageSrc =
                            typeof file.content === 'string' &&
                            (file.content.startsWith('data:image/') || file.content.startsWith('http'))
                              ? file.content
                              : file.name.endsWith('.svg') || file.content?.trim().startsWith('<svg')
                              ? `data:image/svg+xml;utf8,${encodeURIComponent(file.content)}`
                              : file.content;

                          return (
                            <div
                              key={file.id}
                              className={`p-2.5 rounded-xl border transition flex items-center justify-between group ${
                                isDark
                                  ? 'bg-[#181920] border-white/5 hover:border-white/15'
                                  : 'bg-slate-50 border-slate-200 hover:border-cyan-300'
                              }`}
                            >
                              <div
                                onClick={() => {
                                  onOpenFile(file);
                                  onClose();
                                }}
                                className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                              >
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs shrink-0 overflow-hidden border ${
                                    isDark
                                      ? 'bg-white/5 text-cyan-400 border-white/10'
                                      : 'bg-white text-cyan-600 border-slate-200'
                                  }`}
                                >
                                  {isImage ? (
                                    <img
                                      src={imageSrc}
                                      alt={file.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : file.type === 'html' ? (
                                    '🌐'
                                  ) : file.type === 'css' ? (
                                    '🎨'
                                  ) : file.type === 'javascript' ? (
                                    '⚡'
                                  ) : file.type === 'python' ? (
                                    '🐍'
                                  ) : (
                                    '📄'
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div
                                    className={`text-xs font-mono font-medium truncate flex items-center gap-1.5 ${
                                      isDark
                                        ? 'text-slate-200 group-hover:text-white'
                                        : 'text-slate-800 group-hover:text-cyan-800'
                                    }`}
                                    dir="ltr"
                                  >
                                    <span className="truncate">{file.name}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate">
                                    {formatSize(file.sizeBytes)} •{' '}
                                    {isImage ? (isArabic ? 'صورة' : 'Image') : 'SudaStack Cloud'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => {
                                    onOpenFile(file);
                                    onClose();
                                  }}
                                  className={`p-1.5 rounded-md transition ${
                                    isDark
                                      ? 'hover:bg-white/10 text-slate-400 hover:text-white'
                                      : 'hover:bg-slate-200 text-slate-500 hover:text-slate-900'
                                  }`}
                                  title={
                                    isImage
                                      ? isArabic
                                        ? 'عرض الصورة'
                                        : 'View Image'
                                      : isArabic
                                      ? 'معاينة وتشغيل'
                                      : 'Live Preview'
                                  }
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => onDeleteFile(file.id)}
                                  className="p-1.5 rounded-md hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition"
                                  title={isArabic ? 'حذف' : 'Delete'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()
            )
          )}
        </div>

        {/* Drawer Footer */}
        <div className={`p-3 border-t flex items-center justify-between text-xs transition-colors duration-200 ${
          isDark ? 'border-white/10 bg-[#0e0f12] text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px]">{isArabic ? 'سوداستاك: نشط' : 'SudaStack Cloud: Active'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition font-medium text-[11px] border ${
                isDark
                  ? 'bg-white/10 hover:bg-amber-400/20 text-slate-200 hover:text-amber-300 border-white/10'
                  : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 border-slate-200 shadow-xs'
              }`}
              title={isDark ? (isArabic ? 'الوضع النهاري' : 'Light Mode') : (isArabic ? 'الوضع الليلي' : 'Dark Mode')}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isArabic ? 'نهاري' : 'Light'}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-700" />
                  <span>{isArabic ? 'ليلي' : 'Dark'}</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsArabic(!isArabic)}
              className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] ${
                isDark ? 'bg-white/10 hover:bg-white/20 text-slate-200' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
              }`}
            >
              {isArabic ? 'English' : 'العربية'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
