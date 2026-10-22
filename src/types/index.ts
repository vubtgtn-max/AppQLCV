export type UserRole = 'admin' | 'leader' | 'specialist' | 'clerk';
export type UserStatus = 'active' | 'locked' | 'pending';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  approved: boolean;
  scope?: string;
  phone?: string;
  position?: string;
  avatar?: string;
  gender?: 'male' | 'female';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  tokenVersion?: number;
}

export interface BackupFileItem {
  filename: string;
  size: number;
  createdAt: string;
  reason?: string;
}

export type TaskField =
  | 'Đăng ký đất đai'
  | 'Cấp giấy lần đầu'
  | 'Chuyển mục đích'
  | 'Đăng ký biến động'
  | 'Tặng cho đất Nhà nước'
  | 'Thu hồi GCN'
  | 'Khoáng sản'
  | 'Môi trường'
  | 'Xử lý vi phạm hành chính'
  | 'Tranh chấp đất đai'
  | 'Bồi thường, hỗ trợ, GPMB'
  | 'Đo đạc và bản đồ'
  | 'Xây dựng CSDL đất đai'
  | 'Khác'
  | (string & {});

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export interface Attachment {
  id: string;
  name: string;
  path: string;
  url: string;
  contentType: string;
  size: number;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: string;
  isResult?: boolean;
  stepIndex?: number;
  stepTitle?: string;
}

export interface Task {
  id: string;
  code: string; // e.g. CV-2026-001
  name: string;
  field: TaskField;
  priority: TaskPriority;
  assigneeId: string;
  assigneeName?: string;
  status: TaskStatus;
  progress: number; // 0 - 100
  startDate: string;
  dueDate: string;
  direction?: string; // Ý kiến chỉ đạo của Lãnh đạo
  note?: string;
  result?: string; // Bắt buộc khi Hoàn thành
  actualEndDate?: string;
  attachments: Attachment[];
  linkedDossierId?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedBy: string;
  updatedByName?: string;
  updatedAt: string;
}

export type DossierStatus = 'in_progress' | 'supplement' | 'paused' | 'resolved' | 'overdue' | 'rejected';

export interface LandCategoryDetail {
  id: string;
  category: string; // Tên / Mã loại đất (vd: ONT - Đất ở tại nông thôn, CLN - Đất trồng cây lâu năm, BHK - Đất trồng cây hàng năm khác)
  area: string; // Diện tích (m²)
  usageTime?: string; // Thời điểm bắt đầu sử dụng đất
  assetCreatedTime?: string; // Thời điểm tạo lập tài sản trên đất
}

export interface DossierWorkflowData {
  // Step 1: Inspection & Citizen/Co-owner info
  owner?: string; // Tên chủ sử dụng / Người đề nghị cấp GCN
  birthYear1?: string;
  citizenId1?: string;
  permanentAddress1?: string;
  owner2?: string; // Vợ/Chồng hoặc đồng sở hữu
  birthYear2?: string;
  citizenId2?: string;
  permanentAddress2?: string;
  parcel?: string;
  mapSheet?: string;
  landAddress?: string;
  totalLandArea?: string;
  residentialArea?: string;
  agricultureArea?: string;
  landTypes?: LandCategoryDetail[]; // Danh sách các loại đất chi tiết (ONT, CLN, BHK, ...)
  landOrigin?: string;
  currentStatus?: string;
  usageTime?: string;
  assetCreatedTime?: string;
  disputeStatus?: string;
  planningSuitability?: string;
  adjacentNeighbors?: string;
  inspectionDate?: string;
  inspectionTime?: string;
  inspectionEndTime?: string;
  inspectionLocation?: string;
  inspectionContent?: string;
  officer1Name?: string;
  officer1Role?: string;
  officer1Org?: string;
  officer2Name?: string;
  officer2Role?: string;
  officer2Org?: string;
  communeLeaderName?: string;
  communeLeaderRole?: string;
  villageName?: string;
  villageLeaderName?: string;
  villageLeaderRole?: string;

  // Step 2 & 3: Public Listing
  publicNoticeNumber?: string;
  publicListNumber?: string;
  publicStartDate?: string;
  publicEndDate?: string;
  publicLocationVillage?: string;
  closingTimeStr?: string;
  closingNoticeNumber?: string;

  // Step 4 & 5: Finance & Tax
  taxTransferNumber?: string;
  taxTransferDate?: string;
  taxNotice1?: string;
  taxNotice2?: string;
  taxConfirmNotice?: string;
  taxNoticeTruocBaNumber?: string; // Số TB lệ phí trước bạ
  taxNoticeTruocBaDate?: string; // Ngày ban hành TB lệ phí trước bạ
  taxNoticeTienSDDNumber?: string; // Số TB tiền sử dụng đất
  taxNoticeTienSDDDate?: string; // Ngày ban hành TB tiền sử dụng đất
  taxNoticeHoanThanhNVTCNumber?: string; // Số TB hoàn thành NVTC
  taxNoticeHoanThanhNVTCDate?: string; // Ngày ban hành TB hoàn thành NVTC

