import React, { useState, useEffect } from 'react';
import { useRealtime } from '../contexts/RealtimeContext';
import { useAuth } from '../contexts/AuthContext';
import { apiService, isAbortError } from '../services/api';
import { localVault } from '../services/localVault';
import { BackupFileItem } from '../types';
import { formatDate } from '../utils/date';
import { ConfirmModal } from '../components/common/ConfirmModal';
import {
  Settings,
  Building2,
  Database,
  Download,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Shield,
  ShieldCheck,
  Server,
  Clock,
  Save,
  RotateCcw,
  Trash2,
  FileCheck,
  HardDrive,
  FolderArchive,
  Search,
  X,
  Send,
  Eye,
  EyeOff,
  BellRing,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';

interface SettingsPageProps {
  onNavigateToAlerts?: (subTab?: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigateToAlerts }) => {
  const { settings, refreshData, isConnected } = useRealtime();
  const { user, isAdmin } = useAuth();

  const [unitName, setUnitName] = useState('');
  const [level, setLevel] = useState('');
  const [year, setYear] = useState(2026);
  const [address, setAddress] = useState('');
  const [deadlineWarningDays, setDeadlineWarningDays] = useState(20);
  const [autoNotifyDeadline, setAutoNotifyDeadline] = useState(true);

  // Telegram state
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramGroupName, setTelegramGroupName] = useState('');
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ success: boolean; note: string } | null>(null);
  const [showTelegramGuide, setShowTelegramGuide] = useState(false);

  // Firebase state
  const [firebaseApiKey, setFirebaseApiKey] = useState('');
  const [firebaseProjectId, setFirebaseProjectId] = useState('');
  const [firebaseAppId, setFirebaseAppId] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // In-app Backup & Restore state
  const [backups, setBackups] = useState<BackupFileItem[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [backupNote, setBackupNote] = useState('');
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [restoringFilename, setRestoringFilename] = useState<string | null>(null);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);

  // In-app Confirm Modal State
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => Promise<void> | void;
  } | null>(null);

  const loadBackups = async (signal?: AbortSignal) => {
    try {
      setLoadingBackups(true);
      const list = await apiService.getBackupList(signal);
      setBackups(list || []);
    } catch (err: any) {
      if (!isAbortError(err)) {
        console.error('Lỗi khi tải danh sách sao lưu:', err);
      }
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    const abortCtrl = new AbortController();
    loadBackups(abortCtrl.signal);
    return () => {
      abortCtrl.abort();
    };
  }, []);

  useEffect(() => {
    if (settings) {
      setUnitName(settings.unitName || 'Phòng Kinh tế – UBND xã Lãnh Ngọc');
      setLevel(settings.administrativeLevel || 'Cấp xã / Phường');
      setYear(settings.year || 2026);
      setAddress(settings.address || 'UBND xã Lãnh Ngọc, thành phố Đà Nẵng');
      setDeadlineWarningDays(settings.deadlineWarningDays || 20);
      setAutoNotifyDeadline(settings.autoNotifyDeadline !== false);
      setFirebaseApiKey(settings.firebaseApiKey || '');
      setFirebaseProjectId(settings.firebaseProjectId || '');
      setFirebaseAppId(settings.firebaseAppId || '');

      if (settings.alertConfig) {
        setTelegramEnabled(settings.alertConfig.enabledChannels?.telegram !== false);
        setTelegramBotToken(settings.alertConfig.telegram?.botToken || '');
        setTelegramChatId(settings.alertConfig.telegram?.chatIdDefault || '');
        setTelegramGroupName(settings.alertConfig.telegram?.groupName || 'Nhóm Điều hành Phòng Kinh tế');
      }
    }
  }, [settings]);

  const handleSaveUnitInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setMsg(null);
      await apiService.updateSettings({
        unitName,
        administrativeLevel: level,
        year,
        address,
        deadlineWarningDays,
        autoNotifyDeadline,
        firebaseApiKey,
        firebaseProjectId,
        firebaseAppId,
      });

      // Also save alertConfig if available
      if (settings?.alertConfig) {
        await apiService.updateAlertConfig({
          ...settings.alertConfig,
          enabledChannels: {
            ...settings.alertConfig.enabledChannels,
            telegram: telegramEnabled,
          },
          telegram: {
            ...settings.alertConfig.telegram,
            botToken: telegramBotToken.trim(),
            chatIdDefault: telegramChatId.trim(),
            groupName: telegramGroupName.trim() || 'Nhóm Điều hành Phòng Kinh tế',
          },
        });
      }

      setMsg({ type: 'success', text: 'Cập nhật cấu hình đơn vị, nhắc hạn và Telegram Bot thành công!' });
      refreshData();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi khi lưu cấu hình' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramBotToken.trim() || !telegramChatId.trim()) {
      setTelegramTestResult({
        success: false,
        note: 'Vui lòng nhập Telegram Bot Token và Chat ID trước khi gửi tin kiểm tra!',
      });
      return;
    }

    try {
      setIsTestingTelegram(true);
      setTelegramTestResult(null);
      const res = await apiService.testAlertChannel({
        channel: 'telegram',
        botToken: telegramBotToken.trim(),
        chatId: telegramChatId.trim(),
        testMessage: `🔔 KIỂM TRA KẾT NỐI TELEGRAM THÀNH CÔNG TỪ TRANG THIẾT LẬP!\n\n• Cơ quan: ${unitName}\n• Thời gian: ${new Date().toLocaleString('vi-VN')}\n• Tự động nhắc hạn: 20 ngày trước hạn (07:30 & 13:30 hằng ngày)\n• Trạng thái: Kênh nhắc việc Telegram hoạt động tốt!`,
      });

      if (res && res.success) {
        setTelegramTestResult({
          success: true,
          note: res.log?.responseNote || res.message || 'Đã gửi tin nhắn Telegram thành công!',
        });
      } else {
        setTelegramTestResult({
          success: false,
          note: res.log?.responseNote || res.message || 'Gửi tin nhắn Telegram không thành công.',
        });
      }
    } catch (err: any) {
      setTelegramTestResult({
        success: false,
        note: 'Lỗi gửi tin thử nghiệm: ' + (err.message || 'Kiểm tra lại token và Chat ID'),
      });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleTestFirebase = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await apiService.testFirebase({
        apiKey: firebaseApiKey,
        projectId: firebaseProjectId,
        appId: firebaseAppId,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Lỗi kiểm tra kết nối' });
    } finally {
      setIsTesting(false);
    }
  };

  // Integrity Audit state & handlers
  const [integrityReport, setIntegrityReport] = useState<any>(null);
  const [isAuditingIntegrity, setIsAuditingIntegrity] = useState(false);
  const [isRepairingIntegrity, setIsRepairingIntegrity] = useState(false);

  const handleCheckIntegrity = async () => {
    try {
      setIsAuditingIntegrity(true);
      const rep = await apiService.checkDataIntegrity();
      setIntegrityReport(rep);
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Lỗi kiểm tra tính toàn vẹn: ' + (err?.message || err) });
    } finally {
      setIsAuditingIntegrity(false);
    }
  };

  const handleRepairIntegrity = async () => {
    try {
      setIsRepairingIntegrity(true);
      const res = await apiService.repairDataIntegrity();
      setIntegrityReport(res.report);
      setMsg({ type: 'success', text: res.message || 'Đã đồng bộ và khắc phục toàn vẹn dữ liệu!' });
      refreshData();
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Lỗi khi đồng bộ dữ liệu: ' + (err?.message || err) });
    } finally {
      setIsRepairingIntegrity(false);
    }
  };

  // Create in-app server snapshot
  const handleCreateInAppBackup = async () => {
    try {
      setIsCreatingBackup(true);
      setMsg(null);
      const result = await apiService.createInAppBackup(backupNote.trim());
      setBackupNote('');
      setMsg({ type: 'success', text: `Tạo bản sao lưu trên ứng dụng thành công: ${result.filename}` });
      await loadBackups();
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Lỗi khi tạo bản sao lưu: ' + (err.message || 'Thất bại') });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Restore in-app snapshot directly with ConfirmModal
  const handleRestoreInApp = (item: BackupFileItem) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Xác nhận khôi phục cơ sở dữ liệu',
      message: `Khôi phục dữ liệu từ bản sao lưu "${item.filename}" sẽ ghi đè toàn bộ dữ liệu hiện tại theo phiên bản đã lưu. Bạn có chắc chắn muốn tiếp tục?`,
      confirmText: 'Khôi phục ngay',
      cancelText: 'Hủy bỏ',
      isDanger: false,
      onConfirm: async () => {
        try {
          setRestoringFilename(item.filename);
          setMsg(null);
          const res = await apiService.restoreInAppBackup(item.filename);
          localVault.clearDeletedDossierTombstones();
          setMsg({ type: 'success', text: res.message || 'Khôi phục dữ liệu trên ứng dụng thành công!' });
          refreshData();
          await loadBackups();
        } catch (err: any) {
          setMsg({ type: 'error', text: 'Lỗi khôi phục: ' + (err.message || 'Thao tác khôi phục thất bại') });
        } finally {
          setRestoringFilename(null);
        }
      },
    });
  };

  // Delete in-app snapshot with ConfirmModal
  const handleDeleteInApp = (item: BackupFileItem) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Xác nhận xóa bản sao lưu',
      message: `Bạn có chắc chắn muốn xóa vĩnh viễn tệp sao lưu "${item.filename}" khỏi máy chủ? Thao tác này không thể hoàn tác.`,
      confirmText: 'Xóa bản sao lưu',
      cancelText: 'Hủy bỏ',
      isDanger: true,
      onConfirm: async () => {
        try {
          setDeletingFilename(item.filename);
          setMsg(null);
          const res = await apiService.deleteInAppBackup(item.filename);
          setMsg({ type: 'success', text: res.message || `Đã xóa bản sao lưu ${item.filename} thành công.` });
          await loadBackups();
        } catch (err: any) {
          setMsg({ type: 'error', text: 'Lỗi khi xóa: ' + (err.message || 'Thao tác xóa thất bại') });
        } finally {
          setDeletingFilename(null);
        }
      },
    });
  };

  const handleDownloadBackup = async () => {
    try {
      const data = await apiService.exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QLCV_DatDai_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMsg({ type: 'success', text: 'Đã xuất tệp sao lưu JSON thành công.' });
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Lỗi tải tệp sao lưu: ' + err.message });
    }
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConfirmModalConfig({
      isOpen: true,
      title: 'Xác nhận nạp dữ liệu từ tệp JSON',
      message: `Khôi phục từ tệp "${file.name}" sẽ ghi đè toàn bộ cơ sở dữ liệu hiện tại trên hệ thống. Bạn có chắc chắn muốn tiếp tục?`,
      confirmText: 'Nạp & Khôi phục',
      cancelText: 'Hủy bỏ',
      isDanger: false,
      onConfirm: async () => {
        try {
          // Read file using Promise
          const text = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.onerror = () => reject(new Error('Không thể đọc nội dung tệp tin.'));
            reader.readAsText(file);
          });

          const parsed = JSON.parse(text);
          await apiService.restoreBackup(parsed);
          localVault.clearDeletedDossierTombstones();
          setMsg({ type: 'success', text: 'Khôi phục dữ liệu từ tệp JSON thành công!' });
          await refreshData();
          await loadBackups();
        } catch (err: any) {
          setMsg({ type: 'error', text: 'Lỗi khôi phục tệp sao lưu: ' + (err.message || 'Không hợp lệ') });
        }
      },
    });
    e.target.value = '';
  };

  const handleResetSampleData = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Tái tạo dữ liệu chuẩn mẫu',
      message: 'Hệ thống sẽ nạp lại toàn bộ dữ liệu mẫu hành chính ban đầu của xã Lãnh Ngọc. Dữ liệu hiện tại sẽ được tái tạo theo chuẩn. Bạn có chắc chắn?',
      confirmText: 'Tái tạo dữ liệu mẫu',
      cancelText: 'Hủy bỏ',
      isDanger: true,
      onConfirm: async () => {
        try {
          setIsResetting(true);
          setMsg(null);
          const res = await apiService.resetSampleData();
          localVault.clearDeletedDossierTombstones();
          setMsg({ type: 'success', text: res.message || 'Đã nạp lại dữ liệu mẫu thành công!' });
          refreshData();
          await loadBackups();
        } catch (err: any) {
          setMsg({ type: 'error', text: 'Lỗi nạp dữ liệu mẫu: ' + (err.message || 'Thất bại') });
        } finally {
          setIsResetting(false);
        }
      },
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-4 pb-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Thiết lập & Cấu hình Hệ thống</h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 uppercase">
              Quản trị đơn vị
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Thông tin đơn vị hành chính, kết nối máy chủ đồng bộ thời gian thực và quản lý sao lưu dữ liệu.
          </p>
        </div>

        {/* Realtime Status Indicator & Version */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs">
            <span className="text-blue-700 dark:text-blue-300 font-bold text-[11px]">
              Phiên bản 1.0 (v1.0)
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
              {isConnected ? 'Máy chủ trực tuyến' : 'Mất kết nối'}
            </span>
          </div>
        </div>
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2 shadow-xs transition-all ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />}
            <span className="font-medium">{msg.text}</span>
          </div>
          <button
            onClick={() => setMsg(null)}
            className="p-1 rounded-md hover:bg-black/5 text-slate-500 hover:text-slate-700 cursor-pointer"
            title="Đóng thông báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Form: Thông tin đơn vị */}
      <form onSubmit={handleSaveUnitInfo} className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs space-y-3.5 text-xs">
        <div className="flex items-center gap-2 pb-2.5 border-b border-gray-200">
          <Building2 className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-900">Thông tin Đơn vị Hành chính</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-slate-700 mb-1 text-xs">Tên Đơn vị / Phòng ban</label>
            <input
              type="text"
              required
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1 text-xs">Cấp hành chính</label>
            <input
              type="text"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1 text-xs">Năm công tác</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || 2026)}
              className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1 text-xs">Địa chỉ trụ sở</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs"
            />
          </div>
        </div>

        {/* Deadline Warning & Auto-Scheduler Config */}
        <div className="pt-3.5 border-t border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-xs">Cấu hình Quét & Nhắc hạn Công việc Tự động</h3>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoNotifyDeadline}
                onChange={(e) => setAutoNotifyDeadline(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-2 text-xs font-semibold text-slate-700">Tự động phát tin cảnh báo</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
            <div>
              <label className="block font-semibold text-slate-800 mb-1 text-xs">
                Số ngày bắt đầu quét nhắc trước hạn (Mặc định: 20 ngày)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={deadlineWarningDays}
                  onChange={(e) => setDeadlineWarningDays(parseInt(e.target.value) || 20)}
                  className="w-24 bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                />
                <span className="text-xs font-semibold text-slate-600">ngày trước hạn</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Tất cả nhiệm vụ và hồ sơ có thời hạn trong vòng <b>{deadlineWarningDays} ngày</b> sẽ được nhắc việc liên tục mỗi ngày (20, 19, 18, 17, 16, 15, ..., 2, 1 ngày) cho đến khi hoàn thành.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1 text-xs">
                Tần suất phát tin tự động mỗi ngày
              </label>
              <div className="bg-white p-2.5 rounded-lg border border-blue-200 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs">
                  <span>⏰ 2 lần / ngày (Đầu giờ hành chính)</span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <p>• <b>Buổi sáng:</b> 07:30 – 08:30 (Đầu giờ làm việc sáng)</p>
                  <p>• <b>Buổi chiều:</b> 13:30 – 14:30 (Đầu giờ làm việc chiều)</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Telegram Reminder & Bot Integration */}
        <div className="pt-3.5 border-t border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0">
                <Send className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-xs">Cấu hình Nhắc việc qua Telegram Bot điều hành</h3>
                <p className="text-[11px] text-slate-500">Tự động bắn tin cảnh báo công việc & hồ sơ đến hạn vào nhóm Telegram của cơ quan</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={telegramEnabled}
                onChange={(e) => setTelegramEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
              <span className="ml-2 text-xs font-semibold text-slate-700">Kích hoạt Telegram</span>
            </label>
          </div>

          <div className="bg-sky-50/40 p-3.5 rounded-xl border border-sky-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-800 text-xs">
                    Telegram Bot Token <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTelegramGuide(!showTelegramGuide)}
                    className="text-[10px] text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Cách lấy Token?</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showTelegramToken ? 'text' : 'password'}
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    placeholder="VD: 7891234567:AAHxyz_kQ1234..."
                    className="w-full bg-white border border-sky-200 rounded-lg px-2.5 py-1.5 pr-8 text-slate-800 font-mono focus:ring-2 focus:ring-sky-500 outline-none text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTelegramToken(!showTelegramToken)}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showTelegramToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Token bí mật từ <b>@BotFather</b> khi tạo bot trên Telegram</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1 text-xs">
                  Chat ID Nhóm Telegram (Bắt đầu bằng dấu trừ -) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="VD: -1002345678901 hoặc -987654321"
                  className="w-full bg-white border border-sky-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-mono focus:ring-2 focus:ring-sky-500 outline-none text-xs"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">Lấy từ bot <b>@userinfobot</b> hoặc <b>@RawDataBot</b> khi thêm vào nhóm</p>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-800 mb-1 text-xs">
                  Tên Nhóm Điều hành hiển thị
                </label>
                <input
                  type="text"
                  value={telegramGroupName}
                  onChange={(e) => setTelegramGroupName(e.target.value)}
                  placeholder="VD: Nhóm Điều hành Phòng Kinh tế & Đất đai Xã Lãnh Ngọc"
                  className="w-full bg-white border border-sky-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-sky-500 outline-none text-xs"
                />
              </div>
            </div>

            {/* Test button & guide */}
            <div className="pt-2 border-t border-sky-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={isTestingTelegram || !telegramBotToken || !telegramChatId}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <Send className={`w-3.5 h-3.5 ${isTestingTelegram ? 'animate-spin' : ''}`} />
                  <span>{isTestingTelegram ? 'Đang gửi thử...' : '🧪 Kiểm tra gửi tin Telegram'}</span>
                </button>

                {onNavigateToAlerts && (
                  <button
                    type="button"
                    onClick={() => onNavigateToAlerts('config')}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-sky-50 text-sky-700 font-semibold text-xs border border-sky-200 flex items-center gap-1 cursor-pointer"
                  >
                    <BellRing className="w-3.5 h-3.5 text-sky-500" />
                    <span>Mở Trung tâm Điều hành Cảnh báo</span>
                  </button>
                )}
              </div>

              {telegramTestResult && (
                <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border ${
                  telegramTestResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-rose-50 border-rose-300 text-rose-700'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{telegramTestResult.note}</span>
                </div>
              )}
            </div>

            {showTelegramGuide && (
              <div className="mt-2 p-2.5 bg-white rounded-lg border border-sky-200 text-[11px] text-slate-600 space-y-1.5">
                <p className="font-bold text-slate-800">📌 3 bước kết nối Telegram Bot nhanh:</p>
                <p>1. Mở Telegram, tìm <b>@BotFather</b> gõ lệnh <code>/newbot</code>, đặt tên bot và lấy mã <b>Token</b>.</p>
                <p>2. Thêm Bot vào nhóm chat công vụ và nâng quyền Bot làm <b>Quản trị viên (Admin)</b> của nhóm.</p>
                <p>3. Thêm tạm <b>@userinfobot</b> vào nhóm để lấy <b>Chat ID</b> (số âm, vd: <code>-1002345678901</code>) rồi dán vào ô trên.</p>
              </div>
            )}
          </div>
        </div>

        {/* Firebase Config (Optional Cloud Sync) */}
        <div className="pt-3 border-t border-gray-200 space-y-2.5">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-xs">Cấu hình Đám mây Firebase Firestore (Tùy chọn mở rộng)</h3>
          </div>
          <p className="text-slate-500 text-[11px]">
            Hệ thống hiện đang chạy trên máy chủ tập trung (Centralized Server DB) với cơ chế đồng bộ Server-Sent Events (SSE). Bạn có thể cấu hình thêm Firebase project nếu cần đồng bộ Firestore.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block font-medium text-slate-600 mb-1 text-[11px]">Firebase Project ID</label>
              <input
                type="text"
                value={firebaseProjectId}
                onChange={(e) => setFirebaseProjectId(e.target.value)}
                placeholder="qlcv-datdai-12345"
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1 text-[11px]">API Key</label>
              <input
                type="text"
                value={firebaseApiKey}
                onChange={(e) => setFirebaseApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1 text-[11px]">App ID</label>
              <input
                type="text"
                value={firebaseAppId}
                onChange={(e) => setFirebaseAppId(e.target.value)}
                placeholder="1:12345:web:..."
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleTestFirebase}
              disabled={isTesting}
              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-gray-300"
            >
              <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
              Kiểm tra kết nối Firebase
            </button>
            {testResult && (
              <span
                className={`text-[11px] font-semibold ${
                  testResult.success ? 'text-emerald-700' : 'text-amber-800'
                }`}
              >
                {testResult.message}
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold text-white shadow-xs transition-colors"
          >
            {isSaving ? 'Đang lưu...' : 'Lưu cấu hình hệ thống'}
          </button>
        </div>
      </form>

      {/* Backup & Restore Section */}
      <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-xs space-y-4 text-xs">
        <div className="flex items-center justify-between pb-2.5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">Sao lưu, Khôi phục & Quản trị Dữ liệu</h2>
          </div>
          <button
            onClick={() => loadBackups()}
            disabled={loadingBackups}
            className="p-1 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-gray-100 flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
            title="Làm mới danh sách bản sao lưu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingBackups ? 'animate-spin' : ''}`} />
            <span>Làm mới danh sách</span>
          </button>
        </div>

        {/* 0. KIỂM TRA TÍNH TOÀN VẸN CƠ SỞ DỮ LIỆU ĐA TẦNG */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 border border-blue-200 space-y-3.5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                  Kiểm tra Tính Toàn vẹn Dữ liệu Đa tầng (Data Integrity Audit)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Đối soát tính toàn vẹn và đồng bộ giữa: RAM Máy chủ ↔ File Ổ đĩa (db.json) ↔ Google Cloud Firestore
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {integrityReport && integrityReport.overallStatus === 'HEALTHY' && (
                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Toàn vẹn 100%
                </span>
              )}
              {integrityReport && integrityReport.overallStatus === 'WARNING' && (
                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Cần đồng bộ
                </span>
              )}
              <button
                onClick={handleCheckIntegrity}
                disabled={isAuditingIntegrity}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold text-white text-xs flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAuditingIntegrity ? 'animate-spin' : ''}`} />
                <span>{isAuditingIntegrity ? 'Đang quét...' : 'Kiểm tra ngay'}</span>
              </button>
            </div>
          </div>

          {integrityReport && (
            <div className="space-y-3 pt-2 border-t border-blue-100">
              {/* Grid of collections */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {Object.entries(integrityReport.collections || {}).map(([key, col]: [string, any]) => (
                  <div
                    key={key}
                    className={`p-2.5 rounded-lg border bg-white flex flex-col justify-between ${
                      col.status === 'HEALTHY'
                        ? 'border-emerald-200'
                        : col.status === 'WARNING'
                        ? 'border-amber-200 bg-amber-50/30'
                        : 'border-red-200 bg-red-50/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800 truncate" title={col.name}>
                        {col.name}
                      </span>
                      {col.status === 'HEALTHY' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-baseline justify-between text-[11px] text-slate-500">
                      <span>Bản ghi:</span>
                      <span className="font-bold text-slate-900">{col.memoryCount}</span>
                    </div>
                    <div className="flex items-baseline justify-between text-[10px] text-slate-400">
                      <span>Đám mây / Ổ đĩa:</span>
                      <span>{col.cloudCount} / {col.diskCount}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Status footer / repair button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                <div className="text-slate-600">
                  <span className="font-bold text-slate-800">Kết quả đối soát: </span>
                  {integrityReport.recommendations?.[0] || 'Dữ liệu toàn vẹn.'}
                </div>
                {integrityReport.overallStatus !== 'HEALTHY' && (
                  <button
                    onClick={handleRepairIntegrity}
                    disabled={isRepairingIntegrity}
                    className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRepairingIntegrity ? 'animate-spin' : ''}`} />
                    <span>{isRepairingIntegrity ? 'Đang khắc phục...' : 'Tự động sửa & Đồng bộ'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 1. TẠO BẢN SAO LƯU TRỰC TIẾP TRÊN ỨNG DỤNG (SERVER SNAPSHOT) */}
        <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-700" />
              <h3 className="font-bold text-emerald-900 text-xs">
                Sao lưu Dữ liệu Trực tiếp Trên Ứng dụng (Lưu trên Máy chủ)
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Khôi phục ngay 1 chạm
            </span>
          </div>
          <p className="text-slate-600 text-[11px]">
            Hệ thống sẽ tạo ngay một bản ảnh chụp (snapshot) toàn vẹn của cơ sở dữ liệu và lưu giữ an toàn trên máy chủ. Khi cần, bạn chỉ cần bấm <b>"Khôi phục ngay"</b> để phục hồi dữ liệu lập tức mà không cần tìm file ngoài máy tính.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              value={backupNote}
              onChange={(e) => setBackupNote(e.target.value)}
              placeholder="Ghi chú bản sao lưu (VD: Trước khi cập nhật danh mục, Bàn giao cuối tháng...)"
              className="flex-1 w-full bg-white border border-emerald-300 rounded-lg px-3 py-1.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
            />
            <button
              onClick={handleCreateInAppBackup}
              disabled={isCreatingBackup}
              className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-xs flex items-center justify-center gap-1.5 text-xs shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isCreatingBackup ? 'Đang tạo bản sao lưu...' : 'Sao lưu ngay trên App'}</span>
            </button>
          </div>
        </div>

        {/* 2. DANH SÁCH CÁC BẢN SAO LƯU ĐÃ LƯU TRÊN ỨNG DỤNG */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
              <FolderArchive className="w-3.5 h-3.5 text-blue-600" />
              <span>Bản sao lưu có sẵn trên hệ thống ({backups.length})</span>
            </h4>
            <span className="text-[11px] text-slate-500">Tự động quét từ thư mục sao lưu</span>
          </div>

          {loadingBackups ? (
            <div className="p-6 text-center text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
              <p>Đang tải danh sách bản sao lưu...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-center text-slate-500 text-xs">
              Chưa có bản sao lưu nào được tạo trên máy chủ. Bấm "Sao lưu ngay trên App" ở trên để tạo bản sao lưu đầu tiên!
            </div>
          ) : (
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto max-h-[320px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-slate-600 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Tên tệp bản sao lưu</th>
                      <th className="py-2 px-3">Thời gian tạo</th>
                      <th className="py-2 px-3">Dung lượng</th>
                      <th className="py-2 px-3">Ghi chú</th>
                      <th className="py-2 px-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {backups.map((item) => {
                      const isRestoring = restoringFilename === item.filename;
                      const isDeleting = deletingFilename === item.filename;

                      return (
                        <tr key={item.filename} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-mono font-bold text-slate-800 text-[11px]">
                                {item.filename}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                            {item.createdAt ? formatDate(item.createdAt) : '—'}
                          </td>

                          <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                            {formatFileSize(item.size)}
                          </td>

                          <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate" title={item.note}>
                            {item.note ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-medium">
                                {item.note}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">Tự động tạo</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 1-click Restore */}
                              <button
                                onClick={() => handleRestoreInApp(item)}
                                disabled={isRestoring}
                                className="px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                                title="Khôi phục dữ liệu ngay từ bản này"
                              >
                                <RotateCcw className={`w-3 h-3 ${isRestoring ? 'animate-spin' : ''}`} />
                                <span>{isRestoring ? 'Đang nạp...' : 'Khôi phục ngay'}</span>
                              </button>

                              {/* Download file */}
                              <a
                                href={apiService.getBackupDownloadUrl(item.filename)}
                                download={item.filename}
                                className="p-1 rounded-md border border-gray-300 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                title="Tải tệp này về máy tính"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>

                              {/* Delete backup */}
                              <button
                                onClick={() => handleDeleteInApp(item)}
                                disabled={isDeleting}
                                className="p-1 rounded-md border border-gray-300 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Xóa tệp sao lưu này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 3. CÁC TÙY CHỌN TẢI VỀ MÁY TÍNH & NẠP TỆP JSON RỜI */}
        <div className="pt-2 border-t border-gray-200">
          <h4 className="font-bold text-slate-800 mb-2 text-xs">Các phương thức sao lưu ngoại tuyến khác:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Download Backup */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex flex-col justify-between space-y-2">
              <div>
                <h5 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  Xuất tệp JSON về máy tính
                </h5>
                <p className="text-slate-500 text-[11px]">Tải file JSON về lưu trữ trên USB/ổ cứng cá nhân.</p>
              </div>
              <button
                onClick={handleDownloadBackup}
                className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-xs text-xs cursor-pointer"
              >
                Tải tệp sao lưu (.json)
              </button>
            </div>

            {/* 2. Restore Backup from PC */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex flex-col justify-between space-y-2">
              <div>
                <h5 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  Nạp tệp JSON từ máy tính
                </h5>
                <p className="text-slate-500 text-[11px]">Chọn tệp .json từ máy tính để phục hồi dữ liệu.</p>
              </div>
              <label className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold text-white shadow-xs text-center cursor-pointer block text-xs">
                <span>Tìm tệp trên máy & Khôi phục</span>
                <input type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
              </label>
            </div>

            {/* 3. Reset Sample Data */}
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 flex flex-col justify-between space-y-2">
              <div>
                <h5 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                  Nạp lại dữ liệu chuẩn mẫu
                </h5>
                <p className="text-slate-500 text-[11px]">Tái tạo cơ sở dữ liệu về dữ liệu mẫu hành chính ban đầu.</p>
              </div>
              <button
                onClick={handleResetSampleData}
                disabled={isResetting}
                className="w-full py-1.5 rounded-lg bg-white hover:bg-gray-100 text-amber-800 border border-gray-300 font-bold text-xs cursor-pointer"
              >
                {isResetting ? 'Đang nạp...' : 'Tái tạo dữ liệu mẫu'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* In-App Confirmation Modal */}
      {confirmModalConfig && (
        <ConfirmModal
          isOpen={confirmModalConfig.isOpen}
          title={confirmModalConfig.title}
          message={confirmModalConfig.message}
          confirmText={confirmModalConfig.confirmText}
          cancelText={confirmModalConfig.cancelText}
          isDanger={confirmModalConfig.isDanger}
          onConfirm={confirmModalConfig.onConfirm}
          onCancel={() => setConfirmModalConfig(null)}
          onClose={() => setConfirmModalConfig(null)}
        />
      )}
    </div>
  );
};
