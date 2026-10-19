import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  RefreshCw,
  Eye,
  Download,
  Trash2,
  Cloud
} from 'lucide-react';
import { AIChatMessage, TelegramStorageFile } from '../types';

interface AIChatPanelProps {
  messages: AIChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onOpenFile: (file: TelegramStorageFile) => void;
  onClearChat: () => void;
  isLoading: boolean;
  isArabic: boolean;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({
  messages,
  onSendMessage,
  onOpenFile,
  onClearChat,
  isLoading,
  isArabic,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const quickPrompts = [
    { label: isArabic ? '🌐 صفحة هبوط HTML' : '🌐 HTML Landing', prompt: 'أنشئ صفحة هبوط HTML متجاوبة وعصرية لمطعم وكافيه راقي مع قائمة طعام وأزرار حجز.' },
    { label: isArabic ? '🐍 سكريبت بايثون' : '🐍 Python Script', prompt: 'اكتب سكريبت بايثون متكامل يقوم بقراءة بيانات المبيعات وحساب الأرباح والتقارير الشهرية.' },
    { label: isArabic ? '🔐 صفحة تسجيل دخول' : '🔐 Login Page', prompt: 'أنشئ صفحة تسجيل دخول عصرية بتنسيقات CSS جذابة تدعم الوضع الليلي وتجاوب الهواتف.' },
    { label: isArabic ? '📄 صفحة سيرة ذاتية' : '📄 Portfolio CV', prompt: 'أنشئ صفحة سيرة ذاتية تفاعلية لمطور ويب بتصميم بطاقات أنيق ومتجاوب.' },
    { label: isArabic ? '⚙️ ملف بيانات JSON' : '⚙️ JSON Data', prompt: 'أنشئ ملف بيانات JSON يحتوي على قائمة منتجات متجر مع الأسعار والتصنيفات.' },
  ];

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs">
      
      {/* Top Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                {isArabic ? 'المساعد الذكي' : 'AI Assistant'}
              </h2>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 shrink-0 font-medium">
                SudaMode V1
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate">
              {isArabic
                ? 'اطلب أي صفحة أو كود للحفظ في سحابة SudaStack'
                : 'Create files and save directly to SudaStack Cloud'}
            </p>
          </div>
        </div>

        <button
          id="clear-chat-btn"
          onClick={onClearChat}
          title={isArabic ? 'تفريغ المحادثة' : 'Clear Chat'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-50 transition active:scale-95"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Prompts (Compact small pills) */}
      <div className="px-3 py-1.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 touch-pan-x">
        <span className="text-[10px] font-medium text-slate-500 shrink-0 flex items-center gap-1 ml-0.5">
          <Sparkles className="w-3 h-3 text-sky-500" />
          <span className="hidden sm:inline">{isArabic ? 'نماذج:' : 'Quick:'}</span>
        </span>
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            onClick={() => {
              setInput(qp.prompt);
              onSendMessage(qp.prompt);
            }}
            disabled={isLoading}
            className="text-[10px] sm:text-[11px] bg-white hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300 text-slate-700 border border-slate-200 px-2 py-1 rounded-lg transition whitespace-nowrap shrink-0 disabled:opacity-50 active:scale-95 shadow-2xs font-medium"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-slate-50/40 overscroll-contain">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-2xs">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[92%] sm:max-w-[80%] rounded-2xl p-2.5 sm:p-3 text-xs sm:text-sm leading-relaxed space-y-2 ${
                  isUser
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-tr-xs shadow-xs font-normal'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-xs'
                }`}
              >
                {/* Message Text */}
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Embedded Created Files In Telegram Card */}
                {msg.createdFiles && msg.createdFiles.length > 0 && (
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-600">
                      <Cloud className="w-3 h-3" />
                      <span>{isArabic ? 'تم الحفظ في مساحة SudaStack:' : 'Saved to SudaStack:'}</span>
                    </div>

                    {msg.createdFiles.map((file) => (
                      <div
                        key={file.id}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-base shrink-0">
                            {file.type === 'html' ? '🌐' : file.type === 'python' ? '🐍' : file.type === 'json' ? '{ }' : '📄'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="font-mono font-bold text-[11px] sm:text-xs text-slate-800 block truncate">
                              {file.name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {(file.sizeBytes / 1024).toFixed(1)} KB • {isArabic ? 'سحابي' : 'Cloud'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                          <button
                            onClick={() => onOpenFile(file)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-[11px] font-medium transition shadow-2xs active:scale-95"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{isArabic ? 'معاينة' : 'Preview'}</span>
                          </button>

                          <button
                            onClick={() => {
                              const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = file.name;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            }}
                            title={isArabic ? 'تحميل الملف' : 'Download file'}
                            className="p-1 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition flex items-center justify-center active:scale-95"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className={`text-[9px] pt-0.5 text-left ${isUser ? 'text-sky-100' : 'text-slate-400'}`}>
                  {msg.timestamp}
                </div>
              </div>

              {isUser && (
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex gap-2 justify-start items-center">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl rounded-tl-xs px-3 py-2 text-xs text-slate-600 flex items-center gap-1.5 shadow-2xs">
              <RefreshCw className="w-3 h-3 text-sky-500 animate-spin" />
              <span>{isArabic ? 'جاري إنشاء الملف وحفظه سحابياً...' : 'Generating and saving to cloud...'}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area (Simple, clean, small buttons) */}
      <div className="p-2 sm:p-2.5 border-t border-slate-200 bg-white shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-1 focus-within:border-sky-500 focus-within:bg-white transition">
            <textarea
              id="ai-chat-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isArabic
                  ? 'اكتب طلبك لإنشاء صفحة أو كود أو ملف...'
                  : 'Ask AI to create a web page, code or file...'
              }
              className="w-full bg-transparent border-0 text-slate-800 placeholder:text-slate-400 text-xs sm:text-sm focus:outline-none resize-none px-2 py-1 max-h-20"
            />
          </div>

          <button
            id="send-chat-btn"
            type="submit"
            disabled={!input.trim() || isLoading}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 disabled:opacity-40 text-white font-medium transition flex items-center justify-center shadow-xs active:scale-95 shrink-0"
            title={isArabic ? 'إرسال' : 'Send'}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

    </div>
  );
};
