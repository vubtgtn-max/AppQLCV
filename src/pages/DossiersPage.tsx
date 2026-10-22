import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Dossier, DossierStatus, DossierWorkflowStepItem, Attachment } from '../types';
import { useRealtime } from '../contexts/RealtimeContext';
import { useAuth } from '../contexts/AuthContext';
import {
  formatDate,
  getDaysRemaining,
  addWorkingDays,
  getStandardWorkingDaysForProcedure,
  calculateResumedDueDate,
  isDossierOverdue,
} from '../utils/date';
import { apiService } from '../services/api';
import { localVault } from '../services/localVault';
import { exportToExcel, exportDossierListToWord } from '../utils/export';
import type { DossierSlipType } from '../components/dossiers/DossierPrintModal';
function safeLazy<T extends React.ComponentType<any>>(
  factory: () => Promise<any>,
  namedExport: string
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      const m = await factory();
      return { default: m[namedExport] || m.default || m };
    } catch (e) {
      console.warn('[DossiersPage] Lazy load retry...', e);
      await new Promise((r) => setTimeout(r, 400));
      const m = await factory();
      return { default: m[namedExport] || m.default || m };
    }
  });
}

const DossierPrintModal = safeLazy(() => import('../components/dossiers/DossierPrintModal'), 'DossierPrintModal');
const StorageBinderPrintModal = safeLazy(() => import('../components/dossiers/StorageBinderPrintModal'), 'StorageBinderPrintModal');
const SupplementDossierModal = safeLazy(() => import('../components/dossiers/SupplementDossierModal'), 'SupplementDossierModal');
const DossierWorkflowModal = safeLazy(() => import('../components/dossiers/DossierWorkflowModal'), 'DossierWorkflowModal');
const ExcelImportModal = safeLazy(() => import('../components/common/ExcelImportModal'), 'ExcelImportModal');
import { VietnameseDateInput } from '../components/common/VietnameseDateInput';
const FilePreviewModal = safeLazy(() => import('../components/common/FilePreviewModal'), 'FilePreviewModal');
import {
  FolderArchive,
  Search,
  Plus,
  FileSpreadsheet,
  FileCheck,
  FileX,
  FileQuestion,
  Calendar,
  User as UserIcon,
  Tag,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Eye,
  Edit3,
  Trash2,
  MapPin,
  FileText,
  BellRing,
  Printer,
  Upload,
  Layers,
  Map,
  Compass,
  Building,
  Archive,
  Hash,
  FolderOpen,
  Bookmark,
  CheckSquare,
  RotateCcw,
  PauseCircle,
  PlayCircle,
  Info,
  Send,
  MoreVertical,
  ChevronDown,
  RefreshCw,
  Loader2,
  ShieldCheck,
  Download,
  PieChart as PieChartIcon,
  BarChart3,
  ChevronUp,
  ListChecks,
  XCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from 'recharts';

interface DossiersPageProps {
  initialFilter?: string;
  onOpenCreate: () => void;
  onOpenEdit: (dossier: Dossier) => void;
  onDeleteDossier: (dossier: Dossier) => void;
  onOpenCreateTaskFromDossier?: (dossier: Dossier) => void;
  onOpenViewer?: (attachment: any) => void;
  onTriggerAlert?: (dossier: Dossier) => void;
  onOpenTelegramConfig?: () => void;
}

const PROCEDURES_LIST = [
  'Cấp giấy lần đầu',
  'Đăng ký biến động',
  'Chuyển mục đích',
  'Thu hồi giấy chứng nhận',
  'Tặng cho đất nhà nước',
  'Xác định hạn mức đất ở',
  'Thu hồi khoáng sản',
  'Đơn thư',
  'Tranh chấp',
];

function matchesProcedureCategory(proc: string, category: string): boolean {
  const p = (proc || '').toLowerCase().trim();
  const c = (category || '').toLowerCase().trim();
  if (!p || !c) return false;
  if (p === c || p.includes(c) || c.includes(p)) return true;
  if (c === 'cấp giấy lần đầu' && (p.includes('lần đầu') || p.includes('cấp gcn'))) return true;
  if (c === 'đăng ký biến động' && p.includes('biến động')) return true;
  if (c === 'chuyển mục đích' && p.includes('chuyển mục đích')) return true;
  if (c === 'thu hồi giấy chứng nhận' && (p.includes('thu hồi giấy chứng nhận') || p.includes('thu hồi gcn') || p.includes('cấp lại giấy chứng nhận'))) return true;
  if (c === 'tặng cho đất nhà nước' && p.includes('tặng cho')) return true;
  if (c === 'xác định hạn mức đất ở' && p.includes('hạn mức')) return true;
  if (c === 'thu hồi khoáng sản' && p.includes('khoáng sản')) return true;
  if (c === 'đơn thư' && (p.includes('đơn thư') || p.includes('khiếu nại') || p.includes('kiến nghị'))) return true;
  if (c === 'tranh chấp' && p.includes('tranh chấp')) return true;
  return false;
}

export const DossiersPage: React.FC<DossiersPageProps> = ({
  initialFilter,
  onOpenCreate,
  onOpenEdit,
  onDeleteDossier,
  onOpenCreateTaskFromDossier,
  onOpenViewer,
  onTriggerAlert,
  onOpenTelegramConfig,
}) => {
  const {
    dossiers: rawDossiers,
    users,
    refreshData,
    restoreStandard60Dossiers,
    isSyncing,
    exportLocalBackup,
    importLocalBackup,
    lastLocalSavedTime,
  } = useRealtime();
  const dossiers = useMemo(() => (rawDossiers || []).filter((d) => d && !d.id?.startsWith('dos_kep')), [rawDossiers]);
  const { user, isLeader, isAdmin, isClerk, canEditDossier, canDeleteDossier } = useAuth();
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const [viewMode, setViewMode] = useState<'list' | 'field_plan' | 'storage_binders'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    if (initialFilter) {
      if (['in_progress', 'supplement', 'paused', 'resolved', 'overdue', 'rejected', 'all'].includes(initialFilter)) {
        setSelectedStatus(initialFilter);
      } else {
        setSearchQuery(initialFilter);
      }
    }
  }, [initialFilter]);
  const [selectedProcedureFilter, setSelectedProcedureFilter] = useState<string>('all');
  const [selectedHandler, setSelectedHandler] = useState<string>('all');
  const [selectedVillage, setSelectedVillage] = useState<string>('all');
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('all');

  const [selectedDossierDetail, setSelectedDossierDetail] = useState<Dossier | null>(null);

  // Cadastral 8-Step Workflow Tracking Modal state
  const [workflowDossier, setWorkflowDossier] = useState<Dossier | null>(null);

  // Compact Action Popover Menu State
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => setActiveActionMenuId(null);
    if (activeActionMenuId) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [activeActionMenuId]);

  const handleSaveWorkflow = async (steps: DossierWorkflowStepItem[]) => {
    if (!workflowDossier) return;
    try {
      const updated = await apiService.updateDossier(workflowDossier.id, {
        workflowSteps: steps,
        updatedBy: user?.id,
        updatedByName: user?.name,
      });
      try {
        await localVault.upsertLocalDossier(updated);
      } catch (_) {}
      if (selectedDossierDetail?.id === workflowDossier.id) {
        setSelectedDossierDetail((prev) => (prev ? { ...prev, workflowSteps: steps } : null));
      }
      setWorkflowDossier((prev) => (prev ? { ...prev, ...updated, workflowSteps: steps } : null));
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu các bước quy trình');
    }
  };

  useEffect(() => {
    if (selectedDossierDetail) {
      const latest = dossiers.find((d) => d.id === selectedDossierDetail.id);
      if (latest && JSON.stringify(latest) !== JSON.stringify(selectedDossierDetail)) {
        setSelectedDossierDetail(latest);
      }
    }
  }, [dossiers, selectedDossierDetail]);
  const [dossierToPrint, setDossierToPrint] = useState<Dossier | null>(null);
  const [printSlipType, setPrintSlipType] = useState<DossierSlipType>('receipt');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

  // Dedicated Supplement Modal State (Yêu cầu bổ sung hồ sơ - Mẫu số 02)
  const [dossierToSupplement, setDossierToSupplement] = useState<Dossier | null>(null);
  const [isSupplementing, setIsSupplementing] = useState<boolean>(false);
  const isSupplementingRef = useRef<boolean>(false);

  // Dedicated Pause Modal State (Tạm dừng xử lý hồ sơ - Đóng băng thời hạn)
  const [dossierToPause, setDossierToPause] = useState<Dossier | null>(null);
  const [pauseDate, setPauseDate] = useState<string>('');
  const [pauseReason, setPauseReason] = useState<string>('');
  const [isPausing, setIsPausing] = useState<boolean>(false);
  const isPausingRef = useRef<boolean>(false);

  // Storage Binder Manager Specific States
  const [activeBinderTab, setActiveBinderTab] = useState<string>('all');
  const [storageSlotSearch, setStorageSlotSearch] = useState<string>('');
  const [storageViewSubMode, setStorageViewSubMode] = useState<'table' | 'cards'>('table');
  const [isBinderPrintOpen, setIsBinderPrintOpen] = useState(false);
  const [activeQuickActionIds, setActiveQuickActionIds] = useState<Record<string, boolean>>({});
  const activeQuickActionIdsRef = useRef<Set<string>>(new Set());

  // Extract unique villages/hamlets from addresses
  const uniqueVillages = useMemo(() => {
    const set = new Set<string>();
    dossiers.forEach((d) => {
      if (d.address) {
        // extract Thôn / Ấp / Tổ if possible
        const match = d.address.match(/(Thôn\s+[^,]+|Ấp\s+[^,]+|Tổ\s+[^,]+|Khu\s+[^,]+)/i);
        if (match) {
          set.add(match[1].trim());
        } else {
          set.add(d.address.split(',')[0].trim());
        }
      }
    });
    return Array.from(set);
  }, [dossiers]);

  // Extract unique storage folders - strictly 3 standard binders
  const uniqueStorageFolders = useMemo(() => {
    return ['Kẹp 1', 'Kẹp 2', 'Kẹp 3'];
  }, []);

  // Analytics Chart Toggle & Click-to-filter state
  const [isChartVisible, setIsChartVisible] = useState(false);
  const [chartStatusFilter, setChartStatusFilter] = useState<'all' | 'in_progress' | 'overdue' | 'supplement' | 'paused' | 'resolved' | 'rejected'>('all');

  // Dossiers chart data calculation
  const dossierChartData = useMemo(() => {
    let resolved = 0;
    let inProgress = 0;
    let overdue = 0;
    let supplement = 0;
    let paused = 0;
    let rejected = 0;

    const procedureCounts: Record<string, number> = {};
    const villageCounts: Record<string, number> = {};

    dossiers.forEach((d) => {
      if (d.status === 'resolved') {
        resolved++;
      } else if (d.status === 'rejected') {
        rejected++;
      } else if (isDossierOverdue(d)) {
        overdue++;
      } else if (d.status === 'supplement') {
        supplement++;
      } else if (d.status === 'paused') {
        paused++;
      } else {
        inProgress++;
      }

      const proc = d.procedure || 'Khác';
      procedureCounts[proc] = (procedureCounts[proc] || 0) + 1;

      let vill = 'Chưa xác định';
      if (d.address) {
        const match = d.address.match(/(Thôn\s+[^,]+|Ấp\s+[^,]+|Tổ\s+[^,]+|Khu\s+[^,]+)/i);
        vill = match ? match[1].trim() : d.address.split(',')[0].trim() || 'Chưa xác định';
      }
      villageCounts[vill] = (villageCounts[vill] || 0) + 1;
    });

    const total = dossiers.length;
    const pieData = [
      {
        name: 'Đang giải quyết',
        key: 'in_progress' as const,
        value: inProgress,
        color: '#3b82f6',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        percentage: total > 0 ? Math.round((inProgress / total) * 100) : 0,
        description: 'Hồ sơ đang trong quy trình xử lý đúng hạn',
      },
      {
        name: 'Quá hạn giải quyết',
        key: 'overdue' as const,
        value: overdue,
        color: '#ef4444',
        bgColor: 'bg-rose-50',
        textColor: 'text-rose-700',
        borderColor: 'border-rose-200',
        percentage: total > 0 ? Math.round((overdue / total) * 100) : 0,
        description: 'Đã vượt quá hạn trả kết quả, cần chỉ đạo khẩn',
      },
      {
        name: 'Chờ bổ sung',
        key: 'supplement' as const,
        value: supplement,
        color: '#f59e0b',
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
        percentage: total > 0 ? Math.round((supplement / total) * 100) : 0,
        description: 'Đang chờ công dân bổ sung hồ sơ hoặc nghĩa vụ tài chính',
      },
      {
        name: 'Tạm dừng giải quyết',
        key: 'paused' as const,
        value: paused,
        color: '#8b5cf6',
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-700',
        borderColor: 'border-purple-200',
        percentage: total > 0 ? Math.round((paused / total) * 100) : 0,
        description: 'Đóng băng thời hạn do chờ xác minh hoặc cấp trên',
      },
      {
        name: 'Đã trả kết quả',
        key: 'resolved' as const,
        value: resolved,
        color: '#10b981',
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-200',
        percentage: total > 0 ? Math.round((resolved / total) * 100) : 0,
        description: 'Đã hoàn thành thủ tục và trả kết quả cho công dân',
      },
      {
        name: 'Đã trả hồ sơ (Không đủ ĐK)',
        key: 'rejected' as const,
        value: rejected,
        color: '#dc2626',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        percentage: total > 0 ? Math.round((rejected / total) * 100) : 0,
        description: 'Không đủ điều kiện giải quyết hoặc công dân rút hồ sơ',
      },
    ].filter((p) => p.value > 0);

    const barProcedureData = Object.entries(procedureCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const barVillageData = Object.entries(villageCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      total,
      pieData,
      barProcedureData,
      barVillageData,
      inProgress,
      overdue,
      supplement,
      paused,
      resolved,
      rejected,
    };
  }, [dossiers]);

  const filteredDossiers = useMemo(() => {
    return dossiers.filter((dos) => {
      // Allow all cadastral staff to view the full dossiers register by default

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCode = dos.code.toLowerCase().includes(q);
        const matchOwner = dos.owner.toLowerCase().includes(q);
        const matchParcel = dos.parcel.toLowerCase().includes(q);
        const matchMapSheet = (dos.mapSheet || '').toLowerCase().includes(q);
        const matchProcedure = dos.procedure.toLowerCase().includes(q);
        const matchHandler = (dos.handlerName || '').toLowerCase().includes(q);
        const matchAddr = (dos.address || '').toLowerCase().includes(q);
        const matchFolder = (dos.storageFolder || '').toLowerCase().includes(q);
        const matchIndex = (dos.storageIndex || '').toLowerCase().includes(q);
        if (
          !matchCode &&
          !matchOwner &&
          !matchParcel &&
          !matchMapSheet &&
          !matchProcedure &&
          !matchHandler &&
          !matchAddr &&
          !matchFolder &&
          !matchIndex
        ) {
          return false;
        }
      }

      if (selectedStatus !== 'all') {
        if (selectedStatus === 'overdue') {
          if (!isDossierOverdue(dos)) return false;
        } else if (selectedStatus === 'in_progress') {
          if (dos.status !== 'in_progress') return false;
        } else if (dos.status !== selectedStatus) {
          return false;
        }
      }
      if (selectedProcedureFilter !== 'all') {
        if (selectedProcedureFilter === 'Khác') {
          if (PROCEDURES_LIST.some((p) => matchesProcedureCategory(dos.procedure, p))) {
            return false;
          }
        } else if (!matchesProcedureCategory(dos.procedure, selectedProcedureFilter)) {
          return false;
        }
      }
      if (selectedHandler !== 'all' && dos.handlerId !== selectedHandler) return false;
      if (selectedVillage !== 'all' && !(dos.address || '').includes(selectedVillage)) return false;
      if (selectedFolderFilter !== 'all') {
        if (selectedFolderFilter === '__empty__') {
          if (dos.storageFolder && dos.storageFolder.trim()) return false;
        } else if (dos.storageFolder !== selectedFolderFilter) {
          return false;
        }
      }

      // Chart click-to-filter
      if (chartStatusFilter !== 'all') {
        if (chartStatusFilter === 'overdue') {
          if (!isDossierOverdue(dos)) return false;
        } else if (dos.status !== chartStatusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [
    dossiers,
    user,
    isLeader,
    isAdmin,
    isClerk,
    searchQuery,
    selectedStatus,
    selectedProcedureFilter,
    selectedHandler,
    selectedVillage,
    selectedFolderFilter,
    chartStatusFilter,
  ]);

  // Group dossiers for Field Inspection Planner
  const groupedByLocation = useMemo<Record<string, Dossier[]>>(() => {
    const map: Record<string, Dossier[]> = {};
    filteredDossiers.forEach((dos) => {
      let locKey = 'Địa bàn chung (Chưa phân thôn)';
      if (dos.address) {
        const match = dos.address.match(/(Thôn\s+[^,]+|Ấp\s+[^,]+|Tổ\s+[^,]+|Khu\s+[^,]+)/i);
        locKey = match ? match[1].trim() : dos.address.split(',')[0].trim() || 'Địa bàn chung';
      }
      if (!map[locKey]) map[locKey] = [];
      map[locKey].push(dos);
    });
    return map;
  }, [filteredDossiers]);

  // Group dossiers by Storage Folder (Kẹp hồ sơ lưu trữ)
  const groupedByStorageFolder = useMemo<Record<string, Dossier[]>>(() => {
    const map: Record<string, Dossier[]> = {};
    filteredDossiers.forEach((dos) => {
      const folderKey = dos.storageFolder && dos.storageFolder.trim() ? dos.storageFolder.trim() : '📁 Chưa phân kẹp lưu trữ';
      if (!map[folderKey]) map[folderKey] = [];
      map[folderKey].push(dos);
    });

    // Sort items within each binder by storageIndex (numerical if possible)
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => {
        const numA = parseInt(a.storageIndex || '0', 10);
        const numB = parseInt(b.storageIndex || '0', 10);
        if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
          return numA - numB;
        }
        return (a.storageIndex || '').localeCompare(b.storageIndex || '');
      });
    });

    return map;
  }, [filteredDossiers]);

  // Standard 3 binders strictly: 'Kẹp 1', 'Kẹp 2', 'Kẹp 3'
  const allAvailableBinderTabs = useMemo(() => {
    return ['Kẹp 1', 'Kẹp 2', 'Kẹp 3'];
  }, []);

  // Filtered and sorted dossier records for the active Storage Binder
  const storageBinderDossiers = useMemo(() => {
    return dossiers.filter((dos) => {
      // Role scope
      if (!isLeader && !isAdmin && !isClerk) {
        if (dos.handlerId !== user?.id && dos.createdBy !== user?.id) {
          return false;
        }
      }

      // Binder filter
      if (activeBinderTab !== 'all') {
        if (activeBinderTab === '__empty__') {
          if (dos.storageFolder && dos.storageFolder.trim()) return false;
        } else {
          const dosFolder = (dos.storageFolder || '').trim().toLowerCase();
          const targetTab = activeBinderTab.trim().toLowerCase();
          const matchExact = dosFolder === targetTab;
          const numActive = activeBinderTab.replace(/\D/g, '');
          const numDos = (dos.storageFolder || '').replace(/\D/g, '');
          const matchNum = numActive && numDos && numActive === numDos;
          if (!matchExact && !matchNum) return false;
        }
      }

      // Storage search query (e.g. "15" or owner name or parcel)
      if (storageSlotSearch.trim()) {
        const q = storageSlotSearch.trim().toLowerCase();
        const matchIndex = (dos.storageIndex || '').toLowerCase() === q || (dos.storageIndex || '').toLowerCase().includes(q);
        const matchCode = dos.code.toLowerCase().includes(q);
        const matchOwner = dos.owner.toLowerCase().includes(q);
        const matchParcel = dos.parcel.toLowerCase().includes(q);
        const matchMapSheet = (dos.mapSheet || '').toLowerCase().includes(q);
        const matchFolder = (dos.storageFolder || '').toLowerCase().includes(q);
        const matchAddr = (dos.address || '').toLowerCase().includes(q);
        if (!matchIndex && !matchCode && !matchOwner && !matchParcel && !matchMapSheet && !matchFolder && !matchAddr) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const numA = parseInt(a.storageIndex || '0', 10);
      const numB = parseInt(b.storageIndex || '0', 10);
      if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
        return numA - numB;
      }
      return (a.storageIndex || '').localeCompare(b.storageIndex || '');
    });
  }, [dossiers, user, isLeader, isAdmin, isClerk, activeBinderTab, storageSlotSearch]);

  const getBinderCount = (tabName: string) => {
    if (tabName === 'all') return dossiers.length;
    if (tabName === '__empty__') return dossiers.filter((d) => !d.storageFolder || !d.storageFolder.trim()).length;
    const numTab = tabName.replace(/\D/g, '');
    return dossiers.filter((d) => {
      if (!d.storageFolder) return false;
      if (d.storageFolder.trim().toLowerCase() === tabName.trim().toLowerCase()) return true;
      const numD = d.storageFolder.replace(/\D/g, '');
      return numTab && numD && numTab === numD;
    }).length;
  };

  const handleExportStorageBinder = () => {
    const title = activeBinderTab === 'all' ? 'Tat_ca_kep_ho_so' : activeBinderTab.replace(/\s+/g, '_');
    const data = storageBinderDossiers.map((d, index) => ({
      'TT': index + 1,
      'Mã hồ sơ': d.code,
      'Chủ hồ sơ / Vị trí': `${d.owner} ${d.address ? `(${d.address})` : ''}`,
      'Thửa / TBĐ': `Thửa ${d.parcel}, TBĐ ${d.mapSheet}`,
      'Thủ tục hành chính': d.procedure,
      'Kẹp lưu trữ (STT)': `${d.storageFolder || ''} ${d.storageIndex ? `(STT: ${d.storageIndex})` : ''}`.trim(),
      'Ngày nhận': d.receivedDate,
      'Hạn trả': d.dueDate,
      'Chuyên viên thụ lý': d.handlerName || '',
      'Trạng thái': d.status,
    }));
    exportToExcel(data, `Danh_muc_theo_doi_ho_so_${title}_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExport = () => {
    const data = filteredDossiers.map((d) => ({
      'Mã hồ sơ': d.code,
      'Chủ sử dụng / Người nộp': d.owner,
      'Số thửa': d.parcel,
      'Tờ bản đồ': d.mapSheet,
      'Thủ tục hành chính': d.procedure,
      'Kẹp lưu trữ': d.storageFolder || '',
      'STT trong kẹp': d.storageIndex || '',
      'Địa chỉ thửa đất': d.address || '',
      'Ngày nhận': d.receivedDate,
      'Hạn trả': d.dueDate,
      'Chuyên viên thụ lý': d.handlerName || '',
      'Trạng thái': d.status,
      'Kết quả giải quyết': d.result || '',
      'Ghi chú': d.note || '',
    }));
    exportToExcel(data, `Danh_sach_ho_so_dat_dai_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportWord = () => {
    if (filteredDossiers.length === 0) {
      alert('Không có hồ sơ nào trong danh sách để xuất Word.');
      return;
    }
    exportDossierListToWord(
      filteredDossiers,
      `Danh_sach_ho_so_dat_dai_${new Date().toISOString().split('T')[0]}`,
      'BÁO CÁO THỐNG KÊ DANH SÁCH HỒ SƠ ĐẤT ĐAI'
    );
  };

  const handleOpenSupplementModal = (dossier: Dossier, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canEditDossier(dossier)) {
      alert(`Bạn không có quyền yêu cầu bổ sung đối với hồ sơ của cán bộ ${dossier.handlerName || 'khác'}.`);
      return;
    }
    setDossierToSupplement(dossier);
  };

  const handleConfirmSupplement = async (data: {
    supplementDate: string;
    supplementNote: string;
    printSlip: boolean;
  }) => {
    if (!dossierToSupplement) return;
    if (isSupplementingRef.current) return;
    const targetDossier = dossierToSupplement;
    const dateToSave = data.supplementDate || new Date().toISOString().split('T')[0];
    const noteToSave = data.supplementNote.trim();

    isSupplementingRef.current = true;
    try {
      setIsSupplementing(true);
      const updated = await apiService.updateDossier(targetDossier.id, {
        status: 'supplement',
        supplementDate: dateToSave,
        supplementNote: noteToSave,
        updatedBy: user?.id,
        updatedByName: user?.name,
      });
      try {
        await localVault.upsertLocalDossier(updated);
      } catch (_) {}

      if (selectedDossierDetail?.id === targetDossier.id) {
        setSelectedDossierDetail((prev) =>
          prev
            ? {
                ...prev,
                status: 'supplement',
                supplementDate: dateToSave,
                supplementNote: noteToSave,
              }
            : null
        );
      }

      setDossierToSupplement(null);

      if (data.printSlip) {
        const updatedDossier: Dossier = {
          ...targetDossier,
          status: 'supplement',
          supplementDate: dateToSave,
          supplementNote: noteToSave,
        };
        setPrintSlipType('supplement');
        setDossierToPrint(updatedDossier);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi yêu cầu bổ sung hồ sơ');
    } finally {
      isSupplementingRef.current = false;
      setIsSupplementing(false);
    }
  };

  const handleQuickReceiveSupplement = async (dossier: Dossier, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canEditDossier(dossier)) {
      alert(`Bạn không có quyền cập nhật hồ sơ của cán bộ ${dossier.handlerName || 'khác'}.`);
      return;
    }
    const actionKey = `receive-${dossier.id}`;
    if (activeQuickActionIdsRef.current.has(actionKey) || activeQuickActionIds[actionKey]) return;

    const today = new Date().toISOString().split('T')[0];
    const standardDays = getStandardWorkingDaysForProcedure(dossier.procedure);
    const newDueDate = addWorkingDays(today, standardDays);

    const confirmed = window.confirm(
      `Xác nhận đã tiếp nhận đủ hồ sơ bổ sung của công dân ${dossier.owner} (Mã HS: ${dossier.code})?\n\nTheo quy định của Luật Đất đai, hệ thống sẽ TÍNH LẠI THỜI GIAN GIẢI QUYẾT TỪ ĐẦU:\n• Ngày tiếp nhận mới: Hôm nay (${formatDate(today)})\n• Thời hạn cộng lại: Trọn vẹn ${standardDays} ngày làm việc (Thủ tục: ${dossier.procedure})\n• HẠN TRẢ MỚI: ${formatDate(newDueDate)} (Đã trừ các ngày thứ Bảy, Chủ nhật và ngày Lễ)\n• Trạng thái: Đang xử lý.`
    );
    if (!confirmed) return;

    activeQuickActionIdsRef.current.add(actionKey);

    try {
      setActiveQuickActionIds((prev) => ({ ...prev, [actionKey]: true }));
      const updated = await apiService.updateDossier(dossier.id, {
        status: 'in_progress',
        receivedDate: today,
        dueDate: newDueDate,
        resumedDate: today,
        note: dossier.note
          ? `${dossier.note} | Đã nhận đủ bổ sung ngày ${formatDate(today)} (Tính lại từ đầu +${standardDays} ngày làm việc, Hạn mới: ${formatDate(newDueDate)})`
          : `Đã nhận đủ bổ sung ngày ${formatDate(today)} (Tính lại từ đầu +${standardDays} ngày làm việc, Hạn mới: ${formatDate(newDueDate)})`,
        updatedBy: user?.id,
        updatedByName: user?.name,
      });
      try {
        await localVault.upsertLocalDossier(updated);
      } catch (_) {}
      if (selectedDossierDetail?.id === dossier.id) {
        setSelectedDossierDetail((prev) => prev ? {
          ...prev,
          status: 'in_progress',
          receivedDate: today,
          dueDate: newDueDate,
          resumedDate: today,
        } : null);
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật tiếp nhận bổ sung hồ sơ');
    } finally {
      activeQuickActionIdsRef.current.delete(actionKey);
      setActiveQuickActionIds((prev) => {
        const next = { ...prev };
        delete next[actionKey];
        return next;
      });
    }
  };

  const handleOpenPauseModal = (dossier: Dossier, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canEditDossier(dossier)) {
      alert(`Bạn không có quyền tạm dừng hồ sơ của cán bộ ${dossier.handlerName || 'khác'}.`);
      return;
    }
    setDossierToPause(dossier);
    setPauseDate(dossier.pauseDate || new Date().toISOString().split('T')[0]);
    setPauseReason(dossier.pauseReason || '');
  };

  const handleConfirmPause = async () => {
    if (!dossierToPause) return;
    if (isPausingRef.current) return;
    const targetDossier = dossierToPause;
    const dateToSave = pauseDate || new Date().toISOString().split('T')[0];
    const reasonToSave = pauseReason.trim() || 'Tạm dừng giải quyết theo nghiệp vụ';

    isPausingRef.current = true;
    try {
      setIsPausing(true);
      const updated = await apiService.updateDossier(targetDossier.id, {
        status: 'paused',
        pauseDate: dateToSave,
        pauseReason: reasonToSave,
        updatedBy: user?.id,
        updatedByName: user?.name,
      });
      try {
        await localVault.upsertLocalDossier(updated);
      } catch (_) {}

      if (selectedDossierDetail?.id === targetDossier.id) {
        setSelectedDossierDetail((prev) =>
          prev
            ? {
                ...prev,
                status: 'paused',
                pauseDate: dateToSave,
                pauseReason: reasonToSave,
              }
            : null
        );
      }

      setDossierToPause(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạm dừng hồ sơ');
    } finally {
      isPausingRef.current = false;
      setIsPausing(false);
    }
  };

  const handleQuickResumePaused = async (dossier: Dossier, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canEditDossier(dossier)) {
      alert(`Bạn không có quyền tiếp tục hồ sơ của cán bộ ${dossier.handlerName || 'khác'}.`);
      return;
    }
    const actionKey = `resume-${dossier.id}`;
    if (activeQuickActionIdsRef.current.has(actionKey) || activeQuickActionIds[actionKey]) return;

    const today = new Date().toISOString().split('T')[0];
    const pauseStart = dossier.pauseDate || today;
    const { newDueDate, remainingWorkingDays, pausedWorkingDays } = calculateResumedDueDate(
      dossier.dueDate,
      pauseStart,
      today
    );

    const confirmed = window.confirm(
      `Xác nhận BỎ TẠM DỪNG hồ sơ ${dossier.code} (Chủ đất: ${dossier.owner})?\n\n• Ngày bắt đầu tạm dừng: ${formatDate(pauseStart)}\n• Ngày tiếp tục xử lý: ${formatDate(today)}\n• Thời gian tạm dừng: ${pausedWorkingDays} ngày làm việc\n• Thời gian còn lại được chạy tiếp: ${remainingWorkingDays} ngày làm việc\n• HẠN TRẢ MỚI: ${formatDate(newDueDate)}\n\nTrạng thái sẽ chuyển về "Đang xử lý".`
    );
    if (!confirmed) return;

    activeQuickActionIdsRef.current.add(actionKey);
    try {
      setActiveQuickActionIds((prev) => ({ ...prev, [actionKey]: true }));
      const prevPaused = dossier.pausedDays || 0;
      const updated = await apiService.updateDossier(dossier.id, {
        status: 'in_progress',
        dueDate: newDueDate,
        resumedDate: today,
        pausedDays: prevPaused + pausedWorkingDays,
        note: dossier.note
          ? `${dossier.note} | Tiếp tục sau tạm dừng ngày ${formatDate(today)} (Hạn mới: ${formatDate(newDueDate)})`
          : `Tiếp tục sau tạm dừng ngày ${formatDate(today)} (Hạn mới: ${formatDate(newDueDate)})`,
        updatedBy: user?.id,
        updatedByName: user?.name,
      });
      try {
        await localVault.upsertLocalDossier(updated);
      } catch (_) {}

      if (selectedDossierDetail?.id === dossier.id) {
        setSelectedDossierDetail((prev) =>
          prev
            ? {
                ...prev,
                status: 'in_progress',
                dueDate: newDueDate,
                resumedDate: today,
                pausedDays: prevPaused + pausedWorkingDays,
              }
            : null
        );
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi khi bỏ tạm dừng hồ sơ');
    } finally {
      activeQuickActionIdsRef.current.delete(actionKey);
      setActiveQuickActionIds((prev) => {
        const next = { ...prev };
        delete next[actionKey];
        return next;
      });
    }
  };

  const getStatusBadge = (status: DossierStatus) => {
    switch (status) {
      case 'resolved':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Đã giải quyết</span>;
      case 'overdue':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">Quá hạn</span>;
      case 'supplement':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">Cần bổ sung</span>;
      case 'paused':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-300">Tạm dừng</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">Trả hồ sơ</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Đang xử lý</span>;
    }
  };

  return (
    <div className="space-y-3 pb-16 sm:pb-20">
      {/* Compact Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">Quản lý Hồ sơ Đất đai</h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
              {filteredDossiers.length}/{dossiers.length} hồ sơ
            </span>
            <span
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-semibold"
              title={`Đã lưu an toàn trên ổ cứng & đồng bộ máy chủ (${lastLocalSavedTime || 'Ngay tức thì'})`}
            >
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Đã bảo vệ</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
            Tiếp nhận Một cửa, kẹp lưu trữ giấy, in phiếu hẹn QR & kế hoạch thẩm tra theo Thôn.
          </p>
        </div>

        {/* Compact Action Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <input
            ref={backupFileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (window.confirm(`Bạn có muốn nạp và khôi phục hồ sơ đất đai từ file sao lưu "${file.name}"?`)) {
                  try {
                    await importLocalBackup(file);
                  } catch (_) {}
                }
                e.target.value = '';
              }
            }}
          />

          <button
            onClick={() => setIsChartVisible(!isChartVisible)}
            className={`h-8 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition cursor-pointer ${
              isChartVisible
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white hover:bg-blue-50 text-blue-700 border-blue-200'
            }`}
            title="Bật/Tắt Biểu đồ phân tích tình trạng hồ sơ đất đai"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{isChartVisible ? 'Ẩn biểu đồ' : 'Biểu đồ'}</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="h-8 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center gap-1 border border-slate-200 transition cursor-pointer"
            title="Nhập danh sách hồ sơ từ file Excel"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Nhập Excel</span>
          </button>

          <button
            onClick={handleExport}
            className="h-8 px-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center gap-1 border border-slate-200 transition cursor-pointer"
            title="Xuất danh sách ra Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={handleExportWord}
            className="h-8 px-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center gap-1 border border-slate-200 transition cursor-pointer"
            title="Xuất danh sách ra Word (.doc chuẩn hành chính TCVN)"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span>Xuất Word</span>
          </button>

          <button
            onClick={exportLocalBackup}
            className="h-8 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center gap-1 border border-amber-200 transition cursor-pointer"
            title="Tải về file sao lưu dự phòng (.json)"
          >
            <Download className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">Sao lưu</span>
          </button>

          {(isAdmin || isLeader) && (
            <button
              onClick={() => backupFileInputRef.current?.click()}
              className="h-8 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center gap-1 border border-slate-200 transition cursor-pointer"
              title="Khôi phục hồ sơ từ file sao lưu JSON"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden xl:inline">Khôi phục</span>
            </button>
          )}

          {onOpenTelegramConfig && (
            <button
              onClick={onOpenTelegramConfig}
              className="h-8 px-2.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-bold flex items-center gap-1 border border-sky-200 transition cursor-pointer"
              title="Cấu hình nhận nhắc hạn hồ sơ qua Telegram Bot"
            >
              <Send className="w-3.5 h-3.5 text-sky-500" />
              <span className="hidden md:inline">Telegram</span>
            </button>
          )}

          <button
            onClick={onOpenCreate}
            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tiếp nhận HS mới</span>
          </button>
        </div>
      </div>

      {/* Collapsible Executive Analytics Panel */}
      {isChartVisible && (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-xs overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3.5 border-b border-blue-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  Phân tích Cơ cấu & Tiến độ Hồ sơ Đất đai
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                    Tổng {dossierChartData.total} hồ sơ
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Phân loại theo hạn xử lý, cơ cấu thủ tục hành chính và mật độ hồ sơ theo thôn
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {chartStatusFilter !== 'all' && (
                <button
                  onClick={() => setChartStatusFilter('all')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                  title="Xem tất cả hồ sơ"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Xóa lọc ({chartStatusFilter})</span>
                </button>
              )}
              <button
                onClick={() => setIsChartVisible(false)}
                className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Thu gọn</span>
              </button>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left: Recharts Donut Pie Chart */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center bg-slate-50/50 rounded-xl p-3 border border-slate-100">
              <div className="w-full h-52 relative flex items-center justify-center">
                {dossierChartData.total === 0 ? (
                  <div className="text-xs text-slate-400">Chưa có hồ sơ nào</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dossierChartData.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        cursor="pointer"
                        onClick={(entry: any) => {
                          if (entry && entry.key) {
                            setChartStatusFilter((prev) => (prev === entry.key ? 'all' : entry.key));
                          }
                        }}
                      >
                        {dossierChartData.pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke={chartStatusFilter === entry.key ? '#1e293b' : '#ffffff'}
                            strokeWidth={chartStatusFilter === entry.key ? 3 : 1.5}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: any, name: any) => [`${value} hồ sơ`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {/* Center metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-800 leading-none">
                    {dossierChartData.total}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">
                    Hồ sơ
                  </span>
                </div>
              </div>

              {/* Mini Legend Buttons */}
              <div className="w-full grid grid-cols-2 gap-1.5 mt-2">
                {dossierChartData.pieData.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setChartStatusFilter((prev) => (prev === item.key ? 'all' : item.key))}
                    className={`p-1.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                      chartStatusFilter === item.key
                        ? 'border-blue-500 ring-2 ring-blue-200 bg-white'
                        : `${item.bgColor} ${item.borderColor}`
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-semibold text-slate-800 truncate">{item.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-900 ml-1">{item.value}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Middle: Procedures Breakdown (Bar Chart) */}
            <div className="lg:col-span-4 flex flex-col justify-between bg-slate-50/50 rounded-xl p-3 border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Top Thủ tục tiếp nhận nhiều nhất
                </span>
                <span className="text-[10px] text-slate-400">Số lượng</span>
              </div>
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dossierChartData.barProcedureData} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                    <XAxis type="number" allowDecimals={false} hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fontSize: 10, fill: '#475569' }}
                      tickFormatter={(val) => (val.length > 15 ? val.slice(0, 15) + '...' : val)}
                    />
                    <RechartsTooltip formatter={(val: any) => [`${val} hồ sơ`, 'Số lượng']} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-slate-500 text-center mt-1">
                Tập trung cao điểm ở Đăng ký biến động & Cấp GCN lần đầu
              </div>
            </div>

            {/* Right: Village Distribution (Bar Chart) */}
            <div className="lg:col-span-4 flex flex-col justify-between bg-slate-50/50 rounded-xl p-3 border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Mật độ hồ sơ theo Thôn
                </span>
                <span className="text-[10px] text-slate-400">Số lượng</span>
              </div>
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dossierChartData.barVillageData} layout="vertical" margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                    <XAxis type="number" allowDecimals={false} hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={90}
                      tick={{ fontSize: 10, fill: '#475569' }}
                      tickFormatter={(val) => (val.length > 12 ? val.slice(0, 12) + '...' : val)}
                    />
                    <RechartsTooltip formatter={(val: any) => [`${val} hồ sơ`, 'Số lượng']} />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-slate-500 text-center mt-1">
                Số liệu phản ánh lượng biến động quyền sử dụng đất theo địa bàn
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified View Switcher + Status Chips + Filter Toolbar */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
        {/* Top Row: View Mode Switcher + Status Filter Chips */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          {/* Left View Switcher */}
          <div className="flex flex-wrap items-center gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200/80 text-[11px]">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5 text-blue-600" />
              <span>Danh sách ({filteredDossiers.length})</span>
            </button>

            <button
              onClick={() => setViewMode('storage_binders')}
              className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'storage_binders' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-600 hover:text-amber-700'
              }`}
              title="Tra cứu theo sổ & kẹp lưu trữ giấy vật lý"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Kẹp lưu trữ</span>
            </button>

            <button
              onClick={() => setViewMode('field_plan')}
              className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'field_plan' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kế hoạch thực địa</span>
            </button>
          </div>

          {/* Right Status Chips */}
          <div className="flex flex-wrap items-center gap-1 text-[11px]">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-2 py-1 rounded-md font-bold transition cursor-pointer ${
                selectedStatus === 'all' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setSelectedStatus('in_progress')}
              className={`px-2 py-1 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                selectedStatus === 'in_progress' ? 'bg-blue-600 text-white shadow-2xs' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Đang xử lý</span>
            </button>
            <button
              onClick={() => setSelectedStatus('supplement')}
              className={`px-2 py-1 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                selectedStatus === 'supplement' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <FileQuestion className="w-3 h-3" />
              <span>Cần bổ sung</span>
            </button>
            <button
              onClick={() => setSelectedStatus('paused')}
              className={`px-2 py-1 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                selectedStatus === 'paused' ? 'bg-purple-700 text-white shadow-2xs' : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
              }`}
            >
              <PauseCircle className="w-3 h-3" />
              <span>Tạm dừng</span>
            </button>
            <button
              onClick={() => setSelectedStatus('overdue')}
              className={`px-2 py-1 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                selectedStatus === 'overdue' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>Quá hạn</span>
            </button>
            <button
              onClick={() => setSelectedStatus('resolved')}
              className={`px-2 py-1 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                selectedStatus === 'resolved' ? 'bg-emerald-700 text-white shadow-2xs' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Đã giải quyết</span>
            </button>
            <button
              onClick={() => setSelectedStatus('rejected')}
              className={`px-2 py-1 rounded-md font-bold transition flex items-center gap-1 cursor-pointer ${
                selectedStatus === 'rejected' ? 'bg-red-700 text-white shadow-2xs' : 'bg-red-50 text-red-800 hover:bg-red-100'
              }`}
            >
              <XCircle className="w-3 h-3" />
              <span>Trả hồ sơ</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Search & 4 Compact Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
          {/* Search Input */}
          <div className="relative sm:col-span-4">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã HS, chủ đất, số thửa, TBĐ, STT kẹp..."
              className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
            />
          </div>

          {/* Procedure Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedProcedureFilter}
              onChange={(e) => setSelectedProcedureFilter(e.target.value)}
              className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-semibold truncate"
              title="Lọc theo thủ tục hành chính"
            >
              <option value="all">Tất cả thủ tục</option>
              {PROCEDURES_LIST.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              <option value="Khác">Khác (tự nhập)</option>
            </select>
          </div>

          {/* Storage Binder Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedFolderFilter}
              onChange={(e) => setSelectedFolderFilter(e.target.value)}
              className="w-full h-8 bg-amber-50/70 border border-amber-200 rounded-lg px-2 text-amber-950 focus:ring-2 focus:ring-amber-500 outline-none text-xs font-bold truncate"
              title="Lọc theo kẹp lưu trữ"
            >
              <option value="all">📁 Tất cả Kẹp</option>
              {uniqueStorageFolders.map((f) => (
                <option key={f} value={f}>
                  📂 {f}
                </option>
              ))}
              <option value="__empty__">Chưa phân kẹp</option>
            </select>
          </div>

          {/* Village Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedVillage}
              onChange={(e) => setSelectedVillage(e.target.value)}
              className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-semibold truncate"
            >
              <option value="all">Tất cả Thôn</option>
              {uniqueVillages.map((v) => (
                <option key={v} value={v}>
                  📍 {v}
                </option>
              ))}
            </select>
          </div>

          {/* Handler Filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedHandler}
              onChange={(e) => setSelectedHandler(e.target.value)}
              className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-semibold truncate"
            >
              <option value="all">Tất cả cán bộ</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  👤 {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: Standard Table List */}
      {viewMode === 'list' && (
        <div className="rounded-xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2 px-2.5 whitespace-nowrap w-[110px]">Mã HS / Kẹp</th>
                  <th className="py-2 px-2.5 min-w-[130px] max-w-[200px]">Chủ hồ sơ / Vị trí</th>
                  <th className="py-2 px-2 text-center whitespace-nowrap w-[75px]">Thửa / TBĐ</th>
                  <th className="py-2 px-2.5 min-w-[130px] max-w-[210px]">Thủ tục hành chính</th>
                  <th className="py-2 px-2 text-center whitespace-nowrap w-[105px]">Thời hạn</th>
                  <th className="py-2 px-2 text-center whitespace-nowrap w-[110px]">Cán bộ / T.Thái</th>
                  <th className="py-2 px-2.5 text-right whitespace-nowrap w-[140px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDossiers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                      Không tìm thấy hồ sơ đất đai nào phù hợp điều kiện lọc.
                    </td>
                  </tr>
                ) : (
                  filteredDossiers.map((dos) => {
                    const rem = getDaysRemaining(dos.dueDate);
                    const hasEditPerm = canEditDossier(dos);
                    const hasDeletePerm = canDeleteDossier(dos);
                    return (
                      <tr
                        key={dos.id}
                        onClick={() => setSelectedDossierDetail(dos)}
                        className="hover:bg-emerald-50/40 cursor-pointer transition-colors group"
                      >
                        {/* Mã HS + Kẹp */}
                        <td className="py-2 px-2.5 whitespace-nowrap align-middle">
                          <p className="font-mono font-bold text-emerald-700 text-xs">
                            {dos.code}
                          </p>
                          <div className="mt-0.5">
                            {dos.storageFolder ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[10px]">
                                <Bookmark className="w-2.5 h-2.5 text-amber-700" />
                                <span>{dos.storageFolder}</span>
                                {dos.storageIndex && (
                                  <span className="px-1 bg-amber-600 text-white rounded text-[9px] font-mono">
                                    #{dos.storageIndex}
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">Chưa kẹp</span>
                            )}
                          </div>
                        </td>

                        {/* Chủ hồ sơ + Địa chỉ */}
                        <td className="py-2 px-2.5 align-middle max-w-[200px]">
                          <p className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors text-xs truncate" title={dos.owner}>
                            {dos.owner}
                          </p>
                          {dos.address && (
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate" title={dos.address}>
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{dos.address}</span>
                            </p>
                          )}
                        </td>

                        {/* Thửa / TBĐ */}
                        <td className="py-2 px-2 font-semibold text-slate-800 whitespace-nowrap text-xs text-center align-middle">
                          <div>Thửa <b>{dos.parcel}</b></div>
                          <div className="text-slate-500 text-[11px]">TBĐ <b>{dos.mapSheet}</b></div>
                        </td>

                        {/* Thủ tục */}
                        <td className="py-2 px-2.5 text-slate-700 font-medium text-xs align-middle max-w-[210px]">
                          <div className="line-clamp-2 leading-snug" title={dos.procedure}>
                            {dos.procedure}
                          </div>
                        </td>

                        {/* Thời hạn (Hạn trả + Nhận) */}
                        <td className="py-2 px-2 text-center whitespace-nowrap align-middle">
                          <p className="font-bold text-slate-900 font-mono text-xs">{formatDate(dos.dueDate)}</p>
                          {dos.status === 'supplement' ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <FileQuestion className="w-2.5 h-2.5 text-amber-700" />
                              Yêu cầu BS
                            </span>
                          ) : dos.status === 'paused' ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                              <PauseCircle className="w-2.5 h-2.5 text-purple-700" />
                              Tạm dừng
                            </span>
                          ) : dos.status === 'resolved' ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                              Hoàn thành
                            </span>
                          ) : (
                            <p className={`text-[10px] font-semibold ${rem.statusClass}`}>{rem.label}</p>
                          )}
                          <p className="text-[10px] text-slate-400 font-mono">Nhận: {formatDate(dos.receivedDate)}</p>
                        </td>

                        {/* Cán bộ + Trạng thái */}
                        <td className="py-2 px-2 text-center whitespace-nowrap align-middle">
                          <p className="font-semibold text-slate-700 text-xs mb-0.5 truncate max-w-[110px]">{dos.handlerName || 'Chưa phân công'}</p>
                          {getStatusBadge(dos.status)}
                        </td>

                        {/* Thao tác (Gọn gàng: Xem, 8 bước quy trình, Sửa, In, menu thao tác khác) */}
                        <td
                          className="py-2 px-2.5 text-right whitespace-nowrap align-middle"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-1 relative">
                            {/* Nút 8 bước quy trình */}
                            {(() => {
                              const doneCount = (dos.workflowSteps || []).filter((s) => s.completed).length;
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setWorkflowDossier(dos);
                                  }}
                                  className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer border ${
                                    doneCount > 0
                                      ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                  title="Theo dõi & cập nhật 8 bước quy trình giải quyết hồ sơ địa chính"
                                >
                                  <ListChecks className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>{doneCount > 0 ? `${doneCount}/8` : '8 bước'}</span>
                                </button>
                              );
                            })()}

                            {/* Xem chi tiết */}
                            <button
                              type="button"
                              onClick={() => setSelectedDossierDetail(dos)}
                              className="p-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer"
                              title="Xem chi tiết hồ sơ"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* In biểu mẫu */}
                            <button
                              type="button"
                              onClick={() => {
                                setPrintSlipType('receipt');
                                setDossierToPrint(dos);
                              }}
                              className="p-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                              title="In phiếu hẹn & biên bản tiếp nhận"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Sửa (chỉ hiện nếu có quyền) */}
                            {hasEditPerm ? (
                              <button
                                type="button"
                                onClick={() => onOpenEdit(dos)}
                                className="p-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition cursor-pointer"
                                title="Chỉnh sửa hồ sơ / Chuyển trạng thái Trả hồ sơ"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-medium"
                                title={`Hồ sơ của ${dos.handlerName || 'cán bộ khác'} - Chỉ xem`}
                              >
                                Chỉ xem
                              </span>
                            )}

                            {/* Nút 3 chấm mở Dropdown menu thao tác khác */}
                            {(hasEditPerm || hasDeletePerm) && (
                              <div className="relative inline-block text-left">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionMenuId(activeActionMenuId === `action-menu-${dos.id}` ? null : `action-menu-${dos.id}`);
                                  }}
                                  className="p-1 rounded-md bg-slate-50 hover:bg-slate-200 text-slate-600 border border-slate-200 transition cursor-pointer"
                                  title="Thao tác khác"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {activeActionMenuId === `action-menu-${dos.id}` && (
                                  <div
                                    className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-left animate-in fade-in-50 zoom-in-95"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {hasEditPerm && dos.status === 'supplement' && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          setActiveActionMenuId(null);
                                          handleQuickReceiveSupplement(dos, e);
                                        }}
                                        disabled={activeQuickActionIds[`receive-${dos.id}`]}
                                        className="w-full px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 font-semibold transition cursor-pointer"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Nhận đủ BS ➔ Tính lại hạn</span>
                                      </button>
                                    )}

                                    {hasEditPerm && dos.status === 'paused' && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          setActiveActionMenuId(null);
                                          handleQuickResumePaused(dos, e);
                                        }}
                                        disabled={activeQuickActionIds[`resume-${dos.id}`]}
                                        className="w-full px-3 py-1.5 text-xs text-purple-700 hover:bg-purple-50 flex items-center gap-2 font-semibold transition cursor-pointer"
                                      >
                                        <PlayCircle className="w-3.5 h-3.5 text-purple-600" />
                                        <span>Bỏ tạm dừng ➔ Chạy tiếp hạn</span>
                                      </button>
                                    )}

                                    {hasEditPerm && dos.status !== 'resolved' && dos.status !== 'rejected' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            setActiveActionMenuId(null);
                                            handleOpenSupplementModal(dos, e);
                                          }}
                                          className="w-full px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-50 flex items-center gap-2 font-semibold transition cursor-pointer"
                                        >
                                          <FileQuestion className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Yêu cầu bổ sung (Mẫu 02)</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            setActiveActionMenuId(null);
                                            handleOpenPauseModal(dos, e);
                                          }}
                                          className="w-full px-3 py-1.5 text-xs text-purple-800 hover:bg-purple-50 flex items-center gap-2 font-semibold transition cursor-pointer"
                                        >
                                          <PauseCircle className="w-3.5 h-3.5 text-purple-600" />
                                          <span>Tạm dừng giải quyết</span>
                                        </button>
                                      </>
                                    )}

                                    {onOpenCreateTaskFromDossier && hasEditPerm && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveActionMenuId(null);
                                          onOpenCreateTaskFromDossier(dos);
                                        }}
                                        className="w-full px-3 py-1.5 text-xs text-blue-700 hover:bg-blue-50 flex items-center gap-2 font-semibold transition cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Tạo công việc từ hồ sơ</span>
                                      </button>
                                    )}

                                    {hasDeletePerm && (
                                      <>
                                        <div className="my-1 border-t border-slate-100" />
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveActionMenuId(null);
                                            onDeleteDossier(dos);
                                          }}
                                          className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold transition cursor-pointer"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                          <span>Xóa hồ sơ</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Summary Bar */}
          <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700">
                Hiển thị: <b className="text-slate-900">{filteredDossiers.length}</b> / <b className="text-slate-900">{dossiers.length}</b> hồ sơ đất đai
              </span>
              {selectedStatus !== 'all' && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  Trạng thái: {selectedStatus === 'in_progress' ? 'Đang xử lý' :
                                selectedStatus === 'supplement' ? 'Cần bổ sung' :
                                selectedStatus === 'paused' ? 'Tạm dừng' :
                                selectedStatus === 'overdue' ? 'Quá hạn' :
                                selectedStatus === 'resolved' ? 'Đã giải quyết' : selectedStatus}
                </span>
              )}
              {selectedVillage !== 'all' && (
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px]">
                  Địa bàn: {selectedVillage}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <span>💡 Bấm vào dòng để xem chi tiết • Chỉ Admin, Lãnh đạo hoặc cán bộ trực tiếp thụ lý mới được sửa/xóa hồ sơ</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: Quản lý Hồ sơ Lưu Kẹp (Physical Binder & Slot Index Manager) */}
      {viewMode === 'storage_binders' && (
        <div className="space-y-4">
          {/* Binder Header Banner */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-amber-950 flex items-center gap-2">
                  <span>Quản Lý Kẹp Hồ Sơ Giấy & Tra Cứu Vị Trí Lưu Trữ</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[11px] font-mono font-bold">
                    {storageBinderDossiers.length} hồ sơ trong kẹp
                  </span>
                </h3>
                <p className="text-xs text-amber-900 mt-0.5">
                  Mô phỏng chính xác phương pháp lưu trữ vật lý: Khi sổ tiếp nhận ghi <b>số 15</b>, cán bộ mở đúng <b>Kẹp 15</b> và rút hồ sơ tại <b>Số thứ tự 15</b> trong giây lát.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
              <div className="flex items-center bg-amber-100/80 p-0.5 rounded-xl border border-amber-300 text-xs font-semibold">
                <button
                  onClick={() => setStorageViewSubMode('table')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    storageViewSubMode === 'table' ? 'bg-white text-amber-950 font-bold shadow-2xs' : 'text-amber-800 hover:text-black'
                  }`}
                >
                  📋 Bảng Danh Mục
                </button>
                <button
                  onClick={() => setStorageViewSubMode('cards')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    storageViewSubMode === 'cards' ? 'bg-white text-amber-950 font-bold shadow-2xs' : 'text-amber-800 hover:text-black'
                  }`}
                >
                  🗂️ Thẻ Tủ Lưu Kẹp
                </button>
              </div>

              <button
                onClick={handleExportStorageBinder}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Xuất Excel kẹp này"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Xuất Excel</span>
              </button>

              <button
                onClick={() => setIsBinderPrintOpen(true)}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="In Danh mục theo dõi hồ sơ chuẩn biểu mẫu A4"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In Danh mục theo dõi</span>
              </button>
            </div>
          </div>

          {/* Sub-Tabs: Phân theo Kẹp 1, 2, 3, 4, 5, 6, 7, 8, ... 15, Tất cả */}
          <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-amber-600" />
                <span>Chọn Kẹp Lưu Trữ Cần Xem / Tra Cứu:</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium italic">
                (Click vào kẹp để mở danh mục chi tiết)
              </span>
            </div>

            {/* Binder Tab Buttons Bar */}
            <div className="flex flex-wrap items-center gap-1.5 pb-1">
              <button
                onClick={() => setActiveBinderTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeBinderTab === 'all'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-amber-100 hover:text-amber-900 border border-gray-200'
                }`}
              >
                <span>📂 Tất Cả Kẹp</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeBinderTab === 'all' ? 'bg-amber-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {getBinderCount('all')}
                </span>
              </button>

              {allAvailableBinderTabs.map((tabName) => {
                const count = getBinderCount(tabName);
                const isActive = activeBinderTab === tabName;
                return (
                  <button
                    key={tabName}
                    onClick={() => setActiveBinderTab(tabName)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-white shadow-xs'
                        : count > 0
                        ? 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-gray-200'
                    }`}
                  >
                    <span>📁 {tabName}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isActive
                          ? 'bg-amber-700 text-white'
                          : count > 0
                          ? 'bg-amber-200 text-amber-900 font-extrabold'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}

              <button
                onClick={() => setActiveBinderTab('__empty__')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  activeBinderTab === '__empty__'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-800 border border-gray-200'
                }`}
              >
                <span>⚠️ Chưa Phân Kẹp</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeBinderTab === '__empty__' ? 'bg-rose-800 text-white' : 'bg-slate-200 text-slate-600'}`}>
                  {getBinderCount('__empty__')}
                </span>
              </button>
            </div>

            {/* Quick Search inside Active Binder */}
            <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-center gap-2 text-xs">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={storageSlotSearch}
                  onChange={(e) => setStorageSlotSearch(e.target.value)}
                  placeholder="Tra cứu nhanh theo STT kẹp (VD: gõ 15 để nhảy đến STT 15), mã hồ sơ, chủ đất, số thửa..."
                  className="w-full bg-slate-50 border border-amber-200 rounded-xl pl-9 pr-3 py-1.5 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                />
              </div>
              {storageSlotSearch && (
                <button
                  onClick={() => setStorageSlotSearch('')}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold cursor-pointer shrink-0"
                >
                  Xóa tìm kiếm
                </button>
              )}
            </div>
          </div>

          {/* SUB-VIEW 1: DANH MỤC THEO DÕI HỒ SƠ (Chuẩn Biểu Mẫu Danh Sách Bảng) */}
          {storageViewSubMode === 'table' && (
            <div className="bg-white border-2 border-slate-300 rounded-2xl shadow-xs overflow-hidden">
              {/* Table Title Banner matching user image */}
              <div className="p-4 bg-slate-100/80 border-b-2 border-slate-300 text-center">
                <h2 className="text-sm sm:text-base font-black uppercase text-slate-900 tracking-wider">
                  DANH MỤC THEO DÕI HỒ SƠ
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-1 text-xs text-slate-600 font-semibold">
                  <span className="bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-md font-bold border border-amber-300">
                    {activeBinderTab === 'all' ? 'TẤT CẢ CÁC KẸP HỒ SƠ' : activeBinderTab.toUpperCase()}
                  </span>
                  <span>•</span>
                  <span>Tổng số: <b className="text-emerald-700 font-bold">{storageBinderDossiers.length}</b> hồ sơ</span>
                  {storageSlotSearch && (
                    <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300 font-bold">
                      Đang tìm: "{storageSlotSearch}"
                    </span>
                  )}
                </div>
              </div>

              {/* Official Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs table-auto">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-300 text-slate-900 font-bold uppercase text-[10px] text-center divide-x divide-gray-300">
                      <th className="py-2.5 px-2 w-8 bg-slate-100">TT</th>
                      <th className="py-2.5 px-2.5 whitespace-nowrap w-[110px]">Mã HS & STT</th>
                      <th className="py-2.5 px-2.5 text-left min-w-[130px] max-w-[200px]">Chủ hồ sơ / Vị trí</th>
                      <th className="py-2.5 px-2 whitespace-nowrap w-[75px]">Thửa / TBĐ</th>
                      <th className="py-2.5 px-2.5 text-left min-w-[130px] max-w-[210px]">Thủ tục hành chính</th>
                      <th className="py-2.5 px-2 whitespace-nowrap w-[105px]">Thời hạn</th>
                      <th className="py-2.5 px-2 whitespace-nowrap w-[110px]">Cán bộ / T.Thái</th>
                      <th className="py-2.5 px-2.5 text-right whitespace-nowrap bg-slate-100 w-[125px]">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {storageBinderDossiers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 text-xs sm:text-sm italic">
                          Không tìm thấy hồ sơ nào trong {activeBinderTab === 'all' ? 'các kẹp' : activeBinderTab}.
                        </td>
                      </tr>
                    ) : (
                      storageBinderDossiers.map((dos, idx) => {
                        const rem = getDaysRemaining(dos.dueDate);
                        return (
                          <tr
                            key={dos.id}
                            onClick={() => setSelectedDossierDetail(dos)}
                            className="hover:bg-amber-50/50 cursor-pointer transition-colors divide-x divide-gray-200 group"
                          >
                            {/* TT (Line Index) */}
                            <td className="py-2.5 px-2 text-center font-bold text-slate-700 bg-slate-50/50 text-xs align-middle">
                              {idx + 1}
                            </td>

                            {/* Mã hồ sơ & STT Kẹp */}
                            <td className="py-2.5 px-2.5 whitespace-nowrap text-center align-middle">
                              <p className="font-mono font-bold text-emerald-700 text-xs sm:text-sm">
                                {dos.code}
                              </p>
                              <div className="mt-0.5">
                                {dos.storageFolder ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[10px]">
                                    <Bookmark className="w-2.5 h-2.5 text-amber-700" />
                                    <span>{dos.storageFolder}</span>
                                    {dos.storageIndex && (
                                      <span className="px-1 bg-amber-600 text-white rounded text-[9px] font-mono">
                                        #{dos.storageIndex}
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-[10px]">Chưa kẹp</span>
                                )}
                              </div>
                            </td>

                            {/* Chủ hồ sơ / Vị trí */}
                            <td className="py-2.5 px-2.5 align-middle max-w-[200px]">
                              <div className="font-bold text-slate-900 group-hover:text-amber-800 transition-colors text-xs sm:text-sm truncate" title={dos.owner}>
                                {dos.owner}
                              </div>
                              {dos.address && (
                                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 truncate" title={dos.address}>
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{dos.address}</span>
                                </div>
                              )}
                            </td>

                            {/* Thửa / TBĐ */}
                            <td className="py-2.5 px-2 text-center font-semibold text-slate-800 whitespace-nowrap text-xs align-middle">
                              <div>Thửa <b>{dos.parcel}</b></div>
                              <div className="text-slate-500 text-[11px]">TBĐ <b>{dos.mapSheet}</b></div>
                            </td>

                            {/* Thủ tục hành chính */}
                            <td className="py-2.5 px-2.5 text-slate-700 font-medium text-xs align-middle max-w-[210px]">
                              <div className="line-clamp-2 leading-relaxed" title={dos.procedure}>
                                {dos.procedure}
                              </div>
                            </td>

                             {/* Thời hạn (Hạn trả + Nhận) */}
                            <td className="py-2.5 px-2 text-center whitespace-nowrap align-middle">
                              <div className="font-mono font-bold text-slate-900 text-xs">{formatDate(dos.dueDate)}</div>
                              {dos.status === 'supplement' ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <FileQuestion className="w-2.5 h-2.5 text-amber-700" />
                                  Yêu cầu BS
                                </span>
                              ) : dos.status === 'paused' ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                                  <PauseCircle className="w-2.5 h-2.5 text-purple-700" />
                                  Tạm dừng
                                </span>
                              ) : (
                                <div className={`text-[11px] font-semibold ${rem.statusClass}`}>{rem.label}</div>
                              )}
                              <div className="text-[10px] text-slate-400 font-mono">Nhận: {formatDate(dos.receivedDate)}</div>
                            </td>

                            {/* Cán bộ & Trạng thái */}
                            <td className="py-2.5 px-2 text-center whitespace-nowrap align-middle">
                              <p className="font-semibold text-slate-700 text-xs mb-1 truncate max-w-[110px]">{dos.handlerName || 'Chưa phân công'}</p>
                              {getStatusBadge(dos.status)}
                            </td>

                            {/* Thao tác (Gọn gàng: Xem, 8 bước quy trình, Sửa, In, menu thao tác khác) */}
                            <td
                              className="py-2.5 px-2.5 text-right whitespace-nowrap bg-slate-50/40 align-middle"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="inline-flex items-center justify-end gap-1 relative">
                                {/* Nút 8 bước quy trình */}
                                {(() => {
                                  const doneCount = (dos.workflowSteps || []).filter((s) => s.completed).length;
                                  return (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setWorkflowDossier(dos);
                                      }}
                                      className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer border ${
                                        doneCount > 0
                                          ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                                      }`}
                                      title="Theo dõi & cập nhật 8 bước quy trình giải quyết hồ sơ địa chính"
                                    >
                                      <ListChecks className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>{doneCount > 0 ? `${doneCount}/8` : '8 bước'}</span>
                                    </button>
                                  );
                                })()}

                                {/* Xem */}
                                <button
                                  type="button"
                                  onClick={() => setSelectedDossierDetail(dos)}
                                  className="p-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer"
                                  title="Xem chi tiết hồ sơ"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                {/* In */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPrintSlipType('receipt');
                                    setDossierToPrint(dos);
                                  }}
                                  className="p-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition cursor-pointer"
                                  title="In Giấy tiếp nhận / Hẹn trả kết quả"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>

                                {/* Sửa (chỉ hiện nếu có quyền) */}
                                {canEditDossier(dos) ? (
                                  <button
                                    type="button"
                                    onClick={() => onOpenEdit(dos)}
                                    className="p-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition cursor-pointer"
                                    title="Chỉnh sửa kẹp & thông tin / Chuyển Trả hồ sơ"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <span
                                    className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-semibold select-none"
                                    title="Hồ sơ của cán bộ khác (Chỉ xem)"
                                  >
                                    Chỉ xem
                                  </span>
                                )}

                                {/* Nút 3 chấm mở Dropdown menu thao tác khác */}
                                {(canEditDossier(dos) || canDeleteDossier(dos)) && (
                                  <div className="relative inline-block text-left">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveActionMenuId(activeActionMenuId === `action-storage-${dos.id}` ? null : `action-storage-${dos.id}`);
                                      }}
                                      className="p-1 rounded-md bg-slate-50 hover:bg-slate-200 text-slate-600 border border-slate-200 transition cursor-pointer"
                                      title="Thao tác khác"
                                    >
                                      <MoreVertical className="w-3.5 h-3.5" />
                                    </button>

                                    {activeActionMenuId === `action-storage-${dos.id}` && (
                                      <div
                                        className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-left animate-in fade-in-50 zoom-in-95"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {canEditDossier(dos) && dos.status === 'supplement' && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              setActiveActionMenuId(null);
                                              handleQuickReceiveSupplement(dos, e);
                                            }}
                                            className="w-full px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 font-semibold transition cursor-pointer"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Nhận đủ BS ➔ Tính lại hạn</span>
                                          </button>
                                        )}

                                        {canEditDossier(dos) && dos.status === 'paused' && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              setActiveActionMenuId(null);
                                              handleQuickResumePaused(dos, e);
                                            }}
                                            className="w-full px-3 py-1.5 text-xs text-purple-700 hover:bg-purple-50 flex items-center gap-2 font-semibold transition cursor-pointer"
                                          >
                                            <PlayCircle className="w-3.5 h-3.5 text-purple-600" />
                                            <span>Bỏ tạm dừng ➔ Chạy tiếp hạn</span>
                                          </button>
                                        )}

                                        {canEditDossier(dos) && dos.status !== 'resolved' && dos.status !== 'rejected' && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                setActiveActionMenuId(null);
                                                handleOpenSupplementModal(dos, e);
                                              }}
                                              className="w-full px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-50 flex items-center gap-2 font-semibold transition cursor-pointer"
                                            >
                                              <FileQuestion className="w-3.5 h-3.5 text-amber-600" />
                                              <span>Yêu cầu bổ sung (Mẫu 02)</span>
                                            </button>

                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                setActiveActionMenuId(null);
                                                handleOpenPauseModal(dos, e);
                                              }}
                                              className="w-full px-3 py-1.5 text-xs text-purple-800 hover:bg-purple-50 flex items-center gap-2 font-semibold transition cursor-pointer"
                                            >
                                              <PauseCircle className="w-3.5 h-3.5 text-purple-600" />
                                              <span>Tạm dừng giải quyết</span>
                                            </button>
                                          </>
                                        )}

                                        {onOpenCreateTaskFromDossier && canEditDossier(dos) && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveActionMenuId(null);
                                              onOpenCreateTaskFromDossier(dos);
                                            }}
                                            className="w-full px-3 py-1.5 text-xs text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 font-semibold transition cursor-pointer"
                                          >
                                            <Plus className="w-3.5 h-3.5 text-indigo-600" />
                                            <span>Tạo việc từ hồ sơ này</span>
                                          </button>
                                        )}

                                        {canDeleteDossier(dos) && (
                                          <>
                                            <div className="my-1 border-t border-slate-100" />
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveActionMenuId(null);
                                                onDeleteDossier(dos);
                                              }}
                                              className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold transition cursor-pointer"
                                            >
                                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                              <span>Xóa hồ sơ đất đai</span>
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="p-3 bg-slate-50 border-t-2 border-slate-300 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-2">
                <span className="font-medium">
                  Hiển thị: <b>{storageBinderDossiers.length}</b> hồ sơ | Kẹp đang chọn: <b>{activeBinderTab === 'all' ? 'Tất cả' : activeBinderTab}</b>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsBinderPrintOpen(true)}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Printer className="w-3 h-3" />
                    <span>In Danh Mục Bảng Này</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SUB-VIEW 2: Dạng thẻ kẹp vật lý */}
          {storageViewSubMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.entries(groupedByStorageFolder) as [string, Dossier[]][]).map(([folderName, folderDossiers]) => (
                <div
                  key={folderName}
                  className="bg-white rounded-2xl border-2 border-amber-200/80 hover:border-amber-400 shadow-xs overflow-hidden flex flex-col transition"
                >
                  <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50/50 border-b border-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderOpen className="w-4 h-4 text-amber-700 shrink-0" />
                      <span className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                        {folderName}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-xs font-bold shrink-0 shadow-2xs">
                      {folderDossiers.length} hồ sơ
                    </span>
                  </div>

                  <div className="p-3 space-y-2 flex-1 divide-y divide-gray-100 max-h-96 overflow-y-auto">
                    {folderDossiers.map((dos) => {
                      const rem = getDaysRemaining(dos.dueDate);
                      return (
                        <div
                          key={dos.id}
                          onClick={() => setSelectedDossierDetail(dos)}
                          className="pt-2 first:pt-0 pb-1 hover:bg-amber-50/50 rounded-xl px-2 transition cursor-pointer flex items-center justify-between gap-3 text-xs group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-mono font-extrabold flex items-center justify-center shrink-0 text-xs shadow-2xs group-hover:bg-amber-600 group-hover:text-white transition-colors">
                              {dos.storageIndex || '•'}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 group-hover:text-amber-800 transition-colors truncate">
                                  {dos.owner}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-emerald-700 font-bold">{dos.code}</span>
                                <span>• Thửa <b>{dos.parcel}</b>/TBĐ <b>{dos.mapSheet}</b></span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            {getStatusBadge(dos.status)}
                            <p className="text-xs font-mono text-slate-500 mt-1">Hạn: {formatDate(dos.dueDate)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-2.5 bg-slate-50 border-t border-gray-200 text-xs text-slate-500 flex items-center justify-between">
                    <span>Cán bộ thụ lý: <b>{folderDossiers[0]?.handlerName || 'Chung'}</b></span>
                    <button
                      onClick={() => {
                        setActiveBinderTab(folderName === '📁 Chưa phân kẹp lưu trữ' ? '__empty__' : folderName);
                        setStorageViewSubMode('table');
                      }}
                      className="text-amber-700 font-bold hover:underline"
                    >
                      Mở bảng chi tiết ➔
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 3: Field Inspection Planner by Village / Hamlet */}
      {viewMode === 'field_plan' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Compass className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-emerald-950">
                  Kế hoạch đi thẩm tra thực địa theo Thôn / Tuyến đường
                </h3>
                <p className="text-xs text-emerald-800">
                  Gom nhóm các hồ sơ cùng địa bàn để chuyên viên kết hợp đi kiểm tra hiện trạng 1 chuyến duy nhất, tiết kiệm thời gian xăng xe.
                </p>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In danh sách đi thực địa</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.entries(groupedByLocation) as [string, Dossier[]][]).map(([locName, locDossiers]) => (
              <div
                key={locName}
                className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col"
              >
                <div className="p-3.5 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900 text-xs sm:text-sm">{locName}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    {locDossiers.length} hồ sơ
                  </span>
                </div>

                <div className="p-3 space-y-2 flex-1">
                  {locDossiers.map((d) => {
                    const rem = getDaysRemaining(d.dueDate);
                    return (
                      <div
                        key={d.id}
                        onClick={() => setSelectedDossierDetail(d)}
                        className="p-2.5 rounded-xl border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/30 transition cursor-pointer flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-700 text-xs">{d.code}</span>
                            <span className="font-bold text-slate-900 truncate text-xs sm:text-sm">{d.owner}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Thửa <b className="text-slate-800">{d.parcel}</b>, TBĐ <b className="text-slate-800">{d.mapSheet}</b> • {d.procedure}
                          </div>
                          {d.storageFolder && (
                            <div className="text-xs text-amber-700 font-semibold mt-0.5 flex items-center gap-1">
                              <Archive className="w-3.5 h-3.5 text-amber-600" />
                              <span>Lưu tại: {d.storageFolder} (STT {d.storageIndex || '•'})</span>
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-slate-700">{formatDate(d.dueDate)}</div>
                          <div className={`text-xs font-semibold ${rem.statusClass}`}>{rem.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dossier Detail Modal */}
      {selectedDossierDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[92vh] text-xs sm:text-sm text-slate-800 overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-gray-200 flex items-center justify-between shrink-0">
              <div>
                <span className="font-mono text-xs font-bold text-emerald-700 uppercase">{selectedDossierDetail.code}</span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Chi tiết hồ sơ đất đai</h3>
              </div>
              <button
                onClick={() => setSelectedDossierDetail(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-gray-200 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-gray-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Chủ sở hữu / Người nộp:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedDossierDetail.owner}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vị trí thửa đất:</span>
                  <span className="font-bold text-emerald-700">
                    Thửa số {selectedDossierDetail.parcel}, Tờ bản đồ {selectedDossierDetail.mapSheet}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kẹp lưu trữ giấy:</span>
                  <span className="font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-md border border-amber-300">
                    📁 {selectedDossierDetail.storageFolder || 'Chưa lưu kẹp'}
                    {selectedDossierDetail.storageIndex ? ` (STT: #${selectedDossierDetail.storageIndex})` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Địa chỉ:</span>
                  <span className="text-slate-800 font-medium">{selectedDossierDetail.address || 'UBND xã Lãnh Ngọc'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Thủ tục:</span>
                  <span className="text-slate-800 font-semibold">{selectedDossierDetail.procedure}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ngày nhận / Hạn trả:</span>
                  <span className="text-slate-800 font-mono font-bold">
                    {formatDate(selectedDossierDetail.receivedDate)} ➔ {formatDate(selectedDossierDetail.dueDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Chuyên viên thụ lý:</span>
                  <span className="font-bold text-blue-700">{selectedDossierDetail.handlerName || 'Chưa giao'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Trạng thái:</span>
                  <span>{getStatusBadge(selectedDossierDetail.status)}</span>
                </div>
              </div>

              {/* Special Rejected Banner in Detail Modal (Trả hồ sơ) */}
              {selectedDossierDetail.status === 'rejected' && (
                <div className="p-3.5 rounded-xl bg-red-50 border-2 border-red-300 space-y-2">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-red-950 text-xs sm:text-sm flex items-center gap-2 flex-wrap">
                        <span>Hồ sơ đã trả lại / Không đủ điều kiện giải quyết</span>
                        {selectedDossierDetail.rejectionDate && (
                          <span className="text-[11px] font-normal text-red-800 bg-red-200/70 px-2 py-0.5 rounded-md">
                            Ngày trả: {formatDate(selectedDossierDetail.rejectionDate)}
                          </span>
                        )}
                      </h4>
                      {selectedDossierDetail.rejectionDocNumber && (
                        <p className="text-xs font-semibold text-red-900">
                          Văn bản / Thông báo số: <span className="underline font-bold">{selectedDossierDetail.rejectionDocNumber}</span>
                        </p>
                      )}
                      {selectedDossierDetail.rejectionReason && (
                        <div className="text-xs font-medium text-red-950 mt-1.5 bg-white/95 p-2.5 rounded-lg border border-red-200">
                          <span className="text-red-700 font-bold block mb-0.5">Lý do trả hồ sơ / Hướng dẫn công dân:</span>
                          <span className="whitespace-pre-line leading-relaxed">{selectedDossierDetail.rejectionReason}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Special Supplement Banner in Detail Modal (Bổ sung - Tính lại từ đầu) */}
              {selectedDossierDetail.status === 'supplement' && (
                <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-300 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <FileQuestion className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-amber-950 text-xs sm:text-sm flex items-center gap-2 flex-wrap">
                          <span>Yêu cầu bổ sung, hoàn thiện hồ sơ (Mẫu số 02)</span>
                          {selectedDossierDetail.supplementDate && (
                            <span className="text-[11px] font-normal text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-md">
                              Từ ngày {formatDate(selectedDossierDetail.supplementDate)}
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Hồ sơ không bị tính trôi ngày và không tính quá hạn. Khi công dân nộp đủ, thời hạn giải quyết sẽ được <strong>tính lại từ đầu</strong>.
                        </p>
                        {selectedDossierDetail.supplementNote && (
                          <div className="text-xs font-semibold text-amber-950 mt-1.5 bg-white/90 p-2 rounded-lg border border-amber-200">
                            <span className="text-amber-700 font-bold block mb-0.5">Nội dung giấy tờ yêu cầu bổ sung:</span>
                            <span>{selectedDossierDetail.supplementNote}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {canEditDossier(selectedDossierDetail) && (
                    <div className="pt-2 border-t border-amber-200 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenSupplementModal(selectedDossierDetail)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Sửa nội dung bổ sung</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickReceiveSupplement(selectedDossierDetail)}
                        disabled={activeQuickActionIds[`receive-${selectedDossierDetail.id}`]}
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                      >
                        {activeQuickActionIds[`receive-${selectedDossierDetail.id}`] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                        <span>Đã nhận đủ bổ sung ➔ Tính lại hạn từ đầu</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Special Paused Banner in Detail Modal (Tạm dừng - Chạy tiếp thời gian còn lại) */}
              {selectedDossierDetail.status === 'paused' && (
                <div className="p-3.5 rounded-xl bg-purple-50 border-2 border-purple-300 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <PauseCircle className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-purple-950 text-xs sm:text-sm flex items-center gap-2 flex-wrap">
                          <span>Đang tạm dừng giải quyết hồ sơ (Đóng băng thời hạn)</span>
                          {selectedDossierDetail.pauseDate && (
                            <span className="text-[11px] font-normal text-purple-800 bg-purple-200/70 px-2 py-0.5 rounded-md">
                              Từ ngày {formatDate(selectedDossierDetail.pauseDate)}
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-purple-800 mt-0.5">
                          Thời hạn xử lý được đóng băng nguyên vẹn. Khi bỏ tạm dừng, hệ thống sẽ <strong>chạy tiếp số ngày làm việc còn lại</strong> trước hạn.
                        </p>
                        {selectedDossierDetail.pauseReason && (
                          <div className="text-xs font-semibold text-purple-950 mt-1.5 bg-white/90 p-2 rounded-lg border border-purple-200">
                            <span className="text-purple-700 font-bold block mb-0.5">Lý do tạm dừng:</span>
                            <span>{selectedDossierDetail.pauseReason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {canEditDossier(selectedDossierDetail) && (
                    <div className="pt-2 border-t border-purple-200 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenPauseModal(selectedDossierDetail)}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Sửa lý do tạm dừng</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickResumePaused(selectedDossierDetail)}
                        disabled={activeQuickActionIds[`resume-${selectedDossierDetail.id}`]}
                        className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                      >
                        {activeQuickActionIds[`resume-${selectedDossierDetail.id}`] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <PlayCircle className="w-3.5 h-3.5" />
                        )}
                        <span>Bỏ tạm dừng ➔ Chạy tiếp thời gian còn lại</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Quick actions for in_progress / overdue dossiers in detail modal */}
              {canEditDossier(selectedDossierDetail) &&
                selectedDossierDetail.status !== 'resolved' &&
                selectedDossierDetail.status !== 'supplement' &&
                selectedDossierDetail.status !== 'paused' && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <div>
                      <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Xử lý tình huống phát sinh:</span>
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Tạm dừng hoặc Yêu cầu bổ sung hồ sơ để đóng băng thời hạn, tránh bị tính quá hạn.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenSupplementModal(selectedDossierDetail)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                      >
                        <FileQuestion className="w-3.5 h-3.5" />
                        <span>Yêu cầu bổ sung</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenPauseModal(selectedDossierDetail)}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                      >
                        <PauseCircle className="w-3.5 h-3.5" />
                        <span>Tạm dừng xử lý</span>
                      </button>
                    </div>
                  </div>
                )}

              {selectedDossierDetail.result && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <p className="font-bold text-emerald-800 mb-0.5">Kết quả giải quyết:</p>
                  <p className="text-slate-800">{selectedDossierDetail.result}</p>
                </div>
              )}

              {selectedDossierDetail.note && (
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-slate-500 font-semibold mb-0.5">Ghi chú:</p>
                  <p className="text-slate-700">{selectedDossierDetail.note}</p>
                </div>
              )}

              {/* Attachments */}
              {(() => {
                const combinedAttachments: Attachment[] = [...(selectedDossierDetail.attachments || [])];
                (selectedDossierDetail.workflowSteps || []).forEach((st) => {
                  (st.attachments || []).forEach((att) => {
                    if (!combinedAttachments.some((a) => a.id === att.id || a.url === att.url)) {
                      combinedAttachments.push({
                        ...att,
                        stepIndex: st.stepIndex,
                        stepTitle: `Bước ${st.stepIndex}`,
                      });
                    }
                  });
                });

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                        <Paperclip className="w-4 h-4 text-emerald-700" />
                        <span>Tệp scan & tài liệu đính kèm ({combinedAttachments.length})</span>
                      </p>
                      {combinedAttachments.length > 0 && (
                        <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-200">
                          Đã lưu trữ
                        </span>
                      )}
                    </div>
                    {combinedAttachments.length === 0 ? (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                        <p className="text-slate-400 italic text-xs">
                          Chưa có tệp scan nào được đính kèm. Mở <strong>8 bước quy trình</strong> để tải lên biên bản, thông báo hoặc ảnh GCN.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {combinedAttachments.map((att) => {
                          const ext = att.name.split('.').pop()?.toLowerCase() || '';
                          const isImg = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
                          const isPdf = ext === 'pdf';
                          return (
                            <div
                              key={att.id}
                              className="p-2.5 rounded-xl bg-white border border-gray-200 hover:border-emerald-400 shadow-2xs flex items-center justify-between gap-2.5 transition"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-700">
                                  {isImg && <FileText className="w-4 h-4 text-emerald-600" />}
                                  {isPdf && <FileText className="w-4 h-4 text-rose-600" />}
                                  {!isImg && !isPdf && <FileSpreadsheet className="w-4 h-4 text-blue-600" />}
                                </div>
                                <div className="min-w-0">
                                  <span className="block font-bold text-slate-900 text-xs truncate max-w-[220px]" title={att.name}>
                                    {att.name}
                                  </span>
                                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[10px]">
                                      {att.stepTitle || (att.stepIndex ? `Bước ${att.stepIndex}` : (att.isResult ? 'Kết quả GCN' : 'Hồ sơ Một Cửa'))}
                                    </span>
                                    {att.size ? <span>• {(att.size / 1024).toFixed(0)} KB</span> : null}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setPreviewAttachment(att)}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                                  title="Xem trực tiếp tệp này"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Xem</span>
                                </button>
                                <a
                                  href={att.url}
                                  download={att.name}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 rounded-lg bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-600 transition"
                                  title="Tải tệp về máy"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 sm:px-5 bg-slate-50 border-t border-gray-200 shrink-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setWorkflowDossier(selectedDossierDetail);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer text-xs"
                    title="Theo dõi 8 bước quy trình giải quyết hồ sơ địa chính"
                  >
                    <ListChecks className="w-3.5 h-3.5" />
                    <span>
                      8 bước quy trình (
                      {(selectedDossierDetail.workflowSteps || []).filter((s: any) => s.isCompleted || s.completed).length}/8)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const d = selectedDossierDetail;
                      setPrintSlipType('receipt');
                      setDossierToPrint(d);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1.5 border border-emerald-200 cursor-pointer text-xs"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Phiếu hẹn</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const d = selectedDossierDetail;
                      setPrintSlipType('handover_tracking');
                      setDossierToPrint(d);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 font-bold flex items-center gap-1.5 border border-violet-200 cursor-pointer text-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-violet-700" />
                    <span>Phiếu bàn giao hồ sơ</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const d = selectedDossierDetail;
                      setPrintSlipType('supplement');
                      setDossierToPrint(d);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold flex items-center gap-1.5 border border-amber-300 cursor-pointer text-xs"
                  >
                    <FileQuestion className="w-3.5 h-3.5 text-amber-700" />
                    <span>Phiếu yêu cầu bổ sung (Mẫu 02)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const d = selectedDossierDetail;
                      setPrintSlipType('public_list');
                      setDossierToPrint(d);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold flex items-center gap-1.5 border border-blue-200 cursor-pointer text-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Danh sách công khai (Mẫu 17)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const d = selectedDossierDetail;
                      setPrintSlipType('public_closing_minutes');
                      setDossierToPrint(d);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold flex items-center gap-1.5 border border-indigo-200 cursor-pointer text-xs"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Biên bản kết thúc niêm yết</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const d = selectedDossierDetail;
                      setPrintSlipType('return');
                      setDossierToPrint(d);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold flex items-center gap-1.5 border border-rose-200 cursor-pointer text-xs"
                  >
                    <FileX className="w-3.5 h-3.5" />
                    <span>Phiếu trả HS</span>
                  </button>

                  {canEditDossier(selectedDossierDetail) ? (
                    <button
                      type="button"
                      onClick={() => {
                        const dos = selectedDossierDetail;
                        setSelectedDossierDetail(null);
                        onOpenEdit(dos);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold flex items-center gap-1.5 border border-amber-200 cursor-pointer text-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Sửa</span>
                    </button>
                  ) : (
                    <span className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-500 font-semibold border border-slate-200 text-xs select-none">
                      Chỉ xem (Hồ sơ của cán bộ khác)
                    </span>
                  )}

                  {canDeleteDossier(selectedDossierDetail) && (
                    <button
                      type="button"
                      onClick={() => {
                        const dos = selectedDossierDetail;
                        setSelectedDossierDetail(null);
                        onDeleteDossier(dos);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold flex items-center gap-1.5 border border-rose-200 cursor-pointer text-xs"
                      title="Xóa hồ sơ đất đai"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa hồ sơ</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedDossierDetail(null)}
                    className="px-3.5 py-1.5 rounded-xl text-slate-600 hover:text-slate-800 bg-gray-100 font-semibold cursor-pointer text-xs"
                  >
                    Đóng
                  </button>
                  {onOpenCreateTaskFromDossier && (
                    <button
                      onClick={() => {
                        const dos = selectedDossierDetail;
                        setSelectedDossierDetail(null);
                        onOpenCreateTaskFromDossier(dos);
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-bold flex items-center gap-1.5 shadow-xs cursor-pointer text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tạo việc</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Printable Slip Modal */}
      <React.Suspense fallback={null}>
        {Boolean(dossierToPrint) && (
          <DossierPrintModal
            isOpen={Boolean(dossierToPrint)}
            onClose={() => setDossierToPrint(null)}
            dossier={dossierToPrint}
            initialSlipType={printSlipType}
          />
        )}

        {/* Storage Binder Printable Sheet Modal */}
        {isBinderPrintOpen && (
          <StorageBinderPrintModal
            isOpen={isBinderPrintOpen}
            onClose={() => setIsBinderPrintOpen(false)}
            dossiers={storageBinderDossiers}
            binderName={activeBinderTab === 'all' ? 'TẤT CẢ CÁC KẸP HỒ SƠ LƯU TRỮ' : activeBinderTab}
          />
        )}

        {/* Excel Batch Import Modal */}
        {isImportModalOpen && (
          <ExcelImportModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            defaultType="dossiers"
            onSuccess={() => {
              refreshData();
            }}
          />
        )}

        {/* Dedicated SUPPLEMENT Dossier Modal (Zero-lag typing, IME-friendly, Mẫu số 02) */}
        {Boolean(dossierToSupplement) && (
          <SupplementDossierModal
            isOpen={!!dossierToSupplement}
            onClose={() => setDossierToSupplement(null)}
            dossier={dossierToSupplement}
            onConfirm={handleConfirmSupplement}
            isSubmitting={isSupplementing}
          />
        )}

        {/* Cadastral 8-Step Workflow Tracking Modal */}
        {workflowDossier && (
          <DossierWorkflowModal
            isOpen={!!workflowDossier}
            onClose={() => setWorkflowDossier(null)}
            dossier={workflowDossier}
            onSave={handleSaveWorkflow}
            onDossierUpdated={(updated) => {
              if (selectedDossierDetail?.id === updated.id) {
                setSelectedDossierDetail(updated);
              }
              setWorkflowDossier(updated);
              refreshData();
            }}
            onOpenPrintSlip={(dossier, slipType) => {
              setPrintSlipType(slipType);
              setDossierToPrint(dossier);
            }}
          />
        )}
      </React.Suspense>

      {/* Dedicated PAUSE Dossier Modal (Tạm dừng - Đóng băng thời hạn) */}
      {dossierToPause && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-purple-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-gradient-to-r from-purple-700 to-purple-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <PauseCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Tạm dừng giải quyết hồ sơ</h3>
                  <p className="text-purple-100 text-xs">Mã HS: {dossierToPause.code} - {dossierToPause.owner}</p>
                </div>
              </div>
              <button
                onClick={() => setDossierToPause(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 space-y-1">
                <p className="font-bold flex items-center gap-1 text-purple-950">
                  <AlertCircle className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>Quy định tạm dừng:</span>
                </p>
                <p>
                  Khi chuyển sang trạng thái <b>Tạm dừng</b>, thời hạn giải quyết được <b>đóng băng nguyên vẹn</b>, không tính trôi ngày và <b>không bị tính quá hạn</b>.
                </p>
                <p className="text-purple-900 font-semibold">
                  Khi bỏ tạm dừng, hệ thống sẽ <b>chạy tiếp số ngày làm việc còn lại</b> trước hạn.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Thủ tục:</span>
                  <span className="font-semibold text-slate-800">{dossierToPause.procedure}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Thửa / Bản đồ:</span>
                  <span className="font-semibold text-slate-800">Thửa {dossierToPause.parcel}, TBĐ {dossierToPause.mapSheet}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Ngày tiếp nhận ban đầu:</span>
                  <span className="font-mono text-slate-800">{formatDate(dossierToPause.receivedDate)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Hạn trả hiện tại:</span>
                  <span className="font-mono font-bold text-slate-900">{formatDate(dossierToPause.dueDate)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngày bắt đầu tạm dừng <span className="text-rose-500">*</span>
                </label>
                <VietnameseDateInput
                  value={pauseDate}
                  onChange={(val) => setPauseDate(val)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lý do / Căn cứ tạm dừng giải quyết <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value)}
                  placeholder="Nhập lý do tạm dừng (Chờ xác minh thực địa, chờ thông báo thuế, chờ ý kiến cơ quan chuyên môn...)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />

                <div className="mt-2 space-y-1">
                  <span className="text-[11px] font-bold text-slate-500">Mẫu gợi ý nhanh:</span>
                  <div className="flex flex-wrap gap-1">
                    {[
                      'Chờ Chi cục Thuế ban hành thông báo nộp nghĩa vụ tài chính.',
                      'Chờ phối hợp xác minh nguồn gốc đất và kiểm tra thực địa với Chi nhánh VPĐK.',
                      'Tạm dừng theo đơn khiếu nại / tranh chấp ranh giới thửa đất đang xác minh.',
                      'Chờ ý kiến chỉ đạo xử lý vướng mắc của UBND thành phố / Sở Nông nghiệp và Môi trường.',
                    ].map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setPauseReason(tpl)}
                        className="px-2 py-0.5 rounded bg-slate-100 hover:bg-purple-100 hover:text-purple-900 text-[10px] text-slate-600 border border-slate-200 transition cursor-pointer text-left"
                      >
                        + {tpl.slice(0, 45)}...
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDossierToPause(null)}
                disabled={isPausing}
                className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-800 bg-white border border-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmPause}
                disabled={isPausing}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
              >
                <PauseCircle className="w-4 h-4" />
                <span>{isPausing ? 'Đang cập nhật...' : 'Xác nhận Tạm dừng hồ sơ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Preview Modal for Attached Files */}
      <React.Suspense fallback={null}>
        {Boolean(previewAttachment) && (
          <FilePreviewModal
            isOpen={Boolean(previewAttachment)}
            onClose={() => setPreviewAttachment(null)}
            file={previewAttachment}
          />
        )}
      </React.Suspense>
    </div>
  );
};

export default DossiersPage;

