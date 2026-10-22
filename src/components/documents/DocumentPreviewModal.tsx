import React, { useState } from 'react';
import { DocumentItem, Attachment } from '../../types';
import { formatDate, formatFileSize } from '../../utils/date';
import { PREVIEW_ACTIONS_LAYOUT, PREVIEW_ACTION_BUTTON_LAYOUT, PREVIEW_HEADER_LAYOUT } from '../common/previewModalStyles';
import {
  FileText,
  X,
  Printer,
  Download,
  ExternalLink,
  Copy,
  Check,
  Building2,
  Calendar,
  UserCheck,
  Paperclip,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Eye,
  AlertCircle,
  Tag,
  Clock,
  Sparkles,
  Share2,
  Edit3,
} from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem | null;
  initialAttachmentIndex?: number;
  onOpenEdit?: (doc: DocumentItem) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  document,
  initialAttachmentIndex = 0,
  onOpenEdit,
}) => {
  const [selectedAttachmentIdx, setSelectedAttachmentIdx] = useState<number>(initialAttachmentIndex);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  // Sync selected index when document changes
  React.useEffect(() => {
    setSelectedAttachmentIdx(initialAttachmentIndex || 0);
    setZoomLevel(100);
    setRotation(0);
  }, [document, initialAttachmentIndex]);

  if (!isOpen || !document) return null;

  const currentAttachment: Attachment | undefined = document.attachments?.[selectedAttachmentIdx];
  const isImage = currentAttachment?.contentType?.startsWith('image/');
  const isPdf = currentAttachment?.contentType === 'application/pdf';

  const handleCopySummary = () => {
    const textToCopy = `[${document.type}] Số: ${document.number}\nCơ quan ban hành: ${document.issuingAuthority || 'UBND'}\nNgày ban hành: ${formatDate(document.issueDate)}\nTrích yếu: ${document.title}${document.direction ? `\nÝ kiến chỉ đạo: ${document.direction}` : ''}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Đã hoàn thành':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800">
            ✓ Đã hoàn thành
          </span>
        );
      case 'Đang xử lý':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800">
            ⏳ Đang xử lý
          </span>
        );
      case 'Chưa xử lý':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800">
            ⚠️ Chưa xử lý
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            📁 {status}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[94vh]">
        {/* Top Header */}
        <div className={`${PREVIEW_HEADER_LAYOUT} bg-slate-50 dark:bg-slate-800/90 border-b border-gray-200 dark:border-slate-800`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 text-xs font-bold font-mono">
                  {document.number}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {document.type}
                </span>
                {getStatusBadge(document.status)}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate mt-0.5">
                {document.title}
              </h2>
            </div>
          </div>

          <div className={`${PREVIEW_ACTIONS_LAYOUT} flex-wrap`}>
            <button
              type="button"
              onClick={handleCopySummary}
              className={`${PREVIEW_ACTION_BUTTON_LAYOUT} rounded-lg text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer`}
              title="Sao chép thông tin trích yếu"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span className="hidden md:inline">{copied ? 'Đã sao chép' : 'Sao chép'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className={`${PREVIEW_ACTION_BUTTON_LAYOUT} rounded-lg text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer`}
              title="In phiếu thông tin văn bản"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden md:inline">In</span>
            </button>

            {onOpenEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEdit(document);
                }}
                className={`${PREVIEW_ACTION_BUTTON_LAYOUT} rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer`}
                title="Chỉnh sửa văn bản"
              >
                <Edit3 className="w-4 h-4" />
                <span className="hidden md:inline">Chỉnh sửa</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-800 transition cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Content (2 Columns on large screens, single column on small screens) */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Left Column: Metadata and Details */}
          <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-slate-800 p-4 sm:p-5 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/40 space-y-4 shrink-0">
            {/* Administrative Card */}
            <div className="p-3.5 bg-white dark:bg-slate-800/80 rounded-xl border border-gray-200 dark:border-slate-700/80 shadow-2xs space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Cơ quan ban hành:</span>
                  <span className="font-bold text-slate-900 dark:text-white uppercase">
                    {document.issuingAuthority || 'UBND Huyện'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Ngày ban hành:</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {formatDate(document.issueDate)}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Cán bộ phụ trách xử lý:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {document.ownerName || 'Chưa giao'}
                  </span>
                </div>
              </div>
            </div>

            {/* Trích yếu nội dung */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Trích yếu nội dung:</span>
              </label>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                {document.title}
              </div>
            </div>

            {/* Ý kiến chỉ đạo của Lãnh đạo */}
            {document.direction ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ý kiến chỉ đạo / Giao việc:</span>
                </label>
                <div className="p-3 bg-amber-50/80 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/60 text-xs sm:text-sm text-amber-900 dark:text-amber-200 font-semibold leading-relaxed">
                  {document.direction}
                </div>
              </div>
            ) : null}

            {/* Attachments List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tệp scan đính kèm ({document.attachments?.length || 0})</span>
                </span>
              </div>

              {!document.attachments || document.attachments.length === 0 ? (
                <div className="p-4 rounded-xl bg-white dark:bg-slate-800/60 border border-dashed border-gray-200 dark:border-slate-700 text-center text-xs text-slate-400">
                  Văn bản này chưa đính kèm tệp scan PDF hoặc ảnh.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {document.attachments.map((att, idx) => {
                    const isSelected = selectedAttachmentIdx === idx;
                    return (
                      <button
                        key={att.id || idx}
                        type="button"
                        onClick={() => {
                          setSelectedAttachmentIdx(idx);
                          setZoomLevel(100);
                          setRotation(0);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 shadow-2xs'
                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                              att.contentType === 'application/pdf'
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600'
                                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {att.name}
                            </p>
                            <p className="text-[10px] text-slate-400">{formatFileSize(att.size)}</p>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0 bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                            Đang xem
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Visual Preview Canvas / Document Display */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-200/70 dark:bg-slate-950 overflow-hidden">
            {/* Visual Controls Bar */}
            <div className="px-4 py-2 bg-white/90 dark:bg-slate-800/90 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                  {currentAttachment ? currentAttachment.name : 'Khung Xem Trước Văn Bản Hành Chính'}
                </span>
                {currentAttachment && (
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    ({formatFileSize(currentAttachment.size)})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isImage && (
                  <>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700"
                      title="Thu nhỏ"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300 px-1">
                      {zoomLevel}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(250, z + 25))}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700"
                      title="Phóng to"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700"
                      title="Xoay 90 độ"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                {currentAttachment && (
                  <>
                    <a
                      href={currentAttachment.url}
                      download={currentAttachment.name}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition"
                      title="Tải tệp đính kèm về máy"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Tải về</span>
                    </a>
                    <a
                      href={currentAttachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs transition"
                      title="Mở tệp ở cửa sổ / tab mới"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Mở tab mới</span>
                    </a>
                  </>
                )}
              </div>
            </div>

            {/* Preview Canvas Area */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center min-h-[360px]">
              {currentAttachment ? (
                isImage ? (
                  <div className="overflow-auto max-h-full max-w-full flex items-center justify-center p-2">
                    <img
                      src={currentAttachment.url}
                      alt={currentAttachment.name}
                      style={{
                        transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                        transition: 'transform 0.2s ease',
                      }}
                      className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-xl bg-white border border-gray-300"
                    />
                  </div>
                ) : isPdf ? (
                  <iframe
                    src={currentAttachment.url}
                    title={currentAttachment.name}
                    className="w-full h-full min-h-[550px] rounded-xl border border-gray-300 dark:border-slate-800 bg-white shadow-xl"
                  />
                ) : (
                  <div className="text-center p-8 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl max-w-md shadow-xl space-y-3">
                    <FileText className="w-14 h-14 text-blue-500 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {currentAttachment.name}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Tệp định dạng ({currentAttachment.contentType}) có thể tải về trực tiếp để mở bằng phần mềm chuyên dụng.
                    </p>
                    <a
                      href={currentAttachment.url}
                      download={currentAttachment.name}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                    >
                      <Download className="w-4 h-4" />
                      <span>Tải tệp đính kèm về máy tính</span>
                    </a>
                  </div>
                )
              ) : (
                /* Administrative Official Document Paper Simulation */
                <div className="w-full max-w-2xl bg-white text-slate-900 p-8 sm:p-12 shadow-2xl rounded-xl border border-gray-300 font-serif leading-relaxed text-sm my-auto">
                  {/* Administrative Header */}
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-900 font-sans">
                    <div className="text-center">
                      <div className="text-xs uppercase font-extrabold text-slate-900">
                        {document.issuingAuthority || 'ỦY BAN NHÂN DÂN'}
                      </div>
                      <div className="w-20 h-[1px] bg-slate-900 mx-auto my-1"></div>
                      <div className="text-xs font-mono font-bold text-blue-900">
                        Số: {document.number}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs uppercase font-bold text-slate-900">
                        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        Độc lập - Tự do - Hạnh phúc
                      </div>
                      <div className="w-24 h-[1px] bg-slate-900 mx-auto my-1"></div>
                      <div className="text-[11px] text-slate-600 italic">
                        Ngày {new Date(document.issueDate).getDate() || new Date().getDate()} tháng{' '}
                        {new Date(document.issueDate).getMonth() + 1 || new Date().getMonth() + 1} năm{' '}
                        {new Date(document.issueDate).getFullYear() || new Date().getFullYear()}
                      </div>
                    </div>
                  </div>

                  {/* Document Type & Title */}
                  <div className="text-center my-6">
                    <h3 className="text-base sm:text-lg font-bold font-sans uppercase text-slate-900 tracking-wide">
                      {document.type}
                    </h3>
                    <p className="text-xs font-sans font-semibold text-slate-700 italic mt-1 max-w-lg mx-auto">
                      V/v: {document.title}
                    </p>
                  </div>

                  {/* Body Content / Instruction */}
                  <div className="space-y-4 font-sans text-xs sm:text-sm text-slate-800">
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1">
                      <span className="font-bold text-blue-900 block text-xs">
                        📌 Tóm tắt trích yếu nội dung:
                      </span>
                      <p className="text-slate-800 leading-relaxed font-medium">
                        {document.title}
                      </p>
                    </div>

                    {document.direction && (
                      <div className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-xl space-y-1">
                        <span className="font-bold text-amber-900 block text-xs">
                          ⚡ Ý kiến chỉ đạo / Giao việc của Lãnh đạo:
                        </span>
                        <p className="text-slate-900 leading-relaxed font-semibold">
                          {document.direction}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                      <div>
                        <span className="text-slate-500 font-medium">Cán bộ phụ trách thụ lý:</span>
                        <p className="font-bold text-slate-800">{document.ownerName || 'Chưa giao'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Tình trạng thực hiện:</span>
                        <p className="font-bold text-emerald-700">{document.status}</p>
                      </div>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-2 gap-8 mt-12 pt-4 font-sans text-center">
                    <div className="text-left text-[11px] text-slate-600 space-y-1">
                      <p className="font-bold text-slate-800">Nơi nhận:</p>
                      <p>- Lãnh đạo UBND;</p>
                      <p>- Cán bộ phụ trách;</p>
                      <p>- Lưu: VT.</p>
                    </div>
                    <div>
                      <div className="font-bold text-xs uppercase text-slate-900">
                        THẨM QUYỀN BAN HÀNH
                      </div>
                      <div className="text-[11px] italic text-slate-500">(Ký số / Đóng dấu)</div>
                      <div className="h-16 flex items-center justify-center">
                        <span className="px-3 py-1 bg-red-50 border border-red-300 text-red-700 text-[10px] font-bold rounded uppercase">
                          ĐÃ KÝ DUYỆT ĐIỆN TỬ
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