  // Step 6: Certificate Drafting & Submission
  phieutrinhNumber?: string;
  phieutrinhDate?: string;
  totrinhNumber?: string;
  totrinhDate?: string;
  gcnDraftNumber?: string;
  gcnBookNumber?: string;
  trichDoNumber?: string;
  trichDoDate?: string;

  // Step 7 & 8: Database & Result
  vbdlisSyncDate?: string;
  gcnIssueDate?: string;
  recipientName?: string;
  recipientIdCard?: string;

  // New Inspection Minute fields from Official Template 2026
  landPriceLocationResidential?: string; // Vị trí theo bảng giá đất (đất ở)
  landPriceLocationAgri?: string; // Vị trí theo bảng giá đất (đất nông nghiệp)
  landDepth?: string; // Chiều sâu thửa đất (m)
  alleyWidth?: string; // Chiều rộng ngõ hẻm (m)
  taxObligationArea?: string; // Diện tích đất phải thực hiện nghĩa vụ tài chính
  residentialAreaInQuota?: string; // Đất ở trong hạn mức (m²)
  residentialAreaOutOfQuota?: string; // Đất ở ngoài hạn mức (m²)
  agricultureTaxArea?: string; // Đất nông nghiệp tính thuế (m²)
  taxExemptionDetails?: string; // Đối tượng miễn/giảm tiền sử dụng đất
  landLawViolation?: string; // Về vi phạm pháp luật đất đai
  inspectionFeedback?: string; // Ý kiến các bên sau khi kiểm tra thực địa

  // 3 Witnesses for Land Origin Verification
  witness1Name?: string;
  witness1Address?: string;
  witness2Name?: string;
  witness2Address?: string;
  witness3Name?: string;
  witness3Address?: string;

  // Handover Tracking (Phiếu theo dõi giao nhận & luân chuyển hồ sơ)
  handover1Date?: string; // Ngày Một Cửa bàn giao hồ sơ cho chuyên viên
  handover1Giver?: string; // Người bàn giao (Cán bộ Một Cửa)
  handover1Receiver?: string; // Người nhận bàn giao (Chuyên viên Phòng Kinh tế)
  handover1Note?: string; // Tình trạng thành phần hồ sơ khi tiếp nhận
  submissionSignDate?: string; // Ngày chuyên viên trình ký Lãnh đạo UBND
  leaderSignDate?: string; // Ngày Lãnh đạo UBND xã ký duyệt
  leaderSignerName?: string; // Họ tên Lãnh đạo ký duyệt
  taxReturnDate?: string; // Ngày nhận kết quả thuế
  finalHandoverDate?: string; // Ngày bàn giao GCN cho Một Cửa / trả kết quả công dân
  finalHandoverReceiver?: string; // Người nhận bàn giao kết quả cuối cùng
  finalHandoverNote?: string; // Tình trạng kết quả bàn giao

  [key: string]: any;
}

export interface DossierWorkflowStepItem {
  stepIndex: number; // 1 to 8
  title: string;
  isCompleted: boolean;
  completedDate?: string;
  completedBy?: string;
  completedByName?: string;
  note?: string;
  attachments?: Attachment[];
  formData?: Record<string, any>;
}

export interface Dossier {
  id: string;
  code: string; // e.g. H17.130-260820-0012
  owner: string; // Tên chủ sử dụng / Người nộp
  parcel: string; // Số thửa đất
  mapSheet: string; // Tờ bản đồ
  procedure: string; // Thủ tục hành chính (vd: Cấp mới GCN, Chuyển quyền, Tách thửa...)
  receivedDate: string;
  dueDate: string;
  handlerId: string; // Chuyên viên thụ lý
  handlerName?: string;
  status: DossierStatus;
  result?: string;
  attachments: Attachment[];
  linkedTaskId?: string;
  address?: string;
  note?: string;
  supplementDate?: string; // Ngày ra thông báo yêu cầu bổ sung
  supplementNote?: string; // Nội dung hướng dẫn công dân bổ sung hồ sơ
  pauseDate?: string; // Ngày bắt đầu tạm dừng giải quyết hồ sơ
  pauseReason?: string; // Lý do tạm dừng (chờ thuế, chờ xác minh, ý kiến cấp trên...)
  pausedDays?: number; // Số ngày làm việc đã tạm dừng cộng dồn
  resumedDate?: string; // Ngày nhận đủ bổ sung hoặc ngày tiếp tục sau tạm dừng
  rejectionDate?: string; // Ngày trả hồ sơ
  rejectionReason?: string; // Lý do trả hồ sơ / không đủ điều kiện giải quyết
  rejectionDocNumber?: string; // Số phiếu / văn bản từ chối giải quyết
  workflowSteps?: DossierWorkflowStepItem[]; // Theo dõi quy trình 8 bước nghiệp vụ địa chính
  workflowData?: DossierWorkflowData; // Dữ liệu liên kết giữa 8 bước và các mẫu văn bản
  storageFolder?: string; // Tên/Mã kẹp hồ sơ lưu trữ (VD: "Kẹp 15", "Kẹp 01", "Tủ A - Kẹp 03")
  storageIndex?: string; // Số thứ tự trong kẹp lưu trữ giấy (VD: "15", "01", "12/15")
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt: string;
}

