import React, { useRef, useState } from 'react';
import { Database, Upload, Folder, FileCode, Trash2, Play, Edit3, Cloud, ExternalLink, HardDrive } from 'lucide-react';
import { SandboxProject } from '../../hooks/useSandboxStore';
import { useTheme } from '../../context/ThemeContext';
import { sudafileStorage } from '../../services/sudafileStorage';

interface StorageVaultCardProps {
  projects: SandboxProject[];
  isArabic: boolean;
  onUploadZip: (file: File) => void;
  onUploadPy: (file: File) => void;
  onOpenProject: (id: string) => void;
  onStartProject: (id: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onDeleteProject: (id: string) => void;
  onOpenAdminDashboard?: () => void;
}

export const StorageVaultCard: React.FC<StorageVaultCardProps> = ({
  projects,
  isArabic,
  onUploadZip,
  onUploadPy,
  onOpenProject,
  onStartProject,
  onRenameProject,
  onDeleteProject,
  onOpenAdminDashboard,
}) => {
  const { isDark } = useTheme();
  const zipInputRef = useRef<HTMLInputElement>(null);
  const pyInputRef = useRef<HTMLInputElement>(null);
  const sudafileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [sudafileMsg, setSudafileMsg] = useState<string | null>(null);

  const handleZipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await onUploadZip(file);
    } finally {
      setIsUploading(false);
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  };

