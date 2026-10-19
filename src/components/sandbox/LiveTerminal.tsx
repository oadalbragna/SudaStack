import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Send,
  Trash2,
  Copy,
  Check,
  Play,
  Globe,
  Network,
  ShieldAlert,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TerminalItem, SandboxFile } from '../../hooks/useSandboxStore';
import { useTheme } from '../../context/ThemeContext';

interface LiveTerminalProps {
  terminalHistory: TerminalItem[];
  onRunCommand: (cmd: string, stdin?: string) => void;
  isArabic: boolean;
  projectName?: string;
  files?: SandboxFile[];
  entryFile?: string;
  cwd?: string;
}

export const LiveTerminal: React.FC<LiveTerminalProps> = ({
  terminalHistory,
  onRunCommand,
  isArabic,
  projectName = 'default',
  files = [],
  entryFile = 'domain_to_ip.py',
  cwd = '',
}) => {
  const { isDark } = useTheme();
  const [inputVal, setInputVal] = useState<string>('');
  const [stdinVal, setStdinVal] = useState<string>('google.com');
  const [showStdin, setShowStdin] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Shell history navigation (Arrow Up / Arrow Down)
  const [historyList, setHistoryList] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cmd = inputVal.trim();
    if (!cmd) return;

    // Update command history for Up/Down arrow navigation
    setHistoryList((prev) => [cmd, ...prev.filter((c) => c !== cmd)]);
    setHistoryIdx(-1);

    const stdinToSend = showStdin && stdinVal.trim() ? stdinVal.trim() : undefined;
    onRunCommand(cmd, stdinToSend);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyList.length > 0) {
        const nextIdx = Math.min(historyIdx + 1, historyList.length - 1);
        setHistoryIdx(nextIdx);
        setInputVal(historyList[nextIdx] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInputVal(historyList[nextIdx] || '');
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setInputVal('');
      }
    }
  };

  const handleCopyOutput = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickCommands = [
    { label: `python3 ${entryFile}`, cmd: `python3 ${entryFile}`, title: 'Run entry script' },
    { label: 'echo "google.com" | py', cmd: `echo "google.com" | python3 ${entryFile}`, title: 'Test DNS with google.com' },
    { label: 'echo "cloudflare.com" | py', cmd: `echo "cloudflare.com" | python3 ${entryFile}`, title: 'Test DNS with cloudflare.com' },
    { label: 'dig google.com +short', cmd: 'dig google.com +short', title: 'DNS dig lookup' },
    { label: 'host google.com', cmd: 'host google.com', title: 'Host DNS resolution' },
    { label: 'curl -I https://google.com', cmd: 'curl -I -s https://google.com | head -n 8', title: 'HTTP header check' },
    { label: 'ping -c 2 8.8.8.8', cmd: 'ping -c 2 8.8.8.8', title: 'Network ICMP ping' },
    { label: 'ifconfig', cmd: 'ifconfig || ip a', title: 'Network interfaces' },
    { label: 'ls -la', cmd: 'ls -la', title: 'List project files' },
  ];

  return (
    <div
      className={`flex-1 flex flex-col min-h-0 font-mono text-xs select-text ${
        isDark ? 'bg-[#090b10] text-emerald-400' : 'bg-slate-950 text-emerald-300'
      }`}
      dir="ltr"
    >
      {/* ================= KALI HEADER & STATUS ================= */}
      <div className="px-3 py-2 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 bg-[#050608] text-slate-300 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="flex items-center gap-1.5 font-bold text-[11px] text-cyan-400">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>runner@sudastack:</span>
          </div>
          <span className="text-[10px] text-emerald-400/90 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded truncate font-mono">
            /storage/extracted/{projectName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 text-[9px] text-blue-400 border border-blue-500/20 font-sans font-semibold">
            <Globe className="w-2.5 h-2.5" />
            <span>ONLINE</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-[9px] text-emerald-400 border border-emerald-500/20 font-sans font-semibold">
            <Network className="w-2.5 h-2.5" />
            <span>SERVER / EDGE</span>
          </span>
          <button
            type="button"
            onClick={() => onRunCommand('clear')}
            className="p-1 rounded bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition"
            title="Clear Terminal (clear)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ================= QUICK COMMAND PRESETS TOOLBAR ================= */}
      <div className="px-3 py-1.5 border-b border-white/5 bg-black/40 flex items-center gap-1.5 overflow-x-auto text-[10px] no-scrollbar shrink-0">
        <span className="text-slate-500 uppercase tracking-wider text-[9px] font-bold shrink-0">
          ⚡ {isArabic ? 'أوامر سريعة:' : 'Quick Kali:'}
        </span>
        {quickCommands.map((qc) => (
          <button
            key={qc.cmd}
            type="button"
            onClick={() => {
              setInputVal(qc.cmd);
              onRunCommand(qc.cmd);
            }}
            title={qc.title}
            className="px-2 py-0.5 rounded bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/40 hover:border-cyan-600 transition whitespace-nowrap active:scale-95 shrink-0"
          >
            {qc.label}
          </button>
        ))}
      </div>

      {/* ================= TERMINAL OUTPUT STAGE ================= */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono text-[11px] leading-relaxed">
        {/* Banner if history is empty */}
        {terminalHistory.length === 0 ? (
          <div className="space-y-2 text-slate-300">
            <div className="text-cyan-400 text-[10px] opacity-80 select-none">
              <pre>{`SudaStack Terminal
Project runner with direct Python and network execution.
Bash and native tools use the connected server runner.
Cloudflare edge supports HTTP requests and DNS-over-HTTPS.`}</pre>
            </div>

              <div className="p-2.5 rounded-lg bg-black/50 border border-white/10 space-y-1">
                <div className="text-cyan-300 font-bold flex items-center gap-1.5 font-mono text-xs">
                  <span>┌──(root㉿sudastack-kali)-[/storage/extracted/{projectName}{cwd ? `/${cwd}` : ''}]</span>
                </div>
                <div className="text-cyan-400 flex items-center gap-1.5 font-mono text-xs">
                  <span>└─#</span>
                  <span className="text-white">python3 {entryFile}</span>
                  <span className="text-[10px] text-slate-500 ml-auto">[Ready to execute]</span>
                </div>
                <p className="text-[10px] text-slate-400 pt-1">
                  {isArabic
                    ? '💡 تنفّذ Bash وأدوات النظام على الخادم المتصل، وتعمل طلبات HTTP وDNS مباشرة عبر محرك الشبكة.'
                    : '💡 Bash and system tools run on the connected server; HTTP and DNS use the direct network runner.'}
                </p>
              </div>
            </div>
          ) : (
            terminalHistory.map((item) => {
              const isBotEvent = item.command === 'telegram:event';
              const isSuccess = item.exitCode === 0;
              const itemCwd = item.cwd !== undefined ? item.cwd : '';

              return (
                <div key={item.id} className="space-y-1 group">
                  {/* Kali Terminal Prompt header */}
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                    {isBotEvent ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ⚡ حدث مباشر
                      </span>
                    ) : (
                      <div className="flex flex-col text-xs font-mono">
                        <div className="text-slate-500 text-[10px]">
                          ┌──(root㉿sudastack-kali)-[/storage/extracted/{projectName}{itemCwd ? `/${itemCwd}` : ''}]
                        </div>
                        <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                          <span className="text-cyan-400">└─#</span>
                          <span className="text-white">{item.command}</span>
                        </div>
                      </div>
                    )}

                  <div className="flex items-center gap-1.5 ml-auto text-[10px] text-slate-500">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        isSuccess ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      Exit {item.exitCode}
                    </span>
                    <span>{item.timeMs}ms</span>
                    <span>{item.timestamp}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyOutput(item.id, `${item.stdout}\n${item.stderr}`)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-white transition"
                      title="Copy Output"
                    >
                      {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Stdout Output */}
                {item.stdout && (
                  <pre className="p-2.5 rounded-lg bg-black/60 border border-white/5 text-slate-100 whitespace-pre-wrap break-words font-mono text-[11px]">
                    {item.stdout}
                  </pre>
                )}

                {/* Stderr Output */}
                {item.stderr && (
                  <pre className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-300 whitespace-pre-wrap break-words font-mono text-[11px]">
                    {item.stderr}
                  </pre>
                )}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ================= STDIN EXPANDER BAR (OPTIONAL) ================= */}
      {showStdin && (
        <div className="px-3 py-1.5 bg-[#0e111a] border-t border-cyan-800/40 flex items-center gap-2 text-xs">
          <CornerDownRight className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-cyan-300 text-[10px] font-bold shrink-0">
            {isArabic ? 'مدخلات Stdin (اسم الدومين):' : 'Interactive Stdin (Domain):'}
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

      {/* Current Working Directory Indicator */}
      <div className="px-2.5 pt-1.5 pb-0 bg-[#06080c] border-t border-white/10 text-[10px] text-slate-500 flex items-center gap-1 font-mono select-none">
        <span>┌──(root㉿sudastack-kali)-[/storage/extracted/{projectName}{cwd ? `/${cwd}` : ''}]</span>
      </div>

      {/* ================= TERMINAL COMMAND INPUT FORM ================= */}
      <form
        onSubmit={handleSubmit}
        className="px-2.5 pb-2.5 pt-1 bg-[#06080c] flex items-center gap-2 shrink-0"
      >
        <span className="text-cyan-400 font-bold text-xs font-mono">└─#</span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isArabic
              ? 'اكتب أمراً (مثل python3 domain_to_ip.py أو dig google.com)...'
              : 'Type command (e.g. python3 domain_to_ip.py or dig google.com)...'
          }
          className="flex-1 bg-transparent text-white focus:outline-hidden text-xs font-mono placeholder-slate-600"
        />

        {/* Toggle Stdin input */}
        <button
          type="button"
          onClick={() => setShowStdin(!showStdin)}
          className={`px-2 py-1 rounded text-[10px] font-sans font-semibold border transition ${
            showStdin
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
          }`}
          title={isArabic ? 'تحديد مدخلات البرنامج (Stdin)' : 'Specify program stdin'}
        >
          {isArabic ? 'مدخلات Stdin' : 'Stdin'}
        </button>

        {/* Submit button */}
        <button
          type="submit"
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs transition active:scale-95 flex items-center gap-1 shadow-md shadow-cyan-600/20"
          title={isArabic ? 'تشغيل الأمر' : 'Run command'}
        >
          <Play className="w-3 h-3 fill-white" />
          <span className="text-[11px]">{isArabic ? 'تنفيذ' : 'Run'}</span>
        </button>
      </form>
    </div>
  );
};
