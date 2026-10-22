import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Send,
  MessageSquare,
  Mail,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Zap,
  CheckCheck,
  UserCheck,
  Calendar,
  Layers,
  Settings,
  HelpCircle,
  Megaphone,
  Loader2,
} from 'lucide-react';
import { useRealtime } from '../contexts/RealtimeContext';
import { useAuth } from '../contexts/AuthContext';
import { apiService, isAbortError } from '../services/api';
import { AlertChannel, AlertConfig, AlertMessageLog, PendingAlertItem } from '../types';
import { QuickAlertModal } from '../components/alerts/QuickAlertModal';
import { formatDateTime } from '../utils/date';

interface SmartAlertsPageProps {
  initialSubTab?: 'pending' | 'logs' | 'config';
}

const DEFAULT_ALERT_CONFIG: AlertConfig = {
  enabledChannels: {
    system: true,
    telegram: true,
    zalo: true,
    email: false,
    sms: false,
  },
  warningDaysBefore: [20, 15, 10, 7, 5, 3, 1],
  autoScanIntervalHours: 1,
  autoScanScheduleText: '2 lần/ngày: Đầu giờ sáng (07:30) & Đầu giờ chiều (13:30)',
  zaloOa: {
    oaId: '',
    secretKey: '',
    templateId: '',
    enabled: true,
  },
  telegram: {
    botToken: '',
    chatIdDefault: '',
    groupName: 'Nhóm Điều hành Phòng Kinh tế & Đất đai',
    enabled: true,
  },
  emailSmtp: {
    host: '',
    port: 587,
    senderEmail: '',
    senderName: 'Phòng Kinh tế',
    enabled: false,
  },
  smsGateway: {
    provider: 'vnpt',
    senderBrand: 'UBND',
    enabled: false,
  },
  templates: {
    taskWarning: '⚠️ [NHẮC HẠN NHIỆM VỤ] {title} - Hạn: {dueDate}',
    dossierWarning: '⚠️ [CẢNH BÁO HỒ SƠ] Mã: {code} - Hạn: {dueDate}',
    urgentAlert: '🚨 [CHỈ ĐẠO KHẨN] {title}',
    overdueAlert: '🔴 [QUÁ HẠN XỬ LÝ] {title}',
  },
};