export type CalendarEventType = 'task' | 'meeting' | 'report';

export interface CalendarEvent {
  id: string;
  date: string;
  time?: string;
  type: CalendarEventType;
  name: string;
  assigneeId: string;
  assigneeName?: string;
  linkedTaskId?: string;
  result?: string;
  progress: 0 | 25 | 50 | 75 | 100;
  attachments: Attachment[];
  location?: string;
  note?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
}

export type RegisterBookType =
  | 'Sổ cấp giấy'
  | 'Sổ theo dõi biến động'
  | 'Sổ theo dõi cấp phát phôi GCN'
  | 'Sổ phiếu chuyển thuế'
  | 'Sổ theo dõi thu hồi GCN'
  | 'Sổ theo dõi HS tặng cho đất NN'
  | 'Sổ theo dõi xác nhận hạn mức đất ở'
  | 'Biên bản xử lý vi phạm'
  | 'Sổ khác'
  | 'Sổ theo dõi tranh chấp'
  | 'Sổ theo dõi môi trường'
  | 'Sổ cấp GCN'
  | 'Sổ đăng ký biến động'
  | 'Sổ theo dõi khoáng sản';

export interface RegisterBook {
  id: string;
  stt?: number; // Số thứ tự (TT)
  bookNumber: string; // Số vào sổ / Mã hồ sơ / Số hiệu
  type: RegisterBookType;
  content: string; // Nội dung biến động (ĐKBĐ) / Trích yếu
  relatedPerson: string; // Tên người được cấp GCN / Tên người SD đất / Họ tên người nhận
  createdDate: string; // Ngày vào sổ / Ngày tháng năm nhận / Ngày lập
  status: 'Đang xử lý' | 'Đã giải quyết' | 'Lưu trữ' | 'Theo dõi';
  attachments: Attachment[];
  notes?: string; // Ghi chú

  // Trường chuyên biệt cho Sổ cấp giấy
  issueSerialNumber?: string; // Số phát hành GCN
  mapSheet?: string; // Số tờ bản đồ
  parcel?: string; // Số thửa

  // Trường chuyên biệt cho Sổ theo dõi biến động
  gcnForMutation?: string; // GCN thực hiện đăng ký biến động (ĐKBĐ)
  dossierCode?: string; // Mã hồ sơ biến động

  // Trường chuyên biệt cho Sổ theo dõi cấp phát phôi GCN
  blankQuantity?: number | string; // Số lượng phôi nhận
  serialFrom?: string; // Seri phôi từ
  serialTo?: string; // Seri phôi đến
  damagedCount?: number | string; // Số phôi hỏng

  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
}

export type DocumentType =
  | 'Công văn'
  | 'Quyết định'
  | 'Thông báo'
  | 'Tờ trình'
  | 'Báo cáo'
  | 'Biên bản'
  | 'Kế hoạch'
  | 'Giấy mời'
  | 'Khác';

export interface DocumentItem {
  id: string;
  number: string; // Số / Ký hiệu văn bản (vd: 142/UBND-KT)
  title: string; // Trích yếu nội dung
  type: DocumentType;
  issueDate: string; // Ngày ban hành
  issuingAuthority?: string; // Cơ quan ban hành (vd: UBND Huyện, Sở TNMT, UBND Xã...)
  ownerId: string; // Cán bộ phụ trách / Tiếp nhận
  ownerName?: string;
  attachments: Attachment[];
  summary?: string;
  urgency?: 'normal' | 'urgent';
  direction?: string; // Ý kiến chỉ đạo xử lý văn bản
  status: 'Chưa xử lý' | 'Đang xử lý' | 'Đã hoàn thành' | 'Lưu trữ';
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'urgent';

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: NotificationType;
  relatedModule?: 'tasks' | 'dossiers' | 'calendar' | 'documents' | 'registerBooks' | 'users' | 'projects';
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'LOGIN' | 'APPROVE' | 'LOCK' | 'UPLOAD' | 'STATUS_CHANGE';
  module: 'tasks' | 'dossiers' | 'calendar' | 'registerBooks' | 'documents' | 'users' | 'settings' | 'auth' | 'projects';
  recordId?: string;
  recordCode?: string;
  description: string;
  createdAt: string;
  ip?: string;
  device?: string;
}

