import React, { useState, useMemo, useEffect } from 'react';
import { ActivityLog, Dossier } from '../types';
import { useRealtime } from '../contexts/RealtimeContext';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/date';
import { exportToExcel } from '../utils/export';
import { apiService } from '../services/api';
import { localVault } from '../services/localVault';
import {
  Activity,
  Search,
  FileSpreadsheet,
  Calendar,
  User as UserIcon,
  Filter,
  Layers,
  Clock,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ArchiveRestore,
  Lock,
  ShieldCheck,
  FileText,
  Loader2,
} from 'lucide-react';

export const ActivityLogsPage: React.FC = () => {
  const { activityLogs, users, refreshData } = useRealtime();
  const { isAdmin, currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [isConfirmClearModalOpen, setIsConfirmClearModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Restore Modal State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [deletedDossiers, setDeletedDossiers] = useState<Dossier[]>([]);
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isRestoringAll, setIsRestoringAll] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadDeletedDossiers = async (signal?: AbortSignal) => {
    try {
      setIsLoadingDeleted(true);
      const res = await apiService.getDeletedDossiers(signal);
      setDeletedDossiers(res || []);
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) return;
      setDeletedDossiers([]);
    } finally {
      setIsLoadingDeleted(false);
    }
  };

  useEffect(() => {
    if (!isRestoreModalOpen) return;
    const abortController = new AbortController();
    loadDeletedDossiers(abortController.signal);
    return () => {
      abortController.abort();
    };
  }, [isRestoreModalOpen]);

  const handleRestoreSingleDossier = async (id: string, code: string) => {
    if (!isAdmin) {
      showToast('error', 'Chỉ Quản trị viên (Admin) mới có quyền khôi phục hồ sơ.');
      return;
    }
    try {
      setRestoringId(id);
      localVault.unmarkDossierDeleted(id, code);
      await apiService.restoreDeletedDossier(id);
      await refreshData();
      await loadDeletedDossiers();
      showToast('success', `Đã khôi phục thành công hồ sơ ${code}.`);
    } catch (err: any) {
      showToast('error', err?.message || 'Lỗi khi khôi phục hồ sơ.');
    } finally {
      setRestoringId(null);
    }
  };

  const handleRestoreAllDossiers = async () => {
    if (!isAdmin) {
      showToast('error', 'Chỉ Quản trị viên (Admin) mới có quyền khôi phục hồ sơ.');
      return;
    }
    if (isRestoringAll) return;
    try {
      setIsRestoringAll(true);
      deletedDossiers.forEach((d) => localVault.unmarkDossierDeleted(d.id, d.code));
      const res = await apiService.restoreAllDeletedDossiers();
      await refreshData();
      await loadDeletedDossiers();
      showToast('success', res.message || 'Đã khôi phục toàn bộ hồ sơ thành công.');
      setIsRestoreModalOpen(false);
    } catch (err: any) {
      showToast('error', err?.message || 'Lỗi khi khôi phục hồ sơ.');
    } finally {
      setIsRestoringAll(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = (log.description || '').toLowerCase().includes(q);
        const matchUser = (log.userName || '').toLowerCase().includes(q);
        if (!matchDesc && !matchUser) return false;
      }
      if (selectedModule !== 'all' && log.module !== selectedModule) return false;
      if (selectedUser !== 'all' && log.userId !== selectedUser) return false;
      return true;
    });
  }, [activityLogs, searchQuery, selectedModule, selectedUser]);

  const handleExport = () => {
    const data = filteredLogs.map((l) => ({
      'Thời gian': l.createdAt,
      'Cán bộ thực hiện': l.userName,
      'Phân hệ (Module)': l.module,
      'Hành động': l.action,
      'Chi tiết nhật ký': l.description,
    }));
    exportToExcel(data, `Nhat_ky_tac_nghiep_${new Date().toISOString().split('T')[0]}`);
  };

  const handleDeleteSingle = async (id: string) => {
    try {
      setDeletingId(id);
      await apiService.deleteActivityLog(id);
      await refreshData();
      showToast('success', 'Đã xóa bản ghi nhật ký.');
    } catch {
      showToast('error', 'Lỗi khi xóa bản ghi.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (isClearingAll) return;
    try {
      setIsClearingAll(true);
      await apiService.clearActivityLogs();
      await refreshData();
      showToast('success', 'Đã dọn dẹp sạch toàn bộ nhật ký tác nghiệp.');
      setIsConfirmClearModalOpen(false);
    } catch {
      showToast('error', 'Lỗi khi xóa toàn bộ nhật ký.');
    } finally {
      setIsClearingAll(false);
    }
  };

  const getModuleBadge = (mod: string) => {
    switch (mod) {
      case 'tasks':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Công việc</span>;
      case 'dossiers':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Hồ sơ đất</span>;
      case 'calendar':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Lịch & Deadline</span>;
      case 'books':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">Sổ theo dõi</span>;
      case 'documents':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">Văn bản</span>;
      case 'users':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">Cán bộ</span>;
      case 'settings':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">Cấu hình</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-slate-700 border border-gray-200">{mod}</span>;
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold text-white animate-fade-in ${
          toastMessage.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Nhật ký Tác nghiệp Hệ thống</h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 uppercase">
              {filteredLogs.length} sự kiện
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Lịch sử toàn bộ các thao tác tạo mới, phân công, báo cáo kết quả và sửa đổi của các cán bộ.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => {
              if (!isAdmin) {
                showToast('error', 'Chỉ Quản trị viên (Admin) mới có quyền truy cập kho khôi phục hồ sơ.');
                return;
              }
              setIsRestoreModalOpen(true);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border shadow-xs transition-colors cursor-pointer ${
              isAdmin
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200'
            }`}
            title={isAdmin ? "Mở kho khôi phục hồ sơ đã xóa" : "Chỉ Quản trị viên (Admin) mới có quyền truy cập và khôi phục hồ sơ"}
          >
            <ArchiveRestore className={`w-3.5 h-3.5 ${isAdmin ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Kho khôi phục hồ sơ</span>
            {isAdmin ? (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[9px] font-bold">Admin</span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                <Lock className="w-3 h-3" />
                <span>Khóa</span>
              </span>
            )}
          </button>

          <button
            onClick={handleExport}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-gray-300 shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={() => {
              if (!isAdmin) {
                showToast('error', 'Chỉ Quản trị viên (Admin) mới có quyền xóa toàn bộ nhật ký.');
                return;
              }
              setIsConfirmClearModalOpen(true);
            }}
            disabled={activityLogs.length === 0}
            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5 border border-rose-200 shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title={isAdmin ? "Xóa toàn bộ nhật ký" : "Chỉ Quản trị viên (Admin) mới có quyền xóa"}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Xóa toàn bộ nhật ký</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm nội dung hoạt động, cán bộ..."
              className="w-full bg-white border border-gray-300 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs"
            />
          </div>

          <div>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
            >
              <option value="all">Tất cả phân hệ (Modules)</option>
              <option value="tasks">Công việc & Nhiệm vụ</option>
              <option value="dossiers">Hồ sơ đất đai</option>
              <option value="calendar">Lịch & Deadline</option>
              <option value="books">Sổ theo dõi nghiệp vụ</option>
              <option value="documents">Văn bản đến/đi</option>
              <option value="users">Cán bộ & Phân quyền</option>
              <option value="settings">Thiết lập hệ thống</option>
            </select>
          </div>

          <div>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
            >
              <option value="all">Tất cả cán bộ thực hiện</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Timeline */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-xs overflow-hidden text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Thời gian</th>
                <th className="py-2.5 px-3">Cán bộ</th>
                <th className="py-2.5 px-3">Phân hệ</th>
                <th className="py-2.5 px-3">Hành động</th>
                <th className="py-2.5 px-3 min-w-[320px]">Nội dung chi tiết</th>
                <th className="py-2.5 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Không có bản ghi nhật ký nào.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">{log.userName}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{getModuleBadge(log.module)}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">{log.action}</td>
                    <td className="py-2.5 px-3 text-slate-700">{log.description}</td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {log.module === 'dossiers' && log.action === 'DELETE' && (
                          <button
                            onClick={() => {
                              if (!isAdmin) {
                                showToast('error', 'Chỉ Quản trị viên (Admin) mới có quyền khôi phục hồ sơ.');
                                return;
                              }
                              if (log.recordId) {
                                handleRestoreSingleDossier(log.recordId, log.recordCode || 'hồ sơ');
                              } else {
                                setIsRestoreModalOpen(true);
                              }
                            }}
                            disabled={restoringId === log.recordId}
                            className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer ${
                              isAdmin
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-xs'
                                : 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed'
                            }`}
                            title={isAdmin ? "Khôi phục hồ sơ này" : "Chỉ Quản trị viên (Admin) mới có quyền khôi phục"}
                          >
                            <RotateCcw className="w-3 h-3 text-emerald-600" />
                            <span>Khôi phục</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSingle(log.id)}
                          disabled={deletingId === log.id}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Xóa bản ghi này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Confirm Clear All Logs */}
      {isConfirmClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Xóa toàn bộ nhật ký tác nghiệp?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thao tác này sẽ dọn dẹp sạch toàn bộ {activityLogs.length} bản ghi lịch sử hoạt động tác nghiệp trong hệ thống.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmClearModalOpen(false)}
                disabled={isClearingAll}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isClearingAll}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                {isClearingAll && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isClearingAll ? 'Đang xóa...' : 'Xác nhận xóa sạch'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kho Khôi phục Hồ sơ Địa chính (Admin Only) */}
      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ArchiveRestore className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Kho Khôi phục Hồ sơ Địa chính</h3>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                      {deletedDossiers.length} hồ sơ đã xóa
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Danh sách các hồ sơ đất đai đã xóa có thể phục hồi lại đầy đủ thông tin vào hệ thống.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Permission Banner */}
            {!isAdmin ? (
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2.5 text-xs text-amber-900">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  <b>Giới hạn quyền hạn:</b> Bạn đang đăng nhập với quyền <b>{currentUser?.role || 'Cán bộ'}</b>. Chỉ có <b>Quản trị viên (Admin)</b> hoặc người được phân quyền quản trị tối cao mới có thẩm quyền khôi phục hồ sơ đã xóa.
                </span>
              </div>
            ) : (
              <div className="px-5 py-2.5 bg-emerald-50/80 border-b border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Bạn có toàn quyền <b>Quản trị viên (Admin)</b> để phục hồi hồ sơ an toàn vào hệ thống.</span>
                </div>
                {deletedDossiers.length > 0 && (
                  <button
                    onClick={handleRestoreAllDossiers}
                    disabled={isRestoringAll}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs transition cursor-pointer"
                  >
                    {isRestoringAll ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3 h-3" />
                    )}
                    <span>{isRestoringAll ? 'Đang khôi phục...' : `Khôi phục tất cả (${deletedDossiers.length})`}</span>
                  </button>
                )}
              </div>
            )}

            {/* List */}
            <div className="p-5 space-y-3 overflow-y-auto flex-1 text-xs">
              {isLoadingDeleted ? (
                <div className="py-12 text-center text-slate-400">Đang tải danh sách hồ sơ...</div>
              ) : deletedDossiers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <ArchiveRestore className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-600">Kho lưu trữ hồ sơ đã xóa hiện đang trống.</p>
                  <p className="text-[11px] text-slate-400">Không có hồ sơ nào bị xóa gần đây cần khôi phục.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                  {deletedDossiers.map((dos) => (
                    <div key={dos.id} className="p-3.5 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 transition">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-700 text-xs">{dos.code}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {dos.storageFolder || 'Kẹp 1'}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 text-sm truncate">{dos.owner}</div>
                        <div className="text-slate-500 text-[11px] flex items-center gap-3 flex-wrap">
                          <span>Thửa {dos.parcel}, TBĐ {dos.mapSheet}</span>
                          <span>•</span>
                          <span>Thủ tục: {dos.procedure}</span>
                          <span>•</span>
                          <span>Cán bộ phụ trách: {dos.handlerName || 'Chưa phân công'}</span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <button
                          onClick={() => handleRestoreSingleDossier(dos.id, dos.code)}
                          disabled={!isAdmin || restoringId === dos.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                            isAdmin
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          }`}
                          title={isAdmin ? "Khôi phục hồ sơ này" : "Chỉ Admin mới có quyền khôi phục"}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{restoringId === dos.id ? 'Đang khôi phục...' : 'Khôi phục'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-gray-200 flex items-center justify-end shrink-0">
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
