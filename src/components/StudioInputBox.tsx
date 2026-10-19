import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Paperclip,
  Square,
  Eye,
  X,
  ArrowUp,
  FileText,
  FileCode,
  Terminal,
  Mic,
  MicOff,
  Sparkles,
  Image as ImageIcon,
  ChevronUp,
} from 'lucide-react';
import { TelegramStorageFile, SudaResponseMode } from '../types';
import { detectFileTypeAndCategory, extractZipToStorageFiles } from '../utils/zipUtils';
import { useToast } from './ToastNotification';
import { useTheme } from '../context/ThemeContext';

interface StudioInputBoxProps {
  onSendMessage: (text: string, attachedFiles?: TelegramStorageFile[]) => void;
  isLoading: boolean;
  onStopGenerating?: () => void;
  onOpenSettings: () => void;
  placeholder?: string;
  externalText?: string;
  onClearExternalText?: () => void;
  isArabic?: boolean;
  zeroTokenMode?: boolean;
  onToggleZeroTokenMode?: (enabled: boolean) => void;
  onOpenFile?: (file: TelegramStorageFile) => void;
  responseMode?: SudaResponseMode;
  isAutonomousActive?: boolean;
  onToggleAutonomous?: (active: boolean) => void;
  isAutonomousRunning?: boolean;
  showImageOptions?: boolean;
  showVoiceInput?: boolean;
  showFileUpload?: boolean;
  onAdminKeyDetected?: (key: string) => void;
  onOpenTerminalSandbox?: () => void;
  onSaveFilesBatch?: (files: TelegramStorageFile[]) => void;
}

const LONG_PASTE_THRESHOLD = 1400;

