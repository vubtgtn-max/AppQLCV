import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Search,
  Menu,
  Wifi,
  WifiOff,
  RefreshCw,
  Check,
  CheckCheck,
  Trash2,
  Send,
  Megaphone,
  Calendar,
  AlertTriangle,
  FileText,
  UserCheck,
  LogOut,
  ChevronDown,
  KeyRound,
  Sun,
  Moon,
  Type,
  X,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../contexts/RealtimeContext';
import { useTheme } from '../../contexts/ThemeContext';
import { ChangePasswordModal } from './ChangePasswordModal';
import { UserAvatar } from './UserAvatar';
import { ProfileModal } from './ProfileModal';
import { formatDateTime } from '../../utils/date';
import { NotificationType } from '../../types';

interface HeaderProps {
  onToggleSidebar: () => void;
  onNavigate: (tab: string, param?: string) => void;
  activeTab?: string;
  isSidebarCollapsed?: boolean;
}

const TAB_LABELS: Record<string, string> = {
  dashboard: 'Tổng quan Điều hành',
  tasks: 'Nhiệm vụ Công việc',
  dossiers: 'Hồ sơ Địa chính',
  publicLand: 'Quỹ đất Công ích 5%',
  violations: 'Vi phạm & Trật tự XD',
  disputes: 'Tranh chấp & Hòa giải',
  projects: 'Dự án & GPMB',
  calendar: 'Lịch & Hạn chót',
  registerBooks: 'Sổ bộ Theo dõi',
  documents: 'Văn bản Điều hành',
  reports: 'Báo cáo Thống kê',
  activityLogs: 'Nhật ký Tác nghiệp',
  users: 'Cán bộ & Phân quyền',
  alerts: 'Nhắc việc Telegram',
  settings: 'Cấu hình Đơn vị',
};

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onNavigate,
  activeTab = 'dashboard',
  isSidebarCollapsed = false,
}) => {
  const { user, logout, isAdmin, isLeader } = useAuth();
  const { theme, toggleTheme, fontSize, setFontSize } = useTheme();
  const {
    notifications,
    users,
    unreadNotificationCount,
    isConnected,
    isSyncing,
    refreshData,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    sendNotification,
    settings,
  } = useRealtime();

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifTab, setNotifTab] = useState<'all' | 'unread'>('all');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // Broadcast state
  const [targetUserId, setTargetUserId] = useState<string>('all');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcastType, setBroadcastType] = useState<NotificationType>('info');
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const fontMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (fontMenuRef.current && !fontMenuRef.current.contains(event.target as Node)) {
        setShowFontSizeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userNotifications = notifications.filter((n) => !user || n.userId === user.id);
  const filteredNotifications = notifTab === 'unread' ? userNotifications.filter((n) => !n.isRead) : userNotifications;

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastContent.trim()) return;

    try {
      setIsSendingNotif(true);
      await sendNotification({
        userId: targetUserId,
        title: broadcastTitle.trim(),
        content: broadcastContent.trim(),
        type: broadcastType,
      });
      setBroadcastTitle('');
      setBroadcastContent('');
      setShowBroadcastModal(false);
      alert('Đã gửi thông báo thành công!');
    } catch (err: any) {
      alert('Lỗi khi gửi thông báo: ' + err.message);
    } finally {
      setIsSendingNotif(false);
    }
  };

  return (
    <header
      className={`sticky top-0 z-30 h-12 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200/90 dark:border-slate-800 px-2.5 sm:px-4 ${
        isSidebarCollapsed ? 'lg:pl-[78px]' : 'lg:pl-[246px]'
      } flex items-center justify-between gap-2 shrink-0 shadow-2xs transition-all duration-200`}
    >
      {/* Left / Middle section */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors lg:hidden shrink-0 cursor-pointer"
          title="Mở menu điều hướng"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[11px] font-bold tracking-tight shrink-0 shadow-2xs">
            {TAB_LABELS[activeTab] || 'Điều hành'}
          </span>
          <span className="hidden md:inline text-slate-300 dark:text-slate-700">•</span>
          <span className="hidden md:inline text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
            {settings?.unitName || 'Phòng Kinh tế – UBND xã Lãnh Ngọc'}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Quick broadcast notification trigger for Leader & Admin (Compact Icon) */}
        {(isAdmin || isLeader) && (
          <button
            onClick={() => setShowBroadcastModal(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-blue-700 hover:text-blue-900 dark:text-blue-300 bg-blue-50/90 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 transition-colors border border-blue-200 dark:border-blue-800 cursor-pointer shrink-0"
            title="Phát thông báo nhanh cho toàn thể cán bộ"
          >
            <Megaphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </button>
        )}

        {/* Dark / Light Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 transition-colors cursor-pointer shrink-0"
          title={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          )}
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors border border-gray-200 dark:border-slate-700 cursor-pointer relative shrink-0"
            title="Thông báo"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-72 sm:w-96 rounded-xl bg-white border border-gray-200 shadow-xl z-50 overflow-hidden text-xs">
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-tight">Thông báo</span>
                  {unreadNotificationCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">
                      {unreadNotificationCount} mới
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadNotificationCount > 0 && (
                    <button
                      onClick={() => markAllNotificationsAsRead()}
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                      title="Đánh dấu tất cả đã đọc"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Đọc hết
                    </button>
                  )}
                  {userNotifications.length > 0 && (
                    <button
                      onClick={() => {
                        clearAllNotifications();
                      }}
                      className="text-[11px] text-slate-400 hover:text-rose-600 font-semibold flex items-center gap-0.5 cursor-pointer"
                      title="Xóa toàn bộ thông báo"
                    >
                      <Trash2 className="w-3 h-3" />
                      Xóa hết
                    </button>
                  )}
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center border-b border-gray-100 bg-gray-50/50 px-3 py-1.5 gap-2 text-xs">
                <button
                  onClick={() => setNotifTab('all')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                    notifTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-gray-200'
                  }`}
                >
                  Tất cả ({userNotifications.length})
                </button>
                <button
                  onClick={() => setNotifTab('unread')}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer ${
                    notifTab === 'unread' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-gray-200'
                  }`}
                >
                  Chưa đọc ({unreadNotificationCount})
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {filteredNotifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    <p>Không có thông báo nào.</p>
                  </div>
                ) : (
                  filteredNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 hover:bg-blue-50/60 transition-colors flex items-start gap-2.5 group ${
                        !n.isRead ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div
                        onClick={() => {
                          markNotificationAsRead(n.id);
                          if (n.relatedModule) {
                            onNavigate(n.relatedModule, n.relatedId);
                            setShowNotifications(false);
                          }
                        }}
                        className={`p-1.5 rounded-lg shrink-0 mt-0.5 cursor-pointer ${
                          n.type === 'urgent'
                            ? 'bg-rose-100 text-rose-700'
                            : n.type === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : n.type === 'success'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {n.type === 'urgent' || n.type === 'warning' ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          markNotificationAsRead(n.id);
                          if (n.relatedModule) {
                            onNavigate(n.relatedModule, n.relatedId);
                            setShowNotifications(false);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p className={`font-semibold truncate ${!n.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {formatDateTime(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] line-clamp-2 mt-0.5">{n.content}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        {!n.isRead && (
                          <button
                            onClick={() => markNotificationAsRead(n.id)}
                            className="p-1 rounded text-blue-600 hover:bg-blue-100 cursor-pointer"
                            title="Đánh dấu đã đọc"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(n.id)}
                          className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Xóa thông báo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-gray-200 dark:bg-slate-700 mx-0.5" />

        {/* User Profile dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="h-8 flex items-center gap-1.5 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-left border border-gray-200 dark:border-slate-700 cursor-pointer shrink-0"
            title={`${user?.name} (${isConnected ? 'Đang trực tuyến' : 'Ngoại tuyến'})`}
          >
            <div className="relative">
              <UserAvatar user={user} size="xs" showGenderBadge={false} />
              {isSyncing ? (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 flex items-center justify-center ring-1 ring-white dark:ring-slate-900">
                  <RefreshCw className="w-1.5 h-1.5 text-white animate-spin" />
                </span>
              ) : isConnected ? (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5" title="Đang trực tuyến (Online)">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white dark:border-slate-900"></span>
                </span>
              ) : (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white dark:border-slate-900" title="Mất kết nối (Ngoại tuyến)" />
              )}
            </div>
            <div className="hidden md:block text-left leading-tight">
              <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[130px]">{user?.name}</p>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl z-50 overflow-hidden py-1 text-xs animate-in fade-in">
              {/* Online status & Quick Sync bar */}
              <div className="px-3.5 py-2 border-b border-gray-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span>{isConnected ? 'Hệ thống trực tuyến' : 'Đang ngoại tuyến'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => refreshData()}
                  disabled={isSyncing}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Làm mới & đồng bộ dữ liệu với máy chủ"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Đang đồng bộ...' : 'Làm mới'}</span>
                </button>
              </div>

              <div className="px-3.5 py-2.5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/40 flex items-center gap-2.5">
                <UserAvatar user={user} size="md" showGenderBadge />
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{user?.name}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate">{user?.email}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowProfileModal(true);
                  setShowUserMenu(false);
                }}
                className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600 flex items-center gap-2 cursor-pointer font-semibold"
              >
                <UserAvatar user={user} size="xs" />
                <span>Hồ sơ & Đổi ảnh đại diện</span>
              </button>

              <button
                onClick={() => {
                  onNavigate('users');
                  setShowUserMenu(false);
                }}
                className="w-full px-3.5 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-blue-600 flex items-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Danh sách cán bộ & Phân quyền</span>
              </button>

              <button
                onClick={() => {
                  onNavigate('telegram-config');
                  setShowUserMenu(false);
                }}
                className="w-full px-3.5 py-2 text-left text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 flex items-center gap-2 cursor-pointer font-semibold"
              >
                <Send className="w-3.5 h-3.5 text-sky-500" />
                <span>Cấu hình Nhắc việc Telegram Bot</span>
              </button>

              <button
                onClick={() => {
                  onNavigate('settings');
                  setShowUserMenu(false);
                }}
                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Thiết lập hệ thống & Sao lưu
              </button>

              <button
                onClick={() => {
                  setShowChangePassword(true);
                  setShowUserMenu(false);
                }}
                className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-gray-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                Đổi mật khẩu
              </button>

              <div className="border-t border-gray-100 my-1"></div>

              <button
                onClick={() => {
                  logout();
                  setShowUserMenu(false);
                }}
                className="w-full px-3.5 py-2 text-left text-blue-600 hover:bg-blue-50 flex items-center gap-2 font-semibold cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Đổi tài khoản cán bộ khác
              </button>

              <button
                onClick={() => {
                  logout();
                  setShowUserMenu(false);
                }}
                className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />

      {/* Broadcast Notification Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-900">
                <Megaphone className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold">Phát Thông báo Nghiệp vụ</h3>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Người nhận thông báo <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                >
                  <option value="all">📢 Toàn thể Cán bộ & Chuyên viên (Phát thanh)</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      👤 {u.name} ({u.position || ''})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mức độ cảnh báo</label>
                  <select
                    value={broadcastType}
                    onChange={(e) => setBroadcastType(e.target.value as NotificationType)}
                    className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  >
                    <option value="info">Thông tin chung</option>
                    <option value="warning">Cảnh báo / Nhắc nhở</option>
                    <option value="urgent">Hỏa tốc / Khẩn cấp</option>
                    <option value="success">Biểu dương / Hoàn thành</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Người phát</label>
                  <input
                    type="text"
                    disabled
                    value={`${user?.name} (${user?.position || ''})`}
                    className="w-full bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5 text-slate-600 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tiêu đề thông báo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="VD: Nhắc nhở nộp báo cáo giải quyết hồ sơ đất đai tuần 34..."
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nội dung thông báo <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={broadcastContent}
                  onChange={(e) => setBroadcastContent(e.target.value)}
                  placeholder="Nội dung chỉ đạo, lưu ý nghiệp vụ hoặc điều phối công việc..."
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-slate-700 hover:bg-gray-100 font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSendingNotif}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingNotif ? 'Đang phát...' : 'Phát thông báo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
