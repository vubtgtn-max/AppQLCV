import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useRealtime } from '../contexts/RealtimeContext';
import { useAuth } from '../contexts/AuthContext';
import { RegisterBook, RegisterBookType } from '../types';
import {
  RegisterBookModal,
  BOOK_TYPES,
  normalizeBookType,
} from '../components/books/RegisterBookModal';
import { apiService } from '../services/api';
import { localVault } from '../services/localVault';
import { formatDate as formatDateVN, parseExcelDate } from '../utils/date';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  Paperclip,
  FileSpreadsheet,
  Upload,
  Download,
  Award,
  RefreshCw,
  Layers,
  AlertTriangle,
  FileText,
  Scale,
  HeartHandshake,
  FolderArchive,
  PieChart,
  Copy,
  Check,
  X,
  ArrowUpRight,
  Filter,
  Sparkles,
  CheckCircle2,
  Clock,
  Eye,
  MoreVertical,
} from 'lucide-react';

type ActiveSubTab = 'books' | 'stats';
type StatsPeriod = 'all' | 'this_month' | 'this_quarter' | 'this_year';

const BOOK_TYPE_META: Record<
  string,
  {
    shortLabel: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    activeTabBg: string;
    colorHex: string;
    icon: React.ReactNode;
    description: string;
  }
> = {
  'Sổ cấp giấy': {
    shortLabel: 'Sổ cấp giấy',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    activeTabBg: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
    colorHex: '#10b981',
    icon: <Award className="w-3.5 h-3.5" />,
    description: 'TT, Tên người được cấp GCN, Số phát hành, Số vào sổ, Số tờ BĐ, Số thửa, Ghi chú',
  },
  'Sổ theo dõi biến động': {
    shortLabel: 'Sổ biến động',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    activeTabBg: 'bg-indigo-600 text-white border-indigo-600 shadow-xs',
    colorHex: '#4f46e5',
    icon: <RefreshCw className="w-3.5 h-3.5" />,
    description: 'TT, Ngày vào sổ, Tên người SD đất, GCN thực hiện ĐKBĐ, Nội dung biến động, Mã hồ sơ, Ghi chú',
  },
  'Sổ theo dõi cấp phát phôi GCN': {
    shortLabel: 'Sổ cấp phát phôi GCN',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    activeTabBg: 'bg-amber-600 text-white border-amber-600 shadow-xs',
    colorHex: '#d97706',
    icon: <Layers className="w-3.5 h-3.5" />,
    description: 'TT, Ngày nhận, Họ tên người nhận, Số lượng, Seri phôi từ, Seri phôi đến, Số phôi hỏng, Ghi chú',
  },
  'Sổ phiếu chuyển thuế': {
    shortLabel: 'Sổ phiếu chuyển thuế',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    activeTabBg: 'bg-purple-600 text-white border-purple-600 shadow-xs',
    colorHex: '#9333ea',
    icon: <FileText className="w-3.5 h-3.5" />,
    description: 'Theo dõi phiếu chuyển thông tin nghĩa vụ tài chính sang cơ quan Thuế',
  },
  'Sổ theo dõi thu hồi GCN': {
    shortLabel: 'Sổ thu hồi GCN',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
    activeTabBg: 'bg-rose-600 text-white border-rose-600 shadow-xs',
    colorHex: '#e11d48',
    icon: <Scale className="w-3.5 h-3.5" />,
    description: 'Theo dõi quyết định và hồ sơ thu hồi Giấy chứng nhận quyền sử dụng đất',
  },
  'Sổ theo dõi HS tặng cho đất NN': {
    shortLabel: 'Sổ HS tặng cho đất NN',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    badgeBorder: 'border-teal-200',
    activeTabBg: 'bg-teal-600 text-white border-teal-600 shadow-xs',
    colorHex: '#0d9488',
    icon: <HeartHandshake className="w-3.5 h-3.5" />,
    description: 'Theo dõi hồ sơ hộ gia đình, cá nhân hiến / tặng cho đất cho Nhà nước',
  },
  'Sổ theo dõi xác nhận hạn mức đất ở': {
    shortLabel: 'Sổ XN hạn mức đất ở',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
    activeTabBg: 'bg-sky-600 text-white border-sky-600 shadow-xs',
    colorHex: '#0284c7',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    description: 'Theo dõi hồ sơ xác nhận hạn mức công nhận / giao đất ở cho hộ gia đình, cá nhân',
  },
  'Biên bản xử lý vi phạm': {
    shortLabel: 'Biên bản VPHC',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-700',
    badgeBorder: 'border-orange-200',
    activeTabBg: 'bg-orange-600 text-white border-orange-600 shadow-xs',
    colorHex: '#ea580c',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    description: 'Theo dõi biên bản kiểm tra, xử lý vi phạm hành chính lĩnh vực đất đai',
  },
  'Sổ khác': {
    shortLabel: 'Sổ khác',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-200',
    activeTabBg: 'bg-slate-700 text-white border-slate-700 shadow-xs',
    colorHex: '#64748b',
    icon: <FolderArchive className="w-3.5 h-3.5" />,
    description: 'Các sổ nghiệp vụ bổ trợ khác tại địa phương',
  },
};

const STATUS_META: Record<
  string,
  { colorHex: string; badgeClass: string }
