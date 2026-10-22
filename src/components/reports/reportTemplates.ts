import { Task, Dossier, User, LandProject } from '../../types';
import { formatDate } from '../../utils/date';

export interface ReportTemplateDef {
  id: string;
  name: string;
  reportTitle?: string;
  icon: string;
  description: string;
  badge?: string;
  isCustom?: boolean;
  defaultReportNumber?: string;
  defaultRecipient?: string;
  defaultRecipientsText?: string;
  generate: (params: ReportGeneratorParams) => string;
}

export interface ReportGeneratorParams {
  periodLabel: string;
  periodShortLabel: string;
  tasks: Task[];
  dossiers: Dossier[];
  users: User[];
  projects: LandProject[];
  targetUsers: User[];
  docRecipient: string;
  docIssuingUnit: string;
  customRemarks: string;
}

export const STANDARD_REPORT_TEMPLATES: ReportTemplateDef[] = [
  // MẪU 1: BÁO CÁO TỔNG HỢP TIẾN ĐỘ CÔNG TÁC QUẢN LÝ ĐẤT ĐAI & GPMB (CHUẨN FORM QUẢN LÝ DỰ ÁN)
  {
    id: 'land_project_comprehensive',
    name: 'Mẫu 1: Tổng hợp Tiến độ Đất đai & Bồi thường GPMB',
    reportTitle: 'KẾT QUẢ CÔNG TÁC QUẢN LÝ ĐẤT ĐAI, GIẢI QUYẾT THỦ TỤC HÀNH CHÍNH VÀ TIẾN ĐỘ BỒI THƯỜNG GIẢI PHÓNG MẶT BẰNG',
    icon: 'Landmark',
    badge: 'Chuẩn Dự án & GPMB',
    description: 'Báo cáo toàn diện kết quả thực hiện nhiệm vụ chuyên môn, thủ tục Một cửa và công tác bồi thường GPMB theo chu kỳ.',
    defaultReportNumber: '      /BC-PKT',
    defaultRecipient: 'Ủy ban nhân dân xã Lãnh Ngọc; Thường trực HĐND - UBND xã',
    defaultRecipientsText: '- Như trên;\n- Thường trực Đảng ủy, HĐND xã (b/c);\n- Chủ tịch, các PCT UBND xã;\n- Lưu: VT, PKT.',
    generate: ({
      periodShortLabel,
      tasks,
      dossiers,
      projects,
      docIssuingUnit,
      customRemarks,
    }) => {
      const totalT = tasks.length;
      const completedT = tasks.filter((t) => t.status === 'completed').length;
      const inProgressT = tasks.filter((t) => t.status === 'in_progress').length;
      const overdueT = tasks.filter((t) => {
        if (t.status === 'completed' || !t.dueDate) return false;
        return new Date(t.dueDate) < new Date();
      }).length;
      const rateT = totalT > 0 ? Math.round((completedT / totalT) * 100) : 0;

      const totalD = dossiers.length;
      const resolvedD = dossiers.filter((d) => d.status === 'resolved').length;
      const inProgressD = dossiers.filter((d) => d.status === 'in_progress').length;
      const overdueD = dossiers.filter((d) => {
        if (d.status === 'resolved' || !d.dueDate) return false;
        return new Date(d.dueDate) < new Date();
      }).length;
      const supplementD = dossiers.filter((d) => d.status === 'supplement').length;
      const rateD = totalD > 0 ? Math.round((resolvedD / totalD) * 100) : 0;

      const totalP = projects.length;
      const inProgressP = projects.filter((p) => p.status !== 'completed' && p.status !== 'cancelled' && p.status !== 'halted').length;
      const completedP = projects.filter((p) => p.status === 'completed').length;
      const totalHouseholds = projects.reduce((acc, p) => acc + (p.households?.length || p.totalHouseholds || 0), 0);
      const totalPaidHouseholds = projects.reduce((acc, p) => {
        return acc + (p.households?.filter((h) => h.paymentStatus === 'paid').length || 0);
      }, 0);
      const totalObstacles = projects.reduce((acc, p) => {
        return acc + (p.households?.filter((h) => h.hasObstacle || h.paymentStatus === 'refused').length || 0);
      }, 0);
      const totalApprovedBudget = projects.reduce((acc, p) => {
        return acc + (p.households?.reduce((sum, h) => sum + (h.compensationAmount || 0), 0) || p.totalBudget || 0);
      }, 0);
      const totalPaidAmount = projects.reduce((acc, p) => {
        return acc + (p.households?.reduce((sum, h) => sum + (h.paidAmount || 0), 0) || 0);
      }, 0);

      return `    Căn cứ Luật Đất đai số 31/2024/QH15 và các Nghị định hướng dẫn thi hành; thực hiện Quy chế làm việc của Ủy ban nhân dân xã Lãnh Ngọc và phân công nhiệm vụ chuyên môn; ${docIssuingUnit} xin báo cáo toàn diện kết quả thực hiện nhiệm vụ, giải quyết thủ tục hành chính đất đai và tiến độ công tác bồi thường, hỗ trợ, tái định cư trong ${periodShortLabel} như sau:

I. TÌNH HÌNH TRIỂN KHAI VÀ KẾT QUẢ ĐẠT ĐƯỢC
    1. Về tiến độ thực hiện các nhiệm vụ chuyên môn được giao:
    Trong kỳ, Phòng đã tiếp nhận và tổ chức triển khai tổng số ${totalT} nhiệm vụ chuyên môn được Thường trực Đảng ủy, Lãnh đạo UBND xã giao và các kế hoạch công tác thường xuyên.
    - Số nhiệm vụ đã hoàn thành dứt điểm: ${completedT} nhiệm vụ (đạt tỷ lệ ${rateT}%).
    - Số nhiệm vụ đang tích cực giải quyết trong hạn: ${inProgressT} nhiệm vụ.
    - Số nhiệm vụ chậm tiến độ cần đôn đốc: ${overdueT} nhiệm vụ.

    2. Về kết quả tiếp nhận và giải quyết hồ sơ thủ tục hành chính đất đai (Bộ phận Một cửa):
    Tổng số hồ sơ tiếp nhận và thụ lý giải quyết là ${totalD} hồ sơ (bao gồm đăng ký cấp GCN lần đầu, đăng ký biến động chuyển nhượng, tặng cho, thừa kế, tách/hợp thửa, chuyển mục đích sử dụng đất).
    - Số hồ sơ đã thẩm tra, xác nhận và trả kết quả: ${resolvedD} hồ sơ (đạt tỷ lệ giải quyết ${rateD}%).
    - Số hồ sơ đang trong quy trình thụ lý: ${inProgressD} hồ sơ.
    - Số hồ sơ cần bổ sung, hoàn thiện giấy tờ: ${supplementD} hồ sơ.
    - Số hồ sơ trễ hạn giải quyết: ${overdueD} hồ sơ.

    3. Về tiến độ công tác bồi thường, hỗ trợ, tái định cư và giải phóng mặt bằng các dự án:
    Toàn xã đang theo dõi, triển khai ${totalP} dự án công trình phát triển hạ tầng và kinh tế - xã hội (${inProgressP} dự án đang bồi thường, ${completedP} dự án đã bàn giao mặt bằng hoàn tất).
    - Tổng số hộ gia đình, cá nhân bị ảnh hưởng: ${totalHouseholds} hộ.
    - Số hộ đã nhận đủ kinh phí bồi thường: ${totalPaidHouseholds} hộ (đạt tỷ lệ ${totalHouseholds > 0 ? Math.round((totalPaidHouseholds / totalHouseholds) * 100) : 0}%).
    - Tổng kinh phí bồi thường, hỗ trợ đã phê duyệt: ${Number(totalApprovedBudget).toLocaleString('vi-VN')} đồng.
    - Tổng kinh phí đã giải ngân, chi trả cho người dân: ${Number(totalPaidAmount).toLocaleString('vi-VN')} đồng (đạt tỷ lệ ${totalApprovedBudget > 0 ? Math.round((totalPaidAmount / totalApprovedBudget) * 100) : 0}%).
    - Số hộ còn vướng mắc, chưa nhận tiền hoặc chưa bàn giao mặt bằng: ${totalObstacles} hộ.

II. TỒN TẠI, HẠN CHẾ, KHÓ KHĂN VƯỚNG MẮC VÀ NGUYÊN NHÂN
    1. Một số khó khăn, vướng mắc chủ yếu:
    - Về thủ tục hồ sơ địa chính: Khối lượng hồ sơ cấp Giấy chứng nhận và đo đạc biến động phát sinh lớn. Một số thửa đất có nguồn gốc phức tạp qua nhiều thời kỳ, giấy tờ chuyển nhượng viết tay, giáp ranh có tranh chấp ranh giới giữa các hộ liền kề đòi hỏi thời gian xác minh thực địa nhiều lần.
    - Về công tác giải phóng mặt bằng: Còn ${totalObstacles} hộ dân chưa đồng thuận phương án bồi thường do kiến nghị về giá bồi thường đất nông nghiệp, cây cối hoa màu hoặc đề nghị giao thêm đất tái định cư nhưng không đủ điều kiện theo quy định của Luật Đất đai 2024.

    2. Nguyên nhân:
    - Hồ sơ địa chính lưu trữ qua các thời kỳ (Bản đồ 299, Bản đồ đo vẽ năm 2000) có sai lệch nhất định về diện tích và hình thể thửa đất so với hiện trạng thực tế.
    - Ý thức chấp hành và phối hợp cung cấp hồ sơ pháp lý gốc của một bộ phận người sử dụng đất còn hạn chế.

III. NHIỆM VỤ TRỌNG TÂM VÀ GIẢI PHÁP TRONG THỜI GIAN TỚI
    1. Tập trung đẩy nhanh tiến độ thẩm tra, xác minh nguồn gốc đất đối với các hồ sơ Một cửa còn tồn đọng, đảm bảo 100% hồ sơ được giải quyết đúng hạn hoặc có văn bản thông báo gia hạn, xin lỗi công dân theo đúng Nghị định 61/2018/NĐ-CP.
    2. Tiếp tục phối hợp với Ủy ban MTTQ Việt Nam xã và các đoàn thể chính trị - xã hội tổ chức các buổi tuyên truyền, vận động, đối thoại trực tiếp với các hộ dân còn vướng mắc trong công tác GPMB.
    3. Tăng cường kỷ luật, kỷ cương hành chính; phân công rõ người, rõ việc, rõ tiến độ và trách nhiệm đối với từng cán bộ chuyên môn trong Phòng Kinh tế.${
      customRemarks ? `\n\n* Ghi chú / Kiến nghị bổ sung của đơn vị:\n${customRemarks}` : ''
    }

    ${docIssuingUnit} kính báo cáo và xin ý kiến chỉ đạo của Ủy ban nhân dân xã Lãnh Ngọc.`;
    },
  },

  // MẪU 2: BÁO CÁO THẨM TRA NGUỒN GỐC, HIỆN TRẠNG SỬ DỤNG ĐẤT ĐAI (CHUẨN LUẬT ĐẤT ĐAI 2024)
  {
    id: 'land_verification_origin',
    name: 'Mẫu 2: Thẩm tra Nguồn gốc & Hiện trạng Sử dụng Đất',
    reportTitle: 'KẾT QUẢ THẨM TRA NGUỒN GỐC, THỜI ĐIỂM, HIỆN TRẠNG SỬ DỤNG ĐẤT VÀ TÌNH TRẠNG TRANH CHẤP PHỤC VỤ CÔNG TÁC CẤP GIẤY CHỨNG NHẬN QUYỀN SỬ DỤNG ĐẤT',
    icon: 'MapPin',
    badge: 'Luật Đất đai 2024',
    description: 'Thẩm tra nguồn gốc đất, thời điểm sử dụng trước 1993/2004, tứ cận ranh giới và hiện trạng tranh chấp phục vụ cấp GCN.',
    defaultReportNumber: '      /BC-KT-TTr',
    defaultRecipient: 'Hội đồng Đăng ký đất đai xã Lãnh Ngọc; Lãnh đạo UBND xã Lãnh Ngọc',
    defaultRecipientsText: '- Như trên;\n- Chi nhánh Văn phòng Đăng ký đất đai (phối hợp);\n- Lưu: VT, PKT.',
    generate: ({
      periodShortLabel,
      dossiers,
      docIssuingUnit,
      customRemarks,
    }) => {
      const totalD = dossiers.length;
      const resolvedD = dossiers.filter((d) => d.status === 'resolved').length;
      const inProgressD = dossiers.filter((d) => d.status === 'in_progress').length;
      const supplementD = dossiers.filter((d) => d.status === 'supplement').length;
      const rateD = totalD > 0 ? Math.round((resolvedD / totalD) * 100) : 0;

      return `    Căn cứ Luật Đất đai số 31/2024/QH15 ngày 18 tháng 01 năm 2024;
    Căn cứ Nghị định số 101/2024/NĐ-CP và Nghị định số 102/2024/NĐ-CP của Chính phủ quy định chi tiết thi hành Luật Đất đai;
    Căn cứ hồ sơ đề nghị cấp Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất của các hộ gia đình, cá nhân trên địa bàn xã trong ${periodShortLabel}; Tổ công tác chuyên môn Phòng Kinh tế báo cáo kết quả kiểm tra, thẩm tra thực địa như sau:

I. TỔNG QUAN TÌNH HÌNH THẨM TRA HỒ SƠ ĐỊA CHÍNH
    - Tổng số hồ sơ tiếp nhận thẩm tra trong kỳ: ${totalD} hồ sơ.
    - Số hồ sơ đã kiểm tra hiện trạng, lấy ý kiến khu dân cư, hoàn thiện biên bản thẩm tra đủ điều kiện: ${resolvedD} hồ sơ (đạt ${rateD}%).
    - Số hồ sơ đang đối soát tài liệu đo đạc, sổ mục kê, bản đồ 299: ${inProgressD} hồ sơ.
    - Số hồ sơ cần công dân bổ sung giấy tờ chứng minh thừa kế, tặng cho, chuyển nhượng: ${supplementD} hồ sơ.

II. KẾT QUẢ THẨM TRA CHI TIẾT
    1. Về nguồn gốc và thời điểm bắt đầu sử dụng đất:
    - Qua đối chiếu hồ sơ địa chính qua các thời kỳ và xác minh thực tế khu dân cư: Các thửa đất đủ điều kiện đều do hộ gia đình, cá nhân khai hoang hoặc nhận chuyển nhượng, tặng cho, thừa kế hợp pháp và sử dụng ổn định trước ngày 15/10/1993 hoặc trong khoảng từ ngày 15/10/1993 đến trước ngày 01/7/2004 theo đúng quy định tại Điều 137, Điều 138 Luật Đất đai năm 2024.
    - Người sử dụng đất không có hành vi lấn, chiếm đất công, không vi phạm quy hoạch sử dụng đất cấp xã đã được phê duyệt.

    2. Về hiện trạng ranh giới và tình trạng tranh chấp đất đai:
    - Kiểm tra tứ cận thực địa cho thấy ranh giới các thửa đất rõ ràng, có ranh giới tự nhiên (bờ vùng, tường bao, cột mốc) ổn định, không có sự chồng lấn với các thửa đất liền kề.
    - Đã tổ chức niêm yết công khai danh sách hồ sơ đủ điều kiện tại Trụ sở UBND xã và Nhà văn hóa các thôn theo quy định; trong thời gian niêm yết không phát sinh đơn thư khiếu nại, tố cáo hoặc tranh chấp ranh giới đối với các hồ sơ đề nghị xác nhận.

III. KẾT LUẬN VÀ KIẾN NGHỊ
    1. ${docIssuingUnit} xác nhận các hồ sơ nêu trên đủ điều kiện về nguồn gốc, hiện trạng sử dụng đất và không có tranh chấp theo quy định của pháp luật đất đai hiện hành.
    2. Kính đề nghị Hội đồng Đăng ký đất đai xã Lãnh Ngọc họp thẩm định, hoàn tất thủ tục xác nhận của UBND xã và chuyển Chi nhánh Văn phòng Đăng ký đất đai để in cấp Giấy chứng nhận quyền sử dụng đất cho công dân.${
      customRemarks ? `\n\n* Ý kiến lưu ý thêm của đơn vị:\n${customRemarks}` : ''
    }

    ${docIssuingUnit} kính báo cáo.`;
    },
  },

  // MẪU 3: BÁO CÁO GIẢI TRÌNH TIẾN ĐỘ, NGUYÊN NHÂN HỒ SƠ QUÁ HẠN & KẾ HOẠCH ĐÔN ĐỐC
  {
    id: 'overdue_explanation_remedy',
    name: 'Mẫu 3: Giải trình Hồ sơ Quá hạn & Biện pháp Tháo gỡ',
    reportTitle: 'KIỂM ĐIỂM TIẾN ĐỘ THỰC HIỆN NHIỆM VỤ CÔNG VỤ, GIẢI TRÌNH NGUYÊN NHÂN HỒ SƠ CHẬM TRỄ VÀ BIỆN PHÁP KHẮC PHỤC',
    icon: 'AlertTriangle',
    badge: 'Kiểm điểm & Đôn đốc',
    description: 'Kiểm điểm tiến độ thực hiện nhiệm vụ công vụ, giải trình nguyên nhân hồ sơ quá hạn và cam kết lộ trình xử lý dứt điểm.',
    defaultReportNumber: '      /BC-KT-ĐĐ',
    defaultRecipient: 'Thường trực Đảng ủy xã Lãnh Ngọc; Lãnh đạo Ủy ban nhân dân xã Lãnh Ngọc',
    defaultRecipientsText: '- Như trên;\n- Cán bộ, chuyên viên phụ trách (thực hiện);\n- Lưu: VT, PKT.',
    generate: ({
      periodShortLabel,
      tasks,
      dossiers,
      docIssuingUnit,
      customRemarks,
    }) => {
      const overdueTasks = tasks.filter((t) => {
        if (t.status === 'completed' || !t.dueDate) return false;
        return new Date(t.dueDate) < new Date();
      });
      const overdueDossiers = dossiers.filter((d) => {
        if (d.status === 'resolved' || !d.dueDate) return false;
        return new Date(d.dueDate) < new Date();
      });

      return `    Thực hiện chỉ đạo của Thường trực Đảng ủy và Lãnh đạo UBND xã Lãnh Ngọc về việc siết chặt kỷ cương hành chính, nâng cao chỉ số hài lòng của người dân trong giải quyết thủ tục hành chính đất đai; ${docIssuingUnit} xin báo cáo kiểm điểm tiến độ và giải trình các nhiệm vụ, hồ sơ còn chậm trễ trong ${periodShortLabel} như sau:

I. TÌNH HÌNH VÀ THỰC TRẠNG CÁC NHIỆM VỤ, HỒ SƠ QUÁ HẠN
    1. Về nhiệm vụ chuyên môn:
    - Tổng số nhiệm vụ quá hạn chưa hoàn thành: ${overdueTasks.length} nhiệm vụ.
    ${overdueTasks.length > 0 ? overdueTasks.slice(0, 5).map((t) => `    + [${t.code}] ${t.name} (Hạn định: ${t.dueDate ? formatDate(t.dueDate) : 'Chưa rõ'})`).join('\n') : '    + Không có nhiệm vụ chuyên môn nào trễ hạn.'}

    2. Về hồ sơ Một cửa chậm trả kết quả:
    - Tổng số hồ sơ Một cửa trễ hạn: ${overdueDossiers.length} hồ sơ.
    ${overdueDossiers.length > 0 ? overdueDossiers.slice(0, 5).map((d) => `    + [${d.code}] Chủ hộ: ${d.owner} - ${d.procedure || 'Thủ tục đất đai'} (Hẹn trả: ${d.dueDate ? formatDate(d.dueDate) : 'Chưa rõ'})`).join('\n') : '    + 100% hồ sơ Một cửa được giải quyết đúng hạn.'}

II. NGUYÊN NHÂN VÀ TRÁCH NHIỆM
    1. Nguyên nhân khách quan:
    - Một số hồ sơ địa chính phức tạp có biến động ranh giới lớn, phải gửi văn bản lấy ý kiến phối hợp của Chi nhánh Văn phòng Đăng ký đất đai và Chi cục Thuế khu vực.
    - Thời tiết mưa bão ảnh hưởng đến công tác đo đạc, thẩm tra kiểm đếm thực địa tại các khu vực đồi núi, vùng sâu.

    2. Nguyên nhân chủ quan:
    - Một số cán bộ phụ trách chưa chủ động đôn đốc công dân hoàn thiện hồ sơ bổ sung từ sớm; chưa kịp thời tham mưu lãnh đạo ban hành văn bản xin lỗi và gia hạn thời gian giải quyết theo đúng quy định tại Nghị định 61/2018/NĐ-CP.

III. BIỆN PHÁP KHẮC PHỤC VÀ CAM KẾT TIẾN ĐỘ
    1. Phân công từng chuyên viên phụ trách tập trung xử lý dứt điểm toàn bộ ${overdueDossiers.length} hồ sơ chậm trễ trước ngày 25 của tháng.
    2. Hàng tuần tổ chức họp giao ban nội bộ Phòng để rà soát danh mục công việc sắp đến hạn, cảnh báo sớm trước 03 ngày làm việc đối với mọi nhiệm vụ và hồ sơ.
    3. Đưa tiêu chí đúng hạn hồ sơ vào đánh giá, xếp loại thi đua cán bộ, công chức hàng tháng và quý.${
      customRemarks ? `\n\n* Nội dung cụ thể cần bổ sung:\n${customRemarks}` : ''
    }

    ${docIssuingUnit} nghiêm túc kiểm điểm và cam kết thực hiện đúng tiến độ.`;
    },
  },

  // MẪU 4: BÁO CÁO ĐÁNH GIÁ HIỆU SUẤT & XẾP LOẠI CÁN BỘ CHUYÊN MÔN ĐẤT ĐAI
  {
    id: 'officer_performance_evaluation',
    name: 'Mẫu 4: Đánh giá Hiệu suất & Xếp loại Cán bộ',
    reportTitle: 'ĐÁNH GIÁ HIỆU SUẤT THỰC HIỆN NHIỆM VỤ CHUYÊN MÔN VÀ XẾP LOẠI CÁN BỘ PHÒNG KINH TẾ',
    icon: 'Users',
    badge: 'Đánh giá KPI',
    description: 'Báo cáo chi tiết khối lượng, tiến độ hoàn thành và xếp loại thi đua chuyên môn của từng cán bộ trong đơn vị.',
    defaultReportNumber: '      /BC-KT-TĐKT',
    defaultRecipient: 'Lãnh đạo Ủy ban nhân dân xã Lãnh Ngọc; Hội đồng Thi đua - Khen thưởng xã',
    defaultRecipientsText: '- Như trên;\n- Toàn thể cán bộ Phòng Kinh tế;\n- Lưu: VT, PKT.',
    generate: ({
      periodShortLabel,
      tasks,
      dossiers,
      targetUsers,
      docIssuingUnit,
      customRemarks,
    }) => {
      const officerBreakdown = targetUsers.map((u) => {
        const uTasks = tasks.filter((t) => t.assigneeId === u.id);
        const uCompleted = uTasks.filter((t) => t.status === 'completed').length;
        const uOverdue = uTasks.filter((t) => {
          if (t.status === 'completed' || !t.dueDate) return false;
          return new Date(t.dueDate) < new Date();
        }).length;
        const uRate = uTasks.length > 0 ? Math.round((uCompleted / uTasks.length) * 100) : 0;
        const uDossiers = dossiers.filter((d) => d.handlerId === u.id);
        const uDossiersResolved = uDossiers.filter((d) => d.status === 'resolved').length;

        let rank = 'Hoàn thành tốt nhiệm vụ';
        if (uRate >= 90) rank = 'Hoàn thành xuất sắc nhiệm vụ';
        else if (uRate >= 70) rank = 'Hoàn thành tốt nhiệm vụ';
        else if (uRate >= 50) rank = 'Hoàn thành nhiệm vụ';
        else rank = 'Chưa hoàn thành nhiệm vụ';

        return {
          user: u,
          totalTasks: uTasks.length,
          completedTasks: uCompleted,
          overdueTasks: uOverdue,
          taskRate: uRate,
          totalDossiers: uDossiers.length,
          resolvedDossiers: uDossiersResolved,
          rank,
        };
      });

      return `    Căn cứ Quy định về đánh giá, xếp loại chất lượng cán bộ, công chức và người lao động của UBND xã Lãnh Ngọc; căn cứ kết quả theo dõi tiến độ nhiệm vụ công tác và giải quyết thủ tục hành chính đất đai trong ${periodShortLabel}; ${docIssuingUnit} báo cáo đánh giá hiệu suất của cán bộ như sau:

I. TỔNG HỢP HIỆU SUẤT THỰC HIỆN NHIỆM VỤ THEO CÁN BỘ
${officerBreakdown
  .map(
    (os, i) => `    ${i + 1}. Đồng chí: ${os.user.name} - ${os.user.position || 'Chuyên viên'}
    - Tổng số nhiệm vụ được giao: ${os.totalTasks} việc (Hoàn thành: ${os.completedTasks}, Trễ hạn: ${os.overdueTasks}, Tỷ lệ: ${os.taskRate}%).
    - Hồ sơ Một cửa thụ lý: ${os.totalDossiers} hồ sơ (Đã giải quyết: ${os.resolvedDossiers} hồ sơ).
    - Tự đánh giá xếp loại: ${os.rank}.`
  )
  .join('\n\n')}

II. ĐÁNH GIÁ CHUNG VỀ Ý THỨC VÀ TINH THẦN TRÁCH NHIỆM
    - Cán bộ trong đơn vị luôn nêu cao tinh thần trách nhiệm, tích cực bám sát địa bàn, phối hợp chặt chẽ với Trưởng thôn và các tổ chức đoàn thể để hoàn thành tốt các chỉ tiêu được giao.
    - Chấp hành nghiêm chỉnh nội quy cơ quan và kỷ luật phát ngôn, thái độ phục vụ nhân dân văn minh, lịch sự.

III. ĐỀ XUẤT XẾP LOẠI VÀ KHEN THƯỞNG
    Kính đề nghị Lãnh đạo UBND xã và Hội đồng Thi đua - Khen thưởng xã xem xét, công nhận kết quả đánh giá, xếp loại thi đua tháng cho cán bộ Phòng Kinh tế theo danh sách nêu trên.${
      customRemarks ? `\n\n* Ý kiến đề xuất bổ sung:\n${customRemarks}` : ''
    }

    ${docIssuingUnit} kính báo cáo.`;
    },
  },

  // MẪU 5: BÁO CÁO KIỂM TRA, XỬ LÝ VI PHẠM TRẬT TỰ XÂY DỰNG & QUẢN LÝ ĐẤT CÔNG
  {
    id: 'land_inspection_violation',
    name: 'Mẫu 5: Kiểm tra Vi phạm Trật tự Xây dựng & Quản lý Đất đai',
    reportTitle: 'KẾT QUẢ KIỂM TRA THỰC ĐỊA, PHÁT HIỆN VÀ XỬ LÝ CÁC HÀNH VI VI PHẠM TRẬT TỰ XÂY DỰNG, LẤN CHIẾM ĐẤT ĐAI TRÊN ĐỊA BÀN XÃ',
    icon: 'ShieldAlert',
    badge: 'Thanh tra - Kiểm tra',
    description: 'Báo cáo kết quả kiểm tra thực địa, ngăn chặn tình trạng lấn chiếm đất công, xây dựng trái phép trên đất nông nghiệp.',
    defaultReportNumber: '      /BC-KT-KTXD',
    defaultRecipient: 'Chủ tịch Ủy ban nhân dân xã Lãnh Ngọc; Đội Kiểm tra Quy tắc xã',
    defaultRecipientsText: '- Như trên;\n- Trưởng các thôn (phối hợp giám sát);\n- Lưu: VT, PKT.',
    generate: ({
      periodShortLabel,
      docIssuingUnit,
      customRemarks,
    }) => {
      return `    Thực hiện Kế hoạch kiểm tra, giám sát hiện trạng sử dụng đất và trật tự xây dựng trên địa bàn xã Lãnh Ngọc; trong ${periodShortLabel}, ${docIssuingUnit} đã phối hợp với Đội Quy tắc và Ban Quản lý các thôn tổ chức rà soát thực địa, xin báo cáo kết quả như sau:

I. TÌNH HÌNH KIỂM TRA VÀ KẾT QUẢ PHÁT HIỆN
    1. Về công tác tuần tra, giám sát hiện trạng:
    - Đã tổ chức kiểm tra thực địa tại các khu vực trọng điểm, đất nông nghiệp giáp ranh khu dân cư và các tuyến đường liên xã.
    - Cơ bản tình hình trật tự xây dựng và quản lý đất công trên địa bàn được kiểm soát ổn định.

    2. Về các trường hợp phát hiện dấu hiệu vi phạm:
    - Đã kịp thời phát hiện, lập biên bản nhắc nhở và yêu cầu dừng thi công đối với các trường hợp san gạt mặt bằng, xây dựng tường rào hoặc công trình tạm chưa xin phép trên đất nông nghiệp.
    - Ngăn chặn triệt để hành vi lấn chiếm đất hành lang an toàn giao thông, đất thủy lợi và đất do UBND xã trực tiếp quản lý.

II. BIỆN PHÁP ĐÃ XỬ LÝ VÀ ĐỀ XUẤT KIẾN NGHỊ
    1. Tiếp tục phối hợp với Trưởng thôn giám sát chặt chẽ các trường hợp đã lập biên bản, kiên quyết xử lý dứt điểm ngay từ khi mới phát sinh.
    2. Đề nghị UBND xã chỉ đạo lực lượng Công an xã, Đội Quy tắc tăng cường phối hợp tuần tra ngoài giờ hành chính và các ngày nghỉ để ngăn chặn kịp thời.${
      customRemarks ? `\n\n* Ghi chú / Vụ việc cụ thể cần xử lý:\n${customRemarks}` : ''
    }

    ${docIssuingUnit} kính báo cáo Chủ tịch UBND xã xem xét, chỉ đạo.`;
    },
  },

  // MẪU 6: BÁO CÁO THẨM TRA, XÁC MINH ĐƠN THƯ KHIẾU NẠI, TRANH CHẤP ĐẤT ĐAI
  {
    id: 'land_dispute_mediation',
    name: 'Mẫu 6: Thẩm tra Đơn thư Khiếu nại & Hòa giải Tranh chấp Đất đai',
    reportTitle: 'KẾT QUẢ THẨM TRA, XÁC MINH ĐƠN THƯ PHẢN ÁNH VÀ THAM MƯU HÒA GIẢI TRANH CHẤP ĐẤT ĐAI TRÊN ĐỊA BÀN XÃ',
    icon: 'Scale',
    badge: 'Giải quyết Đơn thư',
    description: 'Báo cáo kết quả thẩm tra, xác minh đơn thư khiếu nại, phản ánh và tham mưu tổ chức hòa giải tranh chấp đất đai tại cơ sở.',
    defaultReportNumber: '      /BC-KT-KNTC',
    defaultRecipient: 'Chủ tịch Ủy ban nhân dân xã Lãnh Ngọc; Hội đồng Hòa giải tranh chấp đất đai xã',
    defaultRecipientsText: '- Như trên;\n- Tổ hòa giải cơ sở các thôn liên quan;\n- Lưu: VT, PKT.',
    generate: ({
      periodShortLabel,
      docIssuingUnit,
      customRemarks,
    }) => {
      return `    Căn cứ Luật Đất đai số 31/2024/QH15 và Luật Khiếu nại, Luật Tố cáo; thực hiện phiếu chuyển đơn và chỉ đạo của Chủ tịch UBND xã Lãnh Ngọc; ${docIssuingUnit} báo cáo kết quả thẩm tra, xác minh đơn thư tranh chấp ranh giới, quyền sử dụng đất trong ${periodShortLabel} như sau:

I. TÌNH HÌNH TIẾP NHẬN ĐƠN THƯ TRANH CHẤP ĐẤT ĐAI
    - Tổng số đơn tiếp nhận, thụ lý xác minh: Đơn thư phản ánh về tranh chấp ranh giới thửa đất, chia thừa kế quyền sử dụng đất và lối đi chung giữa các hộ dân.
    - Tổ chuyên môn đã phối hợp với Địa chính, Tư pháp và Trưởng thôn kiểm tra thực địa, đo đạc xác định mốc giới và làm việc trực tiếp với các bên liên quan.

II. KẾT QUẢ XÁC MINH VÀ PHƯƠNG ÁN HÒA GIẢI
    1. Về nguồn gốc và hồ sơ địa chính của các thửa đất:
    - Rà soát hồ sơ 299, sổ mục kê và sơ đồ đo vẽ địa chính qua các thời kỳ thể hiện rõ ranh giới, diện tích ban đầu của từng thửa đất.
    2. Về mâu thuẫn thực tế giữa các bên:
    - Do quá trình cải tạo, xây dựng hàng rào trước đây không cắm mốc chuẩn, dẫn đến sai lệch ranh giới thực địa.
    3. Phương án tham mưu:
    - Đề xuất Hội đồng Hòa giải tranh chấp đất đai xã tổ chức phiên họp hòa giải chính thức, trên cơ sở số liệu đo đạc thực tế của Phòng Kinh tế và tài liệu pháp lý lưu trữ, vận động các hộ gia đình tự nguyện thỏa thuận, giữ gìn tình làng nghĩa xóm.

III. KIẾN NGHỊ VÀ ĐỀ XUẤT
    Kính đề nghị Chủ tịch UBND xã - Chủ tịch Hội đồng hòa giải xã bố trí lịch họp hòa giải đối với các vụ việc đã đủ hồ sơ xác minh trong tuần tới.${
      customRemarks ? `\n\n* Vụ việc cụ thể cần lưu ý:\n${customRemarks}` : ''
    }

    ${docIssuingUnit} kính báo cáo.`;
    },
  },
];
