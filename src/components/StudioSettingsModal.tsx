import React, { useState, useEffect } from 'react';
import {
  X,
  SlidersHorizontal,
  Check,
  Cpu,
  Code2,
  Heart,
  Terminal,
  ShieldAlert,
  Sparkles,
  RotateCcw,
  FileText,
  Layers,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { SudaResponseMode } from '../types';
import { useTheme } from '../context/ThemeContext';
import {
  DEFAULT_SYSTEM_PROMPTS,
  getSystemInstructionForMode,
  sanitizeModelBranding,
} from '../utils/sudaEngine';

interface StudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplySettings: (settings: StudioSettings) => void;
  isArabic?: boolean;
  responseMode?: SudaResponseMode;
  systemPrompt?: string;
  initialModel?: string;
  initialTemplate?: string;
}

export interface StudioSettings {
  model: string;
  template: string;
  responseMode: SudaResponseMode;
  systemPrompt: string;
  cookie?: string;
}

export const StudioSettingsModal: React.FC<StudioSettingsModalProps> = ({
  isOpen,
  onClose,
  onApplySettings,
  isArabic = true,
  responseMode = 'coding' as SudaResponseMode,
  systemPrompt = '',
  initialModel = 'dolphinserver:24B',
  initialTemplate = 'code-beginner',
}) => {
  const { isDark } = useTheme();
  const [selectedMode, setSelectedMode] = useState<SudaResponseMode>(responseMode);
  const [selectedModel, setSelectedModel] = useState<string>(initialModel);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(initialTemplate);
  const [editablePrompt, setEditablePrompt] = useState<string>(
    sanitizeModelBranding(systemPrompt || getSystemInstructionForMode(responseMode))
  );

  // Cookie & Token State
  const [cookieInput, setCookieInput] = useState<string>('');
  const [isRefreshingCookie, setIsRefreshingCookie] = useState<boolean>(false);
  const [isSavingCookie, setIsSavingCookie] = useState<boolean>(false);
  const [cookieStatus, setCookieStatus] = useState<{
    isValid: boolean;
    maskedCookie: string;
    lastStatusText: string;
    autoRefreshCount: number;
    lastValidatedAt: number;
  } | null>(null);

  const fetchAuthStatus = async () => {
    try {
      const res = await fetch('/api/dolphin/auth/status');
      if (res.ok) {
        const data = await res.json();
        if (data.telemetry) {
          setCookieStatus(data.telemetry);
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedMode(responseMode);
      setSelectedModel(initialModel);
      setSelectedTemplate(initialTemplate);
      setEditablePrompt(
        sanitizeModelBranding(systemPrompt || getSystemInstructionForMode(responseMode))
      );
      fetchAuthStatus();
    }
  }, [isOpen, responseMode, systemPrompt, initialModel, initialTemplate]);

  if (!isOpen) return null;

  const handleSelectMode = (mode: SudaResponseMode) => {
    setSelectedMode(mode);
    setEditablePrompt(DEFAULT_SYSTEM_PROMPTS[mode] || DEFAULT_SYSTEM_PROMPTS.coding);
  };

  const handleResetPrompt = () => {
    setEditablePrompt(DEFAULT_SYSTEM_PROMPTS[selectedMode] || DEFAULT_SYSTEM_PROMPTS.coding);
  };

  const handleRefreshCookieNow = async () => {
    setIsRefreshingCookie(true);
    try {
      const res = await fetch('/api/dolphin/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.telemetry) setCookieStatus(data.telemetry);
      }
    } catch {
    } finally {
      setIsRefreshingCookie(false);
    }
  };

  const handleSaveCustomCookie = async () => {
    const clean = cookieInput.trim();
    if (!clean) return;
    setIsSavingCookie(true);
    try {
      localStorage.setItem('sudastack_cf_cookie', clean);
      const res = await fetch('/api/dolphin/cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie: clean }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.telemetry) setCookieStatus(data.telemetry);
        setCookieInput('');
      } else {
        // Even if server is stateless on Vercel, client localStorage will send it
        setCookieStatus({
          isValid: true,
          maskedCookie: `${clean.slice(0, 15)}...${clean.slice(-6)}`,
          lastStatusText: isArabic ? 'محفوظ محلياً ومتصل' : 'Saved locally',
          autoRefreshCount: 1,
          lastValidatedAt: Date.now(),
        });
        setCookieInput('');
      }
    } catch {
      localStorage.setItem('sudastack_cf_cookie', clean);
      setCookieInput('');
    } finally {
      setIsSavingCookie(false);
    }
  };

  const handleSave = () => {
    const finalPrompt = sanitizeModelBranding(
      editablePrompt.trim() || getSystemInstructionForMode(selectedMode)
    );
    onApplySettings({
      model: selectedModel,
      template: selectedTemplate,
      responseMode: selectedMode,
      systemPrompt: finalPrompt,
    });
    onClose();
  };

  const modelOptions = [
    { id: 'dolphinserver:24B', label: isArabic ? 'SudaMode V1.0 (النموذج الأساسي)' : 'SudaMode V1.0 (Primary Engine)' },
    { id: 'dolphinserver2:6b', label: isArabic ? 'SudaMode Mini (سريع وخفيف)' : 'SudaMode Mini (Fast)' },
  ];

  const templateOptions = [
    { id: 'code-beginner', label: isArabic ? 'Code Beginner (برمجة للمبتدئين)' : 'Code Beginner' },
    { id: 'code-advanced', label: isArabic ? 'Code Advanced (برمجة متقدمة)' : 'Code Advanced' },
    { id: 'logical', label: isArabic ? 'Logical (تحليل منطقي)' : 'Logical' },
    { id: 'creative', label: isArabic ? 'Creative (إبداعي)' : 'Creative' },
    { id: 'summary', label: isArabic ? 'Summarizer (تلخيص وتحليل)' : 'Summarizer' },
  ];

  const personaOptions: Array<{
    id: SudaResponseMode;
    title: string;
    desc: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'coding',
      title: isArabic ? '💻 صياغة برمجية' : '💻 Coding Mode',
      desc: isArabic ? 'هندسة المنصات والأكواد الكاملة' : 'Full code & platform engineering',
      icon: <Code2 className="w-4 h-4 text-cyan-400" />,
    },
    {
      id: 'romantic',
      title: isArabic ? '🌹 صياغة رومانسية' : '🌹 Romantic Mode',
      desc: isArabic ? 'أسلوب شاعري دافئ وملهم' : 'Warm, poetic expression',
      icon: <Heart className="w-4 h-4 text-rose-400" />,
    },
    {
      id: 'hacker',
      title: isArabic ? '🕶️ صياغة هاكر' : '🕶️ Hacker Terminal',
      desc: isArabic ? 'أسلوب 0xSudaStack وسطر الأوامر' : 'Terminal & kernel hacker style',
      icon: <Terminal className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: 'cybersecurity',
      title: isArabic ? '🛡️ أمن سيبراني' : '🛡️ Cybersecurity',
      desc: isArabic ? 'فحص الأكواد واكتشاف الثغرات وسدّها' : 'Vulnerability analysis & patching',
      icon: <ShieldAlert className="w-4 h-4 text-amber-400" />,
    },
    {
      id: 'custom',
      title: isArabic ? '✨ صياغة مخصصة' : '✨ Custom Style',
      desc: isArabic ? 'تخصيص كامل لتعليمات النظام' : 'Fully custom system prompt',
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-xs" onClick={onClose} />

      <div
        className={`relative w-full max-w-lg border rounded-2xl shadow-2xl p-5 z-10 space-y-4 max-h-[92vh] overflow-y-auto transition-colors ${
          isDark
            ? 'bg-[#16171d] border-white/10 text-slate-100 shadow-black/60'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
        }`}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <h3 className={`font-bold text-sm sm:text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isArabic
                ? 'إعدادات النماذج، القوالب، والتجديد التلقائي'
                : 'Settings — Models, Templates & Token Refresh'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-lg transition ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Model & Template Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isArabic ? 'اختر النموذج (Model):' : 'Select Model:'}</span>
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none transition ${
                isDark
                  ? 'bg-[#111217] border-cyan-500/30 text-white focus:border-cyan-400'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500'
              }`}
            >
              {modelOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isArabic ? 'اختر القالب (Template):' : 'Select Template:'}</span>
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none transition ${
                isDark
                  ? 'bg-[#111217] border-emerald-500/30 text-white focus:border-emerald-400'
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
              }`}
            >
              {templateOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. Automated cf_clearance Cookie & Session Token Panel */}
        <div
          className={`p-3.5 rounded-xl border space-y-2.5 ${
            isDark
              ? 'bg-[#111217] border-cyan-500/25'
              : 'bg-cyan-50/60 border-cyan-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs font-bold">
                {isArabic ? 'إدارة جلسة الكوكي والتحقق التلقائي (cf_clearance):' : 'Cookie & Token Management:'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {cookieStatus?.isValid ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  {isArabic ? 'جلسة نشطة' : 'Active'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <AlertCircle className="w-3 h-3" />
                  {cookieStatus?.lastStatusText || (isArabic ? 'تجديد تلقائي مدعوم' : 'Auto-Renew Ready')}
                </span>
              )}
            </div>
          </div>

          <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {isArabic
              ? 'يقوم النظام تلقائياً بتجديد رمز الجلسة عند انتهاء الصلاحية أو تلقي خطأ 403 وحفظه في مساحة التخزين الآمنة للطلبات اللاحقة.'
              : 'Tokens are automatically refreshed on expiry or 403 errors and saved securely for subsequent requests.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={cookieInput}
              onChange={(e) => setCookieInput(e.target.value)}
              placeholder={
                isArabic
                  ? 'الصق cf_clearance جديداً هنا (اختياري)...'
                  : 'Paste new cf_clearance cookie (optional)...'
              }
              className={`flex-1 border rounded-xl px-3 py-1.5 text-xs font-mono focus:outline-none transition ${
                isDark
                  ? 'bg-[#0e0f14] border-white/10 text-slate-200 focus:border-cyan-400 placeholder:text-slate-600'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500 placeholder:text-slate-400'
              }`}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveCustomCookie}
                disabled={!cookieInput.trim() || isSavingCookie}
                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-semibold transition"
              >
                {isSavingCookie ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ الكوكي' : 'Save')}
              </button>
              <button
                type="button"
                onClick={handleRefreshCookieNow}
                disabled={isRefreshingCookie}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                  isDark
                    ? 'bg-white/5 hover:bg-white/10 text-cyan-300 border-cyan-500/30'
                    : 'bg-white hover:bg-slate-50 text-cyan-700 border-cyan-300'
                }`}
                title={isArabic ? 'فحص وتجديد التوكن برمجياً الآن' : 'Test and refresh tokens programmatically now'}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCookie ? 'animate-spin' : ''}`} />
                <span>{isRefreshingCookie ? (isArabic ? 'تجديد...' : 'Refreshing...') : (isArabic ? 'فحص وتجديد' : 'Refresh')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Response Persona Mode Selector */}
        <div>
          <label className={`text-xs font-semibold block mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {isArabic ? 'اختر نمط صياغة الردود:' : 'Select Response Style:'}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {personaOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectMode(opt.id)}
                className={`p-2.5 rounded-xl border text-right transition flex items-start gap-2.5 ${
                  selectedMode === opt.id
                    ? isDark
                      ? 'bg-cyan-500/15 text-white border-cyan-500/50 shadow-sm'
                      : 'bg-cyan-50 text-cyan-900 border-cyan-400 shadow-sm'
                    : isDark
                    ? 'bg-[#1e1f26] text-slate-300 border-white/5 hover:bg-white/5'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="mt-0.5 shrink-0">{opt.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{opt.title}</div>
                  <div className={`text-[10.5px] mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 4. System Prompt Viewer & Editor */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
              <FileText className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
              <span>
                {isArabic
                  ? 'البرومبت (System Prompt) — قابل للتعديل:'
                  : 'Editable System Prompt:'}
              </span>
            </label>
            <button
              type="button"
              onClick={handleResetPrompt}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] transition ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isArabic ? 'استعادة الافتراضي' : 'Reset Default'}</span>
            </button>
          </div>

          <textarea
            value={editablePrompt}
            onChange={(e) => setEditablePrompt(e.target.value)}
            rows={4}
            dir="auto"
            placeholder={
              isArabic
                ? 'اكتب أو عدّل تعليمات النظام (System Prompt) هنا...'
                : 'Write or edit the System Prompt instructions here...'
            }
            className={`w-full border rounded-xl p-3 text-xs sm:text-sm focus:outline-none leading-relaxed resize-y font-sans transition-colors ${
              isDark
                ? 'bg-[#0e0f14] border-cyan-500/30 focus:border-cyan-400 text-slate-100 placeholder:text-slate-500'
                : 'bg-white border-slate-300 focus:border-cyan-500 text-slate-900 placeholder:text-slate-400 shadow-2xs'
            }`}
          />
          <div className={`flex items-center justify-between text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>
              {isArabic
                ? 'يتم تطبيق هذا البرومبت على كافة المحادثات.'
                : 'Applied as System Prompt across all chats.'}
            </span>
            <span className={`font-mono tabular-nums font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
              {editablePrompt.length} {isArabic ? 'حرف' : 'chars'}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`pt-3 border-t flex items-center justify-end gap-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium transition ${
              isDark
                ? 'bg-white/5 hover:bg-white/10 text-slate-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {isArabic ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isArabic ? 'حفظ وتطبيق الإعدادات' : 'Save & Apply'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
