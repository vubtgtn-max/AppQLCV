import React, { useState } from 'react';
import { Task, Attachment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { localVault } from '../../services/localVault';
import { FileUpload } from '../common/FileUpload';
import { formatDate, getDaysRemaining, formatFileSize } from '../../utils/date';
import {
  X,
  Calendar,
  User as UserIcon,
  Tag,
  CheckCircle2,
  AlertCircle,
  FileText,
  MessageSquare,
  Edit3,
  Trash2,
  Download,
  Share2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onRefresh: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  onClose,
  onEdit,
  onDelete,
  onRefresh,
}) => {
  const { user, canEditTask, canDeleteTask } = useAuth();
  const [isCompleting, setIsCompleting] = useState(false);
  const [completeResult, setCompleteResult] = useState('');
  const [resultFiles, setResultFiles] = useState<Attachment[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const updatingRef = React.useRef(false);

  React.useEffect(() => {
    if (!task) {
      updatingRef.current = false;
      setIsUpdating(false);
    }
  }, [task]);

  if (!task) return null;

  const remaining = getDaysRemaining(task.dueDate);

  const handleCompleteQuick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updatingRef.current) return;
    if (!completeResult.trim() && resultFiles.length === 0) {
      setErrorMsg('Bắt buộc phải nhập kết quả xử lý hoặc tải lên tệp đính kèm kết quả.');
      return;
    }

    updatingRef.current = true;
    try {
      setIsUpdating(true);
      setErrorMsg(null);
      const updated = await apiService.updateTask(task.id, {
        status: 'completed',
        progress: 100,
        result: completeResult,
        attachments: [...task.attachments, ...resultFiles],
        updatedBy: user?.id,
        updatedByName: user?.name,
      });

      try {
        await localVault.upsertLocalTask(updated);
      } catch (_) {}

      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}

      setIsCompleting(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi cập nhật hoàn thành');
    } finally {
      updatingRef.current = false;
      setIsUpdating(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'high':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'medium':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-slate-700 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] text-xs text-slate-800">
        {/* Sticky Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs">
              {task.code}
            </span>
            <span className={`px-2 py-0.5 rounded-md border font-semibold text-[10px] uppercase ${getPriorityBadge(task.priority)}`}>
              {task.priority === 'urgent'
                ? 'Hỏa tốc'
                : task.priority === 'high'
                ? 'Ưu tiên cao'
                : task.priority === 'medium'
                ? 'Trung bình'
                : 'Thấp'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {canEditTask(task) && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(task);
                }}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-gray-200 transition-colors cursor-pointer"
                title="Chỉnh sửa"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {canDeleteTask(task) && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(task);
                }}
                className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Xóa"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-gray-200 transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
          <div>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{task.field}</span>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5 leading-snug">{task.name}</h2>
          </div>

          {/* Key metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <div>
              <p className="text-[10px] text-slate-500 font-medium">Cán bộ thực hiện</p>
              <p className="font-bold text-slate-900 mt-0.5">{task.assigneeName || 'Chưa giao'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium">Hạn chót (Deadline)</p>
              <p className={`font-bold mt-0.5 ${remaining.statusClass}`}>
                {formatDate(task.dueDate)} ({remaining.label})
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium">Trạng thái</p>
              <span
                className={`inline-block mt-0.5 px-2 py-0.5 rounded-md font-bold text-[10px] ${
                  task.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : task.status === 'overdue'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : task.status === 'in_progress'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-slate-700 border border-gray-200'
                }`}
              >
                {task.status === 'completed'
                  ? 'Đã hoàn thành'
                  : task.status === 'overdue'
                  ? 'Quá hạn'
                  : task.status === 'in_progress'
                  ? 'Đang làm'
                  : 'Chưa làm'}
              </span>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium">Tiến độ</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      task.progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${task.progress}%` }}
                  ></div>
                </div>
                <span className="font-bold text-slate-800 text-[11px]">{task.progress}%</span>
              </div>
            </div>
          </div>

          {/* Direction from Leadership */}
          {task.direction && (
            <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200 text-blue-900">
              <div className="flex items-center gap-1.5 font-bold text-blue-800 mb-0.5 text-xs">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                Ý kiến chỉ đạo của Lãnh đạo UBND
              </div>
              <p className="text-slate-700 leading-relaxed text-xs">{task.direction}</p>
            </div>
          )}

          {/* Note */}
          {task.note && (
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
              <p className="font-semibold text-slate-500 mb-0.5 text-[11px]">Ghi chú nghiệp vụ:</p>
              <p className="text-slate-700 leading-relaxed text-xs">{task.note}</p>
            </div>
          )}

          {/* Results section */}
          {task.result && (
            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 mb-0.5 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Kết quả xử lý nhiệm vụ:
              </div>
              <p className="text-slate-800 leading-relaxed font-medium text-xs">{task.result}</p>
            </div>
          )}

          {/* Attachments List */}
          <div>
            <h4 className="font-bold text-slate-800 mb-2 flex items-center justify-between text-xs">
              <span>Tệp tài liệu đính kèm ({task.attachments.length})</span>
            </h4>
            {task.attachments.length === 0 ? (
              <p className="text-slate-400 italic text-xs">Không có tệp đính kèm nào.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {task.attachments.map((file) => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2.5 rounded-xl bg-white border border-gray-200 hover:border-blue-400 flex items-center justify-between gap-2 group transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="truncate">
                        <p className="font-semibold text-slate-800 group-hover:text-blue-600 truncate text-xs">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {formatFileSize(file.size)} {file.isResult ? '• [Minh chứng]' : ''}
                        </p>
                      </div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick complete box */}
          {task.status !== 'completed' && (
            <div className="border-t border-gray-200 pt-3">
              {!isCompleting ? (
                <button
                  type="button"
                  onClick={() => setIsCompleting(true)}
                  className="w-full py-2 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 transition-colors shadow-xs text-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Báo cáo hoàn thành nhiệm vụ này
                </button>
              ) : (
                <form onSubmit={handleCompleteQuick} className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-emerald-800 flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Xác nhận hoàn thành & Nộp kết quả
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsCompleting(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px]">
                      {errorMsg}
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1 text-xs">
                      Nội dung kết quả xử lý <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={completeResult}
                      onChange={(e) => setCompleteResult(e.target.value)}
                      placeholder="Mô tả kết quả đã đạt được, số văn bản đã ban hành..."
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                    />
                  </div>

                  <FileUpload
                    attachments={resultFiles}
                    onChange={setResultFiles}
                    isResult={true}
                    label="Tải lên tệp minh chứng kết quả (nếu có)"
                  />

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCompleting(false)}
                      className="px-3 py-1 rounded-lg text-slate-600 hover:bg-gray-100 text-xs"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="px-3 py-1 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs text-xs"
                    >
                      {isUpdating ? 'Đang lưu...' : 'Hoàn tất'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
