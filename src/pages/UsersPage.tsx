import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, UserStatus } from '../types';
import { useRealtime } from '../contexts/RealtimeContext';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { formatDate } from '../utils/date';
import { UserAvatar } from '../components/common/UserAvatar';
import {
  Users,
  Shield,
  Search,
  CheckCircle2,
  Lock,
  Unlock,
  Edit3,
  Mail,
  Phone,
  MapPin,
  UserCheck,
  KeyRound,
  Eye,
  EyeOff,
  RotateCcw,
  Copy,
  Check,
  Filter,
  LayoutGrid,
  List,
  Sparkles,
  AlertTriangle,
  X,
  ShieldAlert,
  UserPlus,
  MoreVertical,
} from 'lucide-react';

interface UsersPageProps {
  onOpenEditUser: (user: User) => void;
}

export const UsersPage: React.FC<UsersPageProps> = ({ onOpenEditUser }) => {
  const { users, refreshData } = useRealtime();
  const { user: currentUser, isAdmin, isLeader } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const loadingIdRef = useRef<Set<string>>(new Set());
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuUserId(null);
    if (activeMenuUserId) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [activeMenuUserId]);

  // Quick Reset Password Modal State
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState<string>('');
  const [resetShowPass, setResetShowPass] = useState<boolean>(true);
  const [resetLoading, setResetLoading] = useState<boolean>(false);
  const resetPasswordRef = useRef(false);
  const [resetResult, setResetResult] = useState<{ success: boolean; msg: string; password?: string } | null>(null);

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleCopyText = (text: string, id: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredUsers = users.filter((u) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        (u.name || '').toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').includes(q) ||
        (u.position || '').toLowerCase().includes(q) ||
        (u.scope || '').toLowerCase().includes(q);
      if (!matchQuery) return false;
    }
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if ((statusFilter === 'active' || statusFilter === 'approved') && (!u.approved || u.status === 'locked')) return false;
    if (statusFilter === 'pending' && (u.approved || u.status !== 'pending')) return false;
    if (statusFilter === 'locked' && u.status !== 'locked') return false;
    if (statusFilter === 'active' && (u.status !== 'active' || !u.approved)) return false;
    return true;
  });

  const handleToggleApprove = async (user: User) => {
    if (loadingIdRef.current.has(user.id)) return;
    loadingIdRef.current.add(user.id);
    try {
      setLoadingId(user.id);
      if (!user.approved) {
        await apiService.approveUser(user.id);
      } else {
        await apiService.updateUser(user.id, { approved: false, status: 'pending' });
      }
      refreshData();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi cập nhật trạng thái duyệt');
    } finally {
      loadingIdRef.current.delete(user.id);
      setLoadingId(null);
    }
  };

  const handleToggleLock = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert('Không thể tự khóa tài khoản của chính mình.');
      return;
    }
    if (loadingIdRef.current.has(user.id)) return;
    loadingIdRef.current.add(user.id);
    try {
      setLoadingId(user.id);
      await apiService.toggleLockUser(user.id);
      refreshData();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi khóa/mở khóa');
    } finally {
      loadingIdRef.current.delete(user.id);
      setLoadingId(null);
    }
  };

  const openResetPasswordModal = (user: User) => {
    setResetUser(user);
    setResetPasswordVal('');
    setResetShowPass(true);
    setResetResult(null);
  };

  const handleExecuteResetPassword = async () => {
    if (!resetUser) return;
    if (resetPasswordRef.current) return;
    if (!resetPasswordVal || resetPasswordVal.trim().length < 6) {
      alert('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    resetPasswordRef.current = true;
    try {
      setResetLoading(true);
      const res = await apiService.resetPassword(resetUser.id, resetPasswordVal.trim());
      setResetResult({
        success: true,
        msg: `Đã đặt lại mật khẩu cho cán bộ ${resetUser.name} (@${resetUser.username}) thành công!`,
        password: res.newPassword || resetPasswordVal.trim(),
      });
      refreshData();
    } catch (err: any) {
      setResetResult({
        success: false,
        msg: err.message || 'Lỗi khi đặt lại mật khẩu.',
      });
    } finally {
      resetPasswordRef.current = false;
      setResetLoading(false);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase">Quản trị viên</span>;
      case 'leader':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 uppercase">Lãnh đạo UBND</span>;
      case 'specialist':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">Chuyên viên</span>;
      case 'clerk':
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 uppercase">Văn thư</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 uppercase">{role}</span>;
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Quản lý Cán bộ & Phân quyền
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800 uppercase">
              {filteredUsers.length} cán bộ
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
              Hỗ trợ xem/hiện MK & Reset MK
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Quản lý tài khoản, xem mật khẩu, đặt lại (reset) mật khẩu, mở tất cả trường để sửa thông tin và phân quyền nhiệm vụ.
          </p>
        </div>

        {/* Top View Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl border border-gray-200 dark:border-slate-700 shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs border border-gray-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Dạng lưới (Cards)"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Thẻ</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
              viewMode === 'table'
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs border border-gray-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Dạng danh sách bảng (Table)"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bảng</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full md:max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo họ tên, username, email, SĐT, chức vụ, địa bàn..."
            className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold">Vai trò:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer text-xs"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="admin">Quản trị viên</option>
              <option value="leader">Lãnh đạo UBND</option>
              <option value="specialist">Chuyên viên</option>
              <option value="clerk">Văn thư</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 text-[11px] font-semibold">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer text-xs"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">🟢 Đang hoạt động</option>
              <option value="pending">🟡 Chờ phê duyệt</option>
              <option value="locked">🔴 Đã khóa</option>
            </select>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: GRID CARDS */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredUsers.map((u) => {
            const isMe = u.id === currentUser?.id;
            const canViewPassword = isAdmin || isMe;
            const isPassVisible = canViewPassword && (visiblePasswords[u.id] || false);
            const currentPassword = u.password || '••••••••';

            return (
              <div
                key={u.id}
                className={`p-3.5 rounded-xl border shadow-xs flex flex-col justify-between space-y-3 transition-all text-xs ${
                  u.status === 'locked'
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 opacity-85'
                    : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Top Profile */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar user={u} size="md" showGenderBadge />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{u.name}</h3>
                          {isMe && (
                            <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[9px] font-bold border border-blue-200 dark:border-blue-800">
                              Tôi
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">@{u.username}</p>
                      </div>
                    </div>

                    {getRoleBadge(u.role)}
                  </div>

                  {/* Detailed Info Card */}
                  <div className="space-y-1.5 p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-800 text-[11px]">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="font-semibold">{u.position || 'Chưa cập nhật chức danh'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{u.email}</span>
                    </div>

                    {u.phone && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{u.phone}</span>
                      </div>
                    )}

                    {u.scope && (
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Địa bàn: {u.scope}</span>
                      </div>
                    )}
                  </div>

                  {/* PASSWORD DISPLAY & COPY BOX (CHỨC NĂNG XEM VÀ SAO CHÉP MẬT KHẨU) */}
                  <div className="p-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Mật khẩu:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white px-1.5 py-0.5 bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-800">
                        {isPassVisible ? currentPassword : '••••••••'}
                      </span>
                    </div>

                    {canViewPassword ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => togglePasswordVisibility(u.id)}
                          className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                          title={isPassVisible ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
                        >
                          {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleCopyText(currentPassword, `pass_${u.id}`)}
                          className="p-1 rounded text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors cursor-pointer"
                          title="Sao chép mật khẩu"
                        >
                          {copiedId === `pass_${u.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Chỉ Admin</span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        u.status === 'locked'
                          ? 'bg-rose-500'
                          : u.approved
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                      }`}
                    ></span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      {u.status === 'locked' ? 'Đã khóa' : u.approved ? 'Đã duyệt' : 'Chờ duyệt'}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 relative" onClick={(e) => e.stopPropagation()}>
                      {/* Button Sửa toàn bộ thông tin */}
                      <button
                        onClick={() => onOpenEditUser(u)}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                        title="Mở tất cả trường để sửa"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Sửa</span>
                      </button>

                      {/* 3-dot Secondary Menu */}
                      <div className="relative inline-block text-left">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuUserId(activeMenuUserId === u.id ? null : u.id);
                          }}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            activeMenuUserId === u.id
                              ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : 'text-slate-400 border-transparent hover:border-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                          title="Thao tác khác"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {activeMenuUserId === u.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 bottom-full mb-1 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-40 text-left animate-in fade-in-50 zoom-in-95"
                          >
                            <button
                              onClick={() => {
                                setActiveMenuUserId(null);
                                openResetPasswordModal(u);
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                              Reset mật khẩu
                            </button>
                            <button
                              onClick={() => {
                                setActiveMenuUserId(null);
                                handleToggleApprove(u);
                              }}
                              disabled={loadingId === u.id}
                              className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                              {u.approved ? 'Bỏ duyệt tài khoản' : 'Duyệt tài khoản'}
                            </button>
                            {!isMe && (
                              <>
                                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                <button
                                  onClick={() => {
                                    setActiveMenuUserId(null);
                                    handleToggleLock(u);
                                  }}
                                  disabled={loadingId === u.id}
                                  className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  {u.status === 'locked' ? (
                                    <>
                                      <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                                      Mở khóa tài khoản
                                    </>
                                  ) : (
                                    <>
                                      <Lock className="w-3.5 h-3.5 text-rose-500" />
                                      Khóa tài khoản
                                    </>
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 2: TABLE LIST */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Cán bộ</th>
                  <th className="py-2.5 px-3">Tài khoản</th>
                  <th className="py-2.5 px-3">Mật khẩu</th>
                  <th className="py-2.5 px-3">Vai trò & Chức vụ</th>
                  <th className="py-2.5 px-3">Email & SĐT</th>
                  <th className="py-2.5 px-3">Địa bàn</th>
                  <th className="py-2.5 px-3 text-center">Trạng thái</th>
                  {isAdmin && <th className="py-2.5 px-3 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {filteredUsers.map((u) => {
                  const isMe = u.id === currentUser?.id;
                  const canViewPassword = isAdmin || isMe;
                  const isPassVisible = canViewPassword && (visiblePasswords[u.id] || false);
                  const currentPassword = u.password || '••••••••';

                  return (
                    <tr key={u.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <UserAvatar user={u} size="sm" showGenderBadge />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{u.name}</span>
                            {isMe && (
                              <span className="px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[9px] font-bold">
                                Tôi
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300 font-bold">
                        @{u.username}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 dark:text-white px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700 text-[11px]">
                            {isPassVisible ? currentPassword : '••••••'}
                          </span>
                          {canViewPassword && (
                            <>
                              <button
                                onClick={() => togglePasswordVisibility(u.id)}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                                title={isPassVisible ? 'Ẩn mật khẩu' : 'Xem mật khẩu'}
                              >
                                {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleCopyText(currentPassword, `tpass_${u.id}`)}
                                className="p-1 rounded text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                                title="Sao chép mật khẩu"
                              >
                                {copiedId === `tpass_${u.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="space-y-0.5">
                          <div>{getRoleBadge(u.role)}</div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{u.position || '—'}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-400">
                        <div>{u.email}</div>
                        {u.phone && <div className="text-slate-500 font-mono">{u.phone}</div>}
                      </td>

                      <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-400">
                        {u.scope || 'Toàn xã'}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            u.status === 'locked'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300'
                              : u.approved
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {u.status === 'locked' ? 'Đã khóa' : u.approved ? 'Đã duyệt' : 'Chờ duyệt'}
                        </span>
                      </td>

                      {isAdmin && (
                        <td className="py-2.5 px-3 text-right relative" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => onOpenEditUser(u)}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                              title="Mở tất cả trường để sửa"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Sửa</span>
                            </button>

                            {/* 3-dot Secondary Menu */}
                            <div className="relative inline-block text-left">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuUserId(activeMenuUserId === u.id ? null : u.id);
                                }}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  activeMenuUserId === u.id
                                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                                    : 'text-slate-400 border-transparent hover:border-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                                title="Thao tác khác"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {activeMenuUserId === u.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-40 text-left animate-in fade-in-50 zoom-in-95"
                                >
                                  <button
                                    onClick={() => {
                                      setActiveMenuUserId(null);
                                      openResetPasswordModal(u);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                                    Reset mật khẩu
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveMenuUserId(null);
                                      handleToggleApprove(u);
                                    }}
                                    disabled={loadingId === u.id}
                                    className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                    {u.approved ? 'Bỏ duyệt tài khoản' : 'Duyệt tài khoản'}
                                  </button>
                                  {!isMe && (
                                    <>
                                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                      <button
                                        onClick={() => {
                                          setActiveMenuUserId(null);
                                          handleToggleLock(u);
                                        }}
                                        disabled={loadingId === u.id}
                                        className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        {u.status === 'locked' ? (
                                          <>
                                            <Unlock className="w-3.5 h-3.5 text-emerald-500" />
                                            Mở khóa tài khoản
                                          </>
                                        ) : (
                                          <>
                                            <Lock className="w-3.5 h-3.5 text-rose-500" />
                                            Khóa tài khoản
                                          </>
                                        )}
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUICK RESET PASSWORD MODAL */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-xs">
            <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-950 dark:text-amber-200 text-sm">
                    Đặt lại (Reset) Mật khẩu
                  </h3>
                  <p className="text-[10px] text-amber-800 dark:text-amber-300">
                    Cán bộ: <strong>{resetUser.name}</strong> (@{resetUser.username})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResetUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {resetResult && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2 ${
                    resetResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {resetResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1.5 flex-1">
                    <p className="font-semibold">{resetResult.msg}</p>
                    {resetResult.password && (
                      <div className="flex items-center gap-2 mt-2 bg-white dark:bg-slate-900 p-2 rounded-lg border border-emerald-300 dark:border-emerald-700">
                        <span className="text-[11px] text-slate-500">Mật khẩu mới:</span>
                        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                          {resetResult.password}
                        </span>
                        <button
                          onClick={() => handleCopyText(resetResult.password!, 'modal_pass')}
                          className="ml-auto px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === 'modal_pass' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>Sao chép</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!resetResult?.success && (
                <>
                  <p className="text-slate-600 dark:text-slate-300">
                    Bạn đang thực hiện cấp lại mật khẩu cho tài khoản <strong>@{resetUser.username}</strong>. Bạn có thể dùng mật khẩu mặc định hoặc đặt mật khẩu mới:
                  </p>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">Mật khẩu mới</label>
                      <button
                        type="button"
                        onClick={() => setResetPasswordVal('')}
                        className="text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline font-medium cursor-pointer"
                      >
                        Xóa trắng
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={resetShowPass ? 'text' : 'password'}
                        value={resetPasswordVal}
                        onChange={(e) => setResetPasswordVal(e.target.value)}
                        placeholder="Nhập mật khẩu mới..."
                        className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg pl-3 pr-10 py-2 text-slate-800 dark:text-slate-100 font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setResetShowPass(!resetShowPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {resetShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="px-3 py-1.5 rounded-lg font-semibold text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer text-xs"
                >
                  {resetResult?.success ? 'Đóng' : 'Hủy bỏ'}
                </button>
                {!resetResult?.success && (
                  <button
                    type="button"
                    onClick={handleExecuteResetPassword}
                    disabled={resetLoading}
                    className="px-4 py-1.5 rounded-lg font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-all shadow-xs disabled:opacity-50 text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{resetLoading ? 'Đang đặt lại...' : 'Xác nhận Đặt lại Mật khẩu'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
