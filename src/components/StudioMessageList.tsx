import React, { useState, useMemo } from 'react';
import {
  Eye,
  Download,
  Code,
  Check,
  Maximize2,
  Sparkles,
  Copy,
  Play,
  Terminal,
  Cpu,
  Globe,
  Folder,
  ExternalLink,
  FileCode,
} from 'lucide-react';
import { AIChatMessage, TelegramStorageFile } from '../types';
import { downloadFilesAsZip } from '../utils/zipUtils';
import { useTheme } from '../context/ThemeContext';
import { executePythonUniversal } from '../utils/pythonRunner';

interface StudioMessageListProps {
  messages: AIChatMessage[];
  isLoading: boolean;
  onOpenFile: (file: TelegramStorageFile) => void;
  isArabic?: boolean;
  onStopGenerating?: () => void;
  onToggleDialogueLoop?: (msgId: string) => void;
  onSendDialogueInterjection?: (msgId: string, text: string) => void;
  onTriggerDialogueNextTurn?: (msgId: string) => void;
  onStopDialogueLoop?: (msgId: string) => void;
  onOpenTerminalSandbox?: (code?: string, fileName?: string) => void;
}

const isImageFile = (file: TelegramStorageFile): boolean => {
  if (file.type === 'image') return true;
  if (/\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i.test(file.name)) return true;
  if (
    typeof file.content === 'string' &&
    (file.content.startsWith('data:image/') || file.content.trim().startsWith('<svg'))
  ) {
    return true;
  }
  return false;
};

const getImageSource = (file: TelegramStorageFile): string => {
  if (typeof file.content === 'string') {
    if (
      file.content.startsWith('data:image/') ||
      file.content.startsWith('http://') ||
      file.content.startsWith('https://') ||
      file.content.startsWith('/')
    ) {
      return file.content;
    }
    if (file.name.toLowerCase().endsWith('.svg') || file.content.trim().startsWith('<svg')) {
      return `data:image/svg+xml;utf8,${encodeURIComponent(file.content)}`;
    }
  }
  return file.content;
};

const formatSize = (bytes: number) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// Python code analyzer to extract variables and identifiers for distinct breakdown
const analyzePython = (code: string) => {
  const vars = new Set<string>();
  const funcs = new Set<string>();
  const imports = new Set<string>();

  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const imp = trimmed.match(/^(?:import|from)\s+([a-zA-Z0-9_.]+)/);
    if (imp) imports.add(imp[1]);

    const fn = trimmed.match(/^def\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (fn) funcs.add(fn[1]);

    const vr = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=[^=]/);
    if (vr && !['if', 'elif', 'for', 'while', 'def', 'class', 'return'].includes(vr[1])) {
      vars.add(vr[1]);
    }
  }

  return {
    vars: Array.from(vars).slice(0, 8),
    funcs: Array.from(funcs).slice(0, 6),
    imports: Array.from(imports).slice(0, 6),
    totalLines: lines.length,
  };
};

