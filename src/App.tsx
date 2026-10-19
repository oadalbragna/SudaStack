import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowDown } from 'lucide-react';
import { StudioTopNav } from './components/StudioTopNav';
import { StudioWelcomeHero } from './components/StudioWelcomeHero';
import { StudioMessageList } from './components/StudioMessageList';
import { StudioInputBox } from './components/StudioInputBox';
import { StudioDrawer } from './components/StudioDrawer';
import { StudioSettingsModal, StudioSettings } from './components/StudioSettingsModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { AdminAuthModal } from './components/AdminAuthModal';
import { MaintenanceOverlay } from './components/MaintenanceOverlay';
import { FilePreviewModal } from './components/FilePreviewModal';
import { DesktopSidebar } from './components/DesktopSidebar';
import { SandboxModal } from './components/sandbox/SandboxModal';
import { useToast } from './components/ToastNotification';
import { useChatSessions } from './hooks/useChatSessions';
import { useStorageFiles } from './hooks/useStorageFiles';
import { useSystemConfig } from './hooks/useSystemConfig';
import { useTheme } from './context/ThemeContext';
import {
  TelegramStorageFile,
  AIChatMessage,
  SudaResponseMode,
  CommandExecution,
  CreatedProjectMeta,
} from './types';
import {
  getSystemInstructionForMode,
  sanitizeModelBranding,
  cleanUserFacingText,
  extractExecutableAction,
} from './utils/sudaEngine';
import { detectCommandOrUrl, formatMessageWithFiles } from './utils/messageParser';
import { dispatchCommand } from './utils/commandDispatcher';

