import React from 'react';
import { Terminal, Search, Moon, Sun, Settings, Maximize2, Minimize2, X, Activity, LayoutDashboard, Cloud } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface TopBarProps {
  isArabic: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeCount: number;
  onOpenGlobalTerminal: () => void;
  onOpenSettings: () => void;
  onOpenAdminDashboard?: () => void;
  isFullscreen: boolean;
  setIsFullscreen: (val: boolean) => void;
  onClose: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  isArabic,
  searchQuery,
  setSearchQuery,
  activeCount,
  onOpenGlobalTerminal,
  onOpenSettings,
  onOpenAdminDashboard,
  isFullscreen,
  setIsFullscreen,
  onClose,
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div
      className={`h-12 px-3 border-b flex items-center justify-between shrink-0 select-none transition-colors duration-150 ${
        isDark ? 'border-white/10 bg-[#141622]' : 'border-slate-200 bg-slate-50'
      }`}
      dir="ltr"
    >
      {/* Left: Logo & Python Version Badge */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
          <Terminal className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-xs sm:text-sm truncate">
            {isArabic ? 'منصة استضافة بايثون' : 'Python Hosting Platform'}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Py 3.11 / Kali
          </span>
        </div>
      </div>

      {/* Center: Search Bar & Active Badge */}
      <div className="hidden md:flex items-center gap-3 flex-1 max-w-sm mx-4">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isArabic ? 'بحث في المشاريع، الأكواد، أو الملفات...' : 'Search projects, codes, files...'}
            className={`w-full pl-8 pr-3 py-1 rounded-lg text-xs border transition focus:outline-hidden ${
              isDark ? 'bg-black/40 border-white/10 text-white placeholder-slate-500 focus:border-cyan-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-600'
            }`}
          />
        </div>
        {activeCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/45 text-emerald-400 text-[11px] font-bold shrink-0">
            <Activity className="w-3 h-3 animate-pulse" />
            <span>{activeCount} {isArabic ? 'نشط' : 'active'}</span>
          </div>
        )}
      </div>

      {/* Right: Icon Buttons with Tooltips */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Global Terminal Button */}
        <button
          type="button"
          onClick={onOpenGlobalTerminal}
          className={`p-1.5 rounded-lg border transition flex items-center gap-1 text-xs font-bold ${
            isDark ? 'border-white/10 bg-white/5 hover:bg-white/10 text-cyan-300' : 'border-slate-200 bg-white hover:bg-slate-100 text-cyan-700'
          }`}
          title={isArabic ? 'الطرفية العامة للشل (Global Terminal)' : 'Global Shell Terminal'}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">&gt;_ CLI</span>
        </button>

        {/* Platform Admin & Sudafile Dashboard Button */}
        {onOpenAdminDashboard && (
          <button
            type="button"
            onClick={onOpenAdminDashboard}
            className={`p-1.5 rounded-lg border transition flex items-center gap-1.5 text-xs font-bold ${
              isDark
                ? 'border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300'
                : 'border-cyan-300 bg-cyan-50 hover:bg-cyan-100 text-cyan-800'
            }`}
            title={isArabic ? 'لوحة تحكم المنصة وسحابة Sudafile' : 'Platform Admin & Sudafile Dashboard'}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">{isArabic ? 'لوحة التحكم' : 'Admin'}</span>
          </button>
        )}

        {/* Settings Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className={`p-1.5 rounded-lg border transition ${
            isDark ? 'border-white/10 hover:bg-white/10 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
          }`}
          title={isArabic ? 'إعدادات المنصة' : 'Platform Settings'}
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`p-1.5 rounded-lg border transition ${
            isDark ? 'border-white/10 hover:bg-white/10 text-amber-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
          }`}
          title={isArabic ? 'تبديل المظهر' : 'Toggle Theme'}
        >
          {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className={`hidden sm:flex p-1.5 rounded-lg border transition ${
            isDark ? 'border-white/10 hover:bg-white/10 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
          }`}
          title={isFullscreen ? 'تصغير الشاشة' : 'تكبير الشاشة'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={`p-1.5 rounded-lg border transition ${
            isDark ? 'border-white/10 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400' : 'border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-600'
          }`}
          title={isArabic ? 'إغلاق المنصة' : 'Close Platform'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
