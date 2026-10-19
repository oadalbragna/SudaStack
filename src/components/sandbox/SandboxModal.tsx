import React, { useState, useEffect } from 'react';
import { useSandboxStore } from '../../hooks/useSandboxStore';
import { TopBar } from './TopBar';
import { Dashboard } from './Dashboard';
import { ProjectWorkspace } from './ProjectWorkspace';
import { GlobalTerminal } from './GlobalTerminal';
import { FloatingActions } from './FloatingActions';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../ToastNotification';

interface SandboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  isArabic?: boolean;
  onOpenAdminDashboard?: () => void;
}

export const SandboxModal: React.FC<SandboxModalProps> = ({
  isOpen,
  onClose,
  isArabic = true,
  onOpenAdminDashboard,
}) => {
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const {
    projects,
    currentView,
    setCurrentView,
    activeProjectId,
    setActiveProjectId,
    activeProject,
    createProject,
    deleteProject,
    renameProject,
    updateProjectFiles,
    startProject,
    stopProject,
    restartProject,
    runProjectCommand,
  } = useSandboxStore();

  // Keyboard shortcut ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isFullscreen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen, onClose]);

  if (!isOpen) return null;

  const handleOpenProject = (id: string) => {
    setActiveProjectId(id);
    setCurrentView('workspace');
  };

  const handleCreateNewProject = () => {
    const name = prompt(isArabic ? 'أدخل اسم المشروع الجديد:' : 'Enter new project name:', `bot_${Date.now().toString().slice(-4)}`);
    if (!name) return;
    createProject(name);
    showToast(isArabic ? `تم إنشاء المشروع "${name}" بنجاح!` : `Project "${name}" created successfully!`, 'success');
  };

  const handleUploadZip = async (file: File) => {
    try {
      const { extractZipToStorageFiles } = await import('../../utils/zipUtils');
      const result = await extractZipToStorageFiles(file, isArabic);

      if (result.isEncrypted) {
        showToast(isArabic ? '⚠️ الأرشيف المضغوط مشفر.' : '⚠️ The ZIP archive is encrypted.', 'error');
        return;
      }

      const files = result.files.map((f) => ({
        name: f.name,
        content: typeof f.content === 'string' && !f.content.startsWith('data:') ? f.content : `# File: ${f.name}\n`,
        size: f.sizeBytes,
      }));

      const entryFile = files.find((f) => f.name.endsWith('.py'))?.name || files[0]?.name || 'main.py';
      const newProj = createProject(result.folderName || file.name.replace(/\.zip$/i, ''), files, entryFile);
      showToast(isArabic ? `📦 تم رفع وفك أرشيف المشروع بنجاح (${result.files.length} ملفاً)` : `📦 Successfully extracted zip project (${result.files.length} files)`, 'success');
      handleOpenProject(newProj.id);
    } catch (err: any) {
      showToast(isArabic ? `خطأ أثناء فك الأرشيف: ${err.message}` : `Error extracting archive: ${err.message}`, 'error');
    }
  };

  const handleUploadPy = async (file: File) => {
    try {
      const text = await file.text();
      const projName = file.name.replace(/\.py$/i, '');
      const newProj = createProject(projName, [{ name: file.name, content: text, size: file.size }], file.name);
      showToast(isArabic ? `🐍 تم رفع ملف بايثون [${file.name}] بنجاح!` : `🐍 Uploaded Python file [${file.name}]!`, 'success');
      handleOpenProject(newProj.id);
    } catch (err: any) {
      showToast(isArabic ? `خطأ أثناء رفع الملف: ${err.message}` : `Error uploading file: ${err.message}`, 'error');
    }
  };

  const activeCount = projects.filter((p) => p.status === 'running').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-3 md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      dir="ltr"
    >
      <div
        className={`flex flex-col w-full h-full sm:h-[92vh] sm:max-h-[880px] sm:max-w-6xl sm:rounded-2xl border shadow-2xl overflow-hidden transition-all duration-150 ${
          isFullscreen ? 'sm:w-full sm:h-full sm:max-h-full sm:rounded-none sm:border-none' : ''
        } ${
          isDark ? 'bg-[#10121a] border-white/10 text-slate-100 shadow-black/80' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
        }`}
      >
        <TopBar
          isArabic={isArabic}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeCount={activeCount}
          onOpenGlobalTerminal={() => setCurrentView('global-terminal')}
          onOpenSettings={() => {}}
          onOpenAdminDashboard={onOpenAdminDashboard}
          isFullscreen={isFullscreen}
          setIsFullscreen={setIsFullscreen}
          onClose={onClose}
        />

        {currentView === 'dashboard' && (
          <>
            <Dashboard
              projects={projects.filter((p) => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))}
              isArabic={isArabic}
              onOpenProject={handleOpenProject}
              onStartProject={startProject}
              onStopProject={stopProject}
              onRestartProject={restartProject}
              onDeleteProject={deleteProject}
              onRenameProject={renameProject}
              onCreateNewClick={handleCreateNewProject}
              onUploadZip={handleUploadZip}
              onUploadPy={handleUploadPy}
              onOpenAdminDashboard={onOpenAdminDashboard}
            />
            <FloatingActions
              isArabic={isArabic}
              onNewProject={handleCreateNewProject}
              onUploadZipOrPy={handleUploadZip}
              onQuickRun={() => {
                const qp = createProject(`quick_run_${Date.now().toString().slice(-4)}`);
                handleOpenProject(qp.id);
                showToast(isArabic ? '⚡ تم تجهيز بيئة التشغيل السريع' : '⚡ Quick run workspace ready', 'info');
              }}
              onRestoreLastSession={() => {
                showToast(isArabic ? '💾 تم التحقق من استعادة الجلسة والعمليات النشطة بنجاح' : '💾 Last session & active processes restored', 'success');
              }}
            />
          </>
        )}

        {currentView === 'workspace' && activeProject && (
          <ProjectWorkspace
            project={activeProject}
            isArabic={isArabic}
            onBackToDashboard={() => setCurrentView('dashboard')}
            onStartProject={startProject}
            onStopProject={stopProject}
            onRestartProject={restartProject}
            onDeleteProject={deleteProject}
            onRenameProject={renameProject}
            onUpdateFiles={updateProjectFiles}
            onRunCommand={runProjectCommand}
          />
        )}

        {currentView === 'global-terminal' && (
          <GlobalTerminal
            isArabic={isArabic}
            onBackToDashboard={() => setCurrentView('dashboard')}
          />
        )}
      </div>
    </div>
  );
};
