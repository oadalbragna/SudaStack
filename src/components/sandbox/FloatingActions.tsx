import React, { useRef } from 'react';
import { Plus, Upload, Zap, RotateCcw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface FloatingActionsProps {
  isArabic: boolean;
  onNewProject: () => void;
  onUploadZipOrPy: (file: File) => void;
  onQuickRun: () => void;
  onRestoreLastSession: () => void;
}

export const FloatingActions: React.FC<FloatingActionsProps> = ({
  isArabic,
  onNewProject,
  onUploadZipOrPy,
  onQuickRun,
  onRestoreLastSession,
}) => {
  const { isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadZipOrPy(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip,.py,application/zip,text/x-python,text/plain"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Floating Action Bar: Top on desktop, Bottom on mobile */}
      <div
        className="fixed z-40 sm:top-14 bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all duration-200"
        style={{
          backgroundColor: isDark ? 'rgba(20, 22, 34, 0.92)' : 'rgba(255, 255, 255, 0.94)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)',
        }}
        dir="ltr"
      >
        {/* 1. New Project */}
        <button
          type="button"
          onClick={onNewProject}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition active:scale-95 shadow-md"
          title={isArabic ? '➕ إنشاء مشروع جديد' : '➕ Create New Project'}
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isArabic ? 'مشروع جديد' : 'New Project'}</span>
        </button>

        {/* 2. Upload File / .zip */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition active:scale-95 shadow-md"
          title={isArabic ? '📤 رفع ملف بايثون أو أرشيف (.zip)' : '📤 Upload .py or .zip archive'}
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isArabic ? 'رفع ملف/.zip' : 'Upload File/.zip'}</span>
        </button>

        {/* 3. Quick Run */}
        <button
          type="button"
          onClick={onQuickRun}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-95 shadow-md"
          title={isArabic ? '⚡ تشغيل سريع لكود بايثون فوري' : '⚡ Quick Run Instant Code'}
        >
          <Zap className="w-3.5 h-3.5 fill-white" />
          <span className="hidden sm:inline">{isArabic ? 'تشغيل سريع' : 'Quick Run'}</span>
        </button>

        {/* 4. Restore Last Session */}
        <button
          type="button"
          onClick={onRestoreLastSession}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition active:scale-95 ${
            isDark
              ? 'border-white/10 hover:bg-white/10 text-slate-200'
              : 'border-slate-300 hover:bg-slate-100 text-slate-800'
          }`}
          title={isArabic ? '💾 استعادة آخر جلسة ومشاريع سابقة' : '💾 Restore Last Session'}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isArabic ? 'استعادة آخر جلسة' : 'Restore Session'}</span>
        </button>
      </div>
    </>
  );
};