  const handlePyChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await onUploadPy(file);
    } finally {
      setIsUploading(false);
      if (pyInputRef.current) pyInputRef.current.value = '';
    }
  };

  const handleRename = (proj: SandboxProject) => {
    const newName = prompt(isArabic ? 'أدخل الاسم الجديد للمشروع:' : 'Enter new project name:', proj.name);
    if (newName && newName.trim()) {
      onRenameProject(proj.id, newName.trim());
    }
  };

  return (
    <div
      className={`border rounded-2xl p-4 shadow-xl flex flex-col gap-3 transition-colors ${
        isDark ? 'bg-[#141624] border-white/10' : 'bg-white border-slate-200'
      }`}
      dir="ltr"
    >
      {/* Hidden file inputs */}
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip,application/zip,application/x-zip-compressed"
        onChange={handleZipChange}
        className="hidden"
      />
      <input
        ref={pyInputRef}
        type="file"
        accept=".py,text/x-python,text/plain"
        onChange={handlePyChange}
        className="hidden"
      />
      <input
        ref={sudafileInputRef}
        type="file"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setIsUploading(true);
          try {
            await sudafileStorage.uploadFile(file, 'uploads');
            setSudafileMsg(isArabic ? '✅ تم الرفع لسحابة Sudafile بنجاح!' : '✅ Uploaded to Sudafile!');
            setTimeout(() => setSudafileMsg(null), 4000);
          } catch (err: any) {
            setSudafileMsg(isArabic ? `فشل الرفع: ${err.message}` : `Error: ${err.message}`);
          } finally {
            setIsUploading(false);
            if (sudafileInputRef.current) sudafileInputRef.current.value = '';
          }
        }}
        className="hidden"
      />

      <div className="flex items-center justify-between border-b pb-2.5 border-white/10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
            <Database className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm">
            {isArabic ? 'مجلد التخزين الداخلي (extracted/) — Storage Vault' : 'Storage Vault (extracted/)'}
          </h3>
        </div>

        {/* Action Buttons: Upload .zip & Upload .py */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => zipInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition active:scale-95 shadow-xs disabled:opacity-50"
            title={isArabic ? 'رفع أرشيف .zip وفكه تلقائياً في extracted/' : 'Upload .zip archive'}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? (isArabic ? 'جاري الفك...' : 'Extracting...') : (isArabic ? 'رفع .zip' : 'Upload .zip')}</span>
          </button>

          <button
            type="button"
            onClick={() => pyInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition active:scale-95 shadow-xs disabled:opacity-50"
            title={isArabic ? 'رفع ملف بايثون (.py) مباشرة' : 'Upload .py file'}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>{isArabic ? 'رفع .py' : 'Upload .py'}</span>
          </button>
        </div>
      </div>

      {/* Sudafile Cloud Integration Bar */}
      <div
        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
          isDark
            ? 'bg-cyan-500/10 border-cyan-500/25 text-cyan-200'
            : 'bg-cyan-50 border-cyan-200 text-cyan-900'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Cloud className="w-4 h-4 text-cyan-400 shrink-0" />
          <div className="min-w-0">
            <span className="font-bold truncate block">
              {isArabic ? 'سحابة Sudafile السحابية' : 'Sudafile Cloud Storage'}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              Key: {sudafileStorage.getConfig().apiKey.slice(0, 14)}...
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => sudafileInputRef.current?.click()}
            disabled={isUploading}
            className="px-2 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] transition active:scale-95 flex items-center gap-1"
            title={isArabic ? 'رفع ملف إلى سحابة Sudafile' : 'Upload file to Sudafile Cloud'}
          >
            <Upload className="w-3 h-3" />
            <span>{isArabic ? 'رفع سحابي' : 'Cloud Upload'}</span>
          </button>

          {onOpenAdminDashboard && (
            <button
              type="button"
              onClick={onOpenAdminDashboard}
              className={`p-1 px-2 rounded-lg border text-[11px] font-bold transition flex items-center gap-1 ${
                isDark ? 'border-white/10 hover:bg-white/10 text-cyan-300' : 'border-slate-200 hover:bg-white text-cyan-800'
              }`}
              title={isArabic ? 'تعديل مفتاح Sudafile في لوحة التحكم' : 'Change Sudafile API Key in Admin'}
            >
              <ExternalLink className="w-3 h-3" />
              <span>{isArabic ? 'إعدادات المفتاح' : 'API Key'}</span>
            </button>
          )}
        </div>
      </div>

      {sudafileMsg && (
        <div className="text-xs font-semibold text-emerald-400 px-1 animate-in fade-in">
          {sudafileMsg}
        </div>
      )}

      <div className="text-[11px] text-slate-400 font-mono">
        {isArabic ? 'المسار الدائم: SudaStack/storage/extracted/' : 'Persistent Path: SudaStack/storage/extracted/'}
      </div>

      {projects.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          {isArabic ? 'التخزين الداخلي فارغ. ارفع أرشيف .zip لتخزينه وفكه تلقائياً هنا.' : 'Storage vault is empty. Upload a .zip archive to extract and store here.'}
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 transition ${
                isDark ? 'bg-black/40 border-white/10 hover:border-purple-500/40' : 'bg-slate-50 border-slate-200 hover:border-purple-500/40'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Folder className="w-4 h-4 text-purple-400 shrink-0" />
                <div className="min-w-0">
                  <div className="font-mono font-bold text-xs truncate text-purple-300">extracted/{proj.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{proj.files.length} {isArabic ? 'ملف مستخرج' : 'files extracted'}</div>
                </div>
              </div>

              {/* Action Buttons: 📂 Open – ▶ Run – ✏ Rename – 🗑 Delete */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenProject(proj.id)}
                  className="p-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 transition"
                  title={isArabic ? '📂 فتح المجلد في مساحة العمل' : '📂 Open in Workspace'}
                >
                  <Folder className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onStartProject(proj.id)}
                  className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition"
                  title={isArabic ? '▶ تشغيل كمستضاف (Always-On)' : '▶ Run as Hosted'}
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRename(proj)}
                  className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 transition"
                  title={isArabic ? '✏ إعادة تسمية المجلد' : '✏ Rename folder'}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteProject(proj.id)}
                  className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition"
                  title={isArabic ? '🗑 حذف من التخزين' : '🗑 Delete from Vault'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