export interface AppSettings {
  unitName: string; // "Phòng Kinh tế – UBND xã Lãnh Ngọc"
  parentOrganization: string; // "UBND Huyện / Tỉnh"
  administrativeLevel?: string;
  year?: number;
  address?: string;
  deadlineWarningDays: number; // 7
  autoNotifyDeadline: boolean;
  allowPublicRegister: boolean;
  allowClerkDossiers: boolean;
  firebaseApiKey?: string;
  firebaseProjectId?: string;
  firebaseAppId?: string;
  alertConfig?: AlertConfig;
  villages?: string[];
}

export type AlertChannel = 'zalo' | 'telegram' | 'sms' | 'email' | 'system';

export type AlertTrigger =
  | 'deadline_20_days'
  | 'deadline_15_days'
  | 'deadline_10_days'
  | 'deadline_7_days'
  | 'deadline_5_days'
  | 'deadline_3_days'
  | 'deadline_1_day'
  | 'overdue'
  | 'urgent_assigned'
  | 'manual_dispatch';

export interface AlertMessageLog {
  id: string;
  channel: AlertChannel;
  recipientId: string;
  recipientName: string;
  recipientContact: string; // Phone, Email, Telegram ChatId, or Zalo ID
  targetType: 'task' | 'dossier' | 'document' | 'calendar' | 'broadcast';
  targetId: string;
  targetCode: string;
  title: string;
  content: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  trigger: AlertTrigger | string;
  sentAt: string;
  responseNote?: string;
}

export interface AlertConfig {
  enabledChannels: {
    zalo: boolean;
    telegram: boolean;
    sms: boolean;
    email: boolean;
    system: boolean;
  };
  warningDaysBefore: number[]; // e.g. [20, 15, 10, 7, 5, 3, 1]
  autoScanIntervalHours: number; // e.g. 1
  autoScanScheduleText?: string; // "2 lần/ngày: Đầu giờ sáng (07:30) & Đầu giờ chiều (13:30)"
  zaloOa: {
    oaId: string;
    secretKey: string;
    templateId: string;
    webhookUrl?: string;
    enabled: boolean;
  };
  telegram: {
    botToken: string;
    chatIdDefault: string;
    groupName?: string;
    enabled: boolean;
  };
  emailSmtp: {
    host: string;
    port: number;
    senderEmail: string;
    senderName: string;
    apiKey?: string;
    enabled: boolean;
  };
  smsGateway: {
    provider: string;
    senderBrand: string;
    apiKey?: string;
    enabled: boolean;
  };
  templates: {
    taskWarning: string;
    dossierWarning: string;
    urgentAlert: string;
    overdueAlert: string;
  };
}

export interface PendingAlertItem {
  id: string;
  type: 'task' | 'dossier' | 'document';
  code: string;
  title: string;
  dueDate: string;
  daysRemaining: number; // Negative if overdue, e.g. 20, 15, 7, 5, -2
  urgency: 'overdue' | 'critical' | 'warning_5_7' | 'warning_20_days' | 'upcoming';
  assigneeId: string;
  assigneeName: string;
  assigneePhone?: string;
  assigneeEmail?: string;
  scope?: string;
  status: string;
  lastAlertSentAt?: string;
}

// -------------------------------------------------------------
// DỰ ÁN & BỒI THƯỜNG GPMB (Land Project & Clearance Management)
// -------------------------------------------------------------
export type ProjectStatus =
  | 'planning'
  | 'surveying'
  | 'publicizing'
  | 'approving'
  | 'paying'
  | 'handing_over'
  | 'completed'
  | 'paused'
  | 'halted'
  | 'cancelled';

export type HouseholdPaymentStatus = 'paid' | 'unpaid' | 'partial' | 'partially_paid' | 'refused';
export type HouseholdHandoverStatus = 'handed_over' | 'not_yet' | 'partial' | 'partial_handover';
export type HouseholdResettlementStatus =
  | 'not_required'
  | 'eligible'
  | 'allocated'
  | 'handed_over'
  | 'not_eligible'
  | 'monetary';

export type HouseholdObstacleCategory =
  | 'price_dispute'
  | 'boundary_dispute'
  | 'origin_dispute'
  | 'resettlement_demand'
  | 'area_mismatch'
  | 'compensation_policy'
  | 'missing_papers'
  | 'complaint_lawsuit'
  | 'court_lawsuit'
  | 'other';

export interface ProjectHousehold {
  id: string;
  projectId: string;
  stt: number;
  ownerName: string; // Tên chủ hộ / Người đại diện
  cccd?: string;
  phone?: string;
  address: string; // Thôn / Xóm / Địa chỉ
  mapSheet: string; // Tờ bản đồ
  parcel: string; // Số thửa đất
  landType: string; // Loại đất (Đất ở, Đất CLN, Đất LUC, Đất BHK...)
  totalArea: number; // Diện tích thu hồi (m2)
  compensationAmount: number; // Số tiền bồi thường, hỗ trợ được duyệt (VNĐ)
  
