import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  FileText,
  Image as ImageIcon,
  Trash2,
  Edit2,
  Check,
  X,
  ExternalLink,
  Plus,
  Eye,
  MapPin,
  Calendar,
  Sparkles,
  Printer,
  Download,
  ShieldCheck,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { DisputeCase, DisputeEvidenceItem, DisputeEvidenceCategory } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { formatFileSize } from '../../utils/date';

interface DisputeEvidenceManagerProps {
  dispute: DisputeCase;
  onUpdateDispute: (updated: DisputeCase) => void;
  onOpenPrintEvidence?: () => void;
}

const CATEGORY_CONFIG: Record<
  DisputeEvidenceCategory,
  { label: string; shortLabel: string; bg: string; text: string; icon: any }
> = {
  photo_field: {
    label: 'Ảnh chụp hiện trạng & mốc giới',
    shortLabel: 'Ảnh hiện trường',
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
    icon: Camera,
  },
  minute_field: {
    label: 'Biên bản lập tại hiện trường',
    shortLabel: 'Biên bản thực địa',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    icon: FileText,
  },
  sketch_map: {
    label: 'Sơ đồ trích đo hiện trạng & tứ cận',
    shortLabel: 'Sơ đồ trích đo',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-800',
    icon: MapPin,
  },
  legal_doc: {
    label: 'Giấy tờ nguồn gốc đất / GCN / Viết tay',
    shortLabel: 'Giấy tờ đất',
    bg: 'bg-purple-50 border-purple-200',
    text: 'text-purple-700',
    icon: ShieldCheck,
  },
  witness_statement: {
    label: 'Lời khai nhân chứng & Hộ tứ cận',
    shortLabel: 'Lời khai nhân chứng',
    bg: 'bg-teal-50 border-teal-200',
    text: 'text-teal-700',
    icon: Tag,
  },
  other: {
    label: 'Tài liệu, tư liệu khác',
    shortLabel: 'Tư liệu khác',
    bg: 'bg-gray-100 border-gray-200',
    text: 'text-slate-700',
    icon: FileText,
  },
};

