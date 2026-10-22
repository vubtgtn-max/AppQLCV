import React, { useState } from 'react';
import {
  X,
  Plus,
  Sparkles,
  FileText,
  Bookmark,
  CheckCircle2,
  HelpCircle,
  Landmark,
  Layers,
  MapPin,
  Scale,
  ShieldAlert,
  Users,
  Briefcase,
} from 'lucide-react';
import { ReportTemplateDef } from './reportTemplates';

interface CustomReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: ReportTemplateDef) => void;
}

const SMART_SUGGESTIONS = [
  {
    title: 'Báo cáo Rà soát Quỹ Đất Công ích (Đất 5%) do UBND Xã Quản lý',
    reportTitle: 'KẾT QUẢ RÀ SOÁT, KIỂM KÊ HIỆN TRẠNG VÀ TÌNH HÌNH QUẢN LÝ QUỸ ĐẤT CÔNG ÍCH (ĐẤT 5%) TRÊN ĐỊA BÀN XÃ',
    desc: 'Thống kê diện tích, vị trí, tình hình cho thuê khoán quỹ đất công ích, thanh tra nguồn thu nộp ngân sách xã.',
    icon: 'Layers',
    reportNumber: '      /BC-KT-ĐCI',
    recipient: 'Ủy ban nhân dân xã Lãnh Ngọc; Phòng Tài chính - Kế hoạch',
    outline: `    Căn cứ Luật Đất đai năm 2024 và các quy định về quản lý, sử dụng quỹ đất nông nghiệp sử dụng vào mục đích công ích của xã; Phòng Kinh tế báo cáo kết quả rà soát hiện trạng như sau:

I. HIỆN TRẠNG VÀ DIỆN TÍCH QUỸ ĐẤT 5%
    - Tổng diện tích đất công ích đang quản lý: ... ha tại các thôn...
    - Tình hình ký hợp đồng thuê khoán sản xuất nông nghiệp: ... hợp đồng.

II. TỒN TẠI VÀ KHÓ KHĂN
    - Một số khu vực đất công ích bị xâm canh, hết hạn hợp đồng chưa kịp thời đấu thầu lại...

III. ĐỀ XUẤT PHƯƠNG ÁN QUẢN LÝ
    - Đề xuất tổ chức đấu thầu công khai theo quy định Luật Đất đai 2024.`,
  },
  {
    title: 'Báo cáo Tiến độ Cắm mốc Quy hoạch & Phân giới Thực địa',
    reportTitle: 'TIẾN ĐỘ CÔNG TÁC BÀN GIAO VÀ CẮM MỐC RANH GIỚI QUY HOẠCH TRÊN ĐỊA BÀN XÃ',
    desc: 'Báo cáo kết quả bàn giao mốc chỉ giới đường đỏ, mốc quy hoạch nông thôn mới và cắm mốc ranh giới đất công.',
    icon: 'MapPin',
    reportNumber: '      /BC-KT-QH',
    recipient: 'Ủy ban nhân dân xã Lãnh Ngọc; Phòng Kinh tế - Hạ tầng',
    outline: `    Thực hiện kế hoạch phân giới, cắm mốc quy hoạch xây dựng và chỉ giới giao thông nông thôn; Phòng Kinh tế báo cáo tiến độ như sau:

I. KẾT QUẢ TRIỂN KHAI CẮM MỐC
    - Đã tổ chức bàn giao và chôn mốc tại thực địa: ... mốc chỉ giới.
    - Phối hợp với các thôn quản lý, bảo vệ cột mốc.

II. KIẾN NGHỊ VÀ GIẢI PHÁP
    - Đề nghị các đoàn thể phối hợp tuyên truyền nhân dân không tự ý di dời cột mốc.`,
  },
  {
    title: 'Báo cáo Đăng ký Biến động & Cấp đổi Giấy chứng nhận QSDĐ',
    reportTitle: 'TỔNG HỢP KẾT QUẢ ĐĂNG KÝ BIẾN ĐỘNG VÀ CẤP ĐỔI GIẤY CHỨNG NHẬN QUYỀN SỬ DỤNG ĐẤT',
    desc: 'Tổng hợp số liệu biến động tặng cho, thừa kế, chuyển nhượng và cấp đổi theo bản đồ địa chính mới.',
    icon: 'Briefcase',
    reportNumber: '      /BC-KT-CĐ',
    recipient: 'Chi nhánh Văn phòng Đăng ký đất đai; UBND xã Lãnh Ngọc',
    outline: `    Thực hiện nhiệm vụ hướng dẫn, tiếp nhận hồ sơ đăng ký biến động đất đai và cấp đổi Giấy chứng nhận theo bản đồ địa chính chính quy; Phòng Kinh tế báo cáo kết quả:

I. SỐ LIỆU TIẾP NHẬN VÀ TRẢ KẾT QUẢ
    - Đã xác nhận hồ sơ chuyển nhượng, tặng cho, thừa kế: ... hồ sơ.
    - Đang niêm yết công khai cấp đổi GCN: ... hồ sơ.

II. KIẾN NGHỊ
    - Đẩy nhanh thời gian in ấn và trả kết quả cho công dân.`,
  },
  {
    title: 'Báo cáo Quyết toán Chi phí Bồi thường, Hỗ trợ GPMB Dự án',
    reportTitle: 'QUYẾT TOÁN KINH PHÍ CHI TRẢ BỒI THƯỜNG, HỖ TRỢ VÀ GIẢI PHÓNG MẶT BẰNG DỰ ÁN',
    desc: 'Tổng hợp số liệu giải ngân, chi trả bồi thường, đối soát danh sách nhận tiền và kinh phí phục vụ GPMB.',
    icon: 'Landmark',
    reportNumber: '      /BC-KT-GPMB',
    recipient: 'Chủ đầu tư dự án; Ban Chỉ đạo GPMB xã Lãnh Ngọc',
    outline: `    Căn cứ Phương án bồi thường, hỗ trợ, tái định cư đã được phê duyệt; Hội đồng Bồi thường GPMB xã báo cáo quyết toán kinh phí chi trả:

I. TỔNG HỢP SỐ TIỀN ĐÃ CHI TRẢ
    - Tổng kinh phí đã giải ngân cho các hộ dân: ... đồng.
    - Đã lập biên bản bàn giao mặt bằng sạch cho chủ đầu tư.

II. VƯỚNG MẮC VÀ ĐỀ XUẤT
    - Đề nghị chủ đầu tư chuyển nốt kinh phí 2% phục vụ công tác bồi thường.`,
  },
];

