import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, UserStatus } from '../../types';
import { apiService } from '../../services/api';
import { UserAvatar, PRESET_AVATARS } from '../common/UserAvatar';
import { VillageAddressInput } from '../common/VillageAddressInput';
import {
  X,
  Shield,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  KeyRound,
  RotateCcw,
  Sparkles,
  Copy,
  Check,
  User as UserIcon,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Image as ImageIcon,
  Lock,
  Unlock,
  ShieldCheck,
  UserCheck,
  Upload,
  Camera,
  Trash2,
} from 'lucide-react';

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit: User | null;
  onSuccess: () => void;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({
  isOpen,
  onClose,
  userToEdit,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [role, setRole] = useState<UserRole>('specialist');
  const [scope, setScope] = useState('');
  const [status, setStatus] = useState<UserStatus>('active');
  const [approved, setApproved] = useState<boolean>(true);
  const [avatar, setAvatar] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [copiedPass, setCopiedPass] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = React.useRef(false);
  const isUploadingRef = React.useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const prevOpenRef = React.useRef(false);
  const prevEditIdRef = React.useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isOpen || !userToEdit) {
      prevOpenRef.current = false;
      prevEditIdRef.current = undefined;
      submittingRef.current = false;
      isUploadingRef.current = false;
      setIsSubmitting(false);
      setIsUploading(false);
      return;
    }

    const isNewlyOpened = !prevOpenRef.current && isOpen;
    const isEditTargetChanged = userToEdit.id !== prevEditIdRef.current;

    if (isNewlyOpened || isEditTargetChanged) {
      prevOpenRef.current = true;
      prevEditIdRef.current = userToEdit.id;

      setName(userToEdit.name || '');
      setUsername(userToEdit.username || '');
      setPassword(userToEdit.password || '');
      setEmail(userToEdit.email || '');
      setPhone(userToEdit.phone || '');
      setPosition(userToEdit.position || '');
      setRole(userToEdit.role || 'specialist');
      setScope(userToEdit.scope || '');
      setStatus(userToEdit.status || 'active');
      setApproved(userToEdit.approved !== undefined ? userToEdit.approved : true);
      setAvatar(userToEdit.avatar || '');
      setGender(userToEdit.gender || (userToEdit.name?.includes('Thị') ? 'female' : 'male'));
      setErrorMsg(null);
      setSuccessToast(null);
      setShowPassword(false);
    }
  }, [isOpen, userToEdit]);

  if (!isOpen || !userToEdit) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploadingRef.current || isUploading) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WEBP).');
      return;
    }

    isUploadingRef.current = true;
    try {
      setIsUploading(true);
      setErrorMsg(null);
      const attachments = await apiService.uploadFiles([file], userToEdit.id, userToEdit.name, false);
      if (attachments && attachments.length > 0) {
        setAvatar(attachments[0].url);
        setSuccessToast('Đã tải ảnh đại diện lên máy chủ thành công!');
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          setAvatar(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatar(event.target?.result as string);
        setSuccessToast('Đã nạp ảnh đại diện thành công!');
      };
      reader.readAsDataURL(file);
    } finally {
      isUploadingRef.current = false;
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleCopyPassword = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789@#';
    let rand = 'LN@';
    for (let i = 0; i < 7; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(rand);
    setShowPassword(true);
    setSuccessToast(`Đã tạo mật khẩu ngẫu nhiên an toàn`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên cán bộ.');
      return;
    }
    if (!username.trim()) {
      setErrorMsg('Vui lòng nhập tên đăng nhập (username).');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Vui lòng nhập địa chỉ email.');
      return;
    }
    if (password && password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    submittingRef.current = true;
    try {
      setIsSubmitting(true);
      await apiService.updateUser(userToEdit.id, {
        name: name.trim(),
        username: username.trim(),
        password: password.trim(),
        email: email.trim(),
        phone: phone.trim(),
        position: position.trim(),
        role,
        scope: scope.trim(),
        status,
        approved,
        gender,
        avatar: avatar.trim(),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi cập nhật cán bộ');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto text-xs text-slate-800 dark:text-slate-100 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <UserAvatar user={{ name, avatar, gender }} size="md" showGenderBadge />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Chỉnh sửa Toàn diện Cán bộ
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                  Mở tất cả trường
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tài khoản: <strong className="text-blue-600 dark:text-blue-400">@{userToEdit.username}</strong> • ID: {userToEdit.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col justify-between p-0">
          <div className="p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {successToast && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-start gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-semibold">{successToast}</span>
            </div>
          )}

          {/* NHÓM 1: THÔNG TIN ĐĂNG NHẬP & BẢO MẬT (USER, PASSWORD, EMAIL) */}
          <div className="p-3.5 rounded-xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 space-y-3">
            <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-300 font-bold border-b border-blue-200/60 dark:border-blue-800/60 pb-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              <span>1. Thông tin Đăng nhập & Mật khẩu tài khoản</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên đăng nhập (Username) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="VD: vudvh"
                  className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-mono font-bold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300">
                    Mật khẩu truy cập <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleGenerateRandomPassword}
                      className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                      title="Tạo mật khẩu ngẫu nhiên an toàn"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Tạo ngẫu nhiên</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg pl-2.5 pr-16 py-1.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-mono font-bold"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                      title="Sao chép mật khẩu"
                    >
                      {copiedPass ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* NHÓM 2: THÔNG TIN CÁ NHÂN & CÔNG TÁC */}
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold border-b border-gray-200 dark:border-slate-700 pb-1.5">
              <UserIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>2. Thông tin Cá nhân & Nhiệm vụ Chuyên môn</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Họ và tên cán bộ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Đoàn Văn Hoài Vũ"
                className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email công vụ / liên hệ <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="VD: vudvh@danang.gov.vn"
                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Số điện thoại</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0968489024"
                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Chức vụ / Vị trí công tác
                </label>
                <div className="relative">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="VD: Chuyên viên Địa chính - Xây dựng"
                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <VillageAddressInput
                  label="Phạm vi phụ trách (Thôn / Địa bàn)"
                  mode="location"
                  placeholder="VD: Thôn Tiên Hiệp (hoặc gõ Toàn xã...)"
                  value={scope}
                  onChange={(val) => setScope(val)}
                />
              </div>

            </div>

            {/* Thiết lập Giới tính & Ảnh đại diện */}
            <div className="pt-2 border-t border-gray-200 dark:border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block font-semibold text-slate-700 dark:text-slate-300">
                  Giới tính & Ảnh đại diện cán bộ
                </label>
                <span className="text-[11px] text-slate-500">Mặc định Nam/Nữ hoặc Tải ảnh lên</span>
              </div>

              {/* Gender selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setGender('male');
                    if (!avatar) setAvatar('');
                  }}
                  className={`p-2 rounded-xl border flex items-center gap-2 text-left cursor-pointer transition-all ${
                    gender === 'male' && !avatar
                      ? 'bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-950/50 dark:border-blue-500 dark:text-blue-200 font-bold ring-2 ring-blue-500/20'
                      : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <UserAvatar gender="male" size="xs" />
                  <div>
                    <p className="font-bold">👨 Cán bộ Nam</p>
                    <p className="text-[9px] text-slate-500">Avatar chuẩn công chức</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGender('female');
                    if (!avatar) setAvatar('');
                  }}
                  className={`p-2 rounded-xl border flex items-center gap-2 text-left cursor-pointer transition-all ${
                    gender === 'female' && !avatar
                      ? 'bg-rose-50 border-rose-500 text-rose-900 dark:bg-rose-950/50 dark:border-rose-500 dark:text-rose-200 font-bold ring-2 ring-rose-500/20'
                      : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <UserAvatar gender="female" size="xs" />
                  <div>
                    <p className="font-bold">👩 Cán bộ Nữ</p>
                    <p className="text-[9px] text-slate-500">Avatar chuẩn công chức</p>
                  </div>
                </button>
              </div>

              {/* Tải ảnh từ máy tính & Quản lý */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 text-xs shadow-xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Đang nạp...' : 'Tải ảnh từ máy tính'}</span>
                </button>

                {avatar && (
                  <button
                    type="button"
                    onClick={() => setAvatar('')}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold flex items-center gap-1 text-xs cursor-pointer"
                    title="Xóa ảnh cá nhân, dùng avatar mặc định theo giới tính"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Dùng avatar mặc định</span>
                  </button>
                )}

                <div className="flex-1 min-w-[200px] relative">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="Dán URL ảnh hoặc tải từ máy tính..."
                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>

                <UserAvatar user={{ name, avatar, gender }} size="sm" showGenderBadge />
              </div>

              {/* Bộ sưu tập mẫu avatar công vụ có sẵn */}
              <div className="pt-1.5">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1.5">
                  Hoặc chọn nhanh từ mẫu ảnh công vụ:
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((preset) => {
                    const isSelected =
                      preset.id === 'preset_male_official'
                        ? (!avatar || avatar === 'preset:male_official') && gender === 'male'
                        : preset.id === 'preset_female_official'
                        ? (!avatar || avatar === 'preset:female_official') && gender === 'female'
                        : avatar === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          if (preset.id === 'preset_male_official') {
                            setGender('male');
                            setAvatar('');
                          } else if (preset.id === 'preset_female_official') {
                            setGender('female');
                            setAvatar('');
                          } else {
                            setGender(preset.gender);
                            setAvatar(preset.url);
                          }
                        }}
                        className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 dark:bg-blue-950/50 ring-2 ring-blue-500'
                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-blue-400'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden shadow-2xs">
                          <preset.component className="w-full h-full" />
                        </div>
                        <span className="text-[9px] font-semibold truncate w-full text-center text-slate-600 dark:text-slate-300" title={preset.label}>
                          {preset.shortLabel || preset.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* NHÓM 3: PHÂN QUYỀN VAI TRÒ & TRẠNG THÁI TÀI KHOẢN */}
          <div className="p-3.5 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 space-y-3">
            <div className="flex items-center gap-1.5 text-purple-800 dark:text-purple-300 font-bold border-b border-purple-200/60 dark:border-purple-800/60 pb-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>3. Phân quyền Vai trò & Trạng thái Hoạt động</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vai trò hệ thống <span className="text-rose-500">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-xs cursor-pointer"
                >
                  <option value="admin">Quản trị viên (Toàn quyền)</option>
                  <option value="leader">Lãnh đạo UBND (Chỉ đạo & Xem toàn bộ)</option>
                  <option value="specialist">Chuyên viên Địa chính (Thực hiện & Báo cáo)</option>
                  <option value="clerk">Văn thư Một cửa (Tiếp nhận & Quản lý văn bản)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Trạng thái tài khoản <span className="text-rose-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as UserStatus)}
                  className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-xs cursor-pointer"
                >
                  <option value="active">🟢 Đang hoạt động (active)</option>
                  <option value="locked">🔴 Đã khóa truy cập (locked)</option>
                  <option value="pending">🟡 Chờ phê duyệt (pending)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phê duyệt tài khoản
                </label>
                <select
                  value={approved ? 'true' : 'false'}
                  onChange={(e) => setApproved(e.target.value === 'true')}
                  className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-xs cursor-pointer"
                >
                  <option value="true">✅ Đã phê duyệt (Cho phép đăng nhập)</option>
                  <option value="false">❌ Chưa phê duyệt (Chặn đăng nhập)</option>
                </select>
              </div>
            </div>
          </div>
          </div>

          {/* Sticky Modal Footer Buttons */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Cập nhật: {userToEdit.updatedAt ? new Date(userToEdit.updatedAt).toLocaleString('vi-VN') : 'Mới khởi tạo'}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg font-semibold text-slate-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-xs disabled:opacity-50 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Đang lưu...' : 'Lưu tất cả thay đổi'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
