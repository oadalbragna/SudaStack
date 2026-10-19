import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface StudioWelcomeHeroProps {
  onQuickPrompt?: (prompt: string) => void;
  isArabic?: boolean;
}

const StudioWelcomeHeroComponent: React.FC<StudioWelcomeHeroProps> = ({
  onQuickPrompt,
  isArabic = true,
}) => {
  const { isDark } = useTheme();

  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-8 sm:py-12 select-none animate-in fade-in duration-200">
      {/* Sleek Double-Triangle / Play Chevron Studio Logo */}
      <div className="relative mb-5 flex items-center justify-center">
        {/* Soft Glow */}
        <div
          className={`absolute w-20 h-20 rounded-full blur-xl pointer-events-none ${
            isDark ? 'bg-cyan-500/15' : 'bg-cyan-500/20'
          }`}
        />

        {/* SVG Double Chevron Studio Mark */}
        <svg
          className={`w-14 h-14 sm:w-16 sm:h-16 ${
            isDark
              ? 'text-white drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]'
              : 'text-slate-900 drop-shadow-[0_4px_12px_rgba(6,182,212,0.25)]'
          }`}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* First Triangle (Left) */}
          <path d="M12 12L24 24L12 36V12Z" fill="url(#chevronGradient1)" opacity="0.95" />
          {/* Second Triangle (Right) */}
          <path d="M22 12L34 24L22 36V12Z" fill="url(#chevronGradient2)" opacity="0.75" />
          <defs>
            <linearGradient
              id="chevronGradient1"
              x1="12"
              y1="12"
              x2="24"
              y2="36"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor={isDark ? '#FFFFFF' : '#0891B2'} />
              <stop offset="1" stopColor="#06B6D4" />
            </linearGradient>
            <linearGradient
              id="chevronGradient2"
              x1="22"
              y1="12"
              x2="34"
              y2="36"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#06B6D4" />
              <stop offset="1" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Main Title */}
      <h1
        className={`text-2xl sm:text-3xl font-bold tracking-tight mb-2 transition-colors ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}
      >
        {isArabic ? 'مرحباً بك في سوداستاك' : 'Welcome to SudaStack'}
      </h1>

      {/* Subtitle */}
      <p
        className={`text-sm sm:text-base font-normal max-w-md transition-colors ${
          isDark ? 'text-slate-400' : 'text-slate-600'
        }`}
      >
        {isArabic
          ? 'مهندسك الذكي لبناء المنصات الرقمية وتطوير التطبيقات وتخزين الملفات'
          : 'Your AI Platform & App Architect is here'}
      </p>

      {/* Quick Suggestion Chips for building platforms and uploading files */}
      {onQuickPrompt && (
        <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-lg sm:max-w-2xl lg:max-w-3xl">
          <button
            onClick={() =>
              onQuickPrompt('خش هذا الموقع: https://github.com وبعدها اضغط علي زر تسجيل لدخول')
            }
            className={`text-xs px-3.5 py-1.5 rounded-full border transition active:scale-95 text-right font-semibold shadow-xs ${
              isDark
                ? 'bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-200 hover:text-white border-cyan-400/50'
                : 'bg-cyan-50 hover:bg-cyan-100/90 text-cyan-800 hover:text-cyan-950 border-cyan-300'
            }`}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            🧭{' '}
            {isArabic
              ? 'استكشاف منصة: خش GitHub واضغط على زر تسجيل الدخول'
              : 'Explore Platform: Visit GitHub & Click Login'}
          </button>
          <button
            onClick={() =>
              onQuickPrompt(
                'ابحث في الإنترنت عن آخر أخبار الذكاء الاصطناعي ولخصها في جدول تفاعلي'
              )
            }
            className={`text-xs px-3.5 py-1.5 rounded-full border transition active:scale-95 text-right font-semibold shadow-xs ${
              isDark
                ? 'bg-sky-950/60 hover:bg-sky-900/70 text-sky-300 hover:text-white border-sky-500/40'
                : 'bg-sky-50 hover:bg-sky-100/90 text-sky-800 hover:text-sky-950 border-sky-300'
            }`}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            🌐{' '}
            {isArabic
              ? 'بحث بالإنترنت: أخبار الذكاء الاصطناعي وجدول تفاعلي'
              : 'Agent Search: AI News + Table'}
          </button>
          <button
            onClick={() =>
              onQuickPrompt(
                'ابحث في الويب عن أسعار العملات والمعادن اليوم وصمم صفحة تحويل تفاعلية'
              )
            }
            className={`text-xs px-3.5 py-1.5 rounded-full border transition active:scale-95 text-right ${
              isDark
                ? 'bg-blue-950/50 hover:bg-blue-900/60 text-blue-300 hover:text-white border-blue-500/35'
                : 'bg-blue-50 hover:bg-blue-100/90 text-blue-800 hover:text-blue-950 border-blue-300'
            }`}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            🔍{' '}
            {isArabic
              ? 'بحث بالإنترنت: أسعار العملات والمعادن + صفحة تفاعلية'
              : 'Agent Search: Currencies + Web App'}
          </button>
          <button
            onClick={() => onQuickPrompt('curl https://httpbin.org/json')}
            className={`text-xs px-3.5 py-1.5 rounded-full border transition active:scale-95 font-mono ${
              isDark
                ? 'bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 hover:text-white border-cyan-500/30'
                : 'bg-cyan-50/80 hover:bg-cyan-100 text-cyan-800 hover:text-cyan-950 border-cyan-300/80'
            }`}
            dir="ltr"
          >
            ⚡ curl https://httpbin.org/json
          </button>
          <button
            onClick={() =>
              onQuickPrompt(
                "python3 -c \"import math; print('حساب مساحة دائرة:', [math.pi * r**2 for r in range(1, 5)])\""
              )
            }
            className={`text-xs px-3.5 py-1.5 rounded-full border transition active:scale-95 font-mono ${
              isDark
                ? 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 hover:text-white border-amber-500/30'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 hover:text-amber-950 border-amber-300'
            }`}
            dir="ltr"
          >
            🐍 python3 script
          </button>
          <button
            onClick={() =>
              onQuickPrompt(
                'حلل واستخرج محتوى هذا الموقع: https://en.wikipedia.org/wiki/Artificial_intelligence'
              )
            }
            className={`text-xs px-3.5 py-1.5 rounded-full border transition active:scale-95 text-right ${
              isDark
                ? 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 hover:text-white border-emerald-500/30'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 hover:text-emerald-950 border-emerald-300'
            }`}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            🌐 تحليل واستخراج موقع ويب (مثل Gemini)
          </button>
          <button
            onClick={() =>
              onQuickPrompt(
                'ابنِ منصة تجارة إلكترونية متكاملة مع سلة تسوق وفلاتر للمنتجات وتصميم عصري'
              )
            }
            className={`text-xs px-3.5 py-1.5 rounded-full border transition active:scale-95 text-right ${
              isDark
                ? 'bg-[#1e2027] hover:bg-[#282a33] text-slate-300 hover:text-white border-white/5'
                : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 border-slate-200 shadow-xs'
            }`}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            🛍️ منصة متجر إلكتروني متكاملة
          </button>
          <button
            onClick={() =>
              onQuickPrompt(
                'صمم لوحة تحكم ذكية وإحصائيات متقدمة للشركات مع رسوم بيانية تفاعلية'
              )
            }
            className={`text-xs px-3.5 py-1.5 rounded-full border transition active:scale-95 text-right ${
              isDark
                ? 'bg-[#1e2027] hover:bg-[#282a33] text-slate-300 hover:text-white border-white/5'
                : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 border-slate-200 shadow-xs'
            }`}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            📊 لوحة تحكم وإحصائيات (Dashboard)
          </button>
          <button
            onClick={() =>
              onQuickPrompt(
                'أنشئ تطبيق كانبان تفاعلي لإدارة المهام والمشاريع مع السحب والإفلات وحفظه في سوداستاك SudaStack'
              )
            }
            className={`text-xs px-3.5 py-1.5 rounded-full border transition active:scale-95 text-right ${
              isDark
                ? 'bg-[#1e2027] hover:bg-[#282a33] text-slate-300 hover:text-white border-white/5'
                : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 border-slate-200 shadow-xs'
            }`}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            📋 تطبيق إدارة مهام كانبان
          </button>
          <button
            onClick={() =>
              onQuickPrompt(
                'ابنِ منصة تواصل اجتماعي وتطبيقات تفاعلية مع نشر المنشورات والمحادثة الفورية'
              )
            }
            className={`text-xs px-3.5 py-1.5 rounded-full border transition active:scale-95 text-right ${
              isDark
                ? 'bg-[#1e2027] hover:bg-[#282a33] text-slate-300 hover:text-white border-white/5'
                : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-950 border-slate-200 shadow-xs'
            }`}
            dir={isArabic ? 'rtl' : 'ltr'}
          >
            💬 منصة تواصل وتطبيقات تفاعلية
          </button>
        </div>
      )}
    </div>
  );
};

export const StudioWelcomeHero = React.memo(StudioWelcomeHeroComponent);