  // Trạng thái mốc văn bản pháp lý
  noticeOfRecoveryIssued: boolean; // Đã ban hành thông báo thu hồi đất
  noticeNumber?: string;
  noticeDate?: string;
  
  inventoryDone: boolean; // Đã kiểm đếm hiện trạng
  inventoryDate?: string;
  
  approvalDecisionIssued: boolean; // Đã phê duyệt phương án bồi thường
  approvalDecisionNumber?: string;
  approvalDecisionDate?: string;
  
  recoveryDecisionIssued: boolean; // Đã ban hành QĐ thu hồi đất
  recoveryDecisionNumber?: string;
  recoveryDecisionDate?: string;
  
  // Chi trả tiền bồi thường
  paymentStatus: HouseholdPaymentStatus;
  paidAmount: number;
  paidDate?: string;
  paymentReceiptNumber?: string; // Số phiếu chi / Biên bản giao tiền
  
  // Bàn giao mặt bằng
  handoverStatus: HouseholdHandoverStatus;
  handoverArea?: number;
  handoverDate?: string;
  
  // Tái định cư
  resettlementStatus?: HouseholdResettlementStatus;
  resettlementPlot?: string; // Vị trí lô tái định cư / Mã lô
  
  // Khó khăn vướng mắc & Lý do chưa nhận tiền
  hasObstacle: boolean;
  obstacleCategory?: HouseholdObstacleCategory;
  obstacleCategoryName?: string;
  obstacleDetail?: string; // Nội dung vướng mắc, kiến nghị của hộ dân
  actionPlan?: string; // Biện pháp xử lý / Lịch đối thoại / Vận động
  campaignCount?: number; // Số lần đã vận động, đối thoại
  
