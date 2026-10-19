import React, { useState } from 'react';
import { FileCode, FileText, Plus, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import { SandboxFile } from '../../hooks/useSandboxStore';
import { useTheme } from '../../context/ThemeContext';

interface FileTreeProps {
  files: SandboxFile[];
  activeFileName: string;
  onSelectFile: (name: string) => void;
  onCreateFile: (name: string) => void;
  isArabic: boolean;
  className?: string;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  activeFileName,
  onSelectFile,
  onCreateFile,
  isArabic,
  className = '',
}) => {
  const { isDark } = useTheme();
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    const name = newFileName.endsWith('.py') || newFileName.endsWith('.txt') || newFileName.endsWith('.json') || newFileName.endsWith('.md')
      ? newFileName
      : `${newFileName}.py`;
    onCreateFile(name);
    setNewFileName('');
    setIsCreating(false);
  };

  return (
    <div
      className={`shrink-0 flex flex-col h-full select-none ${
        isDark ? 'bg-[#10121c] border-white/10' : 'bg-slate-50 border-slate-200'
      } ${className}`}
      dir="ltr"
    >
      <div className="p-3 border-b flex items-center justify-between border-white/10">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
          <Folder className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isArabic ? 'ملفات المشروع' : 'Project Files'}</span>
        </div>
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="p-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 transition"
          title={isArabic ? 'إنشاء ملف جديد' : 'New file'}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreateSubmit} className="p-2 border-b border-white/10 bg-black/20">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="script.py"
            autoFocus
            className={`w-full px-2 py-1 rounded text-xs border focus:outline-hidden ${
              isDark ? 'bg-black/50 border-white/20 text-white' : 'bg-white border-slate-300 text-black'
            }`}
          />
        </form>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {files.map((file) => {
          const isActive = file.name === activeFileName;
          const isDir = (file as any).type === 'directory' || file.name.endsWith('/') || file.size === 4096;
          const isPy = file.name.endsWith('.py');
          return (
            <div
              key={file.name}
              onClick={() => onSelectFile(file.name)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer text-xs font-mono transition ${
                isActive
                  ? isDark
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                    : 'bg-cyan-100 text-cyan-900 font-bold border border-cyan-300'
                  : isDark
                  ? 'text-slate-300 hover:bg-white/5'
                  : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              {isDir ? (
                <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : isPy ? (
                <FileCode className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              )}
              <span className="truncate">{file.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
