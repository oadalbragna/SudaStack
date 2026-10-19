import React, { useState } from 'react';
import { KeyRound, ShieldAlert, ShieldCheck, X, ArrowRight, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { AdminAuthResult } from '../types';
import { useTheme } from '../context/ThemeContext';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  verifyKey: (key: string) => Promise<AdminAuthResult>;
  isArabic?: boolean;
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  verifyKey,
  isArabic = true,
}) => {
  const { isDark } = useTheme();
  const [keyInput, setKeyInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [authResult, setAuthResult] = useState<AdminAuthResult | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim() || isVerifying) return;

    setIsVerifying(true);
    setAuthResult(null);

    try {
      const result = await verifyKey(keyInput.trim());
      setAuthResult(result);

      if (result.success) {
        setTimeout(() => {
          onSuccess();
          onClose();
          setKeyInput('');
          setAuthResult(null);
        }, 800);
      }
    } catch (err: any) {
      setAuthResult({
        success: false,
        isNewKeyCreated: false,
        message: err.message || 'حدث خطأ أثناء الاتصال بقاعدة البيانات',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleQuickKeyFill = () => {
    setKeyInput('0703');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      <div
        className={`relative w-full max-w-md border rounded-2xl shadow-2xl p-5 sm:p-6 z-10 transition-colors ${
          isDark
            ? 'bg-[#13141b] border-cyan-500/30 text-slate-100 shadow-black/80'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
        }`}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 left-4 sm:top-5 sm:left-5 transition ${
            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-950'
          }`}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 text-black flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <KeyRound className="w-5 h-5 text-slate-950 font-bold" />
          </div>
          <div>
            <h2 className={`text-base sm:text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {isArabic ? 'التحقق من المفتاح الخاص' : 'Admin Key Verification'}
            </h2>
            <p className="text-xs text-slate-400">
              {isArabic ? 'الدخول إلى لوحة التحكم وضبط منصة SudaStack' : 'Access admin dashboard & control system'}
            </p>
          </div>
        </div>

        {/* Database Key Verification Logic Info */}
        <div
          className={`p-3 mb-4 rounded-xl border text-xs leading-relaxed ${
            isDark
              ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-200'
              : 'bg-cyan-50 border-cyan-200 text-cyan-900'
          }`}
        >
          <div className="flex items-start gap-2">
            <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <div>
              <p className={`font-semibold ${isDark ? 'text-cyan-300' : 'text-cyan-800'}`}>
                {isArabic ? 'التحقق المتزامن مع قاعدة البيانات الحقيقية:' : 'Live Database Sync & Key Verification:'}
              </p>
              <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {isArabic
                  ? 'يتم التحقق أولاً إذا كان المفتاح موجوداً في تفرع (suda-stack/sys)، وإذا لم يكن مسجلاً يتم إنشاؤه وتثبيته فورياً كمفتاح معتمد للمسؤول.'
                  : 'Verifies against branch (suda-stack/sys). If no key is set yet, your entered key is automatically registered as the new admin key.'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {isArabic ? 'المفتاح الخاص بالمسؤول' : 'Admin Private Key'}
              </label>
              <button
                type="button"
                onClick={handleQuickKeyFill}
                className={`text-[11px] font-mono transition ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'}`}
              >
                {isArabic ? 'استخدام المفتاح 0703' : 'Use key 0703'}
              </button>
            </div>
            <div className="relative">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  if (authResult) setAuthResult(null);
                }}
                placeholder={isArabic ? 'اكتب المفتاح الخاص (مثال: 0703)' : 'Enter private key (e.g. 0703)'}
                autoFocus
                className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-mono focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition ${
                  isDark
                    ? 'bg-[#0a0b0e] border-white/10 text-white placeholder:text-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                }`}
              />
            </div>
          </div>

          {/* Verification feedback message */}
          {authResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-150 ${
                authResult.success
                  ? isDark
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : isDark
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}
            >
              {authResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-[11.5px] leading-relaxed">
                <span className="font-bold">{authResult.message}</span>
                {authResult.isNewKeyCreated && (
                  <p className={`mt-0.5 text-[10.5px] ${isDark ? 'text-emerald-400/90' : 'text-emerald-700'}`}>
                    {isArabic
                      ? '✨ تم حفظ المفتاح في قاعدة بيانات SudaFile DB تحت تفرع suda-stack/sys'
                      : '✨ Saved to SudaFile DB under suda-stack/sys'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition border ${
                isDark
                  ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-transparent'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              {isArabic ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isVerifying || !keyInput.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>{isArabic ? 'جاري التحقق...' : 'Verifying...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-slate-950" />
                  <span>{isArabic ? 'تحقق ودخول' : 'Verify & Enter'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