  notes?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface ProjectMilestones {
  noticeOfRecovery: {
    issued: boolean;
    number?: string;
    date?: string;
    notes?: string;
  };
  surveyAndInventory: {
    completed: boolean;
    completedCount: number;
    totalCount: number;
    notes?: string;
  };
  publicPlan: {
    isPublic: boolean;
    startDate?: string;
    endDate?: string;
    feedbackCount?: number;
    notes?: string;
  };
  approvalDecision: {
    approved: boolean;
    number?: string;
    date?: string;
    approvedBudget?: number;
    notes?: string;
  };
  recoveryDecision: {
    issued: boolean;
    number?: string;
    date?: string;
    notes?: string;
  };
  paymentAndHandover: {
    isCompleted: boolean;
    notes?: string;
  };
}

export interface LandProject {
  id: string;
  code: string; // VD: DA-2026-001, GPMB-LN01
  name: string; // Tên dự án
  location: string; // Địa bàn (Thôn / Xã)
  decisionNumber?: string; // QĐ chủ trương / QĐ phê duyệt dự án
  decisionDate?: string;
  investor?: string; // Chủ đầu tư / Ban QLDA
  totalArea: number; // Tổng diện tích thu hồi (m2)
  totalHouseholds: number; // Tổng số hộ ảnh hưởng
  totalBudget: number; // Tổng kinh phí bồi thường dự kiến/được duyệt (VNĐ)
  status: ProjectStatus;
  managerId: string; // Cán bộ phụ trách
  managerName?: string;
  startDate: string;
  targetDate?: string; // Hạn hoàn thành GPMB
  description?: string;
  milestones: ProjectMilestones;
  households?: ProjectHousehold[];
  attachments: Attachment[];
  notes?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

// ================== TRANH CHẤP & HÒA GIẢI ĐẤT ĐAI ==================

export type DisputeStatus =
  | 'received' // Mới tiếp nhận đơn
  | 'verifying' // Đang thẩm tra, xác minh thực địa
  | 'verified' // Đã lập biên bản xác minh
  | 'reported' // Đã lập báo cáo thẩm tra xác minh
  | 'scheduled' // Đã ban hành giấy mời / chuẩn bị hòa giải
  | 'resolved_success' // Hòa giải thành
  | 'resolved_failure' // Hòa giải không thành (chuyển Tòa án / Cấp trên)
  | 'withdrawn'; // Đình chỉ / Rút đơn

export type DisputeType =
  | 'boundary' // Tranh chấp ranh giới, mốc giới
  | 'encroachment' // Lấn, chiếm đất đai
  | 'pathway' // Tranh chấp ngõ đi, lối đi chung, thoát nước
  | 'overlapping' // Chồng lấn ranh bản đồ / cấp trùng GCN
  | 'inheritance' // Thừa kế quyền sử dụng đất
  | 'transfer' // Mua bán, chuyển nhượng viết tay không giấy tờ
  | 'other'; // Khác

export interface DisputeParty {
  name: string;
  cccd?: string;
  phone?: string;
  address: string;
  claim: string; // Nội dung đơn yêu cầu / lý lẽ phản bác
  representative?: string; // Người đại diện theo ủy quyền (nếu có)
}

export interface RelatedParty {
  name: string;
  role: string; // Hộ giáp ranh phía Đông, Trưởng thôn, Người làm chứng...
  address?: string;
  phone?: string;
  statement?: string; // Lời khai / ý kiến nhân chứng
}

export interface VerificationMinute {
  minuteNumber?: string; // Số: .../BB-XM
  date: string; // Thời gian lập biên bản (YYYY-MM-DDTHH:mm)
  location: string; // Địa điểm lập biên bản (tại thực địa thửa đất số...)
  presidedBy: string; // Đại diện đoàn xác minh chủ trì
  delegation: Array<{
    name: string;
    position: string;
    present: boolean;
  }>;
  partyAPresent: boolean;
  partyBPresent: boolean;
  actualCheckFindings: string; // Kết quả kiểm tra hiện trạng thực tế tại hiện trường
  measuredDimensions: {
    east: string; // Phía Đông
    west: string; // Phía Tây
    south: string; // Phía Nam
    north: string; // Phía Bắc
    disputedArea?: number; // Diện tích đo đạc lấn chiếm / tranh chấp thực tế (m2)
  };
  historicalOrigin: string; // Nguồn gốc và quá trình sử dụng đất theo hồ sơ địa chính qua các thời kỳ (299, bản đồ VN-2000, sổ mục kê...)
  partyAOpinion: string; // Ý kiến của Bên A (Bên yêu cầu)
  partyBOpinion: string; // Ý kiến của Bên B (Bên bị khiếu nại)
  witnessOpinions: string; // Ý kiến của các hộ liền kề tứ cận, nhân chứng, trưởng thôn
  conclusion: string; // Kết luận, nhận xét bước đầu của Tổ xác minh
  signedBy: string[]; // Danh sách người đã ký / điểm chỉ
  createdAt?: string;
  updatedAt?: string;
}

export interface ExaminationReport {
  reportNumber: string; // Số: .../BC-UBND hoặc .../BC-TKT
  date: string; // Ngày ban hành báo cáo
  issuingAgency: string; // UBND XÃ LÃNH NGỌC - TỔ CÔNG TÁC XÁC MINH
  recipient: string; // Kính gửi: Chủ tịch UBND xã Lãnh Ngọc / Hội đồng hòa giải
  disputeSummary: string; // 1. Tóm tắt nội dung vụ việc và quá trình thụ lý
  historicalOriginSummary: string; // 2. Kết quả thẩm tra hồ sơ địa chính, nguồn gốc và lịch sử quản lý đất
  fieldVerificationSummary: string; // 3. Kết quả xác minh hiện trạng thực tế từ Biên bản xác minh
  legalEvaluation: string; // 4. Đánh giá pháp lý (áp dụng Luật Đất đai 2024 và các quy định hiện hành)
  settlementProposal: string; // 5. Đề xuất phương án hòa giải / hướng xử lý cụ thể
  reporterName: string; // Cán bộ chuyên môn / Tổ trưởng tổ xác minh
  leaderApprovalStatus?: 'draft' | 'submitted' | 'approved';
  leaderComments?: string; // Ý kiến chỉ đạo của Lãnh đạo UBND xã
  suggestedMediationDate?: string; // Thời gian dự kiến đưa ra Hội đồng hòa giải
  createdAt?: string;
  updatedAt?: string;
}

export interface MediationRecord {
  invitationNumber?: string; // Số giấy mời: .../GM-UBND
  invitationDate?: string; // Ngày phát hành giấy mời
  meetingDate?: string; // Ngày giờ tổ chức phiên hòa giải
  meetingLocation?: string; // Địa điểm: Hội trường UBND xã
  councilChairman?: string; // Chủ tịch Hội đồng (Chủ tịch / Phó Chủ tịch UBND xã)
  councilMembers?: Array<{
    name: string;
    position: string;
  }>;
  result: 'pending' | 'success' | 'failure';
  minuteNumber?: string; // Biên bản phiên hòa giải số: .../BB-HGHĐ
  agreementDetails?: string; // Nội dung các bên thỏa thuận đạt được (nếu hòa giải thành)
  failureReasons?: string; // Nguyên nhân không thỏa thuận được (nếu hòa giải không thành)
  postMediationGuidance?: string; // Hướng dẫn quyền khởi kiện tại TAND hoặc khiếu nại UBND huyện
  handoverToCourtDate?: string; // Ngày đương sự nhận trích lục biên bản để nộp Tòa án
  createdAt?: string;
  updatedAt?: string;
}

export type DisputeEvidenceCategory =
  | 'photo_field' // Ảnh chụp hiện trường, mốc giới thực tế
  | 'minute_field' // Biên bản lập tại hiện trường / Biên bản làm việc tại thôn
  | 'sketch_map' // Sơ đồ trích đo hiện trạng, sơ đồ tứ cận
  | 'legal_doc' // Giấy tờ nguồn gốc, GCN, giấy chuyển nhượng viết tay
  | 'witness_statement' // Lời khai nhân chứng, xác nhận của hộ tứ cận
  | 'other'; // Tư liệu khác

export interface DisputeEvidenceItem {
  id: string;
  name: string;
  path?: string;
  url: string;
  contentType: string;
  size: number;
  category: DisputeEvidenceCategory;
  caption?: string; // Ghi chú, chú thích ảnh / tài liệu hiện trường
  locationNote?: string; // Vị trí / Mốc giới (VD: Phía Đông giáp hộ B, Mốc số 1...)
  capturedDate?: string; // Ngày ghi nhận / chụp ảnh tại hiện trường
  uploadedBy?: string;
  uploadedByName?: string;
  uploadedAt: string;
}

export interface DisputeCase {
  id: string;
  code: string; // VD: TC-2026-001
  title: string; // Vụ tranh chấp ranh giới giữa hộ ông A và hộ bà B
  disputeType: DisputeType;
  status: DisputeStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  receivedDate: string; // Ngày tiếp nhận đơn
  deadlineDate: string; // Hạn hòa giải theo luật (30-45 ngày)
  handlerId: string; // Cán bộ thụ lý (Địa chính)
  handlerName: string;
  assignedLeaderId?: string; // Lãnh đạo chỉ đạo (Chủ tịch / Phó CT)
  assignedLeaderName?: string;

