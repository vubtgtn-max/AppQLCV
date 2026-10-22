import React, { useState, useEffect } from 'react';
import {
  Send,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  BellRing,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useRealtime } from '../../contexts/RealtimeContext';
import { apiService } from '../../services/api';

interface TelegramConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToAlertsPage?: () => void;
}

export const TelegramConfigModal: React.FC<TelegramConfigModalProps> = ({
  isOpen,
  onClose,
  onNavigateToAlertsPage,
}) => {
  const { settings, refreshData } = useRealtime();

  const [isEnabled, setIsEnabled] = useState(true);
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [groupName, setGroupName] = useState('');

  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; note: string } | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (settings?.alertConfig) {
      const tg = settings.alertConfig.telegram || {};
      setIsEnabled(settings.alertConfig.enabledChannels?.telegram !== false);
      setBotToken(tg.botToken || '');
      setChatId(tg.chatIdDefault || '');
      setGroupName(tg.groupName || 'Nhóm Điều hành Phòng Kinh tế & Đất đai');
    }
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveSuccessMsg('');
      setTestResult(null);

      const currentAlertConfig = settings?.alertConfig || ({} as any);
      const updatedConfig = {
        ...currentAlertConfig,
        enabledChannels: {
          ...(currentAlertConfig.enabledChannels || {}),
          telegram: isEnabled,
        },
        telegram: {
          ...(currentAlertConfig.telegram || {}),
          botToken: botToken.trim(),
          chatIdDefault: chatId.trim(),
          groupName: groupName.trim() || 'Nhóm Điều hành Phòng Kinh tế & Đất đai',
        },
      };

      await apiService.updateAlertConfig(updatedConfig);
      setSaveSuccessMsg('Đã lưu cấu hình nhắc việc qua Telegram thành công!');
      refreshData();
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err: any) {
      alert('Lỗi lưu cấu hình Telegram: ' + (err.message || 'Thất bại'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      setTestResult({
        success: false,
        note: 'Vui lòng nhập đầy đủ Telegram Bot Token và Chat ID trước khi kiểm tra!',
      });
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await apiService.testAlertChannel({
        channel: 'telegram',
        botToken: botToken.trim(),
        chatId: chatId.trim(),
        testMessage: `🔔 KIỂM TRA KẾT NỐI TELEGRAM BOT THÀNH CÔNG!\n\n• Hệ thống: QLCV Đất đai & Điều hành công vụ\n• Đơn vị: ${settings?.unitName || 'UBND Xã'}\n• Thời gian: ${new Date().toLocaleString('vi-VN')}\n• Trạng thái: Kênh thông báo sẵn sàng tự động nhắc việc 20 ngày trước hạn!`,
      });

      if (res && res.success) {
        setTestResult({
          success: true,
          note: res.log?.responseNote || res.message || 'Gửi tin nhắn Telegram thành công 100%!',
        });
      } else {
        setTestResult({
          success: false,
          note: res.log?.responseNote || res.message || 'Lỗi gửi tin thử nghiệm từ máy chủ Telegram.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        note: 'Lỗi kết nối máy chủ Telegram: ' + (err.message || 'Kiểm tra lại Bot Token và Chat ID'),
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-linear-to-r from-sky-600 via-sky-700 to-blue-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs shadow-xs">
              <Send className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold leading-tight">Cấu hình Nhắc việc qua Telegram</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white uppercase tracking-wider">
                  Bot Điều Hành
                </span>
              </div>
              <p className="text-xs text-sky-100 mt-0.5">
                Tự động nhắc hạn công việc & hồ sơ đất đai trực tiếp vào Nhóm Telegram
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs sm:text-sm">
          {/* Thông báo lưu thành công */}
          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold text-xs">{saveSuccessMsg}</span>
            </div>
          )}

          {/* Công tắc Bật/Tắt Kênh Telegram */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                Kích hoạt chế độ nhắc việc tự động qua Telegram
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Khi bật, hệ thống sẽ tự động quét các việc sắp đến hạn (20 ngày trước hạn) và bắn tin vào nhóm vào 07:30 và 13:30 mỗi ngày.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
            </label>
          </div>

          {/* Form Thông số Bot */}
          <div className="space-y-3">
            {/* Bot Token */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Telegram Bot Token <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowGuide(!showGuide)}
                  className="text-[11px] text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Cách lấy Token từ @BotFather?</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="Ví dụ: 7891234567:AAHxyz_kQ1234567890abcdef..."
                  className="w-full px-3 py-2 pr-16 text-xs sm:text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-slate-800 dark:text-slate-100"
                />
                <div className="absolute right-2 top-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showToken ? 'Ẩn Token' : 'Hiện Token'}
                  >
                    {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(botToken, 'token')}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title="Sao chép"
                  >
                    {copiedField === 'token' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Chuỗi mã khóa bí mật do <b>@BotFather</b> cấp khi bạn tạo Bot trên Telegram.
              </p>
            </div>

            {/* Chat ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Chat ID Nhóm Telegram (Bắt đầu bằng dấu trừ -) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="Ví dụ: -1002345678901 hoặc -987654321"
                  className="w-full px-3 py-2 pr-10 text-xs sm:text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-slate-800 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(chatId, 'chatId')}
                  className="absolute right-2 top-2 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Sao chép"
                >
                  {copiedField === 'chatId' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                ID của Nhóm chat làm việc trên Telegram. Đối với nhóm, Chat ID <b>luôn luôn có dấu trừ (-)</b> ở đầu.
              </p>
            </div>

            {/* Tên nhóm */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tên Nhóm / Phòng ban hiển thị
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="VD: Nhóm Điều hành Địa chính & Đất đai Xã Lãnh Ngọc"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 outline-none text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Test Connection Box */}
          <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-200 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>Kiểm tra kết nối gửi tin thử nghiệm</span>
              </div>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !botToken || !chatId}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{isTesting ? 'Đang gửi thử...' : '🧪 Bắn tin Telegram kiểm tra ngay'}</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-start gap-2 border ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 text-rose-800 dark:text-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-semibold">{testResult.note}</p>
                  {!testResult.success && (
                    <p className="text-[11px] opacity-90">
                      💡 Mẹo: Đảm bảo bạn đã <b>Thêm Bot vào Nhóm</b> và <b>Cấp quyền Quản trị viên (Admin)</b> cho Bot trong nhóm Telegram!
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Hướng dẫn 3 bước tạo bot Telegram (Collapsible or expand) */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between text-left font-bold text-slate-700 dark:text-slate-200 text-xs cursor-pointer hover:bg-slate-100"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-sky-600" />
                <span>Hướng dẫn 3 bước cài đặt Telegram Bot (Chỉ mất 1 phút)</span>
              </div>
              <span className="text-sky-600 text-xs font-semibold">{showGuide ? 'Thu gọn ▲' : 'Xem chi tiết ▼'}</span>
            </button>

            {showGuide && (
              <div className="p-3.5 bg-white dark:bg-slate-900 space-y-2.5 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-200 dark:border-slate-800">
                <div className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">Tạo Bot và lấy Token từ @BotFather</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Mở ứng dụng Telegram, tìm kiếm tài khoản <b>@BotFather</b> (có tích xanh), gõ lệnh <code>/newbot</code>. Đặt tên Bot (VD: <i>Bot Nhắc Việc Địa Chính</i>) và username (kết thúc bằng từ bot, VD: <i>danang_diachinh_bot</i>). BotFather sẽ gửi cho bạn một chuỗi <b>HTTP API Token</b>.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </span>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">Thêm Bot vào Nhóm và cấp quyền Admin</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Vào Nhóm chat điều hành công vụ trên Telegram của cơ quan, bấm <b>Thêm thành viên (Add Members)</b> và thêm con Bot vừa tạo vào. Bắt buộc vào cài đặt nhóm, nâng quyền Bot lên thành <b>Quản trị viên (Admin)</b> để Bot có thể đọc và gửi tin nhắn tự động.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </span>
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">Lấy Chat ID của nhóm</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Thêm tạm thời bot <b>@userinfobot</b> hoặc <b>@RawDataBot</b> vào nhóm chat của bạn, bot sẽ lập tức phản hồi một mã Chat ID (luôn có dấu trừ ở đầu, ví dụ: <code>-1002345678901</code>). Sao chép mã đó dán vào ô Chat ID ở trên, rồi xóa bot phụ đi.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700">
          <div>
            {onNavigateToAlertsPage && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToAlertsPage();
                }}
                className="text-xs text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Mở Trung tâm Điều hành Cảnh báo & Đa kênh</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-xs cursor-pointer"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Đang lưu...' : 'Lưu cấu hình Telegram'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