export const SmartAlertsPage: React.FC<SmartAlertsPageProps> = ({ initialSubTab = 'pending' }) => {
  const { user, isAdmin, isLeader } = useAuth();
  const { settings, users, refreshData } = useRealtime();

  // Active Tab: 'pending' | 'logs' | 'config'
  const [activeTab, setActiveTab] = useState<'pending' | 'logs' | 'config'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Pending alerts state
  const [pendingItems, setPendingItems] = useState<PendingAlertItem[]>([]);
  const [pendingSearch, setPendingSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'task' | 'dossier'>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'warning_5_7' | 'critical' | 'overdue'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  // Logs state
  const [logs, setLogs] = useState<AlertMessageLog[]>([]);
  const [logChannelFilter, setLogChannelFilter] = useState<string>('all');
  const [logSearch, setLogSearch] = useState('');

  // Config state
  const [config, setConfig] = useState<AlertConfig>(settings?.alertConfig || DEFAULT_ALERT_CONFIG);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Status & Loading state
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const isScanningRef = useRef(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Quick Modal state
  const [quickAlertTarget, setQuickAlertTarget] = useState<PendingAlertItem | null>(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isConfirmClearLogsModalOpen, setIsConfirmClearLogsModalOpen] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const isClearingLogsRef = useRef(false);
  const [sendingItemIds, setSendingItemIds] = useState<Record<string, boolean>>({});
  const sendingItemIdsRef = useRef<Set<string>>(new Set());
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const deletingLogIdRef = useRef<Set<string>>(new Set());
  const isSavingConfigRef = useRef(false);
  const isTestingChannelRef = useRef(false);

  // Test Channel Modal state
  const [testModal, setTestModal] = useState<{
    isOpen: boolean;
    channel: AlertChannel;
    recipient: string;
    message: string;
    botToken?: string;
    chatId?: string;
    isTesting: boolean;
    result: string | null;
  }>({
    isOpen: false,
    channel: 'telegram',
    recipient: '',
    message: '',
    botToken: '',
    chatId: '',
    isTesting: false,
    result: null,
  });

  const loadData = async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      const [pendingRes, logsRes] = await Promise.all([
        apiService.getPendingAlerts(signal),
        apiService.getAlertLogs(undefined, signal),
      ]);
      setPendingItems(pendingRes || []);
      setLogs(logsRes || []);
    } catch (err: any) {
      if (!isAbortError(err)) {
        console.error('Error loading alert data:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const abortCtrl = new AbortController();
    loadData(abortCtrl.signal);
    return () => {
      abortCtrl.abort();
    };
  }, []);

  // Sync config from settings only if config is not dirty or null
  useEffect(() => {
    if (settings?.alertConfig && (!config || !isDirty)) {
      setConfig(settings.alertConfig);
    }
  }, [settings, isDirty]);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Helper to update config and track dirty state
  const updateConfig = (newConfig: AlertConfig) => {
    setConfig(newConfig);
    setIsDirty(true);
  };

  // Run Manual Scan & Auto Alert
  const handleTriggerScan = async (force: boolean = false) => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    try {
      setIsScanning(true);
      const res = await apiService.scanAndSendAlerts(force);
      showToast('success', res.message || 'Đã hoàn tất quét và gửi cảnh báo thành công!');
      await loadData();
      refreshData();
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi kích hoạt quét cảnh báo');
    } finally {
      isScanningRef.current = false;
      setIsScanning(false);
    }
  };

  // Send Direct Alert 1-click for a pending item
  const handleDirectSendOneItem = async (item: PendingAlertItem, channel?: AlertChannel) => {
    const lockKey = `${item.id}-${channel || 'all'}`;
    if (sendingItemIdsRef.current.has(lockKey) || sendingItemIds[lockKey]) return;

    sendingItemIdsRef.current.add(lockKey);
    try {
      setSendingItemIds((prev) => ({ ...prev, [lockKey]: true }));
      const channelsToSend = channel ? [channel] : (['zalo', 'telegram', 'email', 'sms'] as AlertChannel[]);
      const res = await apiService.sendDirectAlert({
        targetType: item.type,
        targetId: item.id,
        targetCode: item.code,
        recipientId: item.assigneeId,
        channels: channelsToSend,
        trigger: item.daysRemaining <= 7 && item.daysRemaining >= 5 ? 'deadline_5_days' : item.daysRemaining < 0 ? 'overdue' : 'manual_dispatch',
      });
      showToast('success', res.message || 'Đã gửi cảnh báo thành công!');
      await loadData();
      refreshData();
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi gửi cảnh báo');
    } finally {
      sendingItemIdsRef.current.delete(lockKey);
      setSendingItemIds((prev) => {
        const next = { ...prev };
        delete next[lockKey];
        return next;
      });
    }
  };

  // Save Channel Configuration
  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!config) return;
    if (isSavingConfigRef.current) return;
    isSavingConfigRef.current = true;
    try {
      setIsSavingConfig(true);
      const res = await apiService.updateAlertConfig(config);
      setIsDirty(false);
      showToast('success', res.message || 'Đã lưu cấu hình Bot Token & Chat ID thành công!');
      refreshData();
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi khi lưu cấu hình');
    } finally {
      isSavingConfigRef.current = false;
      setIsSavingConfig(false);
    }
  };

  // Handle Channel Test
  const handleRunChannelTest = async () => {
    if (isTestingChannelRef.current) return;
    isTestingChannelRef.current = true;
    try {
      setTestModal((prev) => ({ ...prev, isTesting: true, result: null }));
      const res = await apiService.testAlertChannel({
        channel: testModal.channel,
        testRecipient: testModal.recipient,
        testMessage: testModal.message,
        botToken: testModal.channel === 'telegram' ? (testModal.botToken || config?.telegram?.botToken) : undefined,
        chatId: testModal.channel === 'telegram' ? (testModal.recipient || config?.telegram?.chatIdDefault) : undefined,
      });
      setTestModal((prev) => ({
        ...prev,
        isTesting: false,
        result: res.message || (res.success ? '✅ Kiểm tra thành công!' : '❌ Thất bại'),
      }));
      await loadData();
      refreshData();
    } catch (err: any) {
      setTestModal((prev) => ({
        ...prev,
        isTesting: false,
        result: `❌ Lỗi: ${err.message || 'Không thể kết nối'}`,
      }));
    } finally {
      isTestingChannelRef.current = false;
    }
  };

  // Open Test Modal
  const openTestModal = (channel: AlertChannel) => {
    let defaultContact = '';
    if (channel === 'zalo') defaultContact = '0968489024';
    else if (channel === 'telegram') defaultContact = config?.telegram.chatIdDefault || '-1002345678901';
    else if (channel === 'email') defaultContact = 'vudvh@danang.gov.vn';
    else if (channel === 'sms') defaultContact = '0968489024';

    setTestModal({
      isOpen: true,
      channel,
      recipient: defaultContact,
      botToken: config?.telegram?.botToken || '',
      chatId: config?.telegram?.chatIdDefault || '',
      message: `🔔 [KIỂM TRA TỰ ĐỘNG] Thử nghiệm thông báo nhắc việc kênh ${channel.toUpperCase()} - Phòng Kinh tế - UBND xã Lãnh Ngọc.`,
      isTesting: false,
      result: null,
    });
  };

  // Filter pending items
  const filteredPending = pendingItems.filter((item) => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (urgencyFilter !== 'all' && item.urgency !== urgencyFilter) return false;
    if (assigneeFilter !== 'all' && item.assigneeId !== assigneeFilter) return false;
    if (pendingSearch.trim()) {
      const q = pendingSearch.toLowerCase();
      return (
        item.code.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.assigneeName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (logChannelFilter !== 'all' && log.channel !== logChannelFilter) return false;
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase();
      return (
        log.title.toLowerCase().includes(q) ||
        log.content.toLowerCase().includes(q) ||
        log.recipientName.toLowerCase().includes(q) ||
        log.targetCode.toLowerCase().includes(q) ||
        log.recipientContact.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // KPI Calculations
  const countWarning5to7 = pendingItems.filter((p) => p.daysRemaining >= 5 && p.daysRemaining <= 7).length;
  const countCritical = pendingItems.filter((p) => p.daysRemaining >= 0 && p.daysRemaining < 5).length;
  const countOverdue = pendingItems.filter((p) => p.daysRemaining < 0).length;
  const countLogs = logs.length;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 border transition-all animate-in slide-in-from-bottom-5 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : toastMessage.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500'
              : 'bg-blue-600 text-white border-blue-500'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Hệ thống Thông minh 4.0
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
            Cảnh báo Thông minh & Tương tác Đa Kênh
          </h1>
          <p className="text-sm text-slate-300 mt-1 max-w-2xl">
            Tự động phát hiện và gửi thông báo nhắc việc qua <b className="text-white">Zalo OA</b>,{' '}
            <b className="text-white">Telegram Bot</b>, <b className="text-white">Email Công vụ</b> và{' '}
            <b className="text-white">SMS</b> cho cán bộ trước khi hồ sơ/nhiệm vụ bị trễ hạn 5-7 ngày.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => handleTriggerScan(false)}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold text-sm shadow-md transition disabled:opacity-50 cursor-pointer"
            title="Quét các hồ sơ 5-7 ngày và gửi thông báo tự động"
          >
            <Zap className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Đang quét tự động...' : 'Quét & Nhắc việc tự động'}</span>
          </button>

          <button
            onClick={() => setIsBroadcastModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl font-semibold text-sm transition border border-indigo-400/30 cursor-pointer"
          >
            <Megaphone className="w-4 h-4" />
            <span>Phát cảnh báo khẩn</span>
          </button>

          <button
            onClick={() => loadData()}
            disabled={isLoading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition border border-slate-700 cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Warning 5-7 Days */}
        <div
          onClick={() => {
            setActiveTab('pending');
            setUrgencyFilter('warning_5_7');
          }}
          className="p-4 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 rounded-2xl shadow-xs hover:shadow-md transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              Sắp đến hạn (5-7 Ngày)
            </div>
            <div className="text-3xl font-extrabold text-amber-700 dark:text-amber-300 mt-1">
              {countWarning5to7}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tự động nhắc qua Zalo/Email
            </div>
          </div>
          <div className="p-3 bg-amber-100 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Critical <= 3 Days */}
        <div
          onClick={() => {
            setActiveTab('pending');
            setUrgencyFilter('critical');
          }}
          className="p-4 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900/50 rounded-2xl shadow-xs hover:shadow-md transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
              Khẩn cấp (≤ 3 Ngày)
            </div>
            <div className="text-3xl font-extrabold text-orange-700 dark:text-orange-300 mt-1">
              {countCritical}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ưu tiên xử lý hỏa tốc
            </div>
          </div>
          <div className="p-3 bg-orange-100 dark:bg-orange-950/60 rounded-xl text-orange-600 dark:text-orange-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Overdue */}
        <div
          onClick={() => {
            setActiveTab('pending');
            setUrgencyFilter('overdue');
          }}
          className="p-4 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 rounded-2xl shadow-xs hover:shadow-md transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Đã Quá Hạn
            </div>
            <div className="text-3xl font-extrabold text-rose-700 dark:text-rose-400 mt-1">
              {countOverdue}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Cần báo cáo giải trình
            </div>
          </div>
          <div className="p-3 bg-rose-100 dark:bg-rose-950/60 rounded-xl text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Alert Logs */}
        <div
          onClick={() => setActiveTab('logs')}
          className="p-4 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/50 rounded-2xl shadow-xs hover:shadow-md transition cursor-pointer flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Nhật ký Tin Đã Gửi
            </div>
            <div className="text-3xl font-extrabold text-blue-700 dark:text-blue-300 mt-1">
              {countLogs}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Zalo, Telegram, SMS, Email
            </div>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-950/60 rounded-xl text-blue-600 dark:text-blue-400">
            <Send className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Hồ sơ & Nhiệm vụ Cần Cảnh báo</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {pendingItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'logs'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Nhật ký Gửi Cảnh báo</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {logs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'config'
              ? 'border-sky-500 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Send className="w-4 h-4 text-sky-500" />
          <span>Cấu hình Nhắc việc & Kênh (Tele/Zalo)</span>
        </button>
      </div>

      {/* TAB 1: PENDING ALERTS */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã hồ sơ, tên nhiệm vụ, cán bộ..."
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="all">Tất cả loại (Nhiệm vụ + Hồ sơ)</option>
              <option value="task">Chỉ Nhiệm vụ</option>
              <option value="dossier">Chỉ Hồ sơ đất đai</option>
            </select>

            {/* Urgency Filter */}
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value as any)}
              className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="all">Tất cả mức độ hạn</option>
              <option value="warning_5_7">🟡 Sắp đến hạn (5 - 7 ngày)</option>
              <option value="critical">🟠 Khẩn cấp (≤ 3 ngày)</option>
              <option value="overdue">🔴 Đã quá hạn</option>
            </select>

            {/* Assignee Filter */}
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="all">Tất cả cán bộ phụ trách</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Pending List Table / Cards */}
          {filteredPending.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <CheckCheck className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                Không có hồ sơ/nhiệm vụ nào cần cảnh báo trễ hạn
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Tất cả hồ sơ đất đai và nhiệm vụ được phân công đều đang trong tiến độ an toàn hoặc đã hoàn thành.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Mã & Nội dung</th>
                      <th className="px-4 py-3">Loại</th>
                      <th className="px-4 py-3">Cán bộ thụ lý</th>
                      <th className="px-4 py-3">Hạn chót & Đếm ngược</th>
                      <th className="px-4 py-3">Lần cảnh báo gần nhất</th>
                      <th className="px-4 py-3 text-right">Phát cảnh báo tức thì</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPending.map((item) => {
                      const isOverdue = item.daysRemaining < 0;
                      const is5to7 = item.daysRemaining >= 5 && item.daysRemaining <= 7;
                      const isCritical = item.daysRemaining >= 0 && item.daysRemaining < 5;

                      return (
                        <tr
                          key={`${item.type}_${item.id}`}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                        >
                          {/* Code & Title */}
                          <td className="px-4 py-3.5 max-w-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                {item.code}
                              </span>
                            </div>
                            <div className="font-medium text-slate-800 dark:text-slate-200 mt-1 line-clamp-2">
                              {item.title}
                            </div>
                          </td>

                          {/* Type */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                item.type === 'task'
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              }`}
                            >
                              {item.type === 'task' ? 'Nhiệm vụ' : 'Hồ sơ đất đai'}
                            </span>
                          </td>

                          {/* Assignee */}
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.assigneeName}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {item.assigneePhone && <span>📞 {item.assigneePhone}</span>}
                              {item.scope && <span>📍 {item.scope}</span>}
                            </div>
                          </td>

                          {/* Due Date & Countdown */}
                          <td className="px-4 py-3.5">
                            <div className="text-xs text-slate-600 dark:text-slate-400">
                              Hạn: <b className="text-slate-800 dark:text-slate-200">{item.dueDate}</b>
                            </div>
                            <div className="mt-1">
                              {isOverdue ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse">
                                  <AlertTriangle className="w-3 h-3" />
                                  QUÁ HẠN {Math.abs(item.daysRemaining)} NGÀY
                                </span>
                              ) : is5to7 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  <Clock className="w-3 h-3" />
                                  CÒN {item.daysRemaining} NGÀY (CẢNH BÁO)
                                </span>
                              ) : isCritical ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-950/70 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                                  <AlertTriangle className="w-3 h-3" />
                                  GẤP: CÒN {item.daysRemaining} NGÀY
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  Còn {item.daysRemaining} ngày
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Last Alert */}
                          <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400">
                            {item.lastAlertSentAt ? (
                              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{formatDateTime(item.lastAlertSentAt)}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Chưa phát tin</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* 1-click Quick Alert Modal */}
                              <button
                                onClick={() => setQuickAlertTarget(item)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                                title="Mở tùy chỉnh gửi cảnh báo đa kênh"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Gửi Đa Kênh</span>
                              </button>

                              {/* Direct Zalo OA 1-click */}
                              <button
                                onClick={() => handleDirectSendOneItem(item, 'zalo')}
                                disabled={sendingItemIds[`${item.id}-zalo`]}
                                className="p-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-800 flex items-center gap-1"
                                title="Bắn tin cảnh báo Zalo OA"
                              >
                                {sendingItemIds[`${item.id}-zalo`] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Zalo'}
                              </button>

                              {/* Direct Telegram 1-click */}
                              <button
                                onClick={() => handleDirectSendOneItem(item, 'telegram')}
                                disabled={sendingItemIds[`${item.id}-telegram`]}
                                className="p-1.5 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed text-sky-700 dark:text-sky-300 rounded-lg text-xs font-bold border border-sky-200 dark:border-sky-800 flex items-center gap-1"
                                title="Phát tin vào nhóm Telegram"
                              >
                                {sendingItemIds[`${item.id}-telegram`] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Tele'}
                              </button>

                              {/* Open Zalo Chat direct */}
                              {item.assigneePhone && (
                                <a
                                  href={`https://zalo.me/${item.assigneePhone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs transition"
                                  title="Mở Zalo cá nhân"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
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
      )}

      {/* TAB 2: ALERT LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm nội dung, cán bộ, mã đối tượng..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <select
                value={logChannelFilter}
                onChange={(e) => setLogChannelFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
              >
                <option value="all">Tất cả kênh phát tin</option>
                <option value="zalo">Zalo OA</option>
                <option value="telegram">Telegram Bot</option>
                <option value="email">Email công vụ</option>
                <option value="sms">SMS Brandname</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsConfirmClearLogsModalOpen(true)}
                disabled={logs.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-800 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa toàn bộ nhật ký</span>
              </button>
            </div>
          </div>

          {/* Logs List */}
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <Layers className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                Chưa có nhật ký cảnh báo nào
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Các thông báo được gửi qua Zalo, Telegram, Email hoặc SMS sẽ được lưu vết tại đây.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Thời gian</th>
                      <th className="px-4 py-3">Kênh</th>
                      <th className="px-4 py-3">Người nhận</th>
                      <th className="px-4 py-3">Đối tượng</th>
                      <th className="px-4 py-3">Nội dung thông báo</th>
                      <th className="px-4 py-3">Trạng thái & Phản hồi</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition text-xs"
                      >
                        {/* Time */}
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatDateTime(log.sentAt)}
                        </td>

                        {/* Channel */}
                        <td className="px-4 py-3">
                          {log.channel === 'zalo' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                              Zalo OA
                            </span>
                          )}
                          {log.channel === 'telegram' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                              Telegram
                            </span>
                          )}
                          {log.channel === 'email' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                              Email
                            </span>
                          )}
                          {log.channel === 'sms' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                              SMS
                            </span>
                          )}
                          {log.channel === 'system' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                              Hệ thống
                            </span>
                          )}
                        </td>

                        {/* Recipient */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {log.recipientName}
                          </div>
                          <div className="text-slate-400 font-mono text-[11px]">{log.recipientContact}</div>
                        </td>

                        {/* Target */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                            {log.targetCode}
                          </span>
                        </td>

                        {/* Content */}
                        <td className="px-4 py-3 max-w-sm">
                          <div className="font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">
                            {log.title}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                            {log.content.replace(/<[^>]*>?/gm, '')}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Đã phát</span>
                          </div>
                          {log.responseNote && (
                            <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {log.responseNote}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={async () => {
                              if (deletingLogIdRef.current.has(log.id) || deletingLogId === log.id) return;
                              deletingLogIdRef.current.add(log.id);
                              try {
                                setDeletingLogId(log.id);
                                await apiService.deleteAlertLog(log.id);
                                setLogs((prev) => prev.filter((l) => l.id !== log.id));
                                showToast('success', 'Đã xóa bản ghi nhật ký.');
                              } catch {
                                showToast('error', 'Không thể xóa bản ghi nhật ký.');
                              } finally {
                                deletingLogIdRef.current.delete(log.id);
                                setDeletingLogId(null);
                              }
                            }}
                            disabled={deletingLogId === log.id}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                            title="Xóa bản ghi này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CHANNEL CONFIGURATION & TEMPLATES */}
      {activeTab === 'config' && config && (
        <form onSubmit={handleSaveConfig} className="space-y-6">
          {/* Unsaved Changes Banner */}
          {isDirty && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm font-semibold">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>Bạn vừa thay đổi cấu hình (Nhắc hạn / Bot Token / Chat ID). Hãy bấm <b>"Lưu cấu hình"</b> để áp dụng ngay!</span>
              </div>
              <button
                type="button"
                onClick={() => handleSaveConfig()}
                disabled={isSavingConfig}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition shadow-xs cursor-pointer"
              >
                {isSavingConfig ? 'Đang lưu...' : '💾 Lưu cấu hình ngay'}
              </button>
            </div>
          )}

          {/* Master Scheduler & 20-Day Warning Rule Card */}
          <div className="p-6 bg-linear-to-r from-blue-50 via-indigo-50/40 to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 border border-blue-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Lịch Trình Quét & Phát Tin Cảnh Báo Tự Động
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Nhắc hạn <b>hàng ngày liên tục</b> trong suốt <b>20 ngày trước hạn</b> — Tần suất <b>2 lần/ngày</b> vào đầu mỗi buổi làm việc hành chính
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTriggerScan(true)}
                  disabled={isScanning}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? 'Đang quét tự động...' : 'Kích hoạt quét & Phát tin ngay'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Card 1: 20-Day Scan Rule */}
              <div className="p-4 bg-white dark:bg-slate-800/90 rounded-xl border border-blue-100 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-xs">
                  <Bell className="w-4 h-4" />
                  <span>Khung nhắc hạn hàng ngày</span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  20 <span className="text-sm font-semibold text-slate-500">ngày liên tục</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Nhắc nhở mỗi ngày từ: <b>20, 19, 18, 17, 16, 15, ..., 2, 1 ngày</b>, trong ngày và <b>Quá hạn</b>.
                </p>
              </div>

              {/* Card 2: Morning Window */}
              <div className="p-4 bg-white dark:bg-slate-800/90 rounded-xl border border-blue-100 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                  <Clock className="w-4 h-4" />
                  <span>Đợt 1: Đầu giờ sáng</span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  07:30 – 08:30
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Phát tin đầu ngày giúp cán bộ, chuyên viên nắm bắt danh sách việc cần giải quyết trong ngày.
                </p>
              </div>

              {/* Card 3: Afternoon Window */}
              <div className="p-4 bg-white dark:bg-slate-800/90 rounded-xl border border-blue-100 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                  <Clock className="w-4 h-4" />
                  <span>Đợt 2: Đầu giờ chiều</span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  13:30 – 14:30
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Đôn đốc tiến độ buổi chiều đối với các hồ sơ sắp đến hạn và nhiệm vụ chỉ đạo khẩn cấp.
                </p>
              </div>
            </div>
          </div>

          {/* Channel Switches & API Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Zalo OA Box */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                    Z
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Zalo Official Account (OA)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Gửi tin ZNS & Nhắc việc trực tiếp qua Zalo cán bộ
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enabledChannels.zalo}
                    onChange={(e) =>
                      updateConfig({
                        ...config,
                        enabledChannels: { ...config.enabledChannels, zalo: e.target.checked },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Zalo OA ID
                  </label>
                  <input
                    type="text"
                    value={config.zaloOa.oaId}
                    onChange={(e) =>
                      updateConfig({
                        ...config,
                        zaloOa: { ...config.zaloOa, oaId: e.target.value },
                      })
                    }
                    placeholder="Nhập OA ID từ trang quản trị Zalo"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mã mẫu thông báo (Template ID)
                  </label>
                  <input
                    type="text"
                    value={config.zaloOa.templateId}
                    onChange={(e) =>
                      updateConfig({
                        ...config,
                        zaloOa: { ...config.zaloOa, templateId: e.target.value },
                      })
                    }
                    placeholder="Nhập mã mẫu tin ZNS"
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => openTestModal('zalo')}
                  className="w-full py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-xl border border-blue-200 dark:border-blue-800 transition cursor-pointer"
                >
                  🧪 Kiểm tra thử gửi tin Zalo OA
                </button>
              </div>
            </div>

            {/* Telegram Bot Box */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Telegram Bot điều hành</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Bắn tin tức thì vào Nhóm điều hành Phòng Kinh tế
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enabledChannels.telegram}
                    onChange={(e) =>
                      updateConfig({
                        ...config,
                        enabledChannels: { ...config.enabledChannels, telegram: e.target.checked },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-sky-500"></div>
                </label>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Telegram Bot Token (từ @BotFather)
                  </label>
                  <input
                    type="text"
                    value={config.telegram.botToken}
                    onChange={(e) =>
                      updateConfig({
                        ...config,
                        telegram: { ...config.telegram, botToken: e.target.value },
                      })
                    }
                    placeholder="VD: 7891234567:AAHxyz_kQ..."
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Group Chat ID mặc định (Bắt đầu bằng dấu trừ -)
                  </label>
                  <input
                    type="text"
                    value={config.telegram.chatIdDefault}
                    onChange={(e) =>
                      updateConfig({
                        ...config,
                        telegram: { ...config.telegram, chatIdDefault: e.target.value },
                      })
                    }
                    placeholder="VD: -1002345678901 hoặc -987654321"
                    className="w-full px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openTestModal('telegram')}
                    className="flex-1 py-2 text-xs font-semibold text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50 rounded-xl border border-sky-200 dark:border-sky-800 transition cursor-pointer"
                  >
                    🧪 Kiểm tra thử gửi tin Telegram
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveConfig()}
                    disabled={isSavingConfig}
                    className="px-3 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Lưu Bot
                  </button>
                </div>
              </div>
            </div>

            {/* Email SMTP Box */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Email Công vụ (SMTP)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Gửi thư điện tử nhắc việc chuẩn văn bản hành chính
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enabledChannels.email}
                    onChange={(e) =>
                      updateConfig({
                        ...config,
                        enabledChannels: { ...config.enabledChannels, email: e.target.checked },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={config.emailSmtp.host}
                      onChange={(e) =>
                        updateConfig({
                          ...config,
                          emailSmtp: { ...config.emailSmtp, host: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Port
                    </label>
                    <input
                      type="number"
                      value={config.emailSmtp.port}
                      onChange={(e) =>
                        updateConfig({
                          ...config,
                          emailSmtp: { ...config.emailSmtp, port: Number(e.target.value) },
                        })
                      }
                      className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email người gửi công vụ
                  </label>
                  <input
                    type="text"
                    value={config.emailSmtp.senderEmail}
                    onChange={(e) =>
                      updateConfig({
                        ...config,
                        emailSmtp: { ...config.emailSmtp, senderEmail: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => openTestModal('email')}
                  className="w-full py-2 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-xl border border-amber-200 dark:border-amber-800 transition cursor-pointer"
                >
                  🧪 Kiểm tra thử gửi Email
                </button>
              </div>
            </div>

            {/* SMS Brandname Box */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">SMS Brandname Cổng dịch vụ</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tin nhắn SMS khẩn cấp trực tiếp tới điện thoại
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enabledChannels.sms}
                    onChange={(e) =>
                      updateConfig({
                        ...config,
                        enabledChannels: { ...config.enabledChannels, sms: e.target.checked },
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nhà cung cấp Gateway
                  </label>
                  <input
                    type="text"
                    value={config.smsGateway.provider}
                    onChange={(e) =>
                      updateConfig({
                        ...config,
                        smsGateway: { ...config.smsGateway, provider: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên Brandname (Định danh)
                  </label>
                  <input
                    type="text"
                    value={config.smsGateway.senderBrand}
                    onChange={(e) =>
                      updateConfig({
                        ...config,
                        smsGateway: { ...config.smsGateway, senderBrand: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => openTestModal('sms')}
                  className="w-full py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                >
                  🧪 Kiểm tra thử gửi SMS
                </button>
              </div>
            </div>
          </div>

          {/* Template Customizer */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">
                Mẫu Tin Nhắn Cảnh Báo Tự Động (Templates)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Các tham số tự động thay thế:{' '}
                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">
                  {'{ten_can_bo}'}
                </code>
                ,{' '}
                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">
                  {'{ma_cong_viec}'}
                </code>
                ,{' '}
                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">
                  {'{ten_cong_viec}'}
                </code>
                ,{' '}
                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">
                  {'{han_xu_ly}'}
                </code>
                ,{' '}
                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">
                  {'{so_ngay_con_lai}'}
                </code>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Task Warning Template */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mẫu nhắc việc trước 5-7 ngày (Nhiệm vụ)
                </label>
                <textarea
                  rows={3}
                  value={config.templates.taskWarning}
                  onChange={(e) =>
                    updateConfig({
                      ...config,
                      templates: { ...config.templates, taskWarning: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white resize-none"
                />
              </div>

              {/* Dossier Warning Template */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mẫu nhắc việc trước 5-7 ngày (Hồ sơ đất đai)
                </label>
                <textarea
                  rows={3}
                  value={config.templates.dossierWarning}
                  onChange={(e) =>
                    updateConfig({
                      ...config,
                      templates: { ...config.templates, dossierWarning: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white resize-none"
                />
              </div>

              {/* Urgent Template */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mẫu nhiệm vụ hỏa tốc / khẩn cấp
                </label>
                <textarea
                  rows={3}
                  value={config.templates.urgentAlert}
                  onChange={(e) =>
                    updateConfig({
                      ...config,
                      templates: { ...config.templates, urgentAlert: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white resize-none"
                />
              </div>

              {/* Overdue Template */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mẫu cảnh báo quá hạn
                </label>
                <textarea
                  rows={3}
                  value={config.templates.overdueAlert}
                  onChange={(e) =>
                    updateConfig({
                      ...config,
                      templates: { ...config.templates, overdueAlert: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl dark:text-white resize-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingConfig}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSavingConfig ? 'Đang lưu cấu hình...' : 'Lưu cấu hình Kênh cảnh báo'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Quick Alert Modal for single item */}
      {quickAlertTarget && (
        <QuickAlertModal
          isOpen={true}
          onClose={() => {
            setQuickAlertTarget(null);
            loadData();
          }}
          targetType={quickAlertTarget.type}
          targetId={quickAlertTarget.id}
          targetCode={quickAlertTarget.code}
          targetTitle={quickAlertTarget.title}
          dueDate={quickAlertTarget.dueDate}
          assigneeId={quickAlertTarget.assigneeId}
          assigneeName={quickAlertTarget.assigneeName}
          assigneePhone={quickAlertTarget.assigneePhone}
          assigneeEmail={quickAlertTarget.assigneeEmail}
        />
      )}

      {/* Broadcast Modal */}
      {isBroadcastModalOpen && (
        <QuickAlertModal
          isOpen={true}
          onClose={() => {
            setIsBroadcastModalOpen(false);
            loadData();
          }}
          targetType="task"
          targetId="broadcast"
          targetCode="KHẨN-CẤP"
          targetTitle="Thông báo điều hành khẩn cấp toàn đơn vị"
        />
      )}

      {/* Channel Test Modal */}
      {testModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wider">
                Thử nghiệm gửi tin qua kênh {testModal.channel.toUpperCase()}
              </h3>
              <button
                onClick={() => setTestModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Địa chỉ / Số điện thoại / Chat ID nhận tin thử nghiệm
                </label>
                <input
                  type="text"
                  value={testModal.recipient}
                  onChange={(e) =>
                    setTestModal((prev) => ({ ...prev, recipient: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nội dung tin nhắn
                </label>
                <textarea
                  rows={3}
                  value={testModal.message}
                  onChange={(e) =>
                    setTestModal((prev) => ({ ...prev, message: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl dark:text-white resize-none"
                />
              </div>

              {testModal.result && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300">
                  {testModal.result}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTestModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleRunChannelTest}
                  disabled={testModal.isTesting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50"
                >
                  {testModal.isTesting ? 'Đang gửi...' : 'Gửi kiểm tra ngay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Clear All Alert Logs */}
      {isConfirmClearLogsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Dọn dẹp toàn bộ nhật ký cảnh báo?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Thao tác này sẽ xóa vĩnh viễn toàn bộ {logs.length} bản ghi phát tin cảnh báo Zalo, Telegram, Email, SMS.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isClearingLogs}
                onClick={() => setIsConfirmClearLogsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isClearingLogs}
                onClick={async () => {
                  if (isClearingLogsRef.current || isClearingLogs) return;
                  isClearingLogsRef.current = true;
                  try {
                    setIsClearingLogs(true);
                    await apiService.clearAlertLogs();
                    setLogs([]);
                    showToast('success', 'Đã dọn dẹp sạch toàn bộ nhật ký cảnh báo.');
                    setIsConfirmClearLogsModalOpen(false);
                  } catch {
                    showToast('error', 'Lỗi khi xóa nhật ký.');
                  } finally {
                    isClearingLogsRef.current = false;
                    setIsClearingLogs(false);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                {isClearingLogs && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isClearingLogs ? 'Đang xóa...' : 'Xác nhận xóa sạch'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
