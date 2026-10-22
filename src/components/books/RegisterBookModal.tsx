import React, { useState, useEffect, useMemo } from 'react';
import { RegisterBook, RegisterBookType, Attachment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../contexts/RealtimeContext';
import { apiService } from '../../services/api';
import { FileUpload } from '../common/FileUpload';
import { VietnameseDateInput } from '../common/VietnameseDateInput';
import {
  X,
  BookOpen,
  AlertTriangle,
  Award,
  RefreshCw,
  Layers,
  Hash,
  User as UserIcon,
  MapPin,
  FileText,
} from 'lucide-react';

interface RegisterBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookToEdit?: RegisterBook | null;
  defaultType?: RegisterBookType;
  onSuccess: () => void;
}

export const BOOK_TYPES: RegisterBookType[] = [
  'Sổ cấp giấy',
  'Sổ theo dõi biến động',
  'Sổ theo dõi cấp phát phôi GCN',
  'Sổ phiếu chuyển thuế',
  'Sổ theo dõi thu hồi GCN',
  'Sổ theo dõi HS tặng cho đất NN',
  'Sổ theo dõi xác nhận hạn mức đất ở',
  'Biên bản xử lý vi phạm',
  'Sổ khác',
];

export function normalizeBookType(rawType?: string): RegisterBookType {
  if (!rawType) return 'Sổ cấp giấy';
  if (rawType === 'Sổ cấp GCN') return 'Sổ cấp giấy';
  if (rawType === 'Sổ đăng ký biến động') return 'Sổ theo dõi biến động';
  if (rawType === 'Sổ theo dõi khoáng sản') return 'Sổ theo dõi cấp phát phôi GCN';
  if (rawType === 'Sổ theo dõi tranh chấp') return 'Sổ theo dõi thu hồi GCN';
  if (rawType === 'Sổ theo dõi môi trường') return 'Sổ theo dõi HS tặng cho đất NN';
  return rawType as RegisterBookType;
}

