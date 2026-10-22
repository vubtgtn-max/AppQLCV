import { useState, useEffect, useRef, useCallback } from 'react';

const DRAFT_PREFIX = 'DANANG_MODAL_DRAFT_';

interface DraftEnvelope<T> {
  formKey: string;
  updatedAt: string; // ISO string
  displayTime: string; // HH:mm:ss
  data: T;
}

interface UseModalDraftOptions<T> {
  formKey: string;
  isOpen: boolean;
  isEditing?: boolean;
  formData: T;
  onRestore: (draftData: T) => void;
  debounceMs?: number;
  hasMeaningfulData?: (data: T) => boolean;
}

export function useModalDraft<T extends Record<string, any>>({
  formKey,
  isOpen,
  isEditing = false,
  formData,
  onRestore,
  debounceMs = 600,
  hasMeaningfulData,
}: UseModalDraftOptions<T>) {
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState<boolean>(false);
  const [restoredDraftTime, setRestoredDraftTime] = useState<string | null>(null);
  const [isDraftSaving, setIsDraftSaving] = useState<boolean>(false);

  const storageKey = `${DRAFT_PREFIX}${formKey}`;
  const debounceTimerRef = useRef<any>(null);
  const formDataRef = useRef<T>(formData);
  formDataRef.current = formData;
  const initialCheckedRef = useRef<boolean>(false);

  // Check if current form data has meaningful content worth saving
  const checkMeaningful = useCallback(
    (data: T): boolean => {
      if (hasMeaningfulData) return hasMeaningfulData(data);
      // Default: at least one string field has non-empty text
      return Object.values(data).some((val) => {
        if (typeof val === 'string') return val.trim().length > 1;
        if (Array.isArray(val)) return val.length > 0;
        return false;
      });
    },
    [hasMeaningfulData]
  );

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(storageKey);
      }
    } catch (_) {}
    setHasRestoredDraft(false);
    setRestoredDraftTime(null);
    setLastSavedTime(null);
  }, [storageKey]);

  // Discard restored draft and revert
  const discardDraft = useCallback(() => {
    clearDraft();
  }, [clearDraft]);

  // Check and restore draft when modal is opened (only for new record creation)
  useEffect(() => {
    if (!isOpen || isEditing) {
      initialCheckedRef.current = false;
      setHasRestoredDraft(false);
      setRestoredDraftTime(null);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      return;
    }

    if (isOpen && !initialCheckedRef.current) {
      initialCheckedRef.current = true;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const raw = window.localStorage.getItem(storageKey);
          if (raw) {
            const envelope: DraftEnvelope<T> = JSON.parse(raw);
            if (envelope && envelope.data && checkMeaningful(envelope.data)) {
              // Valid draft found!
              onRestore(envelope.data);
              setHasRestoredDraft(true);
              let safeTime = envelope.displayTime || '';
              if (!safeTime && envelope.updatedAt) {
                try {
                  const d = new Date(envelope.updatedAt);
                  if (!isNaN(d.getTime())) {
                    safeTime = d.toLocaleTimeString('vi-VN');
                  }
                } catch {}
              }
              if (!safeTime) {
                safeTime = new Date().toLocaleTimeString('vi-VN');
              }
              setRestoredDraftTime(safeTime);
              setLastSavedTime(safeTime);
            }
          }
        }
      } catch (err) {
        console.warn('[MODAL_DRAFT] Error reading draft from storage:', err);
      }
    }
  }, [isOpen, isEditing, storageKey, onRestore, checkMeaningful]);

  // Periodic and debounced auto-save while modal is open (only for new record creation)
  useEffect(() => {
    if (!isOpen || isEditing) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const current = formDataRef.current;
      if (!checkMeaningful(current)) {
        return;
      }

      try {
        setIsDraftSaving(true);
        const now = new Date();
        const displayTime = now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        const envelope: DraftEnvelope<T> = {
          formKey,
          updatedAt: now.toISOString(),
          displayTime,
          data: current,
        };

        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(storageKey, JSON.stringify(envelope));
        }

        setLastSavedTime(displayTime);
      } catch (err) {
        console.warn('[MODAL_DRAFT] Error saving draft:', err);
      } finally {
        setIsDraftSaving(false);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isOpen, isEditing, formKey, storageKey, debounceMs, checkMeaningful, formData]);

  // Periodic safety sync interval every 4 seconds while modal is open
  useEffect(() => {
    if (!isOpen || isEditing) return;

    const interval = setInterval(() => {
      const current = formDataRef.current;
      if (checkMeaningful(current)) {
        try {
          const now = new Date();
          const displayTime = now.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          const envelope: DraftEnvelope<T> = {
            formKey,
            updatedAt: now.toISOString(),
            displayTime,
            data: current,
          };
          window.localStorage.setItem(storageKey, JSON.stringify(envelope));
          setLastSavedTime(displayTime);
        } catch (_) {}
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, isEditing, formKey, storageKey, checkMeaningful]);

  return {
    lastSavedTime,
    isDraftSaving,
    hasRestoredDraft,
    restoredDraftTime,
    clearDraft,
    discardDraft,
  };
}
