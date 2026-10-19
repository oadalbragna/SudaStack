import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { TelegramStorageFile } from '../types';

const STORAGE_KEY_FILES = 'sudastack_cloud_files';

export function useStorageFiles() {
  const [telegramFiles, setTelegramFiles] = useState<TelegramStorageFile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FILES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse storage files from localStorage:', e);
    }
    return [];
  });

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestFilesRef = useRef<TelegramStorageFile[]>(telegramFiles);
  latestFilesRef.current = telegramFiles;

  const schedulePersist = useCallback((filesToSave: TelegramStorageFile[]) => {
    latestFilesRef.current = filesToSave;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(latestFilesRef.current));
      } catch (e) {
        console.warn('localStorage quota exceeded while saving files:', e);
      }
      saveTimerRef.current = null;
    }, 220);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        try {
          localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(latestFilesRef.current));
        } catch {}
      }
    };
  }, []);

  const saveFiles = useCallback(
    (files: TelegramStorageFile[]) => {
      setTelegramFiles(files);
      schedulePersist(files);
    },
    [schedulePersist]
  );

  const addFile = useCallback(
    (file: TelegramStorageFile) => {
      setTelegramFiles((prev) => {
        const updated = [file, ...prev.filter((f) => f.id !== file.id)];
        schedulePersist(updated);
        return updated;
      });
    },
    [schedulePersist]
  );

  const addFilesBatch = useCallback(
    (newFiles: TelegramStorageFile[]) => {
      if (!newFiles || newFiles.length === 0) return;
      setTelegramFiles((prev) => {
        const newIds = new Set(newFiles.map((nf) => nf.id));
        const updated = [...newFiles, ...prev.filter((f) => !newIds.has(f.id))];
        schedulePersist(updated);
        return updated;
      });
    },
    [schedulePersist]
  );

  const removeFile = useCallback(
    (fileId: string) => {
      setTelegramFiles((prev) => {
        const updated = prev.filter((f) => f.id !== fileId);
        schedulePersist(updated);
        return updated;
      });
    },
    [schedulePersist]
  );

  const removeProjectFolder = useCallback(
    (folderName: string) => {
      setTelegramFiles((prev) => {
        const updated = prev.filter((f) => f.folder !== folderName);
        schedulePersist(updated);
        return updated;
      });
    },
    [schedulePersist]
  );

  const updateFileContent = useCallback(
    (fileId: string, content: string) => {
      setTelegramFiles((prev) => {
        const updated = prev.map((f) =>
          f.id === fileId
            ? {
                ...f,
                content,
                sizeBytes: new Blob([content]).size,
                charCount: content.length,
              }
            : f
        );
        schedulePersist(updated);
        return updated;
      });
    },
    [schedulePersist]
  );

  const storageStats = useMemo(() => {
    const totalBytes = telegramFiles.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
    const countByType: Record<string, number> = {};
    telegramFiles.forEach((f) => {
      const cat = f.category || 'other';
      countByType[cat] = (countByType[cat] || 0) + 1;
    });

    return {
      totalBytes,
      totalCount: telegramFiles.length,
      countByType,
      formattedTotalSize:
        totalBytes < 1024
          ? `${totalBytes} B`
          : totalBytes < 1024 * 1024
          ? `${(totalBytes / 1024).toFixed(1)} KB`
          : `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`,
    };
  }, [telegramFiles]);

  return {
    telegramFiles,
    setTelegramFiles: saveFiles,
    addFile,
    addFilesBatch,
    removeFile,
    removeProjectFolder,
    updateFileContent,
    storageStats,
  };
}
