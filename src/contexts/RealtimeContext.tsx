import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  User,
  Task,
  Dossier,
  CalendarEvent,
  RegisterBook,
  DocumentItem,
  NotificationItem,
  ActivityLog,
  AppSettings,
  LandProject,
  DisputeCase,
  PublicLandParcel,
  LandViolationCase,
} from '../types';
import { apiService, isAbortError } from '../services/api';
import { localVault } from '../services/localVault';
import { useAuth } from './AuthContext';
import { LANH_NGOC_VILLAGES } from '../constants/procedures';

interface RealtimeContextType {
  tasks: Task[];
  dossiers: Dossier[];
  calendarEvents: CalendarEvent[];
  registerBooks: RegisterBook[];
  documents: DocumentItem[];
  users: User[];
  notifications: NotificationItem[];
  activityLogs: ActivityLog[];
  settings: AppSettings | null;
  projects: LandProject[];
  disputes: DisputeCase[];
  publicLands: PublicLandParcel[];
  violations: LandViolationCase[];
  villages: string[];
  addVillage: (village: string) => Promise<string[]>;
  deleteVillage: (village: string) => Promise<string[]>;
  unreadNotificationCount: number;
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  refreshData: () => Promise<void>;
  restoreStandard60Dossiers: () => Promise<void>;
  exportLocalBackup: () => void;
  importLocalBackup: (file: File) => Promise<{ count: number }>;
  lastLocalSavedTime: string;
  deleteDossier: (id: string, code?: string) => Promise<void>;
  deleteTask: (id: string, code?: string) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  sendNotification: (data: Partial<NotificationItem>) => Promise<void>;
  toastMessage: { title: string; body: string; type?: 'info' | 'success' | 'warning' | 'urgent' } | null;
  clearToast: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [registerBooks, setRegisterBooks] = useState<RegisterBook[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [projects, setProjects] = useState<LandProject[]>([]);
  const [disputes, setDisputes] = useState<DisputeCase[]>([]);
  const [publicLands, setPublicLands] = useState<PublicLandParcel[]>([]);
  const [violations, setViolations] = useState<LandViolationCase[]>([]);
  const [villages, setVillages] = useState<string[]>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('LANH_NGOC_SAVED_VILLAGES');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      }
    } catch (_) {}
    return [...LANH_NGOC_VILLAGES];
  });

  const [isConnected, setIsConnected] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine !== false : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [lastLocalSavedTime, setLastLocalSavedTime] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    body: string;
    type?: 'info' | 'success' | 'warning' | 'urgent';
  } | null>(null);

  // Concurrency & race-condition controls
  const isExecutingRef = useRef(false);
  const syncPendingRef = useRef(false);
  const nextGenerationRef = useRef(0);
  const activeGenerationRef = useRef(0);
  const activeAbortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  const retryTimeoutRef = useRef<any>(null);
  const sseDebounceTimerRef = useRef<any>(null);

  // Immediate startup hydration from local vault before network responds
  useEffect(() => {
    isMountedRef.current = true;
    localVault.loadDossiersLocally().then((localList) => {
      const clean = (localList || []).filter((d) => d && !d.id?.startsWith('dos_kep'));
      if (isMountedRef.current && clean && clean.length > 0) {
        setDossiers(clean);
        setLastLocalSavedTime(localVault.getLastLocalSavedTime());
      }
    });
    localVault.loadTasksLocally().then((localTasks) => {
      if (isMountedRef.current && localTasks && localTasks.length > 0) {
        setTasks(localTasks);
      }
    });
    localVault.loadProjectsLocally().then((localProj) => {
      if (isMountedRef.current && localProj && localProj.length > 0) {
        setProjects(localProj);
      }
    });
    localVault.loadPublicLandsLocally().then((localPub) => {
      if (isMountedRef.current && localPub && localPub.length > 0) {
        setPublicLands(localPub);
      }
    });
    localVault.loadViolationsLocally().then((localViol) => {
      if (isMountedRef.current && localViol && localViol.length > 0) {
        setViolations(localViol);
      }
    });
    localVault.loadDisputesLocally().then((localDisp) => {
      if (isMountedRef.current && localDisp && localDisp.length > 0) {
        setDisputes(localDisp);
      }
    });
    const localBooks = localVault.getRegisterBooksBackup();
    if (isMountedRef.current && localBooks && localBooks.length > 0) {
      setRegisterBooks(localBooks);
    }
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const applySnapshotData = useCallback(async (data: any) => {
    // Ingest any server deleted records into local tombstones
    if (Array.isArray(data.deletedTasks) && data.deletedTasks.length > 0) {
      for (const t of data.deletedTasks) {
        localVault.markTaskDeleted(t.id, t.code);
      }
    }
    if (Array.isArray(data.deletedDossiers) && data.deletedDossiers.length > 0) {
      for (const d of data.deletedDossiers) {
        localVault.markDossierDeleted(d.id, d.code);
      }
    }

    // Reconcile tasks with localVault
    localVault
      .reconcileTasksWithServer(
        data.tasks || [],
        async (itemsToSync) => {
          const serverIds = new Set((data.tasks || []).map((t: any) => t.id));
          const serverCodes = new Set((data.tasks || []).map((t: any) => t.code).filter(Boolean));
          const brandNew: Task[] = [];
          const toUpdate: Task[] = [];
          for (const item of itemsToSync) {
            if (serverIds.has(item.id) || (item.code && serverCodes.has(item.code))) {
              toUpdate.push(item);
            } else {
              brandNew.push(item);
            }
          }
          if (brandNew.length > 0) {
            try {
              await apiService.createTasksBatch(brandNew, user?.id, user?.name);
            } catch (_) {}
          }
          for (const upd of toUpdate) {
            try {
              await apiService.updateTask(upd.id, upd);
            } catch (_) {}
          }
        },
        data.deletedTasks
      )
      .then((mergedTasks) => {
        if (isMountedRef.current) {
          setTasks((prev) => (JSON.stringify(prev) === JSON.stringify(mergedTasks) ? prev : mergedTasks));
        }
      });

    // Robust 2-way reconcile: ensure user dossiers saved before computer shutdown are preserved
    if (data.dossiers && Array.isArray(data.dossiers)) {
      try {
        const cleanServerDossiers = data.dossiers.filter((d: any) => d && !d.id?.startsWith('dos_kep'));
        const result = await localVault.reconcileWithServer(
          cleanServerDossiers,
          async (itemsToSync) => {
            const serverIds = new Set(cleanServerDossiers.map((d: any) => d.id));
            const serverCodes = new Set(cleanServerDossiers.map((d: any) => d.code).filter(Boolean));
            const brandNew: Dossier[] = [];
            const toUpdate: Dossier[] = [];
            for (const item of itemsToSync) {
              if (item.id?.startsWith('dos_kep')) continue;
              if (serverIds.has(item.id) || (item.code && serverCodes.has(item.code))) {
                toUpdate.push(item);
              } else {
                brandNew.push(item);
              }
            }
            if (brandNew.length > 0) {
              console.warn(`[REALTIME_SYNC] Auto-reconciling ${brandNew.length} missing dossiers back to server...`);
              await apiService.createDossiersBatch(brandNew, user?.id, user?.name);
            }
            for (const upd of toUpdate) {
              try {
                await apiService.updateDossier(upd.id, upd);
              } catch (_) {}
            }
          },
          data.deletedDossiers
        );
        const finalDossiers = result.merged.filter((d) => !d.id?.startsWith('dos_kep'));
        setDossiers(finalDossiers);
        setLastLocalSavedTime(localVault.getLastLocalSavedTime());
      } catch (err) {
        console.warn('[REALTIME_SYNC] Reconcile error, falling back to server snapshot:', err);
        const clean = (data.dossiers || []).filter((d: any) => !d.id?.startsWith('dos_kep') && !localVault.isDossierDeleted(d.id, d.code));
        setDossiers((prev) => (JSON.stringify(prev) === JSON.stringify(clean) ? prev : clean));
      }
    } else {
      setDossiers([]);
    }

    setCalendarEvents((prev) => (JSON.stringify(prev) === JSON.stringify(data.calendarEvents) ? prev : data.calendarEvents || []));
    setRegisterBooks((prev) => (JSON.stringify(prev) === JSON.stringify(data.registerBooks) ? prev : data.registerBooks || []));
    setDocuments((prev) => (JSON.stringify(prev) === JSON.stringify(data.documents) ? prev : data.documents || []));
    setUsers((prev) => (JSON.stringify(prev) === JSON.stringify(data.users) ? prev : data.users || []));
    setNotifications((prev) => (JSON.stringify(prev) === JSON.stringify(data.notifications) ? prev : data.notifications || []));
    setActivityLogs((prev) => (JSON.stringify(prev) === JSON.stringify(data.activityLogs) ? prev : data.activityLogs || []));
    setSettings((prev) => (JSON.stringify(prev) === JSON.stringify(data.settings) ? prev : data.settings || null));
    if (data.settings?.villages && Array.isArray(data.settings.villages) && data.settings.villages.length > 0) {
      setVillages(data.settings.villages);
      try {
        localStorage.setItem('LANH_NGOC_SAVED_VILLAGES', JSON.stringify(data.settings.villages));
      } catch (_) {}
    }
    // Reconcile Projects with localVault
    const serverProjectIds = new Set((data.projects || []).map((p: any) => p.id));
    localVault
      .reconcileProjectsWithServer(data.projects, async (missing) => {
        for (const p of missing) {
          try {
            if (serverProjectIds.has(p.id)) {
              await apiService.updateProject(p.id, p);
            } else {
              await apiService.createProject(p);
            }
          } catch (_) {}
        }
      })
      .then((merged) => {
        if (isMountedRef.current) {
          setProjects((prev) => (JSON.stringify(prev) === JSON.stringify(merged) ? prev : merged));
        }
      });

    // Reconcile Public Lands (5%) with localVault
    const serverPubLandIds = new Set((data.publicLands || []).map((p: any) => p.id));
    localVault
      .reconcilePublicLandsWithServer(
        data.publicLands,
        async (missing) => {
          for (const item of missing) {
            try {
              if (serverPubLandIds.has(item.id)) {
                await apiService.updatePublicLand(item.id, item);
              } else {
                await apiService.createPublicLand(item);
              }
            } catch (_) {}
          }
        },
        data.deletedPublicLands
      )
      .then((merged) => {
        if (isMountedRef.current) {
          setPublicLands((prev) => (JSON.stringify(prev) === JSON.stringify(merged) ? prev : merged));
        }
      });

    // Reconcile Violations with localVault
    const serverViolationIds = new Set((data.violations || []).map((v: any) => v.id));
    localVault
      .reconcileViolationsWithServer(
        data.violations,
        async (missing) => {
          for (const v of missing) {
            try {
              if (serverViolationIds.has(v.id)) {
                await apiService.updateViolation(v.id, v);
              } else {
                await apiService.createViolation(v);
              }
            } catch (_) {}
          }
        },
        data.deletedViolations
      )
      .then((merged) => {
        if (isMountedRef.current) {
          setViolations((prev) => (JSON.stringify(prev) === JSON.stringify(merged) ? prev : merged));
        }
      });

    // Reconcile Disputes with localVault
    const serverDisputeIds = new Set((data.disputes || []).map((d: any) => d.id));
    localVault
      .reconcileDisputesWithServer(
        data.disputes,
        async (missing) => {
          for (const d of missing) {
            try {
              if (serverDisputeIds.has(d.id)) {
                await apiService.updateDispute(d.id, d);
              } else {
                await apiService.createDispute(d);
              }
            } catch (_) {}
          }
        },
        data.deletedDisputes
      )
      .then((merged) => {
        if (isMountedRef.current) {
          setDisputes((prev) => (JSON.stringify(prev) === JSON.stringify(merged) ? prev : merged));
        }
      });
    setIsConnected(true);
    setLastSyncedAt(new Date());
  }, [user]);

  const runSnapshotLoop = useCallback(async (initialSilent: boolean = false) => {
    if (isExecutingRef.current) {
      syncPendingRef.current = true;
      return;
    }

    let silent = initialSilent;
    isExecutingRef.current = true;
    if (!silent) setIsSyncing(true);

    try {
      while (isMountedRef.current) {
        syncPendingRef.current = false;
        const currentGeneration = ++nextGenerationRef.current;

        const abortCtrl = new AbortController();
        activeAbortControllerRef.current = abortCtrl;

        try {
          const data = await apiService.getSnapshot(abortCtrl.signal);

          // Generation Check: Only apply if currentGeneration is strictly newer than activeGenerationRef and component is mounted
          if (isMountedRef.current && currentGeneration > activeGenerationRef.current) {
            activeGenerationRef.current = currentGeneration;
            applySnapshotData(data);
          }
        } catch (err: any) {
          if (!isAbortError(err, abortCtrl.signal) && !abortCtrl.signal.aborted && isMountedRef.current) {
            console.warn('Snapshot fetch temporary issue, retrying shortly:', err?.message || err);
            if (!retryTimeoutRef.current) {
              retryTimeoutRef.current = setTimeout(() => {
                retryTimeoutRef.current = null;
                if (isMountedRef.current) {
                  runSnapshotLoop(true);
                }
              }, 3000);
            }
          }
        } finally {
          if (activeAbortControllerRef.current === abortCtrl) {
            activeAbortControllerRef.current = null;
          }
        }

        // If another sync request arrived while in-flight, immediately loop once silently
        if (syncPendingRef.current && isMountedRef.current) {
          silent = true;
          continue;
        }
        break;
      }
    } finally {
      isExecutingRef.current = false;
      syncPendingRef.current = false;
      if (isMountedRef.current) {
        setIsSyncing(false);
      }
    }
  }, [applySnapshotData]);

  const fetchFullSnapshot = useCallback(async (silent: boolean = false) => {
    await runSnapshotLoop(silent);
  }, [runSnapshotLoop]);

  // Initialize and connect SSE / Cloud Firestore sync once authenticated
  useEffect(() => {
    isMountedRef.current = true;
    if (!user?.id) {
      setIsConnected(false);
      return;
    }

    const isStaticOrGithub =
      typeof window !== 'undefined' &&
      (window.location.protocol === 'file:' ||
        window.location.hostname.endsWith('github.io') ||
        Boolean((window as any).__INITIAL_DB_SNAPSHOT__));

    let eventSource: EventSource | null = null;
    let isFirstOpen = true;
    let sseReconnectTimer: any = null;

    // Initial fetch
    setIsConnected(typeof navigator !== 'undefined' ? navigator.onLine !== false : true);
    fetchFullSnapshot(false);

    const setupSSE = () => {
      if (!isMountedRef.current) return;
      if (isStaticOrGithub) {
        setIsConnected(typeof navigator !== 'undefined' ? navigator.onLine !== false : true);
        return;
      }
      try {
        if (eventSource) {
          try { eventSource.close(); } catch {}
        }
        eventSource = new EventSource('/api/sync/events');

        eventSource.onopen = () => {
          if (isMountedRef.current) {
            setIsConnected(true);
            if (isFirstOpen) {
              isFirstOpen = false;
            } else {
              // Snapshot on reconnect to catch any mutations missed while disconnected
              fetchFullSnapshot(true);
            }
          }
        };

        eventSource.onmessage = (event) => {
          if (!isMountedRef.current) return;
          try {
            if (!event.data || event.data.trim() === '' || event.data === ': keepalive') return;
            const payload = JSON.parse(event.data);
            if (payload.type === 'CONNECTED' || payload.type === 'PING') {
              setIsConnected(true);
              return;
            }

            // Debounced silent snapshot sync on mutation events to avoid flood/flicker
            if (sseDebounceTimerRef.current) {
              clearTimeout(sseDebounceTimerRef.current);
            }
            sseDebounceTimerRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                fetchFullSnapshot(true);
              }
            }, 300);

            if (payload.type === 'TASK_CREATED') {
              setToastMessage({
                title: 'Nhiệm vụ mới',
                body: `Nhiệm vụ [${payload.data?.code}] vừa được tạo trên hệ thống.`,
                type: 'info',
              });
            } else if (payload.type === 'DOSSIER_CREATED') {
              setToastMessage({
                title: 'Hồ sơ mới',
                body: `Hồ sơ ${payload.data?.code} đã được tiếp nhận.`,
                type: 'info',
              });
            } else if (payload.type === 'DOSSIER_RESTORED') {
              if (payload.data?.restoreAll || payload.data?.restoreStandard60) {
                localVault.clearDeletedDossierTombstones();
              } else if (payload.data?.id || payload.data?.code) {
                localVault.unmarkDossierDeleted(payload.data?.id, payload.data?.code);
              }
            } else if (payload.type === 'DOSSIER_DELETED') {
              const delId = payload.data?.id;
              const delCode = payload.data?.code;
              if (delId || delCode) {
                localVault.markDossierDeleted(delId, delCode);
                setDossiers((prev) => prev.filter((d) => d.id !== delId && (!delCode || d.code !== delCode)));
              }
            } else if (payload.type === 'TASK_DELETED') {
              const delId = payload.data?.id;
              const delCode = payload.data?.code;
              if (delId || delCode) {
                localVault.markTaskDeleted(delId, delCode);
                setTasks((prev) => prev.filter((t) => t.id !== delId && (!delCode || t.code !== delCode)));
              }
            } else if (payload.type === 'PROJECT_DELETED') {
              const delId = payload.data?.id;
              if (delId) {
                localVault.deleteLocalProject(delId);
                setProjects((prev) => prev.filter((p) => p.id !== delId));
              }
            } else if (payload.type === 'PUBLIC_LAND_DELETED') {
              const delId = payload.data?.id;
              if (delId) {
                localVault.deleteLocalPublicLand(delId);
                setPublicLands((prev) => prev.filter((p) => p.id !== delId));
              }
            } else if (payload.type === 'VIOLATION_DELETED') {
              const delId = payload.data?.id;
              if (delId) {
                localVault.deleteLocalViolation(delId);
                setViolations((prev) => prev.filter((v) => v.id !== delId));
              }
            } else if (payload.type === 'DISPUTE_DELETED') {
              const delId = payload.data?.id;
              if (delId) {
                localVault.deleteLocalDispute(delId);
                setDisputes((prev) => prev.filter((d) => d.id !== delId));
              }
            } else if (payload.type === 'VILLAGES_UPDATED' && payload.data?.villages) {
              setVillages(payload.data.villages);
              try {
                localStorage.setItem('LANH_NGOC_SAVED_VILLAGES', JSON.stringify(payload.data.villages));
              } catch (_) {}
            }
          } catch (e) {
            console.error('SSE Message parsing error:', e);
          }
        };

        eventSource.onerror = () => {
          if (!isMountedRef.current) return;
          if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            setIsConnected(false);
          }
          if (eventSource && eventSource.readyState === EventSource.CLOSED) {
            try { eventSource.close(); } catch {}
            eventSource = null;
            if (sseReconnectTimer) clearTimeout(sseReconnectTimer);
            sseReconnectTimer = setTimeout(() => {
              if (isMountedRef.current) setupSSE();
            }, 5000);
          }
        };
      } catch {
        if (isMountedRef.current && typeof navigator !== 'undefined' && navigator.onLine === false) {
          setIsConnected(false);
        }
      }
    };

    setupSSE();

    // Fallback silent polling every 20s to guarantee 100% data freshness
    const pollInterval = setInterval(() => {
      if (isMountedRef.current) {
        fetchFullSnapshot(true);
      }
    }, 20000);

    // Instant sync when Firestore cloud updates or user tabs back into the app
    const handleCloudUpdated = () => {
      if (isMountedRef.current) {
        setIsConnected(true);
        fetchFullSnapshot(true);
      }
    };

    const handleVisibilityOrOnline = () => {
      if (document.visibilityState === 'visible' && isMountedRef.current) {
        setIsConnected(typeof navigator !== 'undefined' ? navigator.onLine !== false : true);
        fetchFullSnapshot(true);
        if (!isStaticOrGithub && (!eventSource || eventSource.readyState === EventSource.CLOSED)) {
          setupSSE();
        }
      }
    };

    const handleOffline = () => {
      if (isMountedRef.current) setIsConnected(false);
    };

    window.addEventListener('qlcv-cloud-updated', handleCloudUpdated);
    document.addEventListener('visibilitychange', handleVisibilityOrOnline);
    window.addEventListener('online', handleVisibilityOrOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (sseReconnectTimer) {
        clearTimeout(sseReconnectTimer);
        sseReconnectTimer = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (sseDebounceTimerRef.current) {
        clearTimeout(sseDebounceTimerRef.current);
        sseDebounceTimerRef.current = null;
      }
      clearInterval(pollInterval);
      window.removeEventListener('qlcv-cloud-updated', handleCloudUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
      window.removeEventListener('online', handleVisibilityOrOnline);
      window.removeEventListener('offline', handleOffline);
      try { eventSource?.close(); } catch {}
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
      }
    };
  }, [user?.id, fetchFullSnapshot]);

  const markNotificationAsRead = async (id: string) => {
    try {
      await apiService.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await apiService.markAllNotificationsRead(user?.id);
      setNotifications((prev) =>
        prev.map((n) => (!user || n.userId === user.id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await apiService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await apiService.clearAllNotifications(user?.id);
      setNotifications((prev) => (user ? prev.filter((n) => n.userId !== user.id) : []));
    } catch (e) {
      console.error(e);
    }
  };

  const sendNotification = async (data: Partial<NotificationItem>) => {
    try {
      const notif = await apiService.createNotification(data);
      setNotifications((prev) => [notif, ...prev]);
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const unreadNotificationCount = notifications.filter(
    (n) => !n.isRead && (!user || n.userId === user.id)
  ).length;

  const restoreStandard60Dossiers = async () => {
    try {
      setIsSyncing(true);
      localVault.clearDeletedDossierTombstones();
      await apiService.restoreStandard60Dossiers();
      await fetchFullSnapshot();
      setToastMessage({
        title: 'Khôi phục hồ sơ thành công',
        body: 'Đã nạp và đồng bộ toàn bộ hơn 60 hồ sơ địa chính chuẩn.',
        type: 'success',
      });
    } catch (e: any) {
      console.error(e);
      setToastMessage({
        title: 'Lỗi khôi phục hồ sơ',
        body: e.message || 'Không thể đồng bộ danh sách hồ sơ.',
        type: 'urgent',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const clearToast = () => setToastMessage(null);

  const exportLocalBackup = useCallback(() => {
    localVault.exportBackupJson(dossiers);
    setToastMessage({
      title: 'Đã xuất file dự phòng',
      body: `Đã tải xuống file sao lưu an toàn gồm ${dossiers.length} hồ sơ đất đai.`,
      type: 'success',
    });
  }, [dossiers]);

  const importLocalBackup = useCallback(
    async (file: File) => {
      try {
        setIsSyncing(true);
        const list = await localVault.parseBackupFile(file);
        if (!list || list.length === 0) {
          throw new Error('File sao lưu không có dữ liệu hồ sơ hợp lệ.');
        }
        await localVault.upsertLocalDossiersBatch(list);
        await apiService.createDossiersBatch(list, user?.id, user?.name);
        await fetchFullSnapshot();
        setToastMessage({
          title: 'Khôi phục hoàn tất',
          body: `Đã nạp và lưu thành công ${list.length} hồ sơ đất đai từ file sao lưu.`,
          type: 'success',
        });
        return { count: list.length };
      } catch (err: any) {
        setToastMessage({
          title: 'Lỗi nạp file sao lưu',
          body: err.message || 'Không thể khôi phục từ file.',
          type: 'urgent',
        });
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [user, fetchFullSnapshot]
  );

  const deleteDossier = useCallback(
    async (id: string, code?: string) => {
      try {
        setIsSyncing(true);
        // 1. Tombstone in localVault immediately to prevent any auto-restore
        await localVault.markDossierDeleted(id, code);
        await localVault.deleteLocalDossier(id, code);

        // 2. Optimistic local removal from active state
        setDossiers((prev) => prev.filter((d) => d.id !== id && (!code || d.code !== code)));

        // 3. Call server API
        const res = await apiService.deleteDossier(id);

        setToastMessage({
          title: 'Đã xóa hồ sơ thành công',
          body: res?.dossier?.code
            ? `Hồ sơ ${res.dossier.code} đã được xóa và lưu trữ an toàn.`
            : 'Đã xóa hồ sơ khỏi danh sách.',
          type: 'success',
        });

        // 4. Background refresh to sync activities and logs
        await fetchFullSnapshot(true);
      } catch (err: any) {
        console.error('[REALTIME] Delete dossier error:', err);
        setToastMessage({
          title: 'Lỗi xóa hồ sơ',
          body: err.message || 'Không thể xóa hồ sơ khỏi máy chủ.',
          type: 'urgent',
        });
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [fetchFullSnapshot]
  );

  const deleteTask = useCallback(
    async (id: string, code?: string) => {
      try {
        setIsSyncing(true);
        // 1. Tombstone in localVault immediately to prevent any auto-restore
        await localVault.markTaskDeleted(id, code);
        await localVault.deleteLocalTask(id, code);

        // 2. Optimistic local removal from active state
        setTasks((prev) => prev.filter((t) => t.id !== id && (!code || t.code !== code)));

        // 3. Call server API
        const res = await apiService.deleteTask(id);

        setToastMessage({
          title: 'Đã xóa công việc thành công',
          body: res?.task?.code
            ? `Công việc ${res.task.code} đã được xóa khỏi hệ thống.`
            : 'Đã xóa công việc khỏi danh sách.',
          type: 'success',
        });

        // 4. Background refresh to sync activities and logs
        await fetchFullSnapshot(true);
      } catch (err: any) {
        console.error('[REALTIME] Delete task error:', err);
        setToastMessage({
          title: 'Lỗi xóa công việc',
          body: err.message || 'Không thể xóa công việc khỏi máy chủ.',
          type: 'urgent',
        });
        throw err;
      } finally {
        setIsSyncing(false);
      }
    },
    [fetchFullSnapshot]
  );

  const addVillage = useCallback(
    async (newVillage: string): Promise<string[]> => {
      const clean = newVillage.trim();
      if (!clean) return villages;
      try {
        const res = await apiService.addVillage(clean);
        const updated = res.villages || [...villages, clean];
        setVillages(updated);
        try {
          localStorage.setItem('LANH_NGOC_SAVED_VILLAGES', JSON.stringify(updated));
        } catch (_) {}
        setToastMessage({
          title: 'Đã lưu thôn mới',
          body: `Thôn "${clean}" đã được lưu vào danh mục dùng chung của xã.`,
          type: 'success',
        });
        return updated;
      } catch (err: any) {
        console.error('Error adding village:', err);
        const updated = Array.from(new Set([...villages, clean]));
        setVillages(updated);
        try {
          localStorage.setItem('LANH_NGOC_SAVED_VILLAGES', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      }
    },
    [villages]
  );

  const deleteVillage = useCallback(
    async (villageToDelete: string): Promise<string[]> => {
      const clean = villageToDelete.trim();
      try {
        const res = await apiService.deleteVillage(clean);
        const updated = res.villages || villages.filter((v) => v !== clean);
        setVillages(updated);
        try {
          localStorage.setItem('LANH_NGOC_SAVED_VILLAGES', JSON.stringify(updated));
        } catch (_) {}
        setToastMessage({
          title: 'Đã xóa thôn',
          body: `Đã xóa thôn "${clean}" khỏi danh mục dùng chung.`,
          type: 'info',
        });
        return updated;
      } catch (err: any) {
        console.error('Error deleting village:', err);
        const updated = villages.filter((v) => v !== clean);
        setVillages(updated);
        try {
          localStorage.setItem('LANH_NGOC_SAVED_VILLAGES', JSON.stringify(updated));
        } catch (_) {}
        return updated;
      }
    },
    [villages]
  );

  return (
    <RealtimeContext.Provider
      value={{
        tasks,
        dossiers,
        calendarEvents,
        registerBooks,
        documents,
        users,
        notifications,
        activityLogs,
        settings,
        projects,
        disputes,
        publicLands,
        violations,
        villages,
        addVillage,
        deleteVillage,
        unreadNotificationCount,
        isConnected,
        isSyncing,
        lastSyncedAt,
        refreshData: fetchFullSnapshot,
        restoreStandard60Dossiers,
        exportLocalBackup,
        importLocalBackup,
        lastLocalSavedTime,
        deleteDossier,
        deleteTask,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        clearAllNotifications,
        sendNotification,
        toastMessage,
        clearToast,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
