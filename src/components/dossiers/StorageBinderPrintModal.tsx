import React, { useRef } from 'react';
import { Dossier } from '../../types';
import { Printer, X, Download, FileText } from 'lucide-react';
import { exportToExcel } from '../../utils/export';
import { PREVIEW_ACTIONS_LAYOUT, PREVIEW_ACTION_BUTTON_LAYOUT } from '../common/previewModalStyles';
import { downloadWordDocumentND30 } from '../../utils/wordExportND30';

interface StorageBinderPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  dossiers: Dossier[];
  binderName: string;
}

export const StorageBinderPrintModal: React.FC<StorageBinderPrintModalProps> = ({
  isOpen,
  onClose,
  dossiers,
  binderName,
}) => {
  const printContentRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleDownloadWord = () => {
    if (!printContentRef.current) return;
    const filename = `Danh_muc_ho_so_${binderName.replace(/\s+/g, '_')}`;
    downloadWordDocumentND30(printContentRef.current, filename, {
      orientation: 'portrait',
      title: `Danh mục theo dõi hồ sơ - ${binderName}`,
      fontSizePt: 11,
      marginTopMm: 20,
      marginBottomMm: 20,
      marginLeftMm: 30,
      marginRightMm: 15,
    });
  };

  const handlePrint = () => {
    if (!printContentRef.current) {
      window.print();
      return;
    }

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.top = '-9999px';
    printFrame.style.left = '-9999px';
    printFrame.style.width = '0px';
    printFrame.style.height = '0px';
    printFrame.style.border = 'none';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (frameDoc && printFrame.contentWindow) {
      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>DANH MỤC HỒ SƠ - ${binderName}</title>
            <style>
              @page { size: A4 portrait; margin: 15mm 15mm 15mm 15mm; }
              * { box-sizing: border-box; }
              body {
                margin: 0;
                padding: 0;
                background: white;
                color: black;
                font-family: 'Times New Roman', 'Tinos', Times, serif;
                font-size: 11pt;
                line-height: 1.4;
              }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; }
              th, td { border: 1px solid black; padding: 5px 6px; }
              th { background: #f2f2f2; font-weight: bold; text-align: center; }
              .text-center { text-align: center; }
              .font-bold { font-weight: bold; }
              .uppercase { text-transform: uppercase; }
              .italic { font-style: italic; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .items-start { align-items: flex-start; }
              .mb-6 { margin-bottom: 1.5rem; }
              .mt-1 { margin-top: 0.25rem; }
              .mx-auto { margin-left: auto; margin-right: auto; }
              .w-24 { width: 6rem; }
              .w-32 { width: 8rem; }
              .h-\\[1px\\] { height: 1px; }
              .bg-black { background-color: black; }
              .tracking-wider { letter-spacing: 0.05em; }
            </style>
          </head>
          <body>
            ${printContentRef.current.innerHTML}
          </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch (e) {
          console.error('Frame print failed', e);
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(printFrame)) {
              document.body.removeChild(printFrame);
            }
          }, 60000);
        }
      }, 300);
    } else {
      window.print();
    }
  };

  const handleExport = () => {
    const data = dossiers.map((d, index) => ({
      'TT': index + 1,
      'Mã hồ sơ': d.code,
      'Chủ hồ sơ / Vị trí': `${d.owner} ${d.address ? `(${d.address})` : ''}`,
      'Thửa / TBĐ': `Thửa ${d.parcel}, TBĐ ${d.mapSheet}`,
      'Thủ tục hành chính': d.procedure,
      'Kẹp lưu trữ (STT)': `${d.storageFolder || ''} ${d.storageIndex ? `(STT: ${d.storageIndex})` : ''}`.trim(),
      'Ngày nhận': d.receivedDate ? new Date(d.receivedDate).toLocaleDateString('vi-VN') : '',
      'Hạn trả': d.dueDate ? new Date(d.dueDate).toLocaleDateString('vi-VN') : '',
      'Cán bộ thụ lý': d.handlerName || '',
      'Trạng thái': d.status,
    }));
    exportToExcel(data, `Danh_muc_theo_doi_ho_so_${binderName.replace(/\s+/g, '_')}`);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-3 sm:my-4 border border-gray-200 flex flex-col max-h-[94vh] print:max-h-none print:overflow-visible print:border-none print:shadow-none print:m-0 print:w-full print:max-w-none">
        {/* Modal Toolbar (hidden on print) */}
        <div className="px-3 py-2 bg-slate-900 text-white flex items-center justify-between gap-1.5 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold text-sm">📁 In Danh Mục Theo Dõi Hồ Sơ Giấy</span>
            <span className="text-xs text-slate-300 font-mono">({binderName} - {dossiers.length} hồ sơ)</span>
          </div>
          <div className={`${PREVIEW_ACTIONS_LAYOUT} flex-wrap`}>
            <button
              onClick={handleDownloadWord}
              className={`${PREVIEW_ACTION_BUTTON_LAYOUT} rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer`}
              title="Tải tệp Microsoft Word chuẩn Nghị định 30/2020/NĐ-CP"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Tải Word (.doc)</span>
            </button>
            <button
              onClick={handleExport}
              className={`${PREVIEW_ACTION_BUTTON_LAYOUT} rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className={`${PREVIEW_ACTION_BUTTON_LAYOUT} rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In trang A4</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Sheet */}
        <div ref={printContentRef} style={{ fontFamily: "'Times New Roman', 'Tinos', Times, serif" }} className="admin-doc min-h-0 flex-1 overflow-auto p-8 text-black text-xs leading-relaxed bg-white print:p-0 print:overflow-visible">
          {/* Header chuẩn Nghị định 30 */}
          <table className="header-table w-full border-collapse border-none mb-4" style={{ width: '100%', border: 'none', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '45%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                  <div style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase' }}>UBND XÃ LÃNH NGỌC</div>
                  <div style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase' }}>PHÒNG KINH TẾ</div>
                  <table align="center" border={0} cellPadding={0} cellSpacing={0} style={{ margin: '2pt auto 4pt auto', width: '120px', border: 'none', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr><td style={{ border: 'none', borderBottom: '1.5pt solid black', height: '1px', lineHeight: '1px', fontSize: '1px' }}>&nbsp;</td></tr>
                    </tbody>
                  </table>
                </td>
                <td style={{ width: '55%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                  <div style={{ fontSize: '11pt', fontWeight: 'bold', textTransform: 'uppercase' }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div style={{ fontSize: '11.5pt', fontWeight: 'bold' }}>Độc lập - Tự do - Hạnh phúc</div>
                  <table align="center" border={0} cellPadding={0} cellSpacing={0} style={{ margin: '2pt auto 4pt auto', width: '160px', border: 'none', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr><td style={{ border: 'none', borderBottom: '1.5pt solid black', height: '1px', lineHeight: '1px', fontSize: '1px' }}>&nbsp;</td></tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-base sm:text-lg font-bold uppercase tracking-wider">
              DANH MỤC THEO DÕI HỒ SƠ
            </h1>
            <p className="text-xs italic text-black mt-1">
              (Vị trí lưu trữ: <span className="font-bold uppercase text-black">{binderName}</span> • Tổng số: <span className="font-bold">{dossiers.length}</span> hồ sơ)
            </p>
          </div>

          {/* Table matching user requirement */}
          <table className="w-full border-collapse border border-black text-center text-[11px]">
            <thead>
              <tr className="bg-gray-100 font-bold uppercase text-[10.5px]">
                <th className="border border-black p-2 w-10">TT</th>
                <th className="border border-black p-2 w-24">Mã hồ sơ</th>
                <th className="border border-black p-2 min-w-[160px] text-left">Chủ hồ sơ / Vị trí</th>
                <th className="border border-black p-2 w-24">Thửa / TBĐ</th>
                <th className="border border-black p-2 min-w-[150px] text-left">Thủ tục hành chính</th>
                <th className="border border-black p-2 w-28">Kẹp lưu trữ (STT)</th>
                <th className="border border-black p-2 w-20">Ngày nhận</th>
                <th className="border border-black p-2 w-20">Hạn trả</th>
              </tr>
            </thead>
            <tbody>
              {dossiers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="border border-black p-4 text-center italic text-slate-500">
                    Chưa có hồ sơ lưu trữ nào trong mục này.
                  </td>
                </tr>
              ) : (
                dossiers.map((dos, idx) => (
                  <tr key={dos.id} className="hover:bg-gray-50">
                    <td className="border border-black p-1.5 font-bold">{idx + 1}</td>
                    <td className="border border-black p-1.5 font-mono font-bold">{dos.code}</td>
                    <td className="border border-black p-1.5 text-left font-semibold">
                      <div>{dos.owner}</div>
                      {dos.address && <div className="text-[10px] text-black font-normal italic">{dos.address}</div>}
                    </td>
                    <td className="border border-black p-1.5">
                      Thửa <b>{dos.parcel}</b>, TBĐ <b>{dos.mapSheet}</b>
                    </td>
                    <td className="border border-black p-1.5 text-left">{dos.procedure}</td>
                    <td className="border border-black p-1.5 font-bold">
                      {dos.storageFolder ? `${dos.storageFolder}` : 'Kẹp lưu'}
                      {dos.storageIndex ? ` (STT: #${dos.storageIndex})` : ''}
                    </td>
                    <td className="border border-black p-1.5 font-mono">{formatDate(dos.receivedDate)}</td>
                    <td className="border border-black p-1.5 font-mono font-semibold">{formatDate(dos.dueDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Signatures theo Nghị định 30 */}
          <table className="sig-table w-full border-collapse border-none text-center text-xs mt-8" style={{ width: '100%', border: 'none', borderCollapse: 'collapse', marginTop: '20pt' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '4pt' }}>
                  <div style={{ fontWeight: 'bold' }}>Cán bộ phụ trách lưu trữ</div>
                  <div style={{ fontStyle: 'italic', fontSize: '10pt', color: '#475569' }}>(Ký, ghi rõ họ tên)</div>
                  <div style={{ height: '50pt' }}></div>
                </td>
                <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '4pt' }}>
                  <div style={{ fontStyle: 'italic', fontSize: '11pt' }}>
                    Lãnh Ngọc, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                  </div>
                  <div style={{ fontWeight: 'bold', marginTop: '3pt' }}>Người lập biểu / Chuyên viên Phòng Kinh tế</div>
                  <div style={{ fontStyle: 'italic', fontSize: '10pt', color: '#475569' }}>(Ký, ghi rõ họ tên)</div>
                  <div style={{ height: '40pt' }}></div>
                  <div style={{ fontWeight: 'bold' }}>Đoàn Văn Hoài Vũ</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
