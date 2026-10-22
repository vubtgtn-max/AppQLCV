import React, { Component, useState, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RealtimeProvider, useRealtime } from './contexts/RealtimeContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { ConfirmModal } from './components/common/ConfirmModal';

// Resilient Lazy Loader with automatic retry on network/chunk load failures
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<any>,
  namedExport?: string
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await factory();
      return { default: namedExport ? module[namedExport] : (module.default || module) };
    } catch (firstErr) {
      console.warn('[ViteModuleLoader] First attempt failed, retrying in 400ms...', firstErr);
      await new Promise((resolve) => setTimeout(resolve, 400));
      try {
        const module = await factory();
        return { default: namedExport ? module[namedExport] : (module.default || module) };
      } catch (secondErr) {
        console.warn('[ViteModuleLoader] Second attempt failed, retrying once more in 1000ms...', secondErr);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const module = await factory();
        return { default: namedExport ? module[namedExport] : (module.default || module) };
      }
    }
  });
}

// Error Boundary for dynamic chunk loading and component crashes
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackMessage?: string;
  onReset?: () => void;
  key?: React.Key;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ModuleErrorBoundary extends (React.Component as any) {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ModuleErrorBoundary] Caught dynamic import or runtime error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const isDynamicImportError =
        this.state.error?.message?.includes('Failed to fetch dynamically imported module') ||
        this.state.error?.message?.includes('dynamically imported') ||
        this.state.error?.name === 'ChunkLoadError';

      return (
        <div className="flex flex-col items-center justify-center min-h-[420px] p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm my-4">
          <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-4 text-2xl shadow-inner">
            ⚠️
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
            {isDynamicImportError ? 'Đang cập nhật phiên bản phân hệ...' : 'Gặp gián đoạn khi nạp dữ liệu phân hệ'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
            {isDynamicImportError
              ? 'Máy chủ vừa được khởi động lại hoặc có cập nhật mới. Vui lòng bấm nút bên dưới để tải lại dữ liệu.'
              : 'Hệ thống phát hiện gián đoạn mạng tạm thời khi tải thành phần giao diện.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold shadow-md transition cursor-pointer flex items-center gap-2"
            >
              <span>🔄 Tải lại phân hệ ngay</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition cursor-pointer"
            >
              Làm mới toàn trang (F5)
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Modals - Code-split & on-demand loaded with auto-retry
const TaskModal = lazyWithRetry(() => import('./components/tasks/TaskModal'), 'TaskModal');
const TaskDetailModal = lazyWithRetry(() => import('./components/tasks/TaskDetailModal'), 'TaskDetailModal');
const DossierModal = lazyWithRetry(() => import('./components/dossiers/DossierModal'), 'DossierModal');
const CalendarModal = lazyWithRetry(() => import('./components/calendar/CalendarModal'), 'CalendarModal');
const RegisterBookModal = lazyWithRetry(() => import('./components/books/RegisterBookModal'), 'RegisterBookModal');
const DocumentModal = lazyWithRetry(() => import('./components/documents/DocumentModal'), 'DocumentModal');
const DocumentViewerModal = lazyWithRetry(() => import('./components/documents/DocumentViewerModal'), 'DocumentViewerModal');
const UserEditModal = lazyWithRetry(() => import('./components/users/UserEditModal'), 'UserEditModal');
const QuickAlertModal = lazyWithRetry(() => import('./components/alerts/QuickAlertModal'), 'QuickAlertModal');
const TelegramConfigModal = lazyWithRetry(() => import('./components/alerts/TelegramConfigModal'), 'TelegramConfigModal');

// Pages - Code-split & on-demand loaded with auto-retry per active navigation tab
const DashboardPage = lazyWithRetry(() => import('./pages/DashboardPage'), 'DashboardPage');
const TasksPage = lazyWithRetry(() => import('./pages/TasksPage'), 'TasksPage');
const DossiersPage = lazyWithRetry(() => import('./pages/DossiersPage'), 'DossiersPage');
const CalendarPage = lazyWithRetry(() => import('./pages/CalendarPage'), 'CalendarPage');
const RegisterBooksPage = lazyWithRetry(() => import('./pages/RegisterBooksPage'), 'RegisterBooksPage');
const DocumentsPage = lazyWithRetry(() => import('./pages/DocumentsPage'), 'DocumentsPage');
const ReportsPage = lazyWithRetry(() => import('./pages/ReportsPage'), 'ReportsPage');
const ActivityLogsPage = lazyWithRetry(() => import('./pages/ActivityLogsPage'), 'ActivityLogsPage');
const UsersPage = lazyWithRetry(() => import('./pages/UsersPage'), 'UsersPage');
const SettingsPage = lazyWithRetry(() => import('./pages/SettingsPage'), 'SettingsPage');
const SmartAlertsPage = lazyWithRetry(() => import('./pages/SmartAlertsPage'), 'SmartAlertsPage');
const ProjectsPage = lazyWithRetry(() => import('./pages/ProjectsPage'), 'ProjectsPage');
const DisputesPage = lazyWithRetry(() => import('./pages/DisputesPage'), 'DisputesPage');
const PublicLandPage = lazyWithRetry(() => import('./pages/PublicLandPage'), 'PublicLandPage');
const ViolationsPage = lazyWithRetry(() => import('./pages/ViolationsPage'), 'ViolationsPage');
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'), 'LoginPage');

import { Task, Dossier, CalendarEvent, RegisterBook, DocumentItem, User, Attachment } from './types';
import { apiService } from './services/api';

const PageLoadingFallback: React.FC<{ message?: string }> = ({ message = 'Đang tải phân hệ dữ liệu...' }) => (
  <div className="flex flex-col items-center justify-center min-h-[360px] p-8 text-slate-500 dark:text-slate-400">
    <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 animate-pulse">{message}</p>
  </div>
);


const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading, isAdmin, isLeader, canEditDossier, canDeleteDossier, canModifyRecord } = useAuth();
  const { refreshData, deleteDossier, deleteTask } = useRealtime();

  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [filterParam, setFilterParam] = useState<string | undefined>(undefined);
  const [alertsInitialSubTab, setAlertsInitialSubTab] = useState<'pending' | 'logs' | 'config'>('pending');
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('qlcv_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('qlcv_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToDetail, setTaskToDetail] = useState<Task | null>(null);

  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);
  const [dossierToEdit, setDossierToEdit] = useState<Dossier | null>(null);

  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<RegisterBook | null>(null);
  const [defaultBookType, setDefaultBookType] = useState<string | undefined>(undefined);

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docToEdit, setDocToEdit] = useState<DocumentItem | null>(null);

  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const [viewingAttachment, setViewingAttachment] = useState<Attachment | null>(null);

  // Quick Alert State
  const [quickAlertData, setQuickAlertData] = useState<{
    isOpen: boolean;
    targetType: 'task' | 'dossier' | 'document';
    targetId: string;
    targetCode: string;
    targetTitle: string;
    dueDate?: string;
    assigneeId?: string;
    assigneeName?: string;
  } | null>(null);

  // Confirmation Delete Modal
  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });

  const handleNavigate = (tab: string, param?: string) => {
    if (tab === 'telegram-config') {
      setIsTelegramModalOpen(true);
      setIsMobileMenuOpen(false);
      return;
    }
    if (tab === 'alerts') {
      if (param === 'config' || param === 'logs' || param === 'pending') {
        setAlertsInitialSubTab(param);
      }
    }
    setActiveTab(tab);
    setFilterParam(param);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Edit Task Handler (Strictly Admin & Leader)
  const handleEditTask = (task: Task) => {
    if (!isAdmin && !isLeader) {
      alert('Chỉ có Admin và Lãnh đạo mới có quyền chỉnh sửa nhiệm vụ.');
      return;
    }
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  // Delete Task Handler (Strictly Admin & Leader)
  const handleDeleteTask = (task: Task) => {
    if (!isAdmin && !isLeader) {
      alert('Chỉ có Admin và Lãnh đạo mới có quyền xóa nhiệm vụ.');
      return;
    }
    setConfirmDelete({
      isOpen: true,
      title: 'Xóa nhiệm vụ',
      message: `Bạn có chắc chắn muốn xóa nhiệm vụ [${task.code}] "${task.name}"?`,
      onConfirm: async () => {
        try {
          await deleteTask(task.id, task.code);
        } catch (err: any) {
          console.error('Delete task error:', err);
          alert(`Không thể xóa nhiệm vụ: ${err?.message || 'Lỗi hệ thống'}`);
        }
      },
    });
  };

  // Edit Dossier Handler (Only Admin, Leader, or assigned officer)
  const handleEditDossier = (dossier: Dossier) => {
    if (!canEditDossier(dossier)) {
      alert(`Bạn không có quyền chỉnh sửa hồ sơ của cán bộ ${dossier.handlerName || 'khác'}. Chỉ Admin, Lãnh đạo hoặc cán bộ trực tiếp thụ lý mới được phép thao tác.`);
      return;
    }
    setDossierToEdit(dossier);
    setIsDossierModalOpen(true);
  };

  // Delete Dossier Handler (Only Admin, Leader, or assigned officer)
  const handleDeleteDossier = (dossier: Dossier) => {
    if (!canDeleteDossier(dossier)) {
      alert(`Bạn không có quyền xóa hồ sơ của cán bộ ${dossier.handlerName || 'khác'}. Chỉ Admin, Lãnh đạo hoặc cán bộ trực tiếp thụ lý mới được phép xóa.`);
      return;
    }
    setConfirmDelete({
      isOpen: true,
      title: 'Xóa hồ sơ đất đai',
      message: `Bạn có chắc chắn muốn xóa hồ sơ [${dossier.code}] của chủ hộ "${dossier.owner}"?`,
      onConfirm: async () => {
        try {
          await deleteDossier(dossier.id, dossier.code);
        } catch (err: any) {
          console.error('Delete dossier error:', err);
          alert(`Không thể xóa hồ sơ: ${err?.message || 'Lỗi hệ thống'}`);
        }
      },
    });
  };

  // Delete Calendar Event Handler
  const handleDeleteEvent = (event: CalendarEvent) => {
    if (!canModifyRecord(event)) {
      alert('Bạn không có quyền xóa lịch công tác của cán bộ khác.');
      return;
    }
    setConfirmDelete({
      isOpen: true,
      title: 'Xóa lịch công tác / Deadline',
      message: `Bạn có chắc chắn muốn xóa lịch "${event.name}"?`,
      onConfirm: async () => {
        try {
          await apiService.deleteCalendarEvent(event.id);
        } catch (err: any) {
          console.error('Delete event error:', err);
          alert(`Không thể xóa lịch: ${err?.message || 'Lỗi hệ thống'}`);
        } finally {
          refreshData();
        }
      },
    });
  };

  // Delete Book Record Handler
  const handleDeleteBook = (book: RegisterBook) => {
    if (!canModifyRecord(book)) {
      alert('Bạn không có quyền xóa mục sổ theo dõi của cán bộ khác.');
      return;
    }
    setConfirmDelete({
      isOpen: true,
      title: 'Xóa mục sổ theo dõi',
      message: `Bạn có chắc chắn muốn xóa bản ghi số "${book.bookNumber}" trong ${book.type}?`,
      onConfirm: async () => {
        try {
          await apiService.deleteRegisterBook(book.id);
        } catch (err: any) {
          console.error('Delete register book error:', err);
          alert(`Không thể xóa mục sổ: ${err?.message || 'Lỗi hệ thống'}`);
        } finally {
          refreshData();
        }
      },
    });
  };

  // Delete Document Handler
  const handleDeleteDocument = (doc: DocumentItem) => {
    if (!canModifyRecord(doc)) {
      alert('Bạn không có quyền xóa văn bản của cán bộ khác.');
      return;
    }
    setConfirmDelete({
      isOpen: true,
      title: 'Xóa văn bản',
      message: `Bạn có chắc chắn muốn xóa văn bản số "${doc.number}" - ${doc.title}?`,
      onConfirm: async () => {
        try {
          await apiService.deleteDocument(doc.id);
        } catch (err: any) {
          console.error('Delete document error:', err);
          alert(`Không thể xóa văn bản: ${err?.message || 'Lỗi hệ thống'}`);
        } finally {
          refreshData();
        }
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-semibold text-slate-300">Đang khởi tạo hệ thống quản lý...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Suspense fallback={<PageLoadingFallback message="Đang khởi tạo giao diện đăng nhập..." />}>
        <LoginPage />
      </Suspense>
    );
  }

  return (
    <div className="flex h-screen w-full bg-slate-100/80 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans overflow-hidden antialiased flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        isSidebarCollapsed={isSidebarCollapsed}
        onNavigate={handleNavigate}
        onToggleSidebar={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => handleNavigate(tab)}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          onOpen={() => setIsMobileMenuOpen(true)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebarCollapse}
        />

        {/* Main Content Area */}
        <div
          className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-200 ${
            isSidebarCollapsed ? 'lg:pl-[64px]' : 'lg:pl-[232px]'
          }`}
        >
          <main className="flex-1 overflow-y-auto p-2 sm:p-3 pb-16 lg:pb-4 bg-slate-100/80 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
            <div className="w-full max-w-[1600px] mx-auto space-y-3 px-0.5 sm:px-1">
              <ModuleErrorBoundary key={activeTab}>
                <Suspense fallback={<PageLoadingFallback />}>
                {activeTab === 'dashboard' && (
                  <DashboardPage
                    onNavigate={handleNavigate}
                    onOpenTaskModal={() => {
                      setTaskToEdit(null);
                      setIsTaskModalOpen(true);
                    }}
                    onOpenDossierModal={() => {
                      setDossierToEdit(null);
                      setIsDossierModalOpen(true);
                    }}
                    onOpenCalendarModal={() => {
                      setEventToEdit(null);
                      setIsCalendarModalOpen(true);
                    }}
                    onOpenDocModal={() => {
                      setDocToEdit(null);
                      setIsDocModalOpen(true);
                    }}
                  />
                )}

                {activeTab === 'tasks' && (
                  <TasksPage
                    initialFilter={filterParam}
                    onOpenCreate={() => {
                      setTaskToEdit(null);
                      setIsTaskModalOpen(true);
                    }}
                    onOpenEdit={handleEditTask}
                    onOpenDetail={(task) => setTaskToDetail(task)}
                    onDeleteTask={handleDeleteTask}
                    onOpenTelegramConfig={() => setIsTelegramModalOpen(true)}
                    onTriggerAlert={(task) => {
                      setQuickAlertData({
                        isOpen: true,
                        targetType: 'task',
                        targetId: task.id,
                        targetCode: task.code,
                        targetTitle: task.name,
                        dueDate: task.dueDate,
                        assigneeId: task.assigneeId,
                        assigneeName: task.assigneeName,
                      });
                    }}
                  />
                )}

                {activeTab === 'dossiers' && (
                  <DossiersPage
                    initialFilter={filterParam}
                    onOpenCreate={() => {
                      setDossierToEdit(null);
                      setIsDossierModalOpen(true);
                    }}
                    onOpenEdit={handleEditDossier}
                    onDeleteDossier={handleDeleteDossier}
                    onOpenViewer={(att) => setViewingAttachment(att)}
                    onOpenTelegramConfig={() => setIsTelegramModalOpen(true)}
                    onTriggerAlert={(dos) => {
                      setQuickAlertData({
                        isOpen: true,
                        targetType: 'dossier',
                        targetId: dos.id,
                        targetCode: dos.code,
                        targetTitle: `Hồ sơ ${dos.procedure} - Chủ hộ ${dos.owner} (Thửa ${dos.parcel}, TBĐ ${dos.mapSheet})`,
                        dueDate: dos.dueDate,
                        assigneeId: dos.handlerId,
                        assigneeName: dos.handlerName,
                      });
                    }}
                  />
                )}

                {activeTab === 'publicLand' && <PublicLandPage />}

                {activeTab === 'violations' && <ViolationsPage />}

                {activeTab === 'disputes' && <DisputesPage />}

                {activeTab === 'projects' && <ProjectsPage />}

                {activeTab === 'alerts' && <SmartAlertsPage initialSubTab={alertsInitialSubTab} />}

                {activeTab === 'calendar' && (
                  <CalendarPage
                    onOpenCreate={() => {
                      setEventToEdit(null);
                      setIsCalendarModalOpen(true);
                    }}
                    onOpenEdit={(event) => {
                      if (!canModifyRecord(event)) {
                        alert('Bạn không có quyền chỉnh sửa lịch công tác của cán bộ khác.');
                        return;
                      }
                      setEventToEdit(event);
                      setIsCalendarModalOpen(true);
                    }}
                    onDeleteEvent={handleDeleteEvent}
                  />
                )}

                {activeTab === 'registerBooks' && (
                  <RegisterBooksPage
                    onOpenCreate={(preferredType) => {
                      setBookToEdit(null);
                      setDefaultBookType(preferredType);
                      setIsBookModalOpen(true);
                    }}
                    onOpenEdit={(book) => {
                      if (!canModifyRecord(book)) {
                        alert('Bạn không có quyền chỉnh sửa mục sổ theo dõi của cán bộ khác.');
                        return;
                      }
                      setBookToEdit(book);
                      setIsBookModalOpen(true);
                    }}
                    onDeleteBook={handleDeleteBook}
                  />
                )}

                {activeTab === 'documents' && (
                  <DocumentsPage
                    onOpenCreate={() => {
                      setDocToEdit(null);
                      setIsDocModalOpen(true);
                    }}
                    onOpenEdit={(doc) => {
                      if (!canModifyRecord(doc)) {
                        alert('Bạn không có quyền chỉnh sửa văn bản của cán bộ khác.');
                        return;
                      }
                      setDocToEdit(doc);
                      setIsDocModalOpen(true);
                    }}
                    onDeleteDocument={handleDeleteDocument}
                    onViewAttachment={(att) => setViewingAttachment(att)}
                  />
                )}

                {activeTab === 'reports' && <ReportsPage />}

                {activeTab === 'activityLogs' && <ActivityLogsPage />}

                {activeTab === 'users' && (
                  <UsersPage onOpenEditUser={(u) => setUserToEdit(u)} />
                )}

                {activeTab === 'settings' && (
                  <SettingsPage
                    onNavigateToAlerts={(subTab) => {
                      setAlertsInitialSubTab((subTab as any) || 'config');
                      setActiveTab('alerts');
                    }}
                  />
                )}
                </Suspense>
              </ModuleErrorBoundary>
            </div>
          </main>
        </div>
      </div>

      {/* Global Modals - Lazy loaded only when opened */}
      <ModuleErrorBoundary>
        <Suspense fallback={null}>
        {isTaskModalOpen && (
          <TaskModal
            isOpen={isTaskModalOpen}
            onClose={() => setIsTaskModalOpen(false)}
            taskToEdit={taskToEdit}
            onSuccess={() => {
              setIsTaskModalOpen(false);
              refreshData();
            }}
          />
        )}

        {taskToDetail && (
          <TaskDetailModal
            onClose={() => setTaskToDetail(null)}
            task={taskToDetail}
            onEdit={(t) => {
              setTaskToDetail(null);
              handleEditTask(t);
            }}
            onDelete={(t) => {
              setTaskToDetail(null);
              handleDeleteTask(t);
            }}
            onRefresh={refreshData}
          />
        )}

        {isDossierModalOpen && (
          <DossierModal
            isOpen={isDossierModalOpen}
            onClose={() => setIsDossierModalOpen(false)}
            dossierToEdit={dossierToEdit}
            onSuccess={() => {
              setIsDossierModalOpen(false);
              refreshData();
            }}
          />
        )}

        {isCalendarModalOpen && (
          <CalendarModal
            isOpen={isCalendarModalOpen}
            onClose={() => setIsCalendarModalOpen(false)}
            eventToEdit={eventToEdit}
            onSuccess={() => {
              setIsCalendarModalOpen(false);
              refreshData();
            }}
          />
        )}

        {isBookModalOpen && (
          <RegisterBookModal
            isOpen={isBookModalOpen}
            onClose={() => setIsBookModalOpen(false)}
            bookToEdit={bookToEdit}
            defaultType={defaultBookType as any}
            onSuccess={() => {
              setIsBookModalOpen(false);
              refreshData();
            }}
          />
        )}

        {isDocModalOpen && (
          <DocumentModal
            isOpen={isDocModalOpen}
            onClose={() => setIsDocModalOpen(false)}
            docToEdit={docToEdit}
            onSuccess={() => {
              setIsDocModalOpen(false);
              refreshData();
            }}
          />
        )}

        {userToEdit && (
          <UserEditModal
            isOpen={!!userToEdit}
            onClose={() => setUserToEdit(null)}
            userToEdit={userToEdit}
            onSuccess={() => {
              setUserToEdit(null);
              refreshData();
            }}
          />
        )}

        {viewingAttachment && (
          <DocumentViewerModal
            isOpen={!!viewingAttachment}
            onClose={() => setViewingAttachment(null)}
            attachment={viewingAttachment}
          />
        )}

        {quickAlertData?.isOpen && (
          <QuickAlertModal
            isOpen={true}
            onClose={() => setQuickAlertData(null)}
            targetType={quickAlertData.targetType}
            targetId={quickAlertData.targetId}
            targetCode={quickAlertData.targetCode}
            targetTitle={quickAlertData.targetTitle}
            dueDate={quickAlertData.dueDate}
            assigneeId={quickAlertData.assigneeId}
            assigneeName={quickAlertData.assigneeName}
          />
        )}

        {isTelegramModalOpen && (
          <TelegramConfigModal
            isOpen={isTelegramModalOpen}
            onClose={() => setIsTelegramModalOpen(false)}
            onNavigateToAlertsPage={() => {
              setIsTelegramModalOpen(false);
              setAlertsInitialSubTab('config');
              setActiveTab('alerts');
            }}
          />
        )}
        </Suspense>
      </ModuleErrorBoundary>

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title={confirmDelete.title}
        message={confirmDelete.message}
        onConfirm={confirmDelete.onConfirm}
        onClose={() => setConfirmDelete((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RealtimeProvider>
          <AppContent />
        </RealtimeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
