import React, { useState } from 'react';
import { X, Printer, Download, FileText, Check, Copy } from 'lucide-react';
import { DisputeCase } from '../../types';
import { PREVIEW_ACTIONS_LAYOUT, PREVIEW_ACTION_BUTTON_LAYOUT, PREVIEW_DOCUMENT_BODY_LAYOUT, PREVIEW_HEADER_LAYOUT, PREVIEW_TAB_BUTTON_LAYOUT, PREVIEW_TABS_LAYOUT } from '../common/previewModalStyles';
import { downloadWordDocumentND30 } from '../../utils/wordExportND30';

interface PrintDisputeDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispute: DisputeCase;
  docType?: 'verification_minute' | 'examination_report' | 'invitation' | 'mediation_minute' | 'field_evidence';
}

export const PrintDisputeDocModal: React.FC<PrintDisputeDocModalProps> = ({
  isOpen,
  onClose,
  dispute,
  docType: initialDocType = 'examination_report',
}) => {
  const [selectedDoc, setSelectedDoc] = useState<
    'verification_minute' | 'examination_report' | 'invitation' | 'mediation_minute' | 'field_evidence'
  >(initialDocType);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const el = document.getElementById('printable-dispute-document');
    if (el) {
      navigator.clipboard.writeText(el.innerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadWord = () => {
    const el = document.getElementById('printable-dispute-document');
    if (!el) return;
    const docName =
      selectedDoc === 'examination_report'
        ? `01_Bao_cao_tham_tra_tranh_chap`
        : selectedDoc === 'verification_minute'
        ? `02_Bien_ban_xac_minh_tranh_chap`
        : selectedDoc === 'invitation'
        ? `03_Giay_moi_hoa_giai`
        : selectedDoc === 'mediation_minute'
        ? `04_Bien_ban_hoa_giai_tranh_chap`
        : `05_Bien_ban_hien_truong`;

    downloadWordDocumentND30(
      el,
      `${docName}_${dispute.code}_${dispute.partyA.name}_${dispute.partyB.name}`,
      {
        title: `Văn bản giải quyết tranh chấp đất đai - Hồ sơ ${dispute.code}`,
        fontSizePt: 13,
      }
    );
  };

  const minute = dispute.verificationMinute;
  const report = dispute.examinationReport;
  const mediation = dispute.mediationRecord;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-gray-200 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-800">
        {/* Header */}
        <div className={`${PREVIEW_HEADER_LAYOUT} border-b border-gray-200 bg-gray-50`}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                In & Xuất văn bản hành chính
                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {dispute.code}
                </span>
              </h2>
              <p className="text-xs text-slate-500">Thể thức văn bản chuẩn Nghị định 30/2020/NĐ-CP & Luật Đất đai 2024</p>
            </div>
          </div>

          <div className={`${PREVIEW_ACTIONS_LAYOUT} flex-wrap`}>
            <button
              onClick={handleCopyText}
              className={`${PREVIEW_ACTION_BUTTON_LAYOUT} rounded-lg font-medium bg-white hover:bg-gray-100 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer border border-gray-300`}
              title="Sao chép văn bản"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
            </button>

            <button
              onClick={handleDownloadWord}
              className={`${PREVIEW_ACTION_BUTTON_LAYOUT} rounded-lg font-medium bg-blue-700 hover:bg-blue-800 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs`}
              title="Tải tệp Microsoft Word .doc"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file Word</span>
            </button>

            <button
              onClick={handlePrint}
              className={`${PREVIEW_ACTION_BUTTON_LAYOUT} rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs`}
              title="In trực tiếp hoặc Lưu file PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In / Xuất PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-gray-200 cursor-pointer transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Doc Switcher Tabs */}
        <div className={`px-3 py-1.5 bg-white border-b border-gray-200 ${PREVIEW_TABS_LAYOUT}`}>
          <button
            onClick={() => setSelectedDoc('examination_report')}
            className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-semibold transition-colors cursor-pointer ${
              selectedDoc === 'examination_report'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
            }`}
          >
            1. Báo cáo thẩm tra kết quả xác minh
          </button>
          <button
            onClick={() => setSelectedDoc('verification_minute')}
            className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-semibold transition-colors cursor-pointer ${
              selectedDoc === 'verification_minute'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
            }`}
          >
            2. Biên bản xác minh hiện trường
          </button>
          <button
            onClick={() => setSelectedDoc('invitation')}
            className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-semibold transition-colors cursor-pointer ${
              selectedDoc === 'invitation'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
            }`}
          >
            3. Giấy mời họp Hội đồng hòa giải
          </button>
          <button
            onClick={() => setSelectedDoc('mediation_minute')}
            className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-semibold transition-colors cursor-pointer ${
              selectedDoc === 'mediation_minute'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
            }`}
          >
            4. Biên bản hòa giải tranh chấp đất đai
          </button>
          <button
            onClick={() => setSelectedDoc('field_evidence')}
            className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-semibold transition-colors cursor-pointer ${
              selectedDoc === 'field_evidence'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
            }`}
          >
            5. Phụ lục Album ảnh & Chứng cứ hiện trường ({(dispute.fieldEvidences || []).length})
          </button>
        </div>

        {/* Document Body (Printable Paper View) */}
        <div className={`${PREVIEW_DOCUMENT_BODY_LAYOUT} bg-slate-100 border-t border-gray-200 flex justify-center`}>
          <div
            id="printable-dispute-document"
            className="w-full min-w-[210mm] max-w-[210mm] min-h-[297mm] bg-white text-black p-8 sm:p-12 shadow-2xl rounded-sm font-serif text-[13.5pt] leading-relaxed select-text"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            {/* 1. BÁO CÁO THẨM TRA KẾT QUẢ XÁC MINH */}
            {selectedDoc === 'examination_report' && (
              <div>
                {/* Header National emblem */}
                <div className="grid grid-cols-2 gap-4 pb-4">
                  <div className="text-center">
                    <p className="font-bold text-[12pt] uppercase tracking-tight">ỦY BAN NHÂN DÂN XÃ LÃNH NGỌC</p>
                    <p className="font-bold text-[11.5pt] uppercase underline">TỔ XÁC MINH TRANH CHẤP ĐẤT ĐAI</p>
                    <p className="text-[12pt] mt-1">Số: {report?.reportNumber || '.../BC-TKT'}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-[12pt] uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p className="font-bold text-[12pt] underline">Độc lập - Tự do - Hạnh phúc</p>
                    <p className="italic text-[11.5pt] mt-1">
                      Lãnh Ngọc, ngày {report?.date ? report.date.split('-')[2] : '...'} tháng{' '}
                      {report?.date ? report.date.split('-')[1] : '...'} năm {report?.date ? report.date.split('-')[0] : '2026'}
                    </p>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center py-4 my-2">
                  <h1 className="font-bold text-[15pt] uppercase">BÁO CÁO THẨM TRA</h1>
                  <h2 className="font-bold text-[13.5pt] uppercase">
                    Kết quả xác minh nguồn gốc và hiện trạng thửa đất tranh chấp
                  </h2>
                  <p className="italic text-[12pt] mt-1 font-normal">
                    (V/v tranh chấp đất đai giữa hộ ông/bà {dispute.partyA.name} và hộ ông/bà {dispute.partyB.name})
                  </p>
                </div>

                {/* Recipient */}
                <div className="text-center mb-5 font-semibold text-[13pt]">
                  <p>Kính gửi: {report?.recipient || 'Chủ tịch Ủy ban nhân dân xã Lãnh Ngọc'}</p>
                  <p className="text-[12pt] italic font-normal">Đồng kính gửi: Hội đồng hòa giải tranh chấp đất đai xã Lãnh Ngọc</p>
                </div>

                {/* Report Content */}
                <div className="space-y-4 text-justify">
                  <div>
                    <h3 className="font-bold text-[13.5pt]">I. TÓM TẮT NỘI DUNG VỤ VIỆC VÀ QUÁ TRÌNH THỤ LÝ:</h3>
                    <p className="mt-1 indent-8 text-[13pt] leading-normal">
                      {report?.disputeSummary ||
                        `Ngày ${dispute.receivedDate}, UBND xã tiếp nhận đơn đề nghị giải quyết tranh chấp đất đai của ông/bà ${dispute.partyA.name} đối với ông/bà ${dispute.partyB.name}. Thửa đất tranh chấp số ${dispute.parcel}, tờ bản đồ số ${dispute.mapSheet}, địa chỉ tại ${dispute.location}, diện tích tranh chấp ước tính ${dispute.disputedArea} m².`}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-[13.5pt]">II. KẾT QUẢ THẨM TRA HỒ SƠ ĐỊA CHÍNH VÀ NGUỒN GỐC ĐẤT:</h3>
                    <p className="mt-1 indent-8 text-[13pt] leading-normal whitespace-pre-line">
                      {report?.historicalOriginSummary || minute?.historicalOrigin || 'Chưa cập nhật nội dung thẩm tra hồ sơ địa chính.'}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-[13.5pt]">III. KẾT QUẢ XÁC MINH HIỆN TRẠNG THỰC TẾ TẠI THỰC ĐỊA:</h3>
                    <div className="mt-1 text-[13pt] leading-normal whitespace-pre-line">
                      {report?.fieldVerificationSummary || minute?.actualCheckFindings || 'Chưa cập nhật kết quả kiểm tra thực địa.'}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-[13.5pt]">IV. ĐÁNH GIÁ VÀ NHẬN XÉT PHÁP LÝ (Căn cứ Luật Đất đai 2024):</h3>
                    <p className="mt-1 indent-8 text-[13pt] leading-normal whitespace-pre-line">
                      {report?.legalEvaluation ||
                        `Căn cứ quy định tại Điều 136, 137, 235 và 236 Luật Đất đai 2024 về quyền sử dụng đất hợp pháp và thủ tục hòa giải bắt buộc tại UBND cấp xã: Nội dung phản ánh tranh chấp ranh giới giữa hai bên là có cơ sở căn cứ hồ sơ và thực địa đo đạc.`}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-[13.5pt]">V. ĐỀ XUẤT PHƯƠNG ÁN HÒA GIẢI VÀ HƯỚNG XỬ LÝ:</h3>
                    <p className="mt-1 indent-8 text-[13pt] leading-normal whitespace-pre-line">
                      {report?.settlementProposal ||
                        `Tổ công tác kiến nghị Chủ tịch UBND xã tổ chức phiên họp Hội đồng hòa giải tranh chấp đất đai theo quy định; vận động hai bên tự thỏa thuận ranh giới hoặc đền bù chênh lệch để bảo đảm tình làng nghĩa xóm.`}
                    </p>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-4 mt-8 pt-4">
                  <div className="text-left text-[11.5pt]">
                    <p className="font-bold underline">Nơi nhận:</p>
                    <p>- Như trên;</p>
                    <p>- Lưu: VP, Địa chính, HS-TC.</p>
                  </div>
                  <div className="text-center text-[13pt]">
                    <p className="font-bold">Người lập báo cáo</p>
                    <p className="italic text-[11.5pt]">(Ký, ghi rõ họ tên)</p>
                    <div className="h-20"></div>
                    <p className="font-bold">{report?.reporterName || dispute.handlerName || 'Đoàn Văn Hoài Vũ'}</p>
                  </div>
                </div>

                {/* Leader Approval box */}
                <div className="mt-6 border-t border-dashed border-gray-400 pt-4">
                  <div className="text-center text-[13pt]">
                    <p className="font-bold">Ý kiến phê duyệt của Lãnh đạo UBND xã</p>
                    <p className="italic text-[11.5pt] text-gray-700">
                      {report?.leaderComments || 'Đồng ý với đề xuất của Tổ xác minh. Giao chuẩn bị phiên hòa giải đúng luật.'}
                    </p>
                    <div className="h-14"></div>
                    <p className="font-bold">{dispute.assignedLeaderName || 'Thái Công Cần - Phó Chủ tịch UBND xã'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. BIÊN BẢN XÁC MINH HIỆN TRƯỜNG */}
            {selectedDoc === 'verification_minute' && (
              <div>
                <div className="grid grid-cols-2 gap-4 pb-4">
                  <div className="text-center">
                    <p className="font-bold text-[12pt] uppercase tracking-tight">ỦY BAN NHÂN DÂN XÃ LÃNH NGỌC</p>
                    <p className="font-bold text-[11.5pt] uppercase underline">TỔ CÔNG TÁC XÁC MINH</p>
                    <p className="text-[12pt] mt-1">Số: {minute?.minuteNumber || '.../BB-XM'}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-[12pt] uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p className="font-bold text-[12pt] underline">Độc lập - Tự do - Hạnh phúc</p>
                    <p className="italic text-[11.5pt] mt-1">Lãnh Ngọc, ngày ... tháng ... năm 2026</p>
                  </div>
                </div>

                <div className="text-center py-4 my-2">
                  <h1 className="font-bold text-[15pt] uppercase">BIÊN BẢN XÁC MINH HIỆN TRẠNG</h1>
                  <h2 className="font-bold text-[13.5pt] uppercase">VÀ NGUỒN GỐC THỬA ĐẤT TRANH CHẤP</h2>
                </div>

                <div className="space-y-4 text-justify text-[13pt]">
                  <p>
                    Hôm nay, vào hồi {minute?.date ? minute.date.replace('T', ' giờ ') : '... giờ ...'}, tại thực địa thửa đất số {dispute.parcel}, tờ bản đồ số {dispute.mapSheet}, thuộc {dispute.location}.
                  </p>

                  <div>
                    <p className="font-bold">I. THÀNH PHẦN THAM GIA XÁC MINH:</p>
                    <p className="font-semibold mt-1">1. Đại diện Tổ công tác UBND xã Lãnh Ngọc:</p>
                    <ul className="list-disc pl-8 space-y-1">
                      {minute?.delegation && minute.delegation.length > 0 ? (
                        minute.delegation.map((d, i) => (
                          <li key={i}>
                            Ông/Bà: <span className="font-semibold">{d.name}</span> - Chức vụ: {d.position} ({d.present ? 'Có mặt' : 'Vắng mặt'})
                          </li>
                        ))
                      ) : (
                        <>
                          <li>Ông: Võ Tấn Lạt - Phó Chủ tịch UBND xã (Trưởng đoàn)</li>
                          <li>Ông: Đoàn Văn Hoài Vũ - Công chức Địa chính - Xây dựng (Thư ký)</li>
                          <li>Ông: Trần Đình Trọng - Công chức Tư pháp - Hộ tịch</li>
                        </>
                      )}
                    </ul>

                    <p className="font-semibold mt-2">2. Đại diện các bên tranh chấp:</p>
                    <p className="indent-4">- Bên A (Người yêu cầu): Ông/Bà <span className="font-semibold">{dispute.partyA.name}</span> (CCCD: {dispute.partyA.cccd || '...'}) - Trú tại: {dispute.partyA.address}.</p>
                    <p className="indent-4">- Bên B (Người bị khiếu nại): Ông/Bà <span className="font-semibold">{dispute.partyB.name}</span> (CCCD: {dispute.partyB.cccd || '...'}) - Trú tại: {dispute.partyB.address}.</p>

                    <p className="font-semibold mt-2">3. Người làm chứng, đại diện thôn và các hộ tứ cận liền kề:</p>
                    <ul className="list-disc pl-8 space-y-1">
                      {dispute.relatedParties && dispute.relatedParties.length > 0 ? (
                        dispute.relatedParties.map((r, i) => (
                          <li key={i}>Ông/Bà: <span className="font-semibold">{r.name}</span> - {r.role}</li>
                        ))
                      ) : (
                        <li>Trưởng thôn và các chủ hộ liền kề tham gia đầy đủ.</li>
                      )}
                    </ul>
                  </div>

                  <div>
                    <p className="font-bold">II. KẾT QUẢ KIỂM TRA ĐO ĐẠC HIỆN TRẠNG THỰC TẾ:</p>
                    <div className="indent-4 leading-normal whitespace-pre-line">
                      {minute?.actualCheckFindings || 'Đã tiến hành đo đạc 4 cạnh ranh giới và xác định mốc giới cụ thể.'}
                    </div>
                    {minute?.measuredDimensions && (
                      <div className="mt-2 pl-4 border-l-2 border-gray-400 space-y-1 text-[12.5pt]">
                        <p>• Phía Đông: {minute.measuredDimensions.east}</p>
                        <p>• Phía Tây: {minute.measuredDimensions.west}</p>
                        <p>• Phía Nam: {minute.measuredDimensions.south}</p>
                        <p>• Phía Bắc: {minute.measuredDimensions.north}</p>
                        <p className="font-bold">• Diện tích đo đạc lấn chiếm / tranh chấp thực tế: {minute.measuredDimensions.disputedArea || dispute.disputedArea} m².</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="font-bold">III. Ý KIẾN CỦA CÁC BÊN THAM GIA:</p>
                    <p><span className="font-semibold">1. Ý kiến của Bên A ({dispute.partyA.name}):</span> {minute?.partyAOpinion || dispute.partyA.claim}</p>
                    <p className="mt-1"><span className="font-semibold">2. Ý kiến của Bên B ({dispute.partyB.name}):</span> {minute?.partyBOpinion || dispute.partyB.claim}</p>
                    <p className="mt-1"><span className="font-semibold">3. Ý kiến của các hộ liền kề và người làm chứng:</span> {minute?.witnessOpinions || 'Xác nhận ranh giới cũ trước khi phát sinh tranh chấp.'}</p>
                  </div>

                  <div>
                    <p className="font-bold">IV. KẾT LUẬN SƠ BỘ CỦA ĐOÀN XÁC MINH:</p>
                    <p className="indent-4 leading-normal">{minute?.conclusion || 'Tổ công tác sẽ hoàn thiện báo cáo thẩm tra trình Chủ tịch UBND xã xem xét tổ chức phiên hòa giải.'}</p>
                  </div>

                  <p className="italic text-[12pt]">Biên bản được lập xong lúc ... giờ cùng ngày, đã đọc lại cho các thành phần tham gia nghe và thống nhất ký tên dưới đây.</p>
                </div>

                {/* Signatures table */}
                <div className="grid grid-cols-4 gap-2 mt-8 pt-4 text-center text-[11pt]">
                  <div>
                    <p className="font-bold uppercase">BÊN YÊU CẦU</p>
                    <p className="italic">(Ký, ghi rõ họ tên)</p>
                    <div className="h-16"></div>
                    <p className="font-bold">{dispute.partyA.name}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase">BÊN BỊ TRANH CHẤP</p>
                    <p className="italic">(Ký, ghi rõ họ tên)</p>
                    <div className="h-16"></div>
                    <p className="font-bold">{dispute.partyB.name}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase">ĐẠI DIỆN THÔN/XÓM</p>
                    <p className="italic">(Ký, ghi rõ họ tên)</p>
                    <div className="h-16"></div>
                    <p className="font-bold">Trưởng thôn</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase">TỔ TRƯỞNG TỔ XM</p>
                    <p className="italic">(Ký, ghi rõ họ tên)</p>
                    <div className="h-16"></div>
                    <p className="font-bold">{minute?.presidedBy || dispute.handlerName || 'Đoàn Văn Hoài Vũ'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 3. GIẤY MỜI HÒA GIẢI */}
            {selectedDoc === 'invitation' && (
              <div>
                <div className="grid grid-cols-2 gap-4 pb-4">
                  <div className="text-center">
                    <p className="font-bold text-[12pt] uppercase tracking-tight">ỦY BAN NHÂN DÂN XÃ LÃNH NGỌC</p>
                    <p className="text-[12pt] mt-1">Số: {mediation?.invitationNumber || '.../GM-UBND'}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-[12pt] uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p className="font-bold text-[12pt] underline">Độc lập - Tự do - Hạnh phúc</p>
                    <p className="italic text-[11.5pt] mt-1">Lãnh Ngọc, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
                  </div>
                </div>

                <div className="text-center py-6">
                  <h1 className="font-bold text-[16pt] uppercase">GIẤY MỜI</h1>
                  <p className="font-bold text-[13.5pt] mt-1">
                    Tham dự phiên họp hòa giải tranh chấp quyền sử dụng đất
                  </p>
                </div>

                <div className="space-y-4 text-[13pt] text-justify leading-relaxed">
                  <p className="indent-8">
                    Ủy ban nhân dân xã Lãnh Ngọc trân trọng kính mời:
                  </p>
                  <p className="font-semibold text-center text-[14pt]">
                    Ông/Bà: {dispute.partyA.name} & Ông/Bà: {dispute.partyB.name}
                  </p>
                  <p className="text-center italic text-[12.5pt]">
                    (Cùng các thành viên Hội đồng hòa giải và các cá nhân có quyền lợi, nghĩa vụ liên quan)
                  </p>

                  <div className="space-y-2 mt-4">
                    <p>
                      <span className="font-bold">Đến tham dự phiên họp:</span> Hòa giải giải quyết đơn tranh chấp quyền sử dụng đất tại Thửa đất số {dispute.parcel}, tờ bản đồ số {dispute.mapSheet}, thuộc {dispute.location}.
                    </p>
                    <p>
                      <span className="font-bold">Thời gian:</span> {mediation?.meetingDate ? mediation.meetingDate.replace('T', ' hồi ') : '08 giờ 30 phút, ngày .../.../2026'}.
                    </p>
                    <p>
                      <span className="font-bold">Địa điểm:</span> {mediation?.meetingLocation || 'Phòng họp số 2 - Trụ sở Ủy ban nhân dân xã Lãnh Ngọc'}.
                    </p>
                    <p>
                      <span className="font-bold">Chủ trì phiên họp:</span> {mediation?.councilChairman || dispute.assignedLeaderName || 'Chủ tịch / Phó Chủ tịch UBND xã Lãnh Ngọc'}.
                    </p>
                  </div>

                  <p className="indent-8 mt-4">
                    Yêu cầu các bên khi đi mang theo Giấy chứng minh nhân dân/Căn cước công dân và toàn bộ hồ sơ, giấy tờ gốc liên quan đến quyền sử dụng thửa đất (Giấy chứng nhận QSDĐ, sơ đồ trích đo, giấy tờ chuyển nhượng, biên lai đóng thuế...) để Hội đồng đối chiếu, xem xét.
                  </p>
                  <p className="italic text-[12pt] mt-1">
                    Trường hợp đương sự không thể trực tiếp tham dự phải có Giấy ủy quyền hợp pháp theo quy định của pháp luật.
                  </p>
                </div>

                <table className="sig-table w-full border-collapse border-none mt-12 pt-4">
                  <tbody>
                    <tr>
                      <td className="noi-nhan w-[45%] text-left align-top border-none p-0" align="left" style={{ width: '45%', textAlign: 'left', verticalAlign: 'top', border: 'none', padding: 0, paddingLeft: 0, marginLeft: 0 }}>
                        <p className="font-bold italic text-[11pt]" align="left" style={{ textAlign: 'left', fontWeight: 'bold' }}>Nơi nhận:</p>
                        <p className="text-[11pt]" align="left" style={{ textAlign: 'left' }}>- Như trên;</p>
                        <p className="text-[11pt]" align="left" style={{ textAlign: 'left' }}>- Thành viên Hội đồng HG;</p>
                        <p className="text-[11pt]" align="left" style={{ textAlign: 'left' }}>- Trưởng thôn: {dispute.location};</p>
                        <p className="text-[11pt]" align="left" style={{ textAlign: 'left' }}>- Lưu: VP, Tư pháp, Địa chính.</p>
                      </td>
                      <td className="w-[55%] text-center align-top border-none p-0 text-[13pt]" align="center" style={{ width: '55%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                        <p className="font-bold uppercase">TM. ỦY BAN NHÂN DÂN XÃ</p>
                        <p className="font-bold uppercase text-[12pt]">KT. CHỦ TỊCH</p>
                        <p className="font-bold text-[12pt]">PHÓ CHỦ TỊCH</p>
                        <div className="h-20"></div>
                        <p className="font-bold">{dispute.assignedLeaderName || 'Thái Công Cần'}</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. BIÊN BẢN HÒA GIẢI TRANH CHẤP ĐẤT ĐAI */}
            {selectedDoc === 'mediation_minute' && (
              <div>
                <div className="grid grid-cols-2 gap-4 pb-4">
                  <div className="text-center">
                    <p className="font-bold text-[12pt] uppercase tracking-tight">HỘI ĐỒNG HÒA GIẢI TRANH CHẤP ĐẤT ĐAI</p>
                    <p className="font-bold text-[11.5pt] uppercase underline">UBND XÃ LÃNH NGỌC</p>
                    <p className="text-[12pt] mt-1">Số: {mediation?.minuteNumber || '.../BB-HGHĐ'}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-[12pt] uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p className="font-bold text-[12pt] underline">Độc lập - Tự do - Hạnh phúc</p>
                    <p className="italic text-[11.5pt] mt-1">Lãnh Ngọc, ngày ... tháng ... năm 2026</p>
                  </div>
                </div>

                <div className="text-center py-4 my-2">
                  <h1 className="font-bold text-[15pt] uppercase">BIÊN BẢN HÒA GIẢI TRANH CHẤP ĐẤT ĐAI</h1>
                  <p className="italic text-[12pt] mt-1">
                    (Căn cứ Điều 235, Điều 236 Luật Đất đai năm 2024)
                  </p>
                </div>

                <div className="space-y-4 text-justify text-[13pt] leading-relaxed">
                  <p>
                    Hôm nay, vào hồi {mediation?.meetingDate ? mediation.meetingDate.replace('T', ' giờ ') : '... giờ ...'}, tại {mediation?.meetingLocation || 'Hội trường UBND xã Lãnh Ngọc'}.
                  </p>
                  <p>Hội đồng hòa giải tranh chấp đất đai xã Lãnh Ngọc tiến hành phiên hòa giải tranh chấp quyền sử dụng đất giữa hộ ông/bà {dispute.partyA.name} và hộ ông/bà {dispute.partyB.name}.</p>

                  <div>
                    <p className="font-bold">I. THÀNH PHẦN HỘI ĐỒNG HÒA GIẢI:</p>
                    <p>- Chủ tịch Hội đồng: <span className="font-semibold">{mediation?.councilChairman || dispute.assignedLeaderName || 'Võ Tấn Lạt - Phó Chủ tịch UBND xã'}</span></p>
                    <p>- Thành viên: Công chức Địa chính - Xây dựng, Công chức Tư pháp - Hộ tịch, Đại diện Ủy ban MTTQ xã, Hội Nông dân xã, Trưởng thôn.</p>
                  </div>

                  <div>
                    <p className="font-bold">II. CÁC BÊN TRANH CHẤP THAM DỰ:</p>
                    <p>- Bên A: <span className="font-semibold">{dispute.partyA.name}</span> (Có mặt)</p>
                    <p>- Bên B: <span className="font-semibold">{dispute.partyB.name}</span> (Có mặt)</p>
                  </div>

                  <div>
                    <p className="font-bold">III. DIỄN BIẾN PHIÊN HÒA GIẢI:</p>
                    <p className="indent-4">1. Đồng chí Thư ký công bố Báo cáo thẩm tra kết quả xác minh số {report?.reportNumber || '12/BC-TKT'}.</p>
                    <p className="indent-4">2. Ý kiến bổ sung của Bên A: {dispute.partyA.claim}</p>
                    <p className="indent-4">3. Ý kiến bổ sung của Bên B: {dispute.partyB.claim}</p>
                    <p className="indent-4">4. Ý kiến tham gia hòa giải của các thành viên Hội đồng.</p>
                  </div>

                  <div className="p-3 bg-gray-50 border border-gray-300 rounded-sm">
                    <p className="font-bold text-[13.5pt]">IV. KẾT QUẢ PHIÊN HÒA GIẢI:</p>
                    <p className="mt-1 font-semibold text-blue-900">
                      Kết luận: {mediation?.result === 'success' ? 'HÒA GIẢI THÀNH' : mediation?.result === 'failure' ? 'HÒA GIẢI KHÔNG THÀNH' : 'ĐANG TIẾN HÀNH HÒA GIẢI'}
                    </p>
                    <p className="mt-1 indent-4">
                      {mediation?.agreementDetails || mediation?.failureReasons || 'Nội dung thỏa thuận của hai bên hoặc lý do bất đồng mâu thuẫn.'}
                    </p>
                    {mediation?.postMediationGuidance && (
                      <p className="mt-2 indent-4 italic text-[12pt]">
                        Hướng dẫn tiếp theo: {mediation.postMediationGuidance}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-8 pt-4 text-center text-[11pt]">
                  <div>
                    <p className="font-bold uppercase">BÊN YÊU CẦU (BÊN A)</p>
                    <p className="italic">(Ký, ghi rõ họ tên)</p>
                    <div className="h-16"></div>
                    <p className="font-bold">{dispute.partyA.name}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase">BÊN BỊ TRANH CHẤP (BÊN B)</p>
                    <p className="italic">(Ký, ghi rõ họ tên)</p>
                    <div className="h-16"></div>
                    <p className="font-bold">{dispute.partyB.name}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase">CHỦ TỊCH HỘI ĐỒNG</p>
                    <p className="italic">(Ký, đóng dấu)</p>
                    <div className="h-16"></div>
                    <p className="font-bold">{mediation?.councilChairman || dispute.assignedLeaderName || 'Thái Công Cần'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. PHỤ LỤC: ALBUM ẢNH & TƯ LIỆU HIỆN TRƯỜNG */}
            {selectedDoc === 'field_evidence' && (
              <div>
                {/* Header */}
                <div className="flex justify-between items-start text-center mb-6">
                  <div className="w-1/2">
                    <p className="font-bold text-[12pt] uppercase">UBND XÃ LÃNH NGỌC</p>
                    <p className="font-bold text-[12pt] uppercase">TỔ CÔNG TÁC XÁC MINH TRANH CHẤP</p>
                    <div className="w-24 h-0.5 bg-black mx-auto mt-1 mb-1"></div>
                    <p className="text-[11pt] italic">Hồ sơ số: {dispute.code}</p>
                  </div>
                  <div className="w-1/2">
                    <p className="font-bold text-[12pt] uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p className="font-bold text-[12.5pt]">Độc lập - Tự do - Hạnh phúc</p>
                    <div className="w-32 h-0.5 bg-black mx-auto mt-1 mb-1"></div>
                    <p className="text-[11pt] italic">Lãnh Ngọc, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
                  </div>
                </div>

                <div className="text-center mb-6">
                  <h1 className="font-bold text-[15pt] uppercase">PHỤ LỤC HÌNH ẢNH HIỆN TRẠNG & TƯ LIỆU THỰC ĐỊA</h1>
                  <p className="italic text-[11pt] mt-1">
                    (Đính kèm Báo cáo thẩm tra kết quả xác minh vụ tranh chấp đất đai mã số: {dispute.code})
                  </p>
                </div>

                <div className="border border-gray-300 p-3 mb-6 bg-gray-50/50 rounded text-[11pt]">
                  <p>
                    <strong>Thửa đất tranh chấp:</strong> Thửa số <strong>{dispute.parcel}</strong>, Tờ bản đồ số <strong>{dispute.mapSheet}</strong>, tại: {dispute.location}.
                  </p>
                  <p className="mt-1">
                    <strong>Bên yêu cầu (Bên A):</strong> {dispute.partyA.name} - Đ/c: {dispute.partyA.address}.
                  </p>
                  <p className="mt-1">
                    <strong>Bên bị tranh chấp (Bên B):</strong> {dispute.partyB.name} - Đ/c: {dispute.partyB.address}.
                  </p>
                  <p className="mt-1">
                    <strong>Tổng số tư liệu thu thập:</strong> {(dispute.fieldEvidences || []).length} tư liệu (gồm ảnh chụp mốc ranh giới, biên bản hiện trường và sơ đồ trích đo thực tế).
                  </p>
                </div>

                {/* Evidence Photo Grid */}
                {!(dispute.fieldEvidences && dispute.fieldEvidences.length > 0) ? (
                  <div className="p-8 text-center text-gray-500 italic border border-dashed border-gray-300 rounded">
                    Chưa có ảnh chụp hiện trường hoặc biên bản thực địa nào được tải lên trong mục Dữ liệu thu thập.
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      {dispute.fieldEvidences.map((item, idx) => {
                        const isImg = item.contentType.startsWith('image/');
                        return (
                          <div key={item.id} className="border border-gray-400 p-2 rounded bg-white flex flex-col justify-between break-inside-avoid">
                            {isImg ? (
                              <div className="h-48 w-full bg-gray-100 flex items-center justify-center overflow-hidden mb-2 border border-gray-200">
                                <img
                                  src={item.url}
                                  alt={item.caption || item.name}
                                  className="max-h-full max-w-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="h-48 w-full bg-gray-50 flex flex-col items-center justify-center p-4 text-center mb-2 border border-gray-200">
                                <p className="font-bold text-sm text-blue-800">📄 {item.name}</p>
                                <p className="text-xs text-gray-500 mt-1">[Tài liệu / Biên bản scan đính kèm hồ sơ]</p>
                              </div>
                            )}

                            <div className="text-[10pt] leading-tight">
                              <p className="font-bold">
                                Ảnh số {idx + 1}: <span className="font-normal">{item.caption || item.name}</span>
                              </p>
                              {item.locationNote && (
                                <p className="text-gray-700 italic mt-0.5">
                                  Vị trí: {item.locationNote}
                                </p>
                              )}
                              <p className="text-gray-500 text-[9pt] mt-0.5">
                                Ngày ghi nhận: {item.capturedDate || item.uploadedAt?.slice(0, 10)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-2 mt-10 pt-4 text-center text-[11pt] break-inside-avoid">
                  <div>
                    <p className="font-bold uppercase">CÁN BỘ ĐO ĐẠC XÁC MINH</p>
                    <p className="italic">(Ký, ghi rõ họ tên)</p>
                    <div className="h-16"></div>
                    <p className="font-bold">{dispute.handlerName}</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase">ĐẠI DIỆN HỘ TỨ CẬN / NHÂN CHỨNG</p>
                    <p className="italic">(Ký, ghi rõ họ tên)</p>
                    <div className="h-16"></div>
                    <p className="font-bold">Trưởng thôn & Các hộ giáp ranh</p>
                  </div>
                  <div>
                    <p className="font-bold uppercase">TRƯỞNG ĐOÀN XÁC MINH</p>
                    <p className="italic">(Ký, xác nhận)</p>
                    <div className="h-16"></div>
                    <p className="font-bold">{dispute.assignedLeaderName || 'Võ Tấn Lạt - PCT UBND xã'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Văn bản được lưu trữ đồng bộ trong Hồ sơ vụ việc {dispute.code}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium cursor-pointer transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
