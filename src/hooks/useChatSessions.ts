import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChatSession, AIChatMessage, SudaResponseMode } from '../types';

export const INITIAL_WELCOME_CONVERSATION: AIChatMessage[] = [
  {
    id: 'msg-suda-welcome',
    sender: 'ai',
    text: `أهلاً بك في منصة **SudaStack** الذكية! يمكنك الآن بناء وتطوير المنصات والتطبيقات والصفحات التفاعلية وإدارة الملفات السحابية بكفاءة عالية وبدون وكلاء 🚀`,
    timestamp: 'الآن',
  },
];

export const formatSessionTime = (date: Date, isArabic: boolean): string => {
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const isToday = new Date().toDateString() === date.toDateString();
  if (isToday) {
    return isArabic ? `اليوم ${timeStr}` : `Today ${timeStr}`;
  }
  const dateStr = date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
  return `${dateStr} • ${timeStr}`;
};

const STORAGE_KEY_SESSIONS = 'sudastack_chat_sessions';
const STORAGE_KEY_CURRENT_ID = 'sudastack_current_session_id';

export function useChatSessions(isArabic: boolean = true, initialResponseMode: SudaResponseMode = 'coding') {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved chat sessions from localStorage:', e);
    }

    const now = new Date();
    return [
      {
        id: 'session-default',
        title: isArabic ? 'محادثة ترحيبية' : 'Welcome Chat',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        formattedTime: formatSessionTime(now, isArabic),
        messages: INITIAL_WELCOME_CONVERSATION,
        responseMode: initialResponseMode,
      },
    ];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_KEY_CURRENT_ID);
      if (savedId) return savedId;
    } catch {}
    return 'session-default';
  });

  const saveTimerRef = useRef<any>(null);
  const latestSessionsRef = useRef<ChatSession[]>(sessions);
  latestSessionsRef.current = sessions;

  const persistToStorageNow = useCallback((dataToSave: ChatSession[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(dataToSave));
    } catch (e) {
      console.warn('localStorage quota exceeded:', e);
    }
  }, []);

  const scheduleStoragePersist = useCallback(
    (updated: ChatSession[]) => {
      latestSessionsRef.current = updated;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        persistToStorageNow(latestSessionsRef.current);
        saveTimerRef.current = null;
      }, 350);
    },
    [persistToStorageNow]
  );

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        persistToStorageNow(latestSessionsRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        persistToStorageNow(latestSessionsRef.current);
      }
    };
  }, [persistToStorageNow]);

  const saveSessions = useCallback(
    (updated: ChatSession[]) => {
      setSessions(updated);
      scheduleStoragePersist(updated);
    },
    [scheduleStoragePersist]
  );

  useEffect(() => {
    if (sessions.length > 0 && !sessions.some((s) => s.id === currentSessionId)) {
      const fallbackId = sessions[0].id;
      setCurrentSessionId(fallbackId);
      try {
        localStorage.setItem(STORAGE_KEY_CURRENT_ID, fallbackId);
      } catch {}
    }
  }, [sessions, currentSessionId]);

  const currentSession = useMemo(() => {
    return sessions.find((s) => s.id === currentSessionId) || sessions[0];
  }, [sessions, currentSessionId]);

  const selectSession = useCallback((id: string) => {
    setCurrentSessionId(id);
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT_ID, id);
    } catch {}
  }, []);

  const createNewSession = useCallback((responseMode: SudaResponseMode = 'coding') => {
    const now = new Date();
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: isArabic ? 'محادثة جديدة' : 'New Chat',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      formattedTime: formatSessionTime(now, isArabic),
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'ai',
          text: isArabic ? 'كيف يمكنني مساعدتك في مشروعك اليوم؟' : 'How can I help with your project today?',
          timestamp: 'الآن',
        },
      ],
      responseMode,
    };

    setSessions((prev) => {
      const updated = [newSession, ...prev];
      scheduleStoragePersist(updated);
      return updated;
    });
    setCurrentSessionId(newSession.id);
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT_ID, newSession.id);
    } catch {}
  }, [isArabic, scheduleStoragePersist]);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      if (filtered.length === 0) {
        const now = new Date();
        const fallback: ChatSession = {
          id: `session-${Date.now()}`,
          title: isArabic ? 'محادثة جديدة' : 'New Chat',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          formattedTime: formatSessionTime(now, isArabic),
          messages: INITIAL_WELCOME_CONVERSATION,
        };
        const updated = [fallback];
        scheduleStoragePersist(updated);
        setCurrentSessionId(fallback.id);
        return updated;
      }
      scheduleStoragePersist(filtered);
      return filtered;
    });
  }, [isArabic, scheduleStoragePersist]);

  const renameSession = useCallback((id: string, newTitle: string) => {
    setSessions((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s));
      scheduleStoragePersist(updated);
      return updated;
    });
  }, [scheduleStoragePersist]);

  const updateCurrentSessionMessages = useCallback((
    newMessagesOrUpdater: AIChatMessage[] | ((prev: AIChatMessage[]) => AIChatMessage[]),
    customTitle?: string
  ) => {
    setSessions((prevSessions) => {
      const now = new Date();
      const updated = prevSessions.map((s) => {
        if (s.id === currentSessionId) {
          const newMsgs = typeof newMessagesOrUpdater === 'function' ? newMessagesOrUpdater(s.messages) : newMessagesOrUpdater;
          let newTitle = customTitle || s.title;
          if (!customTitle && (s.title === 'محادثة ترحيبية' || s.title === 'Welcome Chat' || s.title === 'محادثة جديدة' || s.title === 'New Chat')) {
            const firstUserMsg = newMsgs.find((m) => m.sender === 'user');
            if (firstUserMsg && firstUserMsg.text.trim()) {
              newTitle = firstUserMsg.text.slice(0, 32) + (firstUserMsg.text.length > 32 ? '...' : '');
            }
          }
          return {
            ...s,
            title: newTitle,
            updatedAt: now.toISOString(),
            formattedTime: formatSessionTime(now, isArabic),
            messages: newMsgs,
          };
        }
        return s;
      });
      scheduleStoragePersist(updated);
      return updated;
    });
  }, [currentSessionId, isArabic, scheduleStoragePersist]);

  const updateSpecificMessage = useCallback(
    (
      arg1: string,
      arg2: string | Partial<AIChatMessage> | ((msg: AIChatMessage) => AIChatMessage),
      arg3?: Partial<AIChatMessage> | ((msg: AIChatMessage) => AIChatMessage)
    ) => {
      setSessions((prevSessions) => {
        let targetSessionId = currentSessionId;
        let targetMsgId = arg1;
        let updaterFn: (msg: AIChatMessage) => AIChatMessage;

        if (typeof arg2 === 'string') {
          targetSessionId = arg1;
          targetMsgId = arg2;
          updaterFn = typeof arg3 === 'function' ? (arg3 as (msg: AIChatMessage) => AIChatMessage) : (m) => ({ ...m, ...(arg3 || {}) });
        } else if (typeof arg2 === 'function') {
          updaterFn = arg2 as (msg: AIChatMessage) => AIChatMessage;
        } else {
          updaterFn = (m) => ({ ...m, ...(arg2 || {}) });
        }

        const updated = prevSessions.map((s) => {
          if (s.id === targetSessionId) {
            const updatedMsgs = s.messages.map((m) => (m.id === targetMsgId ? updaterFn(m) : m));
            return { ...s, messages: updatedMsgs };
          }
          return s;
        });
        scheduleStoragePersist(updated);
        return updated;
      });
    },
    [currentSessionId, scheduleStoragePersist]
  );

  return {
    sessions,
    currentSessionId,
    currentSession,
    selectSession,
    createNewSession,
    deleteSession,
    renameSession,
    updateCurrentSessionMessages,
    updateSpecificMessage,
    saveSessions,
  };
}
