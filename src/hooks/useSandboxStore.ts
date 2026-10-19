import { useState, useEffect, useCallback } from 'react';
import { dispatchCommand, cancelProcess, generateUUID } from '../utils/commandDispatcher';
import { RuntimeProcess } from '../types';

export interface SandboxFile {
  name: string;
  content: string;
  size: number;
  type?: string;
}

export interface TerminalItem {
  id: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  timeMs: number;
  timestamp: string;
  cwd?: string;
  runId?: string;
}

export interface LogItem {
  id: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  timestamp: string;
}

export interface SandboxProject {
  id: string;
  name: string;
  entry_file: string;
  status: 'running' | 'stopped' | 'cancelling' | 'error';
  runtimeId: string;
  activeRunId: string | null;
  lastHeartbeat: number;
  pendingCommandCount: number;
  uptime: string;
  memory: string;
  files: SandboxFile[];
  terminalHistory: TerminalItem[];
  logs: LogItem[];
  createdAt: string;
  cwd?: string;
}

const DEFAULT_PROJECTS: SandboxProject[] = [
  {
    id: 'prj-domain-ip',
    name: 'domain_to_ip_bot',
    entry_file: 'domain_to_ip.py',
    status: 'running',
    runtimeId: 'do-domain-to-ip-bot',
    activeRunId: null,
    lastHeartbeat: Date.now(),
    pendingCommandCount: 0,
    uptime: '1h 05m',
    memory: '28.4 MB',
    files: [
      {
        name: 'domain_to_ip.py',
        content: `import socket

def domain_to_ip(domain):
    try:
        # الحصول على كل عناوين IP المرتبطة بالدومين (IPv4 و IPv6)
        results = socket.getaddrinfo(domain, None)
        
        # استخراج عناوين IP بدون تكرار
        ips = sorted({result[4][0] for result in results})
        
        return ips
    except socket.gaierror as e:
        return f"حدث خطأ في تحويل الدومين: {e}"

if __name__ == "__main__":
    domain = input("أدخل اسم الدومين: ").strip()
    ips = domain_to_ip(domain)
    
    if isinstance(ips, list):
        print(f"عناوين IP الخاصة بـ {domain}:")
        for ip in ips:
            print(ip)
    else:
        print(ips)
`,
        size: 560,
      },
      {
        name: 'requirements.txt',
        content: `# Standard socket library is built-in\nrequests>=2.28.0\n`,
        size: 55,
      },
      {
        name: 'README.md',
        content: `# Domain to IP Resolution Tool (DNS Scanner)\n\nأداة استخراج عناوين IP المرتبطة بالدومين (IPv4 & IPv6) باستخدام مكتبة socket والاتصال المباشر بالإنترنت.\n\nطريقة التشغيل:\npython3 domain_to_ip.py\n`,
        size: 210,
      },
    ],
    terminalHistory: [
      {
        id: 'term-init-ip-1',
        command: 'python3 domain_to_ip.py',
        stdout: `أدخل اسم الدومين: google.com\nعناوين IP الخاصة بـ google.com:\n142.251.14.100\n142.251.14.101\n142.251.14.102\n142.251.14.113\n142.251.14.138\n142.251.14.139\n2a00:1450:4001:c15::65\n2a00:1450:4001:c15::71\n2a00:1450:4001:c15::8a\n2a00:1450:4001:c15::8b`,
        stderr: '',
        exitCode: 0,
        timeMs: 45,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ],
    logs: [
      {
        id: 'log-ip-1',
        level: 'INFO',
        message: 'DNS Domain to IP engine initialized and active on Cloudflare Native Sandbox.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prj-1',
    name: 'telegram_ai_bot',
    entry_file: 'main.py',
    status: 'running',
    runtimeId: 'do-telegram-ai-bot',
    activeRunId: null,
    lastHeartbeat: Date.now(),
    pendingCommandCount: 0,
    uptime: '4h 12m',
    memory: '42.8 MB',
    files: [
      {
        name: 'main.py',
        content: `# Telegram AI Bot - Always-On SudaStack Worker\nimport time\nimport random\n\nprint("🤖 Bot started successfully in persistent mode...")\nwhile True:\n    print(f"[{time.strftime('%H:%M:%S')}] Polling Telegram updates... Active sessions: {random.randint(12, 25)}")\n    time.sleep(5)\n`,
        size: 245,
      },
      {
        name: 'requirements.txt',
        content: `pyTelegramBotAPI>=4.12.0\nrequests>=2.31.0\n`,
        size: 42,
      },
    ],
    terminalHistory: [],
    logs: [
      {
        id: 'log-1',
        level: 'INFO',
        message: 'Persistent worker container started successfully on Cloudflare Durable Object.',
        timestamp: '06:40:10',
      },
      {
        id: 'log-2',
        level: 'INFO',
        message: 'Dependencies from requirements.txt verified on Cloudflare Edge.',
        timestamp: '06:40:11',
      },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'prj-2',
    name: 'sales_analyzer',
    entry_file: 'analyzer.py',
    status: 'stopped',
    runtimeId: 'do-sales-analyzer',
    activeRunId: null,
    lastHeartbeat: Date.now(),
    pendingCommandCount: 0,
    uptime: '0m',
    memory: '0 MB',
    files: [
      {
        name: 'analyzer.py',
        content: `# Sales Data Analyzer\nimport random\n\nsales = [random.randint(200, 950) for _ in range(10)]\nprint("📊 Sales Report:", sales)\nprint("Total Revenue:", sum(sales))\n`,
        size: 150,
      },
    ],
    terminalHistory: [],
    logs: [
      {
        id: 'log-3',
        level: 'INFO',
        message: 'Project stored in Cloudflare storage vault.',
        timestamp: '05:30:00',
      },
    ],
    createdAt: new Date().toISOString(),
  },
];

export function useSandboxStore() {
  const [projects, setProjects] = useState<SandboxProject[]>(() => {
    const saved = localStorage.getItem('sudastack_sandbox_projects');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const mapped = parsed.map((p) => ({
            ...p,
            runtimeId: p.runtimeId || `do-${p.name || p.id}`,
            activeRunId: p.activeRunId || null,
            lastHeartbeat: p.lastHeartbeat || Date.now(),
            pendingCommandCount: p.pendingCommandCount || 0,
            status: p.status === 'restarting' ? 'running' : p.status,
          }));
          if (!mapped.some((p: any) => p.name === 'domain_to_ip_bot' || p.id === 'prj-domain-ip')) {
            return [DEFAULT_PROJECTS[0], ...mapped];
          }
          return mapped;
        }
      } catch {}
    }
    return DEFAULT_PROJECTS;
  });

  const [currentView, setCurrentView] = useState<'dashboard' | 'workspace' | 'global-terminal'>('dashboard');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProcessesList, setActiveProcessesList] = useState<RuntimeProcess[]>([]);

  // Synchronize localStorage cache
  useEffect(() => {
    localStorage.setItem('sudastack_sandbox_projects', JSON.stringify(projects));
  }, [projects]);

  // Sync active processes from backend/DO periodically
  useEffect(() => {
    const fetchProcesses = async () => {
      try {
        const res = await fetch('/api/runtime/active-processes');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.processes)) {
            setActiveProcessesList(data.processes);
          }
        }
      } catch {}
    };

    fetchProcesses();
    const interval = setInterval(fetchProcesses, 5000);
    return () => clearInterval(interval);
  }, []);

  // Listen for real-time Telegram Bot events
  useEffect(() => {
    const handleBotEvent = (e: any) => {
      const { text, level = 'INFO' } = e.detail || {};
      if (!text) return;
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === activeProjectId || p.status === 'running') {
            const newHistoryItem: TerminalItem = {
              id: `term-bot-${Date.now()}-${Math.random()}`,
              command: 'telegram:event',
              stdout: text,
              stderr: level === 'ERROR' ? text : '',
              exitCode: level === 'ERROR' ? 1 : 0,
              timeMs: 1,
              timestamp: timeStr,
            };
            const newLog: LogItem = {
              id: `log-bot-${Date.now()}-${Math.random()}`,
              level: level === 'ERROR' ? 'ERROR' : (level === 'WARN' ? 'WARN' : 'INFO'),
              message: text,
              timestamp: timeStr,
            };
            return {
              ...p,
              terminalHistory: [...p.terminalHistory, newHistoryItem],
              logs: [newLog, ...p.logs],
            };
          }
          return p;
        })
      );
    };

    window.addEventListener('telegram-bot-event', handleBotEvent);
    return () => {
      window.removeEventListener('telegram-bot-event', handleBotEvent);
    };
  }, [activeProjectId]);

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  const createProject = (name: string, files: SandboxFile[] = [], entryFile = 'main.py') => {
    const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const newId = `prj-${Date.now()}`;
    const newProj: SandboxProject = {
      id: newId,
      name: sanitizedName,
      entry_file: entryFile,
      status: 'stopped',
      runtimeId: `do-${sanitizedName}`,
      activeRunId: null,
      lastHeartbeat: Date.now(),
      pendingCommandCount: 0,
      uptime: '0m',
      memory: '12.4 MB',
      files: files.length > 0 ? files : [{ name: 'main.py', content: '# New Python Script\nprint("Hello from SudaStack Cloudflare Sandbox!")\n', size: 56 }],
      terminalHistory: [],
      logs: [
        {
          id: `log-${Date.now()}`,
          level: 'INFO',
          message: `Project "${name}" created with Durable Object runtime ${`do-${sanitizedName}`}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        },
      ],
      createdAt: new Date().toISOString(),
    };
    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setCurrentView('workspace');
    return newProj;
  };

  const deleteProject = (id: string) => {
    const proj = projects.find((p) => p.id === id);
    if (proj?.activeRunId) {
      cancelProcess(proj.activeRunId, proj.name);
    }
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProjectId === id) {
      setActiveProjectId(null);
      setCurrentView('dashboard');
    }
  };

  const updateProjectFiles = (id: string, files: SandboxFile[]) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, files, lastHeartbeat: Date.now() } : p))
    );
  };

  const startProject = async (id: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'running',
              uptime: '1m',
              memory: '38.5 MB',
              lastHeartbeat: Date.now(),
              logs: [
                {
                  id: `log-${Date.now()}`,
                  level: 'INFO',
                  message: `Project execution started on Cloudflare Durable Object.`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                },
                ...p.logs,
              ],
            }
          : p
      )
    );
  };

  // Immediate Kill Switch (<= 2 seconds)
  const stopProject = async (id: string) => {
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;

    // Immediately update status to cancelling
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'cancelling',
            }
          : p
      )
    );

    // Cancel in-flight process
    if (proj.activeRunId) {
      await cancelProcess(proj.activeRunId, proj.name);
    }

    // Stop server-side polling
    try {
      fetch(`/api/runtime/${encodeURIComponent(proj.name)}/polling/stop`, { method: 'POST' }).catch(() => {});
    } catch {}

    // Finalize to stopped state
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'stopped',
              activeRunId: null,
              uptime: '0m',
              memory: '0 MB',
              pendingCommandCount: 0,
              logs: [
                {
                  id: `log-${Date.now()}`,
                  level: 'WARN',
                  message: `Project stopped immediately by user (Kill Switch).`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                },
                ...p.logs,
              ],
            }
          : p
      )
    );
  };

  // Restart implemented as transition: stop -> start
  const restartProject = async (id: string) => {
    await stopProject(id);
    setTimeout(() => {
      startProject(id);
    }, 400);
  };

  // Dispatch Command through Idempotent Dispatcher
  const runProjectCommand = async (id: string, command: string, stdin?: string) => {
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;

    const currentCwd = proj.cwd || '';
    const cleanCmd = command.trim();

    if (cleanCmd === 'clear' || cleanCmd === 'cls') {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                terminalHistory: [],
              }
            : p
        )
      );
      return;
    }

    const commandId = generateUUID();
    const runId = generateUUID();

    // Mark as running and track activeRunId
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'running',
              activeRunId: runId,
              pendingCommandCount: (p.pendingCommandCount || 0) + 1,
              lastHeartbeat: Date.now(),
            }
          : p
      )
    );

    try {
      const result = await dispatchCommand(
        {
          commandId,
          runId,
          command,
          projectName: proj.name,
          files: proj.files,
          cwd: currentCwd,
          stdin,
        },
        (updatedFiles) => {
          setProjects((prev) =>
            prev.map((p) =>
              p.id === id ? { ...p, files: updatedFiles as SandboxFile[] } : p
            )
          );
        }
      );

      if (result.stdout === '[__CLEAR__]') {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: 'stopped',
                  activeRunId: null,
                  pendingCommandCount: Math.max(0, (p.pendingCommandCount || 1) - 1),
                  terminalHistory: [],
                }
              : p
          )
        );
        return;
      }

      const newCwd = result.cwd !== undefined ? result.cwd : currentCwd;

      const termItem: TerminalItem = {
        id: `term-${Date.now()}`,
        command,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode,
        timeMs: result.timeMs,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cwd: currentCwd,
        runId,
      };

      setProjects((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: 'stopped',
                activeRunId: null,
                pendingCommandCount: Math.max(0, (p.pendingCommandCount || 1) - 1),
                cwd: newCwd,
                terminalHistory: [...p.terminalHistory, termItem],
              }
            : p
        )
      );
    } catch (err: any) {
      const termItem: TerminalItem = {
        id: `term-${Date.now()}`,
        command,
        stdout: '',
        stderr: err?.message || 'Error executing command',
        exitCode: 1,
        timeMs: 0,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cwd: currentCwd,
        runId,
      };
      setProjects((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: 'stopped',
                activeRunId: null,
                pendingCommandCount: Math.max(0, (p.pendingCommandCount || 1) - 1),
                terminalHistory: [...p.terminalHistory, termItem],
              }
            : p
        )
      );
    }
  };

  const renameProject = (id: string, newName: string) => {
    const sanitized = newName.replace(/[^a-zA-Z0-9_-]/g, '_');
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: sanitized } : p))
    );
  };

  const addTerminalLog = (id: string, level: 'INFO' | 'WARN' | 'ERROR', message: string) => {
    const logItem: LogItem = {
      id: `log-${Date.now()}`,
      level,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, logs: [logItem, ...p.logs] } : p))
    );
  };

  return {
    projects,
    currentView,
    setCurrentView,
    activeProjectId,
    setActiveProjectId,
    activeProject,
    activeProcessesList,
    createProject,
    deleteProject,
    renameProject,
    updateProjectFiles,
    startProject,
    stopProject,
    restartProject,
    runProjectCommand,
    addTerminalLog,
  };
}
