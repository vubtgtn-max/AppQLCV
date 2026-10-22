import React, { useState } from 'react';
import { X, Printer, Download, Copy, Check, FileText } from 'lucide-react';
import { LandViolationCase } from '../../types';
import { PREVIEW_ACTIONS_LAYOUT, PREVIEW_ACTION_BUTTON_LAYOUT, PREVIEW_DOCUMENT_BODY_LAYOUT, PREVIEW_TAB_BUTTON_LAYOUT, PREVIEW_TABS_LAYOUT } from '../common/previewModalStyles';
import { downloadWordDocumentND30 } from '../../utils/wordExportND30';

interface ViolationPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  violation: LandViolationCase | null;
}

/**
 * Hàm đọc số tiền tiếng Việt chuẩn mực theo ngữ pháp tiếng Việt hành chính
 */
export function convertNumberToVietnameseWords(num: number): string {
  if (!num || isNaN(num) || num === 0) return 'Không đồng';

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readThreeDigits(n: number, showZeroHundred: boolean): string {
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (h === 0 && t === 0 && u === 0) return '';

    let res = '';
    if (h > 0 || showZeroHundred) {
      res += digits[h] + ' trăm ';
    }

    if (t > 1) {
      res += digits[t] + ' mươi ';
      if (u === 1) res += 'mốt ';
      else if (u === 5) res += 'lăm ';
      else if (u > 0) res += digits[u] + ' ';
    } else if (t === 1) {
      res += 'mười ';
      if (u === 5) res += 'lăm ';
      else if (u > 0) res += digits[u] + ' ';
    } else if (t === 0 && u > 0) {
      if (h > 0 || showZeroHundred) res += 'lẻ ';
      res += digits[u] + ' ';
    }
    return res.trim();
  }

  let n = Math.abs(Math.round(num));
  if (n === 0) return 'Không đồng';

  const groups: number[] = [];
  while (n > 0) {
    groups.push(n % 1000);
    n = Math.floor(n / 1000);
  }

  let result = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const grp = groups[i];
    if (grp > 0) {
      const showZero = i < groups.length - 1;
      const grpText = readThreeDigits(grp, showZero);
      result += grpText + ' ' + (units[i] ? units[i] + ' ' : '');
    }
  }

  result = result.trim() + ' đồng';
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export const ViolationPrintModal: React.FC<ViolationPrintModalProps> = ({
  isOpen,
  onClose,
  violation,
}) => {
  // 4 mẫu: 1. Biên bản VPHC, 2. Quyết định xử phạt, 3. Thông báo tạm dừng, 4. Giao quyết định
  const [docType, setDocType] = useState<'minute' | 'decision' | 'pause' | 'delivery'>('minute');
  const [viewMode, setViewMode] = useState<'template' | 'current'>('template');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isTranNamCase = violation?.violatorName?.includes('Trần Năm') || viewMode === 'template';

  // Dữ liệu hiển thị chuẩn xác
  const d = isTranNamCase
    ? {
        minuteNumber: '01 /BB-VPHC',
        decisionNumber: '04/QĐ-XPHC',
        pauseNumber: '03/TB-UBND',
        deliveryMinuteNumber: '04/BB-GQĐ',
        timeMinute: 'hồi 09 giờ 00 phút, ngày 06 tháng 01 năm 2026',
        finishTime: 'hồi 10 giờ 00 phút, ngày 06/01/2026',
        pauseTime: 'ngày 07 tháng 01 năm 2026',
        decisionDate: 'ngày 15 tháng 01 năm 2026',
        deliveryTime: 'hồi 09 giờ 00 phút, ngày 16 tháng 01 năm 2026',
        deliveryFinishTime: 'hồi 09 giờ 45 phút, ngày 16 tháng 01 năm 2026',
        workingMinuteNumber: '01 /BB-LV',
        workingTime: 'hồi 08 giờ 00 phút, ngày 06 tháng 01 năm 2026',
        location: 'Tại thửa đất số 372 tờ bản đồ số 98 thuộc thôn 8 xã Lãnh Ngọc, thành phố Đà Nẵng',
        parcel: '372',
        mapSheet: '98',
        village: 'thôn 8 xã Lãnh Ngọc, thành phố Đà Nẵng',
        area: '177,2',
        subParcel: 'một phần thửa đất số 18A tờ bản đồ số 98, loại đất Hg',
        landUseYear: '2002',
        lawClause: 'Điểm a khoản 1 Điều 13 Nghị định số 123/2024/NĐ-CP ngày 04/10/2024 của Chính phủ quy định về xử phạt vi phạm hành chính trong lĩnh vực đất đai',
        officerName: 'Đoàn Văn Hoài Vũ',
        officerTitle: 'Chuyên viên Phòng Kinh tế',
        officerOrg: 'Ủy ban nhân dân xã Lãnh Ngọc',
        witness1Name: 'Lê Anh Tân',
        witness1Job: 'Nông',
        witness1Address: 'Thôn 8 xã Lãnh Ngọc, thành phố Đà Nẵng',
        witness2Name: 'Phùng Văn Hải',
        witness2Title: 'Chuyên viên VP HĐND-UBND',
        witness2Org: 'Ủy ban nhân dân xã Lãnh Ngọc',
        violatorName: 'Trần Năm',
        violatorGender: 'Nam',
        violatorDob: '06/02/1973',
        violatorNationality: 'Việt Nam',
        violatorJob: 'Nông',
        violatorAddress: 'Thôn 8 xã Lãnh Ngọc, thành phố Đà Nẵng',
        violatorCccd: '049073009884',
        cccdDate: '01/9/2021',
        cccdPlace: 'Cục CSQLHC về TTXH',
        illegalProfit: 4311508,
        leaderSignerAuthority: 'KT. CHỦ TỊCH',
        leaderSignerTitle: 'PHÓ CHỦ TỊCH',
        leaderSignerName: 'Thái Công Cần',
      }
    : {
        minuteNumber: violation?.minuteNumber || '01 /BB-VPHC',
        decisionNumber: violation?.sanctionDecisionNumber || '04/QĐ-XPHC',
        pauseNumber: '03/TB-UBND',
        deliveryMinuteNumber: '04/BB-GQĐ',
        timeMinute: violation?.minuteDate
          ? `hồi 09 giờ 00 phút, ngày ${new Date(violation.minuteDate).getDate()} tháng ${new Date(violation.minuteDate).getMonth() + 1} năm ${new Date(violation.minuteDate).getFullYear()}`
          : 'hồi 09 giờ 00 phút, ngày 06 tháng 01 năm 2026',
        finishTime: violation?.minuteDate
          ? `hồi 10 giờ 00 phút, ngày ${new Date(violation.minuteDate).getDate()}/${new Date(violation.minuteDate).getMonth() + 1}/${new Date(violation.minuteDate).getFullYear()}`
          : 'hồi 10 giờ 00 phút, ngày 06/01/2026',
        pauseTime: violation?.minuteDate
          ? `ngày ${new Date(new Date(violation.minuteDate).getTime() + 86400000).getDate()} tháng ${new Date(violation.minuteDate).getMonth() + 1} năm ${new Date(violation.minuteDate).getFullYear()}`
          : 'ngày 07 tháng 01 năm 2026',
        decisionDate: violation?.sanctionDecisionDate
          ? `ngày ${new Date(violation.sanctionDecisionDate).getDate()} tháng ${new Date(violation.sanctionDecisionDate).getMonth() + 1} năm ${new Date(violation.sanctionDecisionDate).getFullYear()}`
          : 'ngày 15 tháng 01 năm 2026',
        deliveryTime: violation?.sanctionDecisionDate
          ? `hồi 09 giờ 00 phút, ngày ${new Date(new Date(violation.sanctionDecisionDate).getTime() + 86400000).getDate()} tháng ${new Date(violation.sanctionDecisionDate).getMonth() + 1} năm ${new Date(violation.sanctionDecisionDate).getFullYear()}`
          : 'hồi 09 giờ 00 phút, ngày 16 tháng 01 năm 2026',
        deliveryFinishTime: violation?.sanctionDecisionDate
          ? `hồi 09 giờ 45 phút, ngày ${new Date(new Date(violation.sanctionDecisionDate).getTime() + 86400000).getDate()} tháng ${new Date(violation.sanctionDecisionDate).getMonth() + 1} năm ${new Date(violation.sanctionDecisionDate).getFullYear()}`
          : 'hồi 09 giờ 45 phút, ngày 16 tháng 01 năm 2026',
        workingMinuteNumber: violation?.inspectionMinuteNumber || '01 /BB-LV',
        workingTime: violation?.inspectionDate
          ? `hồi 08 giờ 00 phút, ngày ${new Date(violation.inspectionDate).getDate()} tháng ${new Date(violation.inspectionDate).getMonth() + 1} năm ${new Date(violation.inspectionDate).getFullYear()}`
          : 'hồi 08 giờ 00 phút, ngày 06 tháng 01 năm 2026',
        location: violation?.location || `Tại thửa đất số ${violation?.parcel || '...'} tờ bản đồ số ${violation?.mapSheet || '...'} thuộc xã Lãnh Ngọc, thành phố Đà Nẵng`,
        parcel: violation?.parcel || '...',
        mapSheet: violation?.mapSheet || '...',
        village: violation?.location || 'xã Lãnh Ngọc, thành phố Đà Nẵng',
        area: violation?.violatedArea ? String(violation.violatedArea).replace('.', ',') : '...',
        subParcel: `một phần thửa đất số ${violation?.parcel || '...'} tờ bản đồ số ${violation?.mapSheet || '...'}`,
        landUseYear: '2002',
        lawClause: 'Điểm a khoản 1 Điều 13 Nghị định số 123/2024/NĐ-CP ngày 04/10/2024 của Chính phủ quy định về xử phạt vi phạm hành chính trong lĩnh vực đất đai',
        officerName: violation?.handlerName || 'Đoàn Văn Hoài Vũ',
        officerTitle: 'Chuyên viên Phòng Kinh tế',
        officerOrg: 'Ủy ban nhân dân xã Lãnh Ngọc',
        witness1Name: 'Lê Anh Tân',
        witness1Job: 'Nông',
        witness1Address: 'Thôn 8 xã Lãnh Ngọc, thành phố Đà Nẵng',
        witness2Name: 'Phùng Văn Hải',
        witness2Title: 'Chuyên viên VP HĐND-UBND',
        witness2Org: 'Ủy ban nhân dân xã Lãnh Ngọc',
        violatorName: violation?.violatorName || '....................................',
        violatorGender: 'Nam',
        violatorDob: '06/02/1973',
        violatorNationality: 'Việt Nam',
        violatorJob: 'Nông',
        violatorAddress: violation?.violatorAddress || violation?.location || 'xã Lãnh Ngọc, thành phố Đà Nẵng',
        violatorCccd: violation?.violatorCccd || '....................',
        cccdDate: '01/9/2021',
        cccdPlace: 'Cục CSQLHC về TTXH',
        illegalProfit: violation?.fineAmount || 4311508,
        leaderSignerAuthority: 'KT. CHỦ TỊCH',
        leaderSignerTitle: 'PHÓ CHỦ TỊCH',
        leaderSignerName: violation?.assignedLeaderName || 'Thái Công Cần',
      };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const textElement = document.getElementById('printable-legal-document');
    if (textElement) {
      navigator.clipboard.writeText(textElement.innerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadWord = () => {
    const el = document.getElementById('printable-legal-document');
    if (!el) return;
    const safeName = d.violatorName.replace(/\s+/g, '_');
    const fileName =
      docType === 'minute'
        ? `01_Bien_ban_VPHC_${safeName}`
        : docType === 'decision'
        ? `02_Quyet_dinh_xu_ly_VPHC_${safeName}`
        : docType === 'pause'
        ? `03_Thong_bao_tam_dung_${safeName}`
        : `04_Bien_ban_giao_quyet_dinh_${safeName}`;

    downloadWordDocumentND30(el, fileName, {
      title: `${fileName} - Xã Lãnh Ngọc`,
      fontSizePt: 13,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-legal-document, #printable-legal-document * {
            visibility: visible;
          }
          #printable-legal-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            margin: 0 !important;
            padding: 12mm 18mm 12mm 18mm !important;
            background: white !important;
            color: black !important;
            font-size: 13pt !important;
            line-height: 1.35 !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 20mm 20mm 20mm 30mm;
          }
          .avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden my-4 flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:m-0 print:rounded-none">
        {/* Top Control Bar */}
        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 no-print">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 min-w-0 flex-1">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-rose-600" />
              Mẫu biểu xử lý vi phạm:
            </span>
            <div className={`inline-flex rounded-lg bg-slate-200 dark:bg-slate-800 p-1 text-[11px] flex-nowrap gap-1 overflow-x-auto max-w-full ${PREVIEW_TABS_LAYOUT}`}>
              <button
                onClick={() => setDocType('minute')}
                className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-md font-semibold transition-all cursor-pointer ${
                  docType === 'minute'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                1. Biên bản VPHC (Số 01/BB-VPHC)
              </button>
              <button
                onClick={() => setDocType('decision')}
                className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-md font-semibold transition-all cursor-pointer ${
                  docType === 'decision'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                2. Quyết định xử phạt (Số 04/QĐ-XPHC)
              </button>
              <button
                onClick={() => setDocType('pause')}
                className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-md font-semibold transition-all cursor-pointer ${
                  docType === 'pause'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                3. Thông báo tạm dừng (Số 03/TB-UBND)
              </button>
              <button
                onClick={() => setDocType('delivery')}
                className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-md font-semibold transition-all cursor-pointer ${
                  docType === 'delivery'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                4. Giao quyết định (Số 04/BB-GQĐ)
              </button>
            </div>

            {violation && violation.violatorName !== 'Trần Năm' && (
              <div className="inline-flex rounded-lg bg-slate-200 dark:bg-slate-800 p-1 text-[11px] ml-1">
                <button
                  onClick={() => setViewMode('template')}
                  className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                    viewMode === 'template'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Mẫu gốc Trần Năm
                </button>
                <button
                  onClick={() => setViewMode('current')}
                  className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                    viewMode === 'current'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Áp vào vụ: {violation.violatorName}
                </button>
              </div>
            )}
          </div>

          <div className={`${PREVIEW_ACTIONS_LAYOUT} flex-wrap`}>
            <button
              onClick={handleCopy}
              className={`${PREVIEW_ACTION_BUTTON_LAYOUT} rounded-lg font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer`}
              title="Sao chép toàn bộ văn bản"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Đã sao chép!' : 'Sao chép'}
            </button>
            <button
              onClick={handleDownloadWord}
              className={`${PREVIEW_ACTION_BUTTON_LAYOUT} rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer`}
              title="Tải văn bản về dạng Word (.doc)"
            >
              <Download className="w-3.5 h-3.5" /> Tải file Word
            </button>
            <button
              onClick={handlePrint}
              className={`${PREVIEW_ACTION_BUTTON_LAYOUT} rounded-lg font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer`}
              title="In trực tiếp hoặc Lưu file PDF"
            >
              <Printer className="w-3.5 h-3.5" /> In / Lưu PDF (Ctrl + P)
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Khung Giấy A4 Chuẩn Văn Bản Hành Chính */}
        <div className={`${PREVIEW_DOCUMENT_BODY_LAYOUT} bg-slate-100 dark:bg-slate-950 flex justify-center print:p-0 print:bg-white print:overflow-visible`}>
          <div
            id="printable-legal-document"
            className="w-full min-w-[210mm] max-w-[210mm] min-h-[297mm] print:min-w-0 bg-white text-slate-900 p-8 sm:p-14 shadow-lg print:shadow-none print:p-0 font-serif text-[14px] leading-normal select-text"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            {/* ========================================================
                1. MẪU BIÊN BẢN VI PHẠM HÀNH CHÍNH (ĐÚNG Y SCAN PDF ĐÃ CUNG CẤP)
               ======================================================== */}
            {docType === 'minute' && (
              <div className="space-y-3 text-justify">
                {/* Header Tiêu ngữ */}
                <div className="grid grid-cols-12 gap-2 pb-2">
                  <div className="col-span-5 text-center">
                    <p className="uppercase font-bold text-[13px] leading-tight">
                      ỦY BAN NHÂN DÂN
                    </p>
                    <p className="uppercase font-bold text-[13px] leading-tight">
                      XÃ LÃNH NGỌC
                    </p>
                    <div className="w-20 h-[1px] bg-black mx-auto my-1"></div>
                    <p className="text-[13px] mt-1">
                      Số: {d.minuteNumber}
                    </p>
                  </div>

                  <div className="col-span-7 text-center">
                    <p className="uppercase font-bold text-[13px] leading-tight tracking-normal">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </p>
                    <p className="font-bold text-[13px] leading-tight mt-0.5">
                      Độc lập - Tự do - Hạnh Phúc
                    </p>
                    <div className="w-32 h-[1px] bg-black mx-auto my-1"></div>
                  </div>
                </div>

                {/* Tiêu đề Biên bản */}
                <div className="text-center my-4">
                  <h1 className="text-base sm:text-lg font-bold uppercase tracking-wider text-black">
                    BIÊN BẢN VI PHẠM HÀNH CHÍNH
                  </h1>
                  <p className="text-sm font-bold text-black mt-0.5">
                    Về lĩnh vực đất đai
                  </p>
                </div>

                {/* Thời gian, địa điểm, lý do & căn cứ */}
                <p className="leading-relaxed">
                  Hôm nay, {d.timeMinute};
                </p>
                <p className="leading-relaxed">
                  Tại: {d.location};
                </p>
                <p className="leading-relaxed">
                  Lý do lập biên bản tại &lt;trụ sở cơ quan của người có thẩm quyền lập biên bản/địa điểm khác:&gt;………………………………………………………………………………………………………………… .
                </p>
                <p className="leading-relaxed">
                  Căn cứ: Biên bản làm việc số {d.workingMinuteNumber} do ông {d.officerName} chuyên viên Phòng Kinh tế xã Lãnh Ngọc lập {d.workingTime} tại {d.location.replace(/^Tại:\s*/i, '')}.
                </p>

                {/* Chúng tôi gồm */}
                <div>
                  <p className="font-bold text-black">Chúng tôi gồm:</p>
                  <p className="font-bold text-black mt-1">1. Người có thẩm quyền lập biên bản:</p>
                  <div className="space-y-0.5 mt-0.5">
                    <p>1.1 Họ và tên: {d.officerName}, Chức vụ: {d.officerTitle};</p>
                    <p>Cơ quan: {d.officerOrg};</p>
                    <p>1.2. Với sự tham gia của: (ghi tên đầy đủ các thành phần tham gia)</p>
                    <p>Họ và tên: …………………………………..……………. , Chức vụ: …………………………...……………...…….;</p>
                    <p>Cơ quan: …………………………………………………………………………………………………………………………..;</p>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-black">2. Với sự chứng kiến của:</p>
                  <div className="space-y-0.5 mt-0.5">
                    <p>Họ và tên: {d.witness1Name}. Nghề nghiệp: {d.witness1Job};</p>
                    <p>Địa chỉ: {d.witness1Address};</p>
                    <p>Họ và tên: {d.witness2Name}. Chức vụ: {d.witness2Title}</p>
                    <p>Cơ quan: {d.witness2Org}</p>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-black">3. Người phiên dịch: (Nếu có)</p>
                  <div className="space-y-0.5 mt-0.5">
                    <p>Họ và tên: ………………………………………….………………. Nghề nghiệp: ………………..…..…………;</p>
                    <p>Địa chỉ: …………….………………………………………………………………………………………………………………;</p>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-black">
                    Tiến hành lập biên bản vi phạm hành chính đối với &lt;ông (bà)/tổ chức&gt; có tên sau đây:
                  </p>
                  <div className="space-y-0.5 mt-1">
                    <p>
                      1. Họ và tên: <span className="font-semibold">{d.violatorName}</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Giới tính: {d.violatorGender}
                    </p>
                    <p>
                      Ngày, tháng, năm sinh: {d.violatorDob}, &nbsp;&nbsp;&nbsp;&nbsp; Quốc tịch: {d.violatorNationality}
                    </p>
                    <p>Nghề nghiệp: {d.violatorJob}</p>
                    <p>Nơi ở hiện tại: {d.violatorAddress};</p>
                    <p>
                      Số định danh cá nhân/Hộ chiếu: {d.violatorCccd}; ngày cấp: {d.cccdDate}; nơi cấp: {d.cccdPlace}
                    </p>
                    <p>
                      2. Tên của tổ chức (*): .....................................................................................................................................................
                    </p>
                    <p>
                      Địa chỉ trụ sở chính: .........................................................................................................................................................
                    </p>
                    <p>
                      Mã số doanh nghiệp: ........................................................................................................................................................
                    </p>
                    <p>
                      Số GCN đăng ký đầu tư/doanh nghiệp hoặc GP thành lập/đăng ký hoạt động:………...………..; ngày cấp: ……..../…….... /202 ; nơi cấp: ……………………………………………………
                    </p>
                    <p>
                      Người đại diện theo pháp luật: ……………………………………………………… Giới tính: …………………
                    </p>
                    <p>
                      Chức danh: ……………………………………………………………………………………………………………………………
                    </p>
                  </div>
                </div>

                {/* Hành vi vi phạm (Khớp chuẩn xác trang 2 scan PDF) */}
                <div className="space-y-1 pt-1">
                  <p className="font-bold text-black">
                    Đã có các hành vi vi phạm hành chính:
                  </p>
                  <p className="leading-relaxed">
                    Chiếm đất do cơ quan, tổ chức của Nhà nước đã quản lý, được thể hiện trong hồ sơ địa chính thuộc địa giới hành chính của xã Lãnh Ngọc, thành phố Đà Nẵng. Cụ thể: chiếm đất chưa sử dụng tại thửa đất số {d.parcel}, tờ bản đồ số {d.mapSheet} với diện tích {d.area} m² (theo hồ sơ địa chính thuộc {d.subParcel}) để trồng cây lâu năm từ năm {d.landUseYear} đến nay.
                  </p>
                  <p className="leading-relaxed">
                    - Quy định tại: {d.lawClause}.
                  </p>
                  <p className="leading-relaxed">
                    - Các tình tiết tăng nặng (nếu có): Không.
                  </p>
                  <p className="leading-relaxed">
                    - Các tình tiết giảm nhẹ (nếu có): Không.
                  </p>
                  <p className="leading-relaxed">
                    - Thiệt hại do vi phạm hành chính gây ra (nếu có): Không.
                  </p>
                </div>

                {/* Tang vật phương tiện vi phạm */}
                <div className="space-y-1 pt-1">
                  <p className="leading-relaxed">
                    - Tang vật, phương tiện vi phạm hành chính bị tạm giữ gồm: (nếu nhiều thì lập bảng thống kê kèm theo biên bản này)
                  </p>
                  <p className="leading-relaxed">
                    ....................................................................................................................................................................................
                  </p>
                  <p className="leading-relaxed">
                    ....................................................................................................................................................................................
                  </p>
                  <p className="leading-relaxed">
                    - Giấy phép, chứng chỉ hành nghề bị tạm giữ gồm: Không.
                  </p>
                </div>

                {/* Ý kiến các bên (Khớp chuẩn xác trang 3 scan PDF) */}
                <div className="space-y-1.5 pt-1">
                  <p className="leading-relaxed">
                    <b>- Ý kiến giải trình của cá nhân/người đại diện của tổ chức vi phạm hành chính:</b> Thống nhất như biên bản làm việc số {d.workingMinuteNumber} do ông {d.officerName} chuyên viên Phòng Kinh tế xã Lãnh Ngọc lập {d.workingTime} tại {d.location.replace(/^Tại:\s*/i, '')}.
                  </p>

                  <p className="leading-relaxed">
                    <b>- Ý kiến của người chứng kiến (nếu có):</b> Thống nhất nội dung vi phạm hành chính của ông {d.violatorName}.
                  </p>

                  <p className="leading-relaxed">
                    <b>- Ý kiến của cá nhân/người đại diện của tổ chức bị thiệt hại (nếu có):</b> ……………………………………………
                  </p>
                  <p className="leading-relaxed">
                    ………………………………………………………………………………………………………………………………………………
                  </p>
                </div>

                {/* Kết luận & quyền giải trình */}
                <div className="space-y-1 pt-1 leading-relaxed">
                  <p>
                    Biên bản này gồm 05 tờ, được lập thành 02 bản có nội dung và giá trị như nhau; đã đọc lại cho những người có tên nêu trên cùng nghe, công nhận là đúng và cùng ký tên dưới đây; giao cho ông <span className="font-semibold">{d.violatorName}</span> là &lt;cá nhân/người đại diện của tổ chức&gt;<sup>(*)</sup> vi phạm 01 bản, 01 bản lưu hồ sơ.
                  </p>
                  <p className="italic text-[13px] text-slate-800">
                    &lt;Trường hợp cá nhân vi phạm/người đại diện của tổ chức vi phạm không ký biên bản vi phạm hành chính&gt;
                  </p>
                  <p>
                    Lý do cá nhân/người đại diện của tổ chức vi phạm không ký biên bản: ................................................................
                  </p>
                  <p>
                    Lý do người chứng kiến không ký biên bản: ............................................................................................................
                  </p>
                  <p>
                    Lý do đại diện chính quyền cấp xã không ký biên bản: ...........................................................................................
                  </p>
                  <p className="pt-1">
                    Biên bản lập xong {d.finishTime}.
                  </p>
                </div>

                {/* Chữ ký các bên (Khớp chuẩn xác trang 4 scan PDF) */}
                <div className="avoid-break pt-8">
                  <div className="grid grid-cols-2 gap-y-14 gap-x-6 text-center text-xs">
                    {/* Hàng 1 */}
                    <div>
                      <p className="font-bold uppercase text-[12px]">
                        CÁ NHÂN/NGƯỜI ĐẠI DIỆN CỦA TỔ CHỨC VI PHẠM
                      </p>
                      <p className="italic text-[11px]">(Ký, ghi rõ họ và tên)</p>
                      <div className="h-16"></div>
                      <p className="font-bold text-[13px]">{d.violatorName}</p>
                    </div>

                    <div>
                      <p className="font-bold uppercase text-[12px]">
                        NGƯỜI LẬP BIÊN BẢN
                      </p>
                      <p className="italic text-[11px]">(Ký, ghi rõ chức vụ, họ và tên)</p>
                      <div className="h-16"></div>
                      <p className="font-bold text-[13px] text-blue-700">{d.officerName}</p>
                    </div>

                    {/* Hàng 2 */}
                    <div>
                      <p className="font-bold uppercase text-[12px]">
                        CÁ NHÂN/NGƯỜI ĐẠI DIỆN CỦA TỔ CHỨC BỊ THIỆT HẠI
                      </p>
                      <p className="italic text-[11px]">(Ký, ghi rõ họ và tên)</p>
                      <div className="h-16"></div>
                    </div>

                    <div>
                      <p className="font-bold uppercase text-[12px]">
                        ĐẠI DIỆN CHÍNH QUYỀN
                      </p>
                      <p className="italic text-[11px]">(Ký, ghi rõ chức vụ, họ và tên)</p>
                      <div className="h-16"></div>
                      <p className="font-bold text-[13px]">{d.witness2Name}</p>
                    </div>

                    {/* Hàng 3 */}
                    <div>
                      <p className="font-bold uppercase text-[12px]">
                        NGƯỜI PHIÊN DỊCH
                      </p>
                      <p className="italic text-[11px]">(Ký, ghi rõ họ và tên)</p>
                      <div className="h-16"></div>
                    </div>

                    <div>
                      <p className="font-bold uppercase text-[12px]">
                        NGƯỜI CHỨNG KIẾN
                      </p>
                      <p className="italic text-[11px]">(Ký, ghi rõ họ và tên)</p>
                      <div className="h-16"></div>
                      <p className="font-bold text-[13px]">{d.witness1Name}</p>
                    </div>
                  </div>
                </div>

                {/* Mặt sau: Người nhận biên bản (Trang 5 scan PDF) */}
                <div className="avoid-break border-t-2 border-dashed border-slate-300 pt-8 mt-12 text-justify">
                  <p className="leading-relaxed">
                    &lt;In ở mặt sau&gt; Biên bản đã giao trực tiếp cho &lt;cá nhân/người đại diện của tổ chức&gt;<sup>(*)</sup> vi phạm vào hồi ………..... giờ............. phút, ngày ……..…./…….…./……………….
                  </p>
                  <div className="w-1/2 ml-auto text-center pt-4 text-xs">
                    <p className="font-bold uppercase text-[12px]">NGƯỜI NHẬN BIÊN BẢN</p>
                    <p className="italic text-[11px]">(Ký, ghi rõ họ và tên)</p>
                    <div className="h-16"></div>
                    <p className="font-bold text-[13px]">{d.violatorName}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                2. MẪU 04. QUYẾT ĐỊNH XỬ LÝ VI PHẠM HÀNH CHÍNH
               ======================================================== */}
            {docType === 'decision' && (
              <div className="space-y-3.5 text-justify">
                {/* Header Tiêu ngữ */}
                <div className="grid grid-cols-12 gap-2 pb-2 text-xs">
                  <div className="col-span-5 text-center font-sans">
                    <p className="uppercase font-bold text-[12px] leading-tight text-slate-800">
                      ỦY BAN NHÂN DÂN XÃ
                    </p>
                    <p className="uppercase font-bold text-[12px] leading-tight text-slate-900 mt-0.5">
                      XÃ LÃNH NGỌC
                    </p>
                    <div className="w-24 h-[1px] bg-slate-800 mx-auto my-1"></div>
                    <p className="text-[12px] font-semibold text-slate-800 mt-1">
                      Số: {d.decisionNumber}
                    </p>
                  </div>

                  <div className="col-span-7 text-center font-sans">
                    <p className="uppercase font-bold text-[12px] leading-tight tracking-wider text-slate-900">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </p>
                    <p className="font-bold text-[12px] leading-tight text-slate-800 mt-0.5">
                      Độc lập - Tự do - Hạnh phúc
                    </p>
                    <div className="w-36 h-[1.5px] bg-slate-900 mx-auto my-1"></div>
                    <p className="italic text-[12px] mt-1.5 font-serif">
                      Lãnh Ngọc, {d.decisionDate}
                    </p>
                  </div>
                </div>

                {/* Tiêu đề Quyết định */}
                <div className="text-center my-4">
                  <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-slate-900">
                    QUYẾT ĐỊNH
                  </h1>
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-800 mt-0.5">
                    Xử lý vi phạm hành chính trong lĩnh vực đất đai
                  </p>
                </div>

                {/* Căn cứ pháp lý */}
                <div className="text-[12.5px] italic text-slate-800 space-y-1">
                  <p className="indent-6">
                    Căn cứ Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015; Luật sửa đổi, bổ sung một số điều của Luật Tổ chức Chính phủ và Luật Tổ chức chính quyền địa phương ngày 22 tháng 11 năm 2019;
                  </p>
                  <p className="indent-6">
                    Căn cứ Luật Xử lý vi phạm hành chính ngày 20 tháng 6 năm 2012; Luật sửa đổi, bổ sung một số điều của Luật Xử lý vi phạm hành chính ngày 13 tháng 11 năm 2020;
                  </p>
                  <p className="indent-6">
                    Căn cứ Nghị định số 118/2021/NĐ-CP ngày 23 tháng 12 năm 2021 của Chính phủ quy định chi tiết một số điều và biện pháp thi hành Luật Xử lý vi phạm hành chính;
                  </p>
                  <p className="indent-6">
                    Căn cứ Nghị định số 123/2024/NĐ-CP ngày 04 tháng 10 năm 2024 của Chính phủ quy định về xử phạt vi phạm hành chính trong lĩnh vực đất đai (hoặc Nghị định số 91/2019/NĐ-CP và Nghị định số 04/2022/NĐ-CP);
                  </p>
                  <p className="indent-6">
                    Căn cứ Biên bản vi phạm hành chính số {d.minuteNumber} do Chuyên viên Phòng Kinh tế xã Lãnh Ngọc lập {d.timeMinute};
                  </p>
                  <p className="indent-6">
                    Theo đề nghị của Công chức phụ trách Địa chính - Xây dựng - Đô thị và Môi trường / Phòng Kinh tế xã Lãnh Ngọc;
                  </p>
                  <p className="indent-6 font-bold not-italic">
                    CHỦ TỊCH ỦY BAN NHÂN DÂN XÃ LÃNH NGỌC
                  </p>
                </div>

                <div className="text-center font-bold text-base uppercase tracking-wider my-3">
                  QUYẾT ĐỊNH:
                </div>

                {/* Điều 1 */}
                <div className="text-[13.5px] leading-relaxed">
                  <p>
                    <b>Điều 1.</b> Xử lý vi phạm hành chính đối với:
                  </p>
                  <div className="ml-5 space-y-1 mt-1">
                    <p>1. Họ và tên: <b className="uppercase">{d.violatorName}</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Giới tính: {d.violatorGender} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Quốc tịch: {d.violatorNationality}</p>
                    <p>Ngày, tháng, năm sinh: {d.violatorDob} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Nghề nghiệp: {d.violatorJob}</p>
                    <p>Nơi ở hiện nay / Hộ khẩu thường trú: <b>{d.violatorAddress}</b></p>
                    <p>Số định danh cá nhân / CCCD: <b>{d.violatorCccd}</b> &nbsp;&nbsp;&nbsp;&nbsp; Ngày cấp: {d.cccdDate} &nbsp;&nbsp;&nbsp;&nbsp; Nơi cấp: {d.cccdPlace}</p>
                    <p>
                      2. Đã thực hiện hành vi vi phạm hành chính: <b>Chiếm đất do cơ quan, tổ chức của Nhà nước đã quản lý, được thể hiện trong hồ sơ địa chính thuộc địa giới hành chính của xã Lãnh Ngọc, thành phố Đà Nẵng. Cụ thể: chiếm đất chưa sử dụng tại thửa đất số {d.parcel}, tờ bản đồ số {d.mapSheet} với diện tích {d.area} m² ({d.subParcel}) để trồng cây lâu năm từ năm {d.landUseYear} đến nay.</b>
                    </p>
                    <p>
                      3. Quy định tại: Điểm a khoản 1 Điều 13 Nghị định số 123/2024/NĐ-CP ngày 04/10/2024 của Chính phủ quy định về xử phạt vi phạm hành chính trong lĩnh vực đất đai.
                    </p>
                    <p>4. Tình tiết tăng nặng: Không.</p>
                    <p>5. Tình tiết giảm nhẹ: Không.</p>
                  </div>
                </div>

                {/* Điều 2 */}
                <div className="text-[13.5px] leading-relaxed">
                  <p>
                    <b>Điều 2.</b> Các hình thức xử phạt và biện pháp khắc phục hậu quả áp dụng:
                  </p>
                  <div className="ml-5 space-y-2 mt-1">
                    <p>1. Hình thức xử phạt chính: Cảnh cáo / Áp dụng biện pháp khắc phục hậu quả theo quy định.</p>
                    <p>2. Hình thức xử phạt bổ sung: Không.</p>

                    <div>
                      <p>3. Các biện pháp khắc phục hậu quả buộc thực hiện:</p>
                      <div className="ml-4 space-y-1.5">
                        <p>
                          - <b>Buộc khôi phục lại tình trạng ban đầu của đất trước khi vi phạm</b> và buộc trả lại đất đã chiếm: Buộc ông <b className="uppercase">{d.violatorName}</b> trả lại toàn bộ diện tích <b>{d.area} m²</b> tại thửa đất số <b>{d.parcel}</b>, tờ bản đồ số <b>{d.mapSheet}</b> cho Ủy ban nhân dân xã Lãnh Ngọc quản lý.
                        </p>
                        <p>
                          - <b>Buộc nộp lại số lợi bất hợp pháp</b> có được do thực hiện hành vi vi phạm hành chính với số tiền là: <b>{d.illegalProfit.toLocaleString()} đồng</b>.
                        </p>
                        <p className="italic text-slate-800 ml-4">
                          (Bằng chữ: <b>{convertNumberToVietnameseWords(d.illegalProfit)}</b>).
                        </p>
                        <p>
                          - Thời hạn thực hiện biện pháp khắc phục hậu quả: <b>10 (mười) ngày</b>, kể từ ngày nhận được Quyết định này.
                        </p>
                        <p className="italic text-slate-700">
                          - Mọi chi phí tổ chức thi hành biện pháp khắc phục hậu quả do ông <b className="uppercase">{d.violatorName}</b> chi trả.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Điều 3 */}
                <div className="text-[13.5px] leading-relaxed">
                  <p>
                    <b>Điều 3.</b> Quyết định này có hiệu lực thi hành kể từ ngày ký.
                  </p>
                </div>

                {/* Điều 4 */}
                <div className="text-[13.5px] leading-relaxed">
                  <p>
                    <b>Điều 4.</b> Trách nhiệm thi hành:
                  </p>
                  <div className="ml-5 space-y-1.5 mt-1">
                    <p>
                      1. Giao cho ông <b className="uppercase">{d.violatorName}</b> là cá nhân vi phạm có tên tại Điều 1 Quyết định này để chấp hành.
                    </p>
                    <p className="indent-4 text-slate-800">
                      - Ông <b className="uppercase">{d.violatorName}</b> phải nghiêm chỉnh chấp hành Quyết định này. Quá thời hạn 10 ngày kể từ ngày nhận được Quyết định mà ông không tự nguyện chấp hành thì sẽ bị áp dụng biện pháp cưỡng chế thi hành theo quy định của pháp luật.
                    </p>
                    <p className="indent-4 text-slate-800">
                      - Số tiền nộp lại số lợi bất hợp pháp <b>{d.illegalProfit.toLocaleString()} đồng</b> phải được nộp vào Tài khoản thu ngân sách nhà nước tại Kho bạc Nhà nước thành phố Đà Nẵng trong thời hạn 10 ngày.
                    </p>
                    <p className="indent-4 text-slate-800">
                      - Ông <b className="uppercase">{d.violatorName}</b> có quyền khiếu nại hoặc khởi kiện hành chính đối với Quyết định này theo quy định của pháp luật.
                    </p>
                    <p>
                      2. Giao cho Công chức Địa chính - Xây dựng xã, Trưởng Công an xã Lãnh Ngọc và Trưởng thôn 8 chịu trách nhiệm giao quyết định, kiểm tra, đôn đốc, giám sát việc thi hành Quyết định này.
                    </p>
                  </div>
                </div>

                {/* Nơi nhận & Ký tên chuẩn KT. CHỦ TỊCH / PHÓ CHỦ TỊCH / Thái Công Cần */}
                <div className="avoid-break grid grid-cols-2 gap-4 pt-6 text-xs font-sans">
                  <div className="text-left text-[11px] leading-relaxed text-slate-700">
                    <p className="font-bold italic">Nơi nhận:</p>
                    <p>- Như Điều 4 (để thi hành);</p>
                    <p>- Thường trực Đảng ủy, HĐND xã (báo cáo);</p>
                    <p>- Chủ tịch, các PCT UBND xã;</p>
                    <p>- Cơ quan chuyên môn cấp trên (TP Đà Nẵng);</p>
                    <p>- Lưu: VT, Hồ sơ VPHC.</p>
                  </div>

                  <div className="text-center">
                    <p className="font-bold uppercase text-[12px]">{d.leaderSignerAuthority}</p>
                    <p className="font-bold text-[12px] uppercase">{d.leaderSignerTitle}</p>
                    <p className="italic text-[11px]">(Ký tên, đóng dấu và ghi rõ họ tên)</p>
                    <div className="h-20 flex items-center justify-center">
                      <span className="text-rose-600/40 font-mono text-[10px] uppercase border border-dashed border-rose-300 px-3 py-1 rounded">
                        [Đóng dấu đỏ UBND xã Lãnh Ngọc]
                      </span>
                    </div>
                    <p className="font-bold text-[13px]">{d.leaderSignerName}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                3. THÔNG BÁO TẠM DỪNG (SỐ 03/TB-UBND)
               ======================================================== */}
            {docType === 'pause' && (
              <div className="space-y-3.5 text-justify">
                {/* Header Tiêu ngữ */}
                <div className="grid grid-cols-12 gap-2 pb-2 text-xs">
                  <div className="col-span-5 text-center font-sans">
                    <p className="uppercase font-bold text-[12px] leading-tight text-slate-800">
                      ỦY BAN NHÂN DÂN
                    </p>
                    <p className="uppercase font-bold text-[12px] leading-tight text-slate-900 mt-0.5">
                      XÃ LÃNH NGỌC
                    </p>
                    <div className="w-24 h-[1px] bg-slate-800 mx-auto my-1"></div>
                    <p className="text-[12px] font-semibold text-slate-800 mt-1">
                      Số: {d.pauseNumber}
                    </p>
                  </div>

                  <div className="col-span-7 text-center font-sans">
                    <p className="uppercase font-bold text-[12px] leading-tight tracking-wider text-slate-900">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </p>
                    <p className="font-bold text-[12px] leading-tight text-slate-800 mt-0.5">
                      Độc lập - Tự do - Hạnh phúc
                    </p>
                    <div className="w-36 h-[1.5px] bg-slate-900 mx-auto my-1"></div>
                    <p className="italic text-[12px] mt-1.5 font-serif">
                      Lãnh Ngọc, {d.pauseTime}
                    </p>
                  </div>
                </div>

                {/* Tiêu đề Thông báo */}
                <div className="text-center my-4">
                  <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-slate-900">
                    THÔNG BÁO
                  </h1>
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-800 mt-0.5">
                    Về việc tạm dừng hành vi vi phạm trật tự xây dựng, đất đai
                  </p>
                </div>

                {/* Kính gửi */}
                <div className="text-[13.5px] leading-relaxed">
                  <p className="font-bold">
                    Kính gửi: Ông (Bà) <span className="uppercase">{d.violatorName}</span>
                  </p>
                  <p className="ml-4">
                    - Nơi ở hiện nay: {d.violatorAddress};
                  </p>
                  <p className="ml-4">
                    - Số CCCD/Định danh cá nhân: {d.violatorCccd}.
                  </p>
                </div>

                {/* Căn cứ pháp lý */}
                <div className="text-[12.5px] italic text-slate-800 space-y-1">
                  <p className="indent-6">
                    Căn cứ Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015; Luật sửa đổi, bổ sung một số điều của Luật Tổ chức Chính phủ và Luật Tổ chức chính quyền địa phương ngày 22 tháng 11 năm 2019;
                  </p>
                  <p className="indent-6">
                    Căn cứ Luật Xử lý vi phạm hành chính ngày 20 tháng 6 năm 2012; Luật sửa đổi, bổ sung một số điều của Luật Xử lý vi phạm hành chính ngày 13 tháng 11 năm 2020;
                  </p>
                  <p className="indent-6">
                    Căn cứ Luật Đất đai ngày 18 tháng 01 năm 2024;
                  </p>
                  <p className="indent-6">
                    Căn cứ Nghị định số 123/2024/NĐ-CP ngày 04 tháng 10 năm 2024 của Chính phủ quy định về xử phạt vi phạm hành chính trong lĩnh vực đất đai;
                  </p>
                  <p className="indent-6">
                    Căn cứ Biên bản vi phạm hành chính về lĩnh vực đất đai số {d.minuteNumber} do Chuyên viên Phòng Kinh tế / Bộ phận Địa chính - Xây dựng xã Lãnh Ngọc lập {d.timeMinute} tại {d.location.replace(/^Tại:\s*/i, '')}.
                  </p>
                </div>

                {/* Nội dung thông báo */}
                <div className="text-[13.5px] leading-relaxed space-y-2">
                  <p className="indent-6">
                    Ủy ban nhân dân xã Lãnh Ngọc thông báo và yêu cầu ông (bà) <b className="uppercase">{d.violatorName}</b> thực hiện nghiêm chỉnh các nội dung sau:
                  </p>

                  <p className="indent-6">
                    <b>1. Tạm dừng ngay toàn bộ mọi hành vi vi phạm</b> về đất đai và trật tự xây dựng; dừng mọi hoạt động xây dựng, san lấp, cơi nới, trồng trọt hoặc tác động vào diện tích đất vi phạm là <b>{d.area} m²</b> tại thửa đất số <b>{d.parcel}</b>, tờ bản đồ số <b>{d.mapSheet}</b> ({d.subParcel}) thuộc địa giới hành chính xã Lãnh Ngọc, thành phố Đà Nẵng kể từ thời điểm nhận được Thông báo này.
                  </p>

                  <p className="indent-6">
                    <b>2. Giữ nguyên hiện trạng thửa đất và tài sản trên đất</b>, nghiêm cấm mọi hành vi tự ý di chuyển, tẩu tán phương tiện, máy móc, vật tư vi phạm, hoặc làm biến dạng hiện trạng trong thời gian cơ quan nhà nước có thẩm quyền đang thụ lý, hoàn thiện hồ sơ để ban hành Quyết định xử lý theo quy định của pháp luật.
                  </p>

                  <p className="indent-6">
                    <b>3. Có mặt tại Trụ sở UBND xã Lãnh Ngọc</b> (Bộ phận Địa chính - Xây dựng / Phòng Kinh tế) vào hồi <b>08 giờ 30 phút, ngày 09 tháng 01 năm 2026</b> để phối hợp làm việc và giải quyết vụ việc theo quy định.
                  </p>

                  <p className="indent-6">
                    <b>4.</b> Trường hợp cố tình không chấp hành, tiếp tục hành vi vi phạm hoặc tái phạm, Ủy ban nhân dân xã Lãnh Ngọc sẽ áp dụng các biện pháp ngăn chặn hành chính theo quy định tại Điều 119 Luật Xử lý vi phạm hành chính (tạm giữ tang vật, phương tiện vi phạm, niêm phong hiện trường), đồng thời xem xét coi là tình tiết tăng nặng khi ban hành quyết định xử phạt vi phạm hành chính hoặc chuyển hồ sơ lên cơ quan cấp trên xử lý nghiêm minh theo quy định của pháp luật.
                  </p>

                  <p className="indent-6">
                    <b>5.</b> Giao cho Công chức Địa chính - Xây dựng xã, Trưởng Công an xã Lãnh Ngọc và Ban Nhân dân thôn (Trưởng thôn: ông {d.witness1Name}) chịu trách nhiệm tống đạt Thông báo này đến ông (bà) <b className="uppercase">{d.violatorName}</b>; đồng thời thường xuyên kiểm tra, giám sát hiện trường, kịp thời lập biên bản đình chỉ và xử lý nghiêm nếu phát hiện đối tượng tiếp tục vi phạm.
                  </p>
                </div>

                {/* Nơi nhận & Ký tên chuẩn KT. CHỦ TỊCH / PHÓ CHỦ TỊCH / Thái Công Cần */}
                <div className="avoid-break grid grid-cols-2 gap-4 pt-6 text-xs font-sans">
                  <div className="text-left text-[11px] leading-relaxed text-slate-700">
                    <p className="font-bold italic">Nơi nhận:</p>
                    <p>- Như kính gửi (để thực hiện);</p>
                    <p>- Thường trực Đảng ủy, HĐND xã (báo cáo);</p>
                    <p>- Chủ tịch, các PCT UBND xã (chỉ đạo);</p>
                    <p>- Công an xã Lãnh Ngọc (phối hợp);</p>
                    <p>- Ban Nhân dân thôn 8 (giám sát);</p>
                    <p>- Lưu: VT, Hồ sơ VPHC.</p>
                  </div>

                  <div className="text-center">
                    <p className="font-bold uppercase text-[12px]">{d.leaderSignerAuthority}</p>
                    <p className="font-bold text-[12px] uppercase">{d.leaderSignerTitle}</p>
                    <p className="italic text-[11px]">(Ký tên, đóng dấu và ghi rõ họ tên)</p>
                    <div className="h-20 flex items-center justify-center">
                      <span className="text-rose-600/40 font-mono text-[10px] uppercase border border-dashed border-rose-300 px-3 py-1 rounded">
                        [Đóng dấu đỏ UBND xã Lãnh Ngọc]
                      </span>
                    </div>
                    <p className="font-bold text-[13px]">{d.leaderSignerName}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                4. BIÊN BẢN GIAO QUYẾT ĐỊNH XỬ PHẠT VI PHẠM HÀNH CHÍNH
               ======================================================== */}
            {docType === 'delivery' && (
              <div className="space-y-3 text-justify">
                {/* Header Tiêu ngữ */}
                <div className="grid grid-cols-12 gap-2 pb-2 text-xs">
                  <div className="col-span-5 text-center font-sans">
                    <p className="uppercase font-bold text-[12px] leading-tight text-slate-800">
                      ỦY BAN NHÂN DÂN
                    </p>
                    <p className="uppercase font-bold text-[12px] leading-tight text-slate-900 mt-0.5">
                      XÃ LÃNH NGỌC
                    </p>
                    <div className="w-24 h-[1px] bg-slate-800 mx-auto my-1"></div>
                    <p className="text-[12px] font-semibold text-slate-800 mt-1">
                      Số: {d.deliveryMinuteNumber}
                    </p>
                  </div>

                  <div className="col-span-7 text-center font-sans">
                    <p className="uppercase font-bold text-[12px] leading-tight tracking-wider text-slate-900">
                      CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                    </p>
                    <p className="font-bold text-[12px] leading-tight text-slate-800 mt-0.5">
                      Độc lập - Tự do - Hạnh phúc
                    </p>
                    <div className="w-36 h-[1.5px] bg-slate-900 mx-auto my-1"></div>
                    <p className="italic text-[12px] mt-1.5 font-serif">
                      Lãnh Ngọc, ngày 16 tháng 01 năm 2026
                    </p>
                  </div>
                </div>

                {/* Tiêu đề Biên bản */}
                <div className="text-center my-4">
                  <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-slate-900">
                    BIÊN BẢN
                  </h1>
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-800 mt-0.5">
                    Bàn giao quyết định xử phạt vi phạm hành chính
                  </p>
                </div>

                {/* Căn cứ */}
                <div className="text-[12.5px] italic text-slate-800 space-y-1">
                  <p className="indent-6">
                    Căn cứ Điều 70 Luật Xử lý vi phạm hành chính ngày 20 tháng 6 năm 2012; Luật sửa đổi, bổ sung một số điều của Luật Xử lý vi phạm hành chính ngày 13 tháng 11 năm 2020;
                  </p>
                  <p className="indent-6">
                    Căn cứ Quyết định xử lý vi phạm hành chính trong lĩnh vực đất đai số {d.decisionNumber} ngày 15 tháng 01 năm 2026 của Chủ tịch Ủy ban nhân dân xã Lãnh Ngọc do Phó Chủ tịch {d.leaderSignerName} ký;
                  </p>
                </div>

                <p className="leading-relaxed">
                  Hôm nay, {d.deliveryTime};
                </p>
                <p className="leading-relaxed">
                  Tại: Nhà riêng ông <b className="uppercase">{d.violatorName}</b> ({d.violatorAddress});
                </p>

                {/* Chúng tôi gồm */}
                <div>
                  <p className="font-bold text-black">Chúng tôi gồm:</p>
                  
                  <p className="font-bold text-black mt-1">1. Người giao quyết định:</p>
                  <div className="space-y-0.5 ml-4">
                    <p>- Họ và tên: <b>{d.officerName}</b></p>
                    <p>- Chức vụ: {d.officerTitle}</p>
                    <p>- Đơn vị công tác: {d.officerOrg}</p>
                  </div>

                  <p className="font-bold text-black mt-1">2. Người nhận quyết định:</p>
                  <div className="space-y-0.5 ml-4">
                    <p>
                      - Họ và tên: <b className="uppercase">{d.violatorName}</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Giới tính: {d.violatorGender} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Quốc tịch: {d.violatorNationality}
                    </p>
                    <p>
                      - Ngày, tháng, năm sinh: {d.violatorDob} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Nghề nghiệp: {d.violatorJob}
                    </p>
                    <p>- Nơi ở hiện tại: {d.violatorAddress}</p>
                    <p>
                      - Số CCCD/Định danh cá nhân: <b>{d.violatorCccd}</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Ngày cấp: {d.cccdDate} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Nơi cấp: {d.cccdPlace}
                    </p>
                    <p className="italic">
                      (Là cá nhân bị xử phạt vi phạm hành chính có tên tại Điều 1 Quyết định số {d.decisionNumber})
                    </p>
                  </div>

                  <p className="font-bold text-black mt-1">3. Người chứng kiến việc giao nhận quyết định:</p>
                  <div className="space-y-0.5 ml-4">
                    <p>- Họ và tên: <b>{d.witness1Name}</b> &nbsp;&nbsp;&nbsp;&nbsp; Nghề nghiệp: {d.witness1Job} &nbsp;&nbsp;&nbsp;&nbsp; Nơi ở: {d.witness1Address}</p>
                    <p>- Họ và tên: <b>{d.witness2Name}</b> &nbsp;&nbsp;&nbsp;&nbsp; Chức vụ: {d.witness2Title} &nbsp;&nbsp;&nbsp;&nbsp; Cơ quan: {d.witness2Org}</p>
                  </div>
                </div>

                {/* Nội dung bàn giao */}
                <div className="space-y-2 pt-1 text-[13.5px]">
                  <p className="font-bold text-black">
                    Tiến hành lập biên bản bàn giao Quyết định xử lý vi phạm hành chính với các nội dung sau:
                  </p>

                  <p className="indent-6">
                    <b>1. Bên giao đã trực tiếp bàn giao 01 (một) bản chính</b> Quyết định xử lý vi phạm hành chính trong lĩnh vực đất đai số <b>{d.decisionNumber}</b> ngày 15 tháng 01 năm 2026 của Ủy ban nhân dân xã Lãnh Ngọc cho ông <b className="uppercase">{d.violatorName}</b>.
                  </p>

                  <p className="indent-6">
                    <b>2. Bên giao đã giải thích, hướng dẫn chi tiết các nghĩa vụ và quyền lợi của người bị xử phạt:</b>
                  </p>
                  <div className="ml-6 space-y-1 text-slate-800">
                    <p>
                      - <b>Thời hạn chấp hành nộp lại số lợi bất hợp pháp:</b> Số tiền <b>{d.illegalProfit.toLocaleString()} đồng</b> (Bằng chữ: <b>{convertNumberToVietnameseWords(d.illegalProfit)}</b>) phải nộp vào Tài khoản thu Ngân sách Nhà nước tại Kho bạc Nhà nước thành phố Đà Nẵng trong thời hạn <b>10 (mười) ngày</b> kể từ ngày nhận được Quyết định.
                    </p>
                    <p>
                      - <b>Thời hạn thực hiện biện pháp khắc phục hậu quả:</b> Trong thời hạn <b>10 (mười) ngày</b> kể từ ngày nhận Quyết định, ông <b className="uppercase">{d.violatorName}</b> phải tự giác khôi phục lại tình trạng ban đầu của đất trước khi vi phạm và trả lại toàn bộ diện tích <b>{d.area} m²</b> đất đã chiếm tại thửa đất số <b>{d.parcel}</b>, tờ bản đồ số <b>{d.mapSheet}</b> cho Ủy ban nhân dân xã Lãnh Ngọc quản lý.
                    </p>
                    <p>
                      - <b>Hậu quả pháp lý:</b> Hết thời hạn 10 ngày nếu không tự giác chấp hành sẽ bị áp dụng biện pháp cưỡng chế thi hành theo quy định của pháp luật và phải chịu toàn bộ chi phí phục vụ hoạt động cưỡng chế.
                    </p>
                    <p>
                      - <b>Quyền khiếu nại, khởi kiện:</b> Ông <b className="uppercase">{d.violatorName}</b> có quyền khiếu nại đối với Quyết định xử phạt đến Chủ tịch UBND xã Lãnh Ngọc hoặc khởi kiện vụ án hành chính tại Tòa án nhân dân theo quy định của pháp luật về khiếu nại và tố tụng hành chính.
                    </p>
                  </div>

                  <p className="indent-6">
                    <b>3. Ý kiến của người nhận quyết định:</b>
                  </p>
                  <p className="italic ml-6 text-slate-800">
                    "Tôi là <b className="not-italic uppercase">{d.violatorName}</b> xác nhận đã nhận trực tiếp 01 bản chính Quyết định số {d.decisionNumber} ngày 15/01/2026. Tôi đã được nghe phổ biến, hiểu rõ toàn bộ nội dung quyết định, các nghĩa vụ và cam kết chấp hành nghiêm chỉnh theo đúng thời hạn 10 ngày quy định."
                  </p>

                  <p className="indent-6 text-slate-700 italic text-[12px]">
                    &lt;Trường hợp cá nhân/người đại diện tổ chức vi phạm từ chối không nhận quyết định hoặc không ký biên bản: Ghi rõ lý do từ chối; người lập biên bản cùng đại diện chính quyền thôn/xã ký xác nhận theo quy định tại khoản 2 Điều 70 Luật Xử lý vi phạm hành chính&gt;.
                  </p>
                </div>

                <p className="indent-6 pt-1">
                  Biên bản kết thúc vào {d.deliveryFinishTime} cùng ngày, được lập thành 02 bản có giá trị pháp lý như nhau, đã được đọc lại cho các thành phần cùng nghe, thống nhất công nhận đúng sự thật và ký tên xác nhận dưới đây; 01 bản giao cho người nhận quyết định, 01 bản lưu hồ sơ xử phạt vi phạm hành chính.
                </p>

                {/* Chữ ký các bên */}
                <div className="avoid-break pt-8">
                  <div className="grid grid-cols-2 gap-y-12 gap-x-6 text-center text-xs">
                    <div>
                      <p className="font-bold uppercase text-[12px]">
                        NGƯỜI NHẬN QUYẾT ĐỊNH
                      </p>
                      <p className="italic text-[11px]">(Ký, ghi rõ họ và tên)</p>
                      <div className="h-16"></div>
                      <p className="font-bold text-[13px]">{d.violatorName}</p>
                    </div>

                    <div>
                      <p className="font-bold uppercase text-[12px]">
                        NGƯỜI GIAO QUYẾT ĐỊNH
                      </p>
                      <p className="italic text-[11px]">(Ký, ghi rõ chức vụ, họ và tên)</p>
                      <div className="h-16"></div>
                      <p className="font-bold text-[13px] text-blue-700">{d.officerName}</p>
                    </div>

                    <div>
                      <p className="font-bold uppercase text-[12px]">
                        ĐẠI DIỆN CHÍNH QUYỀN
                      </p>
                      <p className="italic text-[11px]">(Ký, ghi rõ chức vụ, họ và tên)</p>
                      <div className="h-16"></div>
                      <p className="font-bold text-[13px]">{d.witness2Name}</p>
                    </div>

                    <div>
                      <p className="font-bold uppercase text-[12px]">
                        NGƯỜI CHỨNG KIẾN
                      </p>
                      <p className="italic text-[11px]">(Ký, ghi rõ họ và tên)</p>
                      <div className="h-16"></div>
                      <p className="font-bold text-[13px]">{d.witness1Name}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
