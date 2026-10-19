import React from 'react';
import { Activity, Square, RotateCcw, Eye, Loader2, Cpu } from 'lucide-react';
import { SandboxProject } from '../../hooks/useSandboxStore';
import { useTheme } from '../../context/ThemeContext';

interface ActiveProcessesCardProps {
  projects: SandboxProject[];
  isArabic: boolean;
  onOpenProject: (id: string) => void;
  onStopProject: (id: string) => void;
  onRestartProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

export const ActiveProcessesCard: React.FC<ActiveProcessesCardProps> = ({
  projects,
  isArabic,
  onOpenProject,
  onStopProject,
  onRestartProject,
}) => {
  const { isDark } = useTheme();
  const activeList = projects.filter((p) => p.status === 'running' || p.status === 'cancelling');

  return (
    <div
      className={`border rounded-2xl p-4 shadow-xl flex flex-col gap-3 transition-colors ${
        isDark ? 'bg-[#141624] border-white/10' : 'bg-white border-slate-200'
      }`}
      dir="ltr"
    >
      <div className="flex items-center justify-between border-b pb-2.5 border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <h3 className="font-bold text-sm">
            {isArabic ? 'العمليات النشطة الآن (Active DO Processes)' : 'Active DO Processes'}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
            <Cpu className="w-3 h-3" />
            DO Stateful
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {activeList.length} {isArabic ? 'تشغيل مستمر' : 'running'}
          </span>
        </div>
      </div>

      {activeList.length === 0 ? (
        <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-slate-400">
            <Activity className="w-6 h-6" />
          </div>
          <p className="text-xs text-slate-400">
            {isArabic ? 'لا توجد مشاريع بايثون تعمل حالياً في سحابة Cloudflare.' : 'No background Python processes currently running.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {activeList.map((proj) => {
            const isCancelling = proj.status === 'cancelling';

            return (
              <div
                key={proj.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                  isDark
                    ? isCancelling
                      ? 'bg-rose-950/20 border-rose-500/30'
                      : 'bg-black/40 border-white/10 hover:border-emerald-500/40'
                    : isCancelling
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-slate-50 border-slate-200 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isCancelling ? (
                    <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin shrink-0" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-emerald-400 animate-ping" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs truncate">{proj.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {proj.runtimeId || `do-${proj.name}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      {isCancelling ? (
                        <span className="text-rose-400 font-medium">
                          {isArabic ? 'جاري الإيقاف الفوري (Kill Switch)...' : 'Aborting immediately...'}
                        </span>
                      ) : (
                        <>
                          <span>⏱ Uptime: {proj.uptime}</span>
                          <span>•</span>
                          <span>💾 RAM: {proj.memory}</span>
                          {proj.activeRunId && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[9px] text-slate-500">ID: {proj.activeRunId.slice(0, 8)}</span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Icon Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenProject(proj.id)}
                    className="p-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 transition"
                    title={isArabic ? 'فتح في مساحة العمل' : 'Open in Workspace'}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => onRestartProject(proj.id)}
                    className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 transition disabled:opacity-50"
                    title={isArabic ? 'إعادة تشغيل' : 'Restart'}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => onStopProject(proj.id)}
                    className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition disabled:opacity-50 flex items-center gap-1 text-xs px-2"
                    title={isArabic ? 'إيقاف فوري (Kill Switch)' : 'Immediate Stop'}
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span className="hidden sm:inline text-[11px] font-bold">Stop</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