> = {
  'Đang xử lý': {
    colorHex: '#f59e0b',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  'Đã giải quyết': {
    colorHex: '#10b981',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  'Theo dõi': {
    colorHex: '#3b82f6',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  'Lưu trữ': {
    colorHex: '#64748b',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

export const RegisterBooksPage: React.FC = () => {
  const { registerBooks, refreshData } = useRealtime();
  const { user, canModifyRecord } = useAuth();

  const getModifyDenyReason = (ownerName?: string) =>
    `Mục sổ này do ${ownerName || 'cán bộ khác'} tạo. Bạn chỉ có quyền chỉnh sửa hoặc xóa dữ liệu do chính mình tạo.`;

  // Sub-tab switcher: 'books' (Sổ theo dõi nghiệp vụ đất đai) | 'stats' (Thống kê & Báo cáo nhanh)
  const [activeSubTab, setActiveSubTab] = useState<ActiveSubTab>('books');

  // Filter states for Books tab
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Filter states for Stats & Quick Report tab
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>('all');
  const [copiedReport, setCopiedReport] = useState(false);

  // Create / Edit Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<RegisterBook | null>(null);
  const [activeMenuBookId, setActiveMenuBookId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuBookId(null);
    if (activeMenuBookId) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [activeMenuBookId]);

  // Excel Import Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importBookType, setImportBookType] = useState<RegisterBookType>('Sổ cấp giấy');
  const [importPreviewRows, setImportPreviewRows] = useState<Partial<RegisterBook>[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalize all records so legacy names seamlessly map to new names
  const normalizedBooks = useMemo(() => {
    return (registerBooks || []).map((book) => ({
      ...book,
      type: normalizeBookType(book.type),
    }));
  }, [registerBooks]);

  useEffect(() => {
    if (normalizedBooks.length > 0) {
      localVault.backupRegisterBooks(normalizedBooks);
    }
  }, [normalizedBooks]);

  // Count per book type
  const countsByType = useMemo(() => {
    const map: Record<string, number> = { all: normalizedBooks.length };
    BOOK_TYPES.forEach((t) => {
      map[t] = 0;
    });
    normalizedBooks.forEach((b) => {
      const t = normalizeBookType(b.type);
      map[t] = (map[t] || 0) + 1;
    });
    return map;
  }, [normalizedBooks]);

  // Filtered books for table view
  const filteredBooks = useMemo(() => {
    return normalizedBooks
      .filter((book) => {
        const q = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !q ||
          (book.bookNumber || '').toLowerCase().includes(q) ||
          (book.content || '').toLowerCase().includes(q) ||
          (book.relatedPerson || '').toLowerCase().includes(q) ||
          (book.issueSerialNumber || '').toLowerCase().includes(q) ||
          (book.mapSheet || '').toLowerCase().includes(q) ||
          (book.parcel || '').toLowerCase().includes(q) ||
          (book.gcnForMutation || '').toLowerCase().includes(q) ||
          (book.dossierCode || '').toLowerCase().includes(q) ||
          (book.serialFrom || '').toLowerCase().includes(q) ||
          (book.serialTo || '').toLowerCase().includes(q) ||
          (book.notes || '').toLowerCase().includes(q);

        const matchesType = selectedType === 'all' || book.type === selectedType;
        const matchesStatus = selectedStatus === 'all' || book.status === selectedStatus;

        return matchesSearch && matchesType && matchesStatus;
      })
      .sort((a, b) => {
        if (selectedType !== 'all' && a.stt !== undefined && b.stt !== undefined) {
          return a.stt - b.stt;
        }
        return new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime();
      });
  }, [normalizedBooks, searchTerm, selectedType, selectedStatus]);

  // Period-filtered books for Statistics & Quick Report tab
  const statsFilteredBooks = useMemo(() => {
    if (statsPeriod === 'all') return normalizedBooks;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3);

    return normalizedBooks.filter((b) => {
      const d = new Date(b.createdDate || b.createdAt);
      if (isNaN(d.getTime())) return false;
      if (statsPeriod === 'this_year') {
        return d.getFullYear() === currentYear;
      }
      if (statsPeriod === 'this_month') {
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      }
      if (statsPeriod === 'this_quarter') {
        return (
          d.getFullYear() === currentYear &&
          Math.floor(d.getMonth() / 3) === currentQuarter
        );
      }
      return true;
    });
  }, [normalizedBooks, statsPeriod]);

  // Statistics Breakdown by Book Type (for Pie Chart & Summary Table)
  const bookTypeStats = useMemo(() => {
    const total = statsFilteredBooks.length;
    return BOOK_TYPES.map((type) => {
      const items = statsFilteredBooks.filter((b) => b.type === type);
      const count = items.length;
      const percentage = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
      const inProgress = items.filter((b) => b.status === 'Đang xử lý').length;
      const resolved = items.filter((b) => b.status === 'Đã giải quyết').length;
      const tracking = items.filter((b) => b.status === 'Theo dõi').length;
      const archived = items.filter((b) => b.status === 'Lưu trữ').length;
      const meta = BOOK_TYPE_META[type] || BOOK_TYPE_META['Sổ khác'];
      return {
        name: type,
        shortLabel: meta.shortLabel,
        value: count,
        percentage,
        inProgress,
        resolved,
        tracking,
        archived,
        color: meta.colorHex,
      };
    });
  }, [statsFilteredBooks]);

  const activePieData = useMemo(
    () => bookTypeStats.filter((item) => item.value > 0),
    [bookTypeStats]
  );

  // Statistics Breakdown by Status
  const statusStats = useMemo(() => {
    const statuses: ('Đang xử lý' | 'Đã giải quyết' | 'Theo dõi' | 'Lưu trữ')[] = [
      'Đang xử lý',
      'Đã giải quyết',
      'Theo dõi',
      'Lưu trữ',
    ];
    const total = statsFilteredBooks.length;
    return statuses.map((st) => {
      const count = statsFilteredBooks.filter((b) => b.status === st).length;
      return {
        name: st,
        value: count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
        color: STATUS_META[st].colorHex,
      };
    });
  }, [statsFilteredBooks]);

  // Blank GCN summary
  const blankGcnSummary = useMemo(() => {
    const items = statsFilteredBooks.filter(
      (b) => b.type === 'Sổ theo dõi cấp phát phôi GCN'
    );
    const totalReceived = items.reduce(
      (sum, b) => sum + (Number(b.blankQuantity) || 0),
      0
    );
    const totalDamaged = items.reduce(
      (sum, b) => sum + (Number(b.damagedCount) || 0),
      0
    );
    return { totalReceived, totalDamaged, validCount: Math.max(0, totalReceived - totalDamaged) };
  }, [statsFilteredBooks]);

  const handleEdit = (book: RegisterBook) => {
    if (!canModifyRecord(book)) {
      alert(getModifyDenyReason(book.createdByName));
      return;
    }
    setBookToEdit(book);
    setIsModalOpen(true);
  };

  const handleDelete = async (book: RegisterBook) => {
    if (!canModifyRecord(book)) {
      alert(getModifyDenyReason(book.createdByName));
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn xóa mục sổ theo dõi này?')) {
      try {
        await apiService.deleteRegisterBook(book.id);
        refreshData();
      } catch (error: any) {
        console.error('Error deleting book entry:', error);
        alert(error?.message || 'Không thể xóa mục sổ.');
      }
    }
  };

  // ============================================================================
  // EXCEL EXPORT (.xlsx)
  // ============================================================================
  const buildRowsForBookType = (books: RegisterBook[], bookType: string) => {
    if (bookType === 'Sổ cấp giấy') {
      return books.map((b, idx) => ({
        TT: b.stt || idx + 1,
        'Tên người được cấp GCN': b.relatedPerson || '',
        'Số phát hành': b.issueSerialNumber || '',
        'Số vào sổ': b.bookNumber || '',
        'Số tờ bản đồ': b.mapSheet || '',
        'Số thửa': b.parcel || '',
        'Ngày vào sổ': formatDateVN(b.createdDate),
        'Trạng thái': b.status || '',
        'Ghi chú': b.notes || b.content || '',
      }));
    }
    if (bookType === 'Sổ theo dõi biến động') {
      return books.map((b, idx) => ({
        TT: b.stt || idx + 1,
        'Ngày vào sổ': formatDateVN(b.createdDate),
        'Tên người SD đất': b.relatedPerson || '',
        'GCN thực hiện đăng ký biến động (ĐKBĐ)': b.gcnForMutation || '',
        'Nội dung biến động (ĐKBĐ)': b.content || '',
        'Mã hồ sơ': b.dossierCode || b.bookNumber || '',
        'Trạng thái': b.status || '',
        'Ghi chú': b.notes || '',
      }));
    }
    if (bookType === 'Sổ theo dõi cấp phát phôi GCN') {
      return books.map((b, idx) => ({
        TT: b.stt || idx + 1,
        'Ngày tháng năm nhận': formatDateVN(b.createdDate),
        'Họ tên người nhận': b.relatedPerson || '',
        'Số lượng': b.blankQuantity ?? '',
        'Seri phôi từ': b.serialFrom || '',
        'Seri phôi đến': b.serialTo || '',
        'Số phôi hỏng': b.damagedCount ?? 0,
        'Trạng thái': b.status || '',
        'Ghi chú': b.notes || b.content || '',
      }));
    }
    return books.map((b, idx) => ({
      TT: b.stt || idx + 1,
      'Loại sổ': b.type,
      'Số vào sổ / Mã HS': b.bookNumber || '',
      'Ngày vào sổ': formatDateVN(b.createdDate),
      'Tên người SD đất / Đối tượng': b.relatedPerson || '',
      'Nội dung / Trích yếu': b.content || '',
      'Số phát hành GCN': b.issueSerialNumber || '',
      'Số tờ BĐ': b.mapSheet || '',
      'Số thửa': b.parcel || '',
      'GCN thực hiện ĐKBĐ': b.gcnForMutation || '',
      'Số lượng phôi': b.blankQuantity ?? '',
      'Seri phôi từ': b.serialFrom || '',
      'Seri phôi đến': b.serialTo || '',
      'Số phôi hỏng': b.damagedCount ?? '',
      'Trạng thái': b.status || '',
      'Ghi chú': b.notes || '',
    }));
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const dateStamp = new Date().toISOString().split('T')[0];

    if (activeSubTab === 'stats' || selectedType === 'all') {
      // Sheet 1: Thống kê tổng hợp
      const summaryRows = bookTypeStats.map((st, idx) => ({
        TT: idx + 1,
        'Loại sổ theo dõi': st.name,
        'Tổng số hồ sơ': st.value,
        'Tỷ lệ (%)': `${st.percentage}%`,
        'Đang xử lý': st.inProgress,
        'Đã giải quyết': st.resolved,
        'Theo dõi': st.tracking,
        'Lưu trữ': st.archived,
      }));
      summaryRows.push({
        TT: 99,
        'Loại sổ theo dõi': 'TỔNG CỘNG',
        'Tổng số hồ sơ': statsFilteredBooks.length,
        'Tỷ lệ (%)': '100%',
        'Đang xử lý': statsFilteredBooks.filter((b) => b.status === 'Đang xử lý').length,
        'Đã giải quyết': statsFilteredBooks.filter((b) => b.status === 'Đã giải quyết').length,
        'Theo dõi': statsFilteredBooks.filter((b) => b.status === 'Theo dõi').length,
        'Lưu trữ': statsFilteredBooks.filter((b) => b.status === 'Lưu trữ').length,
      });

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Thong_Ke_Tong_Hop');

      // Sheet 2: Danh sách chi tiết
      const detailRows = buildRowsForBookType(filteredBooks, 'all');
      const wsDetail = XLSX.utils.json_to_sheet(detailRows);
      XLSX.utils.book_append_sheet(wb, wsDetail, 'Danh_Sach_Chi_Tiet');

      XLSX.writeFile(wb, `So_Theo_Doi_Dat_Dai_Tong_Hop_${dateStamp}.xlsx`);
    } else {
      const rows = buildRowsForBookType(filteredBooks, selectedType);
      const ws = XLSX.utils.json_to_sheet(rows);
      const safeSheetName = selectedType.slice(0, 28).replace(/[\\/?*[\]]/g, '_');
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
      XLSX.writeFile(wb, `${safeSheetName}_${dateStamp}.xlsx`);
    }
  };

  // ============================================================================
  // EXCEL IMPORT (.xlsx / .xls / .csv) & SAMPLE TEMPLATE
  // ============================================================================
  const handleDownloadTemplate = (targetType: RegisterBookType) => {
    const wb = XLSX.utils.book_new();
    let sampleRows: Record<string, any>[] = [];

    if (targetType === 'Sổ cấp giấy') {
      sampleRows = [
        {
          TT: 1,
          'Tên người được cấp GCN': 'Ông Nguyễn Văn A - Bà Trần Thị B',
          'Số phát hành': 'DP 849201',
          'Số vào sổ': 'CH 01452',
          'Số tờ bản đồ': '18',
          'Số thửa': '125',
          'Ngày vào sổ': '15/03/2026',
          'Trạng thái': 'Đã giải quyết',
          'Ghi chú': 'Cấp lần đầu tại Thôn 2, xã Lãnh Ngọc',
        },
      ];
    } else if (targetType === 'Sổ theo dõi biến động') {
      sampleRows = [
        {
          TT: 1,
          'Ngày vào sổ': '18/03/2026',
          'Tên người SD đất': 'Hộ ông Lê Văn C',
          'GCN thực hiện đăng ký biến động (ĐKBĐ)': 'DP 710294 (CH 00891)',
          'Nội dung biến động (ĐKBĐ)': 'Chuyển nhượng QSDĐ thửa 42, tờ bản đồ 12 (DT 250,5 m²)',
          'Mã hồ sơ': '000.00.14.H31-260318-0012',
          'Trạng thái': 'Đang xử lý',
          'Ghi chú': '',
        },
      ];
    } else if (targetType === 'Sổ theo dõi cấp phát phôi GCN') {
      sampleRows = [
        {
          TT: 1,
          'Ngày tháng năm nhận': '20/03/2026',
          'Họ tên người nhận': 'Nguyễn Hoàng Vũ',
          'Số lượng': 50,
          'Seri phôi từ': 'DP 849201',
          'Seri phôi đến': 'DP 849250',
          'Số phôi hỏng': 0,
          'Trạng thái': 'Theo dõi',
          'Ghi chú': 'Nhận phôi đợt 1 quý I/2026',
        },
      ];
    } else {
      sampleRows = [
        {
          TT: 1,
          'Loại sổ': targetType,
          'Số vào sổ / Mã HS':
            targetType === 'Sổ theo dõi thu hồi GCN'
              ? '45/QĐ-UBND'
              : targetType === 'Sổ theo dõi HS tặng cho đất NN'
              ? '12/HS-TCĐ/2026'
              : targetType === 'Sổ theo dõi xác nhận hạn mức đất ở'
              ? '08/XN-UBND'
              : '01/2026',
          'Ngày vào sổ': '20/03/2026',
          'Tên người SD đất / Đối tượng': 'Ông Nguyễn Văn D (Thôn 3, xã Lãnh Ngọc)',
          'Nội dung / Trích yếu':
            targetType === 'Sổ theo dõi thu hồi GCN'
              ? 'Thu hồi GCN số DP 112233 do cấp sai diện tích thửa 19, tờ BĐ 08'
              : targetType === 'Sổ theo dõi HS tặng cho đất NN'
              ? 'Hiến 65,0 m² đất tại thửa 102, tờ BĐ 11 làm đường giao thông nông thôn'
              : targetType === 'Sổ theo dõi xác nhận hạn mức đất ở'
              ? 'Xác nhận hạn mức đất ở 200,0 m² tại thửa đất số 65, tờ bản đồ số 14, xã Lãnh Ngọc'
              : 'Nội dung chi tiết hồ sơ',
          'Trạng thái': 'Đang xử lý',
          'Ghi chú': '',
        },
      ];
    }

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap_So');
    XLSX.writeFile(wb, `Mau_Nhap_${targetType.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

        if (!rawRows.length) {
          setImportError('File Excel không có dữ liệu.');
          setImportPreviewRows([]);
          return;
        }

        const getVal = (row: Record<string, any>, keys: string[]): string => {
          const rowKeys = Object.keys(row);
          // 1. Ưu tiên khớp chính xác tuyệt đối tên cột trước
          for (const target of keys) {
            const targetLower = target.toLowerCase().trim();
            for (const k of rowKeys) {
              const normKey = k.trim().toLowerCase();
              if (normKey === targetLower) {
                const v = row[k];
                if (v !== undefined && v !== null && String(v).trim() !== '') {
                  return String(v).trim();
                }
              }
            }
          }
          // 2. Nếu chưa khớp, tìm kiếm tương đối (chỉ áp dụng cho từ khóa >= 3 ký tự để tránh nhầm lẫn)
          for (const target of keys) {
            const targetLower = target.toLowerCase().trim();
            if (targetLower.length < 3) continue;
            for (const k of rowKeys) {
              const normKey = k.trim().toLowerCase();
              if (normKey.includes(targetLower)) {
                const v = row[k];
                if (v !== undefined && v !== null && String(v).trim() !== '') {
                  return String(v).trim();
                }
              }
            }
          }
          return '';
        };

        const parsed: Partial<RegisterBook>[] = rawRows
          .map((row, index) => {
            const rawTypeStr = getVal(row, ['loại sổ', 'loai so', 'tên sổ', 'nhóm sổ']);
            const rowType = rawTypeStr ? normalizeBookType(rawTypeStr) : importBookType;

            const sttVal = parseInt(getVal(row, ['tt', 'stt', 'số thứ tự', 'thứ tự', 'no.']), 10);
            const stt = !isNaN(sttVal) && sttVal > 0 ? sttVal : index + 1;

            const rawDate =
              row['Ngày vào sổ'] ||
              row['Ngày tháng năm nhận'] ||
              row['Ngày nhận'] ||
              row['Ngày cấp'] ||
              row['Ngày lập'] ||
              row['Ngày ký'] ||
              getVal(row, [
                'ngày vào sổ',
                'ngày tháng năm nhận',
                'ngày nhận',
                'ngày cấp gcn',
                'ngày cấp',
                'ngày ký gcn',
                'ngày ký',
                'ngày quyết định',
                'ngày lập',
                'ngày chuyển',
              ]);
            const createdDate = parseExcelDate(rawDate) || new Date().toISOString().split('T')[0];

            const relatedPerson = getVal(row, [
              'tên người được cấp gcn',
              'tên người được cấp',
              'người được cấp gcn',
              'người được cấp',
              'tên người sd đất',
              'người sử dụng đất',
              'tên người sử dụng đất',
              'chủ sử dụng đất',
              'chủ sử dụng',
              'chủ hộ',
              'họ tên người nhận',
              'tên người nhận',
              'đối tượng vi phạm',
              'người vi phạm',
              'hộ gia đình, cá nhân',
              'họ và tên',
              'họ tên',
              'tên người',
              'đối tượng',
              'chủ đất',
            ]);

            const issueSerialNumber = getVal(row, [
              'số phát hành',
              'số phát hành gcn',
              'seri phát hành',
              'seri gcn',
              'số seri gcn',
              'số sê ri gcn',
              'số seri',
              'số sê ri',
              'seri phôi',
              'số phôi',
              'số gcn',
              'mã vạch gcn',
            ]);

            const mapSheet = getVal(row, [
              'số tờ bản đồ',
              'số tờ bđ',
              'tờ bản đồ',
              'tờ bđ',
              'số tờ',
              'tbđ',
              'tờ',
            ]);

            const parcel = getVal(row, ['số thửa', 'số thửa đất', 'thửa đất', 'thửa']);

            const gcnForMutation = getVal(row, [
              'gcn thực hiện đăng ký biến động (đkbđ)',
              'gcn thực hiện đăng ký biến động',
              'gcn thực hiện đkbđ',
              'số gcn biến động',
              'gcn biến động',
              'số gcn cũ',
            ]);

            const dossierCode = getVal(row, ['mã hồ sơ', 'mã hs', 'số tiếp nhận', 'mã tiếp nhận']);
            const blankQuantity = getVal(row, ['số lượng', 'số lượng phôi', 'số phôi']);
            const serialFrom = getVal(row, ['seri phôi từ', 'seri từ', 'từ số']);
            const serialTo = getVal(row, ['seri phôi đến', 'seri đến', 'đến số']);
            const damagedCount = getVal(row, ['số phôi hỏng', 'phôi hỏng', 'hỏng']) || '0';
            const notes = getVal(row, ['ghi chú', 'ghi chu', 'note', 'nội dung khác']);

            let bookNumber = getVal(row, [
              'số vào sổ',
              'số vào sổ cấp gcn',
              'số vào sổ cấp giấy',
              'số sổ',
              'số quyết định',
              'số qđ',
              'số biên bản',
              'số bb',
              'mã hồ sơ',
              'mã hs',
              'số hiệu',
            ]);

            let content = getVal(row, [
              'nội dung biến động (đkbđ)',
              'nội dung biến động',
              'nội dung',
              'trích yếu',
              'lý do',
              'lý do thu hồi',
              'mục đích hiến đất',
              'hành vi vi phạm',
            ]);

            if (rowType === 'Sổ cấp giấy') {
              if (!bookNumber) bookNumber = issueSerialNumber || `SCG-${stt}`;
              if (!content) {
                content = `Cấp GCN số phát hành ${issueSerialNumber || '—'}, số vào sổ ${bookNumber} (Tờ BĐ: ${mapSheet || '—'}, Thửa: ${parcel || '—'})`;
              }
            } else if (rowType === 'Sổ theo dõi biến động') {
              if (!bookNumber) bookNumber = dossierCode || `BD-${stt}`;
            } else if (rowType === 'Sổ theo dõi cấp phát phôi GCN') {
              if (!bookNumber) bookNumber = `${serialFrom || 'PHOI'} -> ${serialTo || ''}`.trim();
              if (!content) {
                content = `Cấp phát ${blankQuantity || 0} phôi GCN (Seri từ ${serialFrom || '—'} đến ${serialTo || '—'}, hỏng: ${damagedCount})`;
              }
            } else {
              if (!bookNumber) bookNumber = `HS-${stt}`;
              if (!content) content = notes || `Mục sổ ${rowType} #${stt}`;
            }

            const rawStatus = getVal(row, ['trạng thái', 'tình trạng', 'tiến độ', 'kết quả']);
            const validStatuses = ['Đang xử lý', 'Đã giải quyết', 'Theo dõi', 'Lưu trữ'];
            const status = (validStatuses.find((s) => s.toLowerCase() === rawStatus.toLowerCase()) ||
              'Đang xử lý') as RegisterBook['status'];

            return {
              stt,
              type: rowType,
              bookNumber,
              relatedPerson,
              content,
              createdDate,
              status,
              notes,
              issueSerialNumber,
              mapSheet,
              parcel,
              gcnForMutation,
              dossierCode: dossierCode || bookNumber,
              blankQuantity: blankQuantity ? Number(blankQuantity) || blankQuantity : undefined,
              serialFrom,
              serialTo,
              damagedCount: damagedCount ? Number(damagedCount) || 0 : 0,
            };
          })
          .filter((r) => r.relatedPerson || r.bookNumber || r.content);

        if (!parsed.length) {
          setImportError('Không tìm thấy dòng dữ liệu hợp lệ trong file Excel.');
        }
        setImportPreviewRows(parsed);
      } catch (err: any) {
        console.error('Excel parse error:', err);
        setImportError('Không thể đọc file Excel. Vui lòng kiểm tra định dạng .xlsx / .xls / .csv.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (!importPreviewRows.length || isImporting) return;
    setIsImporting(true);
    setImportError(null);
    try {
      const payload: Partial<RegisterBook>[] = importPreviewRows.map((row) => ({
        stt: row.stt,
        type: (row.type || importBookType) as RegisterBookType,
        bookNumber: row.bookNumber || '—',
        relatedPerson: row.relatedPerson || '—',
        content: row.content || '—',
        createdDate: row.createdDate || new Date().toISOString().split('T')[0],
        status: (row.status as any) || 'Đang xử lý',
        notes: row.notes || '',
        attachments: [],
        issueSerialNumber: row.issueSerialNumber,
        mapSheet: row.mapSheet,
        parcel: row.parcel,
        gcnForMutation: row.gcnForMutation,
        dossierCode: row.dossierCode,
        blankQuantity: row.blankQuantity,
        serialFrom: row.serialFrom,
        serialTo: row.serialTo,
        damagedCount: row.damagedCount,
        createdBy: user?.id || 'system',
        createdByName: user?.name || 'Hệ thống',
      }));

      await apiService.batchCreateRegisterBooks(payload);
      refreshData();
      setIsImportModalOpen(false);
      setImportPreviewRows([]);
      setImportFileName('');
    } catch (err: any) {
      console.error('Error importing register books:', err);
      setImportError(err?.message || 'Lỗi khi nhập dữ liệu vào sổ.');
    } finally {
      setIsImporting(false);
    }
  };

  // ============================================================================
  // QUICK REPORT COPY
  // ============================================================================
  const handleCopyQuickReport = () => {
    const periodLabel =
      statsPeriod === 'this_month'
        ? 'Tháng này'
        : statsPeriod === 'this_quarter'
        ? 'Quý này'
        : statsPeriod === 'this_year'
        ? 'Năm nay'
        : 'Toàn thời gian';

    const lines = [
      `📊 BÁO CÁO NHANH SỔ THEO DÕI NGHIỆP VỤ ĐẤT ĐAI (${periodLabel.toUpperCase()})`,
      `Ngày xuất báo cáo: ${formatDateVN(new Date().toISOString())}`,
      `Tổng số mục vào sổ: ${statsFilteredBooks.length} hồ sơ`,
      `--------------------------------------------------`,
      ...bookTypeStats.map(
        (st, idx) =>
          `${idx + 1}. ${st.name}: ${st.value} hồ sơ (${st.percentage}%) — [Đang xử lý: ${st.inProgress} | Đã giải quyết: ${st.resolved} | Theo dõi: ${st.tracking} | Lưu trữ: ${st.archived}]`
      ),
      `--------------------------------------------------`,
      `• Cấp phát phôi GCN: Tổng nhận ${blankGcnSummary.totalReceived} phôi | Sử dụng tốt: ${blankGcnSummary.validCount} | Phôi hỏng: ${blankGcnSummary.totalDamaged}`,
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const renderEmptyTableState = (bookTypeName: string, colSpan: number) => (
    <tr>
      <td colSpan={colSpan} className="py-12 px-4 text-center">
        <div className="max-w-lg mx-auto space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">
              {bookTypeName === 'all'
                ? 'Không tìm thấy mục sổ nào phù hợp'
                : `Chưa có hồ sơ nào trong "${bookTypeName}"`}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Bạn có thể nhấn &ldquo;Vào sổ mới&rdquo; hoặc &ldquo;Nhập Excel&rdquo; để thêm dữ liệu vào sổ này.
            </p>
          </div>
          {countsByType.all > 0 && bookTypeName !== 'all' && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-800">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Hệ thống đang lưu trữ an toàn {countsByType.all} hồ sơ ở các sổ sau:</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {countsByType['Sổ phiếu chuyển thuế'] > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedType('Sổ phiếu chuyển thuế')}
                    className="px-2.5 py-1 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700 transition cursor-pointer text-xs flex items-center gap-1 shadow-2xs"
                  >
                    <span>Sổ phiếu chuyển thuế ({countsByType['Sổ phiếu chuyển thuế']})</span>
                  </button>
                )}
                {countsByType['Biên bản xử lý vi phạm'] > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedType('Biên bản xử lý vi phạm')}
                    className="px-2.5 py-1 rounded-lg bg-orange-600 text-white font-bold hover:bg-orange-700 transition cursor-pointer text-xs flex items-center gap-1 shadow-2xs"
                  >
                    <span>Biên bản VPHC ({countsByType['Biên bản xử lý vi phạm']})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedType('all')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-900 transition cursor-pointer text-xs flex items-center gap-1 shadow-2xs"
                >
                  <span>Xem tất cả ({countsByType.all} hồ sơ)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </td>
    </tr>
  );

  const renderStatusBadge = (status: RegisterBook['status']) => {
    const meta = STATUS_META[status] || STATUS_META['Lưu trữ'];
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${meta.badgeClass}`}
      >
        {status}
      </span>
    );
  };

  const renderActionsCell = (book: RegisterBook) => {
    const canModify = canModifyRecord(book);
    const isOpen = activeMenuBookId === book.id;
    return (
      <div className="flex items-center justify-end gap-1 relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => handleEdit(book)}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            canModify
              ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
              : 'text-slate-200 cursor-not-allowed'
          }`}
          title={canModify ? 'Chỉnh sửa mục sổ' : getModifyDenyReason(book.createdByName)}
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>

        {/* 3-dot Secondary Menu */}
        <div className="relative inline-block text-left">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (canModify) {
                setActiveMenuBookId(isOpen ? null : book.id);
              }
            }}
            disabled={!canModify}
            className={`p-1.5 rounded-lg border transition-colors ${
              !canModify
                ? 'text-slate-200 border-transparent cursor-not-allowed'
                : isOpen
                ? 'bg-amber-50 text-amber-600 border-amber-200 cursor-pointer'
                : 'text-slate-400 border-transparent hover:border-slate-200 hover:bg-slate-100 cursor-pointer'
            }`}
            title={canModify ? 'Thao tác khác' : getModifyDenyReason(book.createdByName)}
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {isOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-40 text-left animate-in fade-in-50 zoom-in-95"
            >
              <button
                onClick={() => {
                  setActiveMenuBookId(null);
                  handleEdit(book);
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                Sửa mục sổ
              </button>
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <button
                onClick={() => {
                  setActiveMenuBookId(null);
                  handleDelete(book);
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                Xóa mục sổ này
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* =====================================================================
          COMPACT TOP HEADER & SUB-TAB SWITCHER
         ===================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs px-3.5 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">
                Sổ Theo dõi Nghiệp vụ Đất đai
              </h1>
              <p className="text-[11px] text-slate-500">
                Tổng cộng <strong className="text-slate-800">{normalizedBooks.length}</strong> mục sổ đã ghi nhận
              </p>
            </div>
          </div>

          {/* 2 Sub-Tabs Side by Side */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveSubTab('books')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'books'
                  ? 'bg-white text-amber-700 shadow-xs border border-amber-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Sổ theo dõi nghiệp vụ đất đai</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activeSubTab === 'books'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {normalizedBooks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('stats')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'stats'
                  ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Thống kê & Báo cáo nhanh</span>
            </button>
          </div>
        </div>

        {/* Action Buttons: Nhập Excel | Xuất Excel | Vào sổ mới */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setImportBookType(
                selectedType !== 'all' ? (selectedType as RegisterBookType) : 'Sổ cấp giấy'
              );
              setImportPreviewRows([]);
              setImportFileName('');
              setImportError(null);
              setIsImportModalOpen(true);
            }}
            className="bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border border-slate-200 shadow-2xs cursor-pointer"
            title="Nhập dữ liệu sổ từ file Excel (.xlsx, .xls, .csv)"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600" />
            <span>Nhập Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="bg-white hover:bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border border-emerald-200 shadow-2xs cursor-pointer"
            title="Xuất dữ liệu sổ ra file Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBookToEdit(null);
              setIsModalOpen(true);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Vào sổ mới</span>
          </button>
        </div>
      </div>

      {/* =====================================================================
          SUB-TAB 1: SỔ THEO DÕI NGHIỆP VỤ ĐẤT ĐAI (COMPACT & STREAMLINED)
         ===================================================================== */}
      {activeSubTab === 'books' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Compact Book Category Selector + Search & Status Filter */}
          <div className="p-2.5 bg-slate-50/70 border-b border-slate-200/80 space-y-2">
            {/* Single-row compact scrollable/wrappable pills for all 8 books */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedType('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedType === 'all'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>Tất cả sổ</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    selectedType === 'all'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {countsByType.all || 0}
                </span>
              </button>

              {BOOK_TYPES.map((type) => {
                const isSelected = selectedType === type;
                const meta = BOOK_TYPE_META[type] || BOOK_TYPE_META['Sổ khác'];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? meta.activeTabBg
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: isSelected ? '#ffffff' : meta.colorHex,
                      }}
                    />
                    <span>{type}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {countsByType[type] || 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search bar + Status filter + Active Book description in a single compact row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm tên người SDĐ, số phát hành, số vào sổ, tờ/thửa, mã hồ sơ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-7 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="all">Mọi trạng thái</option>
                    <option value="Đang xử lý">Đang xử lý</option>
                    <option value="Đã giải quyết">Đã giải quyết</option>
                    <option value="Theo dõi">Theo dõi</option>
                    <option value="Lưu trữ">Lưu trữ</option>
                  </select>
                </div>
              </div>

              {selectedType !== 'all' && BOOK_TYPE_META[selectedType] && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                  <span className="font-bold text-slate-700">{selectedType}:</span>
                  <span className="truncate">{BOOK_TYPE_META[selectedType].description}</span>
                </div>
              )}
            </div>
          </div>

          {/* =================================================================
              DYNAMIC TABLE RENDERING BY SELECTED BOOK TYPE
             ================================================================= */}
          <div className="overflow-x-auto">
            {/* 1. BẢNG SỔ CẤP GIẤY */}
            {selectedType === 'Sổ cấp giấy' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-emerald-50/70 border-b border-emerald-200/80 text-emerald-950 text-[11px] uppercase tracking-wider font-extrabold">
                    <th className="py-2.5 px-3 w-12 text-center">TT</th>
                    <th className="py-2.5 px-3 min-w-[200px]">Tên người được cấp GCN</th>
                    <th className="py-2.5 px-3 w-36">Số phát hành</th>
                    <th className="py-2.5 px-3 w-32">Số vào sổ</th>
                    <th className="py-2.5 px-3 w-28 text-center">Số tờ bản đồ</th>
                    <th className="py-2.5 px-3 w-28 text-center">Số thửa</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Ghi chú</th>
                    <th className="py-2.5 px-3 w-28 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3 w-20 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredBooks.length > 0 ? (
                    filteredBooks.map((book, idx) => (
                      <tr key={book.id} className="hover:bg-emerald-50/30 transition-colors group">
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                          {book.stt || idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{book.relatedPerson}</div>
                          <div className="text-[11px] text-slate-400">
                            Ngày vào sổ: {formatDateVN(book.createdDate)}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-800 font-mono font-bold text-xs border border-emerald-200">
                            {book.issueSerialNumber || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {book.bookNumber || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono font-bold">
                            {book.mapSheet || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono font-bold">
                            {book.parcel || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <div>{book.notes || book.content || '—'}</div>
                          {book.attachments?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {book.attachments.map((att) => (
                                <a
                                  key={att.id}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white text-blue-600 hover:bg-blue-50 text-[10px] font-medium border border-blue-100"
                                >
                                  <Paperclip className="w-2.5 h-2.5" />
                                  <span className="max-w-[110px] truncate">{att.name}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">{renderStatusBadge(book.status)}</td>
                        <td className="py-2.5 px-3 text-right">{renderActionsCell(book)}</td>
                      </tr>
                    ))
                  ) : (
                    renderEmptyTableState('Sổ cấp giấy', 9)
                  )}
                </tbody>
              </table>
            )}

            {/* 2. BẢNG SỔ THEO DÕI BIẾN ĐỘNG */}
            {selectedType === 'Sổ theo dõi biến động' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-indigo-50/70 border-b border-indigo-200/80 text-indigo-950 text-[11px] uppercase tracking-wider font-extrabold">
                    <th className="py-2.5 px-3 w-12 text-center">TT</th>
                    <th className="py-2.5 px-3 w-28">Ngày vào sổ</th>
                    <th className="py-2.5 px-3 min-w-[170px]">Tên người SD đất</th>
                    <th className="py-2.5 px-3 w-44">GCN thực hiện ĐKBĐ</th>
                    <th className="py-2.5 px-3 min-w-[220px]">Nội dung biến động (ĐKBĐ)</th>
                    <th className="py-2.5 px-3 w-40">Mã hồ sơ</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Ghi chú</th>
                    <th className="py-2.5 px-3 w-28 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3 w-20 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredBooks.length > 0 ? (
                    filteredBooks.map((book, idx) => (
                      <tr key={book.id} className="hover:bg-indigo-50/30 transition-colors group">
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                          {book.stt || idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                          {formatDateVN(book.createdDate)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {book.relatedPerson}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-mono font-bold text-xs border border-indigo-200">
                            {book.gcnForMutation || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 font-medium leading-relaxed">
                          {book.content}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {book.dossierCode || book.bookNumber || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <div>{book.notes || '—'}</div>
                          {book.attachments?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {book.attachments.map((att) => (
                                <a
                                  key={att.id}
                                  href={att.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white text-blue-600 hover:bg-blue-50 text-[10px] font-medium border border-blue-100"
                                >
                                  <Paperclip className="w-2.5 h-2.5" />
                                  <span className="max-w-[110px] truncate">{att.name}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">{renderStatusBadge(book.status)}</td>
                        <td className="py-2.5 px-3 text-right">{renderActionsCell(book)}</td>
                      </tr>
                    ))
                  ) : (
                    renderEmptyTableState('Sổ theo dõi biến động', 9)
                  )}
                </tbody>
              </table>
            )}

            {/* 3. BẢNG SỔ THEO DÕI CẤP PHÁT PHÔI GCN */}
            {selectedType === 'Sổ theo dõi cấp phát phôi GCN' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-amber-50/80 border-b border-amber-200/80 text-amber-950 text-[11px] uppercase tracking-wider font-extrabold">
                    <th className="py-2.5 px-3 w-12 text-center">TT</th>
                    <th className="py-2.5 px-3 w-36">Ngày tháng năm nhận</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Họ tên người nhận</th>
                    <th className="py-2.5 px-3 w-24 text-center">Số lượng</th>
                    <th className="py-2.5 px-3 w-36">Seri phôi từ</th>
                    <th className="py-2.5 px-3 w-36">Seri phôi đến</th>
                    <th className="py-2.5 px-3 w-28 text-center">Số phôi hỏng</th>
                    <th className="py-2.5 px-3 min-w-[160px]">Ghi chú</th>
                    <th className="py-2.5 px-3 w-28 text-center">Trạng thái</th>
                    <th className="py-2.5 px-3 w-20 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {filteredBooks.length > 0 ? (
                    filteredBooks.map((book, idx) => (
                      <tr key={book.id} className="hover:bg-amber-50/30 transition-colors group">
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                          {book.stt || idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                          {formatDateVN(book.createdDate)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {book.relatedPerson}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono font-extrabold">
                            {book.blankQuantity ?? '—'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                          {book.serialFrom || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                          {book.serialTo || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md font-mono font-bold ${
                              Number(book.damagedCount) > 0
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {book.damagedCount ?? 0}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <div>{book.notes || book.content || '—'}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center">{renderStatusBadge(book.status)}</td>
                        <td className="py-2.5 px-3 text-right">{renderActionsCell(book)}</td>
                      </tr>
                    ))
                  ) : (
                    renderEmptyTableState('Sổ theo dõi cấp phát phôi GCN', 10)
                  )}
                </tbody>
              </table>
            )}

            {/* 4. BẢNG TỔNG HỢP / CÁC SỔ KHÁC (Sổ phiếu chuyển thuế, Sổ theo dõi thu hồi GCN, Sổ theo dõi HS tặng cho đất NN, Biên bản VPHC, Sổ khác, Tất cả) */}
            {selectedType !== 'Sổ cấp giấy' &&
              selectedType !== 'Sổ theo dõi biến động' &&
              selectedType !== 'Sổ theo dõi cấp phát phôi GCN' && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200 text-slate-600 text-[11px] uppercase tracking-wider font-extrabold">
                      <th className="py-2.5 px-3 w-12 text-center">TT</th>
                      {selectedType === 'all' && <th className="py-2.5 px-3 w-48">Loại sổ</th>}
                      <th className="py-2.5 px-3 w-36">
                        {selectedType === 'Sổ theo dõi thu hồi GCN'
                          ? 'Số QĐ / Số GCN'
                          : selectedType === 'Sổ theo dõi HS tặng cho đất NN'
                          ? 'Số vào sổ / Mã HS'
                          : selectedType === 'Sổ theo dõi xác nhận hạn mức đất ở'
                          ? 'Số vào sổ / Số VB XN'
                          : 'Số vào sổ / Mã HS'}
                      </th>
                      <th className="py-2.5 px-3 w-28">Ngày vào sổ</th>
                      <th className="py-2.5 px-3 min-w-[180px]">
                        {selectedType === 'Sổ theo dõi thu hồi GCN'
                          ? 'Người có GCN bị thu hồi'
                          : selectedType === 'Sổ theo dõi HS tặng cho đất NN'
                          ? 'Hộ gia đình / Cá nhân tặng cho đất'
                          : selectedType === 'Sổ theo dõi xác nhận hạn mức đất ở'
                          ? 'Chủ SD đất / Hộ gia đình được xác nhận'
                          : 'Người SD đất / Đối tượng'}
                      </th>
                      <th className="py-2.5 px-3 min-w-[260px]">
                        {selectedType === 'Sổ theo dõi thu hồi GCN'
                          ? 'Lý do & Nội dung thu hồi GCN'
                          : selectedType === 'Sổ theo dõi HS tặng cho đất NN'
                          ? 'Nội dung tặng cho đất Nhà nước'
                          : selectedType === 'Sổ theo dõi xác nhận hạn mức đất ở'
                          ? 'Nội dung xác nhận hạn mức đất ở'
                          : 'Thông tin nghiệp vụ / Nội dung'}
                      </th>
                      <th className="py-2.5 px-3 min-w-[140px]">Ghi chú</th>
                      <th className="py-2.5 px-3 w-28 text-center">Trạng thái</th>
                      <th className="py-2.5 px-3 w-20 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {filteredBooks.length > 0 ? (
                      filteredBooks.map((book, idx) => {
                        const meta = BOOK_TYPE_META[book.type] || BOOK_TYPE_META['Sổ khác'];
                        return (
                          <tr key={book.id} className="hover:bg-amber-50/20 transition-colors group">
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                              {book.stt || idx + 1}
                            </td>
                            {selectedType === 'all' && (
                              <td className="py-2.5 px-3">
                                <button
                                  type="button"
                                  onClick={() => setSelectedType(book.type)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border cursor-pointer hover:opacity-85 ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                                  title="Nhấn để lọc riêng loại sổ này"
                                >
                                  {meta.icon}
                                  <span>{book.type}</span>
                                </button>
                              </td>
                            )}
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              {book.dossierCode || book.bookNumber || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                              {formatDateVN(book.createdDate)}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {book.relatedPerson}
                            </td>
                            <td className="py-2.5 px-3">
                              {book.type === 'Sổ cấp giấy' ? (
                                <div className="space-y-0.5">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold text-[11px]">
                                      Số PH: {book.issueSerialNumber || '—'}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[11px]">
                                      Tờ BĐ: {book.mapSheet || '—'}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[11px]">
                                      Thửa: {book.parcel || '—'}
                                    </span>
                                  </div>
                                </div>
                              ) : book.type === 'Sổ theo dõi biến động' ? (
                                <div className="space-y-0.5">
                                  {book.gcnForMutation && (
                                    <div className="text-[11px] font-mono font-bold text-indigo-700">
                                      GCN ĐKBĐ: {book.gcnForMutation}
                                    </div>
                                  )}
                                  <div className="text-slate-800">{book.content}</div>
                                </div>
                              ) : book.type === 'Sổ theo dõi cấp phát phôi GCN' ? (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono font-bold text-[11px]">
                                    SL: {book.blankQuantity ?? 0} phôi
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold text-[11px]">
                                    Seri: {book.serialFrom || '—'} → {book.serialTo || '—'}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-mono font-bold text-[11px]">
                                    Hỏng: {book.damagedCount ?? 0}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-slate-800 leading-relaxed">{book.content}</div>
                              )}

                              {book.attachments?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {book.attachments.map((att) => (
                                    <a
                                      key={att.id}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-medium border border-blue-100"
                                    >
                                      <Paperclip className="w-2.5 h-2.5" />
                                      <span className="max-w-[120px] truncate">{att.name}</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{book.notes || '—'}</td>
                            <td className="py-2.5 px-3 text-center">{renderStatusBadge(book.status)}</td>
                            <td className="py-2.5 px-3 text-right">{renderActionsCell(book)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      renderEmptyTableState(selectedType, selectedType === 'all' ? 9 : 8)
                    )}
                  </tbody>
                </table>
              )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-TAB 2: THỐNG KÊ & BÁO CÁO NHANH (BIỂU ĐỒ HÌNH TRÒN THEO TỪNG LOẠI)
         ===================================================================== */}
      {activeSubTab === 'stats' && (
        <div className="space-y-3">
          {/* Quick Report Toolbar */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Kỳ thống kê báo cáo:
              </span>
              {(
                [
                  { id: 'all', label: 'Toàn thời gian' },
                  { id: 'this_month', label: 'Tháng này' },
                  { id: 'this_quarter', label: 'Quý này' },
                  { id: 'this_year', label: 'Năm nay' },
                ] as { id: StatsPeriod; label: string }[]
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setStatsPeriod(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statsPeriod === p.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyQuickReport}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedReport ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Đã sao chép báo cáo!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép báo cáo nhanh</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Xuất báo cáo Excel</span>
              </button>
            </div>
          </div>

          {/* Compact 4-KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Tổng hồ sơ vào sổ
                </p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">
                  {statsFilteredBooks.length}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Trên {BOOK_TYPES.length} loại sổ nghiệp vụ
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                  Đã giải quyết
                </p>
                <p className="text-2xl font-black text-emerald-700 mt-0.5">
                  {statsFilteredBooks.filter((b) => b.status === 'Đã giải quyết').length}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Hoàn thành đúng quy định
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">
                  Đang xử lý & Theo dõi
                </p>
                <p className="text-2xl font-black text-amber-700 mt-0.5">
                  {
                    statsFilteredBooks.filter(
                      (b) => b.status === 'Đang xử lý' || b.status === 'Theo dõi'
                    ).length
                  }
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Đang giải quyết / theo dõi
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-purple-600">
                  Phôi GCN đã nhận
                </p>
                <p className="text-2xl font-black text-purple-700 mt-0.5">
                  {blankGcnSummary.totalReceived}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sử dụng tốt: <strong>{blankGcnSummary.validCount}</strong> • Hỏng:{' '}
                  <strong className="text-rose-600">{blankGcnSummary.totalDamaged}</strong>
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* PIE CHARTS GRID: Biểu đồ tròn theo từng loại sổ & Biểu đồ tròn theo trạng thái */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Biểu đồ tròn 1: Phân bổ theo 8 loại sổ theo dõi */}
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 shadow-xs p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <PieChart className="w-4 h-4 text-indigo-600" />
                    Biểu đồ hình tròn phân loại Sổ theo dõi nghiệp vụ đất đai
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tỷ trọng số lượng hồ sơ giữa các loại sổ (Nhấn vào từng loại để mở nhanh sổ đó)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-6 h-60 relative">
                  {activePieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={activePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={88}
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="name"
                          label={({ percent }) =>
                            percent && percent >= 0.05
                              ? `${Math.round(percent * 100)}%`
                              : ''
                          }
                          labelLine={false}
                        >
                          {activePieData.map((entry, idx) => (
                            <Cell
                              key={`cell-${idx}`}
                              fill={entry.color}
                              className="cursor-pointer outline-none"
                              onClick={() => {
                                setSelectedType(entry.name);
                                setActiveSubTab('books');
                              }}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any, name: any) => [
                            `${value} hồ sơ`,
                            name,
                          ]}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      Chưa có dữ liệu trong kỳ đã chọn
                    </div>
                  )}
                  {activePieData.length > 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl font-black text-slate-900">
                        {statsFilteredBooks.length}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-slate-400">
                        Tổng mục sổ
                      </span>
                    </div>
                  )}
                </div>

                {/* Breakdown list next to Pie Chart */}
                <div className="md:col-span-6 space-y-1.5">
                  {bookTypeStats.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => {
                        setSelectedType(item.name);
                        setActiveSubTab('books');
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-extrabold text-slate-900 font-mono">
                          {item.value}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 w-11 text-right font-mono">
                          ({item.percentage}%)
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Biểu đồ tròn 2: Phân bổ theo Trạng thái xử lý */}
            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200/90 shadow-xs p-4 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-emerald-600" />
                  Tỷ lệ theo Trạng thái giải quyết
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Thống kê tiến độ xử lý các mục trong sổ theo dõi
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center my-2">
                <div className="sm:col-span-6 h-52 relative">
                  {statsFilteredBooks.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={statusStats.filter((s) => s.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={44}
                          outerRadius={76}
                          paddingAngle={3}
                          dataKey="value"
                          nameKey="name"
                        >
                          {statusStats
                            .filter((s) => s.value > 0)
                            .map((entry, idx) => (
                              <Cell key={`st-${idx}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any, name: any) => [
                            `${value} mục`,
                            name,
                          ]}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      Chưa có dữ liệu
                    </div>
                  )}
                </div>

                <div className="sm:col-span-6 space-y-2">
                  {statusStats.map((st) => (
                    <div
                      key={st.name}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: st.color }}
                        />
                        <span className="text-xs font-bold text-slate-700">{st.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 font-mono">
                          {st.value}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1 font-mono">
                          ({st.percentage}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Nhấn vào dòng bên dưới để xem chi tiết từng sổ</span>
                <span className="font-bold text-indigo-600">{BOOK_TYPES.length}/{BOOK_TYPES.length} loại sổ nghiệp vụ</span>
              </div>
            </div>
          </div>

          {/* BẢNG TỔNG HỢP BÁO CÁO NHANH THEO TỪNG LOẠI SỔ */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Bảng tổng hợp số liệu báo cáo nhanh theo từng loại sổ
              </h3>
              <span className="text-[11px] text-slate-500">
                Đơn vị: Hồ sơ / Mục vào sổ
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-200 text-[11px] uppercase tracking-wider font-extrabold text-slate-600">
                    <th className="py-2.5 px-3 w-12 text-center">TT</th>
                    <th className="py-2.5 px-3">Tên loại sổ theo dõi</th>
                    <th className="py-2.5 px-3 text-center w-28">Tổng số</th>
                    <th className="py-2.5 px-3 text-center w-28">Tỷ lệ (%)</th>
                    <th className="py-2.5 px-3 text-center w-28 text-amber-700">Đang xử lý</th>
                    <th className="py-2.5 px-3 text-center w-28 text-emerald-700">Đã giải quyết</th>
                    <th className="py-2.5 px-3 text-center w-28 text-blue-700">Theo dõi</th>
                    <th className="py-2.5 px-3 text-center w-28 text-slate-600">Lưu trữ</th>
                    <th className="py-2.5 px-3 text-right w-28">Xem chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {bookTypeStats.map((st, idx) => {
                    const meta = BOOK_TYPE_META[st.name] || BOOK_TYPE_META['Sổ khác'];
                    return (
                      <tr key={st.name} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-md border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}
                            >
                              {meta.icon}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900">{st.name}</div>
                              <div className="text-[11px] text-slate-400">{meta.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900 text-sm">
                          {st.value}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, st.percentage)}%`,
                                  backgroundColor: st.color,
                                }}
                              />
                            </div>
                            <span className="font-mono font-bold text-slate-600 text-[11px]">
                              {st.percentage}%
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-700">
                          {st.inProgress}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700">
                          {st.resolved}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-blue-700">
                          {st.tracking}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600">
                          {st.archived}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedType(st.name);
                              setActiveSubTab('books');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Mở sổ</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/90 border-t-2 border-slate-200 font-extrabold text-xs text-slate-900">
                    <td className="py-2.5 px-3 text-center" colSpan={2}>
                      TỔNG CỘNG TOÀN BỘ SỔ THEO DÕI
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-sm">
                      {statsFilteredBooks.length}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">100%</td>
                    <td className="py-2.5 px-3 text-center font-mono text-amber-700">
                      {statsFilteredBooks.filter((b) => b.status === 'Đang xử lý').length}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-emerald-700">
                      {statsFilteredBooks.filter((b) => b.status === 'Đã giải quyết').length}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-blue-700">
                      {statsFilteredBooks.filter((b) => b.status === 'Theo dõi').length}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                      {statsFilteredBooks.filter((b) => b.status === 'Lưu trữ').length}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedType('all');
                          setActiveSubTab('books');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                      >
                        <span>Xem tất cả</span>
                      </button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL NHẬP DỮ LIỆU TỪ EXCEL (.xlsx, .xls, .csv)
         ===================================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Nhập dữ liệu Sổ Theo dõi từ file Excel
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Hỗ trợ định dạng .xlsx, .xls, .csv theo mẫu từng loại sổ nghiệp vụ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-gray-200/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {importError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Step 1: Select Book Type & Download Sample Template */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="sm:col-span-7">
                  <label className="block font-bold text-slate-700 mb-1">
                    1. Chọn loại sổ cần nhập dữ liệu
                  </label>
                  <select
                    value={importBookType}
                    onChange={(e) => {
                      setImportBookType(e.target.value as RegisterBookType);
                      setImportPreviewRows([]);
                      setImportFileName('');
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {BOOK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-5">
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate(importBookType)}
                    className="w-full py-2 px-3 rounded-lg font-bold bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải file Excel mẫu ({BOOK_TYPE_META[importBookType]?.shortLabel})</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Upload Excel file */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-xl p-5 text-center transition-all cursor-pointer"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <FileSpreadsheet className="w-8 h-8 text-indigo-500 mx-auto mb-1.5" />
                <p className="font-bold text-slate-800">
                  {importFileName
                    ? `Đã chọn file: ${importFileName}`
                    : 'Nhấn vào đây để chọn file Excel (.xlsx, .xls, .csv)'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Hệ thống tự động nhận diện các cột theo mẫu {importBookType}
                </p>
              </div>

              {/* Step 3: Preview Parsed Rows */}
              {importPreviewRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      Xem trước dữ liệu ({importPreviewRows.length} dòng hợp lệ):
                    </span>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      Sẵn sàng nhập vào {importBookType}
                    </span>
                  </div>
                  <div className="max-h-56 overflow-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                          <th className="py-1.5 px-2.5 w-10 text-center">TT</th>
                          <th className="py-1.5 px-2.5">Loại sổ</th>
                          <th className="py-1.5 px-2.5">Số vào sổ / Mã HS</th>
                          <th className="py-1.5 px-2.5">Người liên quan</th>
                          <th className="py-1.5 px-2.5">Nội dung / Thông tin</th>
                          <th className="py-1.5 px-2.5">Ngày</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreviewRows.slice(0, 20).map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2.5 text-center font-mono">{r.stt}</td>
                            <td className="py-1.5 px-2.5 font-semibold text-indigo-700">{r.type}</td>
                            <td className="py-1.5 px-2.5 font-mono font-bold">{r.bookNumber}</td>
                            <td className="py-1.5 px-2.5 font-semibold">{r.relatedPerson}</td>
                            <td className="py-1.5 px-2.5 text-slate-600 truncate max-w-[220px]">
                              {r.content}
                            </td>
                            <td className="py-1.5 px-2.5 font-mono">
                              {formatDateVN(r.createdDate || '')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg font-semibold text-slate-600 hover:bg-gray-200 transition-colors text-xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!importPreviewRows.length || isImporting}
                onClick={handleConfirmImport}
                className="px-4 py-1.5 rounded-lg font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors text-xs shadow-xs cursor-pointer"
              >
                {isImporting
                  ? 'Đang nhập dữ liệu...'
                  : `Xác nhận nhập ${importPreviewRows.length} mục vào sổ`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm / Chỉnh sửa mục sổ */}
      <RegisterBookModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setBookToEdit(null);
        }}
        bookToEdit={bookToEdit}
        defaultType={selectedType !== 'all' ? (selectedType as RegisterBookType) : 'Sổ cấp giấy'}
        onSuccess={() => {
          refreshData();
        }}
      />
    </div>
  );
};