export const StudioInputBox: React.FC<StudioInputBoxProps> = ({
  onSendMessage,
  isLoading,
  onStopGenerating,
  onOpenSettings,
  placeholder,
  externalText,
  onClearExternalText,
  isArabic = true,
  onOpenFile,
  responseMode = 'coding',
  isAutonomousActive = true,
  onToggleAutonomous,
  isAutonomousRunning = false,
  showImageOptions = true,
  showVoiceInput = true,
  showFileUpload = true,
  onAdminKeyDetected,
  onOpenTerminalSandbox,
  onSaveFilesBatch,
}) => {
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<TelegramStorageFile[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechLang, setSpeechLang] = useState(isArabic ? 'ar-SA' : 'en-US');
  const [showSearchMenu, setShowSearchMenu] = useState(false);
  const [showAttachmentsMenu, setShowAttachmentsMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const unifiedFileInputRef = useRef<HTMLInputElement>(null);
  const attachmentsMenuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const manualStopRef = useRef<boolean>(false);

  // Close attachments menu on outside click or Escape key
  useEffect(() => {
    if (!showAttachmentsMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (attachmentsMenuRef.current && !attachmentsMenuRef.current.contains(e.target as Node)) {
        setShowAttachmentsMenu(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAttachmentsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showAttachmentsMenu]);

  // Sync speech language when Arabic toggle changes
  useEffect(() => {
    setSpeechLang(isArabic ? 'ar-SA' : 'en-US');
  }, [isArabic]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const defaultPlaceholder =
    attachedFiles.length > 0
      ? isArabic
        ? `اكتب ما تريد استخراجه أو تحليله من الملف (${attachedFiles[0].name})، أو اضغط إرسال للتحليل المباشر...`
        : `Ask what you want to extract or analyze from (${attachedFiles[0].name}), or press send...`
      : isArabic
      ? 'اكتب رسالتك، ابحث بالإنترنت (ابحث عن...)، أو ضع رابط موقع / أمر curl أو python...'
      : 'Type your message, search the web with agent (Search for...), or enter a URL/command...';
  const effectivePlaceholder =
    attachedFiles.length > 0 ? defaultPlaceholder : placeholder || defaultPlaceholder;

  const createPastedFileObject = (pastedContent: string): TelegramStorageFile => {
    const charLen = pastedContent.length;
    return {
      id: `pasted-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: 'نص.txt',
      type: 'text',
      category: 'docs',
      sizeBytes: new Blob([pastedContent]).size,
      content: pastedContent,
      createdAt: new Date().toISOString(),
      createdBy: 'user',
      description: isArabic
        ? `📄 نص ملصوق — نص.txt (${charLen.toLocaleString()} حرف)`
        : `📄 Pasted Text — نص.txt (${charLen.toLocaleString()} chars)`,
      telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
      isPastedText: true,
      charCount: charLen,
    };
  };

  // Sync external text
  useEffect(() => {
    if (externalText !== undefined && externalText !== '') {
      if (externalText.length > LONG_PASTE_THRESHOLD) {
        const pastedFile = createPastedFileObject(externalText);
        setAttachedFiles((prev) => [...prev, pastedFile]);
        setText('');
      } else {
        setText(externalText);
      }
      if (onClearExternalText) onClearExternalText();
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
      }, 50);
    }
  }, [externalText, onClearExternalText]);

  // Auto resize textarea (stable, fixed height bounds)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  // Comprehensive file processor for Vision (Images), PDFs, and Documents
  const processFile = async (file: File): Promise<TelegramStorageFile> => {
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp|ico)$/i.test(file.name);
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

    if (isImage) {
      const isSvg = file.type.includes('svg') || file.name.toLowerCase().endsWith('.svg');
      let svgText = '';
      if (isSvg) {
        try {
          svgText = await file.text();
        } catch {}
      }

      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const rawDataUrl = reader.result as string;

          // For SVGs, preserve vector text directly without canvas rasterization
          if (isSvg) {
            const base64 = rawDataUrl.includes('base64,') ? rawDataUrl.split('base64,')[1] : '';
            resolve({
              id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: file.name,
              type: 'image',
              category: 'other',
              sizeBytes: file.size,
              content: svgText,
              dataUrl: rawDataUrl,
              base64,
              mimeType: 'image/svg+xml',
              isImage: true,
              createdAt: new Date().toISOString(),
              createdBy: 'user',
              description: isArabic
                ? `🖼️ رسم بياني متجه SVG للرؤية: ${file.name}`
                : `🖼️ SVG Vector Graphics: ${file.name}`,
              telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
            });
            return;
          }

          // For raster images (PNG, JPEG, WebP), perform high-efficiency browser compression
          // This keeps payloads under 200KB for optimal transmission over Cloudflare Edge and WebSocket
          const img = new Image();
          img.onload = () => {
            const naturalW = img.naturalWidth || img.width;
            const naturalH = img.naturalHeight || img.height;

            const maxDim = 1200;
            let targetW = naturalW;
            let targetH = naturalH;
            if (targetW > maxDim || targetH > maxDim) {
              if (targetW > targetH) {
                targetH = Math.round((targetH * maxDim) / targetW);
                targetW = maxDim;
              } else {
                targetW = Math.round((targetW * maxDim) / targetH);
                targetH = maxDim;
              }
            }

            try {
              const canvas = document.createElement('canvas');
              canvas.width = targetW;
              canvas.height = targetH;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, targetW, targetH);
                const outMime = file.type === 'image/png' && file.size < 400000 ? 'image/png' : 'image/jpeg';
                const compressedDataUrl = canvas.toDataURL(outMime, 0.85);
                const base64 = compressedDataUrl.includes('base64,') ? compressedDataUrl.split('base64,')[1] : '';
                const approxSize = Math.round((base64.length * 3) / 4);

                resolve({
                  id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  name: file.name,
                  type: 'image',
                  category: 'other',
                  sizeBytes: approxSize,
                  content: compressedDataUrl,
                  dataUrl: compressedDataUrl,
                  base64,
                  mimeType: outMime,
                  imageDimensions: { width: targetW, height: targetH },
                  isImage: true,
                  createdAt: new Date().toISOString(),
                  createdBy: 'user',
                  description: isArabic
                    ? `🖼️ صورة للتحليل والرؤية: ${file.name} (${targetW}×${targetH})`
                    : `🖼️ Image for Vision Analysis: ${file.name} (${targetW}×${targetH})`,
                  telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
                });
                return;
              }
            } catch {}

            // Fallback if canvas compression fails
            const fallbackB64 = rawDataUrl.includes('base64,') ? rawDataUrl.split('base64,')[1] : '';
            resolve({
              id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: file.name,
              type: 'image',
              category: 'other',
              sizeBytes: file.size,
              content: rawDataUrl,
              dataUrl: rawDataUrl,
              base64: fallbackB64,
              mimeType: file.type || 'image/jpeg',
              imageDimensions: { width: naturalW, height: naturalH },
              isImage: true,
              createdAt: new Date().toISOString(),
              createdBy: 'user',
              description: isArabic
                ? `🖼️ صورة للتحليل والرؤية: ${file.name} (${naturalW}×${naturalH})`
                : `🖼️ Image for Vision Analysis: ${file.name} (${naturalW}×${naturalH})`,
              telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
            });
          };

          img.onerror = () => {
            const fallbackB64 = rawDataUrl.includes('base64,') ? rawDataUrl.split('base64,')[1] : '';
            resolve({
              id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              name: file.name,
              type: 'image',
              category: 'other',
              sizeBytes: file.size,
              content: rawDataUrl,
              dataUrl: rawDataUrl,
              base64: fallbackB64,
              mimeType: file.type || 'image/jpeg',
              isImage: true,
              createdAt: new Date().toISOString(),
              createdBy: 'user',
              description: isArabic ? `🖼️ صورة للرؤية: ${file.name}` : `🖼️ Image for Vision: ${file.name}`,
              telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
            });
          };

          img.src = rawDataUrl;
        };
        reader.readAsDataURL(file);
      });
    }

    if (isPdf) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.includes('base64,') ? dataUrl.split('base64,')[1] : '';
          resolve({
            id: `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            type: 'document',
            category: 'docs',
            sizeBytes: file.size,
            content: dataUrl,
            dataUrl,
            base64,
            mimeType: 'application/pdf',
            isPdf: true,
            createdAt: new Date().toISOString(),
            createdBy: 'user',
            description: isArabic ? `📑 مستند PDF للتحليل: ${file.name}` : `📑 PDF Document for Analysis: ${file.name}`,
            telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
          });
        };
        reader.readAsDataURL(file);
      });
    }

    // Standard document or code file
    let content = '';
    try {
      content = await file.text();
    } catch {
      content = `[ملف مرفق: ${file.name} - الحجم: ${(file.size / 1024).toFixed(1)} KB]`;
    }

    const typeInfo = detectFileTypeAndCategory(file.name);
    return {
      id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: file.name,
      type: typeInfo.type,
      category: typeInfo.category,
      sizeBytes: file.size,
      content: content || `// ${file.name}`,
      createdAt: new Date().toISOString(),
      createdBy: 'user',
      description: isArabic
        ? `📁 مستند/ملف مرفق للتحليل: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`
        : `📁 Attached doc for analysis: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      telegramMessageId: Math.floor(Math.random() * 9000) + 1000,
      charCount: content.length,
    };
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // 1. Direct Clipboard Image Paste Support (e.g. screenshots)
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const imageFile = item.getAsFile();
          if (imageFile) {
            const processed = await processFile(imageFile);
            setAttachedFiles((prev) => [...prev, processed]);
            showToast(
              isArabic ? '🖼️ تم لصق الصورة بنجاح وتجهيزها للرؤية البصرية' : '🖼️ Image pasted for vision analysis',
              'success'
            );
            return;
          }
        }
      }
    }

    // 2. Text paste handling
    const pastedText = e.clipboardData?.getData('text') || '';
    const combinedLength = text.length + pastedText.length;
    if (pastedText.length > LONG_PASTE_THRESHOLD || combinedLength > LONG_PASTE_THRESHOLD) {
      e.preventDefault();
      const contentToAttach = text ? `${text}\n${pastedText}` : pastedText;
      const pastedFile = createPastedFileObject(contentToAttach);
      setAttachedFiles((prev) => [...prev, pastedFile]);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    if (newVal.length > LONG_PASTE_THRESHOLD) {
      const pastedFile = createPastedFileObject(newVal);
      setAttachedFiles((prev) => [...prev, pastedFile]);
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.focus();
      }
      return;
    }
    setText(newVal);
  };

  const handleRemoveAttachedFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Process files including automatic ZIP extraction for projects (like mubarak.zip)
  const processSelectedFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    const toAttach: TelegramStorageFile[] = [];
    const toSaveBatch: TelegramStorageFile[] = [];
    let zipCount = 0;
    let pyProjectCount = 0;
    let lastZipResult: any = null;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const isZip = f.name.toLowerCase().endsWith('.zip') || f.type.includes('zip');

      if (isZip) {
        zipCount++;
        const zipRes = await extractZipToStorageFiles(f, isArabic);
        lastZipResult = zipRes;
        if (zipRes.files && zipRes.files.length > 0) {
          toSaveBatch.push(...zipRes.files);
          toAttach.push(...zipRes.files);
          if (zipRes.isPythonProject) {
            pyProjectCount++;
          }
        }
      } else {
        const processed = await processFile(f);
        toAttach.push(processed);
        toSaveBatch.push(processed);
      }
    }

    if (toSaveBatch.length > 0 && onSaveFilesBatch) {
      onSaveFilesBatch(toSaveBatch);
    }

    if (toAttach.length > 0) {
      setAttachedFiles((prev) => [...prev, ...toAttach]);
    }

    // Feedback and prefilled guidance
    if (pyProjectCount > 0 && lastZipResult) {
      showToast(
        isArabic
          ? `🐍 تم فك ضغط مشروع Python [${lastZipResult.folderName}] (${lastZipResult.extractedCount} ملفات) واكتشاف الإعدادات (requirements.txt, runtime.txt, Procfile)`
          : `🐍 Python project [${lastZipResult.folderName}] unzipped (${lastZipResult.extractedCount} files) with requirements.txt, runtime.txt, Procfile`,
        'success',
        6000
      );
      if (!text.trim()) {
        setText(
          isArabic
            ? `مشروع Python [${lastZipResult.folderName}] تم فك ضغطه داخل مجلد مستقل بنجاح، وتجهيز ملفات requirements.txt و runtime.txt و Procfile (${lastZipResult.procfileCommand}). يمكنك استعراض الملفات والتنقل في المجلدات وتشغيل السكربت.`
            : `Python project [${lastZipResult.folderName}] unzipped into its folder. Configured requirements.txt, runtime.txt, and Procfile (${lastZipResult.procfileCommand}). Ready to run or inspect.`
        );
      }
    } else if (zipCount > 0 && lastZipResult) {
      showToast(
        isArabic
          ? `📦 تم فك ضغط مشروع [${lastZipResult.folderName}] بنجاح (${lastZipResult.extractedCount} ملفات) داخل مجلد مستقل`
          : `📦 Project [${lastZipResult.folderName}] unzipped successfully (${lastZipResult.extractedCount} files)`,
        'success'
      );
    } else if (toAttach.length > 0) {
      showToast(
        isArabic ? '📎 تم إرفاق وحفظ الملفات بنجاح' : '📎 Files attached successfully',
        'success'
      );
    }

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 50);
  };

  const handleUnifiedFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processSelectedFiles(files);
    if (unifiedFileInputRef.current) {
      unifiedFileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processSelectedFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processSelectedFiles(files);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const stopListening = useCallback(() => {
    manualStopRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognitionClass =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognitionClass) {
      showToast(
        isArabic
          ? 'متصفحك الحالي لا يدعم واجهة التعرف على الصوت (Web Speech API). يُنصح باستخدام Google Chrome أو Microsoft Edge أو Safari.'
          : 'Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.',
        'error',
        4000
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang;
      manualStopRef.current = false;

      recognition.onstart = () => {
        setIsListening(true);
        setInterimTranscript('');
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalChunk += item[0].transcript;
          } else {
            currentInterim += item[0].transcript;
          }
        }

        if (finalChunk.trim()) {
          setText((prev) => {
            const trimmedPrev = prev.trim();
            const space = trimmedPrev.length > 0 ? ' ' : '';
            return trimmedPrev + space + finalChunk.trim();
          });
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.style.height = 'auto';
              textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
            }
          }, 20);
        }

        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          showToast(
            isArabic
              ? 'تم رفض إذن الوصول إلى الميكروفون. يرجى تفعيل إذن الميكروفون في إعدادات المتصفح لإملاء الأوامر.'
              : 'Microphone access denied. Please enable microphone permission in browser settings.',
            'error',
            4500
          );
          setIsListening(false);
          setInterimTranscript('');
        } else if (event.error === 'no-speech') {
          // Normal timeout on silence in continuous mode
        } else if (event.error !== 'aborted') {
          showToast(
            isArabic ? `تنبيه التعرف على الصوت: ${event.error}` : `Speech recognition notice: ${event.error}`,
            'info',
            3000
          );
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.start();
      recognitionRef.current = recognition;
      showToast(
        isArabic
          ? `🎙️ تم تفعيل الإملاء الصوتي (${speechLang.startsWith('ar') ? 'العربية' : 'English'}). تكلّم الآن...`
          : `🎙️ Voice dictation started (${speechLang.startsWith('ar') ? 'Arabic' : 'English'}). Speak now...`,
        'info',
        2500
      );
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      showToast(
        isArabic ? 'تعذر تشغيل الميكروفون. يرجى التحقق من أذونات المتصفح.' : 'Failed to start microphone.',
        'error'
      );
    }
  }, [isArabic, speechLang, showToast]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      showToast(isArabic ? 'تم إيقاف الإملاء الصوتي' : 'Voice dictation stopped', 'info', 1500);
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening, isArabic, showToast]);

  const toggleSpeechLang = useCallback(() => {
    const nextLang = speechLang.startsWith('ar') ? 'en-US' : 'ar-SA';
    setSpeechLang(nextLang);
    showToast(
      isArabic
        ? `تم تحويل لغة الإملاء إلى: ${nextLang === 'ar-SA' ? 'العربية 🇸🇦' : 'English 🇺🇸'}`
        : `Dictation language switched to: ${nextLang === 'ar-SA' ? 'Arabic 🇸🇦' : 'English 🇺🇸'}`,
      'info',
      2000
    );
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      setTimeout(() => {
        startListening();
      }, 100);
    }
  }, [speechLang, isArabic, showToast, isListening, startListening]);

  const canSend = (Boolean(text.trim()) || attachedFiles.length > 0) && !isLoading;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isListening) {
      stopListening();
    }

    if (text.trim() === '0703' && onAdminKeyDetected) {
      onAdminKeyDetected('0703');
      setText('');
      return;
    }

    if (!canSend) return;

    const finalPrompt =
      text.trim() ||
      (attachedFiles.length > 0
        ? (() => {
            const first = attachedFiles[0];
            const isImg = first.isImage || first.type === 'image' || first.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp)$/i.test(first.name);
            const isPdf = first.isPdf || first.mimeType === 'application/pdf' || /\.pdf$/i.test(first.name);
            if (isImg) {
              return isArabic
                ? `صف وحلل محتويات هذه الصورة بالتفصيل الدقيق، وتعرّف على كل ما فيها من عناصر ونصوص وأشكال وتصاميم وألوان.`
                : `Please describe and analyze this image in detail, recognizing all objects, text, and visual elements.`;
            }
            if (isPdf) {
              return isArabic
                ? `اقرأ هذا المستند (PDF) المرفق بعناية، ولخص أهم ما يحتويه من معلومات وأفكار رئيسية بتنسيق منظم.`
                : `Please read this PDF document carefully and summarize its key points and details.`;
            }
            return isArabic
              ? `قم بتحليل وفحص الملف المرفق [${first.name}] بالتفصيل، واستخرج كافة الأفكار، المفاهيم، والنقاط الرئيسية المطلوبة منه بشكل شامل ودقيق.`
              : `Please thoroughly analyze the attached file [${first.name}], extract all key information, concepts, and requirements in detail.`;
          })()
        : isArabic
        ? 'مرحباً، أرجو تقديم المساعدة.'
        : 'Hello, please help me.');

    onSendMessage(
      finalPrompt,
      attachedFiles.length > 0 ? [...attachedFiles] : undefined
    );
    setText('');
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleActionClick = () => {
    if (isLoading) {
      if (onStopGenerating) onStopGenerating();
      return;
    }
    handleSubmit();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      dir="ltr"
      className={`w-full px-3 sm:px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md border-t select-none shrink-0 z-30 transition-colors duration-200 ${
        isDark ? 'bg-[#0e0f12]/95 border-white/[0.06]' : 'bg-white/95 border-slate-200 shadow-sm'
      }`}
    >
      {/* Hidden Unified Input for All Attachments (Photos, Documents, Code, PDFs) */}
      <input
        ref={unifiedFileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,text/*,.pdf,.txt,.md,.json,.csv,.js,.ts,.html,.css,.py,.zip,*/*"
        onChange={handleUnifiedFileInputChange}
        className="hidden"
      />

      {/* Hidden File Input for uploading documents and PDFs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md,.json,.csv,.js,.jsx,.ts,.tsx,.html,.css,.py,.cpp,.c,.java,.xml,.yaml,.yml,.sql,.sh,.zip,application/pdf,text/*,application/json"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Hidden File Input for uploading images (Computer Vision) */}
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/*"
        onChange={handleImageInputChange}
        className="hidden"
      />

      <div className="w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto">
        {/* Main Fixed Input Card with Drag & Drop support */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setIsDragging(false);
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
              await processSelectedFiles(files);
            }
          }}
          className={`border rounded-2xl shadow-xl transition-colors duration-200 p-3 sm:p-3.5 ${
            isDark
              ? isDragging
                ? 'border-cyan-400 bg-[#16202e] ring-2 ring-cyan-500/30'
                : 'bg-[#181920] border-white/10 focus-within:border-cyan-500/40'
              : isDragging
              ? 'border-cyan-500 bg-cyan-50/70 ring-2 ring-cyan-500/30'
              : 'bg-slate-50 border-slate-200/90 focus-within:border-cyan-500/60 shadow-slate-200/50'
          }`}
        >


          {/* Attached Files, Images & Documents */}
          {attachedFiles.length > 0 && (
            <div className="space-y-2 mb-2.5">
              {attachedFiles.map((file) => {
                const charCount = file.charCount || file.content.length;
                const isImage =
                  file.isImage ||
                  file.type === 'image' ||
                  file.dataUrl ||
                  (typeof file.content === 'string' && file.content.startsWith('data:image/'));
                const isPdf =
                  file.isPdf ||
                  file.name.toLowerCase().endsWith('.pdf') ||
                  file.mimeType === 'application/pdf';
                const isCode =
                  file.category === 'code' ||
                  file.type === 'python' ||
                  file.type === 'cpp' ||
                  file.type === 'html' ||
                  file.type === 'javascript';
                const quickSnippet =
                  typeof file.content === 'string' && !isImage && !isPdf
                    ? file.content.slice(0, 160).replace(/\s+/g, ' ').trim()
                    : '';

                return (
                  <div
                    key={file.id}
                    className={`p-2.5 sm:p-3 rounded-xl border shadow-sm text-xs animate-in fade-in zoom-in-95 duration-150 ${
                      isDark
                        ? isImage
                          ? 'bg-gradient-to-r from-cyan-950/70 via-[#181d28] to-[#12141c] border-cyan-500/40'
                          : isPdf
                          ? 'bg-gradient-to-r from-rose-950/60 via-[#1d1924] to-[#15141c] border-rose-500/40'
                          : 'bg-gradient-to-r from-cyan-950/50 via-[#1d202b] to-[#171922] border-cyan-500/35'
                        : isImage
                        ? 'bg-cyan-50/90 border-cyan-300 text-slate-900'
                        : isPdf
                        ? 'bg-rose-50/90 border-rose-300 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {/* Visual Thumbnail or Type Icon */}
                        {isImage ? (
                          <div
                            onClick={() => onOpenFile?.(file)}
                            className="relative w-12 h-12 rounded-xl overflow-hidden border border-cyan-500/50 shrink-0 bg-black/60 group cursor-pointer shadow-xs"
                          >
                            <img
                              src={file.dataUrl || file.content}
                              alt={file.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        ) : isPdf ? (
                          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-500 flex items-center justify-center shrink-0 text-lg shadow-xs">
                            📑
                          </div>
                        ) : (
                          <div
                            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 text-base shadow-xs ${
                              isDark
                                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                                : 'bg-cyan-50 border-cyan-300 text-cyan-700'
                            }`}
                          >
                            {isCode ? <FileCode className="w-4.5 h-4.5" /> : <FileText className="w-4.5 h-4.5" />}
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span
                              className={`font-bold text-xs sm:text-sm font-mono truncate max-w-[180px] sm:max-w-[280px] ${
                                isDark ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              {file.name}
                            </span>

                            {isImage ? (
                              <span
                                className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                                  isDark
                                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200'
                                    : 'bg-cyan-100 border-cyan-300 text-cyan-800'
                                }`}
                              >
                                🖼️ رؤية بصرية • Vision AI
                              </span>
                            ) : isPdf ? (
                              <span
                                className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                                  isDark
                                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-200'
                                    : 'bg-rose-100 border-rose-300 text-rose-800'
                                }`}
                              >
                                📑 مستند PDF
                              </span>
                            ) : (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                  isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {file.isPastedText
                                  ? isArabic
                                    ? 'نص ملصوق'
                                    : 'Pasted Text'
                                  : isArabic
                                  ? 'مستند مرفق'
                                  : 'Doc Attached'}
                              </span>
                            )}

                            <span
                              className={`px-2 py-0.5 rounded-md font-mono text-[10px] tabular-nums ${
                                isDark ? 'bg-black/40 text-slate-300' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {formatFileSize(file.sizeBytes)}
                            </span>

                            {file.imageDimensions && (
                              <span className={`text-[10px] font-mono ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
                                ({file.imageDimensions.width}×{file.imageDimensions.height})
                              </span>
                            )}

                            {!isImage && !isPdf && charCount > 0 && (
                              <span className="text-[10px] text-slate-400 font-mono tabular-nums hidden sm:inline">
                                ({charCount.toLocaleString()} {isArabic ? 'حرف' : 'chars'})
                              </span>
                            )}
                          </div>

                          {/* Quick description note */}
                          {isImage ? (
                            <p className={`text-[11px] mt-1 font-sans ${isDark ? 'text-cyan-300/80' : 'text-cyan-800'}`}>
                              {isArabic
                                ? 'سيتم التعرف على كل تفاصيل هذه الصورة وتحليلها برؤية بصرية فورية.'
                                : 'Image will be analyzed directly via multimodal computer vision.'}
                            </p>
                          ) : isPdf ? (
                            <p className={`text-[11px] mt-1 font-sans ${isDark ? 'text-rose-300/80' : 'text-rose-800'}`}>
                              {isArabic
                                ? 'سيتم استيعاب وتلخيص صفحات مستند الـ PDF واستخراج المعلومات منه.'
                                : 'PDF document pages will be processed and comprehended by AI.'}
                            </p>
                          ) : quickSnippet ? (
                            <p
                              className={`text-[11px] mt-1 line-clamp-2 font-mono px-2 py-1 rounded-lg border ${
                                isDark
                                  ? 'text-slate-300/90 bg-black/30 border-white/5'
                                  : 'text-slate-700 bg-slate-50 border-slate-200'
                              }`}
                              dir="auto"
                            >
                              {quickSnippet}...
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* Actions: Instant Vision/Analysis + View Full File & Remove */}
                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap justify-end">
                        {isImage ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSendMessage(
                                isArabic
                                  ? `صف وحلل محتويات هذه الصورة [${file.name}] بالتفصيل الدقيق، وتعرّف على كل العناصر والنصوص والألوان والأشكال والتصاميم واشرحها باحترافية.`
                                  : `Please analyze this image [${file.name}] in detail, identifying all elements, text, and visual structures.`,
                                [file]
                              );
                              handleRemoveAttachedFile(file.id);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-bold text-[11px] shadow-xs transition active:scale-95 whitespace-nowrap"
                            title={isArabic ? 'رؤية الصورة وتحليلها فوراً' : 'Analyze Image Vision Now'}
                          >
                            <Eye className="w-3.5 h-3.5 text-black" />
                            <span>{isArabic ? '👁️ رؤية فورية' : 'Analyze Vision'}</span>
                          </button>
                        ) : isPdf ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSendMessage(
                                isArabic
                                  ? `اقرأ هذا المستند (PDF) [${file.name}] بالتفصيل، ولخص أهم ما يحتويه من معلومات وأفكار رئيسية بتنسيق منظم.`
                                  : `Please read and analyze this PDF document [${file.name}], summarizing its key points and details.`,
                                [file]
                              );
                              handleRemoveAttachedFile(file.id);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-400 hover:to-red-400 text-white font-bold text-[11px] shadow-xs transition active:scale-95 whitespace-nowrap"
                            title={isArabic ? 'قراءة وتلخيص مستند الـ PDF فوراً' : 'Read PDF Now'}
                          >
                            <Eye className="w-3.5 h-3.5 text-white" />
                            <span>{isArabic ? '📑 تلخيص PDF' : 'Read PDF'}</span>
                          </button>
                        ) : null}

                        {onOpenFile && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenFile(file);
                            }}
                            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border font-semibold text-[11px] transition active:scale-95 whitespace-nowrap ${
                              isDark
                                ? 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/35 text-cyan-200'
                                : 'bg-cyan-50 hover:bg-cyan-100 border-cyan-300 text-cyan-800'
                            }`}
                            title={isArabic ? 'عرض محتوى الملف' : 'View File Content'}
                          >
                            <Eye className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`} />
                            <span>{isArabic ? 'معاينة' : 'View'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveAttachedFile(file.id);
                          }}
                          className={`p-1.5 rounded-lg border transition active:scale-95 ${
                            isDark
                              ? 'bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border-white/10'
                              : 'bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200'
                          }`}
                          title={isArabic ? 'إزالة الملف المرفق' : 'Remove attached file'}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Live Web Speech API Dictation Banner */}
          {isListening && (
            <div
              className={`flex flex-col gap-2 p-2.5 sm:p-3 mb-2.5 rounded-xl border text-xs shadow-md animate-in fade-in zoom-in-95 duration-150 ${
                isDark
                  ? 'bg-gradient-to-r from-rose-950/60 via-[#181a24] to-cyan-950/40 border-rose-500/40'
                  : 'bg-rose-50 border-rose-300 text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-0.5 h-4 px-1 py-0.5 rounded bg-rose-500/20 border border-rose-500/30">
                    <span className="w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.3s] h-3" />
                    <span className="w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.15s] h-4" />
                    <span className="w-1 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.45s] h-2" />
                    <span className="w-1 bg-rose-500 rounded-full animate-bounce h-3.5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span className={`font-bold ${isDark ? 'text-rose-200' : 'text-rose-800'}`}>
                      {isArabic ? 'جارٍ الإملاء الصوتي (Web Speech API)...' : 'Dictating via Web Speech API...'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Toggle Dictation Language */}
                  <button
                    type="button"
                    onClick={toggleSpeechLang}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition active:scale-95 ${
                      isDark
                        ? 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/15'
                        : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200'
                    }`}
                    title={isArabic ? 'تبديل لغة التعرف على الصوت' : 'Switch speech language'}
                  >
                    <span>{speechLang.startsWith('ar') ? '🇸🇦 العربية' : '🇺🇸 English'}</span>
                  </button>

                  {/* Stop Dictation Button */}
                  <button
                    type="button"
                    onClick={stopListening}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border font-bold transition active:scale-95 text-[11px] ${
                      isDark
                        ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white border-rose-500/40'
                        : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
                    }`}
                  >
                    <MicOff className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'إنهاء الإملاء' : 'Stop'}</span>
                  </button>
                </div>
              </div>

              {/* Real-time live speech preview */}
              {interimTranscript && (
                <div
                  className={`px-3 py-1.5 rounded-lg border text-xs font-sans italic tracking-wide animate-pulse ${
                    isDark
                      ? 'bg-black/40 border-white/10 text-cyan-200'
                      : 'bg-white border-rose-200 text-cyan-800'
                  }`}
                  dir="auto"
                >
                  <span className="text-slate-400 mr-1.5">🎙️</span>«{interimTranscript}»
                </div>
              )}
            </div>
          )}

          {/* Quick Search Task Suggestions for Agent */}
          {showSearchMenu && (
            <div
              className={`flex flex-col gap-1.5 p-2.5 mb-2.5 rounded-xl border text-xs shadow-lg animate-in fade-in zoom-in-95 duration-150 ${
                isDark
                  ? 'bg-gradient-to-r from-sky-950/80 via-[#161826] to-[#11131c] border-sky-500/35'
                  : 'bg-sky-50/90 border-sky-300 text-slate-900'
              }`}
            >
              <div
                className={`flex items-center justify-between gap-2 pb-1.5 border-b ${
                  isDark ? 'border-white/5' : 'border-sky-200'
                }`}
              >
                <span className={`flex items-center gap-1.5 font-bold ${isDark ? 'text-sky-200' : 'text-sky-900'}`}>
                  <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-sky-400' : 'text-sky-600'}`} />
                  <span>
                    {isArabic
                      ? 'مهام بحث سريعة للوكيل الذكي (اختر مهمة للبدء فوراً):'
                      : 'Quick Agent Web Search Tasks (Click to load):'}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowSearchMenu(false)}
                  className={`p-1 rounded ${
                    isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-sky-100'
                  }`}
                  title={isArabic ? 'إغلاق' : 'Close'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                {[
                  {
                    title: isArabic ? 'أخبار الذكاء الاصطناعي وجدول تفاعلي' : 'AI News & Interactive Table',
                    prompt: isArabic
                      ? 'ابحث في الإنترنت عن آخر أخبار الذكاء الاصطناعي ولخصها في جدول تفاعلي'
                      : 'Search the web for latest AI news and summarize in an interactive table',
                    icon: '🌐',
                  },
                  {
                    title: isArabic ? 'أسعار العملات والذهب وحاسبة تحويل' : 'Gold & Currencies + Calculator',
                    prompt: isArabic
                      ? 'ابحث في الويب عن أسعار العملات والذهب اليوم وصمم صفحة تحويل تفاعلية'
                      : 'Search the web for today currency and gold prices and build a converter page',
                    icon: '🪙',
                  },
                  {
                    title: isArabic ? 'توثيق React 19 وكود تطبيقي' : 'React 19 Docs & Practical Code',
                    prompt: isArabic
                      ? 'ابحث عن أحدث ميزات وتوثيق React 19 واكتب كود مثال تطبيقي كامل'
                      : 'Search for React 19 features and documentation and write a complete example',
                    icon: '⚛️',
                  },
                  {
                    title: isArabic ? 'أفضل مكتبات Tailwind CSS مفتوحة المصدر' : 'Best Open Source Tailwind Libraries',
                    prompt: isArabic
                      ? 'ابحث في الإنترنت عن أفضل مكتبات Tailwind CSS المجانية وصمم معرضاً لها'
                      : 'Search for top free Tailwind CSS libraries and design a showcase page',
                    icon: '🎨',
                  },
                ].map((task, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setText(task.prompt);
                      setShowSearchMenu(false);
                      setTimeout(() => {
                        textareaRef.current?.focus();
                      }, 50);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition active:scale-95 group ${
                      isDark
                        ? 'bg-black/40 hover:bg-sky-500/15 border-white/5 hover:border-sky-500/30 text-slate-200 hover:text-white'
                        : 'bg-white hover:bg-sky-100/70 border-sky-200 hover:border-sky-400 text-slate-800 hover:text-slate-950'
                    }`}
                    dir={isArabic ? 'rtl' : 'ltr'}
                  >
                    <span className="text-sm shrink-0">{task.icon}</span>
                    <span
                      className={`text-[11.5px] font-medium leading-tight truncate ${
                        isDark ? 'group-hover:text-sky-200' : 'group-hover:text-sky-900'
                      }`}
                    >
                      {task.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 0703 Admin Key Detection Card */}
          {text.trim() === '0703' && (
            <div
              className={`mb-2.5 p-2.5 rounded-xl border shadow-md flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
                isDark
                  ? 'bg-gradient-to-r from-cyan-950 via-[#181d28] to-[#12141c] border-cyan-400/60'
                  : 'bg-cyan-50 border-cyan-400'
              }`}
            >
              <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-cyan-200' : 'text-cyan-900'}`}>
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
                <span className="font-bold">
                  {isArabic ? '🔑 تم التعرف على المفتاح الخاص 0703' : '🔑 Admin key 0703 detected'}
                </span>
                <span className={`text-[11px] hidden sm:inline ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {isArabic ? '— اضغط للدخول والتحقق من قاعدة البيانات' : '— Click to enter and verify'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onAdminKeyDetected) onAdminKeyDetected('0703');
                  setText('');
                }}
                className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition active:scale-95 shadow-xs"
              >
                {isArabic ? 'دخول لوحة التحكم' : 'Enter Dashboard'}
              </button>
            </div>
          )}

          {/* Top: Auto-expanding Textarea (Fixed stable bounds, comfortable typing) */}
          <textarea
            ref={textareaRef}
            value={text}
            onPaste={handlePaste}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={effectivePlaceholder}
            rows={1}
            dir={isArabic ? 'rtl' : 'ltr'}
            className={`w-full bg-transparent border-0 resize-none leading-relaxed px-1 text-sm sm:text-base min-h-[42px] max-h-[140px] font-sans focus:outline-none ${
              !isArabic ? 'text-left' : 'text-right'
            } ${
              isDark ? 'text-slate-100 placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
            }`}
          />

          {/* Bottom Action Row (Reversed when in English only) */}
          <div
            className={`flex items-center justify-between border-t mt-2 pt-2 ${
              !isArabic ? 'flex-row-reverse' : ''
            } ${
              isDark ? 'border-white/5' : 'border-slate-200/80'
            }`}
          >
            {/* Tool / Media / Config Controls Cluster: Only 3 buttons (Attachments, Voice recorder, Agent) */}
            <div className={`flex items-center gap-2 text-slate-400 min-w-0 ${!isArabic ? 'flex-row-reverse' : ''}`}>
              {/* 1. زر المرفقات: عند الضغط عليه يظهر خياران (الصور والملفات) */}
              {(showImageOptions || showFileUpload) && (
                <div ref={attachmentsMenuRef} className="relative shrink-0">
                  {showAttachmentsMenu && (
                    <div
                      dir={isArabic ? 'rtl' : 'ltr'}
                      className={`absolute bottom-full mb-2.5 ${
                        isArabic ? 'left-0' : 'right-0'
                      } w-64 sm:w-72 rounded-2xl border p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150 ${
                        isDark
                          ? 'bg-[#151720]/98 border-white/15 shadow-black/80 backdrop-blur-xl'
                          : 'bg-white/98 border-slate-200 shadow-slate-300/80 backdrop-blur-xl'
                      }`}
                    >
                      <div
                        className={`px-2.5 py-1.5 mb-1 border-b flex items-center justify-between text-[11px] font-bold ${
                          isDark ? 'border-white/10 text-slate-400' : 'border-slate-100 text-slate-500'
                        }`}
                      >
                        <span>{isArabic ? 'اختر نوع المرفق' : 'Select Attachment Type'}</span>
                        <Paperclip className="w-3 h-3 opacity-70" />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        {/* الخيار الأول: الصور (إرفاق صورة) */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachmentsMenu(false);
                            imageInputRef.current?.click();
                          }}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-right transition active:scale-[0.98] group ${
                            isDark
                              ? 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/25 hover:border-cyan-400/50 text-slate-100'
                              : 'bg-cyan-50/70 hover:bg-cyan-100/80 border-cyan-200 hover:border-cyan-300 text-slate-900'
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition group-hover:scale-105 ${
                              isDark
                                ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                                : 'bg-white border-cyan-300 text-cyan-600 shadow-2xs'
                            }`}
                          >
                            <ImageIcon className="w-4.5 h-4.5" />
                          </div>
                          <div className={`flex-1 min-w-0 ${isArabic ? 'text-right' : 'text-left'}`}>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-xs font-bold ${
                                  isDark ? 'text-cyan-200' : 'text-cyan-900'
                                }`}
                              >
                                {isArabic ? 'الصور (إرفاق صورة)' : 'Images (Attach Photo)'}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  isDark
                                    ? 'bg-cyan-500/25 text-cyan-300'
                                    : 'bg-cyan-200/80 text-cyan-800'
                                }`}
                              >
                                Vision
                              </span>
                            </div>
                            <p
                              className={`text-[10.5px] mt-0.5 truncate ${
                                isDark ? 'text-slate-400' : 'text-slate-600'
                              }`}
                            >
                              {isArabic
                                ? 'رؤية بصرية وتحليل الصور (PNG, JPG, WebP, SVG)'
                                : 'Visual recognition & analysis (PNG, JPG, SVG)'}
                            </p>
                          </div>
                        </button>

                        {/* الخيار الثاني: الملفات (إرفاق ملفات ومستندات) */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowAttachmentsMenu(false);
                            fileInputRef.current?.click();
                          }}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-right transition active:scale-[0.98] group ${
                            isDark
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/25 hover:border-emerald-400/50 text-slate-100'
                              : 'bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-200 hover:border-emerald-300 text-slate-900'
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition group-hover:scale-105 ${
                              isDark
                                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                                : 'bg-white border-emerald-300 text-emerald-600 shadow-2xs'
                            }`}
                          >
                            <FileText className="w-4.5 h-4.5" />
                          </div>
                          <div className={`flex-1 min-w-0 ${isArabic ? 'text-right' : 'text-left'}`}>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-xs font-bold ${
                                  isDark ? 'text-emerald-200' : 'text-emerald-900'
                                }`}
                              >
                                {isArabic ? 'الملفات (إرفاق ملف)' : 'Files (Attach File)'}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  isDark
                                    ? 'bg-emerald-500/25 text-emerald-300'
                                    : 'bg-emerald-200/80 text-emerald-800'
                                }`}
                              >
                                Docs & Code
                              </span>
                            </div>
                            <p
                              className={`text-[10.5px] mt-0.5 truncate ${
                                isDark ? 'text-slate-400' : 'text-slate-600'
                              }`}
                            >
                              {isArabic
                                ? 'مستندات PDF، ملفات نصية، وأكواد برمجية'
                                : 'PDFs, text documents & source code files'}
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowAttachmentsMenu((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border active:scale-95 transition text-xs font-semibold shrink-0 shadow-xs ${
                      showAttachmentsMenu
                        ? isDark
                          ? 'bg-cyan-500/30 border-cyan-400 text-cyan-100 ring-2 ring-cyan-500/20'
                          : 'bg-cyan-100 border-cyan-400 text-cyan-900 ring-2 ring-cyan-500/20'
                        : isDark
                        ? 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/40 text-cyan-200'
                        : 'bg-cyan-50 hover:bg-cyan-100 border-cyan-300 text-cyan-800'
                    }`}
                    title={
                      isArabic
                        ? 'إرفاق الصور للرؤية البصرية أو الملفات والمستندات'
                        : 'Attach Images (Vision) or Files & Documents'
                    }
                    aria-label="Attachments"
                    aria-expanded={showAttachmentsMenu}
                  >
                    <Paperclip className={`w-3.5 h-3.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                    <span>{isArabic ? 'المرفقات' : 'Attach'}</span>
                    <ChevronUp
                      className={`w-3 h-3 transition-transform duration-150 ${
                        showAttachmentsMenu ? 'rotate-180' : ''
                      } ${isDark ? 'text-cyan-400/80' : 'text-cyan-600/80'}`}
                    />
                  </button>
                </div>
              )}

              {/* 2. زر مسجل الصوت فقط (Voice Dictation / Recorder) */}
              {showVoiceInput && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border active:scale-95 transition text-xs font-semibold shrink-0 shadow-xs ${
                    isListening
                      ? 'bg-rose-500 text-white border-rose-400 shadow-rose-500/40 animate-pulse'
                      : isDark
                      ? 'bg-white/5 hover:bg-rose-500/15 border-white/10 hover:border-rose-500/30 text-slate-300 hover:text-rose-200'
                      : 'bg-white hover:bg-rose-50 border-slate-200 hover:border-rose-300 text-slate-700 hover:text-rose-700 shadow-2xs'
                  }`}
                  title={
                    isListening
                      ? isArabic
                        ? 'إيقاف مسجل الصوت'
                        : 'Stop Voice Recorder'
                      : isArabic
                      ? 'تسجيل وإملاء صوتي (Web Speech API)'
                      : 'Voice Recorder (Web Speech API)'
                  }
                  aria-label="Voice Recorder"
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 text-white" />
                      <span className="text-white font-bold">{isArabic ? 'جارٍ التسجيل' : 'Recording'}</span>
                    </>
                  ) : (
                    <>
                      <Mic className={`w-3.5 h-3.5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
                      <span>{isArabic ? 'مسجل الصوت' : 'Voice'}</span>
                    </>
                  )}
                </button>
              )}

              {/* 3. زر ساندبوكس بايثون ومشغل الطرفية (Python Sandbox & Terminal Runner) */}
              {onOpenTerminalSandbox && (
                <button
                  type="button"
                  onClick={onOpenTerminalSandbox}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border active:scale-95 transition text-xs font-semibold shrink-0 shadow-xs ${
                    isDark
                      ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300'
                      : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                  }`}
                  title={
                    isArabic
                      ? 'فتح ساندبوكس بايثون ومشغل الطرفية السحابية (Terminal)'
                      : 'Open Python Sandbox & Server Terminal'
                  }
                  aria-label="Terminal Sandbox"
                >
                  <Terminal className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span className="hidden sm:inline">{isArabic ? 'الطرفية' : 'Terminal'}</span>
                </button>
              )}


            </div>

            {/* Distinctive Send & Stop Button */}
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={handleActionClick}
                disabled={!canSend && !isLoading}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center transition-all duration-150 active:scale-95 shrink-0 shadow-sm ${
                  isLoading
                    ? 'bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 text-white shadow-rose-500/40 hover:shadow-rose-500/60 animate-pulse hover:scale-105 cursor-pointer'
                    : canSend
                    ? 'bg-gradient-to-tr from-cyan-400 via-cyan-300 to-sky-400 text-slate-950 shadow-cyan-500/35 hover:shadow-cyan-400/50 hover:scale-105 cursor-pointer'
                    : isDark
                    ? 'bg-white/[0.06] text-slate-500 border border-white/5 cursor-not-allowed'
                    : 'bg-slate-200 text-slate-400 border border-slate-300/60 cursor-not-allowed'
                }`}
                title={
                  isLoading
                    ? isArabic
                      ? 'إيقاف الرد فوراً'
                      : 'Stop generation'
                    : isArabic
                    ? 'إرسال الطلب عبر SudaMode V1.0'
                    : 'Send'
                }
                aria-label={isLoading ? 'Stop Response' : 'Send Message'}
              >
                {isLoading ? (
                  <Square className="w-4 h-4 fill-white stroke-none" />
                ) : (
                  <ArrowUp className="w-5 h-5 stroke-[2.8]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
