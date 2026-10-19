import React, { useState } from 'react';
import {
  Wrench,
  ShieldCheck,
  KeyRound,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Lock,
  ArrowRight,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { SystemConfig, AdminAuthResult } from '../types';
import { useTheme } from '../context/ThemeContext';

interface MaintenanceOverlayProps {
  config: SystemConfig;
  isAdminAuthenticated: boolean;
  onVerifyAdminKey: (key: string) => Promise<AdminAuthResult>;
  onToggleMaintenance: (enabled: boolean) => Promise<boolean>;
  onOpenAdminDashboard: () => void;
  isArabic?: boolean;
}

export const MaintenanceOverlay: React.FC<MaintenanceOverlayProps> = ({
  config,
  isAdminAuthenticated,
  onVerifyAdminKey,
  onToggleMaintenance,
  onOpenAdminDashboard,
  isArabic = true,
}) => {
  const { isDark } = useTheme();
  const [keyInput, setKeyInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'success' | 'error' | null>(null);

  // If maintenance is OFF, render nothing
  if (!config.maintenanceMode) {
    return null;
  }

  // If Admin IS authenticated: show high-priority top warning banner with quick controls
  if (isAdminAuthenticated) {
    return (
      <div
        dir={isArabic ? 'rtl' : 'ltr'}
        className={`w-full border-b px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 shadow-md z-40 shrink-0 text-xs transition-colors ${
          isDark
            ? 'bg-gradient-to-r from-amber-950/90 via-amber-900/80 to-amber-950/90 border-amber-500/40 text-amber-200'
            : 'bg-amber-50 border-amber-300 text-amber-900'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          <AlertTriangle className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          <span className={`font-bold ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>
            {isArabic ? '⚠️ وضع الصيانة مفعل حالياً' : '⚠️ Maintenance Mode is Active'}
          </span>
          <span className={`hidden sm:inline ${isDark ? 'text-amber-300/80' : 'text-amber-800'}`}>
            {isArabic
              ? '— المنصة مغلقة أمام الزوار العاديين وأنت تتصفح بصلاحية مسؤول'
              : '— Platform is closed to public visitors; you are logged in as admin'}
          </span>
        </div>

        <div className="flex items-center gap-2 mr-auto sm:mr-0">
          <button
            onClick={() => onToggleMaintenance(false)}
            className={`px-2.5 py-1 rounded-lg border font-bold transition active:scale-95 text-[11px] ${
              isDark
                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 hover:text-white border-emerald-500/40'
                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300'
            }`}
            title={isArabic ? 'إيقاف وضع الصيانة وإتاحة المنصة للجميع' : 'Turn off maintenance mode'}
          >
            {isArabic ? '✅ إيقاف وضع الصيانة الآن' : 'Deactivate Maintenance'}
          </button>
          <button
            onClick={onOpenAdminDashboard}
            className={`px-2.5 py-1 rounded-lg font-semibold transition active:scale-95 text-[11px] border ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 text-white border-transparent'
                : 'bg-white hover:bg-amber-100/70 text-amber-950 border-amber-300'
            }`}
          >
            {isArabic ? 'لوحة التحكم' : 'Admin Panel'}
          </button>
        </div>
      </div>
    );
  }

  // If User is NOT Admin: show full-screen maintenance barrier
  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim() || isVerifying) return;
    setIsVerifying(true);
    setFeedback(null);

    try {
      const res = await onVerifyAdminKey(keyInput.trim());
      if (res.success) {
        setFeedbackType('success');
        setFeedback(res.message);
        setTimeout(() => {
          onOpenAdminDashboard();
        }, 500);
      } else {
        setFeedbackType('error');
        setFeedback(res.message);
      }
    } catch (err: any) {
      setFeedbackType('error');
      setFeedback(err.message || 'خطأ في التحقق');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      dir={isArabic ? 'rtl' : 'ltr'}
      className={`fixed inset-0 z-50 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto transition-colors ${
        isDark ? 'bg-[#0a0b0e]/95' : 'bg-slate-900/40'
      }`}
    >
      <div
        className={`max-w-lg w-full border rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#13141c] border-amber-500/30'
            : 'bg-white border-amber-200'
        }`}
      >
        {/* Glow effect */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Badge */}
        <div
          className={`mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border flex items-center justify-center mb-5 shadow-xl ${
            isDark
              ? 'bg-gradient-to-tr from-amber-500/20 via-amber-500/10 to-transparent border-amber-500/40 shadow-amber-500/10'
              : 'bg-amber-50 border-amber-300 shadow-amber-500/5'
          }`}
        >
          <Wrench className={`w-8 h-8 sm:w-10 sm:h-10 animate-bounce duration-1000 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
        </div>

        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-3 ${
            isDark
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              : 'bg-amber-50 border-amber-300 text-amber-800'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>{isArabic ? 'وضع الصيانة والتحديثات الدورية' : 'Maintenance & Upgrades Mode'}</span>
        </div>

        <h1 className={`text-xl sm:text-2xl font-black tracking-tight mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {config.platformTitle || 'SudaStack'} — {isArabic ? 'نعمل على تحسين المنصة' : 'Under Maintenance'}
        </h1>

        <p
          className={`text-sm leading-relaxed mb-6 p-4 rounded-2xl border ${
            isDark
              ? 'text-slate-300 bg-black/30 border-white/5'
              : 'text-slate-700 bg-slate-50 border-slate-200'
          }`}
        >
          {config.maintenanceMessage ||
            (isArabic
              ? 'المنصة قيد الصيانة والتحديثات الدورية — سنعود قريباً بإذن الله.'
              : 'The platform is currently undergoing maintenance. We will be back shortly.')}
        </p>

        {/* Live Database status pill */}
        <div className={`flex items-center justify-center gap-2 text-[11px] mb-6 font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          <Database className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
          <span>SudaFile DB Live Stream:</span>
          <span className={`flex items-center gap-1 font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            suda-stack/sys/
          </span>
        </div>

        {/* Admin Login Gate */}
        <div
          className={`border rounded-2xl p-4 sm:p-5 text-right text-xs ${
            isDark
              ? 'bg-[#0e0f14] border-white/10'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <KeyRound className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
              {isArabic ? 'دخول المسؤولين (Admin Access)' : 'Admin Access'}
            </span>
            <button
              type="button"
              onClick={() => setKeyInput('0703')}
              className={`text-[11px] font-mono transition ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-700 hover:text-cyan-900 font-bold'}`}
            >
              0703
            </button>
          </div>
          <p className={`text-[11px] mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {isArabic
              ? 'أدخل المفتاح الخاص (0703) لتخطي وضع الصيانة والوصول للوحة التحكم الكاملة:'
              : 'Enter private key (0703) to bypass maintenance and access control panel:'}
          </p>

          <form onSubmit={handleKeySubmit} className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder={isArabic ? 'المفتاح الخاص (0703)' : 'Admin Key (0703)'}
                className={`flex-1 border rounded-xl px-3 py-2 font-mono text-xs focus:outline-none transition ${
                  isDark
                    ? 'bg-[#161720] border-white/10 text-white focus:border-cyan-400'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-cyan-500'
                }`}
              />
              <button
                type="submit"
                disabled={isVerifying || !keyInput.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold transition flex items-center gap-1.5 text-xs shadow-md shadow-cyan-500/20 disabled:opacity-50"
              >
                {isVerifying ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />
                )}
                <span>{isArabic ? 'دخول' : 'Enter'}</span>
              </button>
            </div>

            {feedback && (
              <div
                className={`p-2.5 rounded-xl border text-[11px] flex items-center gap-2 ${
                  feedbackType === 'success'
                    ? isDark
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : isDark
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                {feedbackType === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                )}
                <span>{feedback}</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
