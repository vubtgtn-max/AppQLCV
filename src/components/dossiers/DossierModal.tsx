import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dossier, DossierStatus, Attachment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../contexts/RealtimeContext';
import { apiService } from '../../services/api';
import { localVault } from '../../services/localVault';
import { useModalDraft } from '../../hooks/useModalDraft';
import { FileUpload } from '../common/FileUpload';
import { VillageAddressInput } from '../common/VillageAddressInput';
import { VietnameseDateInput } from '../common/VietnameseDateInput';
import {
  LAND_PROCEDURES,
  LANH_NGOC_VILLAGES,
  COMMUNE_FULL_SUFFIX,
  formatVillageAddress,
  getProcedureWorkingDays,
} from '../../constants/procedures';
import {
  addWorkingDays,
  getStandardWorkingDaysForProcedure,
  calculateResumedDueDate,
  formatDate,
} from '../../utils/date';
import {
  X,
  FolderArchive,
  AlertTriangle,
  Sparkles,
  Hash,
  CheckSquare,
  Zap,
  Edit3,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  CheckCircle2,
  FileQuestion,
  MapPin,
  UserCheck,
  Building2,
  Clock,
  Info,
  XCircle,
  Ban,
} from 'lucide-react';

interface DossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  dossierToEdit?: Dossier | null;
  onSuccess: () => void;
}

const PROCEDURES_LIST = [
  ...LAND_PROCEDURES.map((p) => p.name),
  'Khác',
];

