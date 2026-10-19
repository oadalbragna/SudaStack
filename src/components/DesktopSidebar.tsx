import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  HardDrive,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Search,
  LayoutDashboard,
  Film,
  Sun,
  Moon,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Monitor,
  Smartphone,
  Terminal,
} from 'lucide-react';
import { ChatSession, TelegramStorageFile } from '../types';
import { useTheme } from '../context/ThemeContext';

interface DesktopSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sessions: ChatSession[];
  currentSessionId: string;
  onSelectSession: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  onNewSession: () => void;
  filesCount: number;
  onOpenStorage: () => void;
  isArabic?: boolean;
  onOpenAdminDashboard?: () => void;
  onOpenTerminalSandbox?: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  isOpen,
  onToggle,
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onNewSession,
  filesCount,
  onOpenStorage,
  isArabic = true,
  onOpenAdminDashboard,
  onOpenTerminalSandbox,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) {
    return (
      <div className="hidden lg:flex flex-col items-center py-3 px-2 border-r dark:border-white/10 border-slate-200 shrink-0 select-none z-20">
        <button
          type="button"
          onClick={onToggle}
          className={`p-2 rounded-xl transition active:scale-95 ${
            isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
          }`}
          title={isArabic ? 'فتح الشريط الجانبي (عرض سطح المكتب)' : 'Open Desktop Sidebar'}
        >
          <PanelLeftOpen className="w-5 h-5 text-cyan-400" />
        </button>
        <button
          type="button"
          onClick={onNewSession}
          className="mt-3 p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition active:scale-95"
          title={isArabic ? 'محادثة جديدة' : 'New Chat'}
        >
          <Plus className="w-4 h-4" />
        </button>
        {onOpenTerminalSandbox && (
          <button
            type="button"
            onClick={onOpenTerminalSandbox}
            className="mt-2 p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition active:scale-95"
            title={isArabic ? 'ساندبوكس بايثون ومشغل الطرفية (Terminal)' : 'Python Sandbox & Terminal'}
          >
            <Terminal className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside
      className={`hidden lg:flex flex-col w-64 xl:w-72 border-r transition-colors select-none shrink-0 z-20 ${
        isDark ? 'bg-[#10121a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
      }`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-black/5 dark:border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
            ⚡
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-xs truncate">
              {isArabic ? 'سوداستاك SudaStack' : 'SudaStack Studio'}
            </h3>
            <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
              <Monitor className="w-3 h-3" />
              <span>{isArabic ? 'عرض سطح المكتب' : 'Desktop View'}</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className={`p-1.5 rounded-lg transition active:scale-95 ${
            isDark ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
          }`}
          title={isArabic ? 'طي الشريط الجانبي' : 'Collapse Sidebar'}
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat Primary Button */}
      <div className="p-3">
        <button
          type="button"
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md transition active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>{isArabic ? 'محادثة جديدة' : 'New Chat'}</span>
        </button>
      </div>

      {/* Search Input */}
      {sessions.length > 3 && (
        <div className="px-3 pb-2">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute right-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isArabic ? 'البحث في المحادثات...' : 'Search chats...'}
              className={`w-full py-1.5 pr-8 pl-3 rounded-lg border text-xs focus:outline-hidden transition ${
                isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
              }`}
            />
          </div>
        </div>
      )}

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1 no-scrollbar">
        <div className="px-2 py-1 text-[11px] font-bold text-slate-400 flex items-center justify-between">
          <span>{isArabic ? 'المحادثات الأخيرة' : 'Recent Chats'}</span>
          <span className="font-mono text-[10px]">{sessions.length}</span>
        </div>

        {filteredSessions.map((session) => {
          const isActive = session.id === currentSessionId;
          return (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`group flex items-center justify-between gap-2 p-2 rounded-xl text-xs cursor-pointer transition active:scale-[0.99] ${
                isActive
                  ? isDark
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-bold'
                    : 'bg-cyan-50 text-cyan-900 border border-cyan-300 font-bold'
                  : isDark
                  ? 'hover:bg-white/5 text-slate-300 hover:text-white'
                  : 'hover:bg-slate-100 text-slate-700 hover:text-slate-950'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="truncate">{session.title}</span>
              </div>

              {onDeleteSession && sessions.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition"
                  title={isArabic ? 'حذف هذه المحادثة' : 'Delete chat'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Storage & Cloud Files Section */}
      <div className="p-3 border-t border-black/5 dark:border-white/10 space-y-2">
        {onOpenTerminalSandbox && (
          <button
            type="button"
            onClick={onOpenTerminalSandbox}
            className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs font-semibold transition active:scale-98 ${
              isDark
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>{isArabic ? 'ساندبوكس بايثون والطرفية' : 'Python Sandbox & CLI'}</span>
            </div>
            <span className="px-1.5 py-0.5 rounded-full font-mono text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              PY / CLI
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenStorage}
          className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs font-semibold transition active:scale-98 ${
            isDark ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span>{isArabic ? 'الملفات والمشاريع السحابية' : 'Storage & Projects'}</span>
          </div>
          <span className="px-1.5 py-0.5 rounded-full font-mono text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            {filesCount}
          </span>
        </button>

        {/* Quick Tools Row */}
        <div className="flex items-center justify-between gap-1 pt-1">
          {onOpenAdminDashboard && (
            <button
              type="button"
              onClick={onOpenAdminDashboard}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition ${
                isDark ? 'border-white/10 hover:bg-white/10 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title={isArabic ? 'لوحة تحكم المنصة' : 'Admin Dashboard'}
            >
              <LayoutDashboard className="w-3 h-3 text-cyan-400" />
              <span>{isArabic ? 'لوحة التحكم' : 'Admin'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className={`p-1.5 rounded-lg border transition ${
              isDark ? 'border-white/10 hover:bg-white/10 text-amber-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
            title={isDark ? (isArabic ? 'الوضع النهاري' : 'Light Mode') : (isArabic ? 'الوضع الليلي' : 'Dark Mode')}
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </aside>
  );
};
