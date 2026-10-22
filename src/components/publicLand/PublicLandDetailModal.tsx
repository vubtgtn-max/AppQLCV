import React from 'react';
import {
  X,
  Landmark,
  FileText,
  Calendar,
  User,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  Edit,
  History,
  FileSignature,
} from 'lucide-react';
import { PublicLandParcel } from '../../types';

interface PublicLandDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcel: PublicLandParcel | null;
  onOpenEdit: (parcel: PublicLandParcel) => void;
  onOpenPayment: (parcel: PublicLandParcel) => void;
  onOpenContract: (parcel: PublicLandParcel) => void;
  onPrintContract: (parcel: PublicLandParcel) => void;
}

export const PublicLandDetailModal: React.FC<PublicLandDetailModalProps> = ({
  isOpen,
  onClose,
  parcel,
  onOpenEdit,
  onOpenPayment,
  onOpenContract,
  onPrintContract,
}) => {
  if (!isOpen || !parcel) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let daysRemaining: number | null = null;
  let isExpiringSoon = false;
  let isExpired = false;

  if (parcel.leaseEndDate) {
    const end = new Date(parcel.leaseEndDate);
    end.setHours(0, 0, 0, 0);
    daysRemaining = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysRemaining <= 0) isExpired = true;
    else if (daysRemaining <= 60) isExpiringSoon = true;
  }

  const getStatusBadge = () => {
    switch (parcel.status) {
      case 'available':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Đất trống (Chưa cho thuê)
          </span>
        );
      case 'leased':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Đang cho thuê theo HĐ
          </span>
        );
      case 'expired':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            Hết hạn hợp đồng
          </span>
        );
      case 'auctioning':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-amber-500" />
            Đang lập hồ sơ đấu giá
          </span>
        );
      case 'encroached':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-800 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-purple-500" />
            Đang bị lấn chiếm
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                  {parcel.code}
                </span>
                <h2 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                  Thửa {parcel.parcel}, Tờ bản đồ {parcel.mapSheet}
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {parcel.location} • {parcel.area.toLocaleString()} m² • {parcel.landType}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPrintContract(parcel)}
              title="In thông tin / Hợp đồng"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenEdit(parcel);
              }}
              title="Chỉnh sửa thông tin"
              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Status banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Hiện trạng:</span>
              {getStatusBadge()}
            </div>
            {parcel.status === 'leased' && daysRemaining !== null && (
              <div className="text-xs font-semibold">
                {isExpired ? (
                  <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Đã hết hạn thuê {Math.abs(daysRemaining)} ngày
                  </span>
                ) : isExpiringSoon ? (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Sắp hết hạn (còn {daysRemaining} ngày)
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Hợp đồng còn hiệu lực ({daysRemaining} ngày)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Section 1: Thông tin địa chính & quy hoạch */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1">
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Hồ Sơ Thửa Đất Công Ích 5%
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-[11px] text-slate-400 block mb-0.5">Số thửa</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{parcel.parcel}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-[11px] text-slate-400 block mb-0.5">Tờ bản đồ</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{parcel.mapSheet}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-[11px] text-slate-400 block mb-0.5">Diện tích</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{parcel.area.toLocaleString()} m²</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                <span className="text-[11px] text-slate-400 block mb-0.5">Loại đất</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{parcel.landType}</span>
              </div>
            </div>

            <div className="text-xs space-y-1 pt-1">
              <div className="flex gap-2">
                <span className="text-slate-400 shrink-0">Xứ đồng / Vị trí:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{parcel.location}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-slate-400 shrink-0">Mục đích quy hoạch:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{parcel.planningPurpose}</span>
              </div>
              {parcel.notes && (
                <div className="flex gap-2">
                  <span className="text-slate-400 shrink-0">Ghi chú theo dõi:</span>
                  <span className="text-slate-600 dark:text-slate-300 italic">{parcel.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Hợp đồng cho thuê hiện tại */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <FileSignature className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Hợp Đồng Cho Thuê Hiện Tại
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onClose();
                    onOpenPayment(parcel);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                >
                  <DollarSign className="w-3 h-3" /> Thu tiền thuê đất
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onOpenContract(parcel);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                >
                  <FileSignature className="w-3 h-3" /> Lập / Gia hạn HĐ
                </button>
              </div>
            </div>

            {parcel.tenantName ? (
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-0.5">Người thuê (Bên B)</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{parcel.tenantName}</span>
                    {parcel.tenantCccd && <div className="text-[11px] text-slate-400">CCCD: {parcel.tenantCccd}</div>}
                    {parcel.tenantPhone && <div className="text-[11px] text-slate-400">SĐT: {parcel.tenantPhone}</div>}
                    {parcel.tenantAddress && <div className="text-[11px] text-slate-400">Địa chỉ: {parcel.tenantAddress}</div>}
                  </div>

                  <div className="space-y-1 sm:text-right">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Hợp đồng số</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {parcel.contractNumber || 'HĐ-UBND'}
                    </span>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Thời hạn: {parcel.leaseStartDate || '...'} đến {parcel.leaseEndDate || '...'} ({parcel.leaseDurationYears || 5} năm)
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white pt-1">
                      Giá thuê: {parcel.annualRent.toLocaleString()} đ/năm
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 mr-2">Tình trạng nộp ngân sách:</span>
                    {parcel.paymentStatus === 'paid' ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Đã nộp đủ tiền thuê năm</span>
                    ) : parcel.paymentStatus === 'overdue' ? (
                      <span className="font-bold text-rose-600 dark:text-rose-400">Quá hạn nộp tiền</span>
                    ) : (
                      <span className="font-bold text-amber-600 dark:text-amber-400">Chưa nộp</span>
                    )}
                  </div>
                  {parcel.paymentReceiptNumber && (
                    <div className="font-mono text-[11px] text-slate-500">
                      Biên lai: {parcel.paymentReceiptNumber} ({parcel.lastPaymentDate || 'Mới nhất'})
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                Chưa có hợp đồng thuê hiện hành. Bạn có thể nhấn <b>"Lập / Gia hạn HĐ"</b> để bắt đầu ký hợp đồng thuê khoán hoặc cập nhật kết quả đấu giá.
              </div>
            )}
          </div>

          {/* Section 3: Lịch sử nộp tiền & Hợp đồng cũ */}
          {parcel.contracts && parcel.contracts.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-1">
                <History className="w-3.5 h-3.5 text-slate-500" /> Lịch Sử Thu Tiền & Hợp Đồng ({parcel.contracts.length})
              </h3>

              <div className="space-y-2">
                {parcel.contracts.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{c.contractNumber}</span>
                      <span className="text-[11px] text-slate-400">
                        {c.startDate} - {c.endDate}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Bên thuê: <b>{c.tenantName}</b></span>
                      <span>Thuê: <b>{c.annualRent.toLocaleString()} đ/năm</b></span>
                    </div>

                    {c.paymentHistory && c.paymentHistory.length > 0 && (
                      <div className="pt-1 border-t border-slate-200 dark:border-slate-700/60">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                          Lịch sử các đợt nộp ngân sách:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {c.paymentHistory.map((p) => (
                            <div
                              key={p.id}
                              className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/40 flex justify-between text-[11px]"
                            >
                              <span>Năm {p.year} (BL: {p.receiptNumber})</span>
                              <span className="font-semibold text-emerald-600">{p.amount.toLocaleString()} đ</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
