export const LANH_NGOC_VILLAGES = [
  'Thôn Tiên Hiệp',
  'Thôn Hòa Hiệp',
  'Thôn Tiên Ngọc',
  'Thôn Hòa Đồng',
  'Thôn Tiên Lãnh',
  'Thôn Hòa Bình',
  'Thôn Sông Tranh',
] as const;

export type VillageName = (typeof LANH_NGOC_VILLAGES)[number];

export const COMMUNE_FULL_SUFFIX = 'xã Lãnh Ngọc';

export interface LandProcedureConfig {
  id: string;
  name: string;
  category: string;
  workingDays: number;
  description?: string;
  legalBasis?: string;
}

export const LAND_PROCEDURES: LandProcedureConfig[] = [
  {
    id: 'cap_lan_dau',
    name: 'Cấp giấy lần đầu',
    category: 'Cấp GCN',
    workingDays: 30,
    description: 'Đăng ký đất đai, tài sản gắn liền với đất, cấp GCN lần đầu',
    legalBasis: 'Luật Đất đai 2024 & Nghị định 101/2024/NĐ-CP',
  },
  {
    id: 'dang_ky_bien_dong',
    name: 'Đăng ký biến động',
    category: 'Biến động',
    workingDays: 10,
    description: 'Đăng ký biến động quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất',
    legalBasis: 'Nghị định 101/2024/NĐ-CP',
  },
  {
    id: 'chuyen_muc_dich',
    name: 'Chuyển mục đích',
    category: 'Chuyển mục đích',
    workingDays: 15,
    description: 'Chuyển mục đích sử dụng đất nông nghiệp sang đất ở / phi nông nghiệp',
    legalBasis: 'Nghị định 102/2024/NĐ-CP',
  },
  {
    id: 'thu_hoi_gcn',
    name: 'Thu hồi giấy chứng nhận',
    category: 'Thu hồi',
    workingDays: 15,
    description: 'Thu hồi Giấy chứng nhận đã cấp không đúng quy định',
    legalBasis: 'Nghị định 101/2024/NĐ-CP',
  },
  {
    id: 'tang_cho_nha_nuoc',
    name: 'Tặng cho đất nhà nước',
    category: 'Hiến đất / Tặng cho',
    workingDays: 15,
    description: 'Tự nguyện trả lại đất, hiến tặng đất mở đường, công trình phúc lợi xã hội',
    legalBasis: 'Luật Đất đai 2024',
  },
  {
    id: 'xac_dinh_han_muc',
    name: 'Xác định hạn mức đất ở',
    category: 'Hạn mức',
    workingDays: 15,
    description: 'Xác định lại diện tích đất ở cho hộ gia đình, cá nhân có vườn ao',
    legalBasis: 'Luật Đất đai 2024',
  },
  {
    id: 'thu_hoi_khoang_san',
    name: 'Thu hồi khoáng sản',
    category: 'Khoáng sản & Tài nguyên',
    workingDays: 20,
    description: 'Thu hồi đất phục vụ khai thác khoáng sản và hoàn phục môi trường',
    legalBasis: 'Luật Khoáng sản & Đất đai',
  },
  {
    id: 'don_thu',
    name: 'Đơn thư',
    category: 'Đơn thư & Khiếu nại',
    workingDays: 15,
    description: 'Tiếp nhận, thẩm tra, giải quyết khiếu nại, tố cáo, kiến nghị, phản ánh về đất đai',
    legalBasis: 'Luật Khiếu nại & Luật Đất đai',
  },
  {
    id: 'tranh_chap',
    name: 'Tranh chấp',
    category: 'Tranh chấp đất đai',
    workingDays: 30,
    description: 'Tổ chức hòa giải tranh chấp đất đai tại UBND cấp xã',
    legalBasis: 'Điều 235 Luật Đất đai 2024',
  },
];

export function formatVillageAddress(village: string, addressDetail?: string): string {
  const cleanVillage = village?.trim() || '';
  const cleanDetail = addressDetail?.trim() || '';
  if (cleanDetail) {
    return `${cleanDetail}, ${cleanVillage}, ${COMMUNE_FULL_SUFFIX}`;
  }
  return cleanVillage ? `${cleanVillage}, ${COMMUNE_FULL_SUFFIX}` : COMMUNE_FULL_SUFFIX;
}

export function getProcedureWorkingDays(procedureName?: string | null): number {
  if (!procedureName) return 15;
  const proc = procedureName.trim().toLowerCase();

  const found = LAND_PROCEDURES.find((p) => p.name.toLowerCase() === proc || proc.includes(p.name.toLowerCase()));
  if (found) return found.workingDays;

  if (proc.includes('lần đầu') || proc.includes('cấp gcn')) return 30;
  if (proc.includes('biến động') || proc.includes('chuyển nhượng') || proc.includes('tặng cho')) return 10;
  if (proc.includes('tranh chấp') || proc.includes('hòa giải')) return 30;
  if (proc.includes('chuyển mục đích')) return 15;
  if (proc.includes('khoáng sản')) return 20;
  if (proc.includes('đơn thư') || proc.includes('kiến nghị') || proc.includes('khiếu nại')) return 15;
  if (proc.includes('thu hồi')) return 15;
  if (proc.includes('hạn mức')) return 15;

  return 15;
}
