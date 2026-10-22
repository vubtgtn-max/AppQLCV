import React, { useRef } from 'react';
import { X, Printer, Download } from 'lucide-react';
import { PublicLandParcel } from '../../types';
import { PREVIEW_ACTIONS_LAYOUT, PREVIEW_ACTION_BUTTON_LAYOUT, PREVIEW_HEADER_LAYOUT } from '../common/previewModalStyles';
import { downloadWordDocumentND30 } from '../../utils/wordExportND30';

interface PublicLandPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcel: PublicLandParcel | null;
}

export const PublicLandPrintModal: React.FC<PublicLandPrintModalProps> = ({
  isOpen,
  onClose,
  parcel,
}) => {
  const printDocRef = useRef<HTMLDivElement>(null);
  if (!isOpen || !parcel) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadWord = () => {
    if (!printDocRef.current) return;
    const filename = `Hop_dong_thue_dat_5_Thua_${parcel.parcel}_TB_${parcel.mapSheet}_${parcel.tenantName || 'chua_co_ten'}`;
    downloadWordDocumentND30(printDocRef.current, filename, {
      title: `Hợp đồng thuê đất nông nghiệp công ích 5% - Thửa ${parcel.parcel}`,
      fontSizePt: 13,
      marginTopMm: 20,
      marginBottomMm: 20,
      marginLeftMm: 30,
      marginRightMm: 15,
    });
  };

  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden my-3 sm:my-4 flex flex-col max-h-[94vh] print:max-h-none print:overflow-visible">
        {/* Modal Top Bar */}
        <div className={`${PREVIEW_HEADER_LAYOUT} border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 no-print`}>
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Xem trước & In Hợp Đồng Thuê Đất Công Ích (Đất 5%)
          </div>
          <div className={`${PREVIEW_ACTIONS_LAYOUT} flex-wrap`}>
            <button
              onClick={handleDownloadWord}
              className={`${PREVIEW_ACTION_BUTTON_LAYOUT} rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer`}
              title="Tải tệp Microsoft Word chuẩn Nghị định 30/2020/NĐ-CP"
            >
              <Download className="w-3.5 h-3.5" /> Tải Word (.doc)
            </button>
            <button
              onClick={handlePrint}
              className={`${PREVIEW_ACTION_BUTTON_LAYOUT} rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer`}
            >
              <Printer className="w-3.5 h-3.5" /> In văn bản (Ctrl + P)
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div ref={printDocRef} className="min-h-0 flex-1 overflow-auto p-8 sm:p-12 text-slate-900 bg-white print:flex-none print:overflow-visible font-serif text-sm leading-relaxed" style={{ fontFamily: "'Times New Roman', serif" }}>
          {/* Header Quốc hiệu - Tiêu ngữ theo Nghị định 30 */}
          <table className="header-table w-full border-collapse border-none mb-4" style={{ width: '100%', border: 'none', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ width: '45%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                  <div style={{ fontSize: '11.5pt', fontWeight: 'bold', textTransform: 'uppercase' }}>ỦY BAN NHÂN DÂN</div>
                  <div style={{ fontSize: '11.5pt', fontWeight: 'bold', textTransform: 'uppercase' }}>XÃ LÃNH NGỌC</div>
                  <table align="center" border={0} cellPadding={0} cellSpacing={0} style={{ margin: '2pt auto 4pt auto', width: '120px', border: 'none', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr><td style={{ border: 'none', borderBottom: '1.5pt solid black', height: '1px', lineHeight: '1px', fontSize: '1px' }}>&nbsp;</td></tr>
                    </tbody>
                  </table>
                  <div style={{ fontSize: '11pt', marginTop: '2pt' }}>Số: {parcel.contractNumber || '.../HĐTĐ-UBND'}</div>
                </td>
                <td style={{ width: '55%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                  <div style={{ fontSize: '11.5pt', fontWeight: 'bold', textTransform: 'uppercase' }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>Độc lập - Tự do - Hạnh phúc</div>
                  <table align="center" border={0} cellPadding={0} cellSpacing={0} style={{ margin: '2pt auto 4pt auto', width: '160px', border: 'none', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr><td style={{ border: 'none', borderBottom: '1.5pt solid black', height: '1px', lineHeight: '1px', fontSize: '1px' }}>&nbsp;</td></tr>
                    </tbody>
                  </table>
                  <div style={{ fontSize: '11.5pt', fontStyle: 'italic', marginTop: '2pt' }}>Lãnh Ngọc, ngày {day} tháng {month} năm {year}</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Title */}
          <div className="text-center my-6">
            <h1 className="text-base sm:text-lg font-bold uppercase tracking-wider">
              HỢP ĐỒNG THUÊ ĐẤT NÔNG NGHIỆP CÔNG ÍCH
            </h1>
            <p className="text-xs italic text-slate-600 mt-1">
              (Theo quy định về quản lý, sử dụng quỹ đất công ích 5% tại Điều 179 Luật Đất đai năm 2024)
            </p>
          </div>

          {/* Body Content */}
          <div className="space-y-4 text-justify">
            <p>
              Hôm nay, ngày {day} tháng {month} năm {year}, tại Trụ sở Ủy ban nhân dân xã Lãnh Ngọc, chúng tôi gồm có:
            </p>

            {/* Bên cho thuê */}
            <div>
              <p className="font-bold underline">BÊN CHO THUÊ ĐẤT (BÊN A):</p>
              <div className="ml-4 space-y-1 mt-1 text-xs sm:text-sm">
                <p><b>Ủy ban nhân dân xã Lãnh Ngọc</b></p>
                <p>Đại diện bởi: <b>Ông Thái Công Cần</b> - Chức vụ: Phó Chủ tịch UBND xã</p>
                <p>Cán bộ tham mưu địa chính: <b>Ông Đoàn Văn Hoài Vũ</b> - Công chức Địa chính xã</p>
                <p>Địa chỉ trụ sở: Trung tâm Hành chính xã Lãnh Ngọc</p>
              </div>
            </div>

            {/* Bên thuê */}
            <div>
              <p className="font-bold underline">BÊN THUÊ ĐẤT (BÊN B):</p>
              <div className="ml-4 space-y-1 mt-1 text-xs sm:text-sm">
                <p>Ông/Bà: <b>{parcel.tenantName || '...................................................'}</b></p>
                <p>Số CCCD/CMND: <b>{parcel.tenantCccd || '..............................'}</b></p>
                <p>Điện thoại liên hệ: <b>{parcel.tenantPhone || '...........................'}</b></p>
                <p>Địa chỉ thường trú: {parcel.tenantAddress || 'Xã Lãnh Ngọc'}</p>
              </div>
            </div>

            <p>
              Hai bên cùng tự nguyện thỏa thuận ký kết Hợp đồng thuê đất nông nghiệp sử dụng vào mục đích công ích với các điều khoản sau đây:
            </p>

            {/* Điều 1 */}
            <div>
              <p className="font-bold">ĐIỀU 1: ĐẶC ĐIỂM THỬA ĐẤT CHO THUÊ</p>
              <div className="ml-4 space-y-1 mt-1 text-xs sm:text-sm">
                <p>1. Thửa đất số: <b>{parcel.parcel}</b>, Tờ bản đồ số: <b>{parcel.mapSheet}</b></p>
                <p>2. Địa danh / Xứ đồng: <b>{parcel.location}</b></p>
                <p>3. Diện tích cho thuê: <b>{parcel.area.toLocaleString()} m²</b></p>
                <p>4. Loại đất: <b>{parcel.landType}</b></p>
                <p>5. Mục đích sử dụng thuê: <b>{parcel.planningPurpose}</b></p>
              </div>
            </div>

            {/* Điều 2 */}
            <div>
              <p className="font-bold">ĐIỀU 2: THỜI HẠN THUÊ ĐẤT</p>
              <p className="ml-4 mt-1 text-xs sm:text-sm">
                Thời hạn thuê đất là <b>{parcel.leaseDurationYears || 5} năm</b>, kể từ ngày <b>{parcel.leaseStartDate || `${year}-01-01`}</b> đến hết ngày <b>{parcel.leaseEndDate || `${year + 5}-01-01`}</b> theo đúng quy định của Luật Đất đai.
              </p>
            </div>

            {/* Điều 3 */}
            <div>
              <p className="font-bold">ĐIỀU 3: GIÁ THUÊ VÀ PHƯƠNG THỨC THANH TOÁN</p>
              <div className="ml-4 space-y-1 mt-1 text-xs sm:text-sm">
                <p>1. Tiền thuê đất hàng năm là: <b>{parcel.annualRent.toLocaleString()} VNĐ/năm</b> (Bằng chữ: .....................................................................).</p>
                <p>2. Phương thức thanh toán: Bên B nộp tiền trực tiếp vào Ban Tài chính - Ngân sách UBND xã Lãnh Ngọc hàng năm theo quy định.</p>
              </div>
            </div>

            {/* Điều 4 */}
            <div>
              <p className="font-bold">ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA CÁC BÊN</p>
              <div className="ml-4 space-y-1 mt-1 text-xs sm:text-sm text-justify">
                <p>- Bên B chỉ được sử dụng đất đúng mục đích nông nghiệp đã thỏa thuận; không được tự ý chuyển mục đích sử dụng đất, không được xây dựng công trình kiên cố trái phép, không được chuyển nhượng, thế chấp hoặc cho thuê lại quyền sử dụng thửa đất này.</p>
                <p>- Bên B có trách nhiệm nộp tiền thuê đất đầy đủ, đúng hạn vào ngân sách xã; bảo vệ ranh giới mốc giới thửa đất không để xảy ra lấn chiếm.</p>
                <p>- Khi Nhà nước có quyết định thu hồi đất để phục vụ mục đích quốc phòng, an ninh, phát triển kinh tế - xã hội vì lợi ích quốc gia, công cộng thì Bên B phải chấp hành bàn giao lại đất theo quy định pháp luật.</p>
              </div>
            </div>

            {/* Ký tên theo Nghị định 30 */}
            <table className="sig-table w-full border-collapse border-none text-center pt-8 text-xs sm:text-sm" style={{ width: '100%', border: 'none', borderCollapse: 'collapse', marginTop: '20pt' }}>
              <tbody>
                <tr>
                  <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none' }}>
                    <div style={{ fontWeight: 'bold' }}>Đại diện Bên B</div>
                    <div style={{ fontStyle: 'italic', fontSize: '10pt' }}>(Ký, ghi rõ họ tên)</div>
                    <div className="h-20" style={{ height: '55pt' }}></div>
                    <div style={{ fontWeight: 'bold' }}>{parcel.tenantName || '...................................'}</div>
                  </td>
                  <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none' }}>
                    <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>TM. ỦY BAN NHÂN DÂN XÃ LÃNH NGỌC</div>
                    <div style={{ fontWeight: 'bold' }}>KT. CHỦ TỊCH / PHÓ CHỦ TỊCH</div>
                    <div style={{ fontStyle: 'italic', fontSize: '10pt' }}>(Ký tên, đóng dấu)</div>
                    <div className="h-20" style={{ height: '55pt' }}></div>
                    <div style={{ fontWeight: 'bold' }}>Thái Công Cần</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