export const CustomReportModal: React.FC<CustomReportModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [customReportTitle, setCustomReportTitle] = useState('');
  const [description, setDescription] = useState('');
  const [badge, setBadge] = useState('Đề xuất mới');
  const [icon, setIcon] = useState('FileText');
  const [reportNumber, setReportNumber] = useState('      /BC-PKT');
  const [recipient, setRecipient] = useState('Ủy ban nhân dân xã Lãnh Ngọc');
  const [outline, setOutline] = useState('');

  if (!isOpen) return null;

  const handleApplySuggestion = (sug: (typeof SMART_SUGGESTIONS)[0]) => {
    setName(sug.title);
    setCustomReportTitle(sug.reportTitle);
    setDescription(sug.desc);
    setIcon(sug.icon);
    setReportNumber(sug.reportNumber);
    setRecipient(sug.recipient);
    setOutline(sug.outline);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalReportTitle = (customReportTitle.trim() || name.trim()).toUpperCase();

    const newTemplate: ReportTemplateDef = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      reportTitle: finalReportTitle,
      icon,
      badge: badge.trim() || 'Mẫu tự tạo',
      description: description.trim() || 'Mẫu báo cáo do cán bộ chuyên môn thiết lập thêm.',
      isCustom: true,
      defaultReportNumber: reportNumber.trim() || '      /BC-PKT',
      defaultRecipient: recipient.trim() || 'Ủy ban nhân dân xã Lãnh Ngọc',
      defaultRecipientsText: '- Như trên;\n- Lãnh đạo UBND xã (b/c);\n- Lưu: VT, PKT.',
      generate: ({ periodShortLabel, docIssuingUnit, customRemarks }) => {
        if (outline.trim()) {
          return `${outline}${
            customRemarks ? `\n\n* Nội dung ghi chú bổ sung:\n${customRemarks}` : ''
          }

    ${docIssuingUnit} kính báo cáo.`;
        }
        return `    Căn cứ Quy chế làm việc và nhiệm vụ chuyên môn được phân công; ${docIssuingUnit} xin báo cáo kết quả thực hiện trong ${periodShortLabel} như sau:

I. TÌNH HÌNH TRIỂN KHAI VÀ KẾT QUẢ ĐẠT ĐƯỢC
    - Đã tổ chức rà soát, thực hiện các nội dung công việc chuyên môn đúng kế hoạch...
    - Kết quả đạt được đáp ứng tiến độ và yêu cầu của cấp trên.

II. KHÓ KHĂN, VƯỚNG MẮC
    - Đang tiếp tục phối hợp với các cơ quan, đơn vị liên quan để giải quyết...

III. ĐỀ XUẤT VÀ KIẾN NGHỊ
    - Kính đề nghị Lãnh đạo UBND xã xem xét chỉ đạo, tạo điều kiện thuận lợi cho đơn vị triển khai nhiệm vụ.${
      customRemarks ? `\n\n* Ý kiến bổ sung:\n${customRemarks}` : ''
    }

    ${docIssuingUnit} kính báo cáo.`;
      },
    };

    onSave(newTemplate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-4 bg-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10">
              <Sparkles className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h3 className="font-bold text-base">Đề xuất & Thêm Mẫu Báo Cáo Chuyên Môn Mới</h3>
              <p className="text-xs text-indigo-100">
                Thiết lập cấu trúc báo cáo hành chính chuẩn phục vụ công tác quản lý đất đai và báo cáo cấp trên
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
          {/* Smart Suggestions */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Gợi ý Mẫu Báo Cáo Nghiệp Vụ Thông Minh (Bấm để áp dụng nhanh):</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SMART_SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplySuggestion(sug)}
                  className="p-3 text-left rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-1">
                      {sug.title}
                    </span>
                    <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {sug.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Main Inputs */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Tên mẫu báo cáo <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!customReportTitle) {
                    setCustomReportTitle(e.target.value.toUpperCase());
                  }
                }}
                placeholder="Ví dụ: Báo cáo Thẩm định Bồi thường Dự án Mở rộng Đường Trục Xã"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Tiêu đề văn bản in (Căn giữa - Tự động viết hoa)
              </label>
              <input
                type="text"
                value={customReportTitle}
                onChange={(e) => setCustomReportTitle(e.target.value.toUpperCase())}
                placeholder="TIÊU ĐỀ IN TRÊN VĂN BẢN (VD: KẾT QUẢ RÀ SOÁT...)"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold text-xs uppercase outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Nhãn phân loại (Badge)
                </label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="Ví dụ: Dự án trọng điểm, Bồi thường GPMB..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Số hiệu mặc định
                </label>
                <input
                  type="text"
                  value={reportNumber}
                  onChange={(e) => setReportNumber(e.target.value)}
                  placeholder="        /BC-PKT"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Nơi nhận mặc định (Kính gửi)
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Ủy ban nhân dân xã Lãnh Ngọc"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Mô tả tóm tắt mục đích báo cáo
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Báo cáo tiến độ và tổng hợp vướng mắc trình Lãnh đạo UBND xã phê duyệt..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Khung nội dung báo cáo mẫu (Có thể để trống để tự động sinh theo mẫu chuẩn)
              </label>
              <textarea
                value={outline}
                onChange={(e) => setOutline(e.target.value)}
                rows={5}
                placeholder="Nhập khung dàn bài các phần I, II, III hoặc các điều khoản cần báo cáo..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-slate-200 text-xs font-serif outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Lưu & Sử Dụng Mẫu Báo Cáo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