export const DossierModal: React.FC<DossierModalProps> = ({
  isOpen,
  onClose,
  dossierToEdit,
  onSuccess,
}) => {
  const { user, canEditDossier } = useAuth();
  const { users } = useRealtime();

  const [code, setCode] = useState('');
  const [owner, setOwner] = useState('');
  const [parcel, setParcel] = useState('');
  const [mapSheet, setMapSheet] = useState('');
  const [selectedProcedureType, setSelectedProcedureType] = useState(PROCEDURES_LIST[0]);
  const [customProcedureText, setCustomProcedureText] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [handlerId, setHandlerId] = useState('');
  const [status, setStatus] = useState<DossierStatus>('in_progress');
  const [supplementDate, setSupplementDate] = useState('');
  const [supplementNote, setSupplementNote] = useState('');
  const [pauseDate, setPauseDate] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [pausedDays, setPausedDays] = useState<number | undefined>(undefined);
  const [rejectionDate, setRejectionDate] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionDocNumber, setRejectionDocNumber] = useState('');
  const [address, setAddress] = useState('');
  const [selectedVillage, setSelectedVillage] = useState<string>('');
  const [note, setNote] = useState('');
  const [storageFolder, setStorageFolder] = useState('');
  const [storageIndex, setStorageIndex] = useState('');
  const [result, setResult] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [createLinkedTask, setCreateLinkedTask] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = React.useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const prevOpenRef = React.useRef(false);
  const prevEditIdRef = React.useRef<string | null | undefined>(undefined);

  const generateAutoCode = () => {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `H17.130-${yy}${mm}${dd}-${rand}`;
  };

  useEffect(() => {
    if (!isOpen) {
      prevOpenRef.current = false;
      prevEditIdRef.current = undefined;
      submittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const isNewlyOpened = !prevOpenRef.current && isOpen;
    const isEditTargetChanged = dossierToEdit?.id !== prevEditIdRef.current;

    if (isNewlyOpened || isEditTargetChanged) {
      prevOpenRef.current = true;
      prevEditIdRef.current = dossierToEdit?.id || null;

      if (dossierToEdit) {
        setCode(dossierToEdit.code || generateAutoCode());
        setOwner(dossierToEdit.owner || '');
        setParcel(dossierToEdit.parcel || '');
        setMapSheet(dossierToEdit.mapSheet || '');

        const matchedProc = PROCEDURES_LIST.find((p) => p.toLowerCase() === (dossierToEdit.procedure || '').toLowerCase());
        if (matchedProc) {
          setSelectedProcedureType(matchedProc);
          setCustomProcedureText('');
        } else {
          setSelectedProcedureType('Khác');
          setCustomProcedureText(dossierToEdit.procedure || '');
        }

        setReceivedDate(dossierToEdit.receivedDate || new Date().toISOString().split('T')[0]);
        setDueDate(dossierToEdit.dueDate || '');
        setHandlerId(dossierToEdit.handlerId || user?.id || '');
        setStatus(dossierToEdit.status || 'in_progress');
        setSupplementDate(dossierToEdit.supplementDate || '');
        setSupplementNote(dossierToEdit.supplementNote || '');
        setPauseDate(dossierToEdit.pauseDate || '');
        setPauseReason(dossierToEdit.pauseReason || '');
        setPausedDays(dossierToEdit.pausedDays);
        setRejectionDate(dossierToEdit.rejectionDate || '');
        setRejectionReason(dossierToEdit.rejectionReason || '');
        setRejectionDocNumber(dossierToEdit.rejectionDocNumber || '');
        setAddress(dossierToEdit.address || '');

        // Detect if address matches any of the 7 villages
        const foundVillage = LANH_NGOC_VILLAGES.find((v) => (dossierToEdit.address || '').includes(v));
        setSelectedVillage(foundVillage || '');

        setNote(dossierToEdit.note || '');
        setStorageFolder(dossierToEdit.storageFolder || 'Kẹp 1');
        setStorageIndex(dossierToEdit.storageIndex || '');
        setResult(dossierToEdit.result || '');
        setAttachments(dossierToEdit.attachments || []);
        setCreateLinkedTask(false);
      } else {
        setCode(generateAutoCode());
        setOwner('');
        setParcel('');
        setMapSheet('');
        setSelectedProcedureType(PROCEDURES_LIST[0]);
        setCustomProcedureText('');
        const today = new Date().toISOString().split('T')[0];
        setReceivedDate(today);
        
        // Default standard days for first procedure (Hòa giải / Cấp giấy: 30 days)
        const defaultProc = PROCEDURES_LIST[0];
        const calculatedDue = addWorkingDays(today, getProcedureWorkingDays(defaultProc));
        setDueDate(calculatedDue);

        // Ưu tiên Chuyên viên / Cán bộ đang đăng nhập để không phải chọn lại
        const defaultHandler = user?.id || (users.find((u) => u.role === 'specialist') || users[0])?.id || 'user_lieulv';
        setHandlerId(defaultHandler);

        setStatus('in_progress');
        setSupplementDate('');
        setSupplementNote('');
        setPauseDate('');
        setPauseReason('');
        setPausedDays(undefined);
        setRejectionDate('');
        setRejectionReason('');
        setRejectionDocNumber('');
        setAddress('Thôn Tiên Hiệp, xã Lãnh Ngọc, thành phố Đà Nẵng');
        setSelectedVillage('Thôn Tiên Hiệp');
        setNote('');
        setStorageFolder('Kẹp 1');
        setStorageIndex('');
        setResult('');
        setAttachments([]);
        setCreateLinkedTask(false);
      }
      setErrorMsg(null);
    }
  }, [isOpen, dossierToEdit, user, users]);

  const dossierDraftData = useMemo(
    () => ({
      code,
      owner,
      parcel,
      mapSheet,
      selectedProcedureType,
      customProcedureText,
      receivedDate,
      dueDate,
      handlerId,
      status,
      supplementDate,
      supplementNote,
      pauseDate,
      pauseReason,
      pausedDays,
      rejectionDate,
      rejectionReason,
      rejectionDocNumber,
      address,
      selectedVillage,
      note,
      storageFolder,
      storageIndex,
      result,
      createLinkedTask,
    }),
    [
      code,
      owner,
      parcel,
      mapSheet,
      selectedProcedureType,
      customProcedureText,
      receivedDate,
      dueDate,
      handlerId,
      status,
      supplementDate,
      supplementNote,
      pauseDate,
      pauseReason,
      pausedDays,
      rejectionDate,
      rejectionReason,
      rejectionDocNumber,
      address,
      selectedVillage,
      note,
      storageFolder,
      storageIndex,
      result,
      createLinkedTask,
    ]
  );

  const handleRestoreDossierDraft = useCallback((draft: typeof dossierDraftData) => {
    if (draft.code) setCode(draft.code);
    if (draft.owner) setOwner(draft.owner);
    if (draft.parcel) setParcel(draft.parcel);
    if (draft.mapSheet) setMapSheet(draft.mapSheet);
    if (draft.selectedProcedureType) setSelectedProcedureType(draft.selectedProcedureType);
    if (draft.customProcedureText !== undefined) setCustomProcedureText(draft.customProcedureText);
    if (draft.receivedDate) setReceivedDate(draft.receivedDate);
    if (draft.dueDate) setDueDate(draft.dueDate);
    if (draft.handlerId) setHandlerId(draft.handlerId);
    if (draft.status) setStatus(draft.status);
    if (draft.supplementDate !== undefined) setSupplementDate(draft.supplementDate);
    if (draft.supplementNote !== undefined) setSupplementNote(draft.supplementNote);
    if (draft.pauseDate !== undefined) setPauseDate(draft.pauseDate);
    if (draft.pauseReason !== undefined) setPauseReason(draft.pauseReason);
    if (draft.pausedDays !== undefined) setPausedDays(draft.pausedDays);
    if (draft.address) setAddress(draft.address);
    if (draft.selectedVillage) setSelectedVillage(draft.selectedVillage);
    if (draft.note !== undefined) setNote(draft.note);
    if (draft.storageFolder) setStorageFolder(draft.storageFolder);
    if (draft.storageIndex !== undefined) setStorageIndex(draft.storageIndex);
    if (draft.result !== undefined) setResult(draft.result);
    if (draft.createLinkedTask !== undefined) setCreateLinkedTask(draft.createLinkedTask);
  }, []);

  const {
    lastSavedTime: draftSavedTime,
    isDraftSaving,
    hasRestoredDraft,
    restoredDraftTime,
    clearDraft,
    discardDraft,
  } = useModalDraft({
    formKey: `dossier_${dossierToEdit?.id || 'new'}`,
    isOpen,
    isEditing: Boolean(dossierToEdit),
    formData: dossierDraftData,
    onRestore: handleRestoreDossierDraft,
    hasMeaningfulData: (data) => Boolean(data.owner?.trim() || data.parcel?.trim() || data.note?.trim()),
  });

  if (!isOpen) return null;

  const getEffectiveProcedure = () => {
    if (selectedProcedureType === 'Khác') {
      return customProcedureText.trim() || 'Thủ tục khác';
    }
    return selectedProcedureType;
  };

  const handleProcedureTypeChange = (proc: string) => {
    setSelectedProcedureType(proc);
    const today = receivedDate || new Date().toISOString().split('T')[0];
    if (proc !== 'Khác') {
      const standardDays = getProcedureWorkingDays(proc);
      const newDue = addWorkingDays(today, standardDays);
      setDueDate(newDue);
    }
  };

  const handleApplyWorkingDays = (days: number) => {
    const today = receivedDate || new Date().toISOString().split('T')[0];
    const newDue = addWorkingDays(today, days);
    setDueDate(newDue);
  };

  const handleSelectVillage = (village: string) => {
    setSelectedVillage(village);
    if (!village) return;
    
    const fullVillageStr = `${village}, xã Lãnh Ngọc, thành phố Đà Nẵng`;
    
    // If address is empty or already in standard commune format, replace or format directly
    if (!address || LANH_NGOC_VILLAGES.some((v) => address.trim() === `${v}, xã Lãnh Ngọc, thành phố Đà Nẵng` || address.trim() === `${v}, xã Lãnh Ngọc`)) {
      setAddress(fullVillageStr);
    } else {
      // Check if any existing village name is in the address
      let updated = address;
      let replaced = false;
      LANH_NGOC_VILLAGES.forEach((v) => {
        if (updated.includes(v)) {
          updated = updated.replace(v, village);
          replaced = true;
        }
      });
      
      if (!replaced) {
        setAddress(fullVillageStr);
      } else {
        if (!updated.includes('thành phố Đà Nẵng') && updated.includes('xã Lãnh Ngọc')) {
          updated = updated.replace('xã Lãnh Ngọc', 'xã Lãnh Ngọc, thành phố Đà Nẵng');
        }
        setAddress(updated);
      }
    }
  };

  // Reset clock from beginning when citizen submits full supplementary documents
  const handleResumeAndResetClock = () => {
    const today = new Date().toISOString().split('T')[0];
    const proc = getEffectiveProcedure();
    const standardDays = getStandardWorkingDaysForProcedure(proc);
    const newDue = addWorkingDays(today, standardDays);

    setReceivedDate(today);
    setDueDate(newDue);
    setStatus('in_progress');
  };

  // Resume paused dossier: keeps and calculates remaining working days
  const handleResumePauseAndKeepRemainingDays = () => {
    const today = new Date().toISOString().split('T')[0];
    const pauseStart = pauseDate || today;
    const { newDueDate, pausedWorkingDays } = calculateResumedDueDate(
      dueDate,
      pauseStart,
      today
    );

    setDueDate(newDueDate);
    setStatus('in_progress');
    setPausedDays((prev) => (prev || 0) + pausedWorkingDays);
  };

  const handleStatusChange = (newStatus: DossierStatus) => {
    const today = new Date().toISOString().split('T')[0];
    if (newStatus === 'supplement') {
      if (!supplementDate) setSupplementDate(today);
    } else if (newStatus === 'paused') {
      if (!pauseDate) setPauseDate(today);
    } else if (newStatus === 'rejected') {
      if (!rejectionDate) setRejectionDate(today);
    } else if (status === 'supplement' && newStatus === 'in_progress') {
      const proc = getEffectiveProcedure();
      const standardDays = getStandardWorkingDaysForProcedure(proc);
      const newDue = addWorkingDays(today, standardDays);
      setReceivedDate(today);
      setDueDate(newDue);
    } else if (status === 'paused' && newStatus === 'in_progress') {
      const pauseStart = pauseDate || today;
      const { newDueDate, pausedWorkingDays } = calculateResumedDueDate(dueDate, pauseStart, today);
      setDueDate(newDueDate);
      setPausedDays((prev) => (prev || 0) + pausedWorkingDays);
    }
    setStatus(newStatus);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setErrorMsg(null);

    if (dossierToEdit && !canEditDossier(dossierToEdit)) {
      setErrorMsg('Chỉ Admin, Lãnh đạo hoặc Cán bộ thụ lý chính của hồ sơ này mới có quyền chỉnh sửa.');
      return;
    }

    if (!owner.trim() || !parcel.trim() || !mapSheet.trim() || !dueDate) {
      setErrorMsg('Vui lòng điền đầy đủ chủ hồ sơ, số thửa, tờ bản đồ và hạn giải quyết.');
      return;
    }

    const procedure = getEffectiveProcedure();
    const today = new Date().toISOString().split('T')[0];

    submittingRef.current = true;
    try {
      setIsSubmitting(true);
      if (dossierToEdit) {
        const updatedDossier = await apiService.updateDossier(dossierToEdit.id, {
          code: code.trim() || dossierToEdit.code,
          owner,
          parcel,
          mapSheet,
          procedure,
          receivedDate,
          dueDate,
          handlerId,
          status,
          supplementDate: status === 'supplement' ? supplementDate || today : supplementDate,
          supplementNote,
          pauseDate: status === 'paused' ? pauseDate || today : pauseDate,
          pauseReason,
          pausedDays,
          rejectionDate: status === 'rejected' ? rejectionDate || today : undefined,
          rejectionReason: status === 'rejected' ? rejectionReason : undefined,
          rejectionDocNumber: status === 'rejected' ? rejectionDocNumber : undefined,
          resumedDate: (status === 'in_progress' && (dossierToEdit.status === 'supplement' || dossierToEdit.status === 'paused')) ? today : dossierToEdit.resumedDate,
          address,
          note,
          storageFolder,
          storageIndex,
          result,
          attachments,
          updatedBy: user?.id,
          updatedByName: user?.name,
        });
        try {
          localVault.unmarkDossierDeleted(updatedDossier.id, updatedDossier.code);
          await localVault.upsertLocalDossier(updatedDossier);
        } catch (_) {}
      } else {
        const createdDossier = await apiService.createDossier({
          code: code.trim() || undefined,
          owner,
          parcel,
          mapSheet,
          procedure,
          receivedDate,
          dueDate,
          handlerId,
          status,
          supplementDate: status === 'supplement' ? supplementDate || today : undefined,
          supplementNote: status === 'supplement' ? supplementNote : undefined,
          pauseDate: status === 'paused' ? pauseDate || today : undefined,
          pauseReason: status === 'paused' ? pauseReason : undefined,
          pausedDays: status === 'paused' ? pausedDays : undefined,
          rejectionDate: status === 'rejected' ? rejectionDate || today : undefined,
          rejectionReason: status === 'rejected' ? rejectionReason : undefined,
          rejectionDocNumber: status === 'rejected' ? rejectionDocNumber : undefined,
          address,
          note,
          storageFolder,
          storageIndex,
          result,
          attachments,
          createdBy: user?.id,
          createdByName: user?.name,
        });

        try {
          localVault.unmarkDossierDeleted(createdDossier.id, createdDossier.code);
          await localVault.upsertLocalDossier(createdDossier);
        } catch (_) {}

        if (createLinkedTask) {
          const createdTask = await apiService.createTask({
            name: `Giải quyết hồ sơ đất đai: ${owner} - ${procedure} (Thửa ${parcel}, TBĐ ${mapSheet})`,
            field: 'Đăng ký đất đai',
            priority: 'high',
            assigneeId: handlerId || user?.id || 'user_lieulv',
            startDate: receivedDate,
            dueDate: dueDate,
            note: `Nhiệm vụ tự động liên kết với hồ sơ đất đai ${createdDossier.code}. Kẹp lưu trữ: ${storageFolder || 'Kẹp 1'}. Thôn/Vị trí: ${address || 'Xã Lãnh Ngọc'}.`,
            linkedDossierId: createdDossier.id,
            attachments: [],
            createdBy: user?.id,
            createdByName: user?.name,
          });
          try {
            if (createdTask && createdTask.id) {
              await localVault.upsertLocalTask(createdTask);
              await localVault.upsertLocalDossier({ ...createdDossier, linkedTaskId: createdTask.id });
            }
          } catch (_) {}
        }
      }

      clearDraft();
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu hồ sơ đất đai.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Find currently selected procedure config
  const currentProcConfig = LAND_PROCEDURES.find((p) => p.name === selectedProcedureType);
  const currentWorkingDays = currentProcConfig ? currentProcConfig.workingDays : getProcedureWorkingDays(selectedProcedureType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full my-auto shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <FolderArchive className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  {dossierToEdit ? 'Cập nhật hồ sơ đất đai' : 'Tiếp nhận hồ sơ thủ tục đất đai'}
                </h2>
                {draftSavedTime && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium" title="Bản nháp được lưu định kỳ vào bộ nhớ máy tính để chống mất dữ liệu khi tắt máy">
                    <span className={`w-1.5 h-1.5 rounded-full ${isDraftSaving ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                    <span>{isDraftSaving ? 'Đang lưu nháp...' : `Đã lưu nháp lúc ${draftSavedTime}`}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                UBND Xã Lãnh Ngọc • Chuẩn TTHC QĐ 2267/1992/2304_QĐ-BTNMT
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto flex-1">
          {hasRestoredDraft && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-[11px] leading-relaxed">
                  Đã khôi phục dữ liệu bạn đang nhập dở lúc <strong>{restoredDraftTime}</strong> để tránh mất thông tin khi đóng cửa sổ hoặc tắt máy.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  discardDraft();
                  if (!dossierToEdit) {
                    setOwner('');
                    setParcel('');
                    setMapSheet('');
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

          {/* Dossier Code: Manual input + Auto generate button */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-emerald-700" />
                <span>Mã hồ sơ đất đai (Tự động hoặc Nhập tùy chỉnh)</span>
              </label>
              <button
                type="button"
                onClick={() => setCode(generateAutoCode())}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300 shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Tạo mã số tự động theo chuẩn Một cửa"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tạo mã tự động</span>
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: H17.130-260821-0001 hoặc HSĐĐ-2026-0001"
                className="w-full bg-white border border-emerald-300 font-mono font-bold text-emerald-900 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
              />
            </div>
          </div>

          {/* Owner & Hamlet / Address Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Chủ hồ sơ / Người nộp <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="VD: Nguyễn Văn A & Trần Thị B"
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
              />
            </div>
            
            {/* Address & Hamlet of Xã Lãnh Ngọc */}
            <div className="space-y-1">
              <VillageAddressInput
                label="Địa chỉ thửa đất / Thôn"
                required
                mode="address"
                placeholder="VD: Thôn Tiên Hiệp, xã Lãnh Ngọc, thành phố Đà Nẵng..."
                value={address}
                onChange={(val) => {
                  setAddress(val);
                  const found = LANH_NGOC_VILLAGES.find((v) => val.includes(v));
                  setSelectedVillage(found || '');
                }}
              />
            </div>
          </div>

          {/* Parcel, MapSheet, Procedure */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">
                Số thửa <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={parcel}
                onChange={(e) => setParcel(e.target.value)}
                placeholder="VD: 88"
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">
                Tờ bản đồ (TBĐ) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={mapSheet}
                onChange={(e) => setMapSheet(e.target.value)}
                placeholder="VD: 14"
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
              />
            </div>
            <div className="sm:col-span-6">
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">
                  Thủ tục hành chính <span className="text-rose-500">*</span>
                </label>
                {selectedProcedureType !== 'Khác' && (
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-200">
                    ⏱️ Chuẩn: {currentWorkingDays} ngày làm việc
                  </span>
                )}
              </div>
              <select
                value={selectedProcedureType}
                onChange={(e) => handleProcedureTypeChange(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-semibold"
              >
                <optgroup label="📋 Thủ tục 30 ngày làm việc">
                  <option value="Hòa giải tranh chấp đất đai">Hòa giải tranh chấp đất đai (30 ngày)</option>
                  <option value="Cấp giấy chứng nhận lần đầu">Cấp giấy chứng nhận lần đầu (30 ngày)</option>
                  <option value="Xác định hạn mức đất ở">Xác định hạn mức đất ở (30 ngày)</option>
                  <option value="Giải quyết đơn thư, khiếu nại">Giải quyết đơn thư, khiếu nại (30 ngày)</option>
                </optgroup>
                <optgroup label="📋 Thủ tục 25 ngày làm việc">
                  <option value="Chuyển mục đích sử dụng đất">Chuyển mục đích sử dụng đất (25 ngày)</option>
                  <option value="Thu hồi giấy chứng nhận">Thu hồi giấy chứng nhận (25 ngày)</option>
                  <option value="Thu hồi đất, bồi thường GPMB">Thu hồi đất, bồi thường GPMB (25 ngày)</option>
                </optgroup>
                <optgroup label="📋 Thủ tục 20 ngày làm việc">
                  <option value="Tặng cho đất nhà nước">Tặng cho đất nhà nước (20 ngày)</option>
                  <option value="Giao đất, cho thuê đất">Giao đất, cho thuê đất (20 ngày)</option>
                </optgroup>
                <optgroup label="📋 Thủ tục 18 ngày làm việc">
                  <option value="Đăng ký biến động">Đăng ký biến động (18 ngày)</option>
                </optgroup>
                <optgroup label="📋 Các thủ tục TTHC khác (QĐ 2267/1992 & 2304/BTNMT)">
                  <option value="Tách thửa, hợp thửa đất">Tách thửa, hợp thửa đất (15 ngày)</option>
                  <option value="Gia hạn thời hạn sử dụng đất">Gia hạn thời hạn sử dụng đất (15 ngày)</option>
                  <option value="Cấp đổi, cấp lại Giấy chứng nhận">Cấp đổi, cấp lại Giấy chứng nhận (10 ngày)</option>
                  <option value="Đo đạc, trích lục bản đồ địa chính">Đo đạc, trích lục bản đồ địa chính (07 ngày)</option>
                  <option value="Đăng ký biện pháp bảo đảm (Thế chấp / Xóa)">Đăng ký biện pháp bảo đảm (Thế chấp / Xóa) (03 ngày)</option>
                  <option value="Khác">Thủ tục khác (Tự nhập)</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* If procedure is "Khác", show custom text field */}
          {selectedProcedureType === 'Khác' && (
            <div className="p-3 bg-amber-50/70 border border-amber-300 rounded-xl space-y-1 animate-in fade-in duration-150">
              <label className="block font-bold text-amber-950 text-xs flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                <span>Nhập tên thủ tục hành chính cụ thể <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                required
                value={customProcedureText}
                onChange={(e) => setCustomProcedureText(e.target.value)}
                placeholder="VD: Cấp lại GCN do rách nát, Cấp đổi trang bổ sung, v.v..."
                className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 outline-none text-xs"
              />
              <p className="text-[11px] text-amber-800">
                * Bạn có thể tự do ghi bất kỳ nội dung thủ tục hành chính nào tại đây.
              </p>
            </div>
          )}

          {/* Status Selection & Mode Panel */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-800 text-xs">
                Trạng thái tiến độ hồ sơ:
              </label>
              {status === 'supplement' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-300">
                  <PauseCircle className="w-3 h-3 text-amber-700" />
                  Đang tạm dừng hồ sơ
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
              <button
                type="button"
                onClick={() => handleStatusChange('in_progress')}
                className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  status === 'in_progress'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-slate-700 border-gray-300 hover:bg-blue-50'
                }`}
              >
                <PlayCircle className="w-3.5 h-3.5" />
                <span>Đang xử lý</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('supplement')}
                className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  status === 'supplement'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50'
                }`}
              >
                <FileQuestion className="w-3.5 h-3.5" />
                <span>Cần bổ sung</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('paused')}
                className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  status === 'paused'
                    ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                    : 'bg-white text-purple-800 border-purple-300 hover:bg-purple-50'
                }`}
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Tạm dừng</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('rejected')}
                className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  status === 'rejected'
                    ? 'bg-rose-700 text-white border-rose-700 shadow-xs ring-2 ring-rose-300'
                    : 'bg-white text-rose-800 border-rose-300 hover:bg-rose-50'
                }`}
                title="Hồ sơ không đủ điều kiện giải quyết hoặc có lý do không giải quyết được"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Trả hồ sơ</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('resolved')}
                className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  status === 'resolved'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đã giải quyết</span>
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('overdue')}
                className={`p-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                  status === 'overdue'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Quá hạn</span>
              </button>
            </div>

            {/* SPECIAL NOTICE & LOGIC FOR SUPPLEMENT STATUS */}
            {status === 'supplement' && (
              <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-start gap-2">
                  <FileQuestion className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-950 text-xs sm:text-sm">
                      Yêu cầu bổ sung, hoàn thiện hồ sơ (Mẫu số 02)
                    </h4>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      Hồ sơ được <strong>đóng băng thời hạn</strong> và <strong>không tính quá hạn</strong> trong thời gian chờ công dân bổ sung. Khi công dân nộp đủ, thời hạn giải quyết sẽ được <strong>tính lại từ đầu</strong> theo quy định TTHC.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-amber-900 text-[11px] mb-1">
                      Ngày yêu cầu bổ sung (dd/mm/yyyy):
                    </label>
                    <VietnameseDateInput
                      value={supplementDate}
                      onChange={(val) => setSupplementDate(val)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-amber-900 text-[11px] mb-1">
                      Danh mục giấy tờ yêu cầu công dân bổ sung:
                    </label>
                    <input
                      type="text"
                      value={supplementNote}
                      onChange={(e) => setSupplementNote(e.target.value)}
                      placeholder="VD: Trích lục bản đồ, Giấy xác nhận tình trạng hôn nhân..."
                      className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-amber-200/80">
                  <span className="text-[10px] text-amber-700 italic">
                    Khi nhận đủ giấy tờ bổ sung hợp lệ:
                  </span>
                  <button
                    type="button"
                    onClick={handleResumeAndResetClock}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    title="Tiếp nhận đủ hồ sơ và tính lại thời hạn từ đầu"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Đã nhận đủ bổ sung ➔ Tính lại hạn từ đầu</span>
                  </button>
                </div>
              </div>
            )}

            {/* SPECIAL NOTICE & LOGIC FOR PAUSED STATUS */}
            {status === 'paused' && (
              <div className="p-3.5 bg-purple-50 border-2 border-purple-300 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-start gap-2">
                  <PauseCircle className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-purple-950 text-xs sm:text-sm">
                      Tạm dừng giải quyết hồ sơ (Đóng băng thời hạn)
                    </h4>
                    <p className="text-[11px] text-purple-800 mt-0.5 leading-relaxed">
                      Thời hạn xử lý được <strong>đóng băng nguyên vẹn</strong>, không tính quá hạn. Khi bấm <strong>Bỏ tạm dừng</strong>, hệ thống sẽ <strong>chạy tiếp số ngày làm việc còn lại</strong> trước hạn.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-purple-900 text-[11px] mb-1">
                      Ngày bắt đầu tạm dừng (dd/mm/yyyy):
                    </label>
                    <VietnameseDateInput
                      value={pauseDate}
                      onChange={(val) => setPauseDate(val)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-purple-900 text-[11px] mb-1">
                      Lý do tạm dừng hồ sơ:
                    </label>
                    <input
                      type="text"
                      value={pauseReason}
                      onChange={(e) => setPauseReason(e.target.value)}
                      placeholder="VD: Chờ cơ quan Thuế thông báo, Chờ đo đạc thực địa..."
                      className="w-full bg-white border border-purple-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5 border-t border-purple-200/80">
                  <span className="text-[10px] text-purple-700 italic">
                    Khi tiếp tục giải quyết vụ việc:
                  </span>
                  <button
                    type="button"
                    onClick={handleResumePauseAndKeepRemainingDays}
                    className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    title="Bỏ tạm dừng và tiếp tục chạy thời gian còn lại trước hạn"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Bỏ tạm dừng ➔ Chạy tiếp thời gian còn lại</span>
                  </button>
                </div>
              </div>
            )}

            {/* SPECIAL NOTICE & LOGIC FOR REJECTED STATUS (TRẢ HỒ SƠ) */}
            {status === 'rejected' && (
              <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-start gap-2">
                  <XCircle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-rose-950 text-xs sm:text-sm">
                      Trả lại hồ sơ / Không đủ điều kiện giải quyết (Mẫu số 03)
                    </h4>
                    <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                      Áp dụng khi hồ sơ không đủ điều kiện giải quyết theo quy định hoặc có lý do không giải quyết được (tranh chấp, sai quy hoạch, vi phạm...). Cơ quan tiếp nhận ban hành văn bản/phiếu từ chối nêu rõ căn cứ và trả lại hồ sơ cho công dân.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block font-bold text-rose-900 text-[11px] mb-1">
                      Ngày trả hồ sơ (dd/mm/yyyy):
                    </label>
                    <VietnameseDateInput
                      value={rejectionDate || new Date().toISOString().split('T')[0]}
                      onChange={(val) => setRejectionDate(val)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-rose-900 text-[11px] mb-1">
                      Số văn bản / Thông báo từ chối (Mẫu 03):
                    </label>
                    <input
                      type="text"
                      value={rejectionDocNumber}
                      onChange={(e) => setRejectionDocNumber(e.target.value)}
                      placeholder="VD: 05/TB-UBND hoặc Phiếu từ chối số 02/P-TNMT"
                      className="w-full bg-white border border-rose-300 rounded-lg px-2.5 py-1.5 text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-rose-900 text-[11px] mb-1">
                    Lý do trả hồ sơ / không đủ điều kiện giải quyết: <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Ghi rõ lý do không đủ điều kiện giải quyết (VD: Thửa đất đang có đơn tranh chấp ranh giới; Hiện trạng không phù hợp quy hoạch; Vi phạm TTXD chưa xử lý...)"
                    className="w-full bg-white border border-rose-300 rounded-lg p-2 text-slate-900 focus:ring-2 focus:ring-rose-500 outline-none text-xs"
                  />
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-rose-800 font-semibold">Gợi ý lý do:</span>
                    {[
                      'Đang có đơn tranh chấp, khiếu kiện đất đai',
                      'Không phù hợp quy hoạch sử dụng đất',
                      'Vi phạm TTXD chưa chấp hành xử phạt',
                      'Quá hạn bổ sung hồ sơ không nộp đủ',
                      'Công dân có đơn tự nguyện xin rút hồ sơ',
                    ].map((reasonText) => (
                      <button
                        key={reasonText}
                        type="button"
                        onClick={() =>
                          setRejectionReason((prev) => (prev ? `${prev}; ${reasonText}` : reasonText))
                        }
                        className="px-2 py-0.5 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-900 text-[10px] border border-rose-300 transition cursor-pointer"
                      >
                        + {reasonText}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Working Days Calculator Chips (All working days according to official regulations) */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Gán nhanh hạn trả (Ngày làm việc - trừ T7, CN & Lễ):</span>
              </span>
              <span className="text-[10px] text-slate-500 italic">QĐ 2267/1992 & 2304/BTNMT</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyWorkingDays(30)}
                className="px-2 py-1 rounded-md bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-[11px] font-bold border border-slate-300 transition cursor-pointer"
              >
                +30 ngày (Hòa giải / Cấp giấy / Hạn mức / Đơn thư)
              </button>
              <button
                type="button"
                onClick={() => handleApplyWorkingDays(25)}
                className="px-2 py-1 rounded-md bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-[11px] font-bold border border-slate-300 transition cursor-pointer"
              >
                +25 ngày (Chuyển MĐ / Thu hồi GCN / GPMB)
              </button>
              <button
                type="button"
                onClick={() => handleApplyWorkingDays(20)}
                className="px-2 py-1 rounded-md bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-[11px] font-bold border border-slate-300 transition cursor-pointer"
              >
                +20 ngày (Tặng cho đất NN / Giao thuê đất)
              </button>
              <button
                type="button"
                onClick={() => handleApplyWorkingDays(18)}
                className="px-2 py-1 rounded-md bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-[11px] font-bold border border-slate-300 transition cursor-pointer"
              >
                +18 ngày (Đăng ký biến động)
              </button>
              <button
                type="button"
                onClick={() => handleApplyWorkingDays(15)}
                className="px-2 py-1 rounded-md bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-[11px] font-semibold border border-slate-300 transition cursor-pointer"
              >
                +15 ngày (Tách hợp thửa / Gia hạn)
              </button>
              <button
                type="button"
                onClick={() => handleApplyWorkingDays(10)}
                className="px-2 py-1 rounded-md bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-[11px] font-semibold border border-slate-300 transition cursor-pointer"
              >
                +10 ngày (Cấp đổi, cấp lại)
              </button>
              <button
                type="button"
                onClick={() => handleApplyWorkingDays(7)}
                className="px-2 py-1 rounded-md bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-[11px] font-semibold border border-slate-300 transition cursor-pointer"
              >
                +7 ngày (Trích lục BĐ)
              </button>
              <button
                type="button"
                onClick={() => handleApplyWorkingDays(3)}
                className="px-2 py-1 rounded-md bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-[11px] font-semibold border border-slate-300 transition cursor-pointer"
              >
                +3 ngày (Thế chấp / Xóa)
              </button>
            </div>
          </div>

          {/* Dates & Handler */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ngày tiếp nhận (dd/mm/yyyy) <span className="text-rose-500">*</span>
              </label>
              <VietnameseDateInput
                required
                value={receivedDate}
                onChange={(val) => {
                  setReceivedDate(val);
                  if (val) {
                    const proc = getEffectiveProcedure();
                    const days = getProcedureWorkingDays(proc);
                    setDueDate(addWorkingDays(val, days));
                  }
                }}
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Hạn trả kết quả (dd/mm/yyyy) <span className="text-rose-500">*</span>
              </label>
              <VietnameseDateInput
                required
                value={dueDate}
                onChange={(val) => setDueDate(val)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">
                  Chuyên viên thụ lý <span className="text-rose-500">*</span>
                </label>
                {user && handlerId === user.id && (
                  <span className="text-[10px] text-emerald-700 font-bold">
                    ✓ Mặc định bạn
                  </span>
                )}
              </div>
              <select
                value={handlerId}
                onChange={(e) => setHandlerId(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-medium"
              >
                {users.map((u) => {
                  const isCurrent = user?.id === u.id;
                  return (
                    <option key={u.id} value={u.id}>
                      {u.name} {isCurrent ? '★ (Bạn - Đang đăng nhập)' : `(${u.position || u.role})`}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Storage Folder & Index: Quản lý hồ sơ lưu kẹp (Chỉ Kẹp 1, Kẹp 2, Kẹp 3) */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                <span>📁 Vị trí lưu kẹp hồ sơ giấy (Kẹp 1, 2, 3)</span>
              </label>
              <span className="text-[10px] text-amber-700 font-medium italic">
                VD: Sổ ghi số 15 ➔ Mở kẹp tìm STT 15
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Chọn Kẹp hồ sơ lưu trữ:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['Kẹp 1', 'Kẹp 2', 'Kẹp 3'].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setStorageFolder(k)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1 ${
                        storageFolder === k
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-amber-300 hover:bg-amber-100/60'
                      }`}
                    >
                      <span>📂 {k}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Số thứ tự (STT) trong kẹp giấy:
                </label>
                <input
                  type="text"
                  value={storageIndex}
                  onChange={(e) => setStorageIndex(e.target.value)}
                  placeholder="VD: 1, 2, 15, 20..."
                  className="w-full bg-white border border-amber-300 font-mono font-bold text-amber-900 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                />
              </div>
            </div>
          </div>

          {/* Results & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kết quả giải quyết (nếu có)</label>
              <input
                type="text"
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="VD: Đã cấp GCN số CS 123456 ngày..."
                className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ghi chú hồ sơ</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Thông tin diện tích, nguồn gốc đất, lưu ý..."
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
              />
            </div>
          </div>

          {/* Attachments */}
          <FileUpload
            attachments={attachments}
            onChange={setAttachments}
            label="Hồ sơ quét (Scan) đính kèm"
          />

          {/* Create linked task toggle */}
          {!dossierToEdit && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50/70 border border-blue-200">
              <input
                type="checkbox"
                id="linkedTaskCheck"
                checked={createLinkedTask}
                onChange={(e) => setCreateLinkedTask(e.target.checked)}
                className="rounded accent-blue-600 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="linkedTaskCheck" className="text-blue-900 cursor-pointer font-bold text-xs flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                <span>Tự động tạo ngay Nhiệm vụ công việc tương ứng cho Chuyên viên thụ lý</span>
              </label>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg font-semibold text-slate-600 hover:bg-gray-100 text-xs cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <FolderArchive className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang lưu...' : dossierToEdit ? 'Cập nhật hồ sơ' : 'Tiếp nhận hồ sơ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