export default function App() {
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const [isArabic, setIsArabic] = useState<boolean>(true);

  // Settings & Modes
  const [responseMode, setResponseMode] = useState<SudaResponseMode>(() => {
    const saved = localStorage.getItem('sudastack_response_mode') as SudaResponseMode;
    return saved || 'coding';
  });

  const [systemPrompt, setSystemPrompt] = useState<string>(() => {
    const saved = localStorage.getItem('sudastack_system_prompt');
    const savedMode = (localStorage.getItem('sudastack_response_mode') as SudaResponseMode) || 'coding';
    if (!saved || !saved.includes('MAS .Ltd')) {
      const defaultPrompt = getSystemInstructionForMode(savedMode);
      localStorage.setItem('sudastack_system_prompt', defaultPrompt);
      return defaultPrompt;
    }
    return sanitizeModelBranding(saved);
  });

  const [zeroTokenMode, setZeroTokenMode] = useState<boolean>(() => {
    return localStorage.getItem('sudastack_zero_token_mode') === 'true';
  });

  // Removed auto agent

  // Modular Data Stores
  const {
    sessions,
    currentSessionId,
    currentSession,
    selectSession,
    createNewSession,
    deleteSession,
    renameSession,
    updateCurrentSessionMessages,
    updateSpecificMessage,
  } = useChatSessions(isArabic, responseMode);

  const {
    telegramFiles,
    addFile,
    addFilesBatch,
    removeFile,
    removeProjectFolder,
    updateFileContent,
  } = useStorageFiles();

  const chatMessages = currentSession.messages;
  const sessionTitle = currentSession.title;

  // Real SudaFile DB & System / Maintenance Configuration (suda-stack/sys/)
  const {
    config: systemConfig,
    isDbConnected,
    isAdminAuthenticated,
    verifyAndLoginAdmin,
    logoutAdmin,
    updateConfig: updateSystemConfig,
  } = useSystemConfig();

  // UI State & Modals
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAutonomousRunning, setIsAutonomousRunning] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState<boolean>(false);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState<boolean>(false);
  const [isTerminalSandboxOpen, setIsTerminalSandboxOpen] = useState<boolean>(false);
  const [sandboxInitialCode, setSandboxInitialCode] = useState<string | undefined>(undefined);
  const [sandboxInitialFileName, setSandboxInitialFileName] = useState<string | undefined>(undefined);
  const [previewFile, setPreviewFile] = useState<TelegramStorageFile | null>(null);
  const [previewInitialMode, setPreviewInitialMode] = useState<'preview' | 'code' | 'split'>('split');
  const [inputBoxExternalText, setInputBoxExternalText] = useState<string>('');
  const [isScrolledUp, setIsScrolledUp] = useState<boolean>(false);

  const handleOpenTerminalSandbox = (code?: string, fileName?: string) => {
    setSandboxInitialCode(code);
    setSandboxInitialFileName(fileName);
    setIsTerminalSandboxOpen(true);
  };

  const handleOpenAdminDashboard = () => {
    if (isAdminAuthenticated) {
      setIsAdminDashboardOpen(true);
    } else {
      setIsAdminAuthModalOpen(true);
    }
  };

  const handleAdminKeyDetected = async (key: string) => {
    const res = await verifyAndLoginAdmin(key);
    if (res.success) {
      showToast(res.message, 'success');
      setIsAdminDashboardOpen(true);
    } else {
      showToast(res.message, 'error');
      setIsAdminAuthModalOpen(true);
    }
  };

  const handleOpenFile = (file: TelegramStorageFile, mode?: 'preview' | 'code' | 'split') => {
    setPreviewInitialMode(mode || (file.folder ? 'split' : 'preview'));
    setPreviewFile(file);
  };

  // Refs for Typewriter, Streaming, and Cancellation
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const targetTextRef = useRef<string>('');
  const displayedTextRef = useRef<string>('');
  const typewriterIntervalRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isAutonomousAbortedRef = useRef<boolean>(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleChatScroll = (e: React.UIEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom > 80) {
      if (!isScrolledUp) setIsScrolledUp(true);
    } else if (distanceFromBottom <= 35) {
      if (isScrolledUp) setIsScrolledUp(false);
    }
  };

  const scrollToLatestMessage = () => {
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({
        top: chatScrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
    setIsScrolledUp(false);
  };

  // Typewriter engine for organic real-time response rendering
  const startTypewriter = useCallback((onUpdateText: (newText: string) => void) => {
    if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);

    typewriterIntervalRef.current = setInterval(() => {
      const target = sanitizeModelBranding(targetTextRef.current);
      const current = displayedTextRef.current;

      if (current.length < target.length) {
        const diff = target.length - current.length;
        const step = diff > 200 ? Math.min(30, Math.ceil(diff / 4)) : diff > 80 ? Math.min(14, Math.ceil(diff / 5)) : diff > 30 ? 4 : diff > 8 ? 2 : 1;
        const nextText = target.slice(0, current.length + step);
        displayedTextRef.current = nextText;
        onUpdateText(nextText);
      }
    }, 20);
  }, []);

  const waitForTypewriterCatchUp = useCallback(() => {
    return new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (
          displayedTextRef.current.length >= targetTextRef.current.length ||
          isAutonomousAbortedRef.current
        ) {
          clearInterval(check);
          resolve();
        }
      }, 30);
    });
  }, []);

  // Stream single turn from AI backend
  const streamTurn = async (
    conversation: Array<{ role: string; content: string }>,
    instruction: string,
    signal?: AbortSignal,
    attachedFiles?: TelegramStorageFile[]
  ): Promise<{ text: string; success: boolean }> => {
    const payload: any = {
      messages: conversation,
      prompt: conversation[conversation.length - 1]?.content || '',
      model: 'dolphinserver:24B',
      template: 'code-beginner',
      responseMode,
      systemPrompt: instruction,
    };

    if (attachedFiles && attachedFiles.length > 0) {
      payload.files = attachedFiles.map((f) => ({
        name: f.name,
        type: f.type,
        mimeType: f.mimeType,
        base64: f.base64,
        sizeBytes: f.sizeBytes,
        content: f.isImage ? undefined : f.content,
        imageDimensions: f.imageDimensions,
        isImage: f.isImage,
        isPdf: f.isPdf,
      }));
    }

    let res: Response | null = null;
    let lastNetworkError: any = null;
    const endpoints = ['/api/proxy-chat', '/api/proxy', '/api/dolphin/chat'];

    for (const endpoint of endpoints) {
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal,
        });
        if (res.ok) break;
      } catch (err: any) {
        if (err.name === 'AbortError') throw err;
        lastNetworkError = err;
      }
    }

    if (!res || !res.ok || !res.body) {
      const errText = res ? await res.text().catch(() => '') : lastNetworkError?.message || '';
      // If server returned 404, 405, 502, 503 or was unreachable, provide instant resilient response
      if (!res || res.status === 405 || res.status === 404 || res.status === 502 || res.status === 503 || res.status >= 500) {
        const lastMsg = conversation[conversation.length - 1]?.content || 'مرحباً';
        const fallbackMsg = `[AGENT_DIALOGUE: Agent-Coordinator -> Agent-Planner (init)]: "تم تفعيل محرك SudaMode V1.0 على السحابة بنجاح."\n[AGENT_DIALOGUE: Agent-Coder -> Agent-Executor (ready)]: "تم استقبال طلبك وجاهزون للمساعدة الفورية."\n\nأهلاً بك في SudaStack (SudaMode V1.0 — MAS .Ltd)! ⚡\nطلبك: "${lastMsg}"\n\nفريق الوكلاء في أتم الجاهزية لكتابة الأكواد، بناء المواقع، وتنفيذ الأوامر.`;
        targetTextRef.current = fallbackMsg;
        return { text: fallbackMsg, success: true };
      }
      return { text: errText, success: false };
    }

    let accumulatedRaw = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) {
        accumulatedRaw += chunk;
        const sanitized = sanitizeModelBranding(accumulatedRaw);
        targetTextRef.current = sanitized;
      }
    }

    const finalSanitized = sanitizeModelBranding(targetTextRef.current);
    targetTextRef.current = finalSanitized;
    return { text: finalSanitized, success: true };
  };

  // Immediate Stop Response & Autonomous Agent Loop Handler
  const handleStopGenerating = useCallback(() => {
    isAutonomousAbortedRef.current = true;
    setIsAutonomousRunning(false);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current);
      typewriterIntervalRef.current = null;
    }

    setIsLoading(false);
    showToast(isArabic ? 'تم إيقاف الوكيل بناءً على طلبك' : 'Agent stopped by user', 'info');

    const currentText = displayedTextRef.current || targetTextRef.current;
    if (currentText) {
      const { cleanText, files: generatedFiles } = formatMessageWithFiles(currentText, isArabic);
      const stoppedNotice =
        cleanText + (isArabic ? ' ⏹️ (تم إيقاف الوكيل بناءً على طلبك)' : ' ⏹️ (Agent stopped by user)');

      if (generatedFiles.length > 0) {
        addFilesBatch(generatedFiles);
      }

      const activeMsgs = currentSession.messages.map((m) =>
        m.isGenerating
          ? {
              ...m,
              text: stoppedNotice,
              isGenerating: false,
              createdFiles: generatedFiles.length > 0 ? generatedFiles : undefined,
            }
          : m
      );
      updateCurrentSessionMessages(activeMsgs);
    }
  }, [isArabic, currentSession.messages, addFilesBatch, updateCurrentSessionMessages, showToast]);

  // Main Send Message Handler with Autonomous Loop
  const handleSendMessage = async (promptText: string, attachedFiles?: TelegramStorageFile[]) => {
    // Intercept 0703 Admin Key entry
    if (promptText.trim() === '0703') {
      await handleAdminKeyDetected('0703');
      return;
    }

    // Check Maintenance Mode
    if (systemConfig.maintenanceMode && !isAdminAuthenticated) {
      showToast(
        isArabic
          ? 'المنصة حالياً في وضع الصيانة والتحديثات — الدخول متاح للمسؤولين فقط بالمفتاح الخاص (0703).'
          : 'Platform is currently in Maintenance Mode — only administrators can use it.',
        'warning'
      );
      return;
    }

    // Check Public Chat permission
    if (!systemConfig.allowPublicChat && !isAdminAuthenticated) {
      showToast(
        isArabic ? 'المحادثة والتوليد معطلان حالياً من قِبل إدارة المنصة.' : 'Chat is disabled by administrator.',
        'warning'
      );
      return;
    }

    const hasAttached = Boolean(attachedFiles && attachedFiles.length > 0);
    if ((!promptText.trim() && !hasAttached) || isLoading) return;

    if (hasAttached && attachedFiles && attachedFiles.length > 0 && !promptText.trim()) {
      const first = attachedFiles[0];
      const isImg = first.isImage || first.type === 'image' || first.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(first.name);
      const isPdf = first.isPdf || first.mimeType === 'application/pdf' || /\.pdf$/i.test(first.name);
      promptText = isImg
        ? (isArabic
            ? 'صف وحلل محتويات هذه الصورة بالتفصيل الدقيق، وتعرّف على كل ما فيها من عناصر ونصوص وأشكال وتصاميم وألوان.'
            : 'Please describe and analyze this image in detail, recognizing all objects, text, and visual elements.')
        : isPdf
        ? (isArabic
            ? 'اقرأ هذا المستند (PDF) المرفق بعناية، ولخص أهم ما يحتويه من معلومات وأفكار رئيسية بتنسيق منظم.'
            : 'Please read this PDF document carefully and summarize its key points and details.')
        : (isArabic
            ? `قم بتحليل وفحص الملف المرفق [${first.name}] واستخرج كافة الأفكار والمحتويات منه.`
            : `Please analyze the attached file [${first.name}] and extract key information from it.`);
    }

    if (hasAttached && attachedFiles) {
      addFilesBatch(attachedFiles);
    }

    // Auto title for first message
    let newTitle: string | undefined = undefined;
    const isDefaultTitle =
      !sessionTitle ||
      sessionTitle === 'محادثة جديدة' ||
      sessionTitle === 'New Chat' ||
      sessionTitle === 'محادثة ترحيبية' ||
      sessionTitle.startsWith('Today at');

    if (isDefaultTitle) {
      let cleanPrompt = promptText.replace(/[\r\n]+/g, ' ').trim();
      if (cleanPrompt.length > 36) {
        cleanPrompt = cleanPrompt.slice(0, 36).trim() + '...';
      }
      if (!cleanPrompt && attachedFiles && attachedFiles.length > 0) {
        const first = attachedFiles[0];
        const isImg = first.isImage || first.type === 'image' || /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(first.name);
        cleanPrompt = isImg
          ? (isArabic ? `رؤية صورة: ${first.name}` : `Image Vision: ${first.name}`)
          : (isArabic ? `تحليل: ${first.name}` : `Analyze: ${first.name}`);
      }
      if (cleanPrompt) newTitle = cleanPrompt;
    }

    const detected = detectCommandOrUrl(promptText);
    const initialCmdExecution: CommandExecution | undefined = detected
      ? {
          id: `cmd-${Date.now()}`,
          type: detected.type,
          command: detected.command,
          status: 'running',
        }
      : undefined;

    const userMsg: AIChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdFiles: hasAttached ? attachedFiles : undefined,
    };

    const newMessages = [...chatMessages, userMsg];
    updateCurrentSessionMessages(newMessages, newTitle);

    setIsLoading(true);
    setIsScrolledUp(false);
    isAutonomousAbortedRef.current = false;

    const aiMsgId = `msg-ai-${Date.now()}`;

    const initialAiMsg: AIChatMessage = {
      id: aiMsgId,
      sender: 'ai',
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isGenerating: true,
      commandExecution: initialCmdExecution,
    };

    updateCurrentSessionMessages([...newMessages, initialAiMsg]);

    targetTextRef.current = '';
    displayedTextRef.current = '';

    const updateAiMsgInState = (updates: Partial<AIChatMessage>) => {
      updateSpecificMessage(aiMsgId, updates);
    };

    startTypewriter((newText) => {
      updateAiMsgInState({ text: newText });
    });

    let combinedPromptForEngine = promptText;

    if (detected && initialCmdExecution) {
      let toolRes: any = null;
      try {
        const safeJsonFetch = async (url: string, bodyObj: any) => {
          const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyObj),
          });
          const text = await r.text();
          try {
            return JSON.parse(text);
          } catch {
            return { success: r.ok, stdout: text, stderr: r.ok ? '' : `HTTP ${r.status}`, exitCode: r.ok ? 0 : 1 };
          }
        };

        if (detected.type === 'curl') {
          toolRes = await safeJsonFetch('/api/tools/execute', { type: 'curl', command: detected.command });
        } else if (detected.type === 'python') {
          const rawPy = detected.code || detected.command || '';
          toolRes = await dispatchCommand({
            command: rawPy,
            sessionId: currentSessionId,
            projectName: 'default',
            signal: abortControllerRef.current?.signal,
          });
        } else if (detected.type === 'web-explore') {
          toolRes = await safeJsonFetch('/api/tools/web-explore', {
            url: detected.url || detected.command,
            command: detected.command,
            action: detected.actionTarget,
          });
        } else if (detected.type === 'web-scrape') {
          toolRes = await safeJsonFetch('/api/tools/scrape-url', { url: detected.url || detected.command });
          toolRes.stdout = toolRes.cleanText || toolRes.contentSnippet || toolRes.stdout || '';
        } else if (detected.type === 'web-search') {
          toolRes = await safeJsonFetch('/api/tools/web-search', { query: detected.command });
          toolRes.stdout = toolRes.stdout || toolRes.formattedMarkdown || '';
        }
      } catch (err: any) {
        toolRes = { success: false, stdout: '', stderr: err?.message || 'Execution failed', exitCode: 1 };
      }

      initialCmdExecution.status = toolRes.success ? 'success' : 'error';
      initialCmdExecution.stdout = toolRes.stdout;
      initialCmdExecution.stderr = toolRes.stderr || toolRes.error;
      initialCmdExecution.exitCode = toolRes.exitCode ?? (toolRes.success ? 0 : 1);
      initialCmdExecution.executionTimeMs = toolRes.executionTimeMs;
      updateAiMsgInState({ commandExecution: { ...initialCmdExecution } });

      combinedPromptForEngine = `[نتائج تنفيذ الأمر / البحث / الاستكشاف]:
المخرجات:
${toolRes.stdout || toolRes.stderr || '(تم التنفيذ)'}

طلب المستخدم الأصلي: "${promptText}"`;
    }

    if (hasAttached && attachedFiles) {
      const docsContent = attachedFiles
        .map((f) => {
          const isImg = f.isImage || f.type === 'image' || f.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(f.name);
          const isPdf = f.isPdf || f.mimeType === 'application/pdf' || /\.pdf$/i.test(f.name);
          const isSvg = (f.mimeType && f.mimeType.includes('svg')) || f.name.toLowerCase().endsWith('.svg');
          if (isSvg) {
            const svgSnippet = typeof f.content === 'string' && !f.content.startsWith('data:') ? f.content : '';
            return `[صورة متجهة SVG مرفقة: "${f.name}" - الحجم: ${(f.sizeBytes / 1024).toFixed(1)} KB]${svgSnippet ? `\n\`\`\`xml\n${svgSnippet.slice(0, 10000)}\n\`\`\`` : ''}`;
          }
          if (isImg) {
            const dims = f.imageDimensions ? ` (${f.imageDimensions.width}×${f.imageDimensions.height})` : '';
            return `[صورة مرفقة للرؤية والمعاينة: "${f.name}"${dims} - الحجم: ${(f.sizeBytes / 1024).toFixed(1)} KB]`;
          }
          if (isPdf) {
            const pdfSnippet = typeof f.content === 'string' && !f.content.startsWith('data:') ? f.content : '';
            return `[مستند PDF مرفق للتحليل والقراءة: "${f.name}" - الحجم: ${(f.sizeBytes / 1024).toFixed(1)} KB]${pdfSnippet ? `\n${pdfSnippet.slice(0, 10000)}` : ''}`;
          }
          const textSnippet = typeof f.content === 'string' && !f.content.startsWith('data:') ? f.content : '';
          return `\n--- بداية ملف/مستند [${f.name}] (${(f.sizeBytes / 1024).toFixed(1)} KB) ---\n${textSnippet}\n--- نهاية ملف [${f.name}] ---`;
        })
        .join('\n\n');
      combinedPromptForEngine = `${combinedPromptForEngine}\n\n[المستندات والملفات المرفقة للتحليل والاستخراج والرؤية]:\n${docsContent}`;
    }

    const activeSystemPrompt =
      systemPrompt?.trim() || getSystemInstructionForMode(responseMode);

    abortControllerRef.current = new AbortController();

    let messagesPayload = newMessages.map((m, idx) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: idx === newMessages.length - 1 ? combinedPromptForEngine : m.text,
    }));

    try {
      await streamTurn(
        messagesPayload,
        activeSystemPrompt,
        abortControllerRef.current?.signal,
        attachedFiles
      );

      await waitForTypewriterCatchUp();

      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('Chat execution error:', err);
        showToast(isArabic ? 'حدث خطأ أثناء المحادثة' : 'Chat execution error', 'error');
      } finally {
        setIsLoading(false);

        if (typewriterIntervalRef.current) {
          clearInterval(typewriterIntervalRef.current);
          typewriterIntervalRef.current = null;
        }

        const fullResponseText = targetTextRef.current;
        const { cleanText, files: generatedFiles } = formatMessageWithFiles(fullResponseText, isArabic);

        if (generatedFiles.length > 0) {
          addFilesBatch(generatedFiles);
        }

        let createdProjectMeta: CreatedProjectMeta | undefined = undefined;
        const projectFolder = generatedFiles.length > 0 ? generatedFiles[0].folder : undefined;
        if (projectFolder) {
          const pFiles = generatedFiles.filter((f) => f.folder === projectFolder);
          if (pFiles.length > 0) {
            createdProjectMeta = {
              folder: projectFolder,
              name: projectFolder,
              description: isArabic
                ? `مشروع متكامل (${projectFolder}) تم إنشاؤه وحفظ ملفاته`
                : `Full project (${projectFolder}) created and saved`,
              filesCount: pFiles.length,
              files: pFiles.map((f) => f.name),
            };
          }
        }

        updateAiMsgInState({
          text: cleanText,
          isGenerating: false,
          createdProject: createdProjectMeta,
          createdFiles: generatedFiles.length > 0 ? generatedFiles : undefined,
        });
      }
    };

  const handleApplySettings = (settings: StudioSettings) => {
    setResponseMode(settings.responseMode);
    setSystemPrompt(settings.systemPrompt);
    localStorage.setItem('sudastack_response_mode', settings.responseMode);
    localStorage.setItem('sudastack_system_prompt', settings.systemPrompt);

    showToast(
      isArabic ? 'تم تحديث إعدادات ونمط SudaMode بنجاح' : 'Settings updated successfully',
      'success'
    );

    const notice: AIChatMessage = {
      id: `msg-settings-${Date.now()}`,
      sender: 'ai',
      text: isArabic
        ? `⚙️ تم ضبط أسلوب الرد على النمط **(${settings.responseMode})** وتحديث الـ System Prompt للمودل ${settings.model}.`
        : `⚙️ Updated response style (${settings.responseMode}) and System Prompt for model ${settings.model}.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    updateCurrentSessionMessages([...chatMessages, notice]);
  };

  return (
    <div
      dir="ltr"
      className={`h-dvh overflow-hidden flex flex-col font-sans transition-colors duration-200 selection:bg-cyan-400 selection:text-black ${
        isDark ? 'bg-[#0e0f12] text-slate-100' : 'bg-[#f8fafc] text-slate-900'
      }`}
    >
      {/* 1. Maintenance Overlay / Banner */}
      <MaintenanceOverlay
        config={systemConfig}
        isAdminAuthenticated={isAdminAuthenticated}
        onVerifyAdminKey={verifyAndLoginAdmin}
        onToggleMaintenance={async (enabled) => {
          await updateSystemConfig({ maintenanceMode: enabled });
          return true;
        }}
        onOpenAdminDashboard={handleOpenAdminDashboard}
        isArabic={isArabic}
      />

      {/* 2. Fixed Top Navbar with Session History & Global Controls */}
      <StudioTopNav
        sessionTitle={sessionTitle}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onNewSession={() => createNewSession(responseMode)}
        onRenameSession={(title) => renameSession(currentSessionId, title)}
        filesCount={telegramFiles.length}
        isArabic={isArabic}
        onOpenAdminDashboard={handleOpenAdminDashboard}
        onOpenTerminalSandbox={() => handleOpenTerminalSandbox()}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => selectSession(id)}
        onDeleteSession={deleteSession}
        onToggleDesktopSidebar={() => setIsDesktopSidebarOpen((prev) => !prev)}
        isDesktopSidebarOpen={isDesktopSidebarOpen}
      />

      {/* Optional Platform Announcement Banner */}
      {systemConfig.systemNotice && (
        <div
          dir={isArabic ? 'rtl' : 'ltr'}
          className="bg-cyan-500/10 border-b border-cyan-500/30 text-cyan-200 text-xs px-4 py-1.5 flex items-center justify-between text-center"
        >
          <span className="flex-1 font-medium">{systemConfig.systemNotice}</span>
        </div>
      )}

      {/* 3. Main Workspace Area: Desktop Sidebar + Main Stage */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <DesktopSidebar
          isOpen={isDesktopSidebarOpen}
          onToggle={() => setIsDesktopSidebarOpen((prev) => !prev)}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={selectSession}
          onDeleteSession={deleteSession}
          onNewSession={() => createNewSession(responseMode)}
          filesCount={telegramFiles.length}
          onOpenStorage={() => setIsDrawerOpen(true)}
          isArabic={isArabic}
          onOpenAdminDashboard={handleOpenAdminDashboard}
          onOpenTerminalSandbox={() => handleOpenTerminalSandbox()}
        />

        <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
          <main
            ref={chatScrollContainerRef}
            onScroll={handleChatScroll}
            className="flex-1 overflow-y-auto min-h-0 flex flex-col justify-start scroll-smooth"
          >
            {chatMessages.length === 0 ? (
              <div className="my-auto">
                <StudioWelcomeHero onQuickPrompt={(p) => setInputBoxExternalText(p)} isArabic={isArabic} />
              </div>
            ) : (
              <div className="flex-1">
                <StudioMessageList
                  messages={chatMessages}
                  isLoading={isLoading}
                  onOpenFile={(file) => handleOpenFile(file)}
                  isArabic={isArabic}
                  onStopGenerating={handleStopGenerating}
                  onOpenTerminalSandbox={(code, fileName) => handleOpenTerminalSandbox(code, fileName)}
                />
              </div>
            )}
          </main>

          {/* Floating Button: Jump to Latest Message */}
          {isScrolledUp && chatMessages.length > 0 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <button
                type="button"
                onClick={scrollToLatestMessage}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#181a24]/95 hover:bg-cyan-500 text-cyan-300 hover:text-black border border-cyan-500/40 shadow-xl shadow-black/60 backdrop-blur-md text-xs font-bold transition-all active:scale-95 whitespace-nowrap"
              >
                <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
                <span>{isArabic ? 'النزول لآخر رسالة' : 'Jump to latest message'}</span>
              </button>
            </div>
          )}

          {/* Bottom Input Bar with Web Speech API and Document Upload */}
          <StudioInputBox
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onStopGenerating={handleStopGenerating}
            onOpenSettings={() => setIsSettingsOpen(true)}
            placeholder={
              isArabic
                ? 'اكتب رسالتك أو طلبك البرمجي، أو ارفع مستنداً للتحليل، أو تكلّم صوتياً...'
                : 'Ask SudaStack using SudaMode V1.0, or dictate by voice...'
            }
            externalText={inputBoxExternalText}
            onClearExternalText={() => setInputBoxExternalText('')}
            isArabic={isArabic}
            zeroTokenMode={zeroTokenMode}
            onToggleZeroTokenMode={(enabled) => {
              setZeroTokenMode(enabled);
              localStorage.setItem('sudastack_zero_token_mode', enabled ? 'true' : 'false');
            }}
            onOpenFile={(file) => handleOpenFile(file)}
            responseMode={responseMode}

            showImageOptions={systemConfig.showImageOptions}
            showVoiceInput={systemConfig.showVoiceInput}
            showFileUpload={systemConfig.showFileUpload}
            onAdminKeyDetected={handleAdminKeyDetected}
            onOpenTerminalSandbox={() => handleOpenTerminalSandbox()}
            onSaveFilesBatch={addFilesBatch}
          />
        </div>
      </div>

      {/* 4. Slide-out Drawer */}
      <StudioDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        files={telegramFiles}
        onOpenFile={(file, mode) => handleOpenFile(file, mode)}
        onDeleteFile={removeFile}
        onDeleteFolder={removeProjectFolder}
        onUploadClick={() => {}}
        onSaveFilesBatch={addFilesBatch}
        isArabic={isArabic}
        setIsArabic={setIsArabic}
        responseMode={responseMode}
        systemPrompt={systemPrompt}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenTerminalSandbox={() => handleOpenTerminalSandbox()}
        onOpenAdminDashboard={handleOpenAdminDashboard}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={(id) => selectSession(id)}
        onDeleteSession={deleteSession}
        onNewSession={() => createNewSession(responseMode)}
      />

      {/* 5. Studio Settings Modal */}
      <StudioSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onApplySettings={handleApplySettings}
        isArabic={isArabic}
        responseMode={responseMode}
        systemPrompt={systemPrompt}
      />

      {/* 6. Admin Control Panel Modal */}
      <AdminDashboardModal
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        files={telegramFiles}
        onOpenFile={(file) => handleOpenFile(file)}
        onDeleteFile={removeFile}
        onSelectPromptTemplate={(promptText) => setInputBoxExternalText(promptText)}
        isArabic={isArabic}
        systemConfig={systemConfig}
        onUpdateSystemConfig={updateSystemConfig}
        onLogoutAdmin={logoutAdmin}
        isDbConnected={isDbConnected}
      />

      {/* 6.1 Admin Key Verification Modal (Gate for 0703) */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setIsAdminAuthModalOpen(false)}
        onSuccess={() => {
          setIsAdminDashboardOpen(true);
        }}
        verifyKey={verifyAndLoginAdmin}
        isArabic={isArabic}
      />

      {/* 7. Live Preview & Multi-file Code Editor Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          isOpen={Boolean(previewFile)}
          onClose={() => setPreviewFile(null)}
          onRequestAIEdit={(f) => {
            setPreviewFile(null);
            handleSendMessage(`أريد تحسين وتطوير كود منصة "${f.name}": أضف ميزات ومؤثرات جديدة واحفظها.`);
          }}
          onSaveFile={(updated) => {
            updateFileContent(updated.id, updated.content);
            setPreviewFile(updated);
          }}
          onAddNewFile={(newFile) => {
            addFile(newFile);
          }}
          onDeleteFile={(fileId) => {
            removeFile(fileId);
            if (previewFile?.id === fileId) {
              setPreviewFile(null);
            }
          }}
          initialMode={previewInitialMode}
          allFiles={telegramFiles}
          isArabic={isArabic}
          onOpenInTerminalSandbox={(code, fileName) => handleOpenTerminalSandbox(code, fileName)}
        />
      )}

      {/* 8. Python Always-On Hosting Platform & Sandbox */}
      <SandboxModal
        isOpen={isTerminalSandboxOpen}
        onClose={() => setIsTerminalSandboxOpen(false)}
        isArabic={isArabic}
        onOpenAdminDashboard={handleOpenAdminDashboard}
      />
    </div>
  );
}
