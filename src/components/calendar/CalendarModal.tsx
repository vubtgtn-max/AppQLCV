import React, { useState, useEffect } from 'react';
import { CalendarEvent, CalendarEventType, Attachment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../contexts/RealtimeContext';
import { apiService } from '../../services/api';
import { FileUpload } from '../common/FileUpload';
import { VietnameseDateInput } from '../common/VietnameseDateInput';
import { VillageAddressInput } from '../common/VillageAddressInput';
import { X, Calendar as CalendarIcon, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: CalendarEvent | null;
  onDelete?: (event: CalendarEvent) => void;
  onSuccess: () => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  isOpen,
  onClose,
  eventToEdit,
  onDelete,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { users } = useRealtime();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('08:00');
  const [type, setType] = useState<CalendarEventType>('task');
  const [name, setName] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState<0 | 25 | 50 | 75 | 100>(0);
  const [result, setResult] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = React.useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const prevOpenRef = React.useRef(false);
  const prevEditIdRef = React.useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) {
      prevOpenRef.current = false;
      prevEditIdRef.current = undefined;
      submittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const isNewlyOpened = !prevOpenRef.current && isOpen;
    const isEditTargetChanged = eventToEdit?.id !== prevEditIdRef.current;

    if (isNewlyOpened || isEditTargetChanged) {
      prevOpenRef.current = true;
      prevEditIdRef.current = eventToEdit?.id || null;

      if (eventToEdit) {
        setDate(eventToEdit.date || new Date().toISOString().split('T')[0]);
        setTime(eventToEdit.time || '08:00');
        setType(eventToEdit.type || 'task');
        setName(eventToEdit.name || '');
        setAssigneeId(eventToEdit.assigneeId || '');
        setLocation(eventToEdit.location || '');
        setNote(eventToEdit.note || '');
        setProgress(eventToEdit.progress ?? 0);
        setResult(eventToEdit.result || '');
        setAttachments(eventToEdit.attachments || []);
      } else {
        setDate(new Date().toISOString().split('T')[0]);
        setTime('08:30');
        setType('meeting');
        setName('');
        setAssigneeId(user?.id || users[0]?.id || '');
        setLocation('UBND xã Lãnh Ngọc');
        setNote('');
        setProgress(0);
        setResult('');
        setAttachments([]);
      }
      setErrorMsg(null);
    }
  }, [isOpen, eventToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setErrorMsg(null);

    if (!name.trim() || !date) {
      setErrorMsg('Vui lòng nhập ngày và tiêu đề lịch công tác.');
      return;
    }

    // MANDATORY COMPLETION CHECK FOR 100%
    if (progress === 100) {
      const hasResult = result && result.trim().length > 0;
      const hasFile = attachments && attachments.length > 0;
      if (!hasResult && !hasFile) {
        setErrorMsg('Khi tiến độ đạt 100%, bắt buộc phải có kết quả hoặc tệp kết quả đính kèm.');
        return;
      }
    }

    submittingRef.current = true;
    try {
      setIsSubmitting(true);
      if (eventToEdit) {
        await apiService.updateCalendarEvent(eventToEdit.id, {
          date,
          time,
          type,
          name,
          assigneeId,
          location,
          note,
          progress,
          result,
          attachments,
        });
      } else {
        await apiService.createCalendarEvent({
          date,
          time,
          type,
          name,
          assigneeId,
          location,
          note,
          progress,
          result,
          attachments,
          createdBy: user?.id,
          createdByName: user?.name,
        });
      }

      if (progress === 100 && (!eventToEdit || eventToEdit.progress !== 100)) {
        try {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        } catch (e) {}
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu lịch');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Sticky Header - Always visible at top */}
        <div className="px-4 sm:px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              {eventToEdit ? 'Chỉnh sửa lịch & Deadline' : 'Thêm lịch công tác / Deadline'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-gray-200 transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col justify-between p-0">
          {/* Scrollable Form Body */}
          <div className="p-4 sm:p-5 space-y-3.5 text-xs">
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tiêu đề lịch / Báo cáo / Nhiệm vụ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Họp hội đồng xét duyệt đất đai đợt tháng 8..."
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Loại sự kiện</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as CalendarEventType)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                >
                  <option value="meeting">Lịch công tác / Họp</option>
                  <option value="task">Công việc</option>
                  <option value="report">Báo cáo định kỳ</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ngày diễn ra (dd/mm/yyyy)</label>
                <VietnameseDateInput
                  required
                  value={date}
                  onChange={(val) => setDate(val)}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Giờ diễn ra</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cán bộ phụ trách</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <VillageAddressInput
                  label="Địa điểm / Thôn xóm"
                  mode="location"
                  placeholder="VD: Thôn Tiên Hiệp (hoặc Hội trường tầng 2 / Thực địa...)"
                  value={location}
                  onChange={(val) => setLocation(val)}
                />
              </div>
            </div>

            {/* Progress (0%, 25%, 50%, 75%, 100%) */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Tiến độ thực hiện: <span className="text-blue-600 font-bold">{progress}%</span>
              </label>
              <div className="grid grid-cols-5 gap-2">
                {([0, 25, 50, 75, 100] as const).map((step) => (
                  <button
                    type="button"
                    key={step}
                    onClick={() => setProgress(step)}
                    className={`py-1.5 rounded-lg font-bold border transition-colors text-xs cursor-pointer ${
                      progress === step
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-white border-gray-300 text-slate-700 hover:bg-gray-50'
                    }`}
                  >
                    {step}%
                  </button>
                ))}
              </div>
            </div>

            {/* Result Section (Required at 100%) */}
            <div
              className={`p-3 rounded-xl border transition-all ${
                progress === 100
                  ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400/30'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Kết quả / Biên bản họp {progress === 100 && <span className="text-rose-600">* (Bắt buộc)</span>}
                </label>
              </div>
              <textarea
                rows={2}
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="Nhập nội dung kết luận cuộc họp hoặc kết quả thực hiện..."
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
              />
            </div>

            <FileUpload
              attachments={attachments}
              onChange={setAttachments}
              isResult={progress === 100}
              label="Tệp đính kèm tài liệu / Biên bản"
            />
          </div>

          {/* Sticky Actions Footer */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
            <div>
              {eventToEdit && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDelete(eventToEdit);
                  }}
                  className="px-3 py-1.5 rounded-lg font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 flex items-center gap-1.5 text-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa lịch này</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg font-semibold text-slate-600 hover:bg-gray-200 transition-colors text-xs cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-colors shadow-xs disabled:opacity-50 text-xs cursor-pointer"
              >
                {isSubmitting ? 'Đang lưu...' : eventToEdit ? 'Cập nhật lịch' : 'Thêm lịch mới'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
