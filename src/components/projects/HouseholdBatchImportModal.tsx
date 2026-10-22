import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { ProjectHousehold } from '../../types';

interface HouseholdBatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (households: Partial<ProjectHousehold>[]) => Promise<void>;
  projectName: string;
}

export const HouseholdBatchImportModal: React.FC<HouseholdBatchImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  projectName,
}) => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const sampleTemplate = `Họ tên\tCCCD\tSố điện thoại\tThôn/Địa chỉ\tTờ BĐ\tThửa\tLoại đất\tDiện tích (m2)\tTiền bồi thường\tTrạng thái nhận tiền (paid/unpaid/refused)\tBàn giao (handed_over/not_yet)\tCó vướng mắc (1/0)\tLý do vướng mắc
Nguyễn Văn A\t048085001111\t0905111222\tThôn 1\t12\t45\tONT\t240\t850000000\tpaid\thanded_over\t0\t
Trần Văn B\t048085002222\t0905333444\tThôn 2\t14\t112\tONT + CLN\t520\t2100000000\trefused\tnot_yet\t1\tĐơn giá thấp
Lê Thị C\t048085003333\t0905555666\tThôn 1\t12\t52\tONT\t480\t3400000000\tunpaid\tnot_yet\t1\tĐòi hỏi vị trí TĐC`;

  const handleParseAndImport = async () => {
    if (!inputText.trim()) {
      setError('Vui lòng dán nội dung danh sách hộ dân từ Excel vào ô dưới đây.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const lines = inputText.trim().split('\n');
      const parsedList: Partial<ProjectHousehold>[] = [];

      // If first line has header keywords, skip it
      let startIndex = 0;
      if (lines[0].toLowerCase().includes('họ tên') || lines[0].toLowerCase().includes('chủ hộ')) {
        startIndex = 1;
      }

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Split by tab (standard Excel copy) or comma
        const cols = line.includes('\t') ? line.split('\t') : line.split(',');
        if (cols.length < 1) continue;

        const ownerName = cols[0]?.trim();
        if (!ownerName) continue;

        const cccd = cols[1]?.trim() || '';
        const phone = cols[2]?.trim() || '';
        const address = cols[3]?.trim() || 'Thôn 1, xã Lãnh Ngọc';
        const mapSheet = cols[4]?.trim() || '';
        const parcel = cols[5]?.trim() || '';
        const landType = cols[6]?.trim() || 'Đất ở nông thôn (ONT)';
        const totalArea = parseFloat((cols[7] || '0').trim().replace(',', '.')) || 0;
        const compensationAmount = parseInt((cols[8] || '0').replace(/[^\d]/g, ''), 10) || 0;
        
        let paymentStatus: any = 'unpaid';
        const rawStatus = (cols[9] || '').toLowerCase().trim();
        if (rawStatus.includes('đã') || rawStatus === 'paid' || rawStatus === 'da nhan') {
          paymentStatus = 'paid';
        } else if (rawStatus.includes('từ chối') || rawStatus.includes('không') || rawStatus === 'refused') {
          paymentStatus = 'refused';
        }

        let handoverStatus: any = 'not_yet';
        const rawHandover = (cols[10] || '').toLowerCase().trim();
        if (rawHandover.includes('đã') || rawHandover === 'handed_over') {
          handoverStatus = 'handed_over';
        }

        const hasObstacle = cols[11]?.trim() === '1' || cols[11]?.toLowerCase().includes('có') || false;
        const obstacleDetail = cols[12]?.trim() || '';

        parsedList.push({
          ownerName,
          cccd,
          phone,
          address,
          mapSheet,
          parcel,
          landType,
          totalArea,
          compensationAmount,
          paidAmount: paymentStatus === 'paid' ? compensationAmount : 0,
          paymentStatus,
          handoverStatus,
          hasObstacle,
          obstacleDetail,
          noticeOfRecoveryIssued: true,
          inventoryDone: true,
          approvalDecisionIssued: true,
          recoveryDecisionIssued: true,
        });
      }

      if (parsedList.length === 0) {
        setError('Không nhận diện được dòng dữ liệu hộ dân hợp lệ. Vui lòng kiểm tra lại định dạng.');
        setLoading(false);
        return;
      }

      await onImport(parsedList);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi nhập dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Nhập danh sách hộ dân từ Excel</h2>
              <p className="text-xs text-slate-500">Dự án: {projectName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Hướng dẫn sao chép nhanh:
            </p>
            <p className="text-slate-600 leading-relaxed">
              Mở bảng tính Excel/Google Sheets, chọn các cột theo thứ tự: <strong>Họ tên | CCCD | SĐT | Địa chỉ | Tờ BĐ | Thửa | Loại đất | Diện tích | Tiền bồi thường | Nhận tiền (paid/unpaid/refused) | Bàn giao (handed_over/not_yet) | Có vướng mắc (1/0) | Lý do</strong>. Sau đó nhấn <strong>Ctrl+C</strong> và dán vào khung bên dưới.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">Dán dữ liệu từ Excel vào đây:</label>
              <button
                type="button"
                onClick={() => setInputText(sampleTemplate)}
                className="text-xs text-blue-600 hover:underline font-semibold"
              >
                + Dán mẫu thử nghiệm
              </button>
            </div>
            <textarea
              rows={8}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Dán các dòng từ bảng tính Excel vào đây..."
              className="w-full p-3 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-hidden resize-none bg-slate-50/50"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={loading || !inputText.trim()}
            onClick={handleParseAndImport}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {loading ? 'Đang nhập...' : 'Bắt đầu nạp dữ liệu'}
          </button>
        </div>
      </div>
    </div>
  );
};
