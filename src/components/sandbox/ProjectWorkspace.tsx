import React, { useState } from 'react';
import {
  ArrowLeft,
  Play,
  Square,
  RotateCcw,
  MoreVertical,
  Trash2,
  Download,
  Info,
  Terminal,
  Activity,
  Edit3,
  FileCode,
  Folder,
  Columns,
} from 'lucide-react';
import { SandboxProject } from '../../hooks/useSandboxStore';
import { FileTree } from './FileTree';
import { CodeEditor } from './CodeEditor';
import { LiveTerminal } from './LiveTerminal';
import { LogsViewer } from './LogsViewer';
import { useTheme } from '../../context/ThemeContext';

interface ProjectWorkspaceProps {
  project: SandboxProject;
  isArabic: boolean;
  onBackToDashboard: () => void;
  onStartProject: (id: string) => void;
  onStopProject: (id: string) => void;
  onRestartProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject?: (id: string, newName: string) => void;
  onUpdateFiles: (id: string, files: any[]) => void;
  onRunCommand: (id: string, cmd: string, stdin?: string) => void;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  project,
  isArabic,
  onBackToDashboard,
  onStartProject,
  onStopProject,
  onRestartProject,
  onDeleteProject,
  onRenameProject,
  onUpdateFiles,
  onRunCommand,
}) => {
  const { isDark } = useTheme();
  const [activeFileName, setActiveFileName] = useState<string>(
    project.entry_file || project.files[0]?.name || 'main.py'
  );

  // Active view tab: 'files' | 'editor' | 'terminal' | 'logs'
  const [activeTab, setActiveTab] = useState<'files' | 'editor' | 'terminal' | 'logs'>('editor');

  // Desktop layout mode: split (all-in-one columns) or focused (tabbed full width)
  const [isDesktopSplit, setIsDesktopSplit] = useState<boolean>(true);

  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameVal, setNameVal] = useState<string>(project.name);

  const activeFile =
    project.files.find((f) => f.name === activeFileName) ||
    project.files[0] || { name: 'main.py', content: '' };
  const isRunning = project.status === 'running' || project.status === 'restarting';

  // 1. When clicking on a project file: immediately switch to code editor tab!
  const handleSelectFile = (name: string) => {
    setActiveFileName(name);
    setActiveTab('editor');
  };

  const handleCodeChange = (newContent: string) => {
    const updated = project.files.map((f) =>
      f.name === activeFileName ? { ...f, content: newContent, size: newContent.length } : f
    );
    onUpdateFiles(project.id, updated);
  };

  const handleSaveCode = () => {
    // Already synced in store
  };

  const handleCreateFile = (name: string) => {
    if (project.files.some((f) => f.name === name)) return;
    const newFiles = [...project.files, { name, content: `# File: ${name}\n`, size: 15 }];
    onUpdateFiles(project.id, newFiles);
    setActiveFileName(name);
    setActiveTab('editor');
  };

  // 2. When clicking Run: execute script and immediately switch to live terminal!
  const handleRunActiveScript = () => {
    onRunCommand(project.id, `python3 ${activeFileName}`);
    setActiveTab('terminal');
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameVal.trim() && onRenameProject) {
      onRenameProject(project.id, nameVal.trim());
    }
    setIsEditingName(false);
  };

  const handleExportZip = async () => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      project.files.forEach((f) => zip.file(f.name, f.content));
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Export error: ${e.message}`);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden" dir="ltr">
      {/* ================= COMPACT SLIM PROJECT BAR ================= */}
      <div
        className={`px-3 py-2 border-b flex items-center justify-between gap-2 shrink-0 ${
          isDark ? 'bg-[#141624] border-white/10' : 'bg-slate-100 border-slate-200'
        }`}
      >
        {/* Left: Back button + Name + Status */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBackToDashboard}
            className={`p-1.5 rounded-lg border transition ${
              isDark
                ? 'border-white/10 hover:bg-white/10 text-slate-300'
                : 'border-slate-200 hover:bg-white text-slate-700'
            }`}
            title={isArabic ? 'العودة للوحة التحكم' : 'Back to Dashboard'}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            {isEditingName ? (
              <form onSubmit={handleRenameSubmit} className="flex items-center gap-1">
                <input
                  type="text"
                  value={nameVal}
                  onChange={(e) => setNameVal(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  autoFocus
                  className="px-2 py-0.5 rounded text-xs font-mono bg-black/50 border border-cyan-500 text-white focus:outline-hidden"
                />
              </form>
            ) : (
              <div
                onClick={() => {
                  setNameVal(project.name);
                  setIsEditingName(true);
                }}
                className="flex items-center gap-1 cursor-pointer group"
                title={isArabic ? 'انقر لتعديل اسم المشروع' : 'Click to rename project'}
              >
                <h2 className="font-bold text-xs sm:text-sm font-mono truncate text-cyan-300 group-hover:underline">
                  {project.name}
                </h2>
                <Edit3 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition" />
              </div>
            )}

            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span>⏱ {project.uptime}</span>
              <span>•</span>
              <span>💾 {project.memory}</span>
            </div>
          </div>

          <span
            className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              isRunning
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35'
                : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
            }`}
          >
            {isRunning ? (isArabic ? '🟢 يعمل' : '🟢 Running') : (isArabic ? '🔴 متوقف' : '🔴 Stopped')}
          </span>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Desktop Layout Split Toggle */}
          <button
            type="button"
            onClick={() => setIsDesktopSplit(!isDesktopSplit)}
            className={`hidden md:flex p-1.5 rounded-lg border transition ${
              isDesktopSplit
                ? isDark
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-cyan-50 border-cyan-300 text-cyan-700'
                : isDark
                ? 'border-white/10 hover:bg-white/10 text-slate-400'
                : 'border-slate-200 hover:bg-slate-200 text-slate-600'
            }`}
            title={isDesktopSplit ? (isArabic ? 'عرض كامل للشاشة' : 'Full Screen View') : (isArabic ? 'عرض مقسّم (Split View)' : 'Split Columns View')}
          >
            <Columns className="w-3.5 h-3.5" />
          </button>

          {/* Dynamic Run / Stop Button */}
          {isRunning ? (
            <button
              type="button"
              onClick={() => onStopProject(project.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition active:scale-95 shadow-xs"
              title={isArabic ? 'إيقاف المشروع' : 'Stop Project'}
            >
              <Square className="w-3 h-3 fill-white" />
              <span className="hidden xs:inline">{isArabic ? 'إيقاف' : 'Stop'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onStartProject(project.id);
                setActiveTab('terminal');
              }}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition active:scale-95 shadow-xs"
              title={isArabic ? 'تشغيل المشروع في الخلفية' : 'Start Project'}
            >
              <Play className="w-3 h-3 fill-white" />
              <span className="hidden xs:inline">{isArabic ? 'تشغيل' : 'Start'}</span>
            </button>
          )}

          {/* Restart Button */}
          <button
            type="button"
            onClick={() => {
              onRestartProject(project.id);
              setActiveTab('terminal');
            }}
            className="p-1.5 rounded-lg border border-amber-500/30 bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 transition"
            title={isArabic ? 'إعادة تشغيل المشروع' : 'Restart Project'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* More Menu (⋮ Details, Export, Delete) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-slate-300 transition"
              title={isArabic ? 'خيارات إضافية' : 'More Options'}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <div
                className={`absolute right-0 top-full mt-1 w-44 rounded-xl border p-1 z-50 shadow-2xl text-xs animate-in fade-in duration-100 ${
                  isDark ? 'bg-[#1a1c28] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    alert(
                      `ID: ${project.id}\nCreated: ${project.createdAt}\nFiles: ${project.files.length}\nEntry: ${project.entry_file}`
                    );
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 text-left transition"
                >
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{isArabic ? 'تفاصيل المشروع' : 'Project Details'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExportZip();
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/10 text-left transition"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isArabic ? 'تصدير كـ .zip' : 'Export as .zip'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onDeleteProject(project.id);
                  }}
                  className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 text-left transition"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>{isArabic ? 'حذف المشروع' : 'Delete Project'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= DEDICATED MOBILE & RESPONSIVE TAB BAR ================= */}
      {/* On mobile: this controls the view exclusively. On desktop: switches tab if not split */}
      <div
        className={`px-2 py-1 border-b flex items-center justify-between overflow-x-auto gap-1 text-xs shrink-0 select-none ${
          isDark ? 'bg-black/30 border-white/10' : 'bg-slate-200/70 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-1 w-full justify-between sm:justify-start">
          {/* 1. Files Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition active:scale-95 text-xs ${
              activeTab === 'files'
                ? isDark
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-purple-600 text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-black hover:bg-slate-300/60'
            }`}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>{isArabic ? 'الملفات' : 'Files'}</span>
            <span className="px-1 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
              {project.files.length}
            </span>
          </button>

          {/* 2. Code Editor Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition active:scale-95 text-xs ${
              activeTab === 'editor'
                ? isDark
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-600 text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-black hover:bg-slate-300/60'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span className="truncate max-w-[120px]">{activeFileName}</span>
          </button>

          {/* 3. Live Terminal Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition active:scale-95 text-xs ${
              activeTab === 'terminal'
                ? isDark
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-cyan-600 text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-black hover:bg-slate-300/60'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{isArabic ? 'الطرفية' : 'Terminal'}</span>
          </button>

          {/* 4. Logs Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition active:scale-95 text-xs ${
              activeTab === 'logs'
                ? isDark
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-600 text-white shadow-sm'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-black hover:bg-slate-300/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{isArabic ? 'السجلات' : 'Logs'}</span>
          </button>
        </div>
      </div>

      {/* ================= WORKSPACE CONTENT STAGE ================= */}
      {/* On Mobile: Always display ONLY the selected active tab full width and height */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* MOBILE VIEW (< md) or DESKTOP FOCUSED MODE (!isDesktopSplit) */}
        <div className={`flex-1 min-h-0 flex flex-col ${isDesktopSplit ? 'md:hidden' : ''}`}>
          {activeTab === 'files' && (
            <FileTree
              files={project.files}
              activeFileName={activeFileName}
              onSelectFile={handleSelectFile}
              onCreateFile={handleCreateFile}
              isArabic={isArabic}
              className="w-full h-full border-r-0"
            />
          )}

          {activeTab === 'editor' && (
            <CodeEditor
              fileName={activeFile.name}
              code={activeFile.content}
              onChangeCode={handleCodeChange}
              onRunCode={handleRunActiveScript}
              onSaveCode={handleSaveCode}
              isArabic={isArabic}
              isRunning={isRunning}
            />
          )}

          {activeTab === 'terminal' && (
            <LiveTerminal
              terminalHistory={project.terminalHistory}
              onRunCommand={(cmd, stdin) => onRunCommand(project.id, cmd, stdin)}
              isArabic={isArabic}
              projectName={project.name}
              files={project.files}
              entryFile={project.entry_file}
              cwd={project.cwd}
            />
          )}

          {activeTab === 'logs' && (
            <LogsViewer logs={project.logs} isArabic={isArabic} />
          )}
        </div>

        {/* DESKTOP SPLIT MODE (>= md when isDesktopSplit is true) */}
        {isDesktopSplit && (
          <div className="hidden md:flex flex-1 min-h-0 overflow-hidden">
            {/* Left: File Tree */}
            <FileTree
              files={project.files}
              activeFileName={activeFileName}
              onSelectFile={handleSelectFile}
              onCreateFile={handleCreateFile}
              isArabic={isArabic}
              className="w-60 border-r"
            />

            {/* Middle: Code Editor */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <CodeEditor
                fileName={activeFile.name}
                code={activeFile.content}
                onChangeCode={handleCodeChange}
                onRunCode={handleRunActiveScript}
                onSaveCode={handleSaveCode}
                isArabic={isArabic}
                isRunning={isRunning}
              />
            </div>

            {/* Right: Live Terminal or Logs Viewer */}
            <div className="w-96 flex flex-col border-l border-white/10 overflow-hidden">
              {activeTab === 'logs' ? (
                <LogsViewer logs={project.logs} isArabic={isArabic} />
              ) : (
                <LiveTerminal
                  terminalHistory={project.terminalHistory}
                  onRunCommand={(cmd, stdin) => onRunCommand(project.id, cmd, stdin)}
                  isArabic={isArabic}
                  projectName={project.name}
                  files={project.files}
                  entryFile={project.entry_file}
                  cwd={project.cwd}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
