import * as XLSX from 'xlsx';
import { downloadWordDocumentND30 } from './wordExportND30';

export function exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    // Fallback to CSV
    exportToCSV(data, filename);
  }
}

export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) return;
  const keys = Object.keys(data[0]);
  const csvRows: string[] = [];

  // Header row
  csvRows.push(keys.map((k) => `"${k}"`).join(','));

  // Data rows
  data.forEach((row) => {
    const values = keys.map((k) => {
      let val = row[k] === null || row[k] === undefined ? '' : String(row[k]);
      // Prevent CSV Formula Injection (OWASP mitigation)
      if (/^[=+\-@\t\r]/.test(val)) {
        val = `'${val}`;
      }
      return `"${val.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  });

  const csvContent = '\uFEFF' + csvRows.join('\n'); // Add UTF-8 BOM
  if (typeof document !== 'undefined') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  return csvContent;
}

/**
 * Safely escape HTML characters to prevent XSS and tag injection
 * Preserves 100% of Vietnamese characters and diacritics
 */
export function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function exportDossierListToWord(
  dossiers: any[],
  filename: string = 'Danh_sach_ho_so_dat_dai',
  title: string = 'BÁO CÁO THỐNG KÊ DANH SÁCH HỒ SƠ ĐẤT ĐAI'
) {
  if (!dossiers || dossiers.length === 0) return;

  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  const statusLabels: Record<string, string> = {
    in_progress: 'Đang thụ lý',
    supplement: 'Chờ bổ sung (Mẫu 02)',
    paused: 'Tạm dừng',
    resolved: 'Đã hoàn thành',
    overdue: 'Quá hạn',
    rejected: 'Từ chối / Trả lại',
  };

  const tableRows = dossiers
    .map((d, idx) => {
      const statusText = statusLabels[d.status] || d.status || 'Đang thụ lý';
      const binder = [d.storageFolder || 'Kẹp 1', d.storageIndex ? `STT ${d.storageIndex}` : '']
        .filter(Boolean)
        .join(' - ');
      return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-weight: bold; font-family: 'Courier New', monospace;">${escapeHtml(d.code)}</td>
          <td style="font-weight: bold;">${escapeHtml(d.owner)}</td>
          <td style="text-align: center;">Thửa ${escapeHtml(d.parcel || '-')}/TBĐ ${escapeHtml(d.mapSheet || '-')}</td>
          <td>${escapeHtml(d.procedure)}</td>
          <td style="text-align: center;">${escapeHtml(d.receivedDate)}</td>
          <td style="text-align: center; font-weight: bold;">${escapeHtml(d.dueDate)}</td>
          <td>${escapeHtml(d.handlerName)}</td>
          <td style="text-align: center;">${escapeHtml(statusText)}</td>
          <td style="text-align: center;">${escapeHtml(binder)}</td>
        </tr>
      `;
    })
    .join('');

  const contentHtml = `
    <!-- HEADER BLOCK TCVN NGHỊ ĐỊNH 30/2020/NĐ-CP -->
    <table class="header-table" style="width: 100%; border: none; border-collapse: collapse; margin-bottom: 12pt;">
      <tr>
        <td style="width: 45%; text-align: center; vertical-align: top; border: none; padding: 0;">
          <span style="font-size: 11pt; font-weight: bold;">UBND THÀNH PHỐ ĐÀ NẴNG</span><br>
          <span style="font-size: 11pt; font-weight: bold; text-decoration: underline;">BỘ PHẬN TIẾP NHẬN & TRẢ KẾT QUẢ</span><br>
          <span style="font-size: 10pt; font-style: italic;">Số: ......./BC-ĐKĐĐ</span>
        </td>
        <td style="width: 55%; text-align: center; vertical-align: top; border: none; padding: 0;">
          <span style="font-size: 11pt; font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</span><br>
          <span style="font-size: 11pt; font-weight: bold; text-decoration: underline;">Độc lập - Tự do - Hạnh phúc</span><br>
          <span style="font-size: 10.5pt; font-style: italic;">Đà Nẵng, ngày ${day} tháng ${month} năm ${year}</span>
        </td>
      </tr>
    </table>

    <!-- TITLE -->
    <div style="text-align: center; margin: 15pt 0 10pt 0;">
      <h2 style="font-size: 14pt; margin: 0; text-transform: uppercase;">${escapeHtml(title)}</h2>
      <p style="font-size: 10.5pt; font-style: italic; margin: 4pt 0 0 0;">(Tổng số: ${dossiers.length} hồ sơ theo dõi trên hệ thống điều hành)</p>
    </div>

    <!-- DATA TABLE -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 4%;">STT</th>
          <th style="width: 14%;">Mã hồ sơ</th>
          <th style="width: 16%;">Chủ sử dụng / Người nộp</th>
          <th style="width: 11%;">Thửa / Tờ</th>
          <th style="width: 15%;">Thủ tục hành chính</th>
          <th style="width: 8%;">Ngày nhận</th>
          <th style="width: 8%;">Hạn trả</th>
          <th style="width: 11%;">Cán bộ thụ lý</th>
          <th style="width: 9%;">Trạng thái</th>
          <th style="width: 9%;">Kẹp lưu trữ</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>

    <!-- SIGNATURE BLOCK -->
    <table class="sig-table" border="0" cellpadding="0" cellspacing="0" style="width: 100%; border: none; border-collapse: collapse; margin-top: 18pt;">
      <tr>
        <td style="width: 50%; text-align: center; vertical-align: top; border: none;">
          <div style="font-size: 11pt; font-weight: bold;">Người lập báo cáo</div>
          <div style="font-size: 9.5pt; font-style: italic;">(Ký, ghi rõ họ tên)</div>
          <p style="margin: 0; padding: 0; height: 45pt; line-height: 45pt;">&nbsp;</p>
          <div style="font-weight: bold; font-size: 11pt;">Đoàn Văn Hoài Vũ</div>
        </td>
        <td style="width: 50%; text-align: center; vertical-align: top; border: none;">
          <div style="font-size: 11pt; font-weight: bold;">Lãnh đạo phê duyệt</div>
          <div style="font-size: 9.5pt; font-style: italic;">(Ký, đóng dấu, ghi rõ họ tên)</div>
          <p style="margin: 0; padding: 0; height: 45pt; line-height: 45pt;">&nbsp;</p>
          <div style="font-weight: bold; font-size: 11pt;">Thái Công Cần</div>
        </td>
      </tr>
    </table>
  `;

  downloadWordDocumentND30(contentHtml, filename, {
    orientation: 'landscape',
    title,
    fontSizePt: 10,
    marginTopMm: 15,
    marginBottomMm: 15,
    marginLeftMm: 20,
    marginRightMm: 15,
  });
}