export const DisputeEvidenceManager: React.FC<DisputeEvidenceManagerProps> = ({
  dispute,
  onUpdateDispute,
  onOpenPrintEvidence,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick form for new upload defaults
  const [selectedCategory, setSelectedCategory] = useState<DisputeEvidenceCategory>('photo_field');
  const [captionInput, setCaptionInput] = useState('');
  const [locationNoteInput, setLocationNoteInput] = useState('');

  // Editing existing evidence item
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editCategory, setEditCategory] = useState<DisputeEvidenceCategory>('photo_field');
  const [editLocationNote, setEditLocationNote] = useState('');

  // Lightbox preview for full images
  const [previewImage, setPreviewImage] = useState<DisputeEvidenceItem | null>(null);

  const evidences = dispute.fieldEvidences || [];

  // Grouped stats
  const photoCount = evidences.filter((e) => e.category === 'photo_field').length;
  const minuteCount = evidences.filter((e) => e.category === 'minute_field').length;
  const sketchCount = evidences.filter((e) => e.category === 'sketch_map').length;
  const docCount = evidences.filter((e) => e.category === 'legal_doc' || e.category === 'witness_statement').length;

  const filteredEvidences = evidences.filter((e) => {
    if (filterCategory === 'all') return true;
    return e.category === filterCategory;
  });

  // Handle file selection and upload
  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setSuccessMsg(null);

    try {
      const fileList = Array.from(files) as File[];
      const uploadedAttachments = await apiService.uploadFiles(
        fileList,
        user?.id || 'user_hoaivu',
        user?.name || 'Cán bộ thụ lý',
        true
      );

      const todayStr = new Date().toISOString().split('T')[0];

      // Convert attachments to DisputeEvidenceItems
      const newEvidenceItems: DisputeEvidenceItem[] = uploadedAttachments.map((att, idx) => {
        const isImg = att.contentType.startsWith('image/');
        const cat: DisputeEvidenceCategory = selectedCategory || (isImg ? 'photo_field' : 'minute_field');
        const defaultCap =
          captionInput.trim() ||
          (cat === 'photo_field'
            ? `Ảnh chụp hiện trạng ranh mốc thực tế tại thửa ${dispute.parcel} (${att.name})`
            : cat === 'minute_field'
            ? `Biên bản làm việc xác minh thực địa (${att.name})`
            : att.name);

        return {
          id: att.id || `ev_${Date.now()}_${idx}`,
          name: att.name,
          path: att.path,
          url: att.url,
          contentType: att.contentType,
          size: att.size,
          category: cat,
          caption: defaultCap,
          locationNote: locationNoteInput.trim() || `Thửa ${dispute.parcel}, ${dispute.location}`,
          capturedDate: todayStr,
          uploadedBy: att.uploadedBy,
          uploadedByName: att.uploadedByName,
          uploadedAt: att.uploadedAt || new Date().toISOString(),
        };
      });

      const updatedList = [...evidences, ...newEvidenceItems];

      // Save to dispute
      const updatedDispute = await apiService.updateDispute(dispute.id, {
        fieldEvidences: updatedList,
      });

      onUpdateDispute(updatedDispute);
      setSuccessMsg(`Đã tải lên và lưu thành công ${newEvidenceItems.length} tư liệu hiện trường!`);
      setCaptionInput('');
      setLocationNoteInput('');

      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setUploadError(err?.message || 'Lỗi khi tải tệp lên máy chủ');
    } finally {
      setIsUploading(false);
    }
  };

  // Delete evidence
  const handleDeleteEvidence = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài liệu/ảnh hiện trường này?')) return;
    try {
      const updatedList = evidences.filter((e) => e.id !== id);
      const updatedDispute = await apiService.updateDispute(dispute.id, {
        fieldEvidences: updatedList,
      });
      onUpdateDispute(updatedDispute);
      setSuccessMsg('Đã xóa tài liệu khỏi danh mục thu thập.');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      setUploadError(err?.message || 'Lỗi khi xóa tư liệu');
    }
  };

  // Start editing
  const startEditing = (item: DisputeEvidenceItem) => {
    setEditingId(item.id);
    setEditCaption(item.caption || item.name);
    setEditCategory(item.category);
    setEditLocationNote(item.locationNote || '');
  };

  // Save edit
  const saveEditing = async (id: string) => {
    try {
      const updatedList = evidences.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          caption: editCaption.trim(),
          category: editCategory,
          locationNote: editLocationNote.trim(),
        };
      });

      const updatedDispute = await apiService.updateDispute(dispute.id, {
        fieldEvidences: updatedList,
      });
      onUpdateDispute(updatedDispute);
      setEditingId(null);
      setSuccessMsg('Đã cập nhật thông tin tư liệu.');
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err: any) {
      setUploadError(err?.message || 'Lỗi khi cập nhật tư liệu');
    }
  };

  // Sync / inject into verification minute notes
  const handleCiteIntoReport = async () => {
    if (evidences.length === 0) {
      alert('Chưa có tư liệu hiện trường nào để trích dẫn vào Báo cáo xác minh.');
      return;
    }

    const citationText = `\n- Hồ sơ dữ liệu thu thập thực tế tại hiện trường: Đã lập danh mục ${
      evidences.length
    } tư liệu xác minh gồm ${photoCount} ảnh chụp hiện trạng mốc giới, ${minuteCount} biên bản làm việc tại thực địa, ${sketchCount} sơ đồ trích đo và ${docCount} hồ sơ nguồn gốc đất. Chi tiết có Phụ lục ảnh và tài liệu hiện trường đính kèm.`;

    try {
      // If examinationReport exists, append or update fieldVerificationSummary
      const currentReport = dispute.examinationReport;
      if (currentReport) {
        let updatedSummary = currentReport.fieldVerificationSummary || '';
        if (!updatedSummary.includes('Hồ sơ dữ liệu thu thập thực tế tại hiện trường')) {
          updatedSummary += citationText;
        }
        await apiService.saveExaminationReport(dispute.id, {
          ...currentReport,
          fieldVerificationSummary: updatedSummary,
        });
      }

      // If verificationMinute exists, append into actualCheckFindings
      const currentMinute = dispute.verificationMinute;
      if (currentMinute) {
        let updatedFindings = currentMinute.actualCheckFindings || '';
        if (!updatedFindings.includes('Ảnh hiện trường và biên bản lập tại thực địa')) {
          updatedFindings += ` (Đã thu thập đầy đủ ${evidences.length} ảnh hiện trường và biên bản đo đạc lưu trong hồ sơ).`;
        }
        const updatedDisp = await apiService.saveVerificationMinute(dispute.id, {
          ...currentMinute,
          actualCheckFindings: updatedFindings,
        });
        onUpdateDispute(updatedDisp);
      }

      setSuccessMsg('Đã tự động trích dẫn danh mục ảnh & biên bản hiện trường vào Báo cáo thẩm tra và Biên bản xác minh!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setUploadError(err?.message || 'Lỗi khi liên kết dữ liệu vào Báo cáo');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Info */}
      <div className="p-4 bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border border-blue-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <Camera className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Nhập & Quản lý dữ liệu thu thập tại hiện trường
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold border border-blue-200">
              Phục vụ Báo cáo xác minh
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Tải lên ảnh chụp thực tế mốc giới, ranh giới cắm cọc, biên bản làm việc lập tại hiện trường, sơ đồ trích đo và lời khai nhân chứng tại thực địa thửa số{' '}
            <span className="font-semibold text-slate-900">{dispute.parcel}</span>, tờ BĐ số{' '}
            <span className="font-semibold text-slate-900">{dispute.mapSheet}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={handleCiteIntoReport}
            className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
            title="Tự động trích dẫn số lượng ảnh và biên bản này vào Báo cáo thẩm tra"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Đưa vào Báo cáo thẩm tra</span>
          </button>

          {onOpenPrintEvidence && (
            <button
              onClick={onOpenPrintEvidence}
              className="px-3 py-2 rounded-xl bg-white hover:bg-gray-100 border border-gray-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
              title="In Phụ lục Album ảnh & Chứng cứ hiện trường kèm theo Báo cáo"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>In Album ảnh hiện trường</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats of collected evidence */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setFilterCategory('photo_field')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            filterCategory === 'photo_field'
              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-300'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Ảnh chụp hiện trường</span>
            <Camera className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-black text-blue-700 mt-1">{photoCount}</p>
          <p className="text-[10px] text-slate-400">Mốc giới, ranh giới, cây cối</p>
        </div>

        <div
          onClick={() => setFilterCategory('minute_field')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            filterCategory === 'minute_field'
              ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-300'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Biên bản tại thực địa</span>
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700 mt-1">{minuteCount}</p>
          <p className="text-[10px] text-slate-400">Biên bản đo vẽ, lấy lời khai</p>
        </div>

        <div
          onClick={() => setFilterCategory('sketch_map')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            filterCategory === 'sketch_map'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-300'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Sơ đồ trích đo</span>
            <MapPin className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-700 mt-1">{sketchCount}</p>
          <p className="text-[10px] text-slate-400">Bản vẽ tứ cận, mốc ranh</p>
        </div>

        <div
          onClick={() => setFilterCategory('all')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            filterCategory === 'all'
              ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-300'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Tổng tư liệu thu thập</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-black text-purple-700 mt-1">{evidences.length}</p>
          <p className="text-[10px] text-slate-400">Hồ sơ chứng cứ hoàn chỉnh</p>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {uploadError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Upload Zone Card */}
      <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Tải lên tư liệu hiện trường mới</span>
          </h4>
          <span className="text-[11px] text-slate-400">
            Hỗ trợ PNG, JPG, JPEG, WEBP, PDF (tối đa 50MB)
          </span>
        </div>

        {/* Upload Meta Inputs: category & default caption */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Phân loại tư liệu:
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as DisputeEvidenceCategory)}
              className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:border-blue-500 font-medium"
            >
              <option value="photo_field">📷 Ảnh chụp hiện trạng & mốc giới</option>
              <option value="minute_field">📝 Biên bản lập tại hiện trường</option>
              <option value="sketch_map">📐 Sơ đồ trích đo hiện trạng & tứ cận</option>
              <option value="legal_doc">📜 Giấy tờ nguồn gốc đất / GCN / Viết tay</option>
              <option value="witness_statement">👥 Lời khai nhân chứng & Tứ cận</option>
              <option value="other">📎 Tư liệu khác</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Vị trí / Ranh giới mốc:
            </label>
            <input
              type="text"
              value={locationNoteInput}
              onChange={(e) => setLocationNoteInput(e.target.value)}
              placeholder="VD: Ranh phía Đông giáp nhà ông B, Cọc mốc số 1..."
              className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Chú thích ảnh / Ghi chú hiện trường:
            </label>
            <input
              type="text"
              value={captionInput}
              onChange={(e) => setCaptionInput(e.target.value)}
              placeholder="VD: Hàng rào lưới B40 lấn xiên 0.9m về phía thửa 45..."
              className="w-full text-xs px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:border-blue-500"
            />
          </div>
        </div>

        {/* Drag Drop Click Zone */}
        <div
          onClick={() => {
            if (isUploading) return;
            fileInputRef.current?.click();
          }}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isUploading
              ? 'opacity-60 bg-gray-100 border-gray-300'
              : 'border-blue-300 bg-blue-50/30 hover:bg-blue-50/70 hover:border-blue-500'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFilesSelect}
            accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx"
          />
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-800">
                {isUploading
                  ? 'Đang tải tệp lên máy chủ...'
                  : 'Nhấp để chọn ảnh chụp hiện trường hoặc biên bản scan'}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Có thể chọn nhiều ảnh hiện trường cùng lúc hoặc kéo thả vào khung này
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Category Toolbar & Evidence Count */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 mr-1">Lọc xem:</span>
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              filterCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
            }`}
          >
            Tất cả ({evidences.length})
          </button>
          <button
            onClick={() => setFilterCategory('photo_field')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              filterCategory === 'photo_field'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
            }`}
          >
            📷 Ảnh hiện trường ({photoCount})
          </button>
          <button
            onClick={() => setFilterCategory('minute_field')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              filterCategory === 'minute_field'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
            }`}
          >
            📝 Biên bản thực địa ({minuteCount})
          </button>
          <button
            onClick={() => setFilterCategory('sketch_map')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              filterCategory === 'sketch_map'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
            }`}
          >
            📐 Sơ đồ đo đạc ({sketchCount})
          </button>
          <button
            onClick={() => setFilterCategory('legal_doc')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              filterCategory === 'legal_doc'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-slate-600 hover:bg-gray-200'
            }`}
          >
            📜 Giấy tờ đất & Lời khai ({docCount})
          </button>
        </div>

        <span className="text-xs text-slate-400">
          Hiển thị {filteredEvidences.length} / {evidences.length} tư liệu
        </span>
      </div>

      {/* Evidence Gallery Grid */}
      {filteredEvidences.length === 0 ? (
        <div className="p-12 text-center bg-gray-50 border border-dashed border-gray-300 rounded-2xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-gray-100 text-slate-400 flex items-center justify-center mx-auto">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Chưa có dữ liệu thu thập nào</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Hãy tải lên ảnh chụp hiện trường hoặc biên bản xác minh để hoàn thiện hồ sơ báo cáo
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvidences.map((item, index) => {
            const isImage = item.contentType.startsWith('image/');
            const isPdf = item.contentType === 'application/pdf';
            const catCfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.other;
            const isCurrentlyEditing = editingId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
              >
                {/* Visual Preview / Thumbnail */}
                <div className="relative h-44 bg-slate-900 overflow-hidden flex items-center justify-center">
                  {isImage ? (
                    <img
                      src={item.url}
                      alt={item.caption || item.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                      onClick={() => setPreviewImage(item)}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-300 p-4 text-center">
                      {isPdf ? (
                        <FileText className="w-12 h-12 text-rose-400" />
                      ) : (
                        <FileText className="w-12 h-12 text-blue-400" />
                      )}
                      <span className="text-xs font-semibold truncate max-w-full px-2">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatFileSize(item.size)}
                      </span>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                      #{index + 1}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-xs ${catCfg.bg} ${catCfg.text}`}
                    >
                      {catCfg.shortLabel}
                    </span>
                  </div>

                  {/* Quick Preview Hover Button */}
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
                    {isImage && (
                      <button
                        onClick={() => setPreviewImage(item)}
                        className="px-3 py-1.5 rounded-xl bg-white/90 text-slate-900 text-xs font-bold flex items-center gap-1 cursor-pointer pointer-events-auto shadow-md hover:bg-white"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem ảnh lớn</span>
                      </button>
                    )}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-white/90 text-slate-900 text-xs font-bold flex items-center gap-1 cursor-pointer pointer-events-auto shadow-md hover:bg-white"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải về</span>
                    </a>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  {isCurrentlyEditing ? (
                    /* Inline Editing Mode */
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Phân loại:</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as DisputeEvidenceCategory)}
                          className="w-full text-xs p-1.5 border border-gray-300 rounded-lg mt-0.5"
                        >
                          <option value="photo_field">Ảnh chụp hiện trường</option>
                          <option value="minute_field">Biên bản lập tại hiện trường</option>
                          <option value="sketch_map">Sơ đồ trích đo</option>
                          <option value="legal_doc">Giấy tờ nguồn gốc đất</option>
                          <option value="witness_statement">Lời khai nhân chứng</option>
                          <option value="other">Tài liệu khác</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Vị trí / Ranh mốc:</label>
                        <input
                          type="text"
                          value={editLocationNote}
                          onChange={(e) => setEditLocationNote(e.target.value)}
                          className="w-full text-xs p-1.5 border border-gray-300 rounded-lg mt-0.5"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500">Chú thích chi tiết:</label>
                        <textarea
                          rows={2}
                          value={editCaption}
                          onChange={(e) => setEditCaption(e.target.value)}
                          className="w-full text-xs p-1.5 border border-gray-300 rounded-lg mt-0.5"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => saveEditing(item.id)}
                          className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-emerald-700"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Lưu</span>
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 rounded-lg bg-gray-200 text-slate-700 text-xs font-semibold cursor-pointer hover:bg-gray-300"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">
                        {item.caption || item.name}
                      </p>

                      {item.locationNote && (
                        <div className="flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{item.locationNote}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-gray-100">
                        <span>Ngày lập: {item.capturedDate || item.uploadedAt?.slice(0, 10)}</span>
                        <span>{formatFileSize(item.size)}</span>
                      </div>
                    </div>
                  )}

                  {/* Bottom Action Buttons */}
                  {!isCurrentlyEditing && (
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <button
                        onClick={() => startEditing(item)}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Sửa ghi chú</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-gray-100 cursor-pointer"
                          title="Mở tab mới"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleDeleteEvidence(item.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                          title="Xóa tư liệu này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal for Full Image Preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar */}
            <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="text-xs sm:text-sm font-bold truncate max-w-lg">
                  {previewImage.caption || previewImage.name}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {previewImage.locationNote} • {previewImage.capturedDate}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  download={previewImage.name}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-blue-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải ảnh gốc</span>
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo View */}
            <div className="flex-1 bg-black flex items-center justify-center overflow-auto p-2 max-h-[70vh]">
              <img
                src={previewImage.url}
                alt={previewImage.caption}
                className="max-h-[68vh] max-w-full object-contain"
              />
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 text-xs text-slate-600">
              <span className="font-semibold text-slate-800">Ghi chú xác minh hiện trường:</span>{' '}
              {previewImage.caption || 'Ảnh chụp thực tế ranh giới thửa đất.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