// C++ code analyzer to extract libraries, functions and memory types
const analyzeCpp = (code: string) => {
  const includes = new Set<string>();
  const funcs = new Set<string>();

  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const inc = trimmed.match(/^#include\s+<([^>]+)>/);
    if (inc) includes.add(inc[1]);

    const fn = trimmed.match(/^(?:int|void|float|double|bool|string|auto)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
    if (fn) funcs.add(fn[1]);
  }

  return {
    includes: Array.from(includes),
    funcs: Array.from(funcs),
    totalLines: lines.length,
  };
};

interface CodeBlockCardProps {
  language: string;
  code: string;
  blockIndex: number;
  messageId: string;
  isArabic: boolean;
  isDark: boolean;
  onOpenFile: (file: TelegramStorageFile) => void;
  onOpenTerminalSandbox?: (code?: string, fileName?: string) => void;
}

const CodeBlockCardComponent: React.FC<CodeBlockCardProps> = ({
  language,
  code,
  blockIndex,
  messageId,
  isArabic,
  isDark,
  onOpenFile,
  onOpenTerminalSandbox,
}) => {
  const [copied, setCopied] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [execResult, setExecResult] = useState<{
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTimeMs: number;
  } | null>(null);

  const langLower = (language || 'text').toLowerCase();

  const isHtml = langLower === 'html' || langLower === 'htm';
  const isPython = langLower === 'python' || langLower === 'py';
  const isCpp = langLower === 'cpp' || langLower === 'c++' || langLower === 'c';
  const isJs = langLower === 'javascript' || langLower === 'js' || langLower === 'ts';
  const isCurl = code.trim().startsWith('curl ') || langLower === 'curl';
  const isBash = langLower === 'bash' || langLower === 'sh' || langLower === 'shell';
  const canRunCloud = isPython || isCurl || isBash;

  const ext = isHtml ? 'html' : isPython ? 'py' : isCpp ? 'cpp' : isJs ? 'js' : isCurl || isBash ? 'sh' : 'txt';
  const filename = isHtml
    ? 'index.html'
    : isPython
    ? 'main.py'
    : isCpp
    ? 'main.cpp'
    : isCurl || isBash
    ? 'request.sh'
    : `code_${blockIndex + 1}.${ext}`;

  const langLabel = isHtml
    ? 'HTML5 Platform'
    : isPython
    ? 'Python 3'
    : isCpp
    ? 'C++ 20'
    : isJs
    ? 'JavaScript'
    : isCurl
    ? 'cURL Request'
    : isBash
    ? 'Bash Shell'
    : language.toUpperCase();

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteBackend = async () => {
    setIsExecuting(true);
    try {
      if (!isCurl) {
        const json = await executePythonUniversal(code.trim());
        setExecResult({
          stdout: json.stdout || '',
          stderr: json.stderr || '',
          exitCode: json.exitCode ?? 0,
          executionTimeMs: json.executionTimeMs ?? 0,
        });
      } else {
        const payload = { type: 'curl', command: code.trim() };
        const res = await fetch('/api/tools/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const text = await res.text();
        let json: any = null;
        try {
          json = JSON.parse(text);
        } catch {}
        if (json) {
          setExecResult({
            stdout: json.stdout || '',
            stderr: json.stderr || '',
            exitCode: json.exitCode ?? 0,
            executionTimeMs: json.executionTimeMs ?? 0,
          });
        } else {
          setExecResult({
            stdout: text || '',
            stderr: res.ok ? '' : `HTTP ${res.status}: ${res.statusText}`,
            exitCode: res.ok ? 0 : 1,
            executionTimeMs: 0,
          });
        }
      }
    } catch (err: any) {
      setExecResult({
        stdout: '',
        stderr: err.message || 'Error executing command',
        exitCode: 1,
        executionTimeMs: 0,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRunLive = () => {
    const virtualFile: TelegramStorageFile = {
      id: `virtual-${messageId}-${blockIndex}`,
      name: filename,
      type: isHtml ? 'html' : isPython ? 'python' : isCpp ? 'cpp' : 'text',
      sizeBytes: code.length,
      content: code,
      createdAt: new Date().toISOString(),
      createdBy: 'ai',
      category: isHtml ? 'web' : 'code',
      description: isArabic ? 'معاينة مباشرة من رد SudaMode V1.0' : 'Live preview from SudaMode V1.0 response',
    };
    onOpenFile(virtualFile);
  };

  const pythonInfo = useMemo(() => (isPython ? analyzePython(code) : null), [isPython, code]);
  const cppInfo = useMemo(() => (isCpp ? analyzeCpp(code) : null), [isCpp, code]);
  const { lineCount, lineNumbersText } = useMemo(() => {
    const splitLines = code.split('\n');
    const count = splitLines.length;
    const nums = Array.from({ length: count }, (_, i) => (i + 1).toString().padStart(2, '0')).join('\n');
    return { lineCount: count, lineNumbersText: nums };
  }, [code]);

  return (
    <div
      className={`suda-card-perf w-full my-3 rounded-2xl overflow-hidden border shadow-lg text-left select-text transition-colors ${
        isDark ? 'border-white/10 bg-[#121318]' : 'border-slate-200 bg-white shadow-slate-200/60'
      }`}
    >
      {/* Code Header Bar */}
      <div
        className={`flex items-center justify-between px-3.5 py-2.5 border-b text-xs ${
          isDark ? 'bg-[#181a22] border-white/[0.08]' : 'bg-slate-100/90 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-6 h-6 rounded-lg border flex items-center justify-center font-mono text-[11px] shrink-0 ${
              isDark
                ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                : 'bg-cyan-50 border-cyan-300 text-cyan-700'
            }`}
          >
            {isHtml ? (
              <Globe className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            ) : isPython ? (
              '🐍'
            ) : isCpp ? (
              '⚙️'
            ) : (
              <Code className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            )}
          </div>
          <span className={`font-mono font-bold tracking-wide text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            {langLabel}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
              isDark
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30'
                : 'bg-cyan-50 text-cyan-700 border-cyan-300'
            }`}
          >
            .{ext}
          </span>
          <span className="text-slate-500 text-[10px] hidden sm:inline">
            ({lineCount} {isArabic ? 'أسطر' : 'lines'})
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Autonomous Cloud Execution Button for Python & cURL / Bash */}
          {canRunCloud && (
            <button
              onClick={handleExecuteBackend}
              disabled={isExecuting}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition active:scale-95 shadow-xs ${
                isExecuting
                  ? isDark
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'bg-cyan-50 border-cyan-300 text-cyan-700'
                  : isDark
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border-amber-500/40 text-amber-300'
                  : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800'
              }`}
              title={isArabic ? 'تشغيل الكود سحابياً في سيرفر SudaStack' : 'Run in cloud sandbox'}
            >
              {isExecuting ? (
                <span className="w-3 h-3 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
              ) : (
                <Play className={`w-3 h-3 ${isDark ? 'fill-amber-400' : 'fill-amber-600'}`} />
              )}
              <span>
                {isExecuting
                  ? isArabic
                    ? 'جاري التنفيذ...'
                    : 'Running...'
                  : isArabic
                  ? 'تشغيل سحابي'
                  : 'Run Cloud'}
              </span>
            </button>
          )}

          {/* Open in Terminal & Python Sandbox */}
          {onOpenTerminalSandbox && (isPython || isBash) && (
            <button
              onClick={() => onOpenTerminalSandbox(code, filename)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition active:scale-95 shadow-xs ${
                isDark
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300'
                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
              }`}
              title={isArabic ? 'فتح في ساندبوكس بايثون ومشغل الطرفية السحابية' : 'Open in Python Sandbox & Terminal'}
            >
              <Terminal className="w-3 h-3 text-emerald-400" />
              <span>{isArabic ? 'الطرفية' : 'Terminal'}</span>
            </button>
          )}

          {/* Quick Run / Preview button for HTML */}
          {isHtml && (
            <button
              onClick={handleRunLive}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-[11px] transition active:scale-95 shadow-xs"
              title={isArabic ? 'معاينة وتشغيل مباشر' : 'Run Live'}
            >
              <Play className="w-3 h-3 fill-black" />
              <span>{isArabic ? 'تشغيل ومعاينة' : 'Run Live'}</span>
            </button>
          )}

          {/* Copy Code button */}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition active:scale-95 ${
              copied
                ? isDark
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : isDark
                ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-950'
            }`}
            title={isArabic ? 'نسخ الكود' : 'Copy Code'}
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? (isArabic ? 'تم النسخ!' : 'Copied!') : (isArabic ? 'نسخ الكود' : 'Copy')}</span>
          </button>
        </div>
      </div>

      {/* Code Content with Single-Node Line Numbers Gutter for Ultra-Fast DOM Performance */}
      <div
        className={`flex overflow-x-auto font-mono text-[12.5px] leading-relaxed max-h-[380px] ${
          isDark ? 'bg-[#0c0d11]' : 'bg-slate-50/80'
        }`}
      >
        <pre
          aria-hidden="true"
          className={`select-none py-3 px-3 border-r text-right font-mono min-w-[42px] shrink-0 leading-6 text-[11px] m-0 ${
            isDark ? 'bg-[#101117] border-white/[0.06] text-slate-500' : 'bg-slate-100/90 border-slate-200 text-slate-400'
          }`}
        >
          {lineNumbersText}
        </pre>

        {/* Code Text */}
        <pre
          className={`flex-1 py-3 px-4 overflow-visible whitespace-pre font-mono leading-6 m-0 ${
            isDark ? 'text-cyan-100' : 'text-slate-800'
          }`}
        >
          {code}
        </pre>
      </div>

      {/* Live Cloud Execution Output Drawer */}
      {execResult && (
        <div
          className={`p-3 border-t text-xs font-mono ${
            isDark ? 'bg-[#0a0b0e] border-cyan-500/30' : 'bg-slate-100 border-cyan-300'
          }`}
        >
          <div
            className={`flex items-center justify-between text-[11px] mb-2 pb-1.5 border-b ${
              isDark ? 'text-slate-400 border-white/10' : 'text-slate-600 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  execResult.exitCode === 0 ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
              <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {isArabic ? 'مخرجات التنفيذ السحابي المباشر:' : 'Cloud Execution Output:'}
              </span>
              <span className={`font-mono ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                ({execResult.executionTimeMs}ms • Exit {execResult.exitCode})
              </span>
            </div>
            <button
              onClick={() => setExecResult(null)}
              className={`px-1.5 py-0.5 rounded transition ${
                isDark
                  ? 'text-slate-400 hover:text-white bg-white/5 hover:bg-white/10'
                  : 'text-slate-500 hover:text-slate-900 bg-slate-200/70 hover:bg-slate-300'
              }`}
              title={isArabic ? 'إغلاق المخرجات' : 'Close'}
            >
              ✕
            </button>
          </div>
          <pre
            className={`p-2.5 rounded-lg border overflow-x-auto max-h-48 whitespace-pre-wrap leading-relaxed select-text ${
              isDark
                ? 'text-slate-200 bg-black/60 border-white/5'
                : 'text-slate-800 bg-white border-slate-200'
            }`}
            dir="ltr"
          >
            {execResult.stdout ||
              execResult.stderr ||
              (isArabic ? '(تم التنفيذ بنجاح بدون مخرجات نصية)' : '(Executed successfully without output)')}
          </pre>
        </div>
      )}

      {/* Specialized Language Breakdown Boxes */}
      {isPython && pythonInfo && (
        <div
          className={`p-3 border-t text-xs space-y-2 ${
            isDark ? 'bg-[#161822] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between font-bold text-[11px]">
            <span className={`flex items-center gap-1.5 ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
              <Cpu className="w-3.5 h-3.5" />
              {isArabic ? 'معرفات ومكونات ملف Python (.py):' : 'Python (.py) Identifiers & Components:'}
            </span>
            <span className="text-slate-500 text-[10px] font-mono">{pythonInfo.totalLines} lines</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            {/* Variables Box */}
            <div
              className={`p-2 rounded-xl border ${
                isDark ? 'bg-slate-900/80 border-white/5' : 'bg-white border-slate-200'
              }`}
            >
              <span className={`text-[10px] block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isArabic ? 'المتغيرات (Variables):' : 'Variables:'}
              </span>
              <div className="flex flex-wrap gap-1">
                {pythonInfo.vars.length > 0 ? (
                  pythonInfo.vars.map((v, i) => (
                    <span
                      key={i}
                      className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${
                        isDark
                          ? 'bg-cyan-950/70 border-cyan-500/30 text-cyan-300'
                          : 'bg-cyan-50 border-cyan-200 text-cyan-800'
                      }`}
                    >
                      {v}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 text-[10px]">{isArabic ? 'متغيرات ضمنية' : 'Dynamic vars'}</span>
                )}
              </div>
            </div>

            {/* Functions Box */}
            <div
              className={`p-2 rounded-xl border ${
                isDark ? 'bg-slate-900/80 border-white/5' : 'bg-white border-slate-200'
              }`}
            >
              <span className={`text-[10px] block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isArabic ? 'الدوال (Functions):' : 'Functions:'}
              </span>
              <div className="flex flex-wrap gap-1">
                {pythonInfo.funcs.length > 0 ? (
                  pythonInfo.funcs.map((f, i) => (
                    <span
                      key={i}
                      className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${
                        isDark
                          ? 'bg-purple-950/70 border-purple-500/30 text-purple-300'
                          : 'bg-purple-50 border-purple-200 text-purple-800'
                      }`}
                    >
                      {f}()
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 text-[10px]">{isArabic ? 'سكريبت متسلسل' : 'Sequential script'}</span>
                )}
              </div>
            </div>

            {/* Imports Box */}
            <div
              className={`p-2 rounded-xl border ${
                isDark ? 'bg-slate-900/80 border-white/5' : 'bg-white border-slate-200'
              }`}
            >
              <span className={`text-[10px] block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isArabic ? 'المكتبات (Modules):' : 'Modules:'}
              </span>
              <div className="flex flex-wrap gap-1">
                {pythonInfo.imports.length > 0 ? (
                  pythonInfo.imports.map((im, i) => (
                    <span
                      key={i}
                      className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${
                        isDark
                          ? 'bg-emerald-950/70 border-emerald-500/30 text-emerald-300'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}
                    >
                      {im}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 text-[10px]">built-in</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isCpp && cppInfo && (
        <div
          className={`p-3 border-t text-xs space-y-2 ${
            isDark ? 'bg-[#161822] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between font-bold text-[11px]">
            <span className={`flex items-center gap-1.5 ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
              <Terminal className="w-3.5 h-3.5" />
              {isArabic ? 'هيكلية ملف C++ (.cpp) والأسطر:' : 'C++ (.cpp) Structure & Lines:'}
            </span>
            <span className="text-slate-500 text-[10px] font-mono">{cppInfo.totalLines} lines</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            {/* Includes */}
            <div
              className={`p-2 rounded-xl border ${
                isDark ? 'bg-slate-900/80 border-white/5' : 'bg-white border-slate-200'
              }`}
            >
              <span className={`text-[10px] block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isArabic ? 'المكتبات المستدعاة (#include):' : 'Headers:'}
              </span>
              <div className="flex flex-wrap gap-1">
                {cppInfo.includes.map((inc, i) => (
                  <span
                    key={i}
                    className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${
                      isDark
                        ? 'bg-blue-950/70 border-blue-500/30 text-blue-300'
                        : 'bg-blue-50 border-blue-200 text-blue-800'
                    }`}
                  >
                    &lt;{inc}&gt;
                  </span>
                ))}
              </div>
            </div>

            {/* Compilation hint */}
            <div
              className={`p-2 rounded-xl border flex flex-col justify-center ${
                isDark ? 'bg-slate-900/80 border-white/5' : 'bg-white border-slate-200'
              }`}
            >
              <span className={`text-[10px] block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isArabic ? 'أمر البناء والتنفيذ (g++):' : 'Compilation Command:'}
              </span>
              <code
                className={`font-mono text-[10px] px-2 py-1 rounded ${
                  isDark ? 'text-cyan-300 bg-black/40' : 'text-cyan-800 bg-slate-100'
                }`}
              >
                g++ -O3 main.cpp -o app &amp;&amp; ./app
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CodeBlockCard = React.memo(CodeBlockCardComponent);

interface ProjectMessageCardProps {
  folderName: string;
  files: TelegramStorageFile[];
  isDark: boolean;
  isArabic: boolean;
  onOpenFile: (file: TelegramStorageFile) => void;
  onOpenTerminalSandbox?: (code?: string, fileName?: string) => void;
}

const ProjectMessageCard: React.FC<ProjectMessageCardProps> = ({
  folderName,
  files,
  isDark,
  isArabic,
  onOpenFile,
  onOpenTerminalSandbox,
}) => {
  const [selectedSubfolder, setSelectedSubfolder] = useState<string>('all');

  const subfolders = useMemo(() => {
    const s = new Set<string>();
    files.forEach((f) => {
      if (f.subfolder) s.add(f.subfolder);
    });
    return Array.from(s).sort();
  }, [files]);

  const displayedFiles = useMemo(() => {
    if (selectedSubfolder === 'all') return files;
    if (selectedSubfolder === '__root__') return files.filter((f) => !f.subfolder);
    return files.filter((f) => f.subfolder === selectedSubfolder);
  }, [files, selectedSubfolder]);

  const procfileFile = files.find((f) => f.name.toLowerCase() === 'procfile');
  const runtimeFile = files.find((f) => f.name.toLowerCase() === 'runtime.txt');
  const mainPyFile =
    files.find((f) => f.name.toLowerCase() === 'main.py' || f.isProjectMain) ||
    files.find((f) => f.type === 'python' || f.name.endsWith('.py'));

  const isPythonProject =
    Boolean(procfileFile) ||
    Boolean(runtimeFile) ||
    files.some((f) => f.type === 'python' || f.name.endsWith('.py'));

  const procfileCmd = procfileFile?.content
    ? procfileFile.content.split('\n')[0].replace(/^worker:\s*/i, '').replace(/^web:\s*/i, '').trim()
    : 'python main.py';

  const runtimeVersion = runtimeFile?.content?.trim() || 'python-3.10.12';

  return (
    <div
      className={`p-3 sm:p-4 rounded-2xl border shadow-md space-y-2.5 transition text-xs ${
        isDark
          ? 'bg-gradient-to-b from-[#141620] to-[#0d0f16] border-cyan-500/30 text-slate-200'
          : 'bg-cyan-50/70 border-cyan-300 text-slate-800'
      }`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-bold text-sm shrink-0">
            {isPythonProject ? '🐍' : '📁'}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate flex items-center gap-1.5 font-mono">
              <span className={isDark ? 'text-white' : 'text-slate-900'}>{folderName}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-sans bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                {isPythonProject ? 'مشروع Python' : 'مشروع متكامل'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {files.length} {isArabic ? 'ملف' : 'files'}
              {subfolders.length > 0 && ` • ${subfolders.length} ${isArabic ? 'مجلدات فرعية' : 'subfolders'}`}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {mainPyFile && (
            <button
              type="button"
              onClick={() => onOpenFile(mainPyFile)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] transition active:scale-95 shadow-xs"
              title={isArabic ? 'تشغيل ومعاينة المشروع فوراً' : 'Run project'}
            >
              <Play className="w-3 h-3 fill-black" />
              <span>{isArabic ? '⚡ تشغيل تلقائي' : '⚡ Auto Run'}</span>
            </button>
          )}

          {onOpenTerminalSandbox && mainPyFile && (
            <button
              type="button"
              onClick={() => onOpenTerminalSandbox(mainPyFile.content, mainPyFile.name)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
              title={isArabic ? 'فتح في الطرفية' : 'Open in CLI'}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          )}

          <button
            type="button"
            onClick={() => downloadFilesAsZip(files, folderName)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition"
            title={isArabic ? 'تحميل المشروع مضغوط ZIP' : 'Download ZIP'}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Config Badges */}
      {isPythonProject && (
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
            ⚡ Procfile: {procfileCmd}
          </span>
          <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">
            🐍 {runtimeVersion}
          </span>
          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
            📦 requirements.txt
          </span>
        </div>
      )}

      {/* Subfolder Navigation Chips (e.g. mubarak/assets, mubarak/image) */}
      {subfolders.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pt-1 border-t border-white/5" dir="ltr">
          <button
            type="button"
            onClick={() => setSelectedSubfolder('all')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition shrink-0 border ${
              selectedSubfolder === 'all'
                ? 'bg-cyan-500 text-black font-extrabold border-cyan-400'
                : isDark
                ? 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
          >
            {isArabic ? `الكل (${files.length})` : `All (${files.length})`}
          </button>
          <button
            type="button"
            onClick={() => setSelectedSubfolder('__root__')}
            className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition shrink-0 border ${
              selectedSubfolder === '__root__'
                ? 'bg-cyan-500 text-black font-extrabold border-cyan-400'
                : isDark
                ? 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
            }`}
          >
            📁 {folderName}/
          </button>
          {subfolders.map((sf) => {
            const count = files.filter((f) => f.subfolder === sf).length;
            const isSelected = selectedSubfolder === sf;
            return (
              <button
                key={sf}
                type="button"
                onClick={() => setSelectedSubfolder(sf)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono transition shrink-0 border ${
                  isSelected
                    ? 'bg-cyan-500 text-black font-extrabold border-cyan-400'
                    : isDark
                    ? 'bg-white/5 text-slate-400 border-white/5 hover:text-white'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900'
                }`}
                title={`الانتقال إلى مجلد ${folderName}/${sf}`}
              >
                <span>📂</span>
                <span>
                  {folderName}/{sf}
                </span>
                <span className="text-[9px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Files List Inside Project */}
      <div className="flex flex-wrap gap-1 pt-1" dir="ltr">
        {displayedFiles.map((file) => {
          const isPy = file.type === 'python' || file.name.endsWith('.py');
          const isProc = file.name.toLowerCase() === 'procfile';
          const isReq = file.name.toLowerCase() === 'requirements.txt';
          const isRun = file.name.toLowerCase() === 'runtime.txt';
          const isImg =
            file.type === 'image' ||
            /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(file.name);

          const icon = isPy
            ? '🐍'
            : isProc
            ? '⚡'
            : isReq
            ? '📦'
            : isRun
            ? '⚙️'
            : isImg
            ? '🖼️'
            : file.type === 'html'
            ? '🌐'
            : file.type === 'css'
            ? '🎨'
            : file.type === 'javascript'
            ? '⚡'
            : file.type === 'json'
            ? '{ }'
            : '📄';

          const label =
            file.subfolder && selectedSubfolder === 'all'
              ? `${file.subfolder}/${file.name}`
              : file.name;

          return (
            <button
              key={file.id}
              type="button"
              onClick={() => onOpenFile(file)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-mono transition ${
                isDark
                  ? 'bg-black/40 hover:bg-cyan-950/60 border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300'
                  : 'bg-white hover:bg-cyan-50 border-slate-200 hover:border-cyan-300 text-slate-700 hover:text-cyan-800'
              }`}
              title={file.path || file.name}
            >
              <span>{icon}</span>
              <span className="truncate max-w-[170px]">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Inline formatter that turns markdown links, bare URLs, `code`, 'quotes', "quotes", **bold**, and handles into styled components
const renderInlineFormatted = (text: string, keyPrefix: string, isDark: boolean) => {
  const regex =
    /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>"'()]+|@[a-zA-Z0-9_\u0600-\u06FF]+|`[^`]+`|\*\*[^*]+\*\*|‘[^’]+’|“[^”]+”|«[^»]+»|'[^']+'|"[^"]+")/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;
    const k = `${keyPrefix}-${i}`;

    // 1. Markdown Links [label](https://...)
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (match) {
        const rawLabel = match[1].trim();
        const url = match[2].trim();
        const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(url);

        let displayLabel = rawLabel;
        try {
          if (displayLabel.includes('%')) {
            displayLabel = decodeURIComponent(displayLabel);
          }
        } catch {}

        if (displayLabel.startsWith('http://') || displayLabel.startsWith('https://')) {
          if (isYouTube) {
            const queryMatch = displayLabel.match(/[?&]search_query=([^&]+)/i);
            if (queryMatch) {
              try {
                displayLabel = `البحث عن: "${decodeURIComponent(queryMatch[1].replace(/\+/g, ' '))}"`;
              } catch {
                displayLabel = 'مشاهدة النتائج على YouTube';
              }
            } else {
              displayLabel = 'فتح الرابط على YouTube';
            }
          } else {
            try {
              const u = new URL(displayLabel);
              displayLabel = `${u.hostname}${u.pathname.length > 1 ? u.pathname.slice(0, 20) + '...' : ''}`;
            } catch {
              displayLabel = 'زيارة الموقع';
            }
          }
        }

        if (isYouTube) {
          return (
            <a
              key={k}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`mx-1 my-0.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border font-medium text-xs sm:text-[13px] shadow-xs transition-all group/yt no-underline ${
                isDark
                  ? 'bg-red-600/15 hover:bg-red-600/25 border-red-500/40 text-red-300 hover:text-white'
                  : 'bg-red-50 hover:bg-red-100 border-red-300 text-red-700 hover:text-red-900'
              }`}
              title={`فتح في YouTube: ${displayLabel}`}
            >
              <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover/yt:scale-110 transition-transform">
                <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
              </span>
              <span className="font-semibold underline decoration-red-400/40 underline-offset-2">{displayLabel}</span>
              <ExternalLink className="w-3 h-3 text-red-500 opacity-70 group-hover/yt:opacity-100" />
            </a>
          );
        }

        return (
          <a
            key={k}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`mx-1 my-0.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border font-medium text-xs sm:text-[13px] shadow-xs transition-all group/link no-underline ${
              isDark
                ? 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/40 text-cyan-300 hover:text-white'
                : 'bg-cyan-50 hover:bg-cyan-100 border-cyan-300 text-cyan-800 hover:text-cyan-950'
            }`}
            title={`فتح الرابط: ${url}`}
          >
            <Globe className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <span className="font-semibold underline decoration-cyan-400/40 underline-offset-2">{displayLabel}</span>
            <ExternalLink className={`w-3 h-3 opacity-70 group-hover/link:opacity-100 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
          </a>
        );
      }
    }

    // 2. Bare URLs https://...
    if (/^https?:\/\//i.test(part)) {
      const url = part.trim();
      const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(url);
      let displayUrl = url;
      try {
        displayUrl = decodeURIComponent(url);
      } catch {}

      let shortText = displayUrl;
      if (shortText.length > 50) {
        shortText = shortText.slice(0, 48) + '...';
      }

      if (isYouTube) {
        return (
          <a
            key={k}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`mx-1 my-0.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border font-medium text-xs sm:text-[13px] shadow-xs transition-all group/yt no-underline ${
              isDark
                ? 'bg-red-600/15 hover:bg-red-600/25 border-red-500/40 text-red-300 hover:text-white'
                : 'bg-red-50 hover:bg-red-100 border-red-300 text-red-700 hover:text-red-900'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover/yt:scale-110 transition-transform">
              <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
            </span>
            <span className="font-mono text-xs underline decoration-red-400/40 underline-offset-2">{shortText}</span>
            <ExternalLink className="w-3 h-3 text-red-500 opacity-70" />
          </a>
        );
      }

      return (
        <a
          key={k}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`mx-1 my-0.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border font-medium text-xs sm:text-[13px] shadow-xs transition-all no-underline ${
            isDark
              ? 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/40 text-cyan-300 hover:text-white'
              : 'bg-cyan-50 hover:bg-cyan-100 border-cyan-300 text-cyan-800 hover:text-cyan-950'
          }`}
        >
          <Globe className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
          <span className="font-mono text-xs underline decoration-cyan-400/40 underline-offset-2">{shortText}</span>
          <ExternalLink className={`w-3 h-3 opacity-70 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
        </a>
      );
    }

    // 3. User or channel handles @name
    if (part.startsWith('@') && part.length > 2) {
      return (
        <span
          key={k}
          className={`mx-1 px-2.5 py-0.5 rounded-lg border font-bold text-xs sm:text-[13px] inline-flex items-center gap-1 shadow-xs ${
            isDark
              ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
              : 'bg-indigo-50 border-indigo-200 text-indigo-700'
          }`}
        >
          <span className="text-indigo-500 font-mono">@</span>
          <span>{part.slice(1)}</span>
        </span>
      );
    }

    // 4. Inline code `...`
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={k}
          className={`mx-1 px-2 py-0.5 rounded-md border font-mono text-xs font-semibold inline-block shadow-xs ${
            isDark
              ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
              : 'bg-cyan-50 border-cyan-300 text-cyan-800'
          }`}
        >
          {inner}
        </code>
      );
    }

    // 5. Single quotes '...' or ‘...’ - Explanatory keyword
    if (
      (part.startsWith("'") && part.endsWith("'") && part.length > 2) ||
      (part.startsWith('‘') && part.endsWith('’') && part.length > 2)
    ) {
      const inner = part.slice(1, -1);
      return (
        <span
          key={k}
          className={`mx-1 px-2.5 py-0.5 rounded-lg border font-semibold text-xs sm:text-[13px] inline-flex items-center gap-1 shadow-xs transition-colors ${
            isDark
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
              : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
          }`}
          title="كلمة موضحة"
        >
          <span className="text-amber-500 font-mono select-none text-[12px]">‘</span>
          <span className="tracking-wide underline decoration-amber-400/40 underline-offset-2">{inner}</span>
          <span className="text-amber-500 font-mono select-none text-[12px]">’</span>
        </span>
      );
    }

    // 6. Double quotes "..." or “...” or «...» - Distinct quoted term
    if (
      (part.startsWith('"') && part.endsWith('"') && part.length > 2) ||
      (part.startsWith('“') && part.endsWith('”') && part.length > 2) ||
      (part.startsWith('«') && part.endsWith('»') && part.length > 2)
    ) {
      const inner = part.slice(1, -1);
      return (
        <span
          key={k}
          className={`mx-1 px-2.5 py-0.5 rounded-lg border font-semibold text-xs sm:text-[13px] inline-flex items-center gap-1 shadow-xs transition-colors ${
            isDark
              ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 hover:bg-purple-500/25'
              : 'bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100'
          }`}
          title="مصطلح مقتبس"
        >
          <span className="text-purple-500 font-mono select-none text-[12px]">“</span>
          <span className="tracking-wide">{inner}</span>
          <span className="text-purple-500 font-mono select-none text-[12px]">”</span>
        </span>
      );
    }

    // 7. Bold **...**
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      const inner = part.slice(2, -2);
      return (
        <strong key={k} className={`font-bold mx-0.5 tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {inner}
        </strong>
      );
    }

    return <React.Fragment key={k}>{part}</React.Fragment>;
  });
};

interface RichTextRendererProps {
  content: string;
  isArabic: boolean;
  isDark: boolean;
}

const RichTextRendererComponent: React.FC<RichTextRendererProps> = ({ content, isArabic, isDark }) => {
  const sanitizedContent = (content || '')
    .replace(/\[(?:TASK_COMPLETE|مكتمل|تم إنجاز المهمة|انتهت المهمة|DONE)\]/gi, '')
    .trim();

  const lines = sanitizedContent.split('\n');
  const elements: React.ReactNode[] = [];

  let currentNumberedList: Array<{ num: string; lines: string[] }> = [];

  const flushNumberedList = (keyIdx: number) => {
    if (currentNumberedList.length === 0) return;

    const items = [...currentNumberedList];
    currentNumberedList = [];

    elements.push(
      <div key={`nlist-${keyIdx}`} dir="rtl" className="space-y-3 my-4 w-full text-right">
        {items.map((item, itemIdx) => {
          const firstLine = item.lines[0] || '';
          const subLines = item.lines.slice(1);

          const titleMatch = firstLine.match(/^\*\*([^*]+)\*\*:?\s*(.*)$/);
          let badgeType = 'default';
          let title = '';
          let rest = firstLine;

          if (titleMatch) {
            title = titleMatch[1].trim();
            rest = titleMatch[2];
            const lower = title.toLowerCase();
            if (lower === 'html') badgeType = 'html';
            else if (lower === 'css') badgeType = 'css';
            else if (lower === 'javascript' || lower === 'js') badgeType = 'js';
            else if (lower === 'python' || lower === 'py') badgeType = 'py';
            else if (lower === 'c++' || lower === 'cpp') badgeType = 'cpp';
            else if (lower.includes('يوتيوب') || lower.includes('youtube')) badgeType = 'youtube';
          }

          const badgeStyles = {
            html: isDark
              ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
              : 'bg-orange-50 text-orange-700 border-orange-300',
            css: isDark
              ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
              : 'bg-sky-50 text-sky-700 border-sky-300',
            js: isDark
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              : 'bg-amber-50 text-amber-800 border-amber-300',
            py: isDark
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              : 'bg-emerald-50 text-emerald-700 border-emerald-300',
            cpp: isDark
              ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
              : 'bg-indigo-50 text-indigo-700 border-indigo-300',
            youtube: isDark
              ? 'bg-red-500/20 text-red-400 border-red-500/40'
              : 'bg-red-50 text-red-700 border-red-300',
            default: isDark
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-cyan-50 text-cyan-800 border-cyan-300',
          }[badgeType];

          return (
            <div
              key={`nl-item-${itemIdx}`}
              dir="rtl"
              className={`p-4 sm:p-4.5 rounded-2xl border transition-all flex items-start gap-3.5 shadow-sm group/item text-right ${
                isDark
                  ? 'bg-gradient-to-r from-[#14151e] via-[#161824] to-[#12131b] border-white/[0.09] hover:border-cyan-500/40'
                  : 'bg-slate-50/90 border-slate-200 hover:border-cyan-400'
              }`}
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl border flex items-center justify-center font-mono text-xs sm:text-sm font-bold shrink-0 mt-0.5 shadow-xs transition-colors ${
                  isDark
                    ? 'bg-gradient-to-tr from-cyan-600/30 to-blue-600/30 border-cyan-400/40 text-cyan-300 group-hover/item:border-cyan-400'
                    : 'bg-cyan-50 border-cyan-300 text-cyan-700 group-hover/item:border-cyan-500'
                }`}
              >
                {item.num}
              </div>

              <div
                className={`flex-1 text-sm leading-relaxed text-right space-y-2 ${
                  isDark ? 'text-slate-200' : 'text-slate-700'
                }`}
              >
                {title ? (
                  <div className="flex flex-wrap items-baseline gap-2 mb-1 justify-start">
                    <span className={`px-2.5 py-0.5 rounded-md font-bold text-xs border shadow-xs ${badgeStyles}`}>
                      {title}
                    </span>
                    {rest && (
                      <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {renderInlineFormatted(rest, `nl-rest-${itemIdx}`, isDark)}
                      </span>
                    )}
                  </div>
                ) : (
                  <div>{renderInlineFormatted(firstLine, `nl-text-${itemIdx}`, isDark)}</div>
                )}

                {subLines.map((sub, sIdx) => (
                  <div
                    key={sIdx}
                    className={`text-sm leading-relaxed pl-1 pt-1 ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {renderInlineFormatted(sub, `nl-sub-${itemIdx}-${sIdx}`, isDark)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushNumberedList(idx);
      continue;
    }

    // 0. Horizontal divider: --- or *** or ___
    if (/^(?:---+|\*\*\*+|___+)$/.test(trimmed)) {
      flushNumberedList(idx);
      elements.push(
        <div
          key={`hr-${idx}`}
          className={`my-4 h-px w-full bg-gradient-to-r from-transparent ${
            isDark ? 'via-white/20' : 'via-slate-300'
          } to-transparent`}
        />
      );
      continue;
    }

    // Distinctive Headings
    const isHeading =
      /^(#{1,6})\s*(.*)$/.test(trimmed) ||
      trimmed.includes('##') ||
      trimmed.startsWith('###') ||
      (/^\*\*([^*]+)\*\*:?$/.test(trimmed) && trimmed.length < 60) ||
      (/^((?:شرح|كيفية|خطوات|المصطلحات|المفاهيم|طريقة|المتغيرات|المعرفات|الخصائص|المميزات|ملاحظات|ملخص|الشرح|الاستخدام|التنفيذ)\s*[^:]{0,40}:?)$/i.test(
        trimmed
      ) &&
        trimmed.length < 60);

    if (isHeading) {
      flushNumberedList(idx);
      const headingText = trimmed
        .replace(/^#+\s*|\s*#+$/g, '')
        .replace(/^\*\*|\*\*:?$/g, '')
        .replace(/:$/, '')
        .trim();

      const isExplain = headingText.includes('شرح') || headingText.toLowerCase().includes('explain');
      const isUsage =
        headingText.includes('استخدام') ||
        headingText.includes('تشغيل') ||
        headingText.toLowerCase().includes('usage') ||
        headingText.toLowerCase().includes('how to');
      const isVars =
        headingText.includes('متغير') ||
        headingText.includes('معرف') ||
        headingText.toLowerCase().includes('variable');

      elements.push(
        <div
          key={`h-${idx}`}
          dir="rtl"
          className={`flex items-center justify-between gap-3 px-4 py-3 sm:py-3.5 rounded-xl border font-bold my-4 shadow-sm border-r-4 border-r-cyan-500 group/head text-right ${
            isDark
              ? 'border-cyan-500/40 bg-gradient-to-r from-cyan-950/70 via-[#131b28] to-[#11131c] text-cyan-200'
              : 'border-cyan-300 bg-gradient-to-r from-cyan-50 via-sky-50/70 to-white text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-xs transition-colors ${
                isDark
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 group-hover/head:border-cyan-400'
                  : 'bg-cyan-100 border-cyan-300 text-cyan-700 group-hover/head:border-cyan-500'
              }`}
            >
              {isExplain ? (
                <Code className="w-4 h-4" />
              ) : isUsage ? (
                <Play className="w-4 h-4" />
              ) : isVars ? (
                <Cpu className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </div>
            <span
              className={`text-sm sm:text-[15.5px] tracking-wide font-extrabold truncate ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {headingText}
            </span>
          </div>

          <span
            className={`text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-md border shrink-0 font-bold tracking-wider ${
              isDark
                ? 'bg-cyan-400/15 text-cyan-300 border-cyan-400/30'
                : 'bg-cyan-100 text-cyan-800 border-cyan-300'
            }`}
          >
            {isArabic ? 'عنوان مميز' : 'SECTION'}
          </span>
        </div>
      );
      continue;
    }

    // Numbered list items: 1. 2. 3.
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      currentNumberedList.push({
        num: numMatch[1],
        lines: [numMatch[2]],
      });
      continue;
    }

    if (
      currentNumberedList.length > 0 &&
      !isHeading &&
      !trimmed.match(/^[-*]\s+/) &&
      !trimmed.startsWith('✨') &&
      !trimmed.startsWith('📁')
    ) {
      currentNumberedList[currentNumberedList.length - 1].lines.push(trimmed);
      continue;
    }

    flushNumberedList(idx);

    // Confirmation / Notification banner
    if (trimmed.startsWith('✨') || trimmed.startsWith('📁') || trimmed.includes('تمت كتابة الكود')) {
      elements.push(
        <div
          key={`callout-${idx}`}
          dir="rtl"
          className={`p-4 my-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed shadow-xs flex items-start gap-3 text-right ${
            isDark
              ? 'bg-gradient-to-r from-emerald-950/40 via-[#152328] to-[#121a24] border-emerald-500/35 text-emerald-200'
              : 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
          }`}
        >
          <div
            className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
              isDark
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-emerald-100 border-emerald-300 text-emerald-700'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 text-right">
            {renderInlineFormatted(trimmed, `callout-text-${idx}`, isDark)}
          </div>
        </div>
      );
      continue;
    }

    // Bullet points: - or *
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      elements.push(
        <div
          key={`bullet-${idx}`}
          dir="rtl"
          className={`flex items-start gap-2.5 my-2 text-sm pr-2 text-right ${
            isDark ? 'text-slate-200' : 'text-slate-700'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 shrink-0 shadow-xs"></span>
          <div className="flex-1 leading-relaxed text-right">
            {renderInlineFormatted(bulletMatch[1], `bullet-text-${idx}`, isDark)}
          </div>
        </div>
      );
      continue;
    }

    // Standard paragraph
    elements.push(
      <p
        key={`p-${idx}`}
        dir="rtl"
        className={`text-sm sm:text-[14.5px] leading-relaxed my-2 text-right ${
          isDark ? 'text-slate-200' : 'text-slate-700'
        }`}
      >
        {renderInlineFormatted(rawLine, `p-text-${idx}`, isDark)}
      </p>
    );
  }

  flushNumberedList(lines.length);

  return (
    <div dir="rtl" className="space-y-1 w-full text-right">
      {elements}
    </div>
  );
};

const RichTextRenderer = React.memo(RichTextRendererComponent);

interface MessageItemProps {
  msg: AIChatMessage;
  isLoading: boolean;
  isArabic: boolean;
  isDark: boolean;
  copiedMessageId: string | null;
  onCopyMessage: (msgId: string, fullText: string) => void;
  onOpenFile: (file: TelegramStorageFile) => void;
  onStopGenerating?: () => void;
  onToggleDialogueLoop?: (msgId: string) => void;
  onSendDialogueInterjection?: (msgId: string, text: string) => void;
  onTriggerDialogueNextTurn?: (msgId: string) => void;
  onStopDialogueLoop?: (msgId: string) => void;
  onOpenTerminalSandbox?: (code?: string, fileName?: string) => void;
}

const MessageItemComponent: React.FC<MessageItemProps> = ({
  msg,
  isLoading,
  isArabic,
  isDark,
  copiedMessageId,
  onCopyMessage,
  onOpenFile,
  onStopGenerating,
  onToggleDialogueLoop,
  onSendDialogueInterjection,
  onTriggerDialogueNextTurn,
  onStopDialogueLoop,
  onOpenTerminalSandbox,
}) => {
  const isUser = msg.sender === 'user';

  if (isUser) {
    return (
      <div className={`suda-msg-perf flex flex-col ${!isArabic ? 'items-start' : 'items-end'} gap-2 animate-in fade-in duration-150`}>
        {/* Attached Pasted Text Files, Images, PDFs or User Files Bubble inside Conversation */}
        {msg.createdFiles && msg.createdFiles.length > 0 && (() => {
          const projectFoldersMap: Record<string, TelegramStorageFile[]> = {};
          const standaloneFiles: TelegramStorageFile[] = [];

          msg.createdFiles.forEach((file) => {
            if (file.folder) {
              if (!projectFoldersMap[file.folder]) {
                projectFoldersMap[file.folder] = [];
              }
              projectFoldersMap[file.folder].push(file);
            } else {
              standaloneFiles.push(file);
            }
          });

          return (
            <div className="w-full max-w-[92%] sm:max-w-[85%] space-y-2">
              {/* Project Folder Cards for Attached Projects */}
              {Object.entries(projectFoldersMap).map(([folderName, pFiles]) => (
                <ProjectMessageCard
                  key={folderName}
                  folderName={folderName}
                  files={pFiles}
                  isDark={isDark}
                  isArabic={isArabic}
                  onOpenFile={onOpenFile}
                  onOpenTerminalSandbox={onOpenTerminalSandbox}
                />
              ))}

              {/* Standalone User Files */}
              {standaloneFiles.map((file) => {
              const charCount = file.charCount || file.content?.length || 0;
              const isImg =
                file.isImage ||
                file.type === 'image' ||
                Boolean(file.dataUrl) ||
                (typeof file.content === 'string' && file.content.startsWith('data:image/')) ||
                /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(file.name);
              const isPdf =
                file.isPdf ||
                file.name.toLowerCase().endsWith('.pdf') ||
                file.mimeType === 'application/pdf';
              const quickSnippet =
                typeof file.content === 'string' && !isImg && !isPdf
                  ? file.content.slice(0, 180).replace(/\s+/g, ' ').trim()
                  : '';

              return (
                <div
                  key={file.id}
                  dir={isArabic ? 'rtl' : 'ltr'}
                  className={`p-3 sm:p-3.5 rounded-2xl ${!isArabic ? 'rounded-bl-xs text-left' : 'rounded-br-xs text-right'} border shadow-md text-xs sm:text-sm ${
                    isDark
                      ? isImg
                        ? 'bg-gradient-to-r from-cyan-950/70 via-[#181d28] to-[#12141c] border-cyan-500/40'
                        : isPdf
                        ? 'bg-gradient-to-r from-rose-950/60 via-[#1d1924] to-[#15141c] border-rose-500/40'
                        : 'bg-gradient-to-r from-cyan-950/60 via-[#1d202b] to-[#1a1c24] border-cyan-500/40'
                      : isImg
                      ? 'bg-cyan-50/90 border-cyan-300 text-slate-900'
                      : isPdf
                      ? 'bg-rose-50/90 border-rose-300 text-slate-900'
                      : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {isImg ? (
                        <div
                          onClick={() => onOpenFile(file)}
                          className="relative w-12 h-12 rounded-xl overflow-hidden border border-cyan-500/50 shrink-0 bg-black/60 group cursor-pointer shadow-xs"
                        >
                          <img
                            src={file.dataUrl || file.content}
                            alt={file.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ) : isPdf ? (
                        <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-500 flex items-center justify-center shrink-0 text-lg shadow-xs">
                          📑
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-500 flex items-center justify-center shrink-0 text-lg shadow-xs">
                          📄
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`font-bold text-xs sm:text-sm font-mono truncate max-w-[180px] sm:max-w-[280px] ${
                              isDark ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {file.name || 'ملف'}
                          </span>

                          {isImg ? (
                            <span
                              className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                                isDark
                                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200'
                                  : 'bg-cyan-100 border-cyan-300 text-cyan-800'
                              }`}
                            >
                              🖼️ رؤية بصرية • Vision AI
                            </span>
                          ) : isPdf ? (
                            <span
                              className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                                isDark
                                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-200'
                                  : 'bg-rose-100 border-rose-300 text-rose-800'
                              }`}
                            >
                              📑 مستند PDF
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {file.isPastedText
                                ? isArabic
                                  ? 'نص ملصوق'
                                  : 'Pasted Text'
                                : isArabic
                                ? 'مستند مرفق'
                                : 'Doc Attached'}
                            </span>
                          )}

                          <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                            ({formatSize(file.sizeBytes)})
                          </span>

                          {file.imageDimensions && (
                            <span className={`text-[10px] font-mono ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
                              ({file.imageDimensions.width}×{file.imageDimensions.height})
                            </span>
                          )}

                          {!isImg && !isPdf && charCount > 0 && (
                            <span
                              className={`px-2 py-0.5 rounded-md border font-mono text-[10px] font-bold tabular-nums ${
                                isDark
                                  ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                                  : 'bg-cyan-100 border-cyan-300 text-cyan-800'
                              }`}
                            >
                              {charCount.toLocaleString()} {isArabic ? 'حرف' : 'chars'}
                            </span>
                          )}
                        </div>

                        {isImg ? (
                          <p className={`text-[11px] mt-1 font-sans ${isDark ? 'text-cyan-300/80' : 'text-cyan-800'}`}>
                            {isArabic
                              ? 'تم تمرير الصورة لمحرك الرؤية البصرية للتعرف والتحليل.'
                              : 'Passed to multimodal vision engine for recognition.'}
                          </p>
                        ) : isPdf ? (
                          <p className={`text-[11px] mt-1 font-sans ${isDark ? 'text-rose-300/80' : 'text-rose-800'}`}>
                            {isArabic
                              ? 'تم تمرير مستند الـ PDF للقراءة والاستيعاب الذكي.'
                              : 'Passed to multimodal engine for PDF comprehension.'}
                          </p>
                        ) : quickSnippet ? (
                          <div
                            className={`mt-1.5 text-[11px] sm:text-xs line-clamp-2 font-mono px-2.5 py-1.5 rounded-xl border text-left ${
                              isDark
                                ? 'text-slate-300/90 bg-black/35 border-white/[0.06]'
                                : 'text-slate-700 bg-white border-slate-200'
                            }`}
                            dir="ltr"
                          >
                            <span className={`font-sans font-semibold mr-1 ${isDark ? 'text-cyan-400/80' : 'text-cyan-700'}`}>
                              {isArabic ? 'معاينة سريعة:' : 'Quick preview:'}
                            </span>{' '}
                            {quickSnippet}...
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenFile(file)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition active:scale-95 shrink-0 shadow-xs whitespace-nowrap"
                      title={isArabic ? 'عرض الملف كاملاً' : 'View Full File'}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isArabic ? 'عرض الملف' : 'View File'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}



        {msg.text && (!msg.commandExecution || msg.text.trim() !== msg.commandExecution.command.trim()) && (
          <div
            className={`border rounded-2xl ${!isArabic ? 'rounded-bl-xs text-left' : 'rounded-br-xs text-right'} p-4 text-sm sm:text-[15px] leading-relaxed max-w-[92%] sm:max-w-[85%] shadow-sm whitespace-pre-wrap select-text ${
              isDark
                ? 'bg-[#24252c] border-white/[0.08] text-slate-100'
                : 'bg-cyan-600 border-cyan-700/20 text-white shadow-cyan-950/10'
            }`}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            {msg.text}
          </div>
        )}
      </div>
    );
  }

  const isGeneratingMessage = Boolean(msg.isGenerating) && !msg.text;
  const isCurrentlyTyping = Boolean(msg.isGenerating) && Boolean(msg.text);

  // Parse content: extract code blocks and markdown sections
  const parts = useMemo(() => {
    const codeBlockRegex = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g;
    const extracted: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(msg.text)) !== null) {
      const rawLang = (match[1] || '').toLowerCase().trim();

      if (
        [
          'search',
          'web_search',
          'web-search',
          'websearch',
          'explore',
          'web-explore',
          'web_explore',
          'browse',
          'web-action',
          'action',
        ].includes(rawLang)
      ) {
        if (match.index > lastIndex) {
          extracted.push({
            type: 'text',
            content: msg.text.slice(lastIndex, match.index),
          });
        }
        lastIndex = codeBlockRegex.lastIndex;
        continue;
      }

      if (match.index > lastIndex) {
        extracted.push({
          type: 'text',
          content: msg.text.slice(lastIndex, match.index),
        });
      }
      extracted.push({
        type: 'code',
        language: match[1] || 'text',
        content: match[2],
      });
      lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < msg.text.length) {
      extracted.push({
        type: 'text',
        content: msg.text.slice(lastIndex),
      });
    }
    return extracted;
  }, [msg.text]);

  return (
    <div className={`suda-msg-perf flex flex-col ${!isArabic ? 'items-end' : 'items-start'} gap-2 max-w-[96%] sm:max-w-[92%] animate-in fade-in duration-150 w-full`}>


      {/* Distinctive Modern Waiting Indicator when waiting for stream */}
      {isGeneratingMessage ? (
        <div
          className={`flex items-center gap-3.5 border rounded-2xl p-4 shadow-lg animate-in fade-in duration-200 w-full sm:w-auto ${
            isDark
              ? 'bg-gradient-to-r from-[#161822] to-[#12131a] border-cyan-500/40 text-slate-200 shadow-cyan-950/40'
              : 'bg-white border-cyan-300 text-slate-800 shadow-slate-200/70'
          }`}
        >
          <div className="relative flex items-center justify-center shrink-0">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                isDark
                  ? 'bg-gradient-to-tr from-cyan-500/25 to-blue-600/35 border-cyan-400/50 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                  : 'bg-cyan-50 border-cyan-300 text-cyan-600'
              }`}
            >
              <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 shadow-xs"></span>
            </span>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-xs sm:text-sm font-bold tracking-wide font-sans ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
                {isArabic ? 'SudaMode V1.0 ينفذ ويحلل...' : 'SudaMode V1.0 executing & responding...'}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce [animation-delay:0ms]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce [animation-delay:150ms]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-bounce [animation-delay:300ms]"></span>
              </span>
            </div>
            <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {msg.commandExecution
                ? isArabic
                  ? 'يقوم الذكاء الاصطناعي بتنفيذ الأمر سحابياً وصياغة التحليل الفني...'
                  : 'AI executing in cloud and analyzing output...'
                : isArabic
                ? 'جاري استقبال الرد وكتابته مباشرة عبر الخادم...'
                : 'Receiving stream and typing live from server...'}
            </span>
          </div>
        </div>
      ) : (
        /* AI Response Container */
        <div
          dir={isArabic ? 'rtl' : 'ltr'}
          className={`suda-card-perf w-full border rounded-2xl ${
            !isArabic ? 'rounded-tr-xs text-left' : 'rounded-tl-xs text-right'
          } p-4 sm:p-5 shadow-md relative group/msg transition-colors ${
            isDark
              ? 'bg-[#171821] border-white/[0.08] text-slate-200'
              : 'bg-white border-slate-200/90 text-slate-800 shadow-slate-200/50'
          }`}
        >
          {/* Top Bar of Message (Header, Model tag, Token / time info) */}
          <div
            className={`flex items-center justify-between mb-3 pb-2 border-b text-xs ${
              !isArabic ? 'flex-row-reverse' : ''
            } ${
              isDark ? 'border-white/[0.06]' : 'border-slate-100'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                  isDark
                    ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                    : 'bg-cyan-50 border-cyan-300 text-cyan-700'
                }`}
              >
                AI
              </div>
              <span className={`font-medium text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isArabic ? 'رد SudaStack' : 'SudaStack Response'}
              </span>


            </div>

            <button
              onClick={() => onCopyMessage(msg.id, msg.text)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg transition text-[11px] ${
                isDark
                  ? 'text-slate-400 hover:text-cyan-300 hover:bg-white/5'
                  : 'text-slate-500 hover:text-cyan-700 hover:bg-slate-100'
              }`}
              title={isArabic ? 'نسخ الرسالة بالكامل' : 'Copy message'}
            >
              {copiedMessageId === msg.id ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-bold">{isArabic ? 'تم النسخ' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'نسخ الرسالة' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>

          {/* WhatsApp-Style Live Inter-Agent Collaboration & Coordination Dialogue */}


          {/* Formatted Content with Separated Text & Interactive Code Cards */}
          <div
            className={`space-y-3 text-sm sm:text-[15px] leading-relaxed select-text font-sans ${
              !isArabic ? 'text-left' : 'text-right'
            }`}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            {parts.length === 0 ? (
              <RichTextRenderer content={msg.text} isArabic={isArabic} isDark={isDark} />
            ) : (
              parts.map((part, pIdx) => {
                if (part.type === 'code') {
                  return (
                    <div key={pIdx} dir="ltr" className="text-left">
                      <CodeBlockCard
                        language={part.language || 'text'}
                        code={part.content}
                        blockIndex={pIdx}
                        messageId={msg.id}
                        isArabic={isArabic}
                        isDark={isDark}
                        onOpenFile={onOpenFile}
                        onOpenTerminalSandbox={onOpenTerminalSandbox}
                      />
                    </div>
                  );
                }

                return (
                  <div
                    key={pIdx}
                    className={`leading-relaxed font-sans w-full ${
                      !isArabic ? 'text-left' : 'text-right'
                    } ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
                    dir={isArabic ? 'rtl' : 'ltr'}
                  >
                    <RichTextRenderer content={part.content} isArabic={isArabic} isDark={isDark} />
                  </div>
                );
              })
            )}

            {/* Live Typewriter Cursor */}
            {isCurrentlyTyping && (
              <span className="inline-block animate-pulse text-cyan-500 font-mono mr-1.5 font-bold">█</span>
            )}
          </div>
        </div>
      )}

      {/* Generated Files & Platform Attachments in SudaStack Cloud Storage */}
      {msg.createdFiles &&
        msg.createdFiles.length > 0 &&
        (() => {
          const projectFolder = msg.createdFiles.find((f) => f.folder)?.folder;
          const projectFiles = projectFolder ? msg.createdFiles.filter((f) => f.folder === projectFolder) : [];
          const standaloneFiles = projectFolder
            ? msg.createdFiles.filter((f) => f.folder !== projectFolder)
            : msg.createdFiles;

          return (
            <div className="w-full space-y-3 mt-1.5">
              {/* Integrated Project Folder Card */}
              {projectFolder && projectFiles.length > 0 && (
                <ProjectMessageCard
                  folderName={msg.createdProject?.name || projectFolder}
                  files={projectFiles}
                  isDark={isDark}
                  isArabic={isArabic}
                  onOpenFile={onOpenFile}
                  onOpenTerminalSandbox={onOpenTerminalSandbox}
                />
              )}

              {/* Standalone Individual Files */}
              {standaloneFiles.map((file) => {
                const isImage = isImageFile(file);
                const imageSrc = isImage ? getImageSource(file) : '';
                const isHtml = file.type === 'html' || file.name.endsWith('.html');
                const isPy = file.type === 'python' || file.name.endsWith('.py');
                const isCpp = file.type === 'cpp' || file.name.endsWith('.cpp');

                return (
                  <div
                    key={file.id}
                    className={`suda-card-perf p-3 rounded-2xl border shadow-sm text-xs sm:text-sm transition-colors ${
                      isDark
                        ? 'bg-[#1d1f27] border-cyan-500/20 hover:border-cyan-500/40'
                        : 'bg-white border-slate-200 hover:border-cyan-400 shadow-slate-200/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center font-mono shrink-0 overflow-hidden text-sm ${
                            isDark
                              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                              : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                          }`}
                        >
                          {isImage ? (
                            <img
                              src={imageSrc}
                              alt={file.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : isHtml ? (
                            '🌐'
                          ) : isPy ? (
                            '🐍'
                          ) : isCpp ? (
                            '⚙️'
                          ) : file.type === 'css' ? (
                            '🎨'
                          ) : (
                            '⚡'
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`font-mono font-bold truncate flex items-center gap-2 ${
                              isDark ? 'text-slate-100' : 'text-slate-900'
                            }`}
                            dir="ltr"
                          >
                            <span>{file.name}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] border ${
                                isDark
                                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20'
                                  : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                              }`}
                            >
                              {file.type.toUpperCase()}
                            </span>
                          </div>
                          <div
                            className={`text-[10px] flex items-center gap-1.5 truncate mt-0.5 ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`}
                          >
                            <span>{formatSize(file.sizeBytes)}</span>
                            <span>•</span>
                            <span className="truncate">
                              {file.description ||
                                (isArabic ? 'محفوظ في مساحة SudaStack السحابية' : 'Saved in SudaStack Cloud')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isImage ? (
                          <button
                            onClick={() => onOpenFile(file)}
                            title={isArabic ? `عرض وتكبير الصورة: ${file.name}` : `View & enlarge: ${file.name}`}
                            className={`group/thumb flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all duration-150 active:scale-95 shadow-xs ${
                              isDark
                                ? 'bg-black/40 hover:bg-black/60 border-white/15 hover:border-cyan-400/80'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-cyan-400'
                            }`}
                          >
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-900 border border-white/10 shrink-0 flex items-center justify-center">
                              <img
                                src={imageSrc}
                                alt={file.name}
                                className="w-full h-full object-cover transition-transform duration-200 group-hover/thumb:scale-110"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 className="w-3.5 h-3.5 text-cyan-300 drop-shadow" />
                              </div>
                            </div>
                            <span
                              className={`text-[11px] font-bold flex items-center gap-1 ${
                                isDark ? 'text-cyan-300' : 'text-cyan-700'
                              }`}
                            >
                              <Eye className="w-3 h-3" />
                              {isArabic ? 'معاينة' : 'View'}
                            </span>
                          </button>
                        ) : isHtml ? (
                          <button
                            onClick={() => onOpenFile(file)}
                            title={isArabic ? 'معاينة وتشغيل صفحة HTML' : 'Run Live HTML'}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs active:scale-95 transition shadow-xs"
                          >
                            <Play className="w-3.5 h-3.5 fill-black" />
                            <span>{isArabic ? 'معاينة وتشغيل' : 'Run Live'}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => onOpenFile(file)}
                            title={isArabic ? 'معاينة الكود والأسطر' : 'View Code & Lines'}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs border active:scale-95 transition shadow-xs ${
                              isDark
                                ? 'bg-white/10 hover:bg-white/15 text-cyan-300 border-cyan-500/30'
                                : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-300'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{isArabic ? 'معاينة الكود والـline' : 'View Code'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
    </div>
  );
};

// Custom equality check so completed messages never re-render when the active AI message streams
const MessageItem = React.memo(MessageItemComponent, (prev, next) => {
  return (
    prev.msg === next.msg &&
    prev.isDark === next.isDark &&
    prev.isArabic === next.isArabic &&
    (prev.copiedMessageId === prev.msg.id) === (next.copiedMessageId === next.msg.id)
  );
});

const StudioMessageListComponent: React.FC<StudioMessageListProps> = ({
  messages,
  isLoading,
  onOpenFile,
  isArabic = true,
  onStopGenerating,
  onToggleDialogueLoop,
  onSendDialogueInterjection,
  onTriggerDialogueNextTurn,
  onStopDialogueLoop,
  onOpenTerminalSandbox,
}) => {
  const { isDark } = useTheme();
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const handleCopyMessage = React.useCallback((msgId: string, fullText: string) => {
    navigator.clipboard.writeText(fullText);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  }, []);

  return (
    <div
      dir={isArabic ? 'rtl' : 'ltr'}
      className={`w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-2.5 sm:px-4 md:px-6 py-3 sm:py-5 space-y-4 sm:space-y-6 ${
        isArabic ? 'text-right' : 'text-left'
      }`}
    >
      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          msg={msg}
          isLoading={isLoading}
          isArabic={isArabic}
          isDark={isDark}
          copiedMessageId={copiedMessageId}
          onCopyMessage={handleCopyMessage}
          onOpenFile={onOpenFile}
          onStopGenerating={onStopGenerating}
          onToggleDialogueLoop={onToggleDialogueLoop}
          onSendDialogueInterjection={onSendDialogueInterjection}
          onTriggerDialogueNextTurn={onTriggerDialogueNextTurn}
          onStopDialogueLoop={onStopDialogueLoop}
          onOpenTerminalSandbox={onOpenTerminalSandbox}
        />
      ))}
    </div>
  );
};

export const StudioMessageList = React.memo(StudioMessageListComponent);
