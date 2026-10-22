import React, { useState, useRef } from 'react';
import {
  X,
  Printer,
  FileText,
  Download,
  ScrollText,
  FileSpreadsheet,
  FileCheck2,
  Stamp,
  Award,
  Send,
} from 'lucide-react';
import { LandProject, ProjectHousehold } from '../../types';
import { formatDate } from '../../utils/date';
import { PREVIEW_ACTIONS_LAYOUT, PREVIEW_ACTION_BUTTON_LAYOUT, PREVIEW_DOCUMENT_BODY_LAYOUT, PREVIEW_HEADER_LAYOUT, PREVIEW_TAB_BUTTON_LAYOUT, PREVIEW_TABS_LAYOUT } from '../common/previewModalStyles';
import { downloadWordDocumentND30 } from '../../utils/wordExportND30';

interface GpmbDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  household: ProjectHousehold;
  project: LandProject;
}

export type DocTemplateType =
  | 'land_notice'
  | 'inventory'
  | 'land_submission'
  | 'land_decision'
  | 'origin'
  | 'compensation'
  | 'handover';

export const GpmbDocumentsModal: React.FC<GpmbDocumentsModalProps> = ({
  isOpen,
  onClose,
  household,
  project,
}) => {
  const [activeDoc, setActiveDoc] = useState<DocTemplateType>('land_notice');
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const formatCurrency = (val?: number) => {
    return (val || 0).toLocaleString('vi-VN') + ' đ';
  };

  const getDocTitle = () => {
    switch (activeDoc) {
      case 'land_notice':
        return `Thong_bao_thu_hoi_dat_${household.ownerName}_Thua_${household.parcel || 'X'}`;
      case 'land_submission':
        return `To_trinh_thu_hoi_dat_${household.ownerName}_Thua_${household.parcel || 'X'}`;
      case 'land_decision':
        return `Quyet_dinh_thu_hoi_dat_${household.ownerName}_Thua_${household.parcel || 'X'}`;
      case 'inventory':
        return `Bien_ban_kiem_ke_${household.ownerName}_Thua_${household.parcel || 'X'}`;
      case 'origin':
        return `Xac_nhan_nguon_goc_dat_${household.ownerName}_Thua_${household.parcel || 'X'}`;
      case 'compensation':
        return `Bang_tinh_boi_thuong_${household.ownerName}_Thua_${household.parcel || 'X'}`;
      case 'handover':
        return `Bien_ban_ban_giao_mat_bang_${household.ownerName}_Thua_${household.parcel || 'X'}`;
      default:
        return `Ho_so_GPMB_${household.ownerName}`;
    }
  };

  const preparePrintableClone = (): HTMLElement | null => {
    if (!printAreaRef.current) return null;
    const clone = printAreaRef.current.cloneNode(true) as HTMLElement;

    // 1. Remove controls with .no-print class
    clone.querySelectorAll('.no-print').forEach((el) => el.remove());

    // 2. Replace inputs with clean formatted text
    clone.querySelectorAll('input').forEach((inp) => {
      const span = document.createElement('span');
      span.textContent = inp.value;
      if (inp.classList.contains('font-bold') || inp.parentElement?.classList.contains('font-bold')) {
        span.style.fontWeight = 'bold';
      }
      if (inp.classList.contains('text-center') || inp.parentElement?.classList.contains('text-center')) {
        span.style.textAlign = 'center';
      }
      inp.parentNode?.replaceChild(span, inp);
    });

    // 3. Replace textareas with clean formatted text preserving newlines
    clone.querySelectorAll('textarea').forEach((ta) => {
      const span = document.createElement('span');
      span.textContent = ta.value;
      span.style.whiteSpace = 'pre-wrap';
      ta.parentNode?.replaceChild(span, ta);
    });

    // 4. Convert all h1, h2, h3 to centered bold paragraphs so Word does not apply its Heading styles
    clone.querySelectorAll('h1, h2, h3').forEach((heading) => {
      const p = document.createElement('p');
      p.setAttribute('align', 'center');
      p.style.textAlign = 'center';
      p.style.fontWeight = 'bold';
      p.style.fontSize = heading.tagName.toLowerCase() === 'h1' ? '13.5pt' : '12pt';
      p.style.marginTop = '6pt';
      p.style.marginBottom = '2pt';
      p.style.textTransform = 'uppercase';
      p.style.fontFamily = "'Times New Roman', 'Tinos', Times, serif";
      p.innerHTML = `<b>${heading.innerHTML}</b>`;
      heading.parentNode?.replaceChild(p, heading);
    });

    // 5. Replace empty div horizontal divider lines with Word-compatible single-cell tables
    clone.querySelectorAll('div').forEach((div) => {
      const className = div.className || '';
      const isDivider =
        (className.includes('bg-black') &&
          (className.includes('h-[1.5px]') || className.includes('h-0.5') || className.includes('h-px'))) ||
        (div.children.length === 0 &&
          !div.textContent?.trim() &&
          (className.includes('bg-black') || className.includes('border-b')));

      if (isDivider) {
        let widthPx = '140px';
        if (className.includes('w-24')) widthPx = '95px';
        else if (className.includes('w-20')) widthPx = '80px';
        else if (className.includes('w-28')) widthPx = '125px';
        else if (className.includes('w-32')) widthPx = '145px';
        else if (className.includes('w-36')) widthPx = '165px';
        else if (className.includes('w-40')) widthPx = '185px';

        const hrTable = document.createElement('table');
        hrTable.setAttribute('align', 'center');
        hrTable.setAttribute('border', '0');
        hrTable.setAttribute('cellspacing', '0');
        hrTable.setAttribute('cellpadding', '0');
        hrTable.style.margin = '2pt auto 3pt auto';
        hrTable.style.borderCollapse = 'collapse';
        hrTable.style.border = 'none';
        hrTable.style.width = widthPx;
        hrTable.innerHTML = `<tbody><tr><td style="border: none; border-bottom: 1.5pt solid black; height: 1px; line-height: 1px; font-size: 1px; padding: 0; width: ${widthPx};">&nbsp;</td></tr></tbody>`;
        div.parentNode?.replaceChild(hrTable, div);
        return;
      }

      // Signature spacer div
      if (
        div.children.length === 0 &&
        !div.textContent?.trim() &&
        (className.includes('h-16') ||
          className.includes('h-20') ||
          className.includes('h-24') ||
          className.includes('h-14'))
      ) {
        div.style.height = '45pt';
        div.style.lineHeight = '45pt';
        div.innerHTML = '&nbsp;';
      }
    });

    // 6. Ensure all tables have proper border/cellspacing attributes for Word & print compatibility
    clone.querySelectorAll('table').forEach((tbl) => {
      tbl.setAttribute('align', 'center');
      if (tbl.classList.contains('header-table') || tbl.classList.contains('sig-table')) {
        tbl.setAttribute('border', '0');
        tbl.setAttribute('cellspacing', '0');
        tbl.setAttribute('cellpadding', '0');
        tbl.style.border = 'none';
        tbl.style.width = '100%';
        tbl.style.borderCollapse = 'collapse';
        tbl.querySelectorAll('td, th').forEach((cell) => {
          const el = cell as HTMLElement;
          el.style.border = 'none';
          el.setAttribute('valign', 'top');
          el.style.verticalAlign = 'top';
        });
      } else {
        tbl.setAttribute('border', '1');
        tbl.setAttribute('cellspacing', '0');
        tbl.setAttribute('cellpadding', '5');
        tbl.style.borderCollapse = 'collapse';
        tbl.style.width = '100%';
        tbl.querySelectorAll('td, th').forEach((cell) => {
          const el = cell as HTMLElement;
          el.style.border = '1pt solid black';
          el.style.padding = '4pt 6pt';
        });
      }
    });

    // 7. Explicitly propagate alignment and typography inline styles across ALL elements
    clone.querySelectorAll('*').forEach((node) => {
      const el = node as HTMLElement;
      const classList = el.className ? String(el.className) : '';

      if (classList.includes('text-center') || el.getAttribute('align') === 'center') {
        el.setAttribute('align', 'center');
        el.style.textAlign = 'center';
      } else if (classList.includes('text-right') || el.getAttribute('align') === 'right') {
        el.setAttribute('align', 'right');
        el.style.textAlign = 'right';
      } else if (classList.includes('text-justify') || el.getAttribute('align') === 'justify') {
        el.setAttribute('align', 'justify');
        el.style.textAlign = 'justify';
      }

      if (classList.includes('font-bold') || el.tagName === 'B' || el.tagName === 'STRONG') {
        el.style.fontWeight = 'bold';
      }

      if (classList.includes('italic') || el.tagName === 'I' || el.tagName === 'EM') {
        el.style.fontStyle = 'italic';
      }

      if (classList.includes('whitespace-nowrap') || classList.includes('nowrap')) {
        el.style.whiteSpace = 'nowrap';
      }

      if (classList.includes('uppercase') && !classList.includes('no-uppercase')) {
        el.style.textTransform = 'uppercase';
      }

      el.style.fontFamily = "'Times New Roman', 'Tinos', Times, serif";
    });

    return clone;
  };

  const handlePrint = () => {
    const clone = preparePrintableClone();
    if (!clone) return;

    const printWindow = window.open('', '_blank', 'width=950,height=850');
    if (!printWindow) {
      window.print();
      return;
    }

    const content = clone.innerHTML;
    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>${getDocTitle()}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 20mm 20mm 20mm 30mm;
          }
          * {
            box-sizing: border-box;
            font-family: 'Times New Roman', 'Tinos', Times, serif !important;
          }
          body {
            font-family: 'Times New Roman', 'Tinos', Times, serif !important;
            font-size: 12pt;
            line-height: 1.35;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          p, div, span, table, td, th, b, strong, em, i {
            font-family: 'Times New Roman', 'Tinos', Times, serif !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          table.header-table, table.sig-table {
            width: 100% !important;
            border: none !important;
            margin-bottom: 10pt;
          }
          table.header-table td, table.sig-table td {
            border: none !important;
            padding: 0 !important;
            vertical-align: top;
          }
          table.data-table {
            width: 100% !important;
            border-collapse: collapse;
            border: 1pt solid #000;
          }
          table.data-table th, table.data-table td {
            border: 1pt solid #000;
            padding: 4pt 6pt;
            font-size: 10.5pt;
            vertical-align: middle;
          }
          .no-print {
            display: none !important;
          }
          .whitespace-nowrap {
            white-space: nowrap !important;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-justify { text-align: justify; }
          .font-bold { font-weight: bold; }
          .italic { font-style: italic; }
          .uppercase { text-transform: uppercase; }
        </style>
      </head>
      <body>
        ${content}
        <script>
          window.onload = function() {
            window.focus();
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadWord = () => {
    if (!printAreaRef.current) return;
    const isWide = activeDoc === 'pricing' || activeDoc === 'inventory';
    const orientation = isWide ? 'landscape' : 'portrait';
    const filename = `${getDocTitle().replace(/\s+/g, '_')}_${household.ownerName.replace(/\s+/g, '_')}`;

    downloadWordDocumentND30(printAreaRef.current, filename, {
      orientation,
      title: `${getDocTitle()} - ${household.ownerName}`,
      fontSizePt: isWide ? 10.5 : 12,
      marginLeftMm: isWide ? 25 : 30,
      marginRightMm: 15,
      marginTopMm: 20,
      marginBottomMm: 20,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      {/* Scoped CSS ensuring 100% Times New Roman typography across all elements */}
      <style>{`
        .gpmb-admin-doc,
        .gpmb-admin-doc * {
          font-family: 'Times New Roman', 'Tinos', Times, serif !important;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .gpmb-admin-doc table.header-table,
        .gpmb-admin-doc table.sig-table {
          border: none !important;
          width: 100% !important;
        }
        .gpmb-admin-doc table.header-table td,
        .gpmb-admin-doc table.sig-table td {
          border: none !important;
          padding: 0 !important;
          vertical-align: top !important;
        }
        .gpmb-admin-doc table.data-table {
          border-collapse: collapse !important;
          width: 100% !important;
          border: 1pt solid #000 !important;
        }
        .gpmb-admin-doc table.data-table th,
        .gpmb-admin-doc table.data-table td {
          border: 1pt solid #000 !important;
          padding: 4pt 6pt !important;
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] min-h-0 flex flex-col overflow-hidden border border-slate-200">
        {/* Header Bar */}
        <div className={`${PREVIEW_HEADER_LAYOUT} bg-slate-50 border-b border-slate-200`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Hồ sơ bồi thường, GPMB & Thu hồi đất (Nghị định 30)</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                  Times New Roman chuẩn
                </span>
              </h2>
              <p className="text-[10px] text-slate-500">
                Hộ: <strong>{household.ownerName}</strong> • Thửa {household.parcel || '...'}, TBĐ {household.mapSheet || '...'} • Dự án: {project.name}
              </p>
            </div>
          </div>

          <div className={`${PREVIEW_ACTIONS_LAYOUT} flex-wrap`}>
            <button
              onClick={handleDownloadWord}
              className={`${PREVIEW_ACTION_BUTTON_LAYOUT} rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer`}
              title="Tải văn bản Microsoft Word (.doc) chuẩn thể thức Nghị định 30"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải Word (.doc)</span>
            </button>
            <button
              onClick={handlePrint}
              className={`${PREVIEW_ACTION_BUTTON_LAYOUT} rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer`}
              title="In biểu mẫu chuẩn khổ giấy A4 (Lề: Trái 3cm, Phải 2cm, Trên 2cm, Dưới 2cm)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In biểu mẫu</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className={`px-2.5 py-1.5 bg-slate-100/80 border-b border-slate-200 ${PREVIEW_TABS_LAYOUT} text-[11px]`}>
          <button
            onClick={() => setActiveDoc('land_notice')}
            className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
              activeDoc === 'land_notice'
                ? 'bg-white text-indigo-700 shadow-2xs border border-indigo-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5 text-amber-600" />
            <span>1. Thông báo thu hồi đất</span>
          </button>
          <button
            onClick={() => setActiveDoc('inventory')}
            className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
              activeDoc === 'inventory'
                ? 'bg-white text-indigo-700 shadow-2xs border border-indigo-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            <span>2. Biên bản kiểm kê</span>
          </button>
          <button
            onClick={() => setActiveDoc('land_submission')}
            className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
              activeDoc === 'land_submission'
                ? 'bg-white text-indigo-700 shadow-2xs border border-indigo-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-emerald-600" />
            <span>3. Tờ trình thu hồi đất</span>
          </button>
          <button
            onClick={() => setActiveDoc('land_decision')}
            className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
              activeDoc === 'land_decision'
                ? 'bg-white text-indigo-700 shadow-2xs border border-indigo-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5 text-rose-600" />
            <span>4. Quyết định thu hồi đất</span>
          </button>
          <button
            onClick={() => setActiveDoc('origin')}
            className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
              activeDoc === 'origin'
                ? 'bg-white text-indigo-700 shadow-2xs border border-indigo-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Stamp className="w-3.5 h-3.5 text-teal-600" />
            <span>5. Xác nhận nguồn gốc đất</span>
          </button>
          <button
            onClick={() => setActiveDoc('compensation')}
            className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
              activeDoc === 'compensation'
                ? 'bg-white text-indigo-700 shadow-2xs border border-indigo-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-purple-600" />
            <span>6. Bảng tính bồi thường</span>
          </button>
          <button
            onClick={() => setActiveDoc('handover')}
            className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
              activeDoc === 'handover'
                ? 'bg-white text-indigo-700 shadow-2xs border border-indigo-100'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-slate-700" />
            <span>7. Biên bản bàn giao MB</span>
          </button>
        </div>

        {/* Document Printable Body */}
        <div className={`${PREVIEW_DOCUMENT_BODY_LAYOUT} bg-slate-200/60 flex justify-center`}>
          <div
            ref={printAreaRef}
            style={{ fontFamily: "'Times New Roman', 'Tinos', Times, serif" }}
            className="gpmb-admin-doc w-full min-w-[210mm] max-w-[210mm] min-h-[297mm] bg-white pt-[20mm] pr-[20mm] pb-[20mm] pl-[30mm] shadow-sm rounded-lg border border-slate-200 text-black leading-relaxed text-[12pt]"
          >
            {/* ==================== 1. THÔNG BÁO THU HỒI ĐẤT ==================== */}
            {activeDoc === 'land_notice' && (
              <div className="space-y-3.5">
                <table className="header-table w-full mb-3" border={0} cellSpacing={0} cellPadding={0}>
                  <tbody>
                    <tr>
                      <td style={{ width: '38%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          ỦY BAN NHÂN DÂN
                        </div>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          XÃ LÃNH NGỌC
                        </div>
                        <div className="w-24 h-[1.5px] bg-black mx-auto mt-1 mb-1"></div>
                        <div className="text-[10pt] mt-1 whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Số: {household.noticeNumber || '.......'}/TB-UBND
                        </div>
                      </td>
                      <td style={{ width: '62%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                        </div>
                        <div className="font-bold text-[11.5pt] leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Độc lập - Tự do - Hạnh phúc
                        </div>
                        <div className="w-36 h-[1.5px] bg-black mx-auto mt-1 mb-1"></div>
                        <div className="italic text-[10.5pt] mt-1 whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Lãnh Ngọc, ngày {day} tháng {month} năm {year}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Tiêu đề văn bản */}
                <div className="text-center my-4">
                  <div className="text-[13.5pt] font-bold uppercase leading-snug">
                    THÔNG BÁO THU HỒI ĐẤT
                  </div>
                  <div className="text-[12pt] font-bold leading-snug mt-1">
                    Để thực hiện công trình: {project.name}
                  </div>
                  <div className="text-[11pt] italic text-slate-800">
                    Địa điểm: xã Lãnh Ngọc, thành phố Đà Nẵng
                  </div>
                </div>

                {/* Căn cứ pháp lý */}
                <div className="space-y-1 text-justify text-[11.5pt] leading-relaxed">
                  <p className="italic">
                    Căn cứ điều 79, điều 80 và điều 85 Luật Đất đai ngày 18 tháng 01 năm 2024; Luật sửa đổi, bổ sung một số điều của Luật Đất đai số 31/2024/QH15, Luật Nhà ở số 27/2023/QH15, Luật Kinh doanh bất động sản số 29/2023/QH15 và Luật Các tổ chức tín dụng số 32/2024/QH15 ngày 29 tháng 6 năm 2024;
                  </p>
                  <p className="italic">
                    Căn cứ Nghị quyết số 254/2025/QH15 ngày 11/12/2025 của Quốc hội Quy định một số cơ chế, chính sách tháo gỡ khó khăn, vướng mắc trong tổ chức thi hành Luật Đất đai;
                  </p>
                  <p className="italic">
                    Căn cứ Nghị định số 88/2024/NĐ-CP ngày 15/7/2024 của Chính phủ quy định về bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất;
                  </p>
                  <p className="italic">
                    Căn cứ Nghị định số 102/2024/NĐ-CP ngày 30/7/2024 của Chính phủ quy định chi tiết thi hành một số điều của Luật Đất đai;
                  </p>
                  <p className="italic">
                    Căn cứ Nghị định số 151/2025/NĐ-CP ngày 12 tháng 6 năm 2025 của Chính phủ quy định về phân định thẩm quyền của chính quyền địa phương 02 cấp, phân quyền, phân cấp trong lĩnh vực đất đai;
                  </p>
                  <p className="italic">
                    Căn cứ Nghị định số 226/2025/NĐ-CP ngày 15 tháng 8 năm 2025 của Chính phủ quy định sửa đổi, bổ sung một số Điều của các Nghị định quy định chi tiết thi hành Luật Đất đai;
                  </p>
                  <p className="italic">
                    Căn cứ Nghị định số 49/2026/NĐ-CP ngày 31/01/2026 của Chính phủ Quy định chi tiết và hướng dẫn một số điều của Nghị quyết số 254/2025/QH15 của Quốc hội quy định một số cơ chế, chính sách tháo gỡ khó khăn, vướng mắc trong tổ chức thi hành Luật Đất đai;
                  </p>
                  <p className="italic">
                    Căn cứ Quyết định số 86/2025/QĐ-UBND ngày 08/12/2025 của UBND thành phố Đà Nẵng Quy định chi tiết về bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất trên địa bàn thành phố Đà Nẵng;
                  </p>
                  <p className="italic">
                    Căn cứ Quyết định số 761/QĐ-UBND ngày 27/3/2025 của cơ quan có thẩm quyền phê duyệt kế hoạch sử dụng đất;
                  </p>
                  <p className="italic">
                    Căn cứ Quyết định số 1246/QĐ-UBND ngày 17/4/2017 về phê duyệt dự án đầu tư xây dựng công trình {project.name}; Quyết định số 546/QĐ-UBND ngày 06/2/2018 về phê duyệt điều chỉnh, bổ sung dự án; Quyết định số 2604/QĐ-UBND ngày 14/9/2021 về phê duyệt điều chỉnh, bổ sung dự án {project.name};
                  </p>
                  <p className="italic">
                    Theo đề nghị của Phòng Kinh tế xã tại Tờ trình số 177/TTr-KT ngày 10/6/2026,
                  </p>
                </div>

                <div className="text-center font-bold text-[12pt] my-2">
                  Chủ tịch UBND xã Lãnh Ngọc thông báo thu hồi đất như sau:
                </div>

                {/* Nội dung thông báo */}
                <div className="space-y-2.5 text-justify text-[12pt] leading-relaxed">
                  <div>
                    <p>
                      <strong>1. Thu hồi đất của hộ ông (bà):</strong> <strong>{household.ownerName}</strong>
                    </p>
                    <div className="pl-5 mt-1 space-y-0.5">
                      <p>- Địa chỉ: Thôn {household.address || '4'}, xã Lãnh Ngọc, thành phố Đà Nẵng.</p>
                      <p>
                        - Diện tích đất dự kiến thu hồi: <strong>{Number(household.totalArea || 0).toLocaleString('vi-VN')} m²</strong>, trong đó:
                      </p>
                    </div>

                    <div className="my-2">
                      <table className="data-table w-full border-collapse border border-black text-center text-[10.5pt]">
                        <thead>
                          <tr className="bg-slate-100 font-bold">
                            <th className="border border-black p-1.5 w-10">STT</th>
                            <th className="border border-black p-1.5">Mảnh đo đạc chỉnh lý mảnh trích đo địa chính số</th>
                            <th className="border border-black p-1.5 w-24">Thửa đất số</th>
                            <th className="border border-black p-1.5 w-32">Diện tích dự kiến thu hồi (m²)</th>
                            <th className="border border-black p-1.5 w-28">Loại đất đang sử dụng</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-black p-1.5">1</td>
                            <td className="border border-black p-1.5 font-semibold">{household.mapSheet || '04-2025'}</td>
                            <td className="border border-black p-1.5 font-bold">{household.parcel || '43'}</td>
                            <td className="border border-black p-1.5 font-bold text-indigo-950">
                              {Number(household.totalArea || 0).toLocaleString('vi-VN')}
                            </td>
                            <td className="border border-black p-1.5 font-semibold">{household.landType || 'CLN'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <p className="pl-5 mt-1">
                      - Vị trí, ranh giới thửa đất: Theo Mảnh đo đạc chỉnh lý cập nhật, bổ sung từ mảnh bản đồ trích đo địa chính do đơn vị đo đạc có tư cách pháp nhân lập và đã được cơ quan quản lý đất đai có thẩm quyền phê duyệt.
                    </p>
                  </div>

                  <div>
                    <p>
                      <strong>2. Lý do thu hồi đất:</strong> Để thực hiện công trình <strong>{project.name}</strong>.
                    </p>
                  </div>

                  <div>
                    <p>
                      <strong>3. Tiến độ thu hồi đất:</strong> Công tác khảo sát, đo đạc xác định diện tích đất, thống kê nhà ở, tài sản khác gắn liền với đất để lập phương án bồi thường, hỗ trợ, tái định cư trong thời gian 12 tháng tính từ ngày ban hành Thông báo thu hồi đất.
                    </p>
                  </div>

                  <div>
                    <p>
                      <strong>4.</strong> Chi nhánh khu vực 10 thuộc Trung tâm phát triển quỹ đất thành phố Đà Nẵng có trách nhiệm chủ trì, phối hợp với UBND xã Lãnh Ngọc và hộ gia đình, cá nhân để thực hiện việc điều tra, khảo sát, đo đạc xác định diện tích đất, thống kê nhà ở, tài sản khác gắn liền với đất để lập phương án bồi thường, hỗ trợ, tái định cư. Trường hợp hộ gia đình, cá nhân không chấp hành việc điều tra, khảo sát, đo đạc nêu trên thì Nhà nước triển khai thực hiện kiểm đếm bắt buộc theo quy định pháp luật.
                    </p>
                  </div>

                  <div>
                    <p>
                      <strong>5.</strong> Thông báo này có hiệu lực 12 tháng kể từ ngày ký./.
                    </p>
                  </div>
                </div>

                {/* Chữ ký & Nơi nhận */}
                <table className="sig-table w-full pt-5 mt-5" border={0} cellSpacing={0} cellPadding={0}>
                  <tbody>
                    <tr>
                      <td style={{ width: '48%', verticalAlign: 'top', textAlign: 'left' }}>
                        <div className="font-bold italic text-[11pt] underline">Nơi nhận:</div>
                        <div className="text-[10pt] leading-tight space-y-0.5 mt-1">
                          <p>- Ông (bà) {household.ownerName};</p>
                          <p>- Phòng Kinh tế;</p>
                          <p>- Chi nhánh khu vực 10;</p>
                          <p>- Chi nhánh Văn phòng ĐKĐĐ khu vực XVI;</p>
                          <p>- Lưu: HS, VT.</p>
                        </div>
                      </td>
                      <td style={{ width: '52%', verticalAlign: 'top', textAlign: 'center' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight">KT. CHỦ TỊCH</div>
                        <div className="font-bold text-[11pt] uppercase leading-tight">PHÓ CHỦ TỊCH</div>
                        <div className="h-16"></div>
                        <div className="font-bold text-[11.5pt] text-slate-900">Thái Công Cần</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ==================== 2. BIÊN BẢN KIỂM KÊ HIỆN TRẠNG ==================== */}
            {activeDoc === 'inventory' && (
              <div className="space-y-3.5">
                <table className="header-table w-full mb-3" border={0} cellSpacing={0} cellPadding={0}>
                  <tbody>
                    <tr>
                      <td style={{ width: '38%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          UBND XÃ LÃNH NGỌC
                        </div>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          HỘI ĐỒNG BT, HT & TĐC
                        </div>
                        <div className="w-28 h-[1.5px] bg-black mx-auto mt-1 mb-1"></div>
                        <div className="text-[10pt] mt-1 whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Số: ......./BB-GPMB
                        </div>
                      </td>
                      <td style={{ width: '62%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                        </div>
                        <div className="font-bold text-[11.5pt] leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Độc lập - Tự do - Hạnh phúc
                        </div>
                        <div className="w-36 h-[1.5px] bg-black mx-auto mt-1 mb-1"></div>
                        <div className="italic text-[10.5pt] mt-1 whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Lãnh Ngọc, ngày {day} tháng {month} năm {year}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="text-center my-4">
                  <div className="text-[13.5pt] font-bold uppercase leading-snug">
                    BIÊN BẢN KIỂM KÊ HIỆN TRẠNG
                  </div>
                  <div className="text-[11.5pt] italic text-slate-700">
                    Đất đai, nhà ở, công trình xây dựng và cây cối hoa màu gắn liền với đất thu hồi
                  </div>
                  <div className="text-[11.5pt] font-semibold text-indigo-950 mt-1">
                    Dự án: {project.name}
                  </div>
                </div>

                <div className="space-y-2 text-[12pt] text-justify leading-relaxed">
                  <p>
                    Căn cứ Thông báo thu hồi đất số <strong>{household.noticeNumber || '.../TB-UBND'}</strong> ngày{' '}
                    <strong>{formatDate(household.noticeDate) || `${day}/${month}/${year}`}</strong> của Ủy ban nhân dân xã Lãnh Ngọc;
                  </p>
                  <p>
                    Hôm nay, ngày {day} tháng {month} năm {year}, tại thực địa thửa đất số <strong>{household.parcel || '...'}</strong>, tờ bản đồ số <strong>{household.mapSheet || '...'}</strong> thuộc xã Lãnh Ngọc, thành phố Đà Nẵng, Tổ công tác giải phóng mặt bằng tiến hành kiểm kê hiện trạng với các thành phần tham gia gồm:
                  </p>

                  <div className="space-y-1 pl-4 text-[11.5pt]">
                    <p>1. Đại diện Chi nhánh khu vực 10 / Trung tâm PTQĐ: Ông/Bà ..............................................................</p>
                    <p>2. Đại diện UBND xã Lãnh Ngọc: Ông <strong>Thái Công Cần</strong> - Phó Chủ tịch UBND xã.</p>
                    <p>3. Đại diện Phòng Kinh tế xã Lãnh Ngọc: Ông <strong>Võ Tấn Lạt</strong> - Phó Trưởng phòng.</p>
                    <p>4. Công chức Địa chính - Xây dựng xã: Ông <strong>Lê Văn Liệu</strong>.</p>
                    <p>5. Đại diện Thôn: Trưởng thôn <strong>{household.address || 'Hòa Hiệp'}</strong>.</p>
                    <p>
                      6. Đại diện chủ hộ gia đình: Ông/Bà <strong>{household.ownerName}</strong> (CCCD: {household.cccd || '.....................'}).
                    </p>
                  </div>

                  <div className="pt-2">
                    <div className="font-bold text-[12pt] uppercase mb-1">I. HIỆN TRẠNG ĐẤT ĐAI THU HỒI</div>
                    <table className="data-table w-full border-collapse border border-black text-center text-[10.5pt]">
                      <thead>
                        <tr className="bg-slate-100 font-bold">
                          <th className="border border-black p-1.5">Thửa số</th>
                          <th className="border border-black p-1.5">Tờ BĐ</th>
                          <th className="border border-black p-1.5">Loại đất</th>
                          <th className="border border-black p-1.5">Tổng diện tích (m²)</th>
                          <th className="border border-black p-1.5">DT thu hồi (m²)</th>
                          <th className="border border-black p-1.5">Tình trạng pháp lý</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border border-black p-1.5 font-bold">{household.parcel || '...'}</td>
                          <td className="border border-black p-1.5">{household.mapSheet || '...'}</td>
                          <td className="border border-black p-1.5">{household.landType || 'CLN'}</td>
                          <td className="border border-black p-1.5 font-semibold">
                            {Number(household.totalArea || 0).toLocaleString('vi-VN')}
                          </td>
                          <td className="border border-black p-1.5 font-bold text-indigo-900">
                            {Number(household.totalArea || 0).toLocaleString('vi-VN')}
                          </td>
                          <td className="border border-black p-1.5">Đang sử dụng ổn định</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-2">
                    <div className="font-bold text-[12pt] uppercase mb-1">
                      II. HIỆN TRẠNG TÀI SẢN, CÂY TRỒNG TRÊN ĐẤT
                    </div>
                    <div className="space-y-1 pl-2 text-[11.5pt]">
                      <p>- <strong>Nhà ở và vật kiến trúc:</strong> Không có nhà kiên cố, có công trình rào tạm, trụ bê tông theo biên bản đo vẽ hiện trường.</p>
                      <p>- <strong>Cây cối, hoa màu trên đất:</strong> Cây lâu năm (mít, chuối, keo, tiêu), cây ăn quả theo bảng kiểm kê khối lượng chi tiết đính kèm.</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="font-bold text-[12pt] uppercase mb-1">
                      III. Ý KIẾN CỦA HỘ GIA ĐÌNH VÀ CÁC THÀNH VIÊN THAM GIA
                    </div>
                    <p className="text-[11.5pt] pl-2">
                      Hộ gia đình ông/bà <strong>{household.ownerName}</strong> và các thành viên tham gia hoàn toàn thống nhất với số liệu đo đạc, kiểm đếm hiện trạng đất đai và tài sản trên đất nêu trên, không có thắc mắc hay khiếu nại gì khác.
                    </p>
                  </div>
                </div>

                {/* Chữ ký 3 bên */}
                <table className="sig-table w-full pt-5 mt-5" border={0} cellSpacing={0} cellPadding={0}>
                  <tbody>
                    <tr>
                      <td style={{ width: '33%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase">ĐẠI DIỆN HỘ GIA ĐÌNH</div>
                        <div className="italic text-[10pt] text-slate-600">(Ký và ghi rõ họ tên)</div>
                        <div className="h-16"></div>
                        <div className="font-bold text-[11.5pt] text-slate-900">{household.ownerName}</div>
                      </td>
                      <td style={{ width: '34%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase">PHÒNG KINH TẾ XÃ</div>
                        <div className="italic text-[10pt] text-slate-600">(Ký và ghi rõ họ tên)</div>
                        <div className="h-16"></div>
                        <div className="font-bold text-[11.5pt] text-slate-900">Võ Tấn Lạt</div>
                      </td>
                      <td style={{ width: '33%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight">TM. HỘI ĐỒNG GPMB</div>
                        <div className="font-bold text-[10.5pt] uppercase text-slate-700">PHÓ CHỦ TỊCH HỘI ĐỒNG</div>
                        <div className="h-16"></div>
                        <div className="font-bold text-[11.5pt] text-slate-900">Thái Công Cần</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ==================== 3. TỜ TRÌNH CỦA PHÒNG KINH TẾ ==================== */}
            {activeDoc === 'land_submission' && (
              <div className="space-y-3.5">
                <table className="header-table w-full mb-3" border={0} cellSpacing={0} cellPadding={0}>
                  <tbody>
                    <tr>
                      <td style={{ width: '38%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          UBND XÃ LÃNH NGỌC
                        </div>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          PHÒNG KINH TẾ
                        </div>
                        <div className="w-24 h-[1.5px] bg-black mx-auto mt-1 mb-1"></div>
                        <div className="text-[10pt] mt-1 whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Số: 341/TTr-KT
                        </div>
                      </td>
                      <td style={{ width: '62%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                        </div>
                        <div className="font-bold text-[11.5pt] leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Độc lập - Tự do - Hạnh phúc
                        </div>
                        <div className="w-36 h-[1.5px] bg-black mx-auto mt-1 mb-1"></div>
                        <div className="italic text-[10.5pt] mt-1 whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Lãnh Ngọc, ngày {day} tháng {month} năm {year}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Tiêu đề tờ trình */}
                <div className="text-center my-4">
                  <div className="text-[13.5pt] font-bold uppercase leading-snug">TỜ TRÌNH</div>
                  <div className="text-[12pt] font-bold leading-snug mt-1">
                    Về việc đề nghị ban hành Quyết định thu hồi đất để thực hiện dự án
                  </div>
                  <div className="text-[11.5pt] font-bold leading-snug text-indigo-950">
                    {project.name} đoạn qua xã Lãnh Ngọc
                  </div>
                </div>

                <div className="text-center font-bold text-[12pt] my-2">
                  Kính gửi: Chủ tịch Ủy ban nhân dân xã Lãnh Ngọc.
                </div>

                {/* Căn cứ pháp lý tờ trình */}
                <div className="space-y-1 text-justify text-[11.5pt] leading-relaxed">
                  <p className="italic">
                    Căn cứ Luật Tổ chức Chính quyền địa phương ngày 16/6/2025;
                  </p>
                  <p className="italic">
                    Căn cứ Luật Đất đai số 31/2024/QH15 ngày 18/01/2024; Luật sửa đổi, bổ sung một số điều của Luật Đất đai số 31/2024/QH15;
                  </p>
                  <p className="italic">
                    Căn cứ Nghị quyết số 254/2025/QH15 ngày 11/12/2025 của Quốc hội Quy định một số cơ chế, chính sách tháo gỡ khó khăn, vướng mắc trong tổ chức thi hành Luật Đất đai;
                  </p>
                  <p className="italic">
                    Căn cứ Nghị định số 88/2024/NĐ-CP ngày 15/7/2024 của Chính phủ quy định về bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất; Nghị định số 102/2024/NĐ-CP ngày 30/7/2024 của Chính phủ quy định chi tiết thi hành một số điều của Luật Đất đai;
                  </p>
                  <p className="italic">
                    Căn cứ Nghị định số 151/2025/NĐ-CP ngày 12/6/2025 của Chính phủ quy định về phân định thẩm quyền của chính quyền địa phương 02 cấp, phân quyền phân cấp trong lĩnh vực đất đai;
                  </p>
                  <p className="italic">
                    Căn cứ Quyết định số 2418/QĐ-BNNMT ngày 28/6/2025 của Bộ Nông nghiệp và Môi trường về việc đính chính Nghị định số 151/2025/NĐ-CP ngày 12 tháng 6 năm 2025 của Chính phủ quy định về phân định thẩm quyền của chính quyền địa phương 02 cấp, phân quyền phân cấp trong lĩnh vực đất đai;
                  </p>
                  <p className="italic">
                    Căn cứ Nghị định số 226/2025/NĐ-CP ngày 15/8/2025 của Chính phủ sửa đổi, bổ sung một số điều của các nghị định quy định chi tiết thi hành Luật Đất đai;
                  </p>
                  <p className="italic">
                    Căn cứ Quyết định số 1246/QĐ-UBND ngày 17/4/2017 Phê duyệt dự án đầu tư xây dựng {project.name};
                  </p>
                  <p className="italic">
                    Căn cứ Quyết định số 546/QĐ-UBND ngày 06/02/2018 Phê duyệt điều chỉnh, bổ sung dự án đầu tư xây dựng {project.name};
                  </p>
                  <p className="italic">
                    Căn cứ Quyết định số 1412/QĐ-UBND ngày 26/5/2020 Phê duyệt điều chỉnh dự án đầu tư xây dựng {project.name};
                  </p>
                  <p className="italic">
                    Căn cứ Quyết định số 2103/QĐ-UBND ngày 29/6/2025 Phê duyệt điều chỉnh dự án {project.name};
                  </p>
                  <p className="italic">
                    Căn cứ Quyết định số 68/QĐ-UBND ngày 26/01/2026 của UBND xã Lãnh Ngọc về việc phê duyệt giá đất cụ thể và phương án bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất để thực hiện Dự án {project.name} (đoạn qua xã Lãnh Ngọc, thành phố Đà Nẵng);
                  </p>
                  <p className="italic">
                    Căn cứ Quyết định số 572/QĐ-UBND ngày 29/5/2026 của UBND xã Lãnh Ngọc về việc phê duyệt giá đất cụ thể và phương án bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất để thực hiện Dự án {project.name} (đoạn qua xã Lãnh Ngọc, thành phố Đà Nẵng);
                  </p>
                  <p className="italic">
                    Căn cứ Quyết định số 1424/QĐ-UBND ngày 22/4/2025 của cơ quan có thẩm quyền về việc phê duyệt phương án bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất để thực hiện Dự án {project.name} (đoạn qua xã Lãnh Ngọc, thành phố Đà Nẵng).
                  </p>
                </div>

                {/* Nội dung đề xuất */}
                <div className="space-y-2.5 text-justify text-[12pt] leading-relaxed mt-2">
                  <p>
                    Phòng Kinh tế xã Lãnh Ngọc kính trình Chủ tịch Ủy ban nhân dân xã Lãnh Ngọc xem xét, ban hành Quyết định thu hồi đất để thực hiện Dự án <strong>{project.name}</strong>, đoạn qua xã Lãnh Ngọc, thành phố Đà Nẵng, đối với hộ gia đình, cá nhân:
                  </p>
                  <div className="pl-5 space-y-0.5">
                    <p>- Hộ ông/bà: <strong>{household.ownerName}</strong></p>
                    <p>- Địa chỉ: Thôn {household.address || 'Hòa Hiệp'}, xã Lãnh Ngọc, thành phố Đà Nẵng.</p>
                    <p>
                      - Diện tích đề nghị thu hồi: <strong>{Number(household.totalArea || 0).toLocaleString('vi-VN')} m²</strong> đất <strong>{household.landType || 'trồng cây lâu năm'}</strong>, thuộc một phần thửa đất số <strong>{household.parcel || '...'}</strong>, tờ bản đồ số <strong>{household.mapSheet || '...'}</strong> (mảnh trích đo địa chính) tại xã Lãnh Ngọc, thành phố Đà Nẵng (theo danh sách chi tiết kèm theo).
                    </p>
                  </div>
                  <p>
                    - <strong>Lý do thu hồi đất:</strong> Để thực hiện dự án {project.name} theo quy định tại Luật Đất đai năm 2024.
                  </p>
                  <p>
                    Kính trình Chủ tịch Ủy ban nhân dân xã xem xét, quyết định./.
                  </p>
                </div>

                {/* Chữ ký tờ trình */}
                <table className="sig-table w-full pt-5 mt-5" border={0} cellSpacing={0} cellPadding={0}>
                  <tbody>
                    <tr>
                      <td style={{ width: '48%', verticalAlign: 'top', textAlign: 'left' }}>
                        <div className="font-bold italic text-[11pt] underline">Nơi nhận:</div>
                        <div className="text-[10pt] leading-tight space-y-0.5 mt-1">
                          <p>- Như trên;</p>
                          <p>- Lưu: VTP.</p>
                        </div>
                      </td>
                      <td style={{ width: '52%', verticalAlign: 'top', textAlign: 'center' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight">KT. TRƯỞNG PHÒNG</div>
                        <div className="font-bold text-[11pt] uppercase leading-tight">PHÓ TRƯỞNG PHÒNG</div>
                        <div className="h-16"></div>
                        <div className="font-bold text-[11.5pt] text-slate-900">Võ Tấn Lạt</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ==================== 4. QUYẾT ĐỊNH THU HỒI ĐẤT ==================== */}
            {activeDoc === 'land_decision' && (
              <div className="space-y-3.5">
                <table className="header-table w-full mb-3" border={0} cellSpacing={0} cellPadding={0}>
                  <tbody>
                    <tr>
                      <td style={{ width: '38%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          ỦY BAN NHÂN DÂN
                        </div>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          XÃ LÃNH NGỌC
                        </div>
                        <div className="w-24 h-[1.5px] bg-black mx-auto mt-1 mb-1"></div>
                        <div className="text-[10pt] mt-1 whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Số: {household.recoveryDecisionNumber || '.......'}/QĐ-UBND
                        </div>
                      </td>
                      <td style={{ width: '62%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                        </div>
                        <div className="font-bold text-[11.5pt] leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Độc lập - Tự do - Hạnh phúc
                        </div>
                        <div className="w-36 h-[1.5px] bg-black mx-auto mt-1 mb-1"></div>
                        <div className="italic text-[10.5pt] mt-1 whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Lãnh Ngọc, ngày {day} tháng {month} năm {year}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Tiêu đề quyết định */}
                <div className="text-center my-4">
                  <div className="text-[13.5pt] font-bold uppercase leading-snug">QUYẾT ĐỊNH</div>
                  <div className="text-[12pt] font-bold leading-snug mt-1">
                    Về việc thu hồi đất để thực hiện dự án: {project.name}
                  </div>
                  <div className="text-[11.5pt] italic text-slate-800">
                    đoạn qua xã Lãnh Ngọc, thành phố Đà Nẵng
                  </div>
                </div>

                <div className="text-center font-bold text-[12pt] my-2 uppercase">
                  CHỦ TỊCH ỦY BAN NHÂN DÂN XÃ LÃNH NGỌC
                </div>

                {/* Căn cứ pháp lý */}
                <div className="space-y-1 text-justify text-[11.5pt] leading-relaxed">
                  <p className="italic">
                    Căn cứ Luật Tổ chức chính quyền địa phương ngày 16 tháng 6 năm 2025;
                  </p>
                  <p className="italic">
                    Căn cứ Luật Đất đai ngày 18 tháng 01 năm 2024 đã được sửa đổi, bổ sung một số điều theo Luật số 43/2024/QH15, Luật số 47/2024/QH15, Luật số 58/2024/QH15 và Luật số 93/2025/QH15;
                  </p>
                  <p className="italic">
                    Căn cứ Nghị quyết số 254/2025/QH15 ngày 11/12/2025 của Quốc hội Quy định một số cơ chế, chính sách tháo gỡ khó khăn, vướng mắc trong tổ chức thi hành Luật Đất đai;
                  </p>
                  <p className="italic">
                    Căn cứ Nghị định số 88/2024/NĐ-CP ngày 15/7/2024 của Chính phủ quy định về bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất;
                  </p>
                  <p className="italic">
                    Căn cứ Nghị định 102/2024/NĐ-CP ngày 30/7/2024 của Chính phủ quy định chi tiết thi hành một số điều của Luật Đất đai;
                  </p>
                  <p className="italic">
                    Căn cứ Nghị định số 151/2025/NĐ-CP ngày 12 tháng 6 năm 2025 của Chính phủ quy định về phân định thẩm quyền của chính quyền địa phương 02 cấp, phân quyền, phân cấp trong lĩnh vực đất đai;
                  </p>
                  <p className="italic">
                    Căn cứ Nghị định số 226/2025/NĐ-CP ngày 15 tháng 8 năm 2025 của Chính phủ sửa đổi, bổ sung một số điều của các nghị định quy định chi tiết thi hành Luật Đất đai;
                  </p>
                  <p className="italic">
                    Căn cứ Nghị định số 49/2026/NĐ-CP ngày 31/01/2026 của Chính phủ Quy định chi tiết và hướng dẫn một số điều của Nghị quyết số 254/2025/QH15 của Quốc hội quy định một số cơ chế, chính sách tháo gỡ khó khăn, vướng mắc trong tổ chức thi hành Luật Đất đai;
                  </p>
                  <p className="italic">
                    Thực hiện Công văn số 1138/UBND-SNNMT ngày 13/02/2026 của UBND thành phố Đà Nẵng về việc liên quan đến triển khai Nghị định số 49/2026/NĐ-CP ngày 31/01/2026 của Chính phủ Quy định chi tiết và hướng dẫn một số điều của Nghị quyết số 254/2025/QH15 của Quốc hội quy định một số cơ chế, chính sách tháo gỡ khó khăn, vướng mắc trong tổ chức thi hành Luật Đất đai;
                  </p>
                  <p className="italic">
                    Căn cứ Quyết định số 86/2025/QĐ-UBND ngày 08/12/2025 của UBND thành phố Đà Nẵng Quy định chi tiết về bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất trên địa bàn thành phố Đà Nẵng;
                  </p>
                  <p className="italic">
                    Căn cứ Quyết định số 1246/QĐ-UBND ngày 17/4/2017 về Phê duyệt dự án đầu tư xây dựng Dự án {project.name}; Quyết định số 546/QĐ-UBND ngày 06/02/2018 về phê duyệt điều chỉnh, bổ sung dự án đầu tư xây dựng {project.name}; Quyết định số 2103/QĐ-UBND ngày 29/6/2025 về phê duyệt điều chỉnh Dự án {project.name};
                  </p>
                  <p className="italic">
                    Căn cứ Quyết định số 572/QĐ-UBND ngày 29/05/2026 của UBND xã Lãnh Ngọc về việc phê duyệt phương án bồi thường, hỗ trợ, tái định cư khi Nhà nước thu hồi đất để thực hiện Dự án {project.name} (đoạn qua xã Lãnh Ngọc, thành phố Đà Nẵng);
                  </p>
                  <p className="italic">
                    Xét đề nghị của Phòng Kinh tế xã Lãnh Ngọc tại Tờ trình số 341/TTr-KT ngày 16/10/2026,
                  </p>
                </div>

                <div className="text-center font-bold text-[12.5pt] my-2.5">QUYẾT ĐỊNH:</div>

                {/* Các điều khoản quyết định */}
                <div className="space-y-2.5 text-justify text-[12pt] leading-relaxed">
                  <div>
                    <p>
                      <strong>Điều 1.</strong> Thu hồi diện tích <strong>{Number(household.totalArea || 0).toLocaleString('vi-VN')} m²</strong> đất <strong>{household.landType || 'trồng cây lâu năm'}</strong> do hộ ông/bà <strong>{household.ownerName}</strong> đang quản lý sử dụng, thuộc một phần thửa đất số <strong>{household.parcel || '...'}</strong>, tờ bản đồ số <strong>{household.mapSheet || '...'}</strong> (mảnh trích đo địa chính) tại xã Lãnh Ngọc, thành phố Đà Nẵng.
                    </p>
                    <p className="pl-5 mt-1">
                      <strong>Lý do thu hồi đất:</strong> Để thực hiện dự án <strong>{project.name}</strong> tại xã Lãnh Ngọc, thành phố Đà Nẵng.
                    </p>
                  </div>

                  <div>
                    <p>
                      <strong>Điều 2.</strong> Giao nhiệm vụ cho các cơ quan, tổ chức thực hiện việc thu hồi đất, cụ thể như sau:
                    </p>
                    <div className="pl-5 mt-1 space-y-1">
                      <p>
                        1. Phòng Kinh tế xã Lãnh Ngọc có trách nhiệm giao quyết định này cho hộ ông/bà <strong>{household.ownerName}</strong>; trường hợp hộ ông/bà {household.ownerName} không nhận Quyết định này hoặc vắng mặt thì phải lập biên bản; niêm yết Quyết định này tại trụ sở UBND xã Lãnh Ngọc và tại nhà sinh hoạt văn hóa thôn {household.address || 'Hòa Hiệp'}, xã Lãnh Ngọc.
                      </p>
                      <p>
                        2. Văn phòng HĐND và UBND xã Lãnh Ngọc có trách nhiệm đăng Quyết định này trên trang thông tin điện tử của UBND xã Lãnh Ngọc, thành phố Đà Nẵng.
                      </p>
                      <p>
                        3. Giao Chi nhánh khu vực 10 thuộc Trung tâm Phát triển quỹ đất thành phố Đà Nẵng phối hợp với Phòng Kinh tế xã Lãnh Ngọc quản lý chặt chẽ quỹ đất đã thu hồi theo đúng quy định; thu nhận Giấy chứng nhận quyền sử dụng đất, quyền sở hữu nhà ở và tài sản khác gắn liền với đất hoặc một trong các loại giấy tờ về quyền sử dụng đất đúng quy định của hộ ông/bà {household.ownerName} (nếu có) chuyển về Phòng Kinh tế xã Lãnh Ngọc để lập thủ tục thu hồi, chỉnh lý hoặc cấp lại đúng theo quy định.
                      </p>
                    </div>
                  </div>

                  <div>
                    <p>
                      <strong>Điều 3.</strong> Quyết định này có hiệu lực kể từ ngày ký.
                    </p>
                  </div>

                  <div>
                    <p>
                      <strong>Điều 4.</strong> Chánh Văn phòng HĐND và UBND xã, Trưởng Phòng Kinh tế; Giám đốc Chi nhánh khu vực 10 thuộc Trung tâm Phát triển quỹ đất thành phố Đà Nẵng; Hộ ông/bà <strong>{household.ownerName}</strong>; Thủ trưởng các cơ quan, đơn vị và các cá nhân có liên quan chịu trách nhiệm thi hành Quyết định này./.
                    </p>
                  </div>
                </div>

                {/* Chữ ký & Nơi nhận */}
                <table className="sig-table w-full pt-5 mt-5" border={0} cellSpacing={0} cellPadding={0}>
                  <tbody>
                    <tr>
                      <td style={{ width: '48%', verticalAlign: 'top', textAlign: 'left' }}>
                        <div className="font-bold italic text-[11pt] underline">Nơi nhận:</div>
                        <div className="text-[10pt] leading-tight space-y-0.5 mt-1">
                          <p>- Như Điều 4;</p>
                          <p>- Lưu: VT.</p>
                        </div>
                      </td>
                      <td style={{ width: '52%', verticalAlign: 'top', textAlign: 'center' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight">KT. CHỦ TỊCH</div>
                        <div className="font-bold text-[11pt] uppercase leading-tight">PHÓ CHỦ TỊCH</div>
                        <div className="h-16"></div>
                        <div className="font-bold text-[11.5pt] text-slate-900">Thái Công Cần</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ==================== 5. XÁC NHẬN NGUỒN GỐC ĐẤT ==================== */}
            {activeDoc === 'origin' && (
              <div className="space-y-3.5">
                <table className="header-table w-full mb-3" border={0} cellSpacing={0} cellPadding={0}>
                  <tbody>
                    <tr>
                      <td style={{ width: '38%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          ỦY BAN NHÂN DÂN
                        </div>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          XÃ LÃNH NGỌC
                        </div>
                        <div className="w-24 h-[1.5px] bg-black mx-auto mt-1 mb-1"></div>
                        <div className="text-[10pt] mt-1 whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Số: ......./XN-UBND
                        </div>
                      </td>
                      <td style={{ width: '62%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                        </div>
                        <div className="font-bold text-[11.5pt] leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Độc lập - Tự do - Hạnh phúc
                        </div>
                        <div className="w-36 h-[1.5px] bg-black mx-auto mt-1 mb-1"></div>
                        <div className="italic text-[10.5pt] mt-1 whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Lãnh Ngọc, ngày {day} tháng {month} năm {year}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="text-center my-4">
                  <div className="text-[13.5pt] font-bold uppercase leading-snug">
                    BẢN XÁC NHẬN NGUỒN GỐC SỬ DỤNG ĐẤT
                  </div>
                  <div className="text-[11.5pt] italic text-slate-700">
                    (Phục vụ công tác bồi thường, hỗ trợ khi Nhà nước thu hồi đất theo Luật Đất đai 2024)
                  </div>
                  <div className="text-[11.5pt] font-semibold text-indigo-900 mt-1">
                    Dự án: {project.name}
                  </div>
                </div>

                <div className="space-y-2 text-[12pt] text-justify leading-relaxed">
                  <p>
                    Ủy ban nhân dân xã Lãnh Ngọc xác nhận nguồn gốc và thời điểm sử dụng đất của hộ gia đình, cá nhân phục vụ công tác giải phóng mặt bằng dự án:
                  </p>

                  <div className="pl-5 space-y-0.5 text-[11.5pt]">
                    <p>- Họ và tên chủ sử dụng: <strong>{household.ownerName}</strong></p>
                    <p>- Số CCCD/Định danh: <strong>{household.cccd || '...........................................'}</strong></p>
                    <p>- Địa chỉ thường trú: <strong>{household.address || 'Xã Lãnh Ngọc, thành phố Đà Nẵng'}</strong></p>
                    <p>
                      - Thửa đất số: <strong>{household.parcel || '...'}</strong>; Tờ bản đồ số: <strong>{household.mapSheet || '...'}</strong>
                    </p>
                    <p>
                      - Diện tích thu hồi: <strong>{Number(household.totalArea || 0).toLocaleString('vi-VN')} m²</strong>; Loại đất: <strong>{household.landType || 'Đất ở'}</strong>
                    </p>
                  </div>

                  <div className="pt-2 space-y-1.5">
                    <div className="font-bold text-[12pt] uppercase">
                      NỘI DUNG XÁC NHẬN CỦA ỦY BAN NHÂN DÂN XÃ:
                    </div>
                    <div className="space-y-1 pl-2 text-[11.5pt]">
                      <p>
                        <strong>1. Nguồn gốc và thời điểm sử dụng đất:</strong> Thửa đất do hộ ông/bà {household.ownerName} sử dụng ổn định, liên tục từ trước ngày 15/10/1993, có ranh giới rõ ràng, không có tranh chấp với các hộ xung quanh.
                      </p>
                      <p>
                        <strong>2. Tình trạng tranh chấp, khiếu nại:</strong> Tại thời điểm ban hành thông báo thu hồi đất, thửa đất trên không có tranh chấp, khiếu nại, không bị kê biên để đảm bảo thi hành án, không thuộc diện bị xử lý vi phạm hành chính về đất đai.
                      </p>
                      <p>
                        <strong>3. Tình trạng nhà ở, công trình xây dựng:</strong> Nhà ở và vật kiến trúc trên đất được xây dựng phù hợp thời điểm sử dụng đất, không vi phạm chỉ giới giao thông, thủy lợi, đê điều.
                      </p>
                      <p>
                        <strong>4. Điều kiện bồi thường, hỗ trợ:</strong> Căn cứ Luật Đất đai 2024 và Nghị định số 88/2024/NĐ-CP của Chính phủ, hộ gia đình ông/bà <strong>{household.ownerName}</strong> đủ điều kiện được bồi thường về đất và tài sản gắn liền với đất theo đơn giá quy định.
                      </p>
                    </div>
                  </div>
                </div>

                <table className="sig-table w-full pt-6 mt-5" border={0} cellSpacing={0} cellPadding={0}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight">
                          CÔNG CHỨC ĐỊA CHÍNH - XÂY DỰNG
                        </div>
                        <div className="italic text-[10pt] text-slate-600">(Ký và ghi rõ họ tên)</div>
                        <div className="h-20"></div>
                        <div className="font-bold text-[11.5pt] text-slate-900">Lê Văn Liệu</div>
                      </td>
                      <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight">
                          TM. ỦY BAN NHÂN DÂN XÃ LÃNH NGỌC
                        </div>
                        <div className="font-bold text-[11pt] uppercase leading-tight">
                          KT. CHỦ TỊCH / PHÓ CHỦ TỊCH
                        </div>
                        <div className="h-20"></div>
                        <div className="font-bold text-[11.5pt] text-slate-900">Thái Công Cần</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ==================== 6. PHƯƠNG ÁN BỒI THƯỜNG CHI TIẾT ==================== */}
            {activeDoc === 'compensation' && (
              <div className="space-y-3.5">
                <table className="header-table w-full mb-3" border={0} cellSpacing={0} cellPadding={0}>
                  <tbody>
                    <tr>
                      <td style={{ width: '38%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          UBND XÃ LÃNH NGỌC
                        </div>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          HỘI ĐỒNG BT, HT & TĐC
                        </div>
                        <div className="w-28 h-[1.5px] bg-black mx-auto mt-1 mb-1"></div>
                        <div className="text-[10pt] mt-1 whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Biểu mẫu số: 03/PA-BT
                        </div>
                      </td>
                      <td style={{ width: '62%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                        </div>
                        <div className="font-bold text-[11.5pt] leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Độc lập - Tự do - Hạnh phúc
                        </div>
                        <div className="w-36 h-[1.5px] bg-black mx-auto mt-1 mb-1"></div>
                        <div className="italic text-[10.5pt] mt-1 whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Lãnh Ngọc, ngày {day} tháng {month} năm {year}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="text-center my-4">
                  <div className="text-[13.5pt] font-bold uppercase leading-snug">
                    BẢNG TÍNH TOÁN KINH PHÍ BỒI THƯỜNG, HỖ TRỢ CHI TIẾT
                  </div>
                  <div className="text-[11.5pt] italic text-slate-700">Dự án: {project.name}</div>
                  <div className="text-[11.5pt] font-bold text-indigo-950 mt-1">
                    Chủ hộ: {household.ownerName} • Thửa {household.parcel || '...'}, TBĐ {household.mapSheet || '...'}
                  </div>
                </div>

                <table className="data-table w-full border-collapse border border-black text-[10.5pt]">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-center">
                      <th className="border border-black p-1.5 w-10">STT</th>
                      <th className="border border-black p-1.5 text-left">Nội dung chi trả bồi thường, hỗ trợ</th>
                      <th className="border border-black p-1.5 w-20">Đơn vị</th>
                      <th className="border border-black p-1.5 w-16">Khối lượng</th>
                      <th className="border border-black p-1.5 text-right w-32">Thành tiền (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-slate-50 font-bold">
                      <td className="border border-black p-1.5 text-center">I</td>
                      <td className="border border-black p-1.5" colSpan={4}>
                        BỒI THƯỜNG VỀ ĐẤT (Căn cứ bảng giá đất và hệ số điều chỉnh)
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1.5 text-center">1</td>
                      <td className="border border-black p-1.5">
                        Bồi thường diện tích đất {household.landType || 'trồng cây lâu năm'} thu hồi (Thửa {household.parcel || '...'}, TBĐ {household.mapSheet || '...'})
                      </td>
                      <td className="border border-black p-1.5 text-center">m²</td>
                      <td className="border border-black p-1.5 text-center">
                        {Number(household.totalArea || 0).toLocaleString('vi-VN')}
                      </td>
                      <td className="border border-black p-1.5 text-right font-semibold">
                        {formatCurrency((household.compensationAmount || 0) * 0.7)}
                      </td>
                    </tr>

                    <tr className="bg-slate-50 font-bold">
                      <td className="border border-black p-1.5 text-center">II</td>
                      <td className="border border-black p-1.5" colSpan={4}>
                        BỒI THƯỜNG NHÀ CỬA, CÔNG TRÌNH VẬT KIẾN TRÚC & CÂY TRỒNG
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1.5 text-center">2</td>
                      <td className="border border-black p-1.5">
                        Bồi thường công trình kiến trúc, tường rào, cổng ngõ
                      </td>
                      <td className="border border-black p-1.5 text-center">Hạng mục</td>
                      <td className="border border-black p-1.5 text-center">01</td>
                      <td className="border border-black p-1.5 text-right font-semibold">
                        {formatCurrency((household.compensationAmount || 0) * 0.15)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1.5 text-center">3</td>
                      <td className="border border-black p-1.5">
                        Bồi thường cây cối lâu năm, cây cảnh, hoa màu trên đất
                      </td>
                      <td className="border border-black p-1.5 text-center">Hạng mục</td>
                      <td className="border border-black p-1.5 text-center">01</td>
                      <td className="border border-black p-1.5 text-right font-semibold">
                        {formatCurrency((household.compensationAmount || 0) * 0.05)}
                      </td>
                    </tr>

                    <tr className="bg-slate-50 font-bold">
                      <td className="border border-black p-1.5 text-center">III</td>
                      <td className="border border-black p-1.5" colSpan={4}>
                        CHÍNH SÁCH HỖ TRỢ, TÁI ĐỊNH CƯ & KHEN THƯỞNG
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1.5 text-center">4</td>
                      <td className="border border-black p-1.5">
                        Hỗ trợ ổn định đời sống, chuyển đổi nghề nghiệp và tìm kiếm việc làm
                      </td>
                      <td className="border border-black p-1.5 text-center">Khoản</td>
                      <td className="border border-black p-1.5 text-center">01</td>
                      <td className="border border-black p-1.5 text-right font-semibold">
                        {formatCurrency((household.compensationAmount || 0) * 0.06)}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-1.5 text-center">5</td>
                      <td className="border border-black p-1.5">
                        Khen thưởng tiến độ bàn giao mặt bằng sớm theo quy định
                      </td>
                      <td className="border border-black p-1.5 text-center">Khoản</td>
                      <td className="border border-black p-1.5 text-center">01</td>
                      <td className="border border-black p-1.5 text-right font-semibold">
                        {formatCurrency((household.compensationAmount || 0) * 0.04)}
                      </td>
                    </tr>

                    <tr className="bg-slate-100 font-bold text-[11pt]">
                      <td className="border border-black p-1.5 text-center" colSpan={4}>
                        TỔNG CỘNG KINH PHÍ BỒI THƯỜNG, HỖ TRỢ ĐƯỢC DUYỆT (I + II + III)
                      </td>
                      <td className="border border-black p-1.5 text-right text-emerald-900 text-sm">
                        {formatCurrency(household.compensationAmount)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="italic text-[11pt] text-slate-700 mt-2">
                  (Bằng chữ: ..........................................................................................................................................................)
                </div>

                <table className="sig-table w-full pt-5 mt-5" border={0} cellSpacing={0} cellPadding={0}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase">ĐẠI DIỆN HỘ GIA ĐÌNH</div>
                        <div className="italic text-[10pt] text-slate-600">
                          (Ký xác nhận vào dự thảo bảng tính)
                        </div>
                        <div className="h-16"></div>
                        <div className="font-bold text-[11.5pt] text-slate-900">{household.ownerName}</div>
                      </td>
                      <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight">
                          PHÒNG KINH TẾ XÃ LÃNH NGỌC
                        </div>
                        <div className="font-bold text-[10.5pt] uppercase text-slate-700">
                          KT. TRƯỞNG PHÒNG - PHÓ TRƯỞNG PHÒNG
                        </div>
                        <div className="h-16"></div>
                        <div className="font-bold text-[11.5pt] text-slate-900">Võ Tấn Lạt</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ==================== 7. BIÊN BẢN BÀN GIAO MẶT BẰNG ==================== */}
            {activeDoc === 'handover' && (
              <div className="space-y-3.5">
                <table className="header-table w-full mb-3" border={0} cellSpacing={0} cellPadding={0}>
                  <tbody>
                    <tr>
                      <td style={{ width: '38%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          UBND XÃ LÃNH NGỌC
                        </div>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          HỘI ĐỒNG BT, HT & TĐC
                        </div>
                        <div className="w-28 h-[1.5px] bg-black mx-auto mt-1 mb-1"></div>
                        <div className="text-[10pt] mt-1 whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Số: ......./BB-BGMB
                        </div>
                      </td>
                      <td style={{ width: '62%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                        </div>
                        <div className="font-bold text-[11.5pt] leading-tight whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Độc lập - Tự do - Hạnh phúc
                        </div>
                        <div className="w-36 h-[1.5px] bg-black mx-auto mt-1 mb-1"></div>
                        <div className="italic text-[10.5pt] mt-1 whitespace-nowrap" style={{ whiteSpace: 'nowrap' }}>
                          Lãnh Ngọc, ngày {day} tháng {month} năm {year}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="text-center my-4">
                  <div className="text-[13.5pt] font-bold uppercase leading-snug">
                    BIÊN BẢN BÀN GIAO MẶT BẰNG SẠCH
                  </div>
                  <div className="text-[11.5pt] italic text-slate-700">Dự án: {project.name}</div>
                  <div className="text-[11.5pt] font-semibold text-indigo-900 mt-1">
                    Chủ hộ: {household.ownerName}
                  </div>
                </div>

                <div className="space-y-2 text-[12pt] text-justify leading-relaxed">
                  <p>
                    Hôm nay, ngày {day} tháng {month} năm {year}, tại thực địa thửa đất số <strong>{household.parcel || '...'}</strong>, tờ bản đồ số <strong>{household.mapSheet || '...'}</strong> tại xã Lãnh Ngọc, thành phố Đà Nẵng, các bên tiến hành lập biên bản bàn giao mặt bằng với các nội dung sau:
                  </p>

                  <div className="pl-4 space-y-0.5 text-[11.5pt]">
                    <p><strong>1. Bên giao mặt bằng (Hộ gia đình, cá nhân):</strong></p>
                    <p className="pl-4">- Ông/Bà: <strong>{household.ownerName}</strong> (CCCD: {household.cccd || '...............................'}).</p>
                    <p className="pl-4">- Địa chỉ: <strong>{household.address || 'Xã Lãnh Ngọc'}</strong>.</p>
                  </div>

                  <div className="pl-4 space-y-0.5 text-[11.5pt]">
                    <p><strong>2. Bên nhận mặt bằng (Hội đồng BT, HT & TĐC và Đơn vị thi công):</strong></p>
                    <p className="pl-4">- Đại diện UBND xã Lãnh Ngọc: Ông <strong>Thái Công Cần</strong> - Phó Chủ tịch UBND xã.</p>
                    <p className="pl-4">- Đại diện Phòng Kinh tế xã Lãnh Ngọc: Ông <strong>Võ Tấn Lạt</strong> - Phó Trưởng phòng.</p>
                    <p className="pl-4">- Đại diện Chi nhánh khu vực 10 thuộc Trung tâm PTQĐ thành phố Đà Nẵng: Ông/Bà ............................................</p>
                    <p className="pl-4">- Đại diện Nhà thầu thi công xây dựng công trình: Ông/Bà ...................................................</p>
                  </div>

                  <div className="pt-2 space-y-1.5 text-[11.5pt]">
                    <div className="font-bold uppercase">3. NỘI DUNG BÀN GIAO:</div>
                    <p>
                      - Hộ gia đình ông/bà <strong>{household.ownerName}</strong> đã nhận đầy đủ số tiền bồi thường, hỗ trợ theo quyết định phê duyệt và đã tự nguyện thu dọn, di dời toàn bộ tài sản, nhà cửa, vật kiến trúc và cây cối hoa màu trên đất.
                    </p>
                    <p>
                      - Bàn giao diện tích <strong>{Number(household.totalArea || 0).toLocaleString('vi-VN')} m²</strong> mặt bằng sạch thuộc thửa đất số <strong>{household.parcel || '...'}</strong>, tờ bản đồ số <strong>{household.mapSheet || '...'}</strong> cho Hội đồng Bồi thường và Đơn vị thi công để triển khai thi công công trình dự án.
                    </p>
                    <p>
                      - Kể từ ngày lập biên bản này, đơn vị thi công được toàn quyền quản lý và thi công trên diện tích mặt bằng đã bàn giao; hộ gia đình cam kết không cản trở việc thi công.
                    </p>
                  </div>
                </div>

                <table className="sig-table w-full pt-6 mt-5" border={0} cellSpacing={0} cellPadding={0}>
                  <tbody>
                    <tr>
                      <td style={{ width: '33%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase">HỘ GIA ĐÌNH BÀN GIAO</div>
                        <div className="italic text-[10pt] text-slate-600">(Ký và ghi rõ họ tên)</div>
                        <div className="h-16"></div>
                        <div className="font-bold text-[11.5pt] text-slate-900">{household.ownerName}</div>
                      </td>
                      <td style={{ width: '34%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight">
                          PHÒNG KINH TẾ XÃ
                        </div>
                        <div className="italic text-[10pt] text-slate-600">(Ký và ghi rõ họ tên)</div>
                        <div className="h-16"></div>
                        <div className="font-bold text-[11.5pt] text-slate-900">Võ Tấn Lạt</div>
                      </td>
                      <td style={{ width: '33%', textAlign: 'center', verticalAlign: 'top' }}>
                        <div className="font-bold text-[11pt] uppercase leading-tight">
                          TM. ỦY BAN NHÂN DÂN XÃ
                        </div>
                        <div className="font-bold text-[10.5pt] uppercase text-slate-700">
                          KT. CHỦ TỊCH / PHÓ CHỦ TỊCH
                        </div>
                        <div className="h-16"></div>
                        <div className="font-bold text-[11.5pt] text-slate-900">Thái Công Cần</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
