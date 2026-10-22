import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import {
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  Building2,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Check,
  PhoneCall,
  Shield,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const { refreshData } = useRealtime();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPosition, setRegPosition] = useState('Chuyên viên Đất đai');
  const [isRegistering, setIsRegistering] = useState(false);

  const QUICK_ACCOUNTS = [
    { username: 'vudvh', name: 'Đoàn Văn Hoài Vũ', roleLabel: 'Quản trị viên (Admin)', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    { username: 'latvt', name: 'Võ Tấn Lạt', roleLabel: 'Phó Trưởng phòng', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    { username: 'huym', name: 'Mai Huy', roleLabel: 'Trưởng phòng', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    { username: 'lieulv', name: 'Lê Văn Liệu', roleLabel: 'Chuyên viên', badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    { username: 'lamtv', name: 'Trần Văn Lâm', roleLabel: 'Chuyên viên', badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    { username: 'khanvd', name: 'Nguyễn Văn Duy Kha', roleLabel: 'Chuyên viên', badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    { username: 'thaottt', name: 'Trần Thị Thanh Thảo', roleLabel: 'Chuyên viên', badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    { username: 'huongtv', name: 'Trần Văn Hương', roleLabel: 'Chuyên viên', badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    { username: 'tinpt', name: 'Phùng Thanh Tín', roleLabel: 'Chuyên viên', badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  ];

  const handleQuickLogin = (accUsername: string) => {
    setUsername(accUsername);
    setPassword('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Vui lòng nhập tên đăng nhập, email hoặc số điện thoại.');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu của bạn.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await login(username.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản và mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regUsername.trim() || !regEmail.trim()) {
      setError('Vui lòng điền đầy đủ họ tên, tên đăng nhập và email.');
      return;
    }

    try {
      setIsRegistering(true);
      setError(null);
      const msg = await register({
        name: regName.trim(),
        username: regUsername.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        position: regPosition.trim(),
      });
      setSuccessMsg(msg || 'Đăng ký tài khoản thành công! Quản trị viên sẽ phê duyệt.');
      setShowRegisterModal(false);
      // Reset form
      setRegName('');
      setRegUsername('');
      setRegEmail('');
      setRegPhone('');
      refreshData();
    } catch (err: any) {
      setError(err.message || 'Đăng ký tài khoản thất bại.');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 bg-radial from-slate-900 via-slate-950 to-slate-950">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-500/20 mb-3 ring-4 ring-blue-500/20">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight uppercase leading-snug">
          Hệ thống Quản lý Công việc & Hồ sơ Đất đai
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400 font-medium">
          Cổng làm việc điện tử dành cho Cán bộ, Lãnh đạo & Chuyên viên
        </p>
      </div>

      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm sm:text-base font-bold text-white">Xác thực đăng nhập</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[11px] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Trực tuyến
            </span>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Không thể đăng nhập</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Thông báo</p>
                <p className="mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          {/* 1-Touch Quick Login for Mobile & Desktop */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                ⚡ Chọn nhanh cán bộ
              </span>
              <span className="text-[10px] text-slate-400">Chọn tài khoản và nhập mật khẩu</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
              {QUICK_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickLogin(acc.username)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] border border-slate-800 hover:border-blue-500/50 text-left transition-all cursor-pointer disabled:opacity-50"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-white truncate">{acc.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">TK: {acc.username}</div>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-md border text-[10px] font-bold ${acc.badgeClass}`}>
                    {acc.roleLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                Hoặc nhập Tên đăng nhập / Họ tên / SĐT
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ví dụ: vudvh, lieulv, latvt..."
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-300 font-bold">
                  Mật khẩu
                </label>
                <span className="text-[10px] text-slate-400">Mật khẩu công vụ được cấp</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1.5 space-y-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all text-xs cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'Đang xác thực tài khoản...' : 'Đăng nhập hệ thống'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRegisterModal(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold flex items-center justify-center gap-2 transition-all text-xs cursor-pointer border border-slate-700"
              >
                <UserPlus className="w-4 h-4 text-blue-400" />
                <span>Đăng ký tài khoản cán bộ mới</span>
              </button>
            </div>
          </form>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1.5 border-b border-slate-800/60">
              <span className="font-medium text-slate-400">Hệ thống điều hành công vụ</span>
              <span className="font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/70">
                Phiên bản 1.0 (v1.0)
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Quản trị viên Hệ thống: Đoàn Văn Hoài Vũ</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <PhoneCall className="w-3 h-3 text-blue-400" />
              <span>Hỗ trợ kỹ thuật: <strong className="text-slate-200">0968.489.024</strong> • <strong className="text-slate-200">vudvh@danang.gov.vn</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-white text-base">Đăng ký tài khoản cán bộ</h3>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Họ và tên cán bộ *</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Tên đăng nhập (username) *</label>
                <input
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="Ví dụ: anvan"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Email công vụ *</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="anvan@danang.gov.vn"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Số điện thoại liên hệ</label>
                <input
                  type="text"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="0905xxxxxx"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Chức danh / Vị trí</label>
                <input
                  type="text"
                  value={regPosition}
                  onChange={(e) => setRegPosition(e.target.value)}
                  placeholder="Chuyên viên Đất đai..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 text-xs"
                />
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300">
                Sau khi gửi đăng ký, Quản trị viên (Đoàn Văn Hoài Vũ) sẽ xem xét và phê duyệt kích hoạt tài khoản của bạn.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isRegistering ? 'Đang gửi...' : 'Gửi đăng ký'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
