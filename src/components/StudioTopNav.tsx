import React, { useState } from 'react';
import {
  Menu,
  ChevronDown,
  SquarePen,
  Clock,
  Trash2,
  Check,
  Plus,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  Sun,
  Moon,
  Film,
  Terminal,
} from 'lucide-react';
import { ChatSession } from '../types';
import { useTheme } from '../context/ThemeContext';

interface StudioTopNavProps {
  sessionTitle: string;
  onOpenDrawer: () => void;
  onNewSession: () => void;
  onRenameSession?: (newTitle: string) => void;
  filesCount?: number;
  isArabic?: boolean;
  onOpenAdminDashboard?: () => void;
  onOpenTerminalSandbox?: () => void;
  sessions?: ChatSession[];
  currentSessionId?: string;
  onSelectSession?: (id: string) => void;
  onDeleteSession?: (id: string) => void;
  onToggleDesktopSidebar?: () => void;
  isDesktopSidebarOpen?: boolean;
}

export const StudioTopNav: React.FC<StudioTopNavProps> = React.memo(({
  sessionTitle,
  onOpenDrawer,
  onNewSession,
  onRenameSession,
  filesCount = 0,
  isArabic = true,
  onOpenAdminDashboard,
  onOpenTerminalSandbox,
  sessions = [],
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onToggleDesktopSidebar,
  isDesktopSidebarOpen,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempTitle, setTempTitle] = useState(sessionTitle);

  const handleSaveTitle = () => {
    if (tempTitle.trim() && onRenameSession) {
      onRenameSession(tempTitle.trim());
    }
    setIsEditing(false);
    setShowDropdown(false);
  };

  return (
    <header
      className={`relative w-full border-b select-none z-30 shrink-0 transition-colors duration-150 ${
        isDark
          ? 'bg-[#0e0f12] text-white border-white/[0.08]'
          : 'bg-white text-slate-900 border-slate-200 shadow-xs'
      }`}
    >
      <div className={`flex items-center justify-between px-3 sm:px-4 h-13 ${!isArabic ? 'flex-row-reverse' : ''}`}>
        {/* Menu Hamburger Button */}
        <button
          id="studio-menu-btn"
          onClick={() => {
            if (typeof window !== 'undefined' && window.innerWidth >= 1024 && onToggleDesktopSidebar) {
              onToggleDesktopSidebar();
            } else {
              onOpenDrawer();
            }
          }}
          className={`p-2 active:scale-95 transition rounded-lg relative flex items-center justify-center min-w-[40px] min-h-[40px] ${
            !isArabic ? '-mr-1' : '-ml-1'
          } ${
            isDark
              ? 'text-slate-300 hover:text-white hover:bg-white/5'
              : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
          }`}
          title={isArabic ? 'فتح القائمة وسجل المحادثات' : 'Open Menu & Chat History'}
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
          {filesCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-500" />
          )}
        </button>

        {/* Center: Session Dropdown Title & History Access */}
        <div className="relative">
          <button
            onClick={() => {
              setTempTitle(sessionTitle);
              setShowDropdown(!showDropdown);
            }}
            className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-sm sm:text-[15px] font-medium transition active:scale-98 max-w-[200px] sm:max-w-[340px] ${
              isDark
                ? 'text-slate-100 hover:bg-white/5'
                : 'text-slate-800 hover:bg-slate-100'
            }`}
            title={isArabic ? 'الوصول للمحادثات السابقة والمحادثة الحالية' : 'Access previous conversations and current chat'}
          >
            <span className="truncate">{sessionTitle}</span>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isDark ? 'text-slate-400' : 'text-slate-500'} ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Session Dropdown Menu & Full Conversation History */}
          {showDropdown && (
            <div
              dir={isArabic ? 'rtl' : 'ltr'}
              className={`absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-80 sm:w-88 border rounded-2xl shadow-2xl p-2.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150 max-h-[75vh] flex flex-col ${
                isDark
                  ? 'bg-[#16171d] border-white/10 text-white shadow-black/60'
                  : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/60'
              }`}
            >
              {/* Header: Current Session rename or title */}
              <div className={`flex items-center justify-between pb-2 mb-2 border-b px-1 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                <div className={`flex items-center gap-1.5 text-[11px] font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'المحادثة الحالية' : 'Current Chat'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onNewSession();
                    setShowDropdown(false);
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border font-bold text-[11px] transition active:scale-95 ${
                    isDark
                      ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40'
                      : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-300'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>{isArabic ? 'محادثة جديدة' : 'New Chat'}</span>
                </button>
              </div>

              {/* Title edit row */}
              {isEditing ? (
                <div className={`p-1.5 mb-2 flex items-center gap-1.5 rounded-xl border border-cyan-500/50 ${isDark ? 'bg-[#0e0f12]' : 'bg-slate-50'}`}>
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                    autoFocus
                    className={`w-full bg-transparent px-2 py-1 text-xs focus:outline-none ${isDark ? 'text-white' : 'text-slate-900'}`}
                    placeholder={isArabic ? 'عنوان المحادثة...' : 'Chat title...'}
                  />
                  <button
                    onClick={handleSaveTitle}
                    className="p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black shrink-0 font-bold"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className={`flex items-center justify-between px-2 py-1.5 rounded-xl border mb-2 ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                  <span className="truncate font-medium text-xs flex-1">{sessionTitle}</span>
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 mr-1 ${
                      isDark
                        ? 'text-cyan-400 hover:text-cyan-300 hover:bg-white/5'
                        : 'text-cyan-700 hover:text-cyan-800 hover:bg-slate-200/70'
                    }`}
                  >
                    {isArabic ? 'تعديل الاسم' : 'Rename'}
                  </button>
                </div>
              )}

              {/* Previous Conversations List */}
              <div className={`text-[11px] font-semibold px-1 py-1 flex items-center gap-1.5 border-t pt-2 ${
                isDark ? 'text-slate-400 border-white/5' : 'text-slate-500 border-slate-100'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{isArabic ? 'سجل المحادثات السابقة' : 'Previous Conversations'}</span>
                <span className="text-[10px] font-mono">({sessions.length})</span>
              </div>

              <div className="overflow-y-auto space-y-1 max-h-52 pr-0.5 mt-1">
                {sessions.length === 0 ? (
                  <div className="text-center py-4 text-slate-500 text-[11px]">
                    {isArabic ? 'لا توجد محادثات سابقة حتى الآن' : 'No previous conversations yet'}
                  </div>
                ) : (
                  sessions.map((sess) => {
                    const isCurrent = sess.id === currentSessionId;
                    return (
                      <div
                        key={sess.id}
                        className={`group flex items-center justify-between gap-2 p-2 rounded-xl transition ${
                          isCurrent
                            ? isDark
                              ? 'bg-cyan-500/15 border border-cyan-500/40 text-cyan-200'
                              : 'bg-cyan-50 border border-cyan-300 text-cyan-900'
                            : isDark
                            ? 'hover:bg-white/5 text-slate-300 border border-transparent'
                            : 'hover:bg-slate-100 text-slate-700 border border-transparent'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectSession) onSelectSession(sess.id);
                            setShowDropdown(false);
                          }}
                          className="flex items-start gap-2 min-w-0 flex-1 text-right"
                        >
                          <MessageSquare className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isCurrent ? (isDark ? 'text-cyan-400' : 'text-cyan-600') : 'text-slate-400'}`} />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs truncate">
                              {sess.title}
                            </div>
                            <div className={`text-[10px] font-mono mt-0.5 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              <span>{sess.formattedTime}</span>
                              {isCurrent && (
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-sans font-bold ${
                                  isDark ? 'bg-cyan-500/30 text-cyan-300' : 'bg-cyan-100 text-cyan-800'
                                }`}>
                                  {isArabic ? 'الحالية' : 'Current'}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>

                        {onDeleteSession && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession(sess.id);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition shrink-0"
                            title={isArabic ? 'حذف المحادثة' : 'Delete chat'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Theme Toggle + Admin Dashboard Button + New Chat Button */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme Toggle Button (الوضع النهاري / الليلي) */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`px-2.5 py-1.5 rounded-xl transition active:scale-95 flex items-center gap-1.5 border shadow-xs text-xs font-semibold ${
              isDark
                ? 'bg-white/5 hover:bg-amber-400/20 text-slate-200 hover:text-amber-300 border-white/10 hover:border-amber-400/40'
                : 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-700 border-slate-200 hover:border-amber-400/40'
            }`}
            title={
              isDark
                ? (isArabic ? 'التبديل إلى الوضع النهاري ☀️ (Alt+T)' : 'Switch to Light Mode ☀️ (Alt+T)')
                : (isArabic ? 'التبديل إلى الوضع الليلي 🌙 (Alt+T)' : 'Switch to Dark Mode 🌙 (Alt+T)')
            }
            aria-label="Toggle Theme"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden md:inline text-[11px]">{isArabic ? 'نهاري' : 'Light'}</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" />
                <span className="hidden md:inline text-[11px]">{isArabic ? 'ليلي' : 'Dark'}</span>
              </>
            )}
          </button>



          {onOpenTerminalSandbox && (
            <button
              id="sudastack-top-terminal-btn"
              onClick={onOpenTerminalSandbox}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition active:scale-95 shadow-xs ${
                isDark
                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 hover:border-emerald-500/50 text-emerald-300'
                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 hover:border-emerald-400 text-emerald-800'
              }`}
              title={isArabic ? 'ساندبوكس بايثون ومشغل الطرفية (Terminal CLI)' : 'Python Sandbox & Terminal CLI'}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline font-mono font-bold">{isArabic ? 'الطرفية والساندبوكس' : 'Terminal CLI'}</span>
            </button>
          )}

          {onOpenAdminDashboard && (
            <button
              id="sudastack-top-dashboard-btn"
              onClick={onOpenAdminDashboard}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 shadow-xs ${
                isDark
                  ? 'bg-cyan-500/10 hover:bg-cyan-500/25 border-cyan-500/30 hover:border-cyan-500/50 text-cyan-300'
                  : 'bg-cyan-50 hover:bg-cyan-100 border-cyan-300 hover:border-cyan-400 text-cyan-800'
              }`}
              title={isArabic ? 'لوحة تحكم المنصة وسحابة Sudafile' : 'SudaStack Admin Dashboard & Sudafile'}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden sm:inline">{isArabic ? 'لوحة التحكم' : 'Admin'}</span>
            </button>
          )}



          {/* New Chat Button */}
          <button
            id="studio-new-session-btn"
            onClick={onNewSession}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border active:scale-95 transition text-xs font-bold ${
              isDark
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border-cyan-500/35 text-cyan-300 hover:text-white'
                : 'bg-gradient-to-r from-cyan-50 to-sky-50 hover:from-cyan-100 hover:to-sky-100 border-cyan-300 text-cyan-800 hover:text-cyan-950 shadow-xs'
            }`}
            title={isArabic ? 'بدء محادثة جديدة' : 'Start New Chat'}
            aria-label="New Session"
          >
            <SquarePen className="w-4 h-4" />
            <span className="hidden sm:inline">{isArabic ? 'محادثة جديدة' : 'New Chat'}</span>
          </button>
        </div>
      </div>
    </header>
  );
});