export const RegisterBookModal: React.FC<RegisterBookModalProps> = ({
  isOpen,
  onClose,
  bookToEdit,
  defaultType,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { registerBooks } = useRealtime();

  const [type, setType] = useState<RegisterBookType>('Sổ cấp giấy');
  const [stt, setStt] = useState<number>(1);
  const [bookNumber, setBookNumber] = useState('');
  const [content, setContent] = useState('');
  const [relatedPerson, setRelatedPerson] = useState('');
  const [createdDate, setCreatedDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'Đang xử lý' | 'Đã giải quyết' | 'Lưu trữ' | 'Theo dõi'>('Đang xử lý');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Specialized fields for Sổ cấp giấy
  const [issueSerialNumber, setIssueSerialNumber] = useState('');
  const [mapSheet, setMapSheet] = useState('');
  const [parcel, setParcel] = useState('');

  // Specialized fields for Sổ theo dõi biến động
  const [gcnForMutation, setGcnForMutation] = useState('');
  const [dossierCode, setDossierCode] = useState('');

  // Specialized fields for Sổ theo dõi cấp phát phôi GCN
  const [blankQuantity, setBlankQuantity] = useState<string>('');
  const [serialFrom, setSerialFrom] = useState('');
  const [serialTo, setSerialTo] = useState('');
  const [damagedCount, setDamagedCount] = useState<string>('0');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = React.useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const prevOpenRef = React.useRef(false);
  const prevEditIdRef = React.useRef<string | null | undefined>(undefined);

  const nextSttForType = useMemo(() => {
    const normalizedTarget = normalizeBookType(type);
    const sameTypeList = (registerBooks || []).filter(
      (b) => normalizeBookType(b.type) === normalizedTarget
    );
    return sameTypeList.length + 1;
  }, [registerBooks, type]);

  useEffect(() => {
    if (!isOpen) {
      prevOpenRef.current = false;
      prevEditIdRef.current = undefined;
      submittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    const isNewlyOpened = !prevOpenRef.current && isOpen;
    const isEditTargetChanged = bookToEdit?.id !== prevEditIdRef.current;

    if (isNewlyOpened || isEditTargetChanged) {
      prevOpenRef.current = true;
      prevEditIdRef.current = bookToEdit?.id || null;

      if (bookToEdit) {
        const normalized = normalizeBookType(bookToEdit.type);
        setType(normalized);
        setStt(bookToEdit.stt || 1);
        setBookNumber(bookToEdit.bookNumber || '');
        setContent(bookToEdit.content || '');
        setRelatedPerson(bookToEdit.relatedPerson || '');
        setCreatedDate(bookToEdit.createdDate || new Date().toISOString().split('T')[0]);
        setStatus(bookToEdit.status || 'Đang xử lý');
        setNotes(bookToEdit.notes || '');
        setAttachments(bookToEdit.attachments || []);

        setIssueSerialNumber(bookToEdit.issueSerialNumber || '');
        setMapSheet(bookToEdit.mapSheet || '');
        setParcel(bookToEdit.parcel || '');

        setGcnForMutation(bookToEdit.gcnForMutation || '');
        setDossierCode(bookToEdit.dossierCode || bookToEdit.bookNumber || '');

        setBlankQuantity(
          bookToEdit.blankQuantity !== undefined && bookToEdit.blankQuantity !== null
            ? String(bookToEdit.blankQuantity)
            : ''
        );
        setSerialFrom(bookToEdit.serialFrom || '');
        setSerialTo(bookToEdit.serialTo || '');
        setDamagedCount(
          bookToEdit.damagedCount !== undefined && bookToEdit.damagedCount !== null
            ? String(bookToEdit.damagedCount)
            : '0'
        );
      } else {
        const initialType =
          defaultType && defaultType !== ('all' as any)
            ? normalizeBookType(defaultType)
            : 'Sổ cấp giấy';
        const sameTypeCount = (registerBooks || []).filter(
          (b) => normalizeBookType(b.type) === initialType
        ).length;

        setType(initialType);
        setStt(sameTypeCount + 1);
        setBookNumber('');
        setContent('');
        setRelatedPerson('');
        setCreatedDate(new Date().toISOString().split('T')[0]);
        setStatus('Đang xử lý');
        setNotes('');
        setAttachments([]);

        setIssueSerialNumber('');
        setMapSheet('');
        setParcel('');

        setGcnForMutation('');
        setDossierCode('');

        setBlankQuantity('');
        setSerialFrom('');
        setSerialTo('');
        setDamagedCount('0');
      }
      setErrorMsg(null);
    }
  }, [isOpen, bookToEdit, defaultType, registerBooks]);

  // Update auto STT when user switches book type in Create mode
  const handleTypeChange = (newType: RegisterBookType) => {
    setType(newType);
    if (!bookToEdit) {
      const sameTypeCount = (registerBooks || []).filter(
        (b) => normalizeBookType(b.type) === newType
      ).length;
      setStt(sameTypeCount + 1);
    }
    setErrorMsg(null);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setErrorMsg(null);

    if (type === 'Sổ cấp giấy') {
      if (!relatedPerson.trim()) {
        setErrorMsg('Vui lòng nhập Tên người được cấp GCN.');
        return;
      }
      if (!issueSerialNumber.trim() && !bookNumber.trim()) {
        setErrorMsg('Vui lòng nhập Số phát hành hoặc Số vào sổ.');
        return;
      }
    } else if (type === 'Sổ theo dõi biến động') {
      if (!relatedPerson.trim() || !content.trim()) {
        setErrorMsg('Vui lòng nhập Tên người sử dụng đất và Nội dung biến động (ĐKBĐ).');
        return;
      }
    } else if (type === 'Sổ theo dõi cấp phát phôi GCN') {
      if (!relatedPerson.trim() || !blankQuantity.toString().trim()) {
        setErrorMsg('Vui lòng nhập Họ tên người nhận và Số lượng phôi GCN.');
        return;
      }
    } else {
      if (!bookNumber.trim() || !content.trim() || !relatedPerson.trim()) {
        setErrorMsg('Vui lòng nhập số vào sổ, nội dung trích yếu và đối tượng liên quan.');
        return;
      }
    }

    const finalBookNumber =
      type === 'Sổ cấp giấy'
        ? bookNumber.trim() || issueSerialNumber.trim()
        : type === 'Sổ theo dõi biến động'
        ? dossierCode.trim() || bookNumber.trim() || `ĐKBĐ-${stt}`
        : type === 'Sổ theo dõi cấp phát phôi GCN'
        ? serialFrom.trim() && serialTo.trim()
          ? `${serialFrom.trim()} → ${serialTo.trim()}`
          : serialFrom.trim() || `PHÔI-${stt}`
        : bookNumber.trim();

    const finalContent =
      type === 'Sổ cấp giấy'
        ? `Số phát hành: ${issueSerialNumber.trim() || '---'} | Số vào sổ: ${bookNumber.trim() || '---'} | Tờ BĐ: ${mapSheet.trim() || '---'}, Thửa: ${parcel.trim() || '---'}`
        : type === 'Sổ theo dõi biến động'
        ? content.trim()
        : type === 'Sổ theo dõi cấp phát phôi GCN'
        ? `Số lượng: ${blankQuantity} phôi | Seri từ: ${serialFrom.trim() || '---'} đến: ${serialTo.trim() || '---'} | Hỏng: ${damagedCount || 0}`
        : content.trim();

    const payload: Partial<RegisterBook> = {
      stt: Number(stt) || nextSttForType,
      bookNumber: finalBookNumber,
      type,
      content: finalContent,
      relatedPerson: relatedPerson.trim(),
      createdDate,
      status,
      notes: notes.trim(),
      attachments,
      issueSerialNumber: issueSerialNumber.trim(),
      mapSheet: mapSheet.trim(),
      parcel: parcel.trim(),
      gcnForMutation: gcnForMutation.trim(),
      dossierCode: dossierCode.trim() || finalBookNumber,
      blankQuantity: blankQuantity !== '' ? Number(blankQuantity) || blankQuantity : '',
      serialFrom: serialFrom.trim(),
      serialTo: serialTo.trim(),
      damagedCount: damagedCount !== '' ? Number(damagedCount) || 0 : 0,
    };

    submittingRef.current = true;
    try {
      setIsSubmitting(true);
      if (bookToEdit) {
        await apiService.updateRegisterBook(bookToEdit.id, payload);
      } else {
        await apiService.createRegisterBook({
          ...payload,
          createdBy: user?.id,
          createdByName: user?.name,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu mục sổ theo dõi');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const getHeaderBadgeStyle = () => {
    if (type === 'Sổ cấp giấy') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (type === 'Sổ theo dõi biến động') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (type === 'Sổ theo dõi cấp phát phôi GCN') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Sticky Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-gradient-to-r from-slate-50 via-white to-amber-50/40 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shadow-2xs ${getHeaderBadgeStyle()}`}>
              {type === 'Sổ cấp giấy' ? (
                <Award className="w-4 h-4" />
              ) : type === 'Sổ theo dõi biến động' ? (
                <RefreshCw className="w-4 h-4" />
              ) : type === 'Sổ theo dõi cấp phát phôi GCN' ? (
                <Layers className="w-4 h-4" />
              ) : (
                <BookOpen className="w-4 h-4" />
              )}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                {bookToEdit ? `Chỉnh sửa bản ghi — ${type}` : `Vào sổ mới — ${type}`}
              </h2>
              <p className="text-[11px] text-slate-500">
                Sổ theo dõi nghiệp vụ địa chính chuẩn biểu mẫu UBND xã Lãnh Ngọc
              </p>
            </div>
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
          <div className="p-4 sm:p-5 space-y-4 text-xs">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            {/* Top Row: Loại sổ & TT & Trạng thái */}
            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-6">
                <label className="block font-bold text-slate-700 mb-1">
                  Loại sổ nghiệp vụ <span className="text-rose-500">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value as RegisterBookType)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                >
                  {BOOK_TYPES.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Số TT <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={stt}
                  onChange={(e) => setStt(Math.max(1, parseInt(e.target.value.replace(/\D/g, ''), 10) || 1))}
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-center font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block font-bold text-slate-700 mb-1">Trạng thái xử lý</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-slate-800 font-semibold focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                >
                  <option value="Đang xử lý">Đang xử lý</option>
                  <option value="Đã giải quyết">Đã giải quyết</option>
                  <option value="Theo dõi">Theo dõi</option>
                  <option value="Lưu trữ">Lưu trữ</option>
                </select>
              </div>
            </div>

            {/* =========================================================
                1. FORM FIELDS FOR: SỔ CẤP GIẤY
                Gồm: TT; Tên người được cấp GCN; Số phát hành; Số vào sổ; Số tờ bản đồ; Số thửa; Ghi chú
               ========================================================= */}
            {type === 'Sổ cấp giấy' && (
              <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200/80 space-y-3.5">
                <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    Thông tin Sổ cấp giấy chứng nhận (GCN)
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                    7 trường chuẩn
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8">
                    <label className="block font-bold text-slate-700 mb-1">
                      Tên người được cấp GCN <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={relatedPerson}
                      onChange={(e) => setRelatedPerson(e.target.value)}
                      placeholder="VD: Ông Nguyễn Văn A - Bà Trần Thị B"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block font-bold text-slate-700 mb-1">Ngày cấp / Vào sổ</label>
                    <VietnameseDateInput
                      value={createdDate}
                      onChange={(val) => setCreatedDate(val)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block font-bold text-slate-700 mb-1">
                      Số phát hành <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={issueSerialNumber}
                      onChange={(e) => setIssueSerialNumber(e.target.value)}
                      placeholder="VD: DP 849201"
                      className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 font-mono font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block font-bold text-slate-700 mb-1">
                      Số vào sổ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={bookNumber}
                      onChange={(e) => setBookNumber(e.target.value)}
                      placeholder="VD: CH 00125"
                      className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block font-bold text-slate-700 mb-1">Số tờ bản đồ</label>
                    <input
                      type="text"
                      value={mapSheet}
                      onChange={(e) => setMapSheet(e.target.value)}
                      placeholder="VD: 12"
                      className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block font-bold text-slate-700 mb-1">Số thửa</label>
                    <input
                      type="text"
                      value={parcel}
                      onChange={(e) => setParcel(e.target.value)}
                      placeholder="VD: 45"
                      className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ghi chú</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ghi chú thêm (VD: Đã trao GCN cho công dân ký nhận, thôn 1...)"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                  />
                </div>
              </div>
            )}

            {/* =========================================================
                2. FORM FIELDS FOR: SỔ THEO DÕI BIẾN ĐỘNG
                Gồm: TT; Ngày vào sổ; Tên người SD đất; GCN thực hiện đăng ký biến động (ĐKBĐ); Nội dung biến động (ĐKBĐ); Mã hồ sơ; Ghi chú
               ========================================================= */}
            {type === 'Sổ theo dõi biến động' && (
              <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200/80 space-y-3.5">
                <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                    Thông tin Sổ theo dõi biến động đất đai (ĐKBĐ)
                  </span>
                  <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                    7 trường chuẩn
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <label className="block font-bold text-slate-700 mb-1">
                      Ngày vào sổ (dd/mm/yyyy) <span className="text-rose-500">*</span>
                    </label>
                    <VietnameseDateInput
                      value={createdDate}
                      onChange={(val) => setCreatedDate(val)}
                    />
                  </div>

                  <div className="sm:col-span-8">
                    <label className="block font-bold text-slate-700 mb-1">
                      Tên người sử dụng đất (Người SD đất) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={relatedPerson}
                      onChange={(e) => setRelatedPerson(e.target.value)}
                      placeholder="VD: Ông Lê Văn C (chuyển nhượng cho bà Phạm Thị D)"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-7">
                    <label className="block font-bold text-slate-700 mb-1">
                      GCN thực hiện đăng ký biến động (ĐKBĐ) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={gcnForMutation}
                      onChange={(e) => setGcnForMutation(e.target.value)}
                      placeholder="VD: Số phát hành DP 849201 - Số vào sổ CH 00125 (Thửa 45, TBĐ 12)"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 font-mono font-semibold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block font-bold text-slate-700 mb-1">
                      Mã hồ sơ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={dossierCode}
                      onChange={(e) => {
                        setDossierCode(e.target.value);
                        setBookNumber(e.target.value);
                      }}
                      placeholder="VD: H17.130-260820-0012"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nội dung biến động (ĐKBĐ) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="VD: Chuyển nhượng toàn bộ diện tích 250,5 m² đất ONT tại thửa 45, tờ bản đồ số 12 cho bà Phạm Thị D..."
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ghi chú</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ghi chú thêm..."
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                  />
                </div>
              </div>
            )}

            {/* =========================================================
                3. FORM FIELDS FOR: SỔ THEO DÕI CẤP PHÁT PHÔI GCN
                Gồm: TT; Ngày tháng năm nhận; Họ tên người nhận; Số lượng; Seri phôi từ; Seri phôi đến; Số phôi hỏng; Ghi chú
               ========================================================= */}
            {type === 'Sổ theo dõi cấp phát phôi GCN' && (
              <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200/80 space-y-3.5">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    Thông tin Sổ theo dõi cấp phát phôi GCN
                  </span>
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                    8 trường chuẩn
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-4">
                    <label className="block font-bold text-slate-700 mb-1">
                      Ngày tháng năm nhận <span className="text-rose-500">*</span>
                    </label>
                    <VietnameseDateInput
                      value={createdDate}
                      onChange={(val) => setCreatedDate(val)}
                    />
                  </div>

                  <div className="sm:col-span-8">
                    <label className="block font-bold text-slate-700 mb-1">
                      Họ tên người nhận <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={relatedPerson}
                      onChange={(e) => setRelatedPerson(e.target.value)}
                      placeholder="VD: Đoàn Văn Hoài Vũ (Công chức Địa chính - Xây dựng)"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Số lượng (Phôi) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={blankQuantity}
                      onChange={(e) => setBlankQuantity(e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="VD: 50"
                      className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 font-mono font-bold text-amber-800 focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Seri phôi từ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={serialFrom}
                      onChange={(e) => setSerialFrom(e.target.value)}
                      placeholder="VD: DP 849201"
                      className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Seri phôi đến <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={serialTo}
                      onChange={(e) => setSerialTo(e.target.value)}
                      placeholder="VD: DP 849250"
                      className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Số phôi hỏng</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={damagedCount}
                      onChange={(e) => setDamagedCount(e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="VD: 0"
                      className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 font-mono font-bold text-rose-600 focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ghi chú</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ghi chú (VD: Đợt nhận phôi quý II/2026, lý do hỏng phôi nếu có...)"
                    className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                  />
                </div>
              </div>
            )}

            {/* =========================================================
                4. FORM FIELDS FOR OTHER REGISTER BOOKS
               ========================================================= */}
            {type !== 'Sổ cấp giấy' &&
              type !== 'Sổ theo dõi biến động' &&
              type !== 'Sổ theo dõi cấp phát phôi GCN' && (
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {type === 'Sổ theo dõi thu hồi GCN'
                          ? 'Số QĐ thu hồi / Số GCN bị thu hồi'
                          : type === 'Sổ theo dõi HS tặng cho đất NN'
                          ? 'Số vào sổ / Mã hồ sơ tặng cho'
                          : type === 'Sổ theo dõi xác nhận hạn mức đất ở'
                          ? 'Số vào sổ / Số văn bản xác nhận hạn mức'
                          : 'Số vào sổ / Số hiệu'}{' '}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={bookNumber}
                        onChange={(e) => setBookNumber(e.target.value)}
                        placeholder={
                          type === 'Sổ theo dõi thu hồi GCN'
                            ? 'VD: 45/QĐ-UBND (GCN: CS 01452)'
                            : type === 'Sổ theo dõi HS tặng cho đất NN'
                            ? 'VD: 12/HS-TCĐ/2026'
                            : type === 'Sổ theo dõi xác nhận hạn mức đất ở'
                            ? 'VD: 08/XN-UBND hoặc 08/HĐĐỞ'
                            : 'VD: 01/BB-VPHC/2026 hoặc 15/PCT'
                        }
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Ngày lập / Ngày vào sổ (dd/mm/yyyy)
                      </label>
                      <VietnameseDateInput
                        value={createdDate}
                        onChange={(val) => setCreatedDate(val)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {type === 'Sổ theo dõi thu hồi GCN'
                        ? 'Người có GCN bị thu hồi (Chủ sử dụng đất)'
                        : type === 'Sổ theo dõi HS tặng cho đất NN'
                        ? 'Hộ gia đình / Cá nhân tặng cho đất'
                        : type === 'Sổ theo dõi xác nhận hạn mức đất ở'
                        ? 'Họ tên chủ sử dụng đất / Hộ gia đình được xác nhận hạn mức'
                        : 'Đối tượng liên quan (Hộ gia đình / Chủ đất / Người vi phạm)'}{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={relatedPerson}
                      onChange={(e) => setRelatedPerson(e.target.value)}
                      placeholder={
                        type === 'Sổ theo dõi thu hồi GCN'
                          ? 'VD: Ông Nguyễn Văn A – Thôn 2, xã Lãnh Ngọc'
                          : type === 'Sổ theo dõi HS tặng cho đất NN'
                          ? 'VD: Hộ ông Trần Văn B – Thôn 4, xã Lãnh Ngọc'
                          : type === 'Sổ theo dõi xác nhận hạn mức đất ở'
                          ? 'VD: Hộ ông Lê Văn C – Thôn 1, xã Lãnh Ngọc'
                          : 'VD: Hộ ông Nguyễn Văn A (Thôn 1, xã Lãnh Ngọc)'
                      }
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {type === 'Sổ theo dõi thu hồi GCN'
                        ? 'Lý do & Nội dung thu hồi GCN'
                        : type === 'Sổ theo dõi HS tặng cho đất NN'
                        ? 'Nội dung tặng cho đất Nhà nước (Thửa, tờ, diện tích, mục đích)'
                        : type === 'Sổ theo dõi xác nhận hạn mức đất ở'
                        ? 'Nội dung xác nhận hạn mức đất ở (Tờ BĐ, số thửa, diện tích hạn mức)'
                        : 'Nội dung / Trích yếu'}{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={
                        type === 'Sổ theo dõi thu hồi GCN'
                          ? 'VD: Thu hồi GCN số phát hành DP 123456 do cấp sai diện tích tại thửa 42, tờ BĐ 15...'
                          : type === 'Sổ theo dõi HS tặng cho đất NN'
                          ? 'VD: Hiến 85,5 m² đất tại thửa 108, tờ BĐ số 12 để mở rộng đường giao thông nông thôn...'
                          : type === 'Sổ theo dõi xác nhận hạn mức đất ở'
                          ? 'VD: Xác nhận hạn mức đất ở 200,0 m² tại thửa đất số 65, tờ bản đồ số 14, xã Lãnh Ngọc...'
                          : 'Nhập tóm tắt nội dung ghi nhận trong sổ...'
                      }
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ghi chú</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Thông tin bổ sung..."
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                    />
                  </div>
                </div>
              )}

            <FileUpload
              attachments={attachments}
              onChange={setAttachments}
              label="Tệp scan hồ sơ / Biên bản đính kèm"
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
              className="px-4 py-1.5 rounded-lg font-bold text-white bg-amber-600 hover:bg-amber-700 active:scale-95 transition-colors shadow-xs disabled:opacity-50 text-xs cursor-pointer"
            >
              {isSubmitting ? 'Đang lưu...' : bookToEdit ? 'Cập nhật mục sổ' : 'Lưu vào sổ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
