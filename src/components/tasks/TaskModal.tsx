import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Task, TaskField, TaskPriority, TaskStatus, Attachment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../contexts/RealtimeContext';
import { apiService } from '../../services/api';
import { localVault } from '../../services/localVault';
import { useModalDraft } from '../../hooks/useModalDraft';
import { FileUpload } from '../common/FileUpload';
import { VietnameseDateInput } from '../common/VietnameseDateInput';
import { X, CheckCircle, AlertTriangle, Sparkles, Hash } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  onSuccess: () => void;
}

const generateAutoTaskCode = () => {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `NV-${yy}${mm}${dd}-${rand}`;
};

const TASK_FIELDS: TaskField[] = [
  'Đăng ký đất đai',
  'Cấp giấy lần đầu',
  'Chuyển mục đích',
  'Đăng ký biến động',
  'Tặng cho đất Nhà nước',
  'Thu hồi GCN',
  'Khoáng sản',
  'Môi trường',
  'Xử lý vi phạm hành chính',
  'Tranh chấp đất đai',
  'Bồi thường, hỗ trợ, GPMB',
  'Đo đạc và bản đồ',
  'Xây dựng CSDL đất đai',
  'Khác',
];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  onSuccess,
}) => {
  const { user, isAdmin, isLeader } = useAuth();
  const { users } = useRealtime();

  const isLeaderOrAdmin = Boolean(isAdmin || isLeader);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [selectedFieldType, setSelectedFieldType] = useState<string>('Cấp giấy lần đầu');
  const [customField, setCustomField] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [progress, setProgress] = useState(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [direction, setDirection] = useState('');
  const [note, setNote] = useState('');
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
      return;
    }

    const isNewlyOpened = !prevOpenRef.current && isOpen;
    const isEditTargetChanged = taskToEdit?.id !== prevEditIdRef.current;

    if (isNewlyOpened || isEditTargetChanged) {
      prevOpenRef.current = true;
      prevEditIdRef.current = taskToEdit?.id || null;

      if (taskToEdit) {
        setCode(taskToEdit.code || generateAutoTaskCode());
        setName(taskToEdit.name || '');
        const currentField = taskToEdit.field || 'Cấp giấy lần đầu';
        if (TASK_FIELDS.includes(currentField as any) && currentField !== 'Khác') {
          setSelectedFieldType(currentField);
          setCustomField('');
        } else if (currentField === 'Khác') {
          setSelectedFieldType('Khác');
          setCustomField('');
        } else {
          setSelectedFieldType('Khác');
          setCustomField(currentField);
        }
        setPriority(taskToEdit.priority || 'medium');
        setAssigneeId(taskToEdit.assigneeId || '');
        setStatus(taskToEdit.status || 'pending');
        setProgress(taskToEdit.progress ?? 0);
        setStartDate(taskToEdit.startDate || new Date().toISOString().split('T')[0]);
        setDueDate(taskToEdit.dueDate || '');
        setDirection(taskToEdit.direction || '');
        setNote(taskToEdit.note || '');
        setResult(taskToEdit.result || '');
        setAttachments(taskToEdit.attachments || []);
      } else {
        setCode(generateAutoTaskCode());
        setName('');
        setSelectedFieldType('Cấp giấy lần đầu');
        setCustomField('');
        setPriority('medium');
        // Default assignee: if not leader/admin, must be current user
        if (!isLeaderOrAdmin && user) {
          setAssigneeId(user.id);
        } else {
          const spec = users.find((u) => u.role === 'specialist') || users[0];
          setAssigneeId(spec?.id || '');
        }
        setStatus('pending');
        setProgress(0);
        setStartDate(new Date().toISOString().split('T')[0]);
        // Default 7 days ahead
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        setDueDate(nextWeek.toISOString().split('T')[0]);
        setDirection('');
        setNote('');
        setResult('');
        setAttachments([]);
      }
      setErrorMsg(null);
    }
  }, [isOpen, taskToEdit, isLeaderOrAdmin, user, users]);

  useEffect(() => {
    if (!isOpen) {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const taskDraftData = useMemo(
    () => ({
      code,
      name,
      selectedFieldType,
      customField,
      priority,
      assigneeId,
      status,
      progress,
      startDate,
      dueDate,
      direction,
      note,
      result,
    }),
    [
      code,
      name,
      selectedFieldType,
      customField,
      priority,
      assigneeId,
      status,
      progress,
      startDate,
      dueDate,
      direction,
      note,
      result,
    ]
  );

  const handleRestoreTaskDraft = useCallback((draft: typeof taskDraftData) => {
    if (draft.code) setCode(draft.code);
    if (draft.name) setName(draft.name);
    if (draft.selectedFieldType) setSelectedFieldType(draft.selectedFieldType);
    if (draft.customField !== undefined) setCustomField(draft.customField);
    if (draft.priority) setPriority(draft.priority);
    if (draft.assigneeId) setAssigneeId(draft.assigneeId);
    if (draft.status) setStatus(draft.status);
    if (draft.progress !== undefined) setProgress(draft.progress);
    if (draft.startDate) setStartDate(draft.startDate);
    if (draft.dueDate) setDueDate(draft.dueDate);
    if (draft.direction !== undefined) setDirection(draft.direction);
    if (draft.note !== undefined) setNote(draft.note);
    if (draft.result !== undefined) setResult(draft.result);
  }, []);

  const {
    lastSavedTime: draftSavedTime,
    isDraftSaving,
    hasRestoredDraft,
    restoredDraftTime,
    clearDraft,
    discardDraft,
  } = useModalDraft({
    formKey: `task_${taskToEdit?.id || 'new'}`,
    isOpen,
    isEditing: Boolean(taskToEdit),
    formData: taskDraftData,
    onRestore: handleRestoreTaskDraft,
    hasMeaningfulData: (data) => Boolean(data.name?.trim() || data.direction?.trim() || data.note?.trim()),
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setErrorMsg(null);

    if (taskToEdit && !isLeaderOrAdmin) {
      setErrorMsg('Chỉ có Admin và Lãnh đạo mới có quyền chỉnh sửa nhiệm vụ.');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Vui lòng nhập tên công việc / nhiệm vụ.');
      return;
    }
    if (selectedFieldType === 'Khác' && !customField.trim()) {
      setErrorMsg('Vui lòng nhập tên lĩnh vực cụ thể (hoặc chọn một lĩnh vực có sẵn).');
      return;
    }
    if (!assigneeId) {
      setErrorMsg('Vui lòng chọn cán bộ thực hiện.');
      return;
    }
    if (!dueDate) {
      setErrorMsg('Vui lòng chọn ngày hết hạn (deadline).');
      return;
    }

    const finalField: TaskField = selectedFieldType === 'Khác' ? customField.trim() : (selectedFieldType as TaskField);

    // MANDATORY COMPLETION CHECK
    if (status === 'completed') {
      const hasResultText = result && result.trim().length > 0;
      const hasResultFile = attachments && attachments.length > 0;
      if (!hasResultText && !hasResultFile) {
        setErrorMsg('Bắt buộc phải có kết quả xử lý hoặc ít nhất 01 tệp đính kèm kết quả để chuyển trạng thái "Đã hoàn thành".');
        return;
      }
    }

    submittingRef.current = true;
    try {
      setIsSubmitting(true);
      if (taskToEdit) {
        const updatedTask = await apiService.updateTask(taskToEdit.id, {
          code: code.trim() || undefined,
          name,
          field: finalField,
          priority,
          assigneeId,
          status,
          progress: status === 'completed' ? 100 : progress,
          startDate,
          dueDate,
          direction,
          note,
          result,
          attachments,
          updatedBy: user?.id,
          updatedByName: user?.name,
        });
        try {
          localVault.unmarkTaskDeleted(updatedTask.id, updatedTask.code);
          await localVault.upsertLocalTask(updatedTask);
        } catch (_) {}
      } else {
        const createdTask = await apiService.createTask({
          code: code.trim() || undefined,
          name,
          field: finalField,
          priority,
          assigneeId,
          status,
          progress: status === 'completed' ? 100 : progress,
          startDate,
          dueDate,
          direction,
          note,
          result,
          attachments,
          createdBy: user?.id,
          createdByName: user?.name,
        });
        try {
          localVault.unmarkTaskDeleted(createdTask.id, createdTask.code);
          await localVault.upsertLocalTask(createdTask);
        } catch (_) {}
      }

      if (status === 'completed' && (!taskToEdit || taskToEdit.status !== 'completed')) {
        try {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        } catch (e) {}
      }

      clearDraft();
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu công việc');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Sticky Header - Always fully visible at top */}
        <div className="px-4 sm:px-5 py-3.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                {taskToEdit ? `Mã: ${taskToEdit.code}` : 'Tạo mới nhiệm vụ'}
              </span>
              {draftSavedTime && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium" title="Bản nháp được lưu định kỳ vào bộ nhớ máy tính để chống mất dữ liệu khi tắt máy">
                  <span className={`w-1.5 h-1.5 rounded-full ${isDraftSaving ? 'bg-amber-500 animate-ping' : 'bg-blue-500'}`} />
                  <span>{isDraftSaving ? 'Đang lưu nháp...' : `Đã lưu nháp lúc ${draftSavedTime}`}</span>
                </span>
              )}
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              {taskToEdit ? 'Chỉnh sửa công việc' : 'Giao việc & Quản lý tiến độ'}
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
            {hasRestoredDraft && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[11px] leading-relaxed">
                    Đã khôi phục dữ liệu nhiệm vụ bạn đang nhập dở lúc <strong>{restoredDraftTime}</strong> để chống mất mát do gián đoạn.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    discardDraft();
                    if (!taskToEdit) {
                      setName('');
                      setDirection('');
                      setNote('');
                    }
                  }}
                  className="px-2 py-1 rounded-lg bg-white hover:bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-bold transition cursor-pointer shrink-0 self-end sm:self-auto"
                >
                  Xóa nháp & Nhập mới
                </button>
              </div>
            )}

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Task Code: Manual input + Auto generate button */}
            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-blue-950 text-xs flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-blue-700" />
                  <span>Mã công việc / Nhiệm vụ (Tự động hoặc Nhập thủ công)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setCode(generateAutoTaskCode())}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-100 text-blue-800 text-[11px] font-bold border border-blue-300 shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="Tạo mã nhiệm vụ tự động"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tạo mã tự động</span>
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="VD: NV-260822-1001 hoặc CV-2026-005"
                  className="w-full bg-white border border-blue-300 font-mono font-bold text-blue-900 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                />
              </div>
              <p className="text-[10px] text-blue-700">
                * Bạn có thể tự gõ mã nhiệm vụ theo nhu cầu hoặc bấm "Tạo mã tự động" để sinh mã chuẩn.
              </p>
            </div>

          {/* Name */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Tên công việc / Nội dung nhiệm vụ <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập chi tiết nội dung công việc cần thực hiện..."
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-xs"
            />
          </div>

          {/* Field & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Lĩnh vực đất đai <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedFieldType}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedFieldType(val);
                  if (val !== 'Khác') {
                    setCustomField('');
                  }
                }}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
              >
                {TASK_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {f === 'Khác' ? 'Khác (Nhập lĩnh vực riêng...)' : f}
                  </option>
                ))}
              </select>

              {selectedFieldType === 'Khác' && (
                <div className="mt-2 p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg animate-in fade-in slide-in-from-top-1 duration-150 space-y-1">
                  <label className="block text-[11px] font-bold text-blue-900">
                    Tên lĩnh vực khác (nhập tự do): <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customField}
                    onChange={(e) => setCustomField(e.target.value)}
                    placeholder="VD: Đấu giá QSDĐ, Kế hoạch sử dụng đất, Trích đo địa chính..."
                    className="w-full bg-white border border-blue-300 rounded-md px-2.5 py-1.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-medium"
                  />
                  <p className="text-[10px] text-blue-700">
                    * Bạn có thể tự do gõ tên lĩnh vực mới. Tên lĩnh vực này sẽ lưu trực tiếp vào nhiệm vụ.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Độ ưu tiên <span className="text-rose-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
              >
                <option value="low">Thấp</option>
                <option value="medium">Trung bình</option>
                <option value="high">Cao</option>
                <option value="urgent">Khẩn cấp (Hỏa tốc)</option>
              </select>
            </div>
          </div>

          {/* Assignee & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cán bộ thực hiện <span className="text-rose-500">*</span>
              </label>
              {isLeaderOrAdmin ? (
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role === 'admin' ? 'Admin' : u.role === 'leader' ? 'Lãnh đạo' : 'Chuyên viên'})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs font-semibold flex items-center justify-between">
                  <span>{users.find((u) => u.id === assigneeId)?.name || user?.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Cá nhân)</span>
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ngày bắt đầu (dd/mm/yyyy)</label>
              <VietnameseDateInput
                value={startDate}
                disabled={!isLeaderOrAdmin && Boolean(taskToEdit)}
                onChange={(val) => setStartDate(val)}
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Hạn chót (dd/mm/yyyy) <span className="text-rose-500">*</span>
              </label>
              <VietnameseDateInput
                required
                value={dueDate}
                disabled={!isLeaderOrAdmin && Boolean(taskToEdit)}
                onChange={(val) => setDueDate(val)}
              />
            </div>
          </div>

          {/* Status & Progress */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Trạng thái</label>
              <select
                value={status}
                onChange={(e) => {
                  const newStatus = e.target.value as TaskStatus;
                  setStatus(newStatus);
                  if (newStatus === 'completed') setProgress(100);
                  if (newStatus === 'pending') setProgress(0);
                }}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
              >
                <option value="pending">Chưa làm</option>
                <option value="in_progress">Đang làm</option>
                <option value="completed">Đã hoàn thành</option>
                <option value="overdue">Quá hạn</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Tiến độ ({progress}%)</label>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full accent-blue-600 h-2 bg-gray-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Direction from leaders */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ý kiến chỉ đạo của Lãnh đạo
            </label>
            {isLeaderOrAdmin ? (
              <input
                type="text"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                placeholder="Chỉ đạo cụ thể từ Lãnh đạo UBND xã..."
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
              />
            ) : direction ? (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-medium text-xs">
                {direction}
              </div>
            ) : (
              <p className="text-slate-400 italic text-[11px] p-2 bg-slate-50 rounded-lg border border-slate-200">
                Chưa có ý kiến chỉ đạo từ Lãnh đạo.
              </p>
            )}
          </div>

          {/* Result Section (Required when completing) */}
          <div
            className={`p-3 rounded-xl border transition-all ${
              status === 'completed'
                ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400/30'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                Kết quả xử lý {status === 'completed' && <span className="text-rose-600 font-bold">* (Bắt buộc)</span>}
              </label>
              {status === 'completed' && (
                <span className="text-[10px] text-emerald-700 font-medium">Bắt buộc có kết quả hoặc tệp</span>
              )}
            </div>
            <textarea
              rows={2}
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="Nhập nội dung tóm tắt kết quả xử lý / số văn bản ban hành / biên bản nghiệm thu..."
              className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
            />
          </div>

          {/* Attachments */}
          <FileUpload
            attachments={attachments}
            onChange={setAttachments}
            isResult={status === 'completed'}
            label={status === 'completed' ? 'Tệp đính kèm kết quả hoàn thành' : 'Tệp hồ sơ tài liệu đính kèm'}
          />
        </div>

        {/* Sticky Actions Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
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
            {isSubmitting ? 'Đang lưu...' : taskToEdit ? 'Cập nhật nhiệm vụ' : 'Giao việc ngay'}
          </button>
        </div>
      </form>
    </div>
  </div>
);
};
