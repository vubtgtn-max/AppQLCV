/**
 * wordExportND30.ts
 * Bộ công cụ xuất văn bản Microsoft Word chuẩn Nghị định số 30/2020/NĐ-CP về công tác văn thư
 * Đảm bảo 100% không bị vỡ định dạng khi tải về:
 * - Tự động chuẩn hóa Header (Quốc hiệu, Tiêu ngữ, Cơ quan ban hành) sang Word Table 2 cột
 * - Tự động chuẩn hóa Khối chữ ký & Nơi nhận sang Word Table 2-3 cột
 * - Chuẩn hóa các dòng kẻ chấm (dotted fill lines) cho biểu mẫu
 * - Căn lề chuẩn Nghị định 30: Trái 30mm, Phải 15mm, Trên 20mm, Dưới 20mm, font Times New Roman 13pt
 */

export interface WordExportOptions {
  orientation?: 'portrait' | 'landscape';
  title?: string;
  subTitle?: string;
  fontSizePt?: number;
  marginTopMm?: number;
  marginBottomMm?: number;
  marginLeftMm?: number;
  marginRightMm?: number;
}

/**
 * Biến đổi một phần tử DOM bất kỳ thành phiên bản tương thích 100% với bộ hiển thị HTML của Microsoft Word
 */
