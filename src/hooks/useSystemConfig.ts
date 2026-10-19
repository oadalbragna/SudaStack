import { useState, useEffect, useCallback, useRef } from 'react';
import { SystemConfig, AdminAuthResult } from '../types';
import { sudaDb } from '../services/sudaDatabase';

const SYSTEM_DB_PATH = 'suda-stack/sys';
const ADMIN_SESSION_KEY = 'sudastack_admin_authenticated';
const ADMIN_SAVED_KEY = 'sudastack_admin_key';

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  maintenanceMode: false,
  maintenanceMessage: 'المنصة قيد الصيانة والتحديثات الدورية — سنعود قريباً بإذن الله',
  showImageOptions: true,
  showVoiceInput: true,
  showFileUpload: true,
  adminKey: '0703',
  allowPublicChat: true,
  systemNotice: '',
  platformTitle: 'SudaStack',
  updatedAt: Date.now(),
};

export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig>(() => {
    try {
      const cached = localStorage.getItem('sudastack_sys_config_cache');
      if (cached) {
        return { ...DEFAULT_SYSTEM_CONFIG, ...JSON.parse(cached) };
      }
    } catch {}
    return DEFAULT_SYSTEM_CONFIG;
  });

  const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(true);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Admin authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const isMountedRef = useRef(true);

  // Fetch and sync configuration from real Database
  const fetchConfig = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setIsLoadingConfig(true);
      const res = await sudaDb.get<any>(SYSTEM_DB_PATH);

      if (!isMountedRef.current) return;

      if (res && typeof res === 'object') {
        const merged: SystemConfig = {
          maintenanceMode: typeof res.maintenanceMode === 'boolean' ? res.maintenanceMode : DEFAULT_SYSTEM_CONFIG.maintenanceMode,
          maintenanceMessage: res.maintenanceMessage || DEFAULT_SYSTEM_CONFIG.maintenanceMessage,
          showImageOptions: typeof res.showImageOptions === 'boolean' ? res.showImageOptions : DEFAULT_SYSTEM_CONFIG.showImageOptions,
          showVoiceInput: typeof res.showVoiceInput === 'boolean' ? res.showVoiceInput : DEFAULT_SYSTEM_CONFIG.showVoiceInput,
          showFileUpload: typeof res.showFileUpload === 'boolean' ? res.showFileUpload : DEFAULT_SYSTEM_CONFIG.showFileUpload,
          adminKey: res.adminKey || DEFAULT_SYSTEM_CONFIG.adminKey,
          allowPublicChat: typeof res.allowPublicChat === 'boolean' ? res.allowPublicChat : DEFAULT_SYSTEM_CONFIG.allowPublicChat,
          systemNotice: res.systemNotice || '',
          platformTitle: res.platformTitle || DEFAULT_SYSTEM_CONFIG.platformTitle,
          updatedAt: res.updatedAt || Date.now(),
        };

        setConfig(merged);
        setIsDbConnected(true);
        setLastSyncTime(Date.now());
        try {
          localStorage.setItem('sudastack_sys_config_cache', JSON.stringify(merged));
        } catch {}
      } else {
        // If node does not exist yet in DB, initialize with default config & default adminKey
        setIsDbConnected(true);
      }
    } catch (err) {
      console.warn('Could not fetch system config from DB:', err);
      setIsDbConnected(false);
    } finally {
      if (isMountedRef.current && isInitial) {
        setIsLoadingConfig(false);
      }
    }
  }, []);

  // Update configuration atomically in DB and update local state
  const updateConfig = useCallback(async (partial: Partial<SystemConfig>): Promise<boolean> => {
    try {
      const payload = {
        ...partial,
        updatedAt: Date.now(),
      };

      // Optimistic local update
      setConfig((prev) => {
        const next = { ...prev, ...payload };
        try {
          localStorage.setItem('sudastack_sys_config_cache', JSON.stringify(next));
        } catch {}
        return next;
      });

      // Atomic PATCH in the real Database branch (suda-stack/sys/)
      await sudaDb.patch(SYSTEM_DB_PATH, payload);
      setLastSyncTime(Date.now());
      setIsDbConnected(true);
      return true;
    } catch (err) {
      console.error('Failed to update system config in database:', err);
      return false;
    }
  }, []);

  /**
   * Admin Authentication with Key 0703:
   * "ويمكن الدخول للواجهة عبر المفاتح الخاص 0703 عند كتابته يتم التحقق منه اولا اذاكان مفتاحه موجودا
   * يتم مباشر التحقق منه واذا كان غير موجود يتم انشاء نفس المفتاح كمفتاح جديد للدخول للوحة التحكم بسهولة"
   */
  const verifyAndLoginAdmin = useCallback(
    async (enteredKey: string): Promise<AdminAuthResult> => {
      const cleanKey = (enteredKey || '').trim();
      if (!cleanKey) {
        return {
          success: false,
          isNewKeyCreated: false,
          message: 'يرجى كتابة المفتاح الخاص أولاً',
        };
      }

      try {
        // 1. Fetch latest data from database to check existing key
        const remoteData = await sudaDb.get<any>(SYSTEM_DB_PATH);
        const existingKey = remoteData?.adminKey;

        // Case A: Key exists in the database
        if (existingKey && typeof existingKey === 'string' && existingKey.trim().length > 0) {
          if (cleanKey === existingKey.trim() || cleanKey === '0703') {
            setIsAdminAuthenticated(true);
            try {
              sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
              localStorage.setItem(ADMIN_SAVED_KEY, cleanKey);
            } catch {}
            return {
              success: true,
              isNewKeyCreated: false,
              message: 'تم التحقق بنجاح من المفتاح الخاص! مرحباً بك في لوحة الإدارة.',
            };
          } else {
            return {
              success: false,
              isNewKeyCreated: false,
              message: 'المفتاح الخاص غير صحيح. يرجى التأكد من الرمز والمحاولة مجدداً.',
            };
          }
        }

        // Case B: Key does NOT exist in database yet (First run or empty DB)
        // Automatically create and register this key in the database
        const initialPayload = {
          ...DEFAULT_SYSTEM_CONFIG,
          adminKey: cleanKey,
          updatedAt: Date.now(),
        };

        await sudaDb.patch(SYSTEM_DB_PATH, initialPayload);
        setConfig(initialPayload);
        setIsAdminAuthenticated(true);
        try {
          sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
          localStorage.setItem(ADMIN_SAVED_KEY, cleanKey);
        } catch {}

        return {
          success: true,
          isNewKeyCreated: true,
          message: `تم التحقق بنجاح! تم إنشاء وتثبيت المفتاح الخاص (${cleanKey}) في قاعدة البيانات كمفتاح للمسؤول.`,
        };
      } catch (err: any) {
        console.warn('DB check encountered error, using local fallback:', err);
        // Fallback check if network is offline
        if (cleanKey === '0703' || cleanKey === config.adminKey) {
          setIsAdminAuthenticated(true);
          try {
            sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
          } catch {}
          return {
            success: true,
            isNewKeyCreated: false,
            message: 'تم التحقق من المفتاح الخاص بنجاح (وضع الاتصال المحلي).',
          };
        }
        return {
          success: false,
          isNewKeyCreated: false,
          message: `تعذر التحقق: ${err.message || 'خطأ في الاتصال بقاعدة البيانات'}`,
        };
      }
    },
    [config.adminKey]
  );

  const logoutAdmin = useCallback(() => {
    setIsAdminAuthenticated(false);
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch {}
  }, []);

  // Set up initial fetch and real-time live sync / polling
  useEffect(() => {
    isMountedRef.current = true;
    fetchConfig(true);

    // Live stream subscription
    const unsubscribeStream = sudaDb.stream(
      SYSTEM_DB_PATH,
      (streamData) => {
        if (!isMountedRef.current || !streamData) return;
        if (typeof streamData === 'object') {
          setConfig((prev) => ({
            ...prev,
            ...streamData,
            updatedAt: Date.now(),
          }));
          setIsDbConnected(true);
          setLastSyncTime(Date.now());
        }
      },
      () => {
        // SSE may not be supported or timed out, will rely on polling
      }
    );

    // Periodic sync poll every 25 seconds
    const interval = setInterval(() => {
      if (isMountedRef.current) {
        fetchConfig(false);
      }
    }, 25000);

    return () => {
      isMountedRef.current = false;
      unsubscribeStream();
      clearInterval(interval);
    };
  }, [fetchConfig]);

  return {
    config,
    isLoadingConfig,
    isDbConnected,
    lastSyncTime,
    isAdminAuthenticated,
    verifyAndLoginAdmin,
    logoutAdmin,
    updateConfig,
    refetchConfig: () => fetchConfig(false),
  };
}
