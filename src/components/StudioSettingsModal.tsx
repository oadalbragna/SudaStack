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
}

export interface StudioSettings {
  model: string;
  responseMode: SudaResponseMode;
  systemPrompt: string;
}

export const StudioSettingsModal: React.FC<StudioSettingsModalProps> = ({
  isOpen,
  onClose,
  onApplySettings,
  isArabic = true,
  responseMode = 'coding' as SudaResponseMode,
  systemPrompt = '',
}) => {
  const { isDark } = useTheme();
  const [selectedMode, setSelectedMode] = useState<SudaResponseMode>(responseMode);
  const [editablePrompt, setEditablePrompt] = useState<string>(
    sanitizeModelBranding(systemPrompt || getSystemInstructionForMode(responseMode))
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedMode(responseMode);
      setEditablePrompt(
        sanitizeModelBranding(systemPrompt || getSystemInstructionForMode(responseMode))
      );
    }
  }, [isOpen, responseMode, systemPrompt]);

  if (!isOpen) return null;

  const handleSelectMode = (mode: SudaResponseMode) => {
    setSelectedMode(mode);
    setEditablePrompt(DEFAULT_SYSTEM_PROMPTS[mode] || DEFAULT_SYSTEM_PROMPTS.coding);
  };

  const handleResetPrompt = () => {
    setEditablePrompt(DEFAULT_SYSTEM_PROMPTS[selectedMode] || DEFAULT_SYSTEM_PROMPTS.coding);
  };

  const handleSave = () => {
    const finalPrompt = sanitizeModelBranding(
      editablePrompt.trim() || getSystemInstructionForMode(selectedMode)
    );
    onApplySettings({
      model: 'SudaMode V1.0',
      responseMode: selectedMode,
      systemPrompt: finalPrompt,
    });
    onClose();
  };

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

  const activePersonaLabel =
    personaOptions.find((p) => p.id === selectedMode)?.title || personaOptions[0].title;

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
                ? 'الضبط — صياغة الردود والـ Prompt System'
                : 'Settings — Response Style & System Prompt'}
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

        {/* 1. Selected Model + Active Response Mode side-by-side */}
        <div
          className={`p-3.5 rounded-xl border space-y-2 ${
            isDark
              ? 'bg-[#111217] border-cyan-500/35'
              : 'bg-cyan-50/70 border-cyan-200 text-slate-900'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Cpu className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'} shrink-0`} />
              <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {isArabic ? 'المودل المختار:' : 'Selected Model:'}
              </span>
              <code
                dir="ltr"
                className={`px-2 py-0.5 rounded-md border font-mono text-xs font-bold ${
                  isDark
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'bg-cyan-100 border-cyan-300 text-cyan-800'
                }`}
              >
                SudaMode V1.0
              </code>
            </div>

            {/* Active Response Style Badge right beside the selected model */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white'
                  : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
              }`}
            >
              <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {isArabic ? 'الصياغة:' : 'Style:'}
              </span>
              <span className={isDark ? 'text-cyan-300' : 'text-cyan-700'}>{activePersonaLabel}</span>
            </div>
          </div>
          <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {isArabic
              ? 'يتم إرسال جميع الطلبات مباشرة وبشكل حقيقي مع تمرير الـ System Prompt المحدد أدناه.'
              : 'All requests are processed live using the System Prompt configured below.'}
          </p>
        </div>

        {/* 2. Response Persona Mode Selector */}
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

        {/* 3. System Prompt Viewer & Editor (Prompt System) */}
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
              title={isArabic ? 'استعادة البرومبت الافتراضي للنمط المختار' : 'Reset to default prompt'}
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isArabic ? 'استعادة الافتراضي' : 'Reset Default'}</span>
            </button>
          </div>

          <textarea
            value={editablePrompt}
            onChange={(e) => setEditablePrompt(e.target.value)}
            rows={5}
            dir="auto"
            placeholder={
              isArabic
                ? 'اكتب أو عدّل تعليمات النظام (System Prompt) هنا لتوجيه صياغة ردود المودل...'
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
                ? 'يمكنك تعديل نص البرومبت بحرية ليتم تطبيقه كـ System Prompt على جميع الردود.'
                : 'Modify this System Prompt freely to customize how the model responds.'}
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
            <span>{isArabic ? 'حفظ وتطبيق البرومبت' : 'Save & Apply Prompt'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