export function prepareElementForWord(container: HTMLElement): HTMLElement {
  const clone = container.cloneNode(true) as HTMLElement;

  // 1. Xóa bỏ tất cả các phần tử điều khiển giao diện không cần in / không xuất Word
  clone.querySelectorAll('.no-print, [data-no-print], button, .cursor-pointer').forEach((el) => {
    // Không xóa các text button nếu có nội dung nghiệp vụ, chỉ xóa button điều khiển
    if (el.tagName === 'BUTTON' && !el.classList.contains('preserve-text')) {
      el.remove();
    } else if (el.classList.contains('no-print')) {
      el.remove();
    }
  });

  // 2. Chuyển đổi toàn bộ <input> thành văn bản sạch hoặc dòng kẻ chấm
  clone.querySelectorAll('input').forEach((inp) => {
    const val = inp.value?.trim() || '';
    const placeholder = inp.placeholder?.trim() || '';
    const isDotted = inp.classList.contains('border-dotted') || inp.parentElement?.classList.contains('border-dotted');
    const isBold = inp.classList.contains('font-bold') || inp.parentElement?.classList.contains('font-bold');
    const isCenter = inp.classList.contains('text-center') || inp.parentElement?.classList.contains('text-center');

    const span = document.createElement('span');
    span.style.fontFamily = "'Times New Roman', serif";
    if (isBold) span.style.fontWeight = 'bold';
    if (isCenter) span.style.textAlign = 'center';

    if (val) {
      span.textContent = val;
    } else if (placeholder && placeholder.includes('..')) {
      span.textContent = placeholder;
    } else if (isDotted) {
      span.textContent = '........................................';
    } else {
      span.innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
    }
    inp.parentNode?.replaceChild(span, inp);
  });

  // 3. Chuyển đổi toàn bộ <textarea> thành văn bản bảo lưu xuống dòng
  clone.querySelectorAll('textarea').forEach((ta) => {
    const val = ta.value?.trim() || ta.placeholder?.trim() || '';
    const span = document.createElement('span');
    span.style.fontFamily = "'Times New Roman', serif";
    span.style.whiteSpace = 'pre-wrap';
    span.textContent = val || '................................................................................................';
    ta.parentNode?.replaceChild(span, ta);
  });

  // 4. Chuẩn hóa Tiêu đề H1, H2, H3 để Microsoft Word không áp Heading Style mặc định (thường biến thành chữ xanh Calibri)
  clone.querySelectorAll('h1, h2, h3, h4').forEach((heading) => {
    const tag = heading.tagName.toLowerCase();
    const p = document.createElement('p');
    p.setAttribute('align', 'center');
    p.style.textAlign = 'center';
    p.style.fontWeight = 'bold';
    p.style.fontFamily = "'Times New Roman', serif";
    p.style.margin = '8pt 0 4pt 0';

    if (tag === 'h1') {
      p.style.fontSize = '14pt';
      p.style.textTransform = 'uppercase';
      p.innerHTML = `<b>${heading.innerHTML}</b>`;
    } else if (tag === 'h2') {
      p.style.fontSize = '13pt';
      p.innerHTML = `<b>${heading.innerHTML}</b>`;
    } else {
      p.style.fontSize = '13pt';
      p.setAttribute('align', 'left');
      p.style.textAlign = 'left';
      p.innerHTML = `<b>${heading.innerHTML}</b>`;
    }
    heading.parentNode?.replaceChild(p, heading);
  });

  // 5. Chuẩn hóa Header Quốc hiệu - Tiêu ngữ và Tên cơ quan sang Word Table
  // Tìm các thẻ có chứa Quốc hiệu hoặc header grid/flex
  clone.querySelectorAll('div, table').forEach((el) => {
    const text = el.textContent || '';
    const isHeaderCandidate =
      text.includes('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM') &&
      (text.includes('UBND') || text.includes('ỦY BAN NHÂN DÂN') || text.includes('XÃ LÃNH NGỌC') || text.includes('Số:'));

    if (isHeaderCandidate && el.tagName === 'DIV' && (el.classList.contains('grid') || el.classList.contains('flex'))) {
      const children = Array.from(el.children);
      if (children.length >= 2) {
        const leftHtml = children[0].innerHTML;
        const rightHtml = children[1].innerHTML;

        const table = document.createElement('table');
        table.setAttribute('align', 'center');
        table.setAttribute('border', '0');
        table.setAttribute('cellpadding', '0');
        table.setAttribute('cellspacing', '0');
        table.style.width = '100%';
        table.style.border = 'none';
        table.style.borderCollapse = 'collapse';
        table.style.marginBottom = '12pt';

        table.innerHTML = `
          <tbody>
            <tr>
              <td style="width: 45%; text-align: center; vertical-align: top; border: none; padding: 0 4pt 0 0; font-family: 'Times New Roman', serif;">
                ${leftHtml}
              </td>
              <td style="width: 55%; text-align: center; vertical-align: top; border: none; padding: 0 0 0 4pt; font-family: 'Times New Roman', serif;">
                ${rightHtml}
              </td>
            </tr>
          </tbody>
        `;
        el.parentNode?.replaceChild(table, el);
      }
    }
  });

  // 6. Chuẩn hóa Khối chữ ký (Signatures) sang Word Table 2 cột hoặc 3 cột
  clone.querySelectorAll('div').forEach((el) => {
    const text = el.textContent || '';
    const isSigCandidate =
      (text.includes('Nơi nhận:') || text.includes('NGƯỜI LẬP') || text.includes('CHỦ TỊCH') || text.includes('PHÓ CHỦ TỊCH') || text.includes('ĐẠI DIỆN') || text.includes('Ký, ghi rõ họ tên') || text.includes('Ký và ghi rõ họ tên')) &&
      (el.classList.contains('grid') || el.classList.contains('flex')) &&
      !el.querySelector('table');

    if (isSigCandidate) {
      const children = Array.from(el.children);
      if (children.length === 2) {
        const leftHtml = children[0].innerHTML;
        const rightHtml = children[1].innerHTML;

        const table = document.createElement('table');
        table.setAttribute('align', 'center');
        table.setAttribute('border', '0');
        table.setAttribute('cellpadding', '0');
        table.setAttribute('cellspacing', '0');
        table.style.width = '100%';
        table.style.border = 'none';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '16pt';

        table.innerHTML = `
          <tbody>
            <tr>
              <td style="width: 45%; text-align: ${leftHtml.includes('Nơi nhận') ? 'left' : 'center'}; vertical-align: top; border: none; padding: 0 4pt 0 0; font-family: 'Times New Roman', serif;">
                ${leftHtml}
              </td>
              <td style="width: 55%; text-align: center; vertical-align: top; border: none; padding: 0 0 0 4pt; font-family: 'Times New Roman', serif;">
                ${rightHtml}
              </td>
            </tr>
          </tbody>
        `;
        el.parentNode?.replaceChild(table, el);
      } else if (children.length === 3) {
        const table = document.createElement('table');
        table.setAttribute('align', 'center');
        table.setAttribute('border', '0');
        table.setAttribute('cellpadding', '0');
        table.setAttribute('cellspacing', '0');
        table.style.width = '100%';
        table.style.border = 'none';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '16pt';

        table.innerHTML = `
          <tbody>
            <tr>
              <td style="width: 33.3%; text-align: center; vertical-align: top; border: none; padding: 0 3pt; font-family: 'Times New Roman', serif;">
                ${children[0].innerHTML}
              </td>
              <td style="width: 33.3%; text-align: center; vertical-align: top; border: none; padding: 0 3pt; font-family: 'Times New Roman', serif;">
                ${children[1].innerHTML}
              </td>
              <td style="width: 33.4%; text-align: center; vertical-align: top; border: none; padding: 0 3pt; font-family: 'Times New Roman', serif;">
                ${children[2].innerHTML}
              </td>
            </tr>
          </tbody>
        `;
        el.parentNode?.replaceChild(table, el);
      }
    }
  });

  // 7. Chuyển đổi các hàng flex chứa nhãn và giá trị (Form rows) thành bảng 2 cột liền mạch trong Word
  clone.querySelectorAll('div').forEach((el) => {
    const className = el.className || '';
    if (className.includes('flex') && (className.includes('items-baseline') || className.includes('items-center')) && !el.querySelector('table')) {
      const children = Array.from(el.children);
      if (children.length === 2 && children[0].tagName === 'SPAN' && (children[1].tagName === 'SPAN' || children[1].tagName === 'DIV')) {
        const labelHtml = children[0].innerHTML;
        const valHtml = children[1].innerHTML;
        const isDotted = className.includes('border-dotted') || children[1].className?.includes('border-dotted');

        const rowTable = document.createElement('table');
        rowTable.setAttribute('border', '0');
        rowTable.setAttribute('cellpadding', '0');
        rowTable.setAttribute('cellspacing', '0');
        rowTable.style.width = '100%';
        rowTable.style.border = 'none';
        rowTable.style.borderCollapse = 'collapse';
        rowTable.style.margin = '2pt 0';

        rowTable.innerHTML = `
          <tbody>
            <tr>
              <td style="border: none; vertical-align: bottom; white-space: nowrap; width: 1%; padding-right: 6pt; font-family: 'Times New Roman', serif;">
                ${labelHtml}
              </td>
              <td style="border: none; ${isDotted ? 'border-bottom: 1pt dotted #000;' : ''} vertical-align: bottom; width: 99%; padding-left: 2pt; font-family: 'Times New Roman', serif;">
                ${valHtml}
              </td>
            </tr>
          </tbody>
        `;
        el.parentNode?.replaceChild(rowTable, el);
      }
    }
  });

  // 8. Chuyển đổi các đường kẻ gạch chân phân cách Tiêu ngữ / Tên cơ quan thành đường kẻ gạch chân Word (không dùng ô hộp)
  clone.querySelectorAll('div').forEach((div) => {
    const className = div.className || '';
    const isDivider =
      (className.includes('bg-black') &&
        (className.includes('h-[1.5px]') || className.includes('h-[1px]') || className.includes('h-0.5') || className.includes('h-px'))) ||
      (div.children.length === 0 && !div.textContent?.trim() && (className.includes('bg-black') || className.includes('border-b')));

    if (isDivider) {
      let widthPx = '140px';
      if (className.includes('w-20')) widthPx = '80px';
      else if (className.includes('w-24')) widthPx = '100px';
      else if (className.includes('w-28')) widthPx = '140px';
      else if (className.includes('w-32')) widthPx = '160px';
      else if (className.includes('w-36')) widthPx = '180px';
      else if (className.includes('w-40')) widthPx = '200px';

      // Tạo đường kẻ ngang chuẩn Word dạng đoạn văn bản mỏng, tuyệt đối KHÔNG tạo bảng để không bị biến thành ô hộp
      const p = document.createElement('p');
      p.setAttribute('align', 'center');
      p.style.textAlign = 'center';
      p.style.margin = '2pt auto 4pt auto';
      p.style.lineHeight = '1pt';
      p.style.fontSize = '1pt';
      p.innerHTML = `<span style="display: inline-block; width: ${widthPx}; border-bottom: 1.5pt solid #000000; height: 1px; line-height: 1px; font-size: 1px;">&nbsp;</span>`;
      div.parentNode?.replaceChild(p, div);
      return;
    }

    // Khoảng trống chữ ký (h-14, h-16, h-20, h-24)
    if (
      div.children.length === 0 &&
      !div.textContent?.trim() &&
      (className.includes('h-14') || className.includes('h-16') || className.includes('h-20') || className.includes('h-24'))
    ) {
      div.style.height = '50pt';
      div.style.lineHeight = '50pt';
      div.innerHTML = '&nbsp;';
    }
  });

  // 9. Chuẩn hóa Bảng biểu (Tables)
  clone.querySelectorAll('table').forEach((tbl) => {
    tbl.setAttribute('align', 'center');

    // Kiểm tra nếu là bảng Header, Chữ ký hoặc bảng nằm bên trong Header/Chữ ký -> KHÔNG BAO GIỜ CÓ ĐƯỜNG VIỀN Ô
    const isHeaderOrSig =
      tbl.classList.contains('header-table') ||
      tbl.classList.contains('sig-table') ||
      Boolean(tbl.closest('.header-table') || tbl.closest('.sig-table')) ||
      tbl.classList.contains('divider-table') ||
      (tbl.rows.length <= 1 && tbl.rows[0]?.cells.length <= 1);

    if (isHeaderOrSig) {
      tbl.setAttribute('border', '0');
      tbl.setAttribute('cellspacing', '0');
      tbl.setAttribute('cellpadding', '0');
      tbl.style.border = 'none';
      tbl.style.width = '100%';
      tbl.style.borderCollapse = 'collapse';
      tbl.style.pageBreakInside = 'avoid';
      tbl.querySelectorAll('tr').forEach((row) => {
        (row as HTMLElement).style.pageBreakInside = 'avoid';
      });
      tbl.querySelectorAll('td, th').forEach((cell) => {
        const el = cell as HTMLElement;
        el.style.border = 'none';
        el.setAttribute('valign', 'top');
        el.style.verticalAlign = 'top';
        el.style.fontFamily = "'Times New Roman', serif";
      });
    } else {
      tbl.setAttribute('border', '1');
      tbl.setAttribute('cellspacing', '0');
      tbl.setAttribute('cellpadding', '4');
      tbl.style.borderCollapse = 'collapse';
      tbl.style.border = '1pt solid black';
      tbl.style.width = '100%';
      tbl.querySelectorAll('td, th').forEach((cell) => {
        const el = cell as HTMLElement;
        el.style.border = '1pt solid black';
        el.style.padding = '4pt 6pt';
        el.style.fontFamily = "'Times New Roman', serif";
        if (el.tagName === 'TH') {
          el.style.backgroundColor = '#f2f2f2';
          el.style.fontWeight = 'bold';
          el.style.textAlign = 'center';
        }
      });
    }
  });

  // 10. Đảm bảo mục "Nơi nhận:" luôn được đẩy sát mép trái 100%, không bị căn giữa hay thụt lề
  clone.querySelectorAll('td, div, p').forEach((el) => {
    const htmlEl = el as HTMLElement;
    const text = htmlEl.textContent || '';
    if (text.includes('Nơi nhận:')) {
      htmlEl.setAttribute('align', 'left');
      htmlEl.style.textAlign = 'left';
      htmlEl.style.paddingLeft = '0';
      htmlEl.style.marginLeft = '0';
      htmlEl.querySelectorAll('*').forEach((child) => {
        const c = child as HTMLElement;
        c.setAttribute('align', 'left');
        c.style.textAlign = 'left';
        c.style.paddingLeft = '0';
        c.style.marginLeft = '0';
      });
    }
  });

  // 11. Chuẩn hóa tên người ký / người ghi biên bản: Viết thường hoa đầu từ (Title Case), KHÔNG in hoa toàn bộ
  const nameReplacements: Record<string, string> = {
    'THÁI CÔNG CẦN': 'Thái Công Cần',
    'VÕ TẤN LẠT': 'Võ Tấn Lạt',
    'ĐOÀN VĂN HOÀI VŨ': 'Đoàn Văn Hoài Vũ',
    'MAI HUY': 'Thái Công Cần',
    'Mai Huy': 'Thái Công Cần',
  };

  clone.querySelectorAll('*').forEach((node) => {
    const el = node as HTMLElement;
    const text = el.textContent?.trim() || '';

    // Thay thế tên chuẩn Thái Công Cần & chuyển sang viết thường hoa đầu từ
    for (const [key, val] of Object.entries(nameReplacements)) {
      if (text === key) {
        el.textContent = val;
        el.style.textTransform = 'none';
        el.classList.remove('uppercase');
      }
    }

    // Các vai trò: người ký, người ghi biên bản, người lập biểu -> viết thường hoa đầu từ
    if (text === 'NGƯỜI GHI BIÊN BẢN' || text === 'NGUOI GHI BIEN BAN') {
      el.textContent = 'Người ghi biên bản';
      el.style.textTransform = 'none';
      el.classList.remove('uppercase');
    } else if (text === 'NGƯỜI LẬP BIÊN BẢN' || text === 'NGUOI LAP BIEN BAN') {
      el.textContent = 'Người lập biên bản';
      el.style.textTransform = 'none';
      el.classList.remove('uppercase');
    } else if (text === 'NGƯỜI LẬP BIỂU' || text === 'NGUOI LAP BIEU') {
      el.textContent = 'Người lập biểu';
      el.style.textTransform = 'none';
      el.classList.remove('uppercase');
    } else if (text === 'NGƯỜI LẬP BÁO CÁO' || text === 'NGUOI LAP BAO CAO') {
      el.textContent = 'Người lập báo cáo';
      el.style.textTransform = 'none';
      el.classList.remove('uppercase');
    } else if (text === 'CHUYÊN VIÊN' || text === 'CHUYEN VIEN') {
      el.textContent = 'Chuyên viên';
      el.style.textTransform = 'none';
      el.classList.remove('uppercase');
    }
  });

  // 12. Gán thuộc tính Font chữ Times New Roman và căn lề cho mọi phần tử
  clone.querySelectorAll('*').forEach((node) => {
    const el = node as HTMLElement;
    const classList = el.className ? String(el.className) : '';

    if (classList.includes('text-left') || el.getAttribute('align') === 'left') {
      el.setAttribute('align', 'left');
      el.style.textAlign = 'left';
    } else if (classList.includes('text-center') || el.getAttribute('align') === 'center') {
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
    if (classList.includes('uppercase') && !el.textContent?.includes('Thái Công Cần') && !el.textContent?.includes('Võ Tấn Lạt') && !el.textContent?.includes('Đoàn Văn Hoài Vũ')) {
      el.style.textTransform = 'uppercase';
    }

    el.style.fontFamily = "'Times New Roman', Times, serif";
  });

  return clone;
}

/**
 * Xây dựng chuỗi HTML hoàn chỉnh có khai báo Microsoft Office Word XML và Căn lề chuẩn Nghị định 30/2020/NĐ-CP
 */
export function buildWordDocumentND30(
  contentHtml: string,
  options: WordExportOptions = {}
): string {
  const {
    orientation = 'portrait',
    title = 'Văn bản hành chính',
    fontSizePt = orientation === 'landscape' ? 10.5 : 13,
    marginTopMm = 20,
    marginBottomMm = 20,
    marginLeftMm = 30, // Chuẩn NĐ 30: lề trái 30 - 35 mm để đóng bìa/ghim
    marginRightMm = 15, // Chuẩn NĐ 30: lề phải 15 - 20 mm
  } = options;

  const pageSize = orientation === 'landscape' ? '297mm 210mm' : '210mm 297mm';
  const pageMargins = `${marginTopMm}mm ${marginRightMm}mm ${marginBottomMm}mm ${marginLeftMm}mm`;

  return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <title>${title}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
          <w:Compatibility>
            <w:BreakWrappedTables/>
            <w:SnapToGridInCell/>
            <w:WrapTextWithPunct/>
            <w:UseAsianBreakRules/>
            <w:DontGrowAutofit/>
          </w:Compatibility>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page Section1 {
          size: ${pageSize};
          margin: ${pageMargins};
          mso-header-margin: 36pt;
          mso-footer-margin: 36pt;
          mso-paper-source: 0;
        }
        div.Section1 {
          page: Section1;
        }
        * {
          font-family: 'Times New Roman', 'Tinos', Times, serif !important;
        }
        body {
          font-family: 'Times New Roman', 'Tinos', Times, serif !important;
          font-size: ${fontSizePt}pt;
          line-height: 1.35;
          color: #000000;
          margin: 0;
          padding: 0;
        }
        p, div, li, td, th {
          font-family: 'Times New Roman', serif !important;
          line-height: 1.35;
          color: #000000;
        }
        p {
          margin: 0 0 5pt 0;
          text-align: justify;
        }
        p.MsoNormal, div.MsoNormal {
          margin: 0cm;
          margin-bottom: 5pt;
          font-size: ${fontSizePt}pt;
          font-family: 'Times New Roman', serif;
          text-align: justify;
        }
        h1, h2, h3, h4 {
          font-family: 'Times New Roman', serif !important;
          text-align: center !important;
          font-weight: bold !important;
          margin: 10pt 0 4pt 0;
        }
        h1 { font-size: 14pt; text-transform: uppercase; }
        h2 { font-size: 13pt; }
        h3 { font-size: 13pt; text-align: left !important; }
        
        table {
          border-collapse: collapse;
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        table.header-table {
          width: 100% !important;
          border: none !important;
          margin-bottom: 12pt;
          page-break-inside: avoid !important;
          mso-break-inside: avoid !important;
        }
        table.header-table td {
          border: none !important;
          padding: 0 !important;
          vertical-align: top;
        }
        table.sig-table {
          width: 100% !important;
          border: none !important;
          margin-top: 16pt;
          page-break-inside: avoid !important;
          mso-break-inside: avoid !important;
        }
        table.sig-table tr {
          page-break-inside: avoid !important;
          mso-break-inside: avoid !important;
        }
        table.sig-table td {
          border: none !important;
          padding: 0 !important;
          vertical-align: top;
        }
        table.sig-table td.noi-nhan,
        table.sig-table td[align="left"],
        .noi-nhan,
        .noi-nhan * {
          text-align: left !important;
          text-align: -webkit-left !important;
          margin-left: 0 !important;
          padding-left: 0 !important;
        }
        table.sig-table td.noi-nhan p,
        table.sig-table td.noi-nhan div,
        table.sig-table td[align="left"] p,
        table.sig-table td[align="left"] div {
          text-align: left !important;
          margin-left: 0 !important;
          padding-left: 0 !important;
          margin-bottom: 2pt !important;
        }
        table.data-table {
          width: 100% !important;
          border-collapse: collapse;
          border: 1pt solid #000000;
          margin: 8pt 0;
        }
        table.data-table th, table.data-table td {
          border: 1pt solid #000000;
          padding: 4pt 6pt;
          font-size: ${orientation === 'landscape' ? '9.5pt' : '11pt'};
          vertical-align: middle;
        }
        table.data-table th {
          background-color: #f2f2f2;
          font-weight: bold;
          text-align: center;
        }
        .text-left, [align="left"] { text-align: left !important; text-align: -webkit-left !important; }
        .text-center, [align="center"] { text-align: center !important; text-align: -webkit-center; }
        .text-right, [align="right"] { text-align: right !important; }
        .text-justify, [align="justify"] { text-align: justify !important; }
        .font-bold, b, strong { font-weight: bold !important; }
        .italic, i, em { font-style: italic !important; }
        .uppercase { text-transform: uppercase !important; }
        .indent-paragraph { text-indent: 1cm; }
        .no-print { display: none !important; }
      </style>
    </head>
    <body>
      <div class="Section1">
        ${contentHtml}
      </div>
    </body>
    </html>
  `;
}

/**
 * Tải xuống tệp Word (.doc) hoàn chỉnh theo chuẩn Nghị định 30/2020/NĐ-CP
 * Hỗ trợ truyền vào trực tiếp một HTMLElement hoặc chuỗi HTML
 */
export function downloadWordDocumentND30(
  target: HTMLElement | string,
  filename: string,
  options: WordExportOptions = {}
): void {
  let contentHtml = '';

  if (typeof target === 'string') {
    contentHtml = target;
  } else if (target instanceof HTMLElement) {
    const preparedClone = prepareElementForWord(target);
    contentHtml = preparedClone.innerHTML;
  } else {
    console.error('Invalid target provided for downloadWordDocumentND30');
    return;
  }

  const safeFilename = (filename || 'Van_ban_trinh_ky')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_');

  const fullWordHtml = buildWordDocumentND30(contentHtml, {
    title: safeFilename,
    ...options,
  });

  // Sử dụng UTF-8 BOM (\ufeff) để Microsoft Word hiển thị 100% tiếng Việt chuẩn không lỗi font
  const blob = new Blob(['\ufeff', fullWordHtml], {
    type: 'application/msword;charset=utf-8',
  });

  const downloadUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = downloadUrl;
  downloadLink.download = `${safeFilename}.doc`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(downloadUrl);
}
