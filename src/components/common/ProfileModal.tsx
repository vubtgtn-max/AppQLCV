import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../contexts/RealtimeContext';
import { apiService } from '../../services/api';
import { UserAvatar, PRESET_AVATARS } from './UserAvatar';
import {
  X,
  Upload,
  User as UserIcon,
  Mail,
  Phone,
  Briefcase,
  Camera,
  Check,
  RotateCcw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, switchUser } = useAuth();
  const { refreshData } = useRealtime();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [avatar, setAvatar] = useState('');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const isUploadingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      isSavingRef.current = false;
      isUploadingRef.current = false;
      setIsSaving(false);
      setIsUploading(false);
    }
    if (user && isOpen) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setPosition(user.position || '');
      setGender(user.gender || (user.name?.includes('Thị') ? 'female' : 'male'));
      setAvatar(user.avatar || '');
      setCustomAvatarUrl(user.avatar || '');
      setMsg(null);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  // Handle local file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isUploadingRef.current || isUploading) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMsg({ type: 'error', text: 'Vui lòng chọn một tệp hình ảnh hợp lệ (JPG, PNG, WEBP).' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMsg({ type: 'error', text: 'Kích thước ảnh tối đa là 10MB.' });
      return;
    }

    isUploadingRef.current = true;
    try {
      setIsUploading(true);
      setMsg(null);

      // Upload file to server
      const attachments = await apiService.uploadFiles([file], user.id, user.name, false);
      if (attachments && attachments.length > 0) {
        const uploadedUrl = attachments[0].url;
        setAvatar(uploadedUrl);
        setCustomAvatarUrl(uploadedUrl);
        setMsg({ type: 'success', text: 'Tải ảnh cá nhân lên máy chủ thành công!' });
      } else {
        // Fallback to data URL
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          setAvatar(result);
          setCustomAvatarUrl(result);
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      // Fallback to base64 data url on local error
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setAvatar(result);
        setCustomAvatarUrl(result);
        setMsg({ type: 'success', text: 'Đã nạp ảnh đại diện cá nhân thành công!' });
      };
      reader.readAsDataURL(file);
    } finally {
      isUploadingRef.current = false;
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSelectDefault = (selectedGender: 'male' | 'female') => {
    setGender(selectedGender);
    setAvatar('');
    setCustomAvatarUrl('');
    setMsg({ type: 'success', text: `Đã chọn biểu tượng tượng trưng ${selectedGender === 'female' ? 'Nữ' : 'Nam'} mặc định.` });
  };

  const handleSelectPreset = (presetUrl: string, presetGender: 'male' | 'female') => {
    setAvatar(presetUrl);
    setCustomAvatarUrl(presetUrl);
    setGender(presetGender);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRef.current || isSaving) return;
    if (!name.trim()) {
      setMsg({ type: 'error', text: 'Vui lòng nhập họ và tên của bạn.' });
      return;
    }
    if (!email.trim()) {
      setMsg({ type: 'error', text: 'Vui lòng nhập địa chỉ email.' });
      return;
    }

    isSavingRef.current = true;
    try {
      setIsSaving(true);
      setMsg(null);

      // Change password if filled
      if (showPasswordSection && newPassword) {
        if (newPassword.length < 6) {
          throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
        }
        if (newPassword !== confirmPassword) {
          throw new Error('Mật khẩu xác nhận không khớp.');
        }
        await apiService.changePassword(user.id, oldPassword, newPassword);
      }

      // Update user details
      const updatedUser = await apiService.updateUser(user.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        position: position.trim(),
        gender,
        avatar: avatar.trim(),
      });

      switchUser(updatedUser);
      refreshData();
      setMsg({ type: 'success', text: 'Cập nhật thông tin và ảnh đại diện thành công!' });

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Lỗi khi lưu thông tin.' });
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-6 text-xs text-slate-800 dark:text-slate-100 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <UserAvatar
              user={{ name, avatar, gender }}
              size="lg"
              showGenderBadge
              className="ring-2 ring-blue-500/30 shadow-md"
            />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Hồ sơ Cán bộ & Ảnh đại diện
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tài khoản: <strong className="text-blue-600 dark:text-blue-400">@{user.username}</strong> • Vai trò: {user.role === 'admin' ? 'Quản trị viên' : user.role === 'leader' ? 'Lãnh đạo' : 'Chuyên viên'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSaveProfile} className="overflow-y-auto p-5 space-y-4 flex-1">
          {msg && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in ${
                msg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
              }`}
            >
              {msg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-semibold">{msg.text}</span>
            </div>
          )}

          {/* PHẦN 1: CHỌN ẢNH ĐẠI DIỆN / AVATAR & GIỚI TÍNH */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-gray-200 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-2">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Camera className="w-4 h-4 text-blue-600" />
                <span>1. Thiết lập Ảnh đại diện & Tượng trưng</span>
              </div>
              <span className="text-[11px] text-slate-500">Mặc định Nam/Nữ hoặc Tải ảnh cá nhân</span>
            </div>

            {/* Avatar Selection Modes */}
            <div className="space-y-3">
              {/* Lựa chọn giới tính tượng trưng */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Giới tính (Xác định avatar mặc định)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectDefault('male')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                      gender === 'male' && !avatar
                        ? 'bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-950/40 dark:border-blue-500 dark:text-blue-200 font-bold ring-2 ring-blue-500/20'
                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-300'
                    }`}
                  >
                    <UserAvatar gender="male" size="sm" />
                    <div>
                      <p className="font-bold">👨 Cán bộ Nam</p>
                      <p className="text-[10px] text-slate-500">Chuẩn công chức (Vest cà vạt đỏ)</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectDefault('female')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                      gender === 'female' && !avatar
                        ? 'bg-rose-50 border-rose-500 text-rose-900 dark:bg-rose-950/40 dark:border-rose-500 dark:text-rose-200 font-bold ring-2 ring-rose-500/20'
                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-rose-300'
                    }`}
                  >
                    <UserAvatar gender="female" size="sm" />
                    <div>
                      <p className="font-bold">👩 Cán bộ Nữ</p>
                      <p className="text-[10px] text-slate-500">Chuẩn công chức (Áo dài truyền thống)</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Tải ảnh cá nhân từ máy tính */}
              <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Thêm ảnh cá nhân của bạn
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
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
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isUploading ? 'Đang nạp ảnh...' : 'Tải ảnh từ máy tính / điện thoại'}</span>
                  </button>

                  {avatar && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatar('');
                        setCustomAvatarUrl('');
                      }}
                      className="px-2.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Xóa ảnh cá nhân, quay về avatar tượng trưng mặc định"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Dùng mặc định</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Bộ sưu tập mẫu avatar công vụ có sẵn */}
              <div className="pt-2">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1.5">
                  Hoặc chọn nhanh từ danh mục mẫu ảnh công vụ:
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
                            handleSelectDefault('male');
                          } else if (preset.id === 'preset_female_official') {
                            handleSelectDefault('female');
                          } else {
                            handleSelectPreset(preset.url, preset.gender);
                          }
                        }}
                        className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-600 dark:bg-blue-950/50 ring-2 ring-blue-500'
                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-blue-400'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl overflow-hidden shadow-2xs">
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

              {/* Dán link ảnh URL */}
              <div className="pt-2">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Hoặc dán đường dẫn link ảnh (Image URL)
                </label>
                <div className="relative">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="url"
                    value={customAvatarUrl}
                    onChange={(e) => {
                      setCustomAvatarUrl(e.target.value);
                      setAvatar(e.target.value);
                    }}
                    placeholder="https://..."
                    className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PHẦN 2: THÔNG TIN CÁ NHÂN */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-gray-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-2">
              <UserIcon className="w-4 h-4 text-blue-600" />
              <span>2. Thông tin Cá nhân & Liên hệ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Họ và tên cán bộ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-100 font-semibold focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                />
              </div>

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
                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>
              </div>

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
                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Số điện thoại liên lạc
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PHẦN 3: ĐỔI MẬT KHẨU TÀI KHOẢN (TÙY CHỌN) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/40 border border-gray-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Lock className="w-4 h-4 text-amber-600" />
                <span>3. Bảo mật & Mật khẩu</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
              >
                {showPasswordSection ? 'Hủy đổi mật khẩu' : 'Đổi mật khẩu mới'}
              </button>
            </div>

            {showPasswordSection && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-gray-100 dark:border-slate-700 animate-in fade-in">
                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Mật khẩu cũ"
                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-100 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Mật khẩu mới
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-100 text-xs"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-medium text-slate-600 dark:text-slate-400">
                      Xác nhận mật khẩu
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? 'Ẩn' : 'Hiện'}
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-100 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-gray-200 cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu cập nhật'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
