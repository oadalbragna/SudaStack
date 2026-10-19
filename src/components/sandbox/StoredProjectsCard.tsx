import React from 'react';
import { FolderGit2, Play, Square, Eye, Trash2, Plus } from 'lucide-react';
import { SandboxProject } from '../../hooks/useSandboxStore';
import { useTheme } from '../../context/ThemeContext';

interface StoredProjectsCardProps {
  projects: SandboxProject[];
  isArabic: boolean;
  onOpenProject: (id: string) => void;
  onStartProject: (id: string) => void;
  onStopProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onCreateNewClick: () => void;
}

export const StoredProjectsCard: React.FC<StoredProjectsCardProps> = ({
  projects,
  isArabic,
  onOpenProject,
  onStartProject,
  onStopProject,
  onDeleteProject,
  onCreateNewClick,
}) => {
  const { isDark } = useTheme();

  return (
    <div
      className={`border rounded-2xl p-4 shadow-xl flex flex-col gap-3 transition-colors ${
        isDark ? 'bg-[#141624] border-white/10' : 'bg-white border-slate-200'
      }`}
      dir="ltr"
    >
      <div className="flex items-center justify-between border-b pb-2.5 border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
            <FolderGit2 className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm">
            {isArabic ? 'المشاريع المحفوظة (Stored Projects)' : 'Stored Projects'}
          </h3>
        </div>
        <button
          type="button"
          onClick={onCreateNewClick}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition active:scale-95 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isArabic ? 'مشروع جديد' : 'New Project'}</span>
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
          <p className="text-xs text-slate-400">
            {isArabic ? 'لا توجد مشاريع محفوظة حالياً. انقر على مشروع جديد للبدء.' : 'No stored projects yet. Click New Project to begin.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
          {projects.map((proj) => {
            const isRunning = proj.status === 'running' || proj.status === 'restarting';
            return (
              <div
                key={proj.id}
                className={`p-3 rounded-xl border flex flex-col justify-between gap-3 transition ${
                  isDark ? 'bg-black/30 border-white/10 hover:border-cyan-500/40' : 'bg-slate-50 border-slate-200 hover:border-cyan-500/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono font-bold text-xs truncate text-cyan-300">{proj.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">Entry: {proj.entry_file}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isRunning
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                    }`}
                  >
                    {isRunning ? (isArabic ? '🟢 يعمل' : '🟢 Running') : (isArabic ? '🔴 متوقف' : '🔴 Stopped')}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[10px] text-slate-400">{proj.files.length} {isArabic ? 'ملفات' : 'files'}</span>
                  
                  {/* Action Icon Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onOpenProject(proj.id)}
                      className="p-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 transition"
                      title={isArabic ? 'فتح في مساحة العمل' : 'Open in Workspace'}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {isRunning ? (
                      <button
                        type="button"
                        onClick={() => onStopProject(proj.id)}
                        className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition"
                        title={isArabic ? 'إيقاف التشغيل المستمر' : 'Stop Hosting'}
                      >
                        <Square className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onStartProject(proj.id)}
                        className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition"
                        title={isArabic ? 'تشغيل كمستضاف (Always-On)' : 'Run as Hosted'}
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteProject(proj.id)}
                      className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition"
                      title={isArabic ? 'حذف المشروع' : 'Delete Project'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
