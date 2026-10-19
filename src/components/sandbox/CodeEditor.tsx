import React from 'react';
import { Play, Copy, Check, Save } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface CodeEditorProps {
  fileName: string;
  code: string;
  onChangeCode: (newCode: string) => void;
  onRunCode: () => void;
  onSaveCode: () => void;
  isArabic: boolean;
  isRunning: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  fileName,
  code,
  onChangeCode,
  onRunCode,
  onSaveCode,
  isArabic,
  isRunning,
}) => {
  const { isDark } = useTheme();
  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative" dir="ltr">
      {/* Editor Header Bar */}
      <div
        className={`px-3 py-1.5 border-b flex items-center justify-between text-xs font-mono shrink-0 ${
          isDark ? 'bg-[#141624] border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
        }`}
      >
        <span className="font-bold truncate text-cyan-400">{fileName}</span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className={`p-1 rounded border transition ${
              isDark ? 'border-white/10 hover:bg-white/10 text-slate-300' : 'border-slate-200 hover:bg-white text-slate-700'
            }`}
            title={isArabic ? 'نسخ الكود' : 'Copy code'}
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onSaveCode}
            className={`p-1 rounded border transition ${
              isDark ? 'border-white/10 hover:bg-white/10 text-cyan-300' : 'border-slate-200 hover:bg-white text-cyan-700'
            }`}
            title={isArabic ? 'حفظ التغييرات' : 'Save changes'}
          >
            <Save className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onRunCode}
            disabled={isRunning}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow-xs disabled:opacity-50"
            title={isArabic ? 'تشغيل الكود الآن' : 'Run code'}
          >
            <Play className="w-3 h-3 fill-white" />
            <span>{isArabic ? 'تشغيل' : 'Run'}</span>
          </button>
        </div>
      </div>

      {/* Code Textarea / Editor */}
      <textarea
        value={code}
        onChange={(e) => onChangeCode(e.target.value)}
        spellCheck={false}
        className={`flex-1 w-full p-3 font-mono text-xs sm:text-sm resize-none focus:outline-hidden leading-relaxed ${
          isDark ? 'bg-[#0c0e14] text-slate-100 placeholder-slate-600' : 'bg-white text-slate-900 placeholder-slate-400'
        }`}
        placeholder="# Write your Python code here..."
      />
    </div>
  );
};