  // Thửa đất tranh chấp
  location: string; // Thôn / Địa bàn
  parcel: string; // Thửa đất số
  mapSheet: string; // Tờ bản đồ số
  area: number; // Tổng diện tích thửa đất (m2)
  disputedArea: number; // Diện tích tranh chấp thực tế (m2)
  landType: string; // Loại đất: ONT, CLN, LUC, HNK...
  certificateStatus: 'has_cert' | 'no_cert' | 'in_process' | 'overlap_cert';
  certificateNumber?: string; // Số GCN nếu có
  certificateIssueDate?: string;

  // Các bên liên quan
  partyA: DisputeParty; // Bên khiếu nại / yêu cầu
  partyB: DisputeParty; // Bên bị tranh chấp
  relatedParties?: RelatedParty[]; // Các hộ tứ cận, nhân chứng

  // Hồ sơ xác minh & Báo cáo thẩm tra & Hòa giải
  verificationMinute?: VerificationMinute;
  examinationReport?: ExaminationReport;
  mediationRecord?: MediationRecord;

  // Dữ liệu thu thập hiện trường (ảnh, biên bản lập tại chỗ, sơ đồ đo đạc)
  fieldEvidences?: DisputeEvidenceItem[];

  attachments: Attachment[];
  notes?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 1. QUẢN LÝ QUỸ ĐẤT CÔNG ÍCH (QUỸ ĐẤT 5%)
// Theo Điều 179 Luật Đất đai 2024 / Điều 132 Luật Đất đai 2013
// ==========================================
export type PublicLandStatus =
  | 'available' // Đất công ích chưa cho thuê (đang quản lý trống)
  | 'leased' // Đang cho hộ dân/tổ chức thuê canh tác theo hợp đồng
  | 'expired' // Hợp đồng thuê đã hết hạn (chờ thanh lý / đấu giá lại)
  | 'auctioning' // Đang hoàn thiện hồ sơ tổ chức đấu giá cho thuê
  | 'encroached'; // Đang bị lấn chiếm hoặc có tranh chấp

export type PublicLandPaymentStatus = 'paid' | 'partially_paid' | 'unpaid' | 'overdue';

export interface PublicLandContractPayment {
  id: string;
  year: number;
  amount: number;
  receiptNumber: string;
  paidDate: string;
  note?: string;
}

export interface PublicLandContract {
  id: string;
  contractNumber: string; // VD: 08/HĐTĐ-UBND
  parcelId: string;
  parcelCode?: string;
  parcelNumber: string;
  mapSheet: string;
  area: number;
  location: string;
  tenantName: string;
  tenantCccd: string;
  tenantPhone: string;
  tenantAddress: string;
  signedDate: string;
  startDate: string;
  endDate: string;
  leaseDurationYears: number; // Thường <= 5 năm
  annualRent: number; // Tiền thuê hàng năm (VNĐ)
  totalContractValue: number;
  paymentTerms: string; // Điều khoản nộp tiền
  paymentHistory: PublicLandContractPayment[];
  status: 'active' | 'expiring_soon' | 'expired' | 'terminated';
  notes?: string;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface PublicLandParcel {
  id: string;
  code: string; // VD: CI-001, CI-002
  parcel: string; // Số thửa đất
  mapSheet: string; // Tờ bản đồ số
  location: string; // Xứ đồng / Thôn
  area: number; // Diện tích (m2)
  landType: string; // LUC (lúa), HNK (hoa màu), NTS (thủy sản), CLN (lâu năm), DGT...
  planningPurpose: string; // Mục đích quy hoạch sử dụng đất công ích
  status: PublicLandStatus;
  
  // Hợp đồng thuê hiện tại
  currentContractId?: string;
  contractNumber?: string;
  tenantName?: string;
  tenantCccd?: string;
  tenantPhone?: string;
  tenantAddress?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  leaseDurationYears?: number;
  annualRent: number; // Tiền thuê năm (VNĐ)
  paymentStatus: PublicLandPaymentStatus;
  lastPaymentDate?: string;
  paymentReceiptNumber?: string;

  notes?: string;
  attachments: Attachment[];
  contracts?: PublicLandContract[];
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 2. TRẬT TỰ XÂY DỰNG & VI PHẠM ĐẤT ĐAI
// ==========================================
export type ViolationType =
  | 'illegal_construction' // Xây dựng không phép, sai phép, xây dựng trên đất nông nghiệp
  | 'encroachment' // Lấn, chiếm đất công ích, đất giao thông, thủy lợi
  | 'unauthorized_land_use_change' // Tự ý chuyển mục đích sử dụng đất trái quy định (đất lúa sang đất ở/xưởng...)
  | 'land_destruction' // Hủy hoại đất, hạ thấp/san lấp mặt bằng trái phép
  | 'obstacle_creation' // Đặt vật cản, xây rào chặn lối đi chung
  | 'other'; // Vi phạm khác

export type ViolationStatus =
  | 'detected' // Đang xác minh hiện trường / Lập biên bản kiểm tra
  | 'minute_issued' // Đã lập biên bản VPHC / Đang đình chỉ
  | 'sanction_decided' // Đã ban hành Quyết định xử phạt VPHC
  | 'enforcement_pending' // Quá hạn tự nguyện chấp hành, chuẩn bị cưỡng chế
  | 'enforced' // Đã thực hiện cưỡng chế khắc phục
  | 'resolved' // Đã chấp hành xong (đã nộp phạt & tháo dỡ/khôi phục)
  | 'forwarded_to_district'; // Đã chuyển hồ sơ lên UBND cấp huyện xử phạt theo thẩm quyền

export type ViolationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ViolationEvidenceItem {
  id: string;
  url: string;
  name: string;
  caption: string;
  category: 'photo_violation' | 'minute_scan' | 'decision_scan' | 'restoration_photo';
  uploadedAt: string;
}

export interface LandViolationCase {
  id: string;
  code: string; // VD: VP-2026-001
  title: string; // Tiêu đề vụ việc
  violatorName: string; // Đối tượng vi phạm (chủ hộ / cá nhân / công ty)
  violatorCccd: string;
  violatorPhone: string;
  violatorAddress: string;

  location: string; // Thôn / Vị trí
  parcel: string; // Số thửa
  mapSheet: string; // Tờ bản đồ
  violatedArea: number; // Diện tích vi phạm (m2)
  violationType: ViolationType;
  severity: ViolationSeverity;
  status: ViolationStatus;
  discoveryDate: string; // Ngày phát hiện

  handlerId: string; // Cán bộ thụ lý (Địa chính - Xây dựng)
  handlerName: string;
  assignedLeaderId?: string; // Lãnh đạo chỉ đạo
  assignedLeaderName?: string;

  violationDescription: string; // Chi tiết hành vi vi phạm
  constructionDetails?: string; // Hiện trạng công trình vi phạm (kết cấu, chiều cao, diện tích sàn...)

  // Hồ sơ xử lý VPHC
  inspectionMinuteNumber?: string; // Số BB kiểm tra hiện trường
  inspectionDate?: string;
  minuteNumber?: string; // Số Biên bản VPHC (VD: 04/BB-VPHC)
  minuteDate?: string; // Ngày lập BB VPHC

  sanctionDecisionNumber?: string; // Số Quyết định xử phạt VPHC (VD: 15/QĐ-XPHC)
  sanctionDecisionDate?: string; // Ngày ra Quyết định
  sanctionAuthority?: 'commune' | 'district'; // Cấp có thẩm quyền ra QĐ
  fineAmount: number; // Số tiền xử phạt (VNĐ)
  finePaymentStatus: 'unpaid' | 'paid' | 'delayed';
  finePaymentDate?: string;
  fineReceiptNumber?: string;

  // Biện pháp khắc phục hậu quả
  remedialMeasure: string; // Biện pháp khắc phục (Buộc tháo dỡ công trình, buộc trả lại đất...)
  remedialDeadline?: string; // Thời hạn khắc phục hậu quả
  remedialStatus: 'not_started' | 'in_progress' | 'completed';

  // Cưỡng chế
  enforcementDecisionNumber?: string; // Số Quyết định cưỡng chế (VD: 02/QĐ-CCXP)
  enforcementDecisionDate?: string;
  enforcementPlanDate?: string; // Ngày dự kiến cưỡng chế
  enforcementNotes?: string;

  evidences?: ViolationEvidenceItem[];
  attachments: Attachment[];
  notes?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}



