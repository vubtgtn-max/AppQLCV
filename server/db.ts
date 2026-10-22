import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  Task,
  Dossier,
  CalendarEvent,
  RegisterBook,
  DocumentItem,
  NotificationItem,
  ActivityLog,
  AppSettings,
  AlertMessageLog,
  AlertConfig,
  PendingAlertItem,
  LandProject,
  ProjectHousehold,
  DisputeCase,
  PublicLandParcel,
  PublicLandContract,
  LandViolationCase,
} from '../src/types';
import { standard69Dossiers, standardCadastralTasks } from './standardDossiers';
import { syncToFirestore, loadFromFirestore } from './firestoreSync';

export interface DatabaseSchema {
  users: User[];
  tasks: Task[];
  dossiers: Dossier[];
  calendarEvents: CalendarEvent[];
  registerBooks: RegisterBook[];
  documents: DocumentItem[];
  notifications: NotificationItem[];
  activityLogs: ActivityLog[];
  settings: AppSettings;
  alertLogs: AlertMessageLog[];
  projects: LandProject[];
  disputes?: DisputeCase[];
  publicLands?: PublicLandParcel[];
  violations?: LandViolationCase[];
  deletedDossiers?: Dossier[];
  deletedTasks?: Task[];
  deletedPublicLands?: PublicLandParcel[];
  deletedViolations?: LandViolationCase[];
  deletedDisputes?: DisputeCase[];
  deletedRegisterBooks?: RegisterBook[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
export const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

export const initialUsers: User[] = [
  {
    id: 'user_hoaivu',
    name: 'Đoàn Văn Hoài Vũ',
    username: 'vudvh',
    email: 'vudvh@danang.gov.vn',
    password: 'ln123456',
    role: 'admin',
    status: 'active',
    approved: true,
    position: 'Chuyên viên Đất đai / Quản trị viên (Admin - Quyết định tất cả)',
    phone: '0968489024',
    gender: 'male',
    avatar: '',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-08-21T08:00:00.000Z',
    lastLoginAt: '2026-08-21T08:00:00.000Z',
  },
  {
    id: 'user_maihuy',
    name: 'Mai Huy',
    username: 'huym',
    email: 'huym@danang.gov.vn',
    password: 'ln123456',
    role: 'leader',
    status: 'active',
    approved: true,
    position: 'Trưởng phòng',
    phone: '0905123456',
    gender: 'male',
    avatar: '',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-08-21T08:00:00.000Z',
  },
  {
    id: 'user_volat',
    name: 'Võ Tấn Lạt',
    username: 'latvt',
    email: 'latvt@danang.gov.vn',
    password: 'ln123456',
    role: 'leader',
    status: 'active',
    approved: true,
    position: 'Phó Trưởng phòng',
    phone: '0905234567',
    gender: 'male',
    avatar: '',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-08-21T08:00:00.000Z',
  },
  {
    id: 'user_lieulv',
    name: 'Lê Văn Liệu',
    username: 'lieulv',
    email: 'lieulv@danang.gov.vn',
    password: 'ln123456',
    role: 'specialist',
    status: 'active',
    approved: true,
    position: 'Chuyên viên Đất đai',
    phone: '0905345678',
    gender: 'male',
    avatar: '',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-08-21T08:00:00.000Z',
  },
  {
    id: 'user_lamtv',
    name: 'Trần Văn Lâm',
    username: 'lamtv',
    email: 'lamtv@danang.gov.vn',
    password: 'ln123456',
    role: 'specialist',
    status: 'active',
    approved: true,
    position: 'Chuyên viên Đất đai',
    phone: '0905456789',
    gender: 'male',
    avatar: '',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-08-21T08:00:00.000Z',
  },
  {
    id: 'user_khanvd',
    name: 'Nguyễn Văn Duy Kha',
    username: 'khanvd',
    email: 'khanvd@danang.gov.vn',
    password: 'ln123456',
    role: 'specialist',
    status: 'active',
    approved: true,
    position: 'Chuyên viên Đất đai',
    phone: '0905567890',
    gender: 'male',
    avatar: '',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-08-21T08:00:00.000Z',
  },
  {
    id: 'user_thaottt',
    name: 'Trần Thị Thanh Thảo',
    username: 'thaottt',
    email: 'thaottt@danang.gov.vn',
    password: 'ln123456',
    role: 'specialist',
    status: 'active',
    approved: true,
    position: 'Chuyên viên Đất đai',
    phone: '0905678901',
    gender: 'female',
    avatar: '',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-08-21T08:00:00.000Z',
  },
  {
    id: 'user_huongtv',
    name: 'Trần Văn Hương',
    username: 'huongtv',
    email: 'huongtv@danang.gov.vn',
    password: 'ln123456',
    role: 'specialist',
    status: 'active',
    approved: true,
    position: 'Chuyên viên Đất đai',
    phone: '0905789012',
    gender: 'male',
    avatar: '',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-08-21T08:00:00.000Z',
  },
  {
    id: 'user_tinpt',
    name: 'Phùng Thanh Tín',
    username: 'tinpt',
    email: 'tinpt@danang.gov.vn',
    password: 'ln123456',
    role: 'specialist',
    status: 'active',
    approved: true,
    position: 'Chuyên viên Đất đai',
    phone: '0905890123',
    gender: 'male',
    avatar: '',
    createdAt: '2026-01-01T08:00:00.000Z',
    updatedAt: '2026-08-21T08:00:00.000Z',
  },
];

export const initialTasks: Task[] = [...standardCadastralTasks];

export const initialDossiers: Dossier[] = [...standard69Dossiers];

export const initialCalendar: CalendarEvent[] = [];

export const initialRegisterBooks: RegisterBook[] = [];

export const initialDocuments: DocumentItem[] = [];

export const initialNotifications: NotificationItem[] = [];

export const initialProjects: LandProject[] = [];

export const initialDisputes: DisputeCase[] = [
  {
    "handlerId": "user_hoaivu",
    "partyB": {
      "phone": "",
      "name": "Trần Thị Lệ Xuân",
      "cccd": "",
      "claim": "",
      "address": "Thôn Tiên Hiệp, xã Lãnh Ngọc"
    },
    "deadlineDate": "2026-11-13",
    "title": "Tranh chấp ranh giới thửa 45 thôn Tiên Hiệp",
    "partyA": {
      "address": "Thôn Tiên Hiệp, xã Lãnh Ngọc",
      "claim": "",
      "cccd": "",
      "phone": "0913682065",
      "name": "Trần Bảo"
    },
    "attachments": [],
    "disputeType": "boundary",
    "area": 0,
    "location": "Thôn Tiên Hiệp, xã Lãnh Ngọc",
    "certificateStatus": "has_cert",
    "status": "received",
    "id": "tc_1791074049927_5cdbea90",
    "landType": "Đất ở nông thôn (ONT)",
    "parcel": "",
    "assignedLeaderName": "Võ Tấn Lạt",
    "mapSheet": "",
    "certificateIssueDate": "",
    "code": "TC-2026-004",
    "createdAt": "2026-10-04T00:34:09.927Z",
    "handlerName": "Đoàn Văn Hoài Vũ",
    "createdByName": "Đoàn Văn Hoài Vũ",
    "relatedParties": [],
    "assignedLeaderId": "user_volat",
    "notes": "",
    "priority": "medium",
    "createdBy": "user_hoaivu",
    "receivedDate": "2026-10-03",
    "certificateNumber": "",
    "disputedArea": 0,
    "updatedAt": "2026-10-19T03:40:53.456Z"
  }
];

export const initialPublicLands: PublicLandParcel[] = [
  {
    id: 'publand_001',
    code: 'CI-001',
    parcel: '128',
    mapSheet: '04',
    location: 'Xứ đồng Bàu Cát, Thôn 1',
    area: 4500,
    landType: 'Đất trồng lúa (LUC)',
    planningPurpose: 'Canh tác nông nghiệp lúa 2 vụ chất lượng cao',
    status: 'leased',
    currentContractId: 'contract_001',
    contractNumber: '04/HĐTĐ-UBND',
    tenantName: 'Nguyễn Văn Thành',
    tenantCccd: '048079001234',
    tenantPhone: '0905111222',
    tenantAddress: 'Tổ 2, Thôn 1, xã Lãnh Ngọc',
    leaseStartDate: '2023-01-01',
    leaseEndDate: '2027-12-31',
    leaseDurationYears: 5,
    annualRent: 13500000,
    paymentStatus: 'paid',
    lastPaymentDate: '2026-01-15',
    paymentReceiptNumber: 'BL-2026-0012',
    notes: 'Đấu giá năm 2022, chu kỳ 5 năm. Hộ dân canh tác nghiêm túc, đóng tiền đầy đủ hàng năm vào ngân sách xã.',
    attachments: [],
    contracts: [
      {
        id: 'contract_001',
        contractNumber: '04/HĐTĐ-UBND',
        parcelId: 'publand_001',
        parcelCode: 'CI-001',
        parcelNumber: '128',
        mapSheet: '04',
        area: 4500,
        location: 'Xứ đồng Bàu Cát, Thôn 1',
        tenantName: 'Nguyễn Văn Thành',
        tenantCccd: '048079001234',
        tenantPhone: '0905111222',
        tenantAddress: 'Tổ 2, Thôn 1, xã Lãnh Ngọc',
        signedDate: '2022-12-25',
        startDate: '2023-01-01',
        endDate: '2027-12-31',
        leaseDurationYears: 5,
        annualRent: 13500000,
        totalContractValue: 67500000,
        paymentTerms: 'Nộp 1 lần vào tháng 01 hàng năm tại Ban tài chính xã',
        paymentHistory: [
          { id: 'pay_1', year: 2023, amount: 13500000, receiptNumber: 'BL-2023-0005', paidDate: '2023-01-10' },
          { id: 'pay_2', year: 2024, amount: 13500000, receiptNumber: 'BL-2024-0018', paidDate: '2024-01-12' },
          { id: 'pay_3', year: 2025, amount: 13500000, receiptNumber: 'BL-2025-0011', paidDate: '2025-01-09' },
          { id: 'pay_4', year: 2026, amount: 13500000, receiptNumber: 'BL-2026-0012', paidDate: '2026-01-15' },
        ],
        status: 'active',
        attachments: [],
        createdAt: '2022-12-25T08:00:00.000Z',
        updatedAt: '2026-01-15T09:00:00.000Z',
      },
    ],
    createdBy: 'user_hoaivu',
    createdByName: 'Đoàn Văn Hoài Vũ',
    createdAt: '2026-01-05T08:00:00.000Z',
    updatedAt: '2026-01-15T09:00:00.000Z',
  },
  {
    id: 'publand_002',
    code: 'CI-002',
    parcel: '215',
    mapSheet: '06',
    location: 'Khu Đồng Nà - Bờ Mương, Thôn 2',
    area: 2800,
    landType: 'Đất hoa màu (HNK)',
    planningPurpose: 'Trồng rau sạch và hoa màu ngắn ngày',
    status: 'leased',
    currentContractId: 'contract_002',
    contractNumber: '11/HĐTĐ-UBND',
    tenantName: 'Trần Thị Loan',
    tenantCccd: '048182003456',
    tenantPhone: '0935888999',
    tenantAddress: 'Thôn 2, xã Lãnh Ngọc',
    leaseStartDate: '2021-07-01',
    leaseEndDate: '2026-07-01',
    leaseDurationYears: 5,
    annualRent: 8400000,
    paymentStatus: 'paid',
    lastPaymentDate: '2026-01-20',
    paymentReceiptNumber: 'BL-2026-0045',
    notes: 'Hợp đồng sắp hết hạn vào 01/07/2026! Cần thông báo thanh lý và lập phương án đấu giá mới theo quy định.',
    attachments: [],
    contracts: [
      {
        id: 'contract_002',
        contractNumber: '11/HĐTĐ-UBND',
        parcelId: 'publand_002',
        parcelCode: 'CI-002',
        parcelNumber: '215',
        mapSheet: '06',
        area: 2800,
        location: 'Khu Đồng Nà - Bờ Mương, Thôn 2',
        tenantName: 'Trần Thị Loan',
        tenantCccd: '048182003456',
        tenantPhone: '0935888999',
        tenantAddress: 'Thôn 2, xã Lãnh Ngọc',
        signedDate: '2021-06-25',
        startDate: '2021-07-01',
        endDate: '2026-07-01',
        leaseDurationYears: 5,
        annualRent: 8400000,
        totalContractValue: 42000000,
        paymentTerms: 'Nộp hàng năm trước ngày 30/01',
        paymentHistory: [
          { id: 'pay_21', year: 2026, amount: 8400000, receiptNumber: 'BL-2026-0045', paidDate: '2026-01-20' },
        ],
        status: 'expiring_soon',
        attachments: [],
        createdAt: '2021-06-25T08:00:00.000Z',
        updatedAt: '2026-01-20T08:00:00.000Z',
      },
    ],
    createdBy: 'user_hoaivu',
    createdByName: 'Đoàn Văn Hoài Vũ',
    createdAt: '2026-01-05T08:00:00.000Z',
    updatedAt: '2026-01-20T08:00:00.000Z',
  },
  {
    id: 'publand_003',
    code: 'CI-003',
    parcel: '89',
    mapSheet: '02',
    location: 'Bãi Bồi ven sông, Thôn 3',
    area: 6200,
    landType: 'Nuôi trồng thủy sản (NTS)',
    planningPurpose: 'Đầm nuôi cá nước ngọt kết hợp vịt trời',
    status: 'expired',
    currentContractId: 'contract_003',
    contractNumber: '02/HĐTĐ-UBND',
    tenantName: 'Phan Văn Được',
    tenantCccd: '048075005678',
    tenantPhone: '0913456780',
    tenantAddress: 'Thôn 3, xã Lãnh Ngọc',
    leaseStartDate: '2021-03-01',
    leaseEndDate: '2026-03-01',
    leaseDurationYears: 5,
    annualRent: 18600000,
    paymentStatus: 'paid',
    lastPaymentDate: '2025-02-15',
    paymentReceiptNumber: 'BL-2025-0089',
    notes: 'Hợp đồng đã hết hạn ngày 01/03/2026. Đã kiểm tra hiện trạng bàn giao nguyên trạng hồ cá cho UBND xã quản lý.',
    attachments: [],
    contracts: [],
    createdBy: 'user_hoaivu',
    createdByName: 'Đoàn Văn Hoài Vũ',
    createdAt: '2026-01-05T08:00:00.000Z',
    updatedAt: '2026-03-02T10:00:00.000Z',
  },
  {
    id: 'publand_004',
    code: 'CI-004',
    parcel: '302',
    mapSheet: '09',
    location: 'Gò Mộc Hương, Thôn 4',
    area: 3100,
    landType: 'Cây lâu năm (CLN)',
    planningPurpose: 'Trồng cây ăn quả hoặc cây gỗ bóng mát',
    status: 'available',
    annualRent: 0,
    paymentStatus: 'paid',
    notes: 'Đất trống sạch, không có tranh chấp. UBND xã đang lập phương án đưa vào đấu giá quyền thuê quý 3/2026.',
    attachments: [],
    contracts: [],
    createdBy: 'user_hoaivu',
    createdByName: 'Đoàn Văn Hoài Vũ',
    createdAt: '2026-01-05T08:00:00.000Z',
    updatedAt: '2026-01-05T08:00:00.000Z',
  },
  {
    id: 'publand_005',
    code: 'CI-005',
    parcel: '56',
    mapSheet: '03',
    location: 'Xứ đồng Đồng Lớn, Thôn 1',
    area: 5000,
    landType: 'Đất trồng lúa (LUC)',
    planningPurpose: 'Sản xuất nông nghiệp hữu cơ',
    status: 'auctioning',
    annualRent: 0,
    paymentStatus: 'paid',
    notes: 'Đang niêm yết thông báo đấu giá số 24/TB-UBND từ ngày 15/05/2026. Dự kiến mở thầu ngày 20/06/2026.',
    attachments: [],
    contracts: [],
    createdBy: 'user_hoaivu',
    createdByName: 'Đoàn Văn Hoài Vũ',
    createdAt: '2026-01-05T08:00:00.000Z',
    updatedAt: '2026-05-15T08:00:00.000Z',
  },
  {
    id: 'publand_006',
    code: 'CI-006',
    parcel: '174',
    mapSheet: '05',
    location: 'Ven mương Cây Chanh, Thôn 2',
    area: 850,
    landType: 'Đất nông nghiệp công ích',
    planningPurpose: 'Hành lang bảo vệ mương tưới tiêu và giao thông nội đồng',
    status: 'encroached',
    annualRent: 0,
    paymentStatus: 'unpaid',
    notes: 'Hộ ông Lê Đình H. tự ý căng dây thép gai và trồng chuối. Đã chuyển hồ sơ cho Tổ Trật tự xây dựng & Vi phạm đất đai xử lý.',
    attachments: [],
    contracts: [],
    createdBy: 'user_hoaivu',
    createdByName: 'Đoàn Văn Hoài Vũ',
    createdAt: '2026-01-05T08:00:00.000Z',
    updatedAt: '2026-04-10T14:00:00.000Z',
  },
];

export const initialViolations: LandViolationCase[] = [
  {
    "finePaymentStatus": "unpaid",
    "minuteDate": "2026-01-06",
    "remedialDeadline": "10 ngày kể từ ngày nhận Quyết định",
    "violatorCccd": "049073009884",
    "location": "Thửa đất số 372, Tờ bản đồ số 98 thuộc Thôn 8 xã Lãnh Ngọc, thành phố Đà Nẵng",
    "constructionDetails": "Trồng cây lâu năm trên đất chưa sử dụng do nhà nước quản lý từ năm 2002 đến nay diện tích 177,2 m².",
    "sanctionDecisionDate": "2026-01-15",
    "severity": "medium",
    "violatedArea": 177.2,
    "parcel": "372",
    "violatorPhone": "0905345678",
    "code": "VP-2026-006",
    "status": "resolved",
    "handlerId": "user_hoaivu",
    "mapSheet": "98",
    "evidences": [],
    "title": "Hành vi vi phạm hành chính trong lĩnh vực đất đai đối với hộ ông Trần Năm",
    "assignedLeaderId": "user_thaicongcan",
    "attachments": [],
    "violatorName": "Trần Năm",
    "createdBy": "user_hoaivu",
    "id": "violation_006",
    "discoveryDate": "2026-01-06",
    "violationDescription": "Chiếm đất do cơ quan, tổ chức của Nhà nước đã quản lý, được thể hiện trong hồ sơ địa chính thuộc địa giới hành chính của xã Lãnh Ngọc, thành phố Đà Nẵng. Cụ thể: chiếm đất chưa sử dụng tại thửa đất số 372, tờ bản đồ số 98 với diện tích 177,2 m² (theo hồ sơ địa chính thuộc một phần thửa đất số 18A tờ bản đồ số 98, loại đất Hg) để trồng cây lâu năm từ năm 2002 đến nay.",
    "updatedAt": "2026-10-19T12:38:16.354Z",
    "violationType": "encroachment",
    "minuteNumber": "01/BB-VPHC",
    "notes": "Quyết định xử phạt số 04/QĐ-XPHC đã được ban hành và tống đạt trực tiếp cho ông Trần Năm. Đang đôn đốc nộp tiền và tự tháo dỡ, trả lại đất trong thời hạn 10 ngày.",
    "handlerName": "Đoàn Văn Hoài Vũ",
    "sanctionDecisionNumber": "04/QĐ-XPHC",
    "inspectionDate": "2026-01-06",
    "inspectionMinuteNumber": "01/BB-LV",
    "remedialStatus": "in_progress",
    "createdByName": "Đoàn Văn Hoài Vũ",
    "fineAmount": 4500000,
    "violatorAddress": "Thôn 8 xã Lãnh Ngọc, thành phố Đà Nẵng",
    "sanctionAuthority": "commune",
    "createdAt": "2026-01-06T08:00:00.000Z",
    "remedialMeasure": "Buộc khôi phục lại tình trạng ban đầu của đất trước khi vi phạm; buộc nộp lại số lợi bất hợp pháp có được do thực hiện hành vi vi phạm hành chính với số tiền là 4.311.508 đồng.",
    "assignedLeaderName": "Thái Công Cần"
  }
];

export const initialActivityLogs: ActivityLog[] = [];

export const initialAlertLogs: AlertMessageLog[] = [];

export const defaultAlertConfig: AlertConfig = {
  enabledChannels: {
    zalo: true,
    telegram: true,
    sms: true,
    email: true,
    system: true,
  },
  warningDaysBefore: [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
  autoScanIntervalHours: 1,
  autoScanScheduleText: '2 lần/ngày: Đầu giờ sáng (07:30 - 08:30) & Đầu giờ chiều (13:30 - 14:30) liên tục trong 20 ngày trước hạn',
  zaloOa: {
    oaId: process.env.ZALO_OA_ID || '',
    secretKey: process.env.ZALO_SECRET_KEY || '',
    templateId: 'tpl_nhac_viec_dat_dai_01',
    webhookUrl: 'https://openapi.zalo.me/v2.0/oa/message',
    enabled: true,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatIdDefault: process.env.TELEGRAM_CHAT_ID || '',
    enabled: true,
  },
  emailSmtp: {
    host: 'smtp.danang.gov.vn',
    port: 587,
    senderEmail: 'phongkinhte.ubnd@danang.gov.vn',
    senderName: 'Phòng Kinh tế - Bộ phận Địa chính',
    enabled: true,
  },
  smsGateway: {
    provider: 'VNPT_Brandname_UBND',
    senderBrand: 'UBND_LANHNGO',
    enabled: true,
  },
  templates: {
    taskWarning:
      '🔔 [CẢNH BÁO HẠN NHIỆM VỤ] Đ/c {ten_can_bo}: Nhiệm vụ [{ma_cong_viec}] "{ten_cong_viec}" còn {so_ngay_con_lai} ngày nữa đến hạn ({han_xu_ly}). Đề nghị khẩn trương hoàn thành hồ sơ, báo cáo Lãnh đạo phòng.',
    dossierWarning:
      '📁 [CẢNH BÁO HỒ SƠ ĐẤT ĐAI] Đ/c {ten_can_bo}: Hồ sơ [{ma_ho_so}] của chủ hộ {chu_ho} (Thửa {thua_dat}, TBĐ {to_ban_do}) sắp đến hạn trả kết quả vào ngày {han_xu_ly} (còn {so_ngay_con_lai} ngày). Yêu cầu kiểm tra thẩm tra, không để trễ hạn.',
    urgentAlert:
      '🚨 [NHIỆM VỤ KHẨN CẤP] Đ/c {ten_can_bo}: Lãnh đạo vừa giao nhiệm vụ HỎA TỐC [{ma_cong_viec}] "{ten_cong_viec}". Hạn xử lý: {han_xu_ly}. Vui lòng tiếp nhận và xử lý ngay.',
    overdueAlert:
      '⚠️ [CẢNH BÁO QUÁ HẠN] Đ/c {ten_can_bo}: Hồ sơ/Nhiệm vụ [{ma_cong_viec}] đã QUÁ HẠN {so_ngay_qua_han} ngày (Hạn: {han_xu_ly}). Đề nghị báo cáo giải trình và xử lý dứt điểm.',
  },
};

export const DEFAULT_LANH_NGOC_VILLAGES: string[] = [
  'Thôn Tiên Hiệp',
  'Thôn Hòa Hiệp',
  'Thôn Tiên Ngọc',
  'Thôn Hòa Đồng',
  'Thôn Tiên Lãnh',
  'Thôn Hòa Bình',
  'Thôn Sông Tranh',
];

export const initialSettings: AppSettings = {
  unitName: 'Bộ phận Quản lý Đất đai & Địa chính',
  parentOrganization: 'UBND Thành phố Đà Nẵng / UBND Huyện',
  deadlineWarningDays: 20,
  autoNotifyDeadline: true,
  allowPublicRegister: true,
  allowClerkDossiers: true,
  alertConfig: defaultAlertConfig,
  villages: [...DEFAULT_LANH_NGOC_VILLAGES],
};

export class Database {
  private static instance: Database;
  private data: DatabaseSchema;
  private writeQueue: Promise<void> = Promise.resolve();
  private mutationLockQueue: Promise<any> = Promise.resolve();
  private stateVersion: number = 0;
  private readonly META_FILE = path.join(DATA_DIR, 'db.meta.json');
  private readyPromise: Promise<void>;
  private resolveReady!: () => void;
  private isHydrated: boolean = false;

  private constructor() {
    this.readyPromise = new Promise<void>((resolve) => {
      this.resolveReady = resolve;
    });
    this.initMetadata();
    this.data = this.load();
    this.hydrateFromFirestoreAsync().finally(() => {
      this.isHydrated = true;
      this.resolveReady();
    });
  }

  public async waitUntilReady(timeoutMs: number = 8000): Promise<void> {
    if (this.isHydrated) return;
    return Promise.race([
      this.readyPromise,
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  }

  public isReady(): boolean {
    return this.isHydrated;
  }

  public reloadFromDisk(): void {
    this.data = this.load();
    this.saveDirect(this.data);
    console.log(`[DB_RELOAD] Reloaded state from disk. Dossiers: ${this.data.dossiers?.length || 0}`);
  }

  private async hydrateFromFirestoreAsync(): Promise<void> {
    try {
      const cloud = await loadFromFirestore();
      if (!cloud) {
        this.isHydrated = true;
        return;
      }

      let hasUpdates = false;

      // 1. Smart Merge Projects: Cloud state is master, local new items preserved
      if (Array.isArray(cloud.projects) && cloud.projects.length > 0) {
        const localMap = new Map<string, LandProject>();
        (this.data.projects || []).forEach((p) => {
          if (p.id) localMap.set(p.id, p);
          if (p.code) localMap.set(p.code, p);
        });

        const mergedProjects: LandProject[] = [];
        const seenKeys = new Set<string>();

        for (const cp of cloud.projects) {
          if (!cp || (!cp.id && !cp.code)) continue;
          const existing = localMap.get(cp.id) || (cp.code ? localMap.get(cp.code) : undefined);
          if (existing) {
            // Cloud version takes priority to preserve edits across machine reboot
            mergedProjects.push({ ...existing, ...cp });
          } else {
            mergedProjects.push(cp);
          }
          if (cp.id) seenKeys.add(cp.id);
          if (cp.code) seenKeys.add(cp.code);
        }

        for (const lp of this.data.projects || []) {
          if ((lp.id && seenKeys.has(lp.id)) || (lp.code && seenKeys.has(lp.code))) continue;
          mergedProjects.push(lp);
        }

        this.data.projects = mergedProjects;
        hasUpdates = true;
      }

      // 2. Smart Merge Public Lands (5%): Cloud state is master
      if (Array.isArray(cloud.publicLands)) {
        if (Array.isArray(cloud.deletedPublicLands)) {
          this.data.deletedPublicLands = cloud.deletedPublicLands;
        }
        const delIds = new Set((this.data.deletedPublicLands || []).map((p) => p.id));
        const delCodes = new Set((this.data.deletedPublicLands || []).map((p) => p.code).filter(Boolean));

        const localMap = new Map<string, PublicLandParcel>();
        (this.data.publicLands || []).forEach((p) => {
          if (p.id) localMap.set(p.id, p);
          if (p.code) localMap.set(p.code, p);
        });

        const merged: PublicLandParcel[] = [];
        const seenKeys = new Set<string>();

        for (const cp of cloud.publicLands) {
          if (!cp || (!cp.id && !cp.code)) continue;
          if (delIds.has(cp.id) || (cp.code && delCodes.has(cp.code))) continue;
          const existing = localMap.get(cp.id) || (cp.code ? localMap.get(cp.code) : undefined);
          if (existing) {
            merged.push({ ...existing, ...cp });
          } else {
            merged.push(cp);
          }
          if (cp.id) seenKeys.add(cp.id);
          if (cp.code) seenKeys.add(cp.code);
        }

        for (const lp of this.data.publicLands || []) {
          if (delIds.has(lp.id) || (lp.code && delCodes.has(lp.code))) continue;
          if ((lp.id && seenKeys.has(lp.id)) || (lp.code && seenKeys.has(lp.code))) continue;
          merged.push(lp);
        }

        // Un-tombstone any active parcel codes from deletedPublicLands
        const activePubCodes = new Set(merged.map((p) => p.code).filter(Boolean));
        this.data.deletedPublicLands = (this.data.deletedPublicLands || []).filter(
          (p) => !activePubCodes.has(p.code)
        );

        this.data.publicLands = merged;
        hasUpdates = true;
      }

      // 3. Smart Merge Violations: Cloud state is master
      if (Array.isArray(cloud.violations)) {
        if (Array.isArray(cloud.deletedViolations)) {
          this.data.deletedViolations = cloud.deletedViolations;
        }
        const delIds = new Set((this.data.deletedViolations || []).map((v) => v.id));
        const delCodes = new Set((this.data.deletedViolations || []).map((v) => v.code).filter(Boolean));

        const localMap = new Map<string, LandViolationCase>();
        (this.data.violations || []).forEach((v) => {
          if (v.id) localMap.set(v.id, v);
          if (v.code) localMap.set(v.code, v);
        });

        const merged: LandViolationCase[] = [];
        const seenKeys = new Set<string>();

        for (const cv of cloud.violations) {
          if (!cv || (!cv.id && !cv.code)) continue;
          if (delIds.has(cv.id) || (cv.code && delCodes.has(cv.code))) continue;
          const existing = localMap.get(cv.id) || (cv.code ? localMap.get(cv.code) : undefined);
          if (existing) {
            merged.push({ ...existing, ...cv });
          } else {
            merged.push(cv);
          }
          if (cv.id) seenKeys.add(cv.id);
          if (cv.code) seenKeys.add(cv.code);
        }

        for (const lv of this.data.violations || []) {
          if (delIds.has(lv.id) || (lv.code && delCodes.has(lv.code))) continue;
          if ((lv.id && seenKeys.has(lv.id)) || (lv.code && seenKeys.has(lv.code))) continue;
          merged.push(lv);
        }

        // Un-tombstone any active violation codes from deletedViolations
        const activeViolCodes = new Set(merged.map((v) => v.code).filter(Boolean));
        this.data.deletedViolations = (this.data.deletedViolations || []).filter(
          (v) => !activeViolCodes.has(v.code)
        );

        this.data.violations = merged;
        hasUpdates = true;
      }

      // 4. Smart Merge Disputes: Cloud state is master
      if (Array.isArray(cloud.disputes)) {
        if (Array.isArray(cloud.deletedDisputes)) {
          this.data.deletedDisputes = cloud.deletedDisputes;
        }
        const delIds = new Set((this.data.deletedDisputes || []).map((d) => d.id));
        const delCodes = new Set((this.data.deletedDisputes || []).map((d) => d.code).filter(Boolean));

        const localMap = new Map<string, DisputeCase>();
        (this.data.disputes || []).forEach((d) => {
          if (d.id) localMap.set(d.id, d);
          if (d.code) localMap.set(d.code, d);
        });

        const merged: DisputeCase[] = [];
        const seenKeys = new Set<string>();

        for (const cd of cloud.disputes) {
          if (!cd || (!cd.id && !cd.code)) continue;
          if (delIds.has(cd.id) || (cd.code && delCodes.has(cd.code))) continue;
          const existing = localMap.get(cd.id) || (cd.code ? localMap.get(cd.code) : undefined);
          if (existing) {
            merged.push({ ...existing, ...cd });
          } else {
            merged.push(cd);
          }
          if (cd.id) seenKeys.add(cd.id);
          if (cd.code) seenKeys.add(cd.code);
        }

        for (const ld of this.data.disputes || []) {
          if (delIds.has(ld.id) || (ld.code && delCodes.has(ld.code))) continue;
          if ((ld.id && seenKeys.has(ld.id)) || (ld.code && seenKeys.has(ld.code))) continue;
          merged.push(ld);
        }

        this.data.disputes = merged;
        hasUpdates = true;
      }

      // 5. Smart Merge Dossiers: Cloud state is 100% master to guarantee user edits survive machine reboot
      if (Array.isArray(cloud.dossiers) && cloud.dossiers.length > 0) {
        if (Array.isArray(cloud.deletedDossiers)) {
          this.data.deletedDossiers = cloud.deletedDossiers;
        }
        const delIds = new Set((this.data.deletedDossiers || []).map((d) => d.id));
        const delCodes = new Set((this.data.deletedDossiers || []).map((d) => d.code).filter(Boolean));

        const localMap = new Map<string, Dossier>();
        (this.data.dossiers || []).forEach((d) => {
          if (d.id) localMap.set(d.id, d);
          if (d.code) localMap.set(d.code, d);
        });

        const merged: Dossier[] = [];
        const seenKeys = new Set<string>();

        // Process all cloud dossiers: cloud edits always win over initial local template
        for (const cd of cloud.dossiers) {
          if (!cd || (!cd.id && !cd.code) || cd.id?.startsWith('dos_kep')) continue;
          if (delIds.has(cd.id) || (cd.code && delCodes.has(cd.code))) continue;

          const existing = localMap.get(cd.id) || (cd.code ? localMap.get(cd.code) : undefined);
          if (existing) {
            merged.push({ ...existing, ...cd });
          } else {
            merged.push(cd);
          }
          if (cd.id) seenKeys.add(cd.id);
          if (cd.code) seenKeys.add(cd.code);
        }

        // Keep any locally created dossiers that are not in cloud yet
        for (const ld of this.data.dossiers || []) {
          if (delIds.has(ld.id) || (ld.code && delCodes.has(ld.code))) continue;
          if ((ld.id && seenKeys.has(ld.id)) || (ld.code && seenKeys.has(ld.code))) continue;
          if (ld.id?.startsWith('dos_kep')) continue; // Never merge legacy template entries into canonical dossiers
          merged.push(ld);
          if (ld.id) seenKeys.add(ld.id);
          if (ld.code) seenKeys.add(ld.code);
        }

        this.data.dossiers = merged;
        hasUpdates = true;
      }

      // 6. Smart Merge Tasks: Cloud state is 100% master to guarantee user edits survive machine reboot
      if (Array.isArray(cloud.tasks)) {
        if (Array.isArray(cloud.deletedTasks)) {
          this.data.deletedTasks = cloud.deletedTasks;
        }
        const delIds = new Set((this.data.deletedTasks || []).map((t) => t.id));
        const delCodes = new Set((this.data.deletedTasks || []).map((t) => t.code).filter(Boolean));

        const localMap = new Map<string, Task>();
        (this.data.tasks || []).forEach((t) => {
          if (t.id) localMap.set(t.id, t);
          if (t.code) localMap.set(t.code, t);
        });

        const merged: Task[] = [];
        const seenKeys = new Set<string>();

        for (const ct of cloud.tasks) {
          if (!ct || (!ct.id && !ct.code)) continue;
          if (delIds.has(ct.id) || (ct.code && delCodes.has(ct.code))) continue;

          const existing = localMap.get(ct.id) || (ct.code ? localMap.get(ct.code) : undefined);
          if (existing) {
            merged.push({ ...existing, ...ct });
          } else {
            merged.push(ct);
          }
          if (ct.id) seenKeys.add(ct.id);
          if (ct.code) seenKeys.add(ct.code);
        }

        for (const lt of this.data.tasks || []) {
          if (delIds.has(lt.id) || (lt.code && delCodes.has(lt.code))) continue;
          if ((lt.id && seenKeys.has(lt.id)) || (lt.code && seenKeys.has(lt.code))) continue;
          merged.push(lt);
          if (lt.id) seenKeys.add(lt.id);
          if (lt.code) seenKeys.add(lt.code);
        }

        this.data.tasks = merged;
        hasUpdates = true;
      }

      // 7. Merge Calendar Events
      if (Array.isArray(cloud.calendarEvents) && cloud.calendarEvents.length > 0) {
        this.data.calendarEvents = cloud.calendarEvents;
        hasUpdates = true;
      }

      // 8. Smart Merge Register Books: preserve both cloud items and any local items with tombstone tracking
      if (Array.isArray(cloud.registerBooks)) {
        if (Array.isArray(cloud.deletedRegisterBooks)) {
          this.data.deletedRegisterBooks = cloud.deletedRegisterBooks;
        }
        const delIds = new Set((this.data.deletedRegisterBooks || []).map((b) => b.id));

        const localMap = new Map<string, RegisterBook>();
        (this.data.registerBooks || []).forEach((b) => {
          if (b.id) localMap.set(b.id, b);
        });

        const merged: RegisterBook[] = [];
        const seenIds = new Set<string>();

        for (const cb of cloud.registerBooks) {
          if (!cb || !cb.id || delIds.has(cb.id)) continue;
          const existing = localMap.get(cb.id);
          if (existing) {
            const tCloud = new Date(cb.updatedAt || cb.createdAt || 0).getTime();
            const tLocal = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
            merged.push(tCloud >= tLocal ? { ...existing, ...cb } : { ...cb, ...existing });
          } else {
            merged.push(cb);
          }
          seenIds.add(cb.id);
        }

        for (const lb of this.data.registerBooks || []) {
          if (!lb?.id || delIds.has(lb.id) || seenIds.has(lb.id)) continue;
          merged.push(lb);
          seenIds.add(lb.id);
        }

        this.data.registerBooks = merged;
        hasUpdates = true;
      }

      // 9. Merge Documents
      if (Array.isArray(cloud.documents) && cloud.documents.length > 0) {
        this.data.documents = cloud.documents;
        hasUpdates = true;
      }

      // 10. Merge Users
      if (Array.isArray(cloud.users) && cloud.users.length > 0) {
        this.data.users = cloud.users;
        hasUpdates = true;
      }

      // 11. Merge settings if provided
      if (cloud.settings && typeof cloud.settings === 'object') {
        this.data.settings = { ...this.data.settings, ...cloud.settings };
        hasUpdates = true;
      }

      this.isHydrated = true;

      if (hasUpdates) {
        this.saveDirect(this.data);
        console.log('[FIRESTORE_HYDRATE] Cloud state successfully integrated into active memory and local disk with 100% edit retention!');
      }
    } catch (err: any) {
      console.warn('[FIRESTORE_HYDRATE_ERROR]', err?.message || err);
    } finally {
      this.isHydrated = true;
    }
  }

  private initMetadata(): void {
    try {
      if (fs.existsSync(this.META_FILE)) {
        const raw = fs.readFileSync(this.META_FILE, 'utf-8');
        const meta = JSON.parse(raw);
        if (typeof meta.stateVersion === 'number' && !isNaN(meta.stateVersion)) {
          this.stateVersion = meta.stateVersion;
        } else {
          this.stateVersion = 1;
        }
      } else {
        this.stateVersion = 1;
        this.saveMetadata();
      }
    } catch (e) {
      this.stateVersion = 1;
    }
  }

  private saveMetadata(): void {
    try {
      const meta = {
        stateVersion: this.stateVersion,
        lastSavedAt: new Date().toISOString(),
      };
      const tempMeta = `${this.META_FILE}.tmp.${Date.now()}_${process.pid}_${crypto.randomBytes(4).toString('hex')}`;
      fs.writeFileSync(tempMeta, JSON.stringify(meta, null, 2), 'utf-8');
      fs.renameSync(tempMeta, this.META_FILE);
    } catch (e) {
      console.warn('[META_SAVE_WARN] Could not save db.meta.json:', e);
    }
  }

  public getStateVersion(): number {
    return this.stateVersion;
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private tryRecoverFromBackups(): DatabaseSchema | null {
    try {
      // 1. Check synchronous safety mirror
      const bakFile = `${DB_FILE}.bak`;
      if (fs.existsSync(bakFile)) {
        try {
          const raw = fs.readFileSync(bakFile, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.dossiers) && parsed.dossiers.length > 0) {
            console.log(`[BACKUP_RECOVERY] Restored ${parsed.dossiers.length} dossiers from ${path.basename(bakFile)}`);
            return parsed;
          }
        } catch (_) {}
      }

      // 2. Check phase3b safety backup
      const phaseBackup = path.join(DATA_DIR, 'db.json.phase3b_safety_backup');
      if (fs.existsSync(phaseBackup)) {
        try {
          const raw = fs.readFileSync(phaseBackup, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.dossiers) && parsed.dossiers.length > 0) {
            console.log(`[BACKUP_RECOVERY] Restored ${parsed.dossiers.length} dossiers from phase3b backup`);
            return parsed;
          }
        } catch (_) {}
      }

      // 3. Search rolling backups in data/backups/
      if (fs.existsSync(BACKUPS_DIR)) {
        const files = fs.readdirSync(BACKUPS_DIR)
          .filter((f) => f.endsWith('.json') && f !== 'db.json.PRE_FIX_BACKUP')
          .map((f) => ({
            name: f,
            path: path.join(BACKUPS_DIR, f),
            mtime: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime(),
          }))
          .sort((a, b) => b.mtime - a.mtime);

        for (const file of files) {
          try {
            const raw = fs.readFileSync(file.path, 'utf-8');
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.dossiers) && parsed.dossiers.length > 0) {
              console.log(`[BACKUP_RECOVERY] Restored ${parsed.dossiers.length} dossiers from backup file ${file.name}`);
              return parsed;
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      console.warn('[BACKUP_RECOVERY_ERROR]', e);
    }
    return null;
  }

  private load(): DatabaseSchema {
    let parsed: DatabaseSchema | null = null;

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        parsed = JSON.parse(raw);
      } catch (err) {
        console.error('Error reading db.json, attempting backup recovery:', err);
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      parsed = this.tryRecoverFromBackups();
    }

    if (!parsed) {
      const initial: DatabaseSchema = {
        users: initialUsers,
        tasks: [],
        dossiers: [...initialDossiers],
        calendarEvents: initialCalendar,
        registerBooks: initialRegisterBooks,
        documents: initialDocuments,
        notifications: initialNotifications,
        activityLogs: initialActivityLogs,
        settings: initialSettings,
        alertLogs: initialAlertLogs,
        projects: initialProjects,
        disputes: [...initialDisputes],
        deletedDossiers: [],
        deletedTasks: [],
      };
      this.saveDirect(initial);
      return initial;
    }

    if (!Array.isArray(parsed.deletedDossiers)) {
      parsed.deletedDossiers = [];
    }
    if (!Array.isArray(parsed.deletedTasks)) {
      parsed.deletedTasks = [];
    }

    // Ensure valid users array and retain admin Hoài Vũ without discarding data
    if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
      parsed.users = [...initialUsers];
    } else {
      parsed.users = parsed.users
        .filter((u) => {
          const nameLower = (u.name || '').toLowerCase();
          const usernameLower = (u.username || '').toLowerCase();
          return !nameLower.includes('trần văn toàn') && !usernameLower.includes('toantv') && !usernameLower.includes('toan');
        })
        .map((u) => ({
          ...u,
          password: u.password || 'ln123456',
        }));

      const hasHoaiVu = parsed.users.some((u) => u.username === 'vudvh' || u.id === 'user_hoaivu');
      if (!hasHoaiVu) {
        parsed.users.unshift(initialUsers[0]);
      }
    }

    if (!parsed.alertLogs || !Array.isArray(parsed.alertLogs)) {
      parsed.alertLogs = initialAlertLogs;
    }
    if (!parsed.settings) {
      parsed.settings = initialSettings;
    }
    parsed.settings.deadlineWarningDays = parsed.settings.deadlineWarningDays || 20;
    parsed.settings.autoNotifyDeadline = parsed.settings.autoNotifyDeadline !== false;

    if (!parsed.settings.alertConfig) {
      parsed.settings.alertConfig = defaultAlertConfig;
    } else {
      parsed.settings.alertConfig.warningDaysBefore = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
      parsed.settings.alertConfig.autoScanScheduleText = '2 lần/ngày: Đầu giờ sáng (07:30 - 08:30) & Đầu giờ chiều (13:30 - 14:30) liên tục trong 20 ngày trước hạn';
      if (!parsed.settings.alertConfig.telegram) {
        parsed.settings.alertConfig.telegram = {
          botToken: process.env.TELEGRAM_BOT_TOKEN || '',
          chatIdDefault: process.env.TELEGRAM_CHAT_ID || '',
          enabled: true,
        };
      }
    }

    if (!parsed.settings.villages || !Array.isArray(parsed.settings.villages) || parsed.settings.villages.length === 0) {
      parsed.settings.villages = [...DEFAULT_LANH_NGOC_VILLAGES];
    } else {
      for (const v of DEFAULT_LANH_NGOC_VILLAGES) {
        if (!parsed.settings.villages.includes(v)) {
          parsed.settings.villages.push(v);
        }
      }
    }

    // Ensure dossiers and tasks arrays exist
    if (!Array.isArray(parsed.dossiers)) {
      const recovered = this.tryRecoverFromBackups();
      if (recovered && Array.isArray(recovered.dossiers) && recovered.dossiers.length > 0) {
        parsed.dossiers = recovered.dossiers;
      } else {
        parsed.dossiers = [...standard69Dossiers];
      }
    }

    if (!Array.isArray(parsed.tasks)) {
      parsed.tasks = [];
    }

    // Permanently purge any deleted dossiers or tasks from parsed lists
    const deletedDossierIds = new Set(parsed.deletedDossiers.map((d) => d.id));
    const deletedDossierCodes = new Set(parsed.deletedDossiers.map((d) => d.code).filter(Boolean));
    parsed.dossiers = (parsed.dossiers || []).filter(
      (d) => !deletedDossierIds.has(d.id) && (!d.code || !deletedDossierCodes.has(d.code)) && !d.id?.startsWith('dos_kep')
    );

    const deletedTaskIds = new Set(parsed.deletedTasks.map((t) => t.id));
    const deletedTaskCodes = new Set(parsed.deletedTasks.map((t) => t.code).filter(Boolean));
    parsed.tasks = (parsed.tasks || []).filter(
      (t) => !deletedTaskIds.has(t.id) && (!t.code || !deletedTaskCodes.has(t.code))
    );

    // Sanitize dossiers: remove old binders, ensure supplement status is preserved, and normalize dates
    const normalizeDbDate = (val: any, fallback: string): string => {
      if (val === null || val === undefined || String(val).trim() === '') return fallback;
      const num = Number(val);
      if (!isNaN(num) && num > 10000 && num < 100000) {
        // Excel serial number (e.g. 46157 = 2026-05-15)
        const utcDays = Math.floor(num - 25569);
        const dt = new Date(utcDays * 86400 * 1000);
        const y = dt.getUTCFullYear();
        const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dt.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      const str = String(val).trim();
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
        const parts = str.split('/');
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      if (/^\d{4}-\d{1,2}-\d{1,2}/.test(str)) {
        const p = str.split('T')[0].split('-');
        const y = Number(p[0]);
        if (y > 3000) {
          if (y > 10000 && y < 100000) {
            const utcDays = Math.floor(y - 25569);
            const dt = new Date(utcDays * 86400 * 1000);
            return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
          }
          return fallback;
        }
        return `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`;
      }
      const parsedDate = new Date(str);
      if (!isNaN(parsedDate.getTime())) {
        const y = parsedDate.getFullYear();
        if (y > 3000 || y < 1900) return fallback;
        return `${y}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
      }
      return fallback;
    };

    const defaultToday = new Date().toISOString().split('T')[0];
    const defaultDue = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

    parsed.dossiers = parsed.dossiers.map((dos: Dossier) => {
      let folder = (dos.storageFolder || '').trim();
      if (folder && !['Kẹp 1', 'Kẹp 2', 'Kẹp 3'].includes(folder)) {
        if (folder.includes('15') || folder.includes('01') || folder.includes('1')) {
          folder = 'Kẹp 1';
        } else if (folder.includes('8') || folder.includes('08') || folder.includes('2') || folder.includes('02')) {
          folder = 'Kẹp 2';
        } else if (folder.includes('3') || folder.includes('03')) {
          folder = 'Kẹp 3';
        } else {
          folder = 'Kẹp 1';
        }
      }
      let status = dos.status;
      if (dos.supplementDate && !dos.resumedDate && status !== 'resolved' && status !== 'in_progress') {
        status = 'supplement';
      }
      return {
        ...dos,
        receivedDate: normalizeDbDate(dos.receivedDate, defaultToday),
        dueDate: normalizeDbDate(dos.dueDate, defaultDue),
        status,
        storageFolder: folder || 'Kẹp 1',
      };
    });

    parsed.tasks = parsed.tasks.map((t: Task) => ({
      ...t,
      startDate: normalizeDbDate(t.startDate, defaultToday),
      dueDate: normalizeDbDate(t.dueDate, defaultDue),
    }));

    if (!Array.isArray(parsed.calendarEvents)) {
      parsed.calendarEvents = [];
    }
    if (!Array.isArray(parsed.registerBooks)) {
      parsed.registerBooks = [];
    }
    if (!Array.isArray(parsed.documents)) {
      parsed.documents = [];
    }
    if (!Array.isArray(parsed.notifications)) {
      parsed.notifications = [];
    }
    if (!Array.isArray(parsed.projects)) {
      parsed.projects = [];
    }
    if (!Array.isArray(parsed.publicLands)) {
      parsed.publicLands = [];
    }
    if (!Array.isArray(parsed.violations)) {
      parsed.violations = [];
    }
    if (!Array.isArray(parsed.deletedDossiers)) {
      parsed.deletedDossiers = [];
    }
    if (!Array.isArray(parsed.deletedTasks)) {
      parsed.deletedTasks = [];
    }
    if (!Array.isArray(parsed.deletedPublicLands)) {
      parsed.deletedPublicLands = [];
    }
    if (!Array.isArray(parsed.deletedViolations)) {
      parsed.deletedViolations = [];
    }
    if (!Array.isArray(parsed.deletedDisputes)) {
      parsed.deletedDisputes = [];
    }

    const deletedDispIds = new Set(parsed.deletedDisputes.map((d: any) => d.id));

    if (!Array.isArray(parsed.disputes) || parsed.disputes.length === 0) {
      const deletedDispCodes = new Set(parsed.deletedDisputes.map((d: any) => d.code).filter(Boolean));
      parsed.disputes = initialDisputes.filter(
        (d) => !deletedDispIds.has(d.id) && (!d.code || !deletedDispCodes.has(d.code))
      );
    } else {
      parsed.disputes = (parsed.disputes || []).filter((d: any) => !deletedDispIds.has(d.id));
      const activeDispCodes = new Set(parsed.disputes.map((d: any) => d.code).filter(Boolean));
      parsed.deletedDisputes = parsed.deletedDisputes.filter(
        (d: any) => !activeDispCodes.has(d.code)
      );
    }

    // Permanently purge any deleted public lands
    const deletedPubLandIds = new Set(parsed.deletedPublicLands.map((p: any) => p.id));
    parsed.publicLands = (parsed.publicLands || []).filter((p: any) => !deletedPubLandIds.has(p.id));
    const activePubLandCodes = new Set(parsed.publicLands.map((p: any) => p.code).filter(Boolean));
    parsed.deletedPublicLands = parsed.deletedPublicLands.filter(
      (p: any) => !activePubLandCodes.has(p.code)
    );

    // Populate or purge violations
    const deletedViolationIds = new Set(parsed.deletedViolations.map((v: any) => v.id));
    parsed.violations = (parsed.violations || []).filter((v: any) => !deletedViolationIds.has(v.id));
    const activeViolCodes = new Set(parsed.violations.map((v: any) => v.code).filter(Boolean));
    parsed.deletedViolations = parsed.deletedViolations.filter(
      (v: any) => !activeViolCodes.has(v.code)
    );

    // Ensure all violations have strictly unique IDs and codes
    const seenViolationIds = new Set<string>();
    const seenViolationCodes = new Set<string>();
    parsed.violations = (parsed.violations || []).filter((v: any) => {
      if (!v) return false;
      const id = v.id;
      const code = v.code;
      if (id && seenViolationIds.has(id)) return false;
      if (code && seenViolationCodes.has(code)) return false;
      if (id) seenViolationIds.add(id);
      if (code) seenViolationCodes.add(code);
      return true;
    });

    this.saveDirect(parsed);
    return parsed;
  }

  private lastBackupTime: number = 0;

  public async save(): Promise<void> {
    if (!this.isHydrated) {
      await this.waitUntilReady(8000);
    }
    return new Promise<void>((resolve, reject) => {
      this.writeQueue = this.writeQueue
        .catch(() => {}) // Ensure previous failures in the queue do not freeze subsequent saves
        .then(async () => {
          try {
            await this.executeAtomicSave();
            resolve();
          } catch (err) {
            reject(err);
          }
        });
    });
  }

  /**
   * Run a critical read-modify-write mutation block exclusively in FIFO order
   * to guarantee zero lost updates between concurrent operations.
   */
  public async runInMutationLock<T>(fn: () => Promise<T>): Promise<T> {
    let release: () => void;
    const prev = this.mutationLockQueue;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.mutationLockQueue = current;
    try {
      await prev.catch(() => {});
      return await fn();
    } finally {
      release!();
    }
  }

  private async executeAtomicSave(): Promise<void> {
    const startTime = Date.now();
    const nextVersion = this.stateVersion + 1;
    const MAX_TEMP_RETRIES = 3;

    let tempFile = '';
    let fd: number | null = null;
    let createdTempFile = false;

    // Exclusive file creation with 'wx' (O_CREAT | O_EXCL) to prevent overwriting existing files
    let lastOpenError: any = null;
    for (let attempt = 1; attempt <= MAX_TEMP_RETRIES; attempt++) {
      const rand = crypto.randomBytes(8).toString('hex');
      tempFile = path.join(DATA_DIR, `.db.tmp.${Date.now()}_${process.pid}_${rand}`);
      try {
        fd = fs.openSync(tempFile, 'wx');
        createdTempFile = true;
        break; // Successfully opened exclusively
      } catch (openErr: any) {
        lastOpenError = openErr;
        if (openErr?.code === 'EEXIST') {
          console.warn(`[TEMP_COLLISION] Attempt ${attempt}/${MAX_TEMP_RETRIES} collision on ${path.basename(tempFile)}. Retrying with new path...`);
          // Collision: file belongs to another operation or pre-exists; do NOT overwrite or delete it
          fd = null;
          continue;
        }
        // Non-EEXIST error during open
        throw openErr;
      }
    }

    if (!createdTempFile || fd === null) {
      throw new Error(`[SAVE_FAILED_COLLISION] Failed to create exclusive temp file after ${MAX_TEMP_RETRIES} attempts. Last error: ${lastOpenError?.message || lastOpenError}`);
    }

    console.log(`[SAVE_START] Version=${nextVersion}, PID=${process.pid}, TempFile=${path.basename(tempFile)}`);

    try {
      const content = JSON.stringify(this.data, null, 2);
      const contentBuffer = Buffer.from(content, 'utf-8');

      // Safe file descriptor lifecycle: write -> fsync -> close
      fs.writeSync(fd, contentBuffer, 0, contentBuffer.length, 0);
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fd = null;

      // Atomic rename
      fs.renameSync(tempFile, DB_FILE);
      createdTempFile = false; // Successfully committed as DB_FILE

      // Redundant safety mirror for catastrophe recovery across sudden process exit
      try {
        fs.copyFileSync(DB_FILE, `${DB_FILE}.bak`);
      } catch (_) {}

      // Only increment version after successful disk commit
      this.stateVersion = nextVersion;
      this.saveMetadata();

      const duration = Date.now() - startTime;
      console.log(`[SAVE_SUCCESS] Version=${this.stateVersion}, Size=${contentBuffer.length} bytes, Duration=${duration}ms`);

      this.triggerAutoBackupIfNeeded();

      // Trigger Cloud Firestore persistence asynchronously so HTTP requests respond immediately after atomic disk commit
      syncToFirestore(this.data).catch((cloudErr) => {
        console.warn('[FIRESTORE_SYNC_WARNING]', cloudErr);
      });
    } catch (err: any) {
      const duration = Date.now() - startTime;
      console.error(`[SAVE_FAILED] Version=${nextVersion}, Duration=${duration}ms, Error=${err?.message || err}`);

      if (fd !== null) {
        try {
          fs.closeSync(fd);
        } catch (_) {}
        fd = null;
      }

      if (createdTempFile) {
        try {
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
        } catch (_) {}
      }

      throw err;
    }
  }

  private saveDirect(data: DatabaseSchema): void {
    const startTime = Date.now();
    const nextVersion = this.stateVersion + 1;
    const rand = crypto.randomBytes(8).toString('hex');
    const tempFile = path.join(DATA_DIR, `.db.tmp.${Date.now()}_${process.pid}_${rand}`);
    let fd: number | null = null;
    try {
      const content = JSON.stringify(data, null, 2);
      const contentBuffer = Buffer.from(content, 'utf-8');
      fd = fs.openSync(tempFile, 'w');
      fs.writeSync(fd, contentBuffer, 0, contentBuffer.length, 0);
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fd = null;
      fs.renameSync(tempFile, DB_FILE);
      try {
        fs.copyFileSync(DB_FILE, `${DB_FILE}.bak`);
      } catch (_) {}
      this.stateVersion = nextVersion;
      this.saveMetadata();
    } catch (err) {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch (_) {}
      }
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch (_) {}
      throw err;
    }
  }

  public createBackup(reason: string = 'manual'): string {
    try {
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-');
      const backupFilename = `backup_${timestamp}_${reason}.json`;
      const backupPath = path.join(BACKUPS_DIR, backupFilename);
      fs.writeFileSync(backupPath, JSON.stringify(this.data, null, 2), 'utf-8');

      // Clean rolling backups (keep at most 5 auto backups, NEVER touch PRE_FIX_BACKUP)
      this.cleanRollingBackups();

      this.lastBackupTime = Date.now();
      return backupFilename;
    } catch (e) {
      console.error('[BACKUP_ERROR] Backup creation error:', e);
      return '';
    }
  }

  private cleanRollingBackups(): void {
    try {
      if (!fs.existsSync(BACKUPS_DIR)) return;
      const files = fs.readdirSync(BACKUPS_DIR)
        .filter((f) => f.startsWith('backup_') && f.endsWith('.json') && f !== 'db.json.PRE_FIX_BACKUP')
        .map((f) => ({
          name: f,
          time: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > 5) {
        files.slice(5).forEach((f) => {
          try {
            fs.unlinkSync(path.join(BACKUPS_DIR, f.name));
          } catch (e) {}
        });
      }
    } catch (e) {
      console.warn('[BACKUP_CLEAN_WARN]', e);
    }
  }

  private triggerAutoBackupIfNeeded(): void {
    const now = Date.now();
    // Auto backup every 30 minutes if there was activity
    if (now - this.lastBackupTime > 30 * 60 * 1000) {
      this.createBackup('auto');
    }
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  public async restore(data: DatabaseSchema): Promise<void> {
    this.createBackup('before_restore');
    this.data = data;
    await this.save();
  }

  public generateUniqueId(prefix: string): string {
    let id = '';
    let attempts = 0;
    do {
      const timestamp = Date.now();
      const entropy = crypto.randomBytes(4).toString('hex');
      id = `${prefix}_${timestamp}_${entropy}`;
      attempts++;
      if (attempts > 50) {
        id = `${prefix}_${timestamp}_${crypto.randomUUID()}`;
        break;
      }
    } while (this.idExists(id));
    return id;
  }

  public idExists(id: string): boolean {
    if (!id) return false;
    const d = this.data;
    if (!d) return false;
    return (
      (d.users && d.users.some((u) => u.id === id)) ||
      (d.tasks && d.tasks.some((t) => t.id === id)) ||
      (d.dossiers && d.dossiers.some((dos) => dos.id === id)) ||
      (d.disputes && d.disputes.some((disp) => disp.id === id)) ||
      (d.publicLands && d.publicLands.some((p) => p.id === id)) ||
      (d.violations && d.violations.some((v) => v.id === id)) ||
      (d.calendarEvents && d.calendarEvents.some((c) => c.id === id)) ||
      (d.registerBooks && d.registerBooks.some((b) => b.id === id)) ||
      (d.documents && d.documents.some((doc) => doc.id === id)) ||
      (d.projects && d.projects.some((p) => p.id === id || (p.households && p.households.some((h) => h.id === id)))) ||
      (d.deletedDossiers && d.deletedDossiers.some((dos) => dos.id === id)) ||
      (d.deletedTasks && d.deletedTasks.some((t) => t.id === id)) ||
      (d.deletedDisputes && d.deletedDisputes.some((disp) => disp.id === id)) ||
      (d.deletedPublicLands && d.deletedPublicLands.some((p) => p.id === id)) ||
      (d.deletedViolations && d.deletedViolations.some((v) => v.id === id)) ||
      (d.notifications && d.notifications.some((n) => n.id === id)) ||
      (d.activityLogs && d.activityLogs.some((a) => a.id === id)) ||
      (d.alertLogs && d.alertLogs.some((al) => al.id === id)) ||
      false
    );
  }

  public addActivityLog(log: Omit<ActivityLog, 'id' | 'createdAt'>, autoSave: boolean = true): ActivityLog {
    const newLog: ActivityLog = {
      id: this.generateUniqueId('log'),
      createdAt: new Date().toISOString(),
      ...log,
    };
    this.data.activityLogs.unshift(newLog);
    if (this.data.activityLogs.length > 500) {
      this.data.activityLogs = this.data.activityLogs.slice(0, 500);
    }
    if (autoSave) {
      this.save().catch((err) => console.error('[AUTO_SAVE_LOG_ERROR]', err));
    }
    return newLog;
  }

  public addNotification(notif: Omit<NotificationItem, 'id' | 'createdAt' | 'isRead'>, autoSave: boolean = true): NotificationItem {
    const newNotif: NotificationItem = {
      id: this.generateUniqueId('notif'),
      isRead: false,
      createdAt: new Date().toISOString(),
      ...notif,
    };
    this.data.notifications.unshift(newNotif);
    if (autoSave) {
      this.save().catch((err) => console.error('[AUTO_SAVE_NOTIF_ERROR]', err));
    }
    return newNotif;
  }

  public addAlertLog(log: Omit<AlertMessageLog, 'id' | 'sentAt'>, autoSave: boolean = true): AlertMessageLog {
    const newLog: AlertMessageLog = {
      id: this.generateUniqueId('alt'),
      sentAt: new Date().toISOString(),
      ...log,
    };
    if (!this.data.alertLogs) this.data.alertLogs = [];
    this.data.alertLogs.unshift(newLog);
    if (this.data.alertLogs.length > 500) {
      this.data.alertLogs = this.data.alertLogs.slice(0, 500);
    }
    if (autoSave) {
      this.save().catch((err) => console.error('[AUTO_SAVE_ALERT_ERROR]', err));
    }
    return newLog;
  }

  // Scan and calculate pending tasks and dossiers nearing deadline (5-7 days, 1-3 days, or overdue)
  public getPendingAlertItems(): PendingAlertItem[] {
    const items: PendingAlertItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Scan Tasks
    this.data.tasks.forEach((t) => {
      if (t.status === 'completed') return;
      if (!t.dueDate) return;

      // If task note/direction indicates dossier awaiting supplement, or linked dossier is paused/supplement/resolved, do not alert overdue
      if (t.note?.toLowerCase().includes('bổ sung') || t.direction?.toLowerCase().includes('bổ sung')) {
        return;
      }
      const linkedDossier = (this.data.dossiers || []).find(
        (d) =>
          (t.linkedDossierId && d.id === t.linkedDossierId) ||
          d.linkedTaskId === t.id ||
          (d.code && (t.name.includes(d.code) || t.direction?.includes(d.code) || t.note?.includes(d.code)))
      );
      if (
        linkedDossier &&
        (linkedDossier.status === 'supplement' ||
          linkedDossier.status === 'paused' ||
          linkedDossier.status === 'resolved' ||
          (linkedDossier.supplementDate && !linkedDossier.resumedDate))
      ) {
        return;
      }

      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      const assignee = this.data.users.find((u) => u.id === t.assigneeId);
      let urgency: PendingAlertItem['urgency'] = 'upcoming';
      if (diffDays < 0) urgency = 'overdue';
      else if (diffDays <= 3) urgency = 'critical';
      else if (diffDays <= 7) urgency = 'warning_5_7';
      else if (diffDays <= 20) urgency = 'warning_20_days';

      // Find last alert sent for this task
      const lastAlert = this.data.alertLogs?.find(
        (l) => l.targetId === t.id && l.targetType === 'task'
      );

      items.push({
        id: t.id,
        type: 'task',
        code: t.code,
        title: t.name,
        dueDate: t.dueDate,
        daysRemaining: diffDays,
        urgency,
        assigneeId: t.assigneeId,
        assigneeName: assignee ? assignee.name : t.assigneeName || 'Chưa phân công',
        assigneePhone: assignee?.phone,
        assigneeEmail: assignee?.email,
        scope: assignee?.scope,
        status: t.status,
        lastAlertSentAt: lastAlert?.sentAt,
      });
    });

    // 2. Scan Dossiers
    this.data.dossiers.forEach((d) => {
      // Hồ sơ đã giải quyết, yêu cầu bổ sung, hoặc đang tạm dừng thì KHÔNG tính quá hạn và KHÔNG gửi cảnh báo
      if (d.status === 'resolved' || d.status === 'supplement' || d.status === 'paused' || (d.supplementDate && !d.resumedDate)) return;
      if (!d.dueDate) return;

      const due = new Date(d.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      const handler = this.data.users.find((u) => u.id === d.handlerId);
      let urgency: PendingAlertItem['urgency'] = 'upcoming';
      if (diffDays < 0) urgency = 'overdue';
      else if (diffDays <= 3) urgency = 'critical';
      else if (diffDays <= 7) urgency = 'warning_5_7';
      else if (diffDays <= 20) urgency = 'warning_20_days';

      const lastAlert = this.data.alertLogs?.find(
        (l) => l.targetId === d.id && l.targetType === 'dossier'
      );

      items.push({
        id: d.id,
        type: 'dossier',
        code: d.code,
        title: `Hồ sơ ${d.procedure} - Chủ hộ ${d.owner} (Thửa ${d.parcel}, TBĐ ${d.mapSheet})`,
        dueDate: d.dueDate,
        daysRemaining: diffDays,
        urgency,
        assigneeId: d.handlerId,
        assigneeName: handler ? handler.name : d.handlerName || 'Chuyên viên địa chính',
        assigneePhone: handler?.phone,
        assigneeEmail: handler?.email,
        scope: handler?.scope,
        status: d.status,
        lastAlertSentAt: lastAlert?.sentAt,
      });
    });

    // Sort by most urgent (overdue first, then closest deadline)
    items.sort((a, b) => a.daysRemaining - b.daysRemaining);
    return items;
  }

  // Automatic task code generation CV-YYYY-001
  public generateNextTaskCode(): string {
    const currentYear = new Date().getFullYear();
    const prefix = `CV-${currentYear}-`;
    let maxNum = 0;
    const allTasks = [
      ...(this.data.tasks || []),
      ...(this.data.deletedTasks || []),
    ];
    allTasks.forEach((t) => {
      if (t.code && t.code.startsWith(prefix)) {
        const parts = t.code.split('-');
        if (parts.length >= 3) {
          const num = parseInt(parts[2], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
    });
    let nextNum = maxNum + 1;
    let code = `${prefix}${nextNum.toString().padStart(3, '0')}`;
    while (allTasks.some((t) => t.code === code)) {
      nextNum++;
      code = `${prefix}${nextNum.toString().padStart(3, '0')}`;
    }
    return code;
  }

  public unmarkTaskDeleted(id: string, code?: string): void {
    if (!this.data.deletedTasks) return;
    this.data.deletedTasks = this.data.deletedTasks.filter(
      (t) => t.id !== id && (!code || t.code !== code)
    );
  }

  public unmarkDossierDeleted(id: string, code?: string): void {
    if (!this.data.deletedDossiers) return;
    this.data.deletedDossiers = this.data.deletedDossiers.filter(
      (d) => d.id !== id && (!code || d.code !== code)
    );
  }

  // Automatic dossier code generation H17.130-YYMMDD-XXXX
  public generateNextDossierCode(): string {
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    const prefix = `H17.130-${yy}${mm}${dd}-`;
    let maxSeq = 0;
    if (this.data.dossiers) {
      this.data.dossiers.forEach((d) => {
        if (d.code && d.code.startsWith(prefix)) {
          const part = d.code.slice(prefix.length);
          const parsed = parseInt(part, 10);
          if (!isNaN(parsed) && parsed > maxSeq) {
            maxSeq = parsed;
          }
        }
      });
    }
    if (this.data.deletedDossiers) {
      this.data.deletedDossiers.forEach((d) => {
        if (d.code && d.code.startsWith(prefix)) {
          const part = d.code.slice(prefix.length);
          const parsed = parseInt(part, 10);
          if (!isNaN(parsed) && parsed > maxSeq) {
            maxSeq = parsed;
          }
        }
      });
    }
    let nextSeq = maxSeq + 1;
    let code = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
    const deletedCodes = new Set((this.data.deletedDossiers || []).map((d) => d.code).filter(Boolean));
    while (
      (this.data.dossiers && this.data.dossiers.some((d) => d.code === code)) ||
      deletedCodes.has(code)
    ) {
      nextSeq++;
      code = `${prefix}${nextSeq.toString().padStart(4, '0')}`;
    }
    return code;
  }

  // Automatic dispute case code generation TC-YYYY-001
  public generateNextDisputeCode(): string {
    const currentYear = new Date().getFullYear();
    const prefix = `TC-${currentYear}-`;
    let maxNum = 0;
    const allDisputes = [
      ...(this.data.disputes || []),
      ...(this.data.deletedDisputes || []),
    ];
    allDisputes.forEach((d) => {
      if (d.code && d.code.startsWith(prefix)) {
        const parts = d.code.split('-');
        if (parts.length >= 3) {
          const num = parseInt(parts[2], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
    });

    let nextNum = maxNum + 1;
    let code = `${prefix}${nextNum.toString().padStart(3, '0')}`;
    while (allDisputes.some((d) => d.code === code)) {
      nextNum++;
      code = `${prefix}${nextNum.toString().padStart(3, '0')}`;
    }
    return code;
  }

  public unmarkDisputeDeleted(id: string, code?: string): void {
    if (!this.data.deletedDisputes) return;
    this.data.deletedDisputes = this.data.deletedDisputes.filter(
      (d) => d.id !== id && (!code || d.code !== code)
    );
  }

  // Automatic Public Land parcel code generation CI-001, CI-002
  public generateNextPublicLandCode(): string {
    const prefix = 'CI-';
    let maxNum = 0;
    const allParcels = [
      ...(this.data.publicLands || []),
      ...(this.data.deletedPublicLands || []),
    ];
    allParcels.forEach((p) => {
      if (p.code && p.code.startsWith(prefix)) {
        const num = parseInt(p.code.replace(prefix, ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    let nextNum = maxNum + 1;
    let code = `${prefix}${nextNum.toString().padStart(3, '0')}`;
    while (allParcels.some((p) => p.code === code)) {
      nextNum++;
      code = `${prefix}${nextNum.toString().padStart(3, '0')}`;
    }
    return code;
  }

  public unmarkPublicLandDeleted(id: string, code?: string): void {
    if (!this.data.deletedPublicLands) return;
    this.data.deletedPublicLands = this.data.deletedPublicLands.filter(
      (p) => p.id !== id && (!code || p.code !== code)
    );
  }

  // Automatic Land & Construction Violation code generation VP-YYYY-001
  public generateNextViolationCode(): string {
    const currentYear = new Date().getFullYear();
    const prefix = `VP-${currentYear}-`;
    let maxNum = 0;
    const allViolations = [
      ...(this.data.violations || []),
      ...(this.data.deletedViolations || []),
    ];
    allViolations.forEach((v) => {
      if (v.code && v.code.startsWith(prefix)) {
        const parts = v.code.split('-');
        if (parts.length >= 3) {
          const num = parseInt(parts[2], 10);
          if (!isNaN(num) && num > maxNum) maxNum = num;
        }
      }
    });
    let nextNum = maxNum + 1;
    let code = `${prefix}${nextNum.toString().padStart(3, '0')}`;
    while (allViolations.some((v) => v.code === code)) {
      nextNum++;
      code = `${prefix}${nextNum.toString().padStart(3, '0')}`;
    }
    return code;
  }

  public unmarkViolationDeleted(id: string, code?: string): void {
    if (!this.data.deletedViolations) return;
    this.data.deletedViolations = this.data.deletedViolations.filter(
      (v) => v.id !== id && (!code || v.code !== code)
    );
  }

  // CRUD for Public Lands (Quỹ đất 5%)
  public getPublicLands(): PublicLandParcel[] {
    return this.data.publicLands || [];
  }

  public addPublicLand(data: Partial<PublicLandParcel>, autoSave: boolean = true): PublicLandParcel {
    if (!this.data.publicLands) this.data.publicLands = [];
    const safeId = data.id && !this.idExists(data.id) ? data.id : this.generateUniqueId('publand');
    const safeCode = data.code && !this.data.publicLands.some((p) => p.code === data.code) ? data.code : this.generateNextPublicLandCode();
    const newParcel: PublicLandParcel = {
      ...data,
      id: safeId,
      code: safeCode,
      parcel: data.parcel || '',
      mapSheet: data.mapSheet || '',
      location: data.location || '',
      area: Number(data.area) || 0,
      landType: data.landType || 'Đất lúa (LUC)',
      planningPurpose: data.planningPurpose || 'Sản xuất nông nghiệp',
      status: data.status || 'available',
      annualRent: Number(data.annualRent) || 0,
      paymentStatus: data.paymentStatus || 'paid',
      attachments: data.attachments || [],
      contracts: data.contracts || [],
      notes: data.notes || '',
      createdBy: data.createdBy || 'user_hoaivu',
      createdByName: data.createdByName || 'Đoàn Văn Hoài Vũ',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.unmarkPublicLandDeleted(newParcel.id, newParcel.code);
    this.data.publicLands.unshift(newParcel);
    if (autoSave) {
      this.save().catch((err) => console.error('[AUTO_SAVE_PUBLAND_ERROR]', err));
    }
    return newParcel;
  }

  public updatePublicLand(id: string, data: Partial<PublicLandParcel>, autoSave: boolean = true): PublicLandParcel | null {
    if (!this.data.publicLands) return null;
    const index = this.data.publicLands.findIndex((p) => p.id === id);
    if (index === -1) return null;
    this.data.publicLands[index] = {
      ...this.data.publicLands[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.unmarkPublicLandDeleted(this.data.publicLands[index].id, this.data.publicLands[index].code);
    if (autoSave) {
      this.save().catch((err) => console.error('[AUTO_SAVE_PUBLAND_ERROR]', err));
    }
    return this.data.publicLands[index];
  }

  public deletePublicLand(id: string, autoSave: boolean = true): PublicLandParcel | null {
    if (!this.data.publicLands) return null;
    const index = this.data.publicLands.findIndex((p) => p.id === id);
    if (index === -1) return null;
    const deleted = this.data.publicLands.splice(index, 1)[0];
    if (!this.data.deletedPublicLands) {
      this.data.deletedPublicLands = [];
    }
    this.data.deletedPublicLands = this.data.deletedPublicLands.filter(
      (p) => p.id !== deleted.id && (deleted.code ? p.code !== deleted.code : true)
    );
    this.data.deletedPublicLands.unshift(deleted);
    if (this.data.deletedPublicLands.length > 200) {
      this.data.deletedPublicLands.pop();
    }
    if (autoSave) {
      this.save().catch((err) => console.error('[AUTO_SAVE_PUBLAND_ERROR]', err));
    }
    return deleted;
  }

  // CRUD for Land Violations (Trật tự xây dựng & Vi phạm đất đai)
  public getViolations(): LandViolationCase[] {
    return this.data.violations || [];
  }

  public addViolation(data: Partial<LandViolationCase>, autoSave: boolean = true): LandViolationCase {
    if (!this.data.violations) this.data.violations = [];
    const safeId = data.id && !this.idExists(data.id) ? data.id : this.generateUniqueId('viol');
    const safeCode = data.code && !this.data.violations.some((v) => v.code === data.code) ? data.code : this.generateNextViolationCode();
    const newViolation: LandViolationCase = {
      ...data,
      id: safeId,
      code: safeCode,
      title: data.title || 'Vụ việc vi phạm trật tự xây dựng / đất đai',
      violatorName: data.violatorName || '',
      violatorCccd: data.violatorCccd || '',
      violatorPhone: data.violatorPhone || '',
      violatorAddress: data.violatorAddress || '',
      location: data.location || '',
      parcel: data.parcel || '',
      mapSheet: data.mapSheet || '',
      violatedArea: Number(data.violatedArea) || 0,
      violationType: data.violationType || 'illegal_construction',
      severity: data.severity || 'medium',
      status: data.status || 'detected',
      discoveryDate: data.discoveryDate || new Date().toISOString().split('T')[0],
      handlerId: data.handlerId || 'user_hoaivu',
      handlerName: data.handlerName || 'Đoàn Văn Hoài Vũ',
      violationDescription: data.violationDescription || '',
      fineAmount: Number(data.fineAmount) || 0,
      finePaymentStatus: data.finePaymentStatus || 'unpaid',
      remedialMeasure: data.remedialMeasure || 'Buộc khôi phục lại tình trạng ban đầu của đất',
      remedialStatus: data.remedialStatus || 'not_started',
      attachments: data.attachments || [],
      evidences: data.evidences || [],
      createdBy: data.createdBy || 'user_hoaivu',
      createdByName: data.createdByName || 'Đoàn Văn Hoài Vũ',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.unmarkViolationDeleted(newViolation.id, newViolation.code);
    this.data.violations.unshift(newViolation);
    if (autoSave) {
      this.save().catch((err) => console.error('[AUTO_SAVE_VIOLATION_ERROR]', err));
    }
    return newViolation;
  }

  public updateViolation(id: string, data: Partial<LandViolationCase>, autoSave: boolean = true): LandViolationCase | null {
    if (!this.data.violations) return null;
    const index = this.data.violations.findIndex((v) => v.id === id);
    if (index === -1) return null;
    this.data.violations[index] = {
      ...this.data.violations[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.unmarkViolationDeleted(this.data.violations[index].id, this.data.violations[index].code);
    if (autoSave) {
      this.save().catch((err) => console.error('[AUTO_SAVE_VIOLATION_ERROR]', err));
    }
    return this.data.violations[index];
  }

  public deleteViolation(id: string, autoSave: boolean = true): LandViolationCase | null {
    if (!this.data.violations) return null;
    const index = this.data.violations.findIndex((v) => v.id === id);
    if (index === -1) return null;
    const deleted = this.data.violations.splice(index, 1)[0];
    if (!this.data.deletedViolations) {
      this.data.deletedViolations = [];
    }
    this.data.deletedViolations = this.data.deletedViolations.filter(
      (v) => v.id !== deleted.id && (deleted.code ? v.code !== deleted.code : true)
    );
    this.data.deletedViolations.unshift(deleted);
    if (this.data.deletedViolations.length > 200) {
      this.data.deletedViolations.pop();
    }
    if (autoSave) {
      this.save().catch((err) => console.error('[AUTO_SAVE_VIOLATION_ERROR]', err));
    }
    return deleted;
  }
}

export const db = Database.getInstance();

