import React, { useState } from 'react';
import { Activity, Search, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { LogItem } from '../../hooks/useSandboxStore';
import { useTheme } from '../../context/ThemeContext';

interface LogsViewerProps {
  logs: LogItem[];
  isArabic: boolean;
}

export const LogsViewer: React.FC<LogsViewerProps> = ({ logs, isArabic }) => {
  const { isDark } = useTheme();
  const [filter, setFilter] = useState<string>('');

  const filteredLogs = logs.filter((l) => l.message.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 ${
        isDark ? 'bg-[#0b0d14] text-slate-200' : 'bg-slate-900 text-slate-100'
      }`}
      dir="ltr"
    >
      <div className="px-3 py-1.5 border-b border-white/10 flex items-center justify-between bg-black/40 text-xs">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-bold">{isArabic ? 'سجلات النظام والأحداث (Logs)' : 'System & Event Logs'}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={isArabic ? 'تصفية السجلات...' : 'Filter logs...'}
            className="pl-7 pr-2 py-0.5 rounded bg-black/50 border border-white/10 text-xs text-white focus:outline-hidden"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-500 italic">
            {isArabic ? 'لا توجد سجلات مطابقة.' : 'No matching logs found.'}
          </div>
        ) : (
          filteredLogs.map((log) => {
            let color = 'text-cyan-400';
            let Icon = Info;
            if (log.level === 'WARN') {
              color = 'text-amber-400';
              Icon = AlertTriangle;
            } else if (log.level === 'ERROR') {
              color = 'text-rose-400';
              Icon = AlertTriangle;
            }
            return (
              <div key={log.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/5 border border-white/5">
                <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-bold text-[10px] ${color}`}>{log.level}</span>
                    <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                  </div>
                  <div className="text-slate-300 mt-0.5 whitespace-pre-wrap">{log.message}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
