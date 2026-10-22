import React, { useState } from 'react';
import {
  X,
  Send,
  Bell,
  MessageSquare,
  Mail,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Info,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { AlertChannel, User } from '../../types';
import { apiService } from '../../services/api';
import { useRealtime } from '../../contexts/RealtimeContext';

interface QuickAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'task' | 'dossier' | 'document';
  targetId: string;
  targetCode: string;
  targetTitle: string;
  dueDate?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneePhone?: string;
  assigneeEmail?: string;
}

export const QuickAlertModal: React.FC<QuickAlertModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetCode,
  targetTitle,
  dueDate,
  assigneeId,
  assigneeName,
  assigneePhone,
  assigneeEmail,
}) => {
  const { users, refreshData } = useRealtime();
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(assigneeId || (users[0]?.id ?? ''));
  const [selectedChannels, setSelectedChannels] = useState<AlertChannel[]>(['zalo', 'telegram', 'email', 'sms']);
  const [customTitle, setCustomTitle] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const sendingRef = React.useRef(false);
  const [isCopied, setIsCopied] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      sendingRef.current = false;
      setIsSending(false);
    }
  }, [isOpen]);

  // Initialize prefilled message
  React.useEffect(() => {
    if (isOpen) {
      const recipient = users.find((u) => u.id === (assigneeId || selectedRecipientId)) || users[0];
      const rName = recipient ? recipient.name : assigneeName || 'Cán bộ';

      // Compute remaining days
      let daysRemainingText = '';
      if (dueDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff < 0) {
          daysRemainingText = ` (ĐÃ QUÁ HẠN ${Math.abs(diff)} ngày)`;
        } else if (diff === 0) {
          daysRemainingText = ' (HẠN CHÓT HÔM NAY)';
        } else {
          daysRemainingText = ` (Còn ${diff} ngày nữa đến hạn)`;
        }
      }

      const typeLabel = targetType === 'task' ? 'Nhiệm vụ' : targetType === 'dossier' ? 'Hồ sơ đất đai' : 'Văn bản';
      setCustomTitle(`🔔 Nhắc việc: [${targetCode}] ${typeLabel}`);
      setCustomMessage(
        `Kính gửi Đ/c ${rName},\n\n` +
          `Hệ thống xin thông báo ${typeLabel.toLowerCase()} [${targetCode}] "${targetTitle}"${daysRemainingText}.\n` +
          (dueDate ? `Hạn xử lý: ${dueDate}.\n` : '') +
          `Đề nghị Đ/c khẩn trương rà soát thẩm tra, đẩy nhanh tiến độ và báo cáo Lãnh đạo phòng theo đúng quy chế.`
      );
      setResultMsg(null);
    }
  }, [isOpen, targetId, assigneeId, users]);

  if (!isOpen) return null;

  const toggleChannel = (ch: AlertChannel) => {
    if (selectedChannels.includes(ch)) {
      if (selectedChannels.length === 1) return; // keep at least 1
      setSelectedChannels(selectedChannels.filter((c) => c !== ch));
    } else {
      setSelectedChannels([...selectedChannels, ch]);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sendingRef.current) return;
    if (selectedChannels.length === 0) {
      setResultMsg({ type: 'error', text: 'Vui lòng chọn ít nhất 1 kênh liên lạc' });
      return;
    }

    sendingRef.current = true;
    try {
      setIsSending(true);
      setResultMsg(null);
      const res = await apiService.sendDirectAlert({
        targetType,
        targetId,
        targetCode,
        recipientId: selectedRecipientId,
        channels: selectedChannels,
        customTitle,
        customContent: customMessage,
        trigger: 'manual_dispatch',
      });

      setResultMsg({ type: 'success', text: res.message || 'Đã gửi cảnh báo thành công!' });
      refreshData();
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setResultMsg({ type: 'error', text: err.message || 'Lỗi khi gửi cảnh báo' });
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  const recipientObj = users.find((u) => u.id === selectedRecipientId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-linear-to-r from-blue-600 via-indigo-600 to-sky-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Gửi cảnh báo & Nhắc việc Đa Kênh</h3>
              <p className="text-xs text-blue-100">
                {targetType === 'task' ? 'Nhiệm vụ' : targetType === 'dossier' ? 'Hồ sơ đất đai' : 'Văn bản'}:{' '}
                <span className="font-mono font-bold bg-white/20 px-1.5 py-0.5 rounded">{targetCode}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSend} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {resultMsg && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2.5 text-sm ${
                resultMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {resultMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{resultMsg.text}</span>
            </div>
          )}

          {/* Target Summary Card */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Đối tượng cảnh báo
            </div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">{targetTitle}</div>
            {dueDate && (
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                <Clock className="w-3.5 h-3.5" />
                <span>Hạn chót: {dueDate}</span>
              </div>
            )}
          </div>

          {/* Select Recipient */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Cán bộ nhận cảnh báo
            </label>
            <select
              value={selectedRecipientId}
              onChange={(e) => setSelectedRecipientId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="all">📢 Toàn thể cán bộ trong phòng (Phát thanh chung)</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {u.position} {u.phone ? `(${u.phone})` : ''}
                </option>
              ))}
            </select>
            {recipientObj && (
              <div className="mt-1.5 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                {recipientObj.phone && <span>📞 SĐT: <b>{recipientObj.phone}</b></span>}
                {recipientObj.email && <span>✉️ Email: <b>{recipientObj.email}</b></span>}
                {recipientObj.scope && <span>📍 Địa bàn: {recipientObj.scope}</span>}
              </div>
            )}
          </div>

          {/* Channel Selectors */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Kênh phát cảnh báo (Chọn nhiều kênh để gửi đồng thời)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Zalo OA */}
              <button
                type="button"
                onClick={() => toggleChannel('zalo')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  selectedChannels.includes('zalo')
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 opacity-60'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  Z
                </div>
                <span>Zalo OA</span>
              </button>

              {/* Telegram */}
              <button
                type="button"
                onClick={() => toggleChannel('telegram')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  selectedChannels.includes('telegram')
                    ? 'bg-sky-50 dark:bg-sky-950/50 border-sky-500 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 opacity-60'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  <Send className="w-3.5 h-3.5" />
                </div>
                <span>Telegram</span>
              </button>

              {/* Email */}
              <button
                type="button"
                onClick={() => toggleChannel('email')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  selectedChannels.includes('email')
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 opacity-60'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <span>Email công vụ</span>
              </button>

              {/* SMS */}
              <button
                type="button"
                onClick={() => toggleChannel('sms')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  selectedChannels.includes('sms')
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 opacity-60'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <span>SMS Brand</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tiêu đề thông báo
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white"
              required
            />
          </div>

          {/* Content Message */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nội dung chi tiết (Đã tự động điền sẵn)
              </label>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(customMessage);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2500);
                }}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/50 transition cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Đã sao chép nội dung!' : '📋 Sao chép tin nhắn'}</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
              required
            />
          </div>

          {/* Direct Personal Zalo / SMS Quick Action */}
          {recipientObj?.phone && (
            <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800 dark:text-blue-200">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>Nhắn trực tiếp qua Zalo cá nhân ({recipientObj.name}):</span>
                </div>
                <div className="text-[11px] text-blue-600 dark:text-blue-300 mt-0.5">
                  Bấm sao chép ➔ Bấm <b>"Mở Zalo Chat"</b> ➔ Dán tin nhắn gửi ngay!
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(customMessage);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2500);
                  }}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 rounded-lg text-xs font-medium hover:bg-blue-50 transition cursor-pointer flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isCopied ? 'Đã sao chép' : 'Copy tin'}</span>
                </button>
                <a
                  href={`https://zalo.me/${recipientObj.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-1 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở Zalo Chat</span>
                </a>
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSending ? 'Đang phát cảnh báo...' : 'Phát cảnh báo ngay'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
