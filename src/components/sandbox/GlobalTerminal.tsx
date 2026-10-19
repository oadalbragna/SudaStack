import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Send,
  ArrowLeft,
  Trash2,
  Copy,
  Check,
  Globe,
  Network,
  Play,
  CornerDownRight,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { dispatchCommand } from '../../utils/commandDispatcher';

interface GlobalTerminalProps {
  isArabic: boolean;
  onBackToDashboard: () => void;
}

interface TerminalOutput {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  timeMs: number;
  timestamp: string;
}

export const GlobalTerminal: React.FC<GlobalTerminalProps> = ({ isArabic, onBackToDashboard }) => {
  const { isDark } = useTheme();
  const [history, setHistory] = useState<TerminalOutput[]>([]);
  const [inputVal, setInputVal] = useState<string>('');
  const [stdinVal, setStdinVal] = useState<string>('google.com');
  const [showStdin, setShowStdin] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Command history navigation
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = async (e?: React.FormEvent, customCmd?: string) => {
    if (e) e.preventDefault();
    const rawCmd = (customCmd !== undefined ? customCmd : inputVal).trim();
    if (!rawCmd || isRunning) return;

    setInputVal('');
    if (rawCmd === 'clear' || rawCmd === 'cls') {
      setHistory([]);
      return;
    }

    setCmdHistory((prev) => [rawCmd, ...prev.filter((c) => c !== rawCmd)]);
    setHistoryIndex(-1);

    setIsRunning(true);
    const stdinToSend = showStdin && stdinVal.trim() ? stdinVal.trim() : undefined;

    try {
      const data = await dispatchCommand({
        command: rawCmd,
        projectName: 'global',
        files: [],
        stdin: stdinToSend,
      });

      setHistory((prev) => [
        ...prev,
        {
          id: `term-${Date.now()}`,
          command: rawCmd,
          stdout: data.stdout || '',
          stderr: data.stderr || '',
          exitCode: data.exitCode,
          timeMs: data.timeMs,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      setHistory((prev) => [
        ...prev,
        {
          id: `term-${Date.now()}`,
          command: rawCmd,
          stdout: '',
          stderr: err?.message || 'Execution failed',
          exitCode: 1,
          timeMs: 0,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const next = Math.min(historyIndex + 1, cmdHistory.length - 1);
        setHistoryIndex(next);
        setInputVal(cmdHistory[next] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const next = historyIndex - 1;
        setHistoryIndex(next);
        setInputVal(cmdHistory[next] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputVal('');
      }
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickTools = [
    { label: 'python3 domain_to_ip', cmd: 'python3 storage/extracted/domain_to_ip_bot/domain_to_ip.py' },
    { label: 'echo "google.com" | py', cmd: 'echo "google.com" | python3 storage/extracted/domain_to_ip_bot/domain_to_ip.py' },
    { label: 'echo "cloudflare.com" | py', cmd: 'echo "cloudflare.com" | python3 storage/extracted/domain_to_ip_bot/domain_to_ip.py' },
    { label: 'dig google.com', cmd: 'dig google.com +short' },
    { label: 'host google.com', cmd: 'host google.com' },
    { label: 'curl -I google.com', cmd: 'curl -I -s https://google.com | head -n 8' },
    { label: 'ping -c 2 8.8.8.8', cmd: 'ping -c 2 8.8.8.8' },
    { label: 'ifconfig', cmd: 'ifconfig || ip a' },
    { label: 'ls -la', cmd: 'ls -la' },
  ];

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 font-mono text-xs select-text ${
        isDark ? 'bg-[#090b10] text-emerald-400' : 'bg-slate-950 text-emerald-300'
      }`}
      dir="ltr"
    >
      {/* Top Header */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between bg-[#050608] text-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 transition"
            title={isArabic ? 'العودة' : 'Back'}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5 font-bold text-xs text-cyan-400">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>runner@sudastack:~$</span>
          </div>
          <span className="hidden sm:inline-block text-[10px] text-cyan-300 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded font-mono">
            {isArabic ? 'طرفية المشروع ومحرك الشبكة' : 'Project Terminal & Network Runner'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-[9px] text-emerald-400 border border-emerald-500/20 font-sans font-semibold">
            <Network className="w-2.5 h-2.5" />
            <span>NETWORK READY</span>
          </span>
          <button
            type="button"
            onClick={() => setHistory([])}
            className="p-1 rounded bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition"
            title="Clear"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Kali Tools Bar */}
      <div className="px-3 py-1.5 border-b border-white/5 bg-black/40 flex items-center gap-1.5 overflow-x-auto text-[10px] no-scrollbar shrink-0">
        <span className="text-slate-500 uppercase tracking-wider text-[9px] font-bold shrink-0">
          ⚡ {isArabic ? 'أدوات سريعة:' : 'Quick Tools:'}
        </span>
        {quickTools.map((t) => (
          <button
            key={t.cmd}
            type="button"
            onClick={() => handleSubmit(undefined, t.cmd)}
            className="px-2 py-0.5 rounded bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/40 hover:border-cyan-600 transition whitespace-nowrap active:scale-95 shrink-0"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* History Stage */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-[11px] leading-relaxed">
        {history.map((item) => (
          <div key={item.id} className="space-y-1 group">
            <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
              <div className="flex flex-col">
                <div className="text-slate-500 text-[10px]">
                  ┌──(root㉿sudastack-kali)-[/app/applet]
                </div>
                <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                  <span className="text-cyan-400">└─#</span>
                  <span className="text-white">{item.command}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 ml-auto text-[10px] text-slate-500">
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    item.exitCode === 0
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}
                >
                  Exit {item.exitCode}
                </span>
                <span>{item.timeMs}ms</span>
                <span>{item.timestamp}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(item.id, `${item.stdout}\n${item.stderr}`)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-white transition"
                  title="Copy Output"
                >
                  {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {item.stdout && (
              <pre className="p-2.5 rounded-lg bg-black/60 border border-white/5 text-slate-100 whitespace-pre-wrap break-words font-mono text-[11px]">
                {item.stdout}
              </pre>
            )}
            {item.stderr && (
              <pre className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-300 whitespace-pre-wrap break-words font-mono text-[11px]">
                {item.stderr}
              </pre>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Stdin Bar */}
      {showStdin && (
        <div className="px-3 py-1.5 bg-[#0e111a] border-t border-cyan-800/40 flex items-center gap-2 text-xs">
          <CornerDownRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-cyan-300 text-[10px] font-bold shrink-0">
            {isArabic ? 'مدخلات Stdin (مثل اسم الدومين):' : 'Interactive Stdin (Domain):'}
          </span>
          <input
            type="text"
            value={stdinVal}
            onChange={(e) => setStdinVal(e.target.value)}
            placeholder="e.g. google.com or cloudflare.com"
            className="flex-1 bg-black/60 border border-white/10 rounded px-2 py-0.5 text-white text-[11px] font-mono focus:border-cyan-500 outline-none"
          />
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-2.5 border-t border-white/10 bg-[#06080c] flex items-center gap-2 shrink-0"
      >
        <span className="text-cyan-400 font-bold text-sm">#</span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isArabic
              ? 'اكتب أمر النظام (مثل dig google.com، python3 ...)...'
              : 'Type shell command (e.g. dig google.com, python3 ...)...'
          }
          className="flex-1 bg-transparent text-white focus:outline-hidden text-xs font-mono placeholder-slate-600"
        />

        <button
          type="button"
          onClick={() => setShowStdin(!showStdin)}
          className={`px-2 py-1 rounded text-[10px] font-sans font-semibold border transition ${
            showStdin
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
          }`}
          title={isArabic ? 'تحديد مدخلات Stdin' : 'Specify Stdin'}
        >
          {isArabic ? 'مدخلات Stdin' : 'Stdin'}
        </button>

        <button
          type="submit"
          disabled={isRunning}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition active:scale-95 flex items-center gap-1 shadow-md shadow-cyan-600/20"
          title={isArabic ? 'تنفيذ الأمر' : 'Run command'}
        >
          <Play className="w-3 h-3 fill-white" />
          <span className="text-[11px]">{isArabic ? 'تنفيذ' : 'Run'}</span>
        </button>
      </form>
    </div>
  );
};
