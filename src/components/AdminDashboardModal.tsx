import React, { useState } from 'react';
import {
  X,
  LayoutDashboard,
  Layers,
  Cpu,
  ShieldCheck,
  HardDrive,
  Eye,
  Trash2,
  Download,
  Plus,
  Activity,
  CheckCircle2,
  Server,
  Terminal,
  Clock,
  Sparkles,
  Search,
  ExternalLink,
  Wrench,
  Database,
  KeyRound,
  Mic,
  Image as ImageIcon,
  Paperclip,
  RefreshCw,
  Send,
  Lock,
  Unlock,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  SlidersHorizontal,
  Cloud,
  Copy,
  Check,
  Upload,
  FileText,
} from 'lucide-react';
import { TelegramStorageFile, SystemConfig, SudaDbActionType } from '../types';
import { sudaDb } from '../services/sudaDatabase';
import { sudafileStorage, SudafileFileItem } from '../services/sudafileStorage';
import { useTheme } from '../context/ThemeContext';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: TelegramStorageFile[];
  onOpenFile: (file: TelegramStorageFile) => void;
  onDeleteFile: (id: string) => void;
  onSelectPromptTemplate?: (promptText: string) => void;
  isArabic: boolean;
  systemConfig?: SystemConfig;
  onUpdateSystemConfig?: (partial: Partial<SystemConfig>) => Promise<boolean>;
  onLogoutAdmin?: () => void;
  isDbConnected?: boolean;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  onClose,
  files,
  onOpenFile,
  onDeleteFile,
  onSelectPromptTemplate,
  isArabic,
  systemConfig,
  onUpdateSystemConfig,
  onLogoutAdmin,
  isDbConnected = true,
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'platforms' | 'system' | 'sudafile' | 'engine' | 'logs'>('sudafile');
  const [searchQuery, setSearchQuery] = useState('');

  // Sudafile Cloud Storage & API Key State
  const [sudafileKey, setSudafileKey] = useState<string>(() => sudafileStorage.getConfig().apiKey || 'sf_36c202_14c1e1e882437370beddd6185c226eef');
  const [sudafileUrl, setSudafileUrl] = useState<string>(() => {
    const u = sudafileStorage.getConfig().baseUrl;
    return u ? u.replace(/^(https?:\/\/)sudafile\.[^/]+/i, '$1sudafile.iqra4you.com') : 'https://sudafile.iqra4you.com';
  });
  const [showSudafileKey, setShowSudafileKey] = useState<boolean>(false);
  const [isSavingSudafileKey, setIsSavingSudafileKey] = useState<boolean>(false);
  const [sudafileKeyFeedback, setSudafileKeyFeedback] = useState<string | null>(null);
  const [sudafileFiles, setSudafileFiles] = useState<SudafileFileItem[]>([]);
  const [isLoadingSudafileFiles, setIsLoadingSudafileFiles] = useState<boolean>(false);
  const [sudafileTestResult, setSudafileTestResult] = useState<{ success: boolean; message: string; latencyMs: number } | null>(null);
  const [isTestingSudafile, setIsTestingSudafile] = useState<boolean>(false);
  const [isUploadingSudafile, setIsUploadingSudafile] = useState<boolean>(false);
  const [sudafileUploadFolder, setSudafileUploadFolder] = useState<string>('uploads');
  const [sudafileSearchQuery, setSudafileSearchQuery] = useState<string>('');
  const [isBackingUpPackages, setIsBackingUpPackages] = useState<boolean>(false);
  const [backupPackagesResult, setBackupPackagesResult] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [selectedPkgName, setSelectedPkgName] = useState<string>('telebot');
  const [isManagingPkg, setIsManagingPkg] = useState<boolean>(false);
  const [pkgManagementMsg, setPkgManagementMsg] = useState<{ success: boolean; message: string } | null>(null);

  // Python Requirements.txt Generator State
  const [requirementsInput, setRequirementsInput] = useState<string>(
    'pyTelegramBotAPI>=4.12.0\nrequests>=2.31.0\npyrebase4>=4.7.1\npython-dotenv>=1.0.0\naiohttp>=3.8.5\nbeautifulsoup4>=4.12.2'
  );
  const [isGeneratingRequirements, setIsGeneratingRequirements] = useState<boolean>(false);
  const [requirementsResultMsg, setRequirementsResultMsg] = useState<{ success: boolean; message: string } | null>(null);

  // Load Sudafile files when activeTab is sudafile
  React.useEffect(() => {
    if (activeTab === 'sudafile' && isOpen) {
      loadSudafileFilesList();
    }
  }, [activeTab, isOpen]);

  const loadSudafileFilesList = async () => {
    setIsLoadingSudafileFiles(true);
    try {
      const items = await sudafileStorage.listFiles();
      setSudafileFiles(items);
    } catch (err: any) {
      console.warn('Could not load Sudafile files:', err);
    } finally {
      setIsLoadingSudafileFiles(false);
    }
  };

  const handleSaveSudafileConfig = async () => {
    setIsSavingSudafileKey(true);
    setSudafileKeyFeedback(null);
    try {
      await sudafileStorage.setConfig({ apiKey: sudafileKey, baseUrl: sudafileUrl });
      setSudafileKeyFeedback(isArabic ? 'تم حفظ وتطبيق مفتاح Sudafile بنجاح!' : 'Sudafile API key saved successfully!');
      setTimeout(() => setSudafileKeyFeedback(null), 3500);
      loadSudafileFilesList();
    } catch (err: any) {
      setSudafileKeyFeedback(isArabic ? `خطأ: ${err.message}` : `Error: ${err.message}`);
    } finally {
      setIsSavingSudafileKey(false);
    }
  };

  const handleTestSudafile = async () => {
    setIsTestingSudafile(true);
    setSudafileTestResult(null);
    try {
      const res = await sudafileStorage.testConnection(sudafileKey, sudafileUrl);
      setSudafileTestResult(res);
    } catch (err: any) {
      setSudafileTestResult({ success: false, message: err.message, latencyMs: 0 });
    } finally {
      setIsTestingSudafile(false);
    }
  };

  const handleBackupPackages = async () => {
    setIsBackingUpPackages(true);
    setBackupPackagesResult(null);
    try {
      const res = await sudafileStorage.backupPackages();
      setBackupPackagesResult(res);
      loadSudafileFilesList();
    } catch (err: any) {
      setBackupPackagesResult({ success: false, message: err.message });
    } finally {
      setIsBackingUpPackages(false);
    }
  };

  const handleRestorePackage = async (name: string) => {
    setIsManagingPkg(true);
    setPkgManagementMsg(null);
    try {
      const res = await sudafileStorage.restorePackage(name || 'telebot');
      setPkgManagementMsg({ success: res.success, message: res.message || 'تم استعادة الحزمة بنجاح' });
    } catch (err: any) {
      setPkgManagementMsg({ success: false, message: err.message });
    } finally {
      setIsManagingPkg(false);
    }
  };

  const handleUploadPackage = async (name: string) => {
    setIsManagingPkg(true);
    setPkgManagementMsg(null);
    try {
      const res = await sudafileStorage.uploadPackage(name || 'telebot');
      setPkgManagementMsg({ success: res.success, message: res.message || 'تم رفع وحفظ الحزمة بنجاح' });
      await loadSudafileFilesList();
    } catch (err: any) {
      setPkgManagementMsg({ success: false, message: err.message });
    } finally {
      setIsManagingPkg(false);
    }
  };

  const handleDeleteSudafileFile = async (id: string) => {
    if (!confirm(isArabic ? 'هل أنت متأكد من حذف هذا الملف من سحابة Sudafile؟' : 'Are you sure you want to delete this file from Sudafile?')) return;
    try {
      await sudafileStorage.deleteFile(id);
      setSudafileFiles((prev) => prev.filter((f) => f.fileId !== id));
    } catch (err: any) {
      alert(isArabic ? `فشل الحذف: ${err.message}` : `Delete failed: ${err.message}`);
    }
  };

  const handleFileUploadSudafile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingSudafile(true);
    try {
      await sudafileStorage.uploadFile(file, sudafileUploadFolder);
      await loadSudafileFilesList();
      e.target.value = '';
    } catch (err: any) {
      alert(isArabic ? `فشل الرفع: ${err.message}` : `Upload failed: ${err.message}`);
    } finally {
      setIsUploadingSudafile(false);
    }
  };

  const handleGenerateRequirements = async () => {
    setIsGeneratingRequirements(true);
    setRequirementsResultMsg(null);
    try {
      const lines = requirementsInput
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith('#'));

      const content = lines.join('\n') + '\n';

      await sudafileStorage.uploadFile(
        {
          name: 'requirements.txt',
          content,
          type: 'text/plain',
        },
        'packages'
      );

      setRequirementsResultMsg({
        success: true,
        message: isArabic
          ? `تم توليد وتحديث ملف requirements.txt بنجاح (${lines.length} مكتبة) في سحابة Sudafile!`
          : `Successfully generated and uploaded requirements.txt (${lines.length} libraries) to Sudafile cloud!`,
      });
      loadSudafileFilesList();
    } catch (err: any) {
      setRequirementsResultMsg({
        success: false,
        message: isArabic ? `خطأ: ${err.message}` : `Error: ${err.message}`,
      });
    } finally {
      setIsGeneratingRequirements(false);
    }
  };

  // SudaFile DB Unified Runner State
  const [dbAction, setDbAction] = useState<SudaDbActionType>('get');
  const [dbPath, setDbPath] = useState<string>('suda-stack/sys');
  const [dbPayload, setDbPayload] = useState<string>('{\n  "updatedAt": ' + Date.now() + '\n}');
  const [dbExecuting, setDbExecuting] = useState<boolean>(false);
  const [dbResult, setDbResult] = useState<any>(null);
  const [dbExecutionTime, setDbExecutionTime] = useState<number | null>(null);

  // System Configuration editing state
  const [maintMsg, setMaintMsg] = useState<string>(
    systemConfig?.maintenanceMessage || 'المنصة قيد الصيانة والتحديثات الدورية — سنعود قريباً بإذن الله'
  );
  const [adminKeyInput, setAdminKeyInput] = useState<string>(systemConfig?.adminKey || '0703');
  const [isSavingSys, setIsSavingSys] = useState<boolean>(false);
  const [sysFeedback, setSysFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalBytes = files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleExportAll = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(files, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `sudastack_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div
        className={`relative w-full max-w-5xl h-[92vh] max-h-[850px] border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 transition-colors ${
          isDark
            ? 'bg-[#121318] border-white/10 text-slate-100 shadow-black/70'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
        }`}
        dir={isArabic ? 'rtl' : 'ltr'}
      >
        {/* Top Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-white/10 bg-[#0e0f12]' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-cyan-400 text-black flex items-center justify-center font-bold shadow-md shadow-cyan-500/20">
              <LayoutDashboard className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {isArabic ? 'لوحة تحكم منصة سوداستاك SudaStack' : 'SudaStack Platform Admin Dashboard'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {isArabic ? 'نشط ومستقر' : 'Operational'}
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {isArabic
                  ? 'إدارة المنصات والتطبيقات ومساحة التخزين السحابية ومحرك الذكاء'
                  : 'Manage platforms, applications, cloud storage space, and AI runtime'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/10'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
            title={isArabic ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className={`flex items-center gap-2 px-5 pt-3 pb-2 border-b overflow-x-auto text-xs font-medium ${isDark ? 'border-white/5 bg-[#16171d]' : 'border-slate-200 bg-slate-100/70'}`}>
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'overview'
                ? isDark
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'bg-white text-cyan-800 border border-cyan-300 font-semibold shadow-2xs'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{isArabic ? 'نظرة عامة والتحليلات' : 'Overview & Analytics'}</span>
          </button>

          <button
            onClick={() => setActiveTab('platforms')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'platforms'
                ? isDark
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'bg-white text-cyan-800 border border-cyan-300 font-semibold shadow-2xs'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{isArabic ? `المنصات والتطبيقات (${files.length})` : `Platforms & Apps (${files.length})`}</span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'system'
                ? isDark
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                  : 'bg-amber-50 text-amber-800 border border-amber-300 font-semibold shadow-2xs'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
            }`}
          >
            <Wrench className="w-4 h-4 text-amber-500" />
            <span>{isArabic ? 'ضبط المنصة والصيانة (suda-stack/sys)' : 'System & Maintenance (sys)'}</span>
            {systemConfig?.maintenanceMode && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('sudafile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'sudafile'
                ? isDark
                  ? 'bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-500/50 font-bold shadow-xs'
                  : 'bg-cyan-50 text-cyan-900 border border-cyan-400 font-bold shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
            }`}
          >
            <Cloud className="w-4 h-4 text-cyan-400" />
            <span>{isArabic ? 'سحابة Sudafile ومفتاح API والمكتبات' : 'Sudafile Cloud & API Key'}</span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          </button>

          <button
            onClick={() => setActiveTab('engine')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'engine'
                ? isDark
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'bg-white text-cyan-800 border border-cyan-300 font-semibold shadow-2xs'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>{isArabic ? 'محرك الذكاء والسحابة' : 'AI Engine & Cloud Node'}</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'logs'
                ? isDark
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                  : 'bg-white text-cyan-800 border border-cyan-300 font-semibold shadow-2xs'
                : isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isArabic ? 'سجل العمليات والأمان' : 'System Logs & Security'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 ${isDark ? '' : 'bg-slate-50/40'}`}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div
                  className={`p-4 rounded-xl border shadow-sm transition-colors ${
                    isDark ? 'bg-[#181920] border-white/5' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className={`flex items-center justify-between text-xs mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span>{isArabic ? 'المنصات والتطبيقات' : 'Platforms Created'}</span>
                    <Layers className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  </div>
                  <div className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {files.length}
                  </div>
                  <div className={`text-[11px] mt-1 flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600 font-medium'}`}>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{isArabic ? 'جاهزة للنشر الفوري' : 'Ready to deploy'}</span>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl border shadow-sm transition-colors ${
                    isDark ? 'bg-[#181920] border-white/5' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className={`flex items-center justify-between text-xs mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span>{isArabic ? 'المساحة السحابية المستخدمة' : 'Cloud Space Used'}</span>
                    <HardDrive className={`w-4 h-4 ${isDark ? 'text-pink-400' : 'text-pink-600'}`} />
                  </div>
                  <div className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {formatSize(totalBytes)}
                  </div>
                  <div className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span>{isArabic ? 'تخزين سحابي غير محدود' : 'Unlimited cloud quota'}</span>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl border shadow-sm transition-colors ${
                    isDark ? 'bg-[#181920] border-white/5' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className={`flex items-center justify-between text-xs mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span>{isArabic ? 'محرك المعمارية AI' : 'Architect Engine'}</span>
                    <Cpu className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  </div>
                  <div className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    SudaMode V1.0
                  </div>
                  <div className={`text-[11px] mt-1 ${isDark ? 'text-cyan-400' : 'text-cyan-600 font-medium'}`}>
                    <span>{isArabic ? 'استجابة فائقة السرعة' : 'Low latency streaming'}</span>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl border shadow-sm transition-colors ${
                    isDark ? 'bg-[#181920] border-white/5' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className={`flex items-center justify-between text-xs mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span>{isArabic ? 'حالة المزامنة السحابية' : 'Cloud Sync Status'}</span>
                    <Server className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  </div>
                  <div className={`text-2xl font-bold tracking-tight ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    100% Active
                  </div>
                  <div className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span>{isArabic ? 'نظام الملفات متزامن' : 'FileSystem synchronized'}</span>
                  </div>
                </div>
              </div>

              {/* Quick Launch Platform Blueprints */}
              <div
                className={`p-5 rounded-2xl border space-y-3 transition-colors ${
                  isDark ? 'bg-[#181920] border-white/10' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isArabic ? 'قوالب سريعة لتوليد المنصات' : 'Quick Platform Blueprints'}
                    </h3>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {isArabic ? 'اختر قالب منصة للبدء في بنائه وتجهيزه فوراً' : 'Select a platform archetype to populate into SudaStack prompt'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {[
                    {
                      title: isArabic ? 'متجر إلكتروني فخم' : 'E-Commerce Marketplace',
                      desc: isArabic ? 'كتالوج منتجات وسلة شراء ودفع تجريبي وفلاتر' : 'Product catalog, shopping cart, mock checkout',
                      prompt: isArabic
                        ? 'قم ببناء منصة متجر إلكتروني متكاملة واحترافية باللون الأبيض وتصميم بسيط وسريع مع سلة مشتريات وتصفية منتجات وتجربة دفع سلسة.'
                        : 'Build a complete, professional E-Commerce platform with product catalog, cart drawer, filters, and checkout experience in clean modern styling.',
                    },
                    {
                      title: isArabic ? 'لوحة تحكم SaaS تفاعلية' : 'SaaS Analytics Dashboard',
                      desc: isArabic ? 'إحصائيات ورسوم بيانية وإدارة مستخدمين' : 'Metrics, interactive charts, and team access',
                      prompt: isArabic
                        ? 'ابنِ لي لوحة تحكم SaaS إدارية شاملة واحترافية تتضمن بطاقات إحصائيات، رسوم بيانية تفاعلية، وجدول بيانات متطور وسهل الاستخدام.'
                        : 'Build a comprehensive SaaS Analytics Dashboard with key metric cards, responsive charts, and user data management table.',
                    },
                    {
                      title: isArabic ? 'مساحة إدارة مهام كانبان' : 'Kanban Project Workspace',
                      desc: isArabic ? 'أعمدة مهام، بطاقات سحب وإفلات، وفلاتر' : 'Drag-drop columns, task cards, and priority badges',
                      prompt: isArabic
                        ? 'قم ببناء منصة إدارة مشاريع ومهام بنظام كانبان (Kanban Board) تفاعلية بالكامل مع أعمدة وسحب بطاقات وإضافة مهام جديدة بسهولة.'
                        : 'Build an interactive Kanban Project Management platform with task columns, priority tags, and quick task creation.',
                    },
                  ].map((blueprint, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        if (onSelectPromptTemplate) {
                          onSelectPromptTemplate(blueprint.prompt);
                        }
                        onClose();
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition group ${
                        isDark
                          ? 'bg-[#121318] border-white/5 hover:border-cyan-500/40'
                          : 'bg-slate-50 border-slate-200 hover:border-cyan-400 hover:bg-cyan-50/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-xs font-bold transition ${
                            isDark
                              ? 'text-slate-200 group-hover:text-cyan-300'
                              : 'text-slate-800 group-hover:text-cyan-700'
                          }`}
                        >
                          {blueprint.title}
                        </span>
                        <Sparkles className={`w-3.5 h-3.5 group-hover:scale-110 transition ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                      </div>
                      <p className={`text-[11px] line-clamp-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {blueprint.desc}
                      </p>
                      <div className={`mt-2.5 text-[10px] font-medium flex items-center gap-1 ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                        <span>{isArabic ? 'لصق في مربع الإنشاء' : 'Paste to builder'}</span>
                        <span>→</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick File Inventory Preview */}
              <div
                className={`p-5 rounded-2xl border space-y-3 transition-colors ${
                  isDark ? 'bg-[#181920] border-white/10' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isArabic ? 'أحدث التطبيقات في مساحة التخزين' : 'Recent Platforms in Cloud Storage'}
                  </h3>
                  <button
                    onClick={() => setActiveTab('platforms')}
                    className={`text-xs font-medium ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-700 hover:text-cyan-800'}`}
                  >
                    {isArabic ? 'عرض الكل' : 'View all'}
                  </button>
                </div>

                <div className="space-y-2">
                  {files.slice(0, 4).map((file) => (
                    <div
                      key={file.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition ${
                        isDark
                          ? 'bg-[#121318] border-white/5 hover:border-white/10'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs shrink-0 ${
                            isDark ? 'bg-white/5 text-cyan-400' : 'bg-white border border-slate-200 text-cyan-600'
                          }`}
                        >
                          {file.type === 'html' ? '🌐' : file.type === 'javascript' ? '⚡' : file.type === 'python' ? '🐍' : '📄'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-mono font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {file.name}
                          </div>
                          <div className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {formatSize(file.sizeBytes)} • {file.description || 'SudaStack Cloud'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            onOpenFile(file);
                            onClose();
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                            isDark
                              ? 'bg-white/10 hover:bg-cyan-500/20 text-slate-200 hover:text-cyan-300'
                              : 'bg-white hover:bg-cyan-50 text-slate-700 hover:text-cyan-700 border border-slate-200 hover:border-cyan-300'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isArabic ? 'معاينة' : 'Preview'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLATFORMS & APPS */}
          {activeTab === 'platforms' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isArabic ? 'البحث عن منصة أو ملف...' : 'Search platforms & files...'}
                    className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none transition ${
                      isDark
                        ? 'bg-[#181920] border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-500/50'
                        : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500 shadow-2xs'
                    }`}
                  />
                </div>

                {/* Export Backup Button */}
                <button
                  onClick={handleExportAll}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 shrink-0 border ${
                    isDark
                      ? 'bg-white/10 hover:bg-white/20 text-white border-transparent'
                      : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-2xs'
                  }`}
                  title="Export JSON Backup of All Platforms"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'تصدير نسخة احتياطية' : 'Export Backup'}</span>
                </button>
              </div>

              {/* Platforms List */}
              <div className="space-y-2.5">
                {filteredFiles.length === 0 ? (
                  <div
                    className={`text-center py-16 text-xs rounded-2xl border ${
                      isDark
                        ? 'text-slate-500 bg-[#181920] border-white/5'
                        : 'text-slate-500 bg-white border-slate-200'
                    }`}
                  >
                    {isArabic ? 'لا توجد منصات مطابقة للبحث.' : 'No platforms or files found.'}
                  </div>
                ) : (
                  filteredFiles.map((file) => {
                    const isImage =
                      file.type === 'image' ||
                      /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i.test(file.name) ||
                      (typeof file.content === 'string' &&
                        (file.content.startsWith('data:image/') || file.content.trim().startsWith('<svg')));
                    const imageSrc =
                      typeof file.content === 'string' &&
                      (file.content.startsWith('data:image/') || file.content.startsWith('http'))
                        ? file.content
                        : file.name.endsWith('.svg') || file.content?.trim().startsWith('<svg')
                        ? `data:image/svg+xml;utf8,${encodeURIComponent(file.content)}`
                        : file.content;

                    return (
                    <div
                      key={file.id}
                      className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isDark
                          ? 'bg-[#181920] border-white/5 hover:border-white/15'
                          : 'bg-white border-slate-200 hover:border-cyan-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center font-mono text-sm shrink-0 overflow-hidden ${
                            isDark
                              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                              : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                          }`}
                        >
                          {isImage ? (
                            <img
                              src={imageSrc}
                              alt={file.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : file.type === 'html' ? (
                            '🌐'
                          ) : file.type === 'javascript' ? (
                            '⚡'
                          ) : file.type === 'python' ? (
                            '🐍'
                          ) : (
                            '📄'
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs font-mono font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`} dir="ltr">
                            {file.name}
                          </div>
                          <div className={`text-[11px] mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {file.description || (isImage ? (isArabic ? 'صورة في سحابة سوداستاك' : 'Image in SudaStack Cloud') : 'SudaStack Interactive Web Platform')}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                            <span>{formatSize(file.sizeBytes)}</span>
                            <span>•</span>
                            <span className={`uppercase font-mono ${isDark ? 'text-cyan-400' : 'text-cyan-700 font-semibold'}`}>{file.type}</span>
                            <span>•</span>
                            <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {/* Live Preview or Image View */}
                        <button
                          onClick={() => {
                            onOpenFile(file);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>
                            {isImage
                              ? isArabic
                                ? 'عرض الصورة'
                                : 'View Image'
                              : isArabic
                              ? 'معاينة وتشغيل'
                              : 'Run Live'}
                          </span>
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => onDeleteFile(file.id)}
                          className={`p-1.5 rounded-lg transition ${
                            isDark
                              ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title="Delete Platform"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
                )}
              </div>
            </div>
          )}

          {/* TAB: SYSTEM CONFIGURATION & MAINTENANCE (suda-stack/sys/) */}
          {activeTab === 'system' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Database Connection & Branch Bar */}
              <div
                className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 transition-colors ${
                  isDark
                    ? 'bg-gradient-to-r from-[#171b26] to-[#12131a] border-cyan-500/30 shadow-lg'
                    : 'bg-gradient-to-r from-cyan-50/70 via-white to-slate-50 border-cyan-300 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold ${
                      isDark
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                        : 'bg-cyan-100 border-cyan-300 text-cyan-700'
                    }`}
                  >
                    <Database className={`w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-xs sm:text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {isArabic ? 'قواعد بيانات سوداستاك الحقيقية (SudaFile DB)' : 'SudaFile Real Database'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${
                        isDbConnected
                          ? isDark
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : isDark
                          ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                          : 'bg-rose-50 text-rose-700 border-rose-300'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        {isDbConnected ? (isArabic ? 'متصل وحي' : 'Live Connected') : (isArabic ? 'غير متصل' : 'Offline')}
                      </span>
                    </div>
                    <div className={`text-[11px] font-mono mt-0.5 flex flex-wrap items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <span>{isArabic ? 'تفرع النظام:' : 'System Branch:'}</span>
                      <code
                        className={`px-1.5 py-0.5 rounded border font-semibold ${
                          isDark
                            ? 'text-cyan-300 bg-black/40 border-white/5'
                            : 'text-cyan-800 bg-cyan-50 border-cyan-200'
                        }`}
                      >
                        suda-stack/sys/
                      </code>
                      <span className="text-slate-400">•</span>
                      <span className={`text-[10px] truncate max-w-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        prj_94ca0257f3fe
                      </span>
                    </div>
                  </div>
                </div>

                {onLogoutAdmin && (
                  <button
                    onClick={onLogoutAdmin}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition active:scale-95 ${
                      isDark
                        ? 'bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border-white/10 hover:border-rose-500/30'
                        : 'bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border-slate-200 hover:border-rose-300 shadow-2xs'
                    }`}
                    title={isArabic ? 'تسجيل الخروج وقفل لوحة التحكم' : 'Logout & lock admin panel'}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'قفل لوحة الإدارة' : 'Lock Admin'}</span>
                  </button>
                )}
              </div>

              {/* SECTION 1: وضع الصيانة (Maintenance Mode) */}
              <div
                className={`p-5 rounded-2xl border shadow-sm space-y-4 transition-colors ${
                  isDark ? 'bg-[#181920] border-amber-500/30' : 'bg-white border-amber-300'
                }`}
              >
                <div className={`flex flex-wrap items-center justify-between gap-3 border-b pb-3 ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      <Wrench className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <h3 className={`font-bold text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <span>{isArabic ? 'وضع الصيانة للمنصة (Maintenance Mode)' : 'Platform Maintenance Mode'}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          systemConfig?.maintenanceMode
                            ? isDark
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                              : 'bg-amber-100 text-amber-800 border-amber-300 animate-pulse'
                            : isDark
                            ? 'bg-white/5 text-slate-400 border-white/10'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {systemConfig?.maintenanceMode ? (isArabic ? 'مفعل حالياً ⚠️' : 'Active ⚠️') : (isArabic ? 'معطل (المنصة مفتوحة للجميع) ✅' : 'Inactive (Public) ✅')}
                        </span>
                      </h3>
                      <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {isArabic
                          ? 'عند تفعيل وضع الصيانة، يتم قفل المنصة أمام الزوار العاديين ولا يمكن الدخول إلا بالمفتاح الخاص 0703.'
                          : 'Locks platform for public visitors; only admins with key 0703 can enter.'}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <button
                    onClick={async () => {
                      if (!onUpdateSystemConfig) return;
                      setIsSavingSys(true);
                      await onUpdateSystemConfig({ maintenanceMode: !systemConfig?.maintenanceMode });
                      setIsSavingSys(false);
                    }}
                    disabled={isSavingSys}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition active:scale-95 shadow-md ${
                      systemConfig?.maintenanceMode
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:brightness-110 shadow-emerald-500/20'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:brightness-110 shadow-amber-500/20'
                    }`}
                  >
                    {systemConfig?.maintenanceMode ? (
                      <>
                        <Unlock className="w-4 h-4 text-slate-950" />
                        <span>{isArabic ? 'إيقاف وضع الصيانة (فتح المنصة للجميع)' : 'Turn OFF Maintenance'}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-slate-950" />
                        <span>{isArabic ? 'تفعيل وضع الصيانة الآن' : 'Turn ON Maintenance'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Maintenance Message */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {isArabic ? 'رسالة وضع الصيانة المعروضة للزوار:' : 'Maintenance Message Displayed to Visitors:'}
                    </label>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setMaintMsg('المنصة قيد الصيانة والتحديثات الدورية — سنعود قريباً بإذن الله')}
                        className={`transition font-medium ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-700 hover:text-cyan-900'}`}
                      >
                        {isArabic ? 'نموذج 1' : 'Preset 1'}
                      </button>
                      <span className="text-slate-400">|</span>
                      <button
                        type="button"
                        onClick={() => setMaintMsg('نقوم حالياً بترقية وتحديث خوادم ونماذج سوداستاك السحابية')}
                        className={`transition font-medium ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-700 hover:text-cyan-900'}`}
                      >
                        {isArabic ? 'نموذج 2' : 'Preset 2'}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={maintMsg}
                      onChange={(e) => setMaintMsg(e.target.value)}
                      placeholder={isArabic ? 'اكتب رسالة الصيانة...' : 'Enter maintenance message...'}
                      className={`flex-1 border rounded-xl px-3 py-2 text-xs focus:outline-none transition ${
                        isDark
                          ? 'bg-[#101116] border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-400'
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-cyan-500'
                      }`}
                    />
                    <button
                      onClick={async () => {
                        if (!onUpdateSystemConfig) return;
                        setIsSavingSys(true);
                        const ok = await onUpdateSystemConfig({ maintenanceMessage: maintMsg });
                        setIsSavingSys(false);
                        if (ok) {
                          setSysFeedback(isArabic ? 'تم حفظ رسالة الصيانة في قاعدة البيانات' : 'Maintenance message saved');
                          setTimeout(() => setSysFeedback(null), 3000);
                        }
                      }}
                      disabled={isSavingSys}
                      className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition active:scale-95 shrink-0 ${
                        isDark
                          ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40'
                          : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-300'
                      }`}
                    >
                      {isArabic ? 'حفظ الرسالة' : 'Save Message'}
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 2: خيارات المنصة وإظهار الأدوات (Platform Controls & UI Toggles) */}
              <div
                className={`p-5 rounded-2xl border shadow-sm space-y-4 transition-colors ${
                  isDark ? 'bg-[#181920] border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                <div className={`flex items-center gap-2 border-b pb-3 ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                  <SlidersHorizontal className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  <div>
                    <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isArabic ? 'التحكم في خيارات المنصة وأزرار شريط الإدخال' : 'Platform Display & Input Controls'}
                    </h3>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {isArabic
                        ? 'تخصيص كامل لما يظهر للمستخدمين من خيارات صور، وكتابة بالصوت، ورفع ملفات'
                        : 'Full control over image options, voice input, and file uploads across SudaStack'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* 1. إظهار الخيارات صورة (showImageOptions) */}
                  <div
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-colors ${
                      isDark ? 'bg-[#121319] border-white/5' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                          isDark
                            ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                            : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                        }`}
                      >
                        <ImageIcon className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                      </div>
                      <div>
                        <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {isArabic ? 'إظهار خيارات الصورة (Vision)' : 'Show Image Options'}
                        </div>
                        <div className={`text-[10.5px] mt-0.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {isArabic
                            ? 'إظهار زر إرفاق الصور والرؤية البصرية في شريط الإدخال'
                            : 'Toggle image attachments and Vision AI in input box'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onUpdateSystemConfig?.({ showImageOptions: !systemConfig?.showImageOptions })}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-between border transition ${
                        systemConfig?.showImageOptions
                          ? isDark
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-cyan-50 text-cyan-800 border-cyan-300'
                          : isDark
                          ? 'bg-white/5 text-slate-400 border-white/10'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      <span>{systemConfig?.showImageOptions ? (isArabic ? 'مُفعّل (ظاهر) ✔' : 'Enabled') : (isArabic ? 'مُعطّل (مخفي) ✖' : 'Disabled')}</span>
                      <span className={`w-2 h-2 rounded-full ${systemConfig?.showImageOptions ? 'bg-cyan-500' : 'bg-slate-400'}`} />
                    </button>
                  </div>

                  {/* 2. إظهار مربع الكتابة بالصوت (showVoiceInput) */}
                  <div
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-colors ${
                      isDark ? 'bg-[#121319] border-white/5' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                          isDark
                            ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}
                      >
                        <Mic className={`w-4 h-4 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
                      </div>
                      <div>
                        <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {isArabic ? 'إظهار الكتابة بالصوت' : 'Show Voice Typing'}
                        </div>
                        <div className={`text-[10.5px] mt-0.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {isArabic
                            ? 'إظهار زر الميكروفون والإملاء الصوتي بالذكاء الاصطناعي'
                            : 'Toggle speech-to-text voice dictation microphone'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onUpdateSystemConfig?.({ showVoiceInput: !systemConfig?.showVoiceInput })}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-between border transition ${
                        systemConfig?.showVoiceInput
                          ? isDark
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-rose-50 text-rose-800 border-rose-300'
                          : isDark
                          ? 'bg-white/5 text-slate-400 border-white/10'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      <span>{systemConfig?.showVoiceInput ? (isArabic ? 'مُفعّل (ظاهر) ✔' : 'Enabled') : (isArabic ? 'مُعطّل (مخفي) ✖' : 'Disabled')}</span>
                      <span className={`w-2 h-2 rounded-full ${systemConfig?.showVoiceInput ? 'bg-rose-500' : 'bg-slate-400'}`} />
                    </button>
                  </div>

                  {/* 3. إمكانية إتاحة زر رفع الملفات (showFileUpload) */}
                  <div
                    className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-colors ${
                      isDark ? 'bg-[#121319] border-white/5' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                          isDark
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        }`}
                      >
                        <Paperclip className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      </div>
                      <div>
                        <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {isArabic ? 'إتاحة زر رفع الملفات' : 'Show File Upload Button'}
                        </div>
                        <div className={`text-[10.5px] mt-0.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {isArabic
                            ? 'إتاحة زر رفع المستندات وملفات الـ PDF لتحليلها بسهولة'
                            : 'Enable PDF & document upload buttons in input box'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onUpdateSystemConfig?.({ showFileUpload: !systemConfig?.showFileUpload })}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-between border transition ${
                        systemConfig?.showFileUpload
                          ? isDark
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : isDark
                          ? 'bg-white/5 text-slate-400 border-white/10'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      <span>{systemConfig?.showFileUpload ? (isArabic ? 'مُتاح وسهل ✔' : 'Enabled') : (isArabic ? 'مُعطّل (مخفي) ✖' : 'Disabled')}</span>
                      <span className={`w-2 h-2 rounded-full ${systemConfig?.showFileUpload ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    </button>
                  </div>
                </div>

                {/* Additional Platform Toggles */}
                <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => onUpdateSystemConfig?.({ allowPublicChat: !systemConfig?.allowPublicChat })}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs text-left transition ${
                      isDark ? 'bg-[#121319] border-white/5 hover:border-white/15' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{isArabic ? 'المحادثة العامة للزوار' : 'Public Chat'}</div>
                      <div className="text-[10px] text-slate-500">{systemConfig?.allowPublicChat ? (isArabic ? 'مسموح' : 'Allowed') : (isArabic ? 'محظور' : 'Disabled')}</div>
                    </div>
                    <span className={`w-2.5 h-2.5 rounded-full ${systemConfig?.allowPublicChat ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                  </button>


                </div>
              </div>

              {/* SECTION 3: المفتاح الخاص بالمسؤول (Admin Key: 0703) */}
              <div
                className={`p-5 rounded-2xl border shadow-sm space-y-4 transition-colors ${
                  isDark ? 'bg-[#181920] border-white/10' : 'bg-white border-slate-200'
                }`}
              >
                <div className={`flex items-center gap-2 border-b pb-3 ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                  <KeyRound className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                  <div>
                    <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isArabic ? 'المفتاح الخاص بالمسؤول (Admin Key: 0703)' : 'Admin Private Key Access'}
                    </h3>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {isArabic
                        ? 'المفتاح المعتمد للدخول للوحة التحكم وتخطي وضع الصيانة. يتم التحقق منه تلقائياً أو إنشاؤه عند أول كتابة.'
                        : 'Key used to enter admin dashboard and bypass maintenance mode.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex-1">
                    <label className={`text-[11px] font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {isArabic ? 'تعديل أو تعيين المفتاح الخاص في قاعدة البيانات:' : 'Update Private Key in Database:'}
                    </label>
                    <input
                      type="text"
                      value={adminKeyInput}
                      onChange={(e) => setAdminKeyInput(e.target.value)}
                      placeholder="0703"
                      className={`w-full border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none transition ${
                        isDark
                          ? 'bg-[#101116] border-white/10 text-cyan-300 focus:border-cyan-400'
                          : 'bg-slate-50 border-slate-200 text-cyan-800 focus:border-cyan-500 font-bold'
                      }`}
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={async () => {
                        if (!adminKeyInput.trim() || !onUpdateSystemConfig) return;
                        setIsSavingSys(true);
                        const ok = await onUpdateSystemConfig({ adminKey: adminKeyInput.trim() });
                        setIsSavingSys(false);
                        if (ok) {
                          setSysFeedback(isArabic ? 'تم تحديث المفتاح الخاص بنجاح في قاعدة البيانات' : 'Admin key updated in DB');
                          setTimeout(() => setSysFeedback(null), 3000);
                        }
                      }}
                      disabled={isSavingSys || !adminKeyInput.trim()}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs transition active:scale-95 shadow-md shadow-cyan-500/20 disabled:opacity-50"
                    >
                      {isArabic ? 'تحديث المفتاح في SudaFile DB' : 'Update Key in DB'}
                    </button>
                  </div>
                </div>

                {sysFeedback && (
                  <div
                    className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                      isDark
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>{sysFeedback}</span>
                  </div>
                )}
              </div>

              {/* SECTION 4: مختبر ومستكشف الدالة الموحدة (SudaFile DB Unified Runner) */}
              <div
                className={`p-5 rounded-2xl border shadow-sm space-y-4 transition-colors ${
                  isDark ? 'bg-[#14151d] border-cyan-500/20' : 'bg-white border-cyan-200'
                }`}
              >
                <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-3 ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <Terminal className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                    <div>
                      <h3 className={`font-bold text-sm flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <span>{isArabic ? 'المستكشف التفاعلي للدالة الموحدة (sudaDb.execute)' : 'Unified Database Runner'}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            isDark
                              ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                              : 'text-cyan-800 bg-cyan-50 border-cyan-200'
                          }`}
                        >
                          Unified Function
                        </span>
                      </h3>
                      <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {isArabic
                          ? 'دالة واحدة موحدة تدمج GET, PATCH, POST, DELETE مع مرونة التبديل لأي استضافة أخرى دون المساس بالأكواد.'
                          : 'One unified function combining all DB methods, fully swappable without changing application code.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {(['get', 'patch', 'post', 'delete'] as SudaDbActionType[]).map((act) => (
                      <button
                        key={act}
                        type="button"
                        onClick={() => setDbAction(act)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase transition ${
                          dbAction === act
                            ? 'bg-cyan-500 text-slate-950 shadow-sm'
                            : isDark
                            ? 'bg-white/5 text-slate-400 hover:text-white'
                            : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Path input & Execute button */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={dbPath}
                        onChange={(e) => setDbPath(e.target.value)}
                        placeholder="suda-stack/sys"
                        className={`w-full border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none transition ${
                          isDark
                            ? 'bg-[#0a0b0e] border-white/10 text-cyan-300 focus:border-cyan-400'
                            : 'bg-slate-50 border-slate-200 text-cyan-800 focus:border-cyan-500 font-semibold'
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setDbExecuting(true);
                        setDbResult(null);
                        const t0 = performance.now();
                        try {
                          let payload: any = undefined;
                          if (dbAction === 'patch' || dbAction === 'post') {
                            try {
                              payload = JSON.parse(dbPayload);
                            } catch {
                              payload = dbPayload;
                            }
                          }
                          const res = await sudaDb.execute({
                            action: dbAction,
                            path: dbPath,
                            data: payload,
                          });
                          setDbResult({ success: true, response: res });
                        } catch (err: any) {
                          setDbResult({ success: false, error: err.message || 'Operation failed' });
                        } finally {
                          setDbExecutionTime(Math.round(performance.now() - t0));
                          setDbExecuting(false);
                        }
                      }}
                      disabled={dbExecuting}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-cyan-500/20 disabled:opacity-50"
                    >
                      {dbExecuting ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-slate-950" />
                      )}
                      <span>{isArabic ? 'تنفيذ بالدالة الموحدة' : 'Run via sudaDb'}</span>
                    </button>
                  </div>

                  {(dbAction === 'patch' || dbAction === 'post') && (
                    <div>
                      <label className={`text-[11px] block mb-1 font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        JSON Payload:
                      </label>
                      <textarea
                        rows={3}
                        value={dbPayload}
                        onChange={(e) => setDbPayload(e.target.value)}
                        className={`w-full border rounded-xl p-2.5 text-xs font-mono focus:outline-none transition ${
                          isDark
                            ? 'bg-[#0a0b0e] border-white/10 text-slate-200 focus:border-cyan-400'
                            : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-cyan-500'
                        }`}
                      />
                    </div>
                  )}

                  {/* Execution Output */}
                  {dbResult && (
                    <div
                      className={`mt-2 p-3 rounded-xl border font-mono text-xs ${
                        isDark ? 'bg-[#0a0b0e] border-white/10' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div
                        className={`flex items-center justify-between text-[11px] pb-1.5 mb-1.5 border-b ${
                          isDark ? 'border-white/5' : 'border-slate-200'
                        }`}
                      >
                        <span className={dbResult.success ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                          {dbResult.success ? '✔ 200 OK (Executed Successfully)' : '✖ Execution Error'}
                        </span>
                        {dbExecutionTime !== null && (
                          <span className="text-slate-400">{dbExecutionTime} ms</span>
                        )}
                      </div>
                      <pre className={`overflow-x-auto text-[11px] leading-relaxed max-h-48 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                        {JSON.stringify(dbResult.response || dbResult.error, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: SUDAFILE CLOUD STORAGE & API KEY */}
          {activeTab === 'sudafile' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Header Hero Banner */}
              <div
                className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                  isDark
                    ? 'bg-gradient-to-r from-cyan-950/40 via-[#141724] to-blue-950/40 border-cyan-500/30'
                    : 'bg-gradient-to-r from-cyan-50 via-sky-50 to-blue-50 border-cyan-300'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0 shadow-md">
                    <Cloud className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold text-sm sm:text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {isArabic ? 'سحابة وتخزين Sudafile السحابي والمكتبات' : 'Sudafile Cloud Storage & API Gateway'}
                      </h3>
                    </div>
                    <p className={`text-xs mt-1 max-w-2xl ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {isArabic
                        ? 'تخزين سحابي سريع للملفات الكبيرة ومكتبات بايثون وسجلات المشاريع، مع تدفق وروابط تحميل مباشرة.'
                        : 'Fast cloud storage for large files, Python packages, and project logs, with streaming and direct download links.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={handleTestSudafile}
                    disabled={isTestingSudafile}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
                      isDark
                        ? 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-500/40 text-cyan-300'
                        : 'bg-white hover:bg-cyan-50 border-cyan-300 text-cyan-800 shadow-2xs'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingSudafile ? 'animate-spin' : ''}`} />
                    <span>{isTestingSudafile ? (isArabic ? 'جاري الفحص...' : 'Testing...') : (isArabic ? 'فحص الاتصال' : 'Test Connection')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={loadSudafileFilesList}
                    disabled={isLoadingSudafileFiles}
                    className={`p-1.5 rounded-xl border transition ${
                      isDark ? 'border-white/10 hover:bg-white/10 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                    title={isArabic ? 'تحديث قائمة الملفات' : 'Refresh Files'}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingSudafileFiles ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Test Result Toast/Banner */}
              {sudafileTestResult && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs animate-in fade-in duration-150 ${
                    sudafileTestResult.success
                      ? isDark
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : isDark
                      ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                      : 'bg-rose-50 border-rose-300 text-rose-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {sudafileTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className="font-semibold">{sudafileTestResult.message}</span>
                  </div>
                  {sudafileTestResult.latencyMs > 0 && (
                    <span className="font-mono text-[11px] opacity-80">{sudafileTestResult.latencyMs} ms</span>
                  )}
                </div>
              )}

              {/* CARD 1: Sudafile API Key & Endpoint Configuration */}
              <div
                className={`p-5 rounded-2xl border space-y-4 transition-colors ${
                  isDark ? 'bg-[#181920] border-white/10' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-cyan-400" />
                    <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isArabic ? 'إعدادات مفتاح Sudafile API ورابط السيرفر' : 'Sudafile API Key & Server Settings'}
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">x-api-key Authentication</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* API Key Input */}
                  <div className="space-y-1.5">
                    <label className={`text-xs font-semibold flex items-center justify-between ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <span>{isArabic ? 'مفتاح الـ API (x-api-key):' : 'Sudafile API Key:'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(sudafileKey);
                          setCopiedKey(true);
                          setTimeout(() => setCopiedKey(false), 2000);
                        }}
                        className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey ? (isArabic ? 'تم النسخ' : 'Copied') : (isArabic ? 'نسخ' : 'Copy')}</span>
                      </button>
                    </label>
                    <div className="relative">
                      <input
                        type={showSudafileKey ? 'text' : 'password'}
                        value={sudafileKey}
                        onChange={(e) => setSudafileKey(e.target.value)}
                        placeholder="sf_36c202_14c1e1e882437370beddd6185c226eef"
                        className={`w-full px-3 py-2 pr-10 rounded-xl text-xs font-mono border transition focus:outline-hidden ${
                          isDark
                            ? 'bg-black/40 border-white/10 text-white placeholder-slate-600 focus:border-cyan-500'
                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-600'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSudafileKey(!showSudafileKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 text-[11px]"
                      >
                        {showSudafileKey ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {isArabic ? 'يمكنك استبدال هذا المفتاح أو تحديثه في أي وقت وسيطبق فوراً على كامل المنصة.' : 'You can change this API key anytime; it applies instantly across the entire platform.'}
                    </p>
                  </div>

                  {/* Server Base URL */}
                  <div className="space-y-1.5">
                    <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {isArabic ? 'رابط بوابة التخزين (Base URL):' : 'Storage Base URL:'}
                    </label>
                    <input
                      type="text"
                      value={sudafileUrl}
                      onChange={(e) => setSudafileUrl(e.target.value)}
                      placeholder="https://sudafile.iqra4you.com"
                      className={`w-full px-3 py-2 rounded-xl text-xs font-mono border transition focus:outline-hidden ${
                        isDark
                          ? 'bg-black/40 border-white/10 text-white placeholder-slate-600 focus:border-cyan-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-600'
                      }`}
                    />
                    <p className="text-[10px] text-slate-500 font-mono">
                      Endpoint: https://sudafile.iqra4you.com/api/storage
                    </p>
                  </div>
                </div>

                {/* Save button & Feedback */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleSaveSudafileConfig}
                    disabled={isSavingSudafileKey}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
                      isDark
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-md shadow-cyan-500/20'
                        : 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSavingSudafileKey ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ وتطبيق المفتاح الجديد' : 'Save & Apply API Key')}</span>
                  </button>

                  {sudafileKeyFeedback && (
                    <span className="text-xs font-semibold text-emerald-400 animate-in fade-in">
                      {sudafileKeyFeedback}
                    </span>
                  )}
                </div>
              </div>

              {/* CARD 2: Python Libraries & Packages Cloud Sync */}
              <div
                className={`p-5 rounded-2xl border space-y-4 transition-colors ${
                  isDark ? 'bg-[#181920] border-white/10' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isArabic ? 'تخزين وحفظ مكاتب بايثون السحابية (Packages & Bots Sync)' : 'Python Libraries & Packages Cloud Sync'}
                    </h4>
                  </div>
                  <span className="text-[11px] text-emerald-400 font-semibold font-mono">Always-On Hosting</span>
                </div>

                <div className="text-xs space-y-2">
                  <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                    {isArabic
                      ? 'نظام الاسترداد الذاتي الذكي: عند تنفيذ أي كود واكتشاف خطأ فقدان مكتبة (ModuleNotFoundError: No module named...)، يقوم النظام تلقائياً بالبحث في Sudafile واستعادة الحزمة مباشرة خلال ثوانٍ! وإذا لم تكن موجودة، يقوم بتثبيتها ورفعها وحفظها تلقائياً في Sudafile لتكون جاهزة دائماً.'
                      : 'Autonomous Self-Healing: When code execution detects ModuleNotFoundError, the engine automatically checks Sudafile and restores it in seconds! If new, it installs via pip and uploads it to Sudafile for future runs.'}
                  </p>
                </div>

                {/* Self-Healing Status Banner */}
                <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                  isDark ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200' : 'bg-cyan-50 border-cyan-200 text-cyan-900'
                }`}>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="font-semibold">
                      {isArabic ? 'الاسترداد الذاتي الذكي (Auto-Healing from Sudafile): مفعّل ونشط دائماً' : 'Auto-Healing from Sudafile: Active & Watching'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold">ACTIVE</span>
                </div>

                {/* Quick One-Click Library Restore Buttons */}
                <div className="space-y-2 pt-1">
                  <div className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {isArabic ? '⚡ استدعاء واختبار المكاتب السحابية فورياً من Sudafile:' : '⚡ Instant Cloud Package Retrieval from Sudafile:'}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestorePackage('telebot')}
                      disabled={isManagingPkg}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition active:scale-95 ${
                        isDark ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                      }`}
                    >
                      <span>🤖 telebot (pyTelegramBotAPI)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRestorePackage('requests')}
                      disabled={isManagingPkg}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition active:scale-95 ${
                        isDark ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                      }`}
                    >
                      <span>🌐 requests</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRestorePackage('dotenv')}
                      disabled={isManagingPkg}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition active:scale-95 ${
                        isDark ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                      }`}
                    >
                      <span>🔑 python-dotenv</span>
                    </button>
                  </div>
                </div>

                {/* Custom Package Input & Actions */}
                <div className={`p-3 rounded-xl border space-y-2.5 ${isDark ? 'bg-black/20 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                  <label className={`text-[11px] font-semibold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {isArabic ? 'إدارة واستدعاء مكتبة مخصصة بالاسم:' : 'Manage & Retrieve Custom Package:'}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={selectedPkgName}
                      onChange={(e) => setSelectedPkgName(e.target.value)}
                      placeholder="e.g. telebot, aiohttp, bs4..."
                      className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-mono border focus:outline-hidden ${
                        isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleRestorePackage(selectedPkgName)}
                      disabled={isManagingPkg || !selectedPkgName}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                    >
                      <Download className={`w-3.5 h-3.5 ${isManagingPkg ? 'animate-bounce' : ''}`} />
                      <span>{isArabic ? '📥 استدعاء من Sudafile' : 'Retrieve from Sudafile'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUploadPackage(selectedPkgName)}
                      disabled={isManagingPkg || !selectedPkgName}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                    >
                      <Upload className={`w-3.5 h-3.5 ${isManagingPkg ? 'animate-spin' : ''}`} />
                      <span>{isArabic ? '☁️ رفع وحفظ في Sudafile' : 'Upload to Sudafile'}</span>
                    </button>
                  </div>
                </div>

                {/* Feedback Alert for Package Action */}
                {pkgManagementMsg && (
                  <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    pkgManagementMsg.success
                      ? isDark ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : isDark ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    {pkgManagementMsg.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{pkgManagementMsg.message}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleBackupPackages}
                    disabled={isBackingUpPackages}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 ${
                      isDark
                        ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs'
                    }`}
                  >
                    <Download className={`w-3.5 h-3.5 ${isBackingUpPackages ? 'animate-bounce' : ''}`} />
                    <span>
                      {isBackingUpPackages
                        ? (isArabic ? 'جاري النسخ الاحتياطي إلى Sudafile...' : 'Backing up packages...')
                        : (isArabic ? '📦 نسخ احتياطي شامل للمكتبات (folder=packages)' : 'Backup All Packages to Sudafile')}
                    </span>
                  </button>

                  {backupPackagesResult && (
                    <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{isArabic ? `تم رفع حزمة المكتبات بنجاح (${backupPackagesResult.packagesCount} مكتبة)` : `Packages backed up (${backupPackagesResult.packagesCount} packages)`}</span>
                    </div>
                  )}
                </div>

                {/* cURL Cheat Sheet Accordion */}
                <div
                  className={`mt-3 p-3 rounded-xl border text-[11px] font-mono space-y-2 ${
                    isDark ? 'bg-[#0f1016] border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="font-bold text-xs text-cyan-400 flex items-center gap-1.5 font-sans">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>{isArabic ? 'أوامر cURL المباشرة للتكامل السريع (Sudafile APIs):' : 'Direct cURL commands for integration:'}</span>
                  </div>
                  <pre className="overflow-x-auto p-2 rounded-lg bg-black/40 text-emerald-300 text-[10px] leading-relaxed">
{`# 1. رفع ملف أو مكتبة إلى Sudafile
curl -X POST "https://sudafile.iqra4you.com/api/storage/upload" \\
  -H "x-api-key: ${sudafileKey || 'sf_36c202_...'}" \\
  -F "file=@/path/to/document.pdf" \\
  -F "folder=uploads"

# 2. استعراض وجلب قائمة الملفات
curl -X GET "https://sudafile.iqra4you.com/api/storage/files" \\
  -H "x-api-key: ${sudafileKey || 'sf_36c202_...'}"

# 3. حذف ملف سحابي
curl -X DELETE "https://sudafile.iqra4you.com/api/storage/files/FILE_ID" \\
  -H "x-api-key: ${sudafileKey || 'sf_36c202_...'}"`}
                  </pre>
                </div>
              </div>

              {/* CARD: Python Requirements.txt Generator & Editor */}
              <div
                className={`p-5 rounded-2xl border space-y-4 transition-colors ${
                  isDark ? 'bg-[#181920] border-white/10' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isArabic ? 'منشئ ومحرر ملف المتطلبات (requirements.txt)' : 'Python Requirements.txt Generator & Editor'}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Deployment Config
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className={`text-xs font-semibold flex items-center justify-between ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span>{isArabic ? 'أدخل قائمة مكاتب بايثون (كل مكتبة في سطر):' : 'Enter Python libraries (one per line):'}</span>
                    <span className="text-[10px] text-slate-400 font-mono">requirements.txt</span>
                  </label>
                  <textarea
                    rows={5}
                    value={requirementsInput}
                    onChange={(e) => setRequirementsInput(e.target.value)}
                    placeholder="pyTelegramBotAPI>=4.12.0&#10;requests>=2.31.0&#10;pyrebase4>=4.7.1"
                    className={`w-full p-3 rounded-xl text-xs font-mono border transition focus:outline-hidden ${
                      isDark ? 'bg-black/40 border-white/10 text-white placeholder-slate-600 focus:border-cyan-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-600'
                    }`}
                  />
                  <p className="text-[10px] text-slate-500">
                    {isArabic
                      ? 'يؤدي النقر على "توليد وحفظ" إلى إنشاء أو تحديث ملف requirements.txt وحفظه تلقائياً في سحابة Sudafile لضمان تشغيل الاستضافة دون أخطاء.'
                      : 'Clicking "Generate & Save" creates or updates requirements.txt and uploads it to Sudafile cloud storage for robust serverless/cloud deployment.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleGenerateRequirements}
                    disabled={isGeneratingRequirements}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 ${
                      isDark
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black shadow-md shadow-cyan-500/20'
                        : 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-xs'
                    }`}
                  >
                    <Sparkles className={`w-4 h-4 ${isGeneratingRequirements ? 'animate-spin' : ''}`} />
                    <span>
                      {isGeneratingRequirements
                        ? (isArabic ? 'جاري توليد وحفظ الملف...' : 'Generating & Saving...')
                        : (isArabic ? '📄 توليد وحفظ requirements.txt في السحابة' : 'Generate & Save requirements.txt')}
                    </span>
                  </button>

                  {requirementsResultMsg && (
                    <div className={`text-xs font-semibold flex items-center gap-1.5 ${requirementsResultMsg.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {requirementsResultMsg.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      <span>{requirementsResultMsg.message}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD 3: Live Sudafile Cloud Explorer */}
              <div
                className={`p-5 rounded-2xl border space-y-4 transition-colors ${
                  isDark ? 'bg-[#181920] border-white/10' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-cyan-400" />
                    <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isArabic ? 'مستعرض ملفات Sudafile السحابية المرفوعة' : 'Live Sudafile Cloud Files'}
                    </h4>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {sudafileFiles.length} {isArabic ? 'ملف' : 'files'}
                    </span>
                  </div>

                  {/* Upload File Input */}
                  <div className="flex items-center gap-2">
                    <select
                      value={sudafileUploadFolder}
                      onChange={(e) => setSudafileUploadFolder(e.target.value)}
                      className={`px-2 py-1 rounded-lg text-xs border ${
                        isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="uploads">uploads</option>
                      <option value="packages">packages</option>
                      <option value="libraries">libraries</option>
                      <option value="backups">backups</option>
                    </select>

                    <label
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition active:scale-95 flex items-center gap-1.5 ${
                        isDark
                          ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40'
                          : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-300 shadow-2xs'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingSudafile ? (isArabic ? 'جاري الرفع...' : 'Uploading...') : (isArabic ? 'رفع ملف سحابي' : 'Upload File')}</span>
                      <input
                        type="file"
                        onChange={handleFileUploadSudafile}
                        disabled={isUploadingSudafile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Filter and Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={sudafileSearchQuery}
                    onChange={(e) => setSudafileSearchQuery(e.target.value)}
                    placeholder={isArabic ? 'بحث في ملفات Sudafile السحابية...' : 'Search Sudafile cloud files...'}
                    className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border transition focus:outline-hidden ${
                      isDark
                        ? 'bg-black/30 border-white/10 text-white placeholder-slate-500 focus:border-cyan-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-cyan-600'
                    }`}
                  />
                </div>

                {/* Files List Table */}
                {isLoadingSudafileFiles ? (
                  <div className="py-10 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                    <span>{isArabic ? 'جاري جلب الملفات من سحابة Sudafile...' : 'Loading files from Sudafile Cloud...'}</span>
                  </div>
                ) : sudafileFiles.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400 border border-dashed rounded-xl dark:border-white/10 border-slate-200">
                    <p className="font-semibold">{isArabic ? 'لا توجد ملفات مرفوعة حالياً في سحابة Sudafile' : 'No files in Sudafile Cloud yet'}</p>
                    <p className="text-[11px] mt-1 text-slate-500">
                      {isArabic ? 'استخدم زر "رفع ملف سحابي" أو أرسل عبر cURL ليتم إدراجه هنا فوراً.' : 'Upload a file using the button above or cURL to see it listed here.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {sudafileFiles
                      .filter((f) =>
                        !sudafileSearchQuery ||
                        f.name.toLowerCase().includes(sudafileSearchQuery.toLowerCase()) ||
                        (f.folderName && f.folderName.toLowerCase().includes(sudafileSearchQuery.toLowerCase()))
                      )
                      .map((file) => {
                        const directDownload = file.downloadUrl || (file.url ? (file.url.startsWith('http') ? file.url : `https://sudafile.iqra4you.com${file.url}`) : '');
                        return (
                          <div
                            key={file.fileId}
                            className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition ${
                              isDark ? 'bg-black/25 border-white/5 hover:border-white/15' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
                                <HardDrive className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold truncate text-slate-100 flex items-center gap-1.5">
                                  <span className="truncate">{file.name || file.originalName}</span>
                                  {file.folderName && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                      {file.folderName}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>{formatSize(file.size || 0)}</span>
                                  <span>•</span>
                                  <span>ID: {file.fileId}</span>
                                  {file.uploadedAt && (
                                    <>
                                      <span>•</span>
                                      <span>{new Date(file.uploadedAt).toLocaleTimeString()}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                              {directDownload && (
                                <>
                                  <a
                                    href={directDownload}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`p-1.5 rounded-lg border transition text-cyan-400 hover:text-cyan-300 ${
                                      isDark ? 'border-white/10 hover:bg-white/10' : 'border-slate-200 hover:bg-slate-100'
                                    }`}
                                    title={isArabic ? 'تحميل مباشر' : 'Download file'}
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(directDownload);
                                      alert(isArabic ? 'تم نسخ الرابط المباشر للملف!' : 'Direct link copied!');
                                    }}
                                    className={`p-1.5 rounded-lg border transition text-slate-300 hover:text-white ${
                                      isDark ? 'border-white/10 hover:bg-white/10' : 'border-slate-200 hover:bg-slate-100'
                                    }`}
                                    title={isArabic ? 'نسخ الرابط المباشر' : 'Copy link'}
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteSudafileFile(file.fileId)}
                                className={`p-1.5 rounded-lg border transition text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 ${
                                  isDark ? 'border-rose-500/20' : 'border-rose-200 bg-rose-50'
                                }`}
                                title={isArabic ? 'حذف من Sudafile' : 'Delete file'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AI ENGINE & CLOUD */}
          {activeTab === 'engine' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* AI Configuration */}
                <div
                  className={`p-5 rounded-2xl border space-y-4 transition-colors ${
                    isDark ? 'bg-[#181920] border-white/10' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className={`flex items-center gap-2 border-b pb-3 ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                    <Cpu className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                    <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isArabic ? 'إعدادات محرك الذكاء الاصطناعي' : 'AI Architect Specification'}
                    </h3>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className={`flex justify-between py-1 border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{isArabic ? 'النموذج النشط:' : 'Active Model:'}</span>
                      <span className={`font-mono font-semibold ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>SudaMode V1.0</span>
                    </div>
                    <div className={`flex justify-between py-1 border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{isArabic ? 'الدور والمهام:' : 'Specialization:'}</span>
                      <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>SudaStack Platform Architect</span>
                    </div>
                    <div className={`flex justify-between py-1 border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{isArabic ? 'الحفظ التلقائي في السحابة:' : 'Auto-Save in Cloud:'}</span>
                      <span className={`font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Active (LocalStorage + SudaStack Cloud)</span>
                    </div>
                  </div>
                </div>

                {/* Cloud Storage Specification */}
                <div
                  className={`p-5 rounded-2xl border space-y-4 transition-colors ${
                    isDark ? 'bg-[#181920] border-white/10' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className={`flex items-center gap-2 border-b pb-3 ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                    <HardDrive className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isArabic ? 'مواصفات التخزين السحابي' : 'SudaStack Cloud Storage Specs'}
                    </h3>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className={`flex justify-between py-1 border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{isArabic ? 'الموقع السحابي:' : 'Region / Host:'}</span>
                      <span className={`font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Europe-West2 (London Node)</span>
                    </div>
                    <div className={`flex justify-between py-1 border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{isArabic ? 'محرك التخزين:' : 'Engine:'}</span>
                      <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>SudaStack Cloud Storage</span>
                    </div>
                    <div className={`flex justify-between py-1 border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{isArabic ? 'السعة الإجمالية:' : 'Allocated Space:'}</span>
                      <span className={`font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Unlimited Persistence</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Architecture Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                  isDark
                    ? 'bg-[#181920] border-white/5 text-slate-400'
                    : 'bg-white border-slate-200 text-slate-600 shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>SudaStack Core Engine v1.0 • Ready for Production Launch</span>
                </div>
                <span className={`font-mono text-[11px] font-semibold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                  Port 3000 • Ingress OK
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM LOGS & AUDIT */}
          {activeTab === 'logs' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <div
                className={`p-4 rounded-2xl border space-y-2.5 transition-colors ${
                  isDark ? 'bg-[#181920] border-white/10' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className={`flex items-center justify-between border-b pb-2.5 ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <Terminal className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
                    <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {isArabic ? 'سجل العمليات المباشر (Audit Log)' : 'Live System Audit Log'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Realtime Event Stream</span>
                </div>

                <div className={`space-y-1.5 font-mono text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  <div className={`flex items-start gap-2 py-1 border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                    <span className={`text-[10px] shrink-0 font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>[OK 200]</span>
                    <span className="text-slate-400 text-[10px] shrink-0">12:04:10</span>
                    <span className="text-[11px]">SudaStack Cloud space initialized and verified</span>
                  </div>
                  <div className={`flex items-start gap-2 py-1 border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                    <span className={`text-[10px] shrink-0 font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>[OK 200]</span>
                    <span className="text-slate-400 text-[10px] shrink-0">12:02:44</span>
                    <span className="text-[11px]">Platform architecture module mounted: E-Commerce, Kanban, Analytics</span>
                  </div>
                  <div className={`flex items-start gap-2 py-1 border-b ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                    <span className={`text-[10px] shrink-0 font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>[SYSTEM]</span>
                    <span className="text-slate-400 text-[10px] shrink-0">12:00:15</span>
                    <span className="text-[11px]">SudaMode V1.0 generative architect prompt loaded successfully</span>
                  </div>
                  <div className="flex items-start gap-2 py-1">
                    <span className={`text-[10px] shrink-0 font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>[SECURITY]</span>
                    <span className="text-slate-400 text-[10px] shrink-0">11:58:30</span>
                    <span className="text-[11px]">Sandboxed iframe security headers enforced (allow-scripts, allow-same-origin)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between text-xs transition-colors ${
            isDark
              ? 'border-white/10 bg-[#0e0f12] text-slate-400'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono">SudaStack Platform OS</span>
            <span>•</span>
            <span className="text-[11px] text-slate-500">{isArabic ? 'جاهز للانطلاق والعمل' : 'Production Ready'}</span>
          </div>

          <button
            onClick={onClose}
            className={`px-4 py-1.5 rounded-lg font-medium text-xs transition border ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 text-white border-transparent'
                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-200 shadow-2xs'
            }`}
          >
            {isArabic ? 'إغلاق اللوحة' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
