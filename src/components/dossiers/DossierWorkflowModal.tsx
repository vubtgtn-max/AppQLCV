import React, { useState, useEffect, useRef } from 'react';
import { Dossier, DossierWorkflowStepItem, Attachment, DossierWorkflowData, LandCategoryDetail } from '../../types';
import { apiService } from '../../services/api';
import { localVault } from '../../services/localVault';
import { formatDate } from '../../utils/date';
import { useAuth } from '../../contexts/AuthContext';
import { DossierSlipType } from './DossierPrintModal';
import { FilePreviewModal } from '../common/FilePreviewModal';
import { VillageAddressInput } from '../common/VillageAddressInput';
import {
  X,
  CheckCircle2,
  Clock,
  Printer,
  Save,
  CheckSquare,
  AlertCircle,
  Calendar,
  FileText,
  Award,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Link as LinkIcon,
  Paperclip,
  Upload,
  Trash2,
  FileSpreadsheet,
  FileBadge,
  Eye,
  Download,
  Image as ImageIcon,
  MapPin,
  UserCheck,
  Plus,
  Edit3,
  User,
  Home,
  ShieldCheck,
  DollarSign,
  ArrowRight,
  Folder,
  Loader2,
} from 'lucide-react';

interface DossierWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  dossier: Dossier | null;
  onDossierUpdated?: (updated: Dossier) => void;
  onSave?: (steps: DossierWorkflowStepItem[]) => void;
  onOpenRegisterBookModal?: (initialData?: any) => void;
  onOpenPrintSlip?: (dossier: Dossier, slipType: DossierSlipType) => void;
}

export const DEFAULT_WORKFLOW_STEPS: {
  index: number;
  title: string;
  shortDesc: string;
  detailGuide: string;
}[] = [
  {
    index: 1,
    title: 'Bước 1: Kiểm tra hiện trạng thửa đất',
    shortDesc: 'Đã kiểm tra hiện trạng thửa đất chưa?',
    detailGuide: 'Thẩm tra thực địa, đo đạc xác định ranh giới, diện tích, kiểm tra tình trạng tranh chấp và tài sản gắn liền với đất.',
  },
  {
    index: 2,
    title: 'Bước 2: Niêm yết công khai (Mẫu 17)',
    shortDesc: 'Đã niêm yết công khai chưa?',
    detailGuide: 'Lập Danh sách công khai Mẫu 17 (13 cột chuẩn) và Thông báo niêm yết công khai tại Trụ sở UBND xã và Nhà văn hóa thôn (thời hạn 15 ngày).',
  },
  {
    index: 3,
    title: 'Bước 3: Kết thúc niêm yết công khai',
    shortDesc: 'Đã kết thúc niêm yết chưa?',
    detailGuide: 'Lập Biên bản kết thúc thời hạn 15 ngày niêm yết công khai và Thông báo kết thúc; xác nhận không có đơn thư khiếu nại, tranh chấp phát sinh.',
  },
  {
    index: 4,
    title: 'Bước 4: Hướng dẫn công dân kê khai nghĩa vụ tài chính',
    shortDesc: 'Đã kê khai nghĩa vụ tài chính chưa?',
    detailGuide: 'Hướng dẫn công dân kê khai thuế thu nhập cá nhân, lệ phí trước bạ, tiền sử dụng đất (nếu có) và nộp đủ các biểu mẫu kê khai.',
  },
  {
    index: 5,
    title: 'Bước 5: Lập phiếu chuyển thông tin nghĩa vụ tài chính',
    shortDesc: 'Đã lập phiếu chuyển thuế chưa?',
    detailGuide: 'Lập Phiếu chuyển thông tin địa chính sang Chi cục Thuế khu vực để tính thuế, xác định nghĩa vụ tài chính của người sử dụng đất.',
  },
  {
    index: 6,
    title: 'Bước 6: Viết Giấy chứng nhận (Soạn thảo GCN, Phiếu trình & Tờ trình)',
    shortDesc: 'Đã viết Giấy chứng nhận (GCN) chưa?',
    detailGuide: 'Cấp phát số phôi GCN, soạn thảo nội dung GCN, Phiếu trình và Tờ trình đề nghị cấp GCN lần đầu trình Lãnh đạo UBND ký duyệt.',
  },
  {
    index: 7,
    title: 'Bước 7: Cập nhật cơ sở dữ liệu địa chính (CSDLPL / VBDLIS)',
    shortDesc: 'Đã cập nhật CSDLPL chưa?',
    detailGuide: 'Cập nhật không gian thửa đất, số phát hành GCN, ngày ký GCN và thông tin chủ sử dụng vào Hệ thống cơ sở dữ liệu đất đai VBDLIS / CSDLPL sau khi GCN được ký duyệt.',
  },
  {
    index: 8,
    title: 'Bước 8: Trả kết quả cho công dân & Vào Sổ cấp giấy',
    shortDesc: 'Đã trả kết quả cho công dân chưa?',
    detailGuide: 'Kiểm tra biên lai hoàn thành nghĩa vụ tài chính, vào Sổ cấp GCN, đính kèm file scan/ảnh GCN đã ký và trao GCN cho người sử dụng đất.',
  },
];

const DEFAULT_LAND_TYPES: LandCategoryDetail[] = [
  { id: 'lt_ont', category: 'ONT - Đất ở tại nông thôn', area: '300,0', usageTime: 'Từ trước 15/10/1993', assetCreatedTime: 'Năm 1990' },
  { id: 'lt_cln', category: 'CLN - Đất trồng cây lâu năm', area: '249,5', usageTime: 'Từ trước 15/10/1993', assetCreatedTime: 'Năm 1990' },
  { id: 'lt_bhk', category: 'BHK - Đất trồng cây hàng năm khác', area: '0', usageTime: '', assetCreatedTime: '' },
];

export const DossierWorkflowModal: React.FC<DossierWorkflowModalProps> = ({
  isOpen,
  onClose,
  dossier,
  onDossierUpdated,
  onSave,
  onOpenRegisterBookModal,
  onOpenPrintSlip,
}) => {
  const { user } = useAuth();
  const [steps, setSteps] = useState<DossierWorkflowStepItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadingStepIndex, setUploadingStepIndex] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);

  // Wide dialog modals
  const [isOpenUnifiedModal, setIsOpenUnifiedModal] = useState<boolean>(false);
  const [activeStepModalIndex, setActiveStepModalIndex] = useState<number | null>(null);
  const [isOpenAttachmentVaultModal, setIsOpenAttachmentVaultModal] = useState<boolean>(false);

  // Unified workflow fields state linked across all 8 steps and templates
  const [workflowData, setWorkflowData] = useState<DossierWorkflowData>({});

  const prevWorkflowDossierIdRef = useRef<string | null>(null);
  const prevWorkflowIsOpenRef = useRef<boolean>(false);

  // Initialize steps & linked workflow data when dossier changes or opens
  useEffect(() => {
    if (!isOpen || !dossier) {
      prevWorkflowIsOpenRef.current = false;
      prevWorkflowDossierIdRef.current = null;
      return;
    }

    const isNewlyOpened = !prevWorkflowIsOpenRef.current && isOpen;
    const isTargetChanged = dossier.id !== prevWorkflowDossierIdRef.current;

    prevWorkflowIsOpenRef.current = true;
    prevWorkflowDossierIdRef.current = dossier.id;

    if (isNewlyOpened || isTargetChanged) {
      const existing = dossier.workflowSteps || [];
      const merged: DossierWorkflowStepItem[] = DEFAULT_WORKFLOW_STEPS.map((def) => {
        const found = existing.find((s) => s.stepIndex === def.index);
        return {
          stepIndex: def.index,
          title: def.title,
          isCompleted: found ? Boolean(found.isCompleted) : false,
          completedDate: found?.completedDate || '',
          completedBy: found?.completedBy || '',
          completedByName: found?.completedByName || '',
          note: found?.note || '',
          attachments: found?.attachments || [],
        };
      });
      setSteps(merged);
      setSaveSuccess(false);
      setIsOpenUnifiedModal(false);
      setActiveStepModalIndex(null);
      setIsOpenAttachmentVaultModal(false);

      // Initialize unified workflow data linking across all 8 steps and print forms
      const wf = dossier.workflowData || {};
      const today = new Date().toISOString().split('T')[0];
      const defStart = wf.publicStartDate || today;
      let defEnd = wf.publicEndDate || '';
      if (!defEnd) {
        try {
          const parts = defStart.split('-');
          if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            d.setDate(d.getDate() + 15);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            defEnd = `${yyyy}-${mm}-${dd}`;
          }
        } catch (_) {
          defEnd = today;
        }
      }

      let vName = wf.villageName || 'thôn Tiên Hiệp';
      if (!wf.villageName && dossier.address) {
        const match = dossier.address.match(/thôn\s+[^,]+/i);
        if (match) vName = match[0].trim();
      }

      // Initialize land categories
      let initialLandTypes: LandCategoryDetail[] = wf.landTypes || [];
      if (!initialLandTypes || initialLandTypes.length === 0) {
        initialLandTypes = [
          {
            id: 'lt_ont',
            category: 'ONT - Đất ở tại nông thôn',
            area: wf.residentialArea || '300,0',
            usageTime: wf.usageTime || 'Từ trước 15/10/1993',
            assetCreatedTime: wf.assetCreatedTime || 'Năm 1990',
          },
          {
            id: 'lt_cln',
            category: 'CLN - Đất trồng cây lâu năm',
            area: wf.agricultureArea || '249,5',
            usageTime: wf.usageTime || 'Từ trước 15/10/1993',
            assetCreatedTime: wf.assetCreatedTime || 'Năm 1990',
          },
          {
            id: 'lt_bhk',
            category: 'BHK - Đất trồng cây hàng năm khác',
            area: '0',
            usageTime: '',
            assetCreatedTime: '',
          },
        ];
      }

      setWorkflowData({
        owner: wf.owner || dossier.owner || '',
        birthYear1: wf.birthYear1 || '1975',
        citizenId1: wf.citizenId1 || '',
        permanentAddress1: wf.permanentAddress1 || dossier.address || `${vName}, xã Lãnh Ngọc, thành phố Đà Nẵng`,
        owner2: wf.owner2 || '',
        birthYear2: wf.birthYear2 || '1978',
        citizenId2: wf.citizenId2 || '',
        permanentAddress2: wf.permanentAddress2 || dossier.address || `${vName}, xã Lãnh Ngọc, thành phố Đà Nẵng`,
        parcel: wf.parcel || dossier.parcel || '',
        mapSheet: wf.mapSheet || dossier.mapSheet || '',
        landAddress: wf.landAddress || dossier.address || `${vName}, xã Lãnh Ngọc`,
        totalLandArea: wf.totalLandArea || '549,5',
        residentialArea: wf.residentialArea || '300,0',
        agricultureArea: wf.agricultureArea || '249,5',
        landTypes: initialLandTypes,
        landOrigin:
          wf.landOrigin ||
          `Thửa đất do hộ ông/bà ${dossier.owner} tự khai hoang canh tác, quản lý sử dụng ổn định từ năm 1990 đến nay không tranh chấp với các hộ liền kề. Năm 2024, đo đạc xác định diện tích thực tế là ${wf.totalLandArea || '549,5'} m² theo hiện trạng.`,
        currentStatus: wf.currentStatus || 'Đất ở và đất trồng cây lâu năm; có nhà ở và cây trồng gắn liền với đất',
        usageTime: wf.usageTime || '1990',
        assetCreatedTime: wf.assetCreatedTime || '1990',
        disputeStatus: wf.disputeStatus || 'Đất không tranh chấp',
        planningSuitability:
          wf.planningSuitability ||
          'Thửa đất phù hợp quy hoạch sử dụng đất theo quyết định phê duyệt điều chỉnh Quy hoạch sử dụng đất của cấp có thẩm quyền',
        adjacentNeighbors:
          wf.adjacentNeighbors ||
          'Hộ ông Nguyễn Văn A (phía Bắc), Hộ bà Trần Thị B (phía Nam), Đường giao thông nông thôn (phía Đông), Đất lâm nghiệp (phía Tây)',
        inspectionDate: wf.inspectionDate || dossier.receivedDate || today,
        inspectionTime: wf.inspectionTime || '08 giờ 30 phút',
        inspectionEndTime: wf.inspectionEndTime || '09 giờ 30 phút',
        inspectionLocation:
          wf.inspectionLocation ||
          `Thực địa Thửa đất số ${wf.parcel || dossier.parcel}, Tờ bản đồ số ${wf.mapSheet || dossier.mapSheet}, ${wf.landAddress || dossier.address || `${vName}, xã Lãnh Ngọc`}`,
        inspectionContent:
          wf.inspectionContent ||
          'Kiểm tra hiện trạng thực địa, xác định ranh giới, mốc giới, hiện trạng sử dụng đất và các công trình gắn liền với đất. Hiện trạng đất không có tranh chấp với các hộ giáp ranh, đủ điều kiện thực hiện các thủ tục đăng ký đất đai và cấp GCN.',
        officer1Name: wf.officer1Name || dossier.handlerName || 'Đoàn Văn Hoài Vũ',
        officer1Role: wf.officer1Role || 'Chuyên viên',
        officer1Org: wf.officer1Org || 'Phòng Kinh tế xã Lãnh Ngọc',
        officer2Name: wf.officer2Name || 'Võ Tấn Lạt',
        officer2Role: wf.officer2Role || 'Phó Trưởng phòng',
        officer2Org: wf.officer2Org || 'Phòng Kinh tế xã Lãnh Ngọc',
        communeLeaderName: wf.communeLeaderName || 'Thái Công Cần',
        communeLeaderRole: wf.communeLeaderRole || 'KT. CHỦ TỊCH\nPHÓ CHỦ TỊCH',
        villageName: vName,
        villageLeaderName: wf.villageLeaderName || 'Nguyễn Văn Chính',
        villageLeaderRole: wf.villageLeaderRole || `Trưởng ${vName}`,
        publicNoticeNumber: wf.publicNoticeNumber || '316/TB-UBND',
        publicListNumber: wf.publicListNumber || '28/CKHS-ĐKĐĐ',
        publicStartDate: defStart,
        publicEndDate: defEnd,
        publicLocationVillage: wf.publicLocationVillage || `Nhà văn hóa ${vName}`,
        closingTimeStr: wf.closingTimeStr || '08 giờ 30 phút',
        closingNoticeNumber: wf.closingNoticeNumber || '320/TB-UBND',
        taxTransferNumber: wf.taxTransferNumber || '142/PCTT-PKT',
        taxTransferDate: wf.taxTransferDate || '',
        taxNoticeTruocBaNumber: wf.taxNoticeTruocBaNumber || 'LTB2650321-TK0001799/TB-TCS10',
        taxNoticeTruocBaDate: wf.taxNoticeTruocBaDate || '2026-09-24',
        taxNoticeTienSDDNumber: wf.taxNoticeTienSDDNumber || 'LTB2650321-TK0001797/TB-TCS10',
        taxNoticeTienSDDDate: wf.taxNoticeTienSDDDate || '2026-09-24',
        taxNoticeHoanThanhNVTCNumber: wf.taxNoticeHoanThanhNVTCNumber || '3178/TB-TCS10',
        taxNoticeHoanThanhNVTCDate: wf.taxNoticeHoanThanhNVTCDate || '2026-09-30',
        phieutrinhNumber: wf.phieutrinhNumber || '08/PT-PKT',
        phieutrinhDate: wf.phieutrinhDate || '',
        totrinhNumber: wf.totrinhNumber || '15/TTr-PKT',
        totrinhDate: wf.totrinhDate || '',
        gcnDraftNumber: wf.gcnDraftNumber || 'DA 981240',
        gcnBookNumber: wf.gcnBookNumber || 'CS 01429',
        trichDoNumber: wf.trichDoNumber || '879-2025',
        trichDoDate: wf.trichDoDate || '11/11/2025',
        vbdlisSyncDate: wf.vbdlisSyncDate || '',
        gcnIssueDate: wf.gcnIssueDate || '',
        recipientName: wf.recipientName || dossier.owner || '',
        recipientIdCard: wf.recipientIdCard || '',
        landPriceLocationResidential: wf.landPriceLocationResidential || 'Vị trí 1 - Đường nhóm 2',
        landPriceLocationAgri: wf.landPriceLocationAgri || 'Vị trí 1 - Đồng bằng',
        landDepth: wf.landDepth || '25m',
        alleyWidth: wf.alleyWidth || 'Đường rộng trên 5m',
        taxObligationArea: wf.taxObligationArea || '549,5',
        residentialAreaInQuota: wf.residentialAreaInQuota || '300,0',
        residentialAreaOutOfQuota: wf.residentialAreaOutOfQuota || '0',
        agricultureTaxArea: wf.agricultureTaxArea || '249,5',
        taxExemptionDetails: wf.taxExemptionDetails || 'Không thuộc diện miễn, giảm tiền sử dụng đất',
        landLawViolation: wf.landLawViolation || 'Không có vi phạm pháp luật đất đai',
        inspectionFeedback: wf.inspectionFeedback || 'Thống nhất với ranh giới, mốc giới và hiện trạng sử dụng đất đo đạc trên thực địa.',
        witness1Name: wf.witness1Name || 'Nguyễn Văn Được',
        witness1Address: wf.witness1Address || `${vName}, xã Lãnh Ngọc`,
        witness2Name: wf.witness2Name || 'Lê Thị Thu',
        witness2Address: wf.witness2Address || `${vName}, xã Lãnh Ngọc`,
        witness3Name: wf.witness3Name || 'Trần Đình Cử',
        witness3Address: wf.witness3Address || `${vName}, xã Lãnh Ngọc`,
        handover1Date: wf.handover1Date || dossier.receivedDate || today,
        handover1Giver: wf.handover1Giver || 'Bộ phận Tiếp nhận và Trả kết quả (Một Cửa)',
        handover1Receiver: wf.handover1Receiver || dossier.handlerName || 'Đoàn Văn Hoài Vũ',
        handover1Note: wf.handover1Note || 'Nhận đủ 01 bộ hồ sơ gốc kèm trích đo địa chính',
        submissionSignDate: wf.submissionSignDate || '',
        leaderSignDate: wf.leaderSignDate || '',
        leaderSignerName: wf.leaderSignerName || 'Thái Công Cần',
        taxReturnDate: wf.taxReturnDate || '',
        finalHandoverDate: wf.finalHandoverDate || '',
        finalHandoverReceiver: wf.finalHandoverReceiver || dossier.owner || '',
        finalHandoverNote: wf.finalHandoverNote || 'Đã giao trả GCN và hồ sơ lưu cho công dân',
      });
    } else {
      // If modal already open for same dossier, merge incoming workflowData non-destructively
      if (dossier.workflowData) {
        setWorkflowData((prev) => ({
          ...prev,
          ...dossier.workflowData,
        }));
      }
      if (dossier.workflowSteps && dossier.workflowSteps.length > 0) {
        setSteps(dossier.workflowSteps);
      }
    }
  }, [dossier, isOpen]);

  if (!isOpen || !dossier) return null;

  const completedCount = steps.filter((s) => s.isCompleted).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  const handleToggleStep = (index: number) => {
    const today = new Date().toISOString().split('T')[0];
    setSteps((prev) =>
      prev.map((s) => {
        if (s.stepIndex === index) {
          const nextCompleted = !s.isCompleted;
          return {
            ...s,
            isCompleted: nextCompleted,
            completedDate: nextCompleted ? s.completedDate || today : s.completedDate,
            completedByName: nextCompleted ? s.completedByName || dossier.handlerName || 'Chuyên viên Phòng Kinh tế' : s.completedByName,
          };
        }
        return s;
      })
    );
  };

  const handleUpdateStepField = (
    index: number,
    field: keyof DossierWorkflowStepItem,
    val: any
  ) => {
    setSteps((prev) =>
      prev.map((s) => (s.stepIndex === index ? { ...s, [field]: val } : s))
    );
  };

  // Two-way synchronization across all 8 steps and document templates
  const handleUpdateWorkflowField = (field: keyof DossierWorkflowData, val: any) => {
    setWorkflowData((prev) => {
      const next = { ...prev, [field]: val };

      // Two-way sync: changing owner updates citizen1Name
      if (field === 'owner') {
        next.citizen1Name = val;
      }
      // Two-way sync: changing parcel, mapSheet, or landAddress automatically recalculates inspectionLocation
      if (field === 'parcel' || field === 'mapSheet' || field === 'landAddress') {
        const p = field === 'parcel' ? val : next.parcel || dossier.parcel;
        const m = field === 'mapSheet' ? val : next.mapSheet || dossier.mapSheet;
        const a = field === 'landAddress' ? val : next.landAddress || dossier.address;
        next.inspectionLocation = `Thực địa Thửa đất số ${p}, Tờ bản đồ số ${m}, ${a}`;
      }
      // Two-way sync: changing publicStartDate automatically calculates publicEndDate = publicStartDate + 15 days
      if (field === 'publicStartDate' && val) {
        try {
          const parts = String(val).split('-');
          if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            d.setDate(d.getDate() + 15);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            next.publicEndDate = `${yyyy}-${mm}-${dd}`;
          }
        } catch (_) {}
      }
      return next;
    });
  };

  // Handler for adding dynamic land category
  const handleAddLandType = () => {
    const newId = `lt_${Date.now()}`;
    const newItem: LandCategoryDetail = {
      id: newId,
      category: 'Đất nông nghiệp khác',
      area: '0',
      usageTime: 'Từ trước 15/10/1993',
      assetCreatedTime: 'Năm 1990',
    };
    const updated = [...(workflowData.landTypes || []), newItem];
    handleUpdateWorkflowField('landTypes', updated);
  };

  const handleUpdateLandTypeItem = (id: string, field: keyof LandCategoryDetail, value: string) => {
    const updated = (workflowData.landTypes || []).map((item) => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    handleUpdateWorkflowField('landTypes', updated);

    // Sync ONT area to residentialArea and CLN to agricultureArea
    const ont = updated.find((t) => t.category.toUpperCase().includes('ONT') || t.category.toLowerCase().includes('đất ở'));
    const cln = updated.find((t) => t.category.toUpperCase().includes('CLN') || t.category.toLowerCase().includes('lâu năm') || t.category.toUpperCase().includes('BHK'));
    if (ont) handleUpdateWorkflowField('residentialArea', ont.area);
    if (cln) handleUpdateWorkflowField('agricultureArea', cln.area);
  };

  const handleRemoveLandTypeItem = (id: string) => {
    const updated = (workflowData.landTypes || []).filter((item) => item.id !== id);
    handleUpdateWorkflowField('landTypes', updated);
  };

  // Data inconsistency check across 8 steps and shared dossier info
  const dataInconsistencies = React.useMemo(() => {
    if (!dossier) return [];
    const issues: { id: string; message: string }[] = [];

    // 1. Owner mismatch between dossier and workflowData
    if (workflowData.owner && dossier.owner && workflowData.owner.trim().toLowerCase() !== dossier.owner.trim().toLowerCase()) {
      issues.push({
        id: 'owner_mismatch',
        message: `Họ tên chủ sử dụng trong 8 bước ("${workflowData.owner}") khác với hồ sơ Một Cửa ("${dossier.owner}").`,
      });
    }

    // 2. Parcel or MapSheet mismatch
    if (workflowData.parcel && dossier.parcel && String(workflowData.parcel).trim() !== String(dossier.parcel).trim()) {
      issues.push({
        id: 'parcel_mismatch',
        message: `Số thửa đất trong 8 bước (Thửa ${workflowData.parcel}) khác với hồ sơ Một Cửa (Thửa ${dossier.parcel}).`,
      });
    }
    if (workflowData.mapSheet && dossier.mapSheet && String(workflowData.mapSheet).trim() !== String(dossier.mapSheet).trim()) {
      issues.push({
        id: 'mapsheet_mismatch',
        message: `Tờ bản đồ (TBĐ) trong 8 bước (TBĐ ${workflowData.mapSheet}) khác với hồ sơ Một Cửa (TBĐ ${dossier.mapSheet}).`,
      });
    }

    // 3. Area breakdown inconsistency
    const parseNum = (val: string | undefined): number => {
      if (!val) return 0;
      const clean = String(val).replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.]/g, '');
      const n = parseFloat(clean);
      return isNaN(n) ? 0 : n;
    };

    const totalAreaNum = parseNum(workflowData.totalLandArea);
    if (workflowData.landTypes && workflowData.landTypes.length > 0 && totalAreaNum > 0) {
      const sumTypes = workflowData.landTypes.reduce((acc, t) => acc + parseNum(t.area), 0);
      if (Math.abs(totalAreaNum - sumTypes) > 0.05 && sumTypes > 0) {
        issues.push({
          id: 'area_breakdown_mismatch',
          message: `Tổng diện tích đo đạc (${workflowData.totalLandArea} m²) chưa khớp với tổng diện tích các loại đất (${sumTypes.toFixed(1).replace('.', ',')} m²: ONT + CLN...).`,
        });
      }
    }

    // 4. Public duration check (must be at least 15 days)
    if (workflowData.publicStartDate && workflowData.publicEndDate) {
      const start = new Date(workflowData.publicStartDate).getTime();
      const end = new Date(workflowData.publicEndDate).getTime();
      if (!isNaN(start) && !isNaN(end)) {
        const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
        if (diffDays < 15) {
          issues.push({
            id: 'duration_under_15_days',
            message: `Thời hạn niêm yết công khai chỉ có ${diffDays} ngày (Quy định bắt buộc tối thiểu 15 ngày: từ ${formatDate(workflowData.publicStartDate)} đến ${formatDate(workflowData.publicEndDate)}).`,
          });
        }
      }
    }

    // 5. Sequence date logic check (e.g. Step 3 completedDate < Step 2 completedDate)
    const step2 = steps.find((s) => s.stepIndex === 2);
    const step3 = steps.find((s) => s.stepIndex === 3);
    if (step2?.completedDate && step3?.completedDate && step3.completedDate < step2.completedDate) {
      issues.push({
        id: 'step3_before_step2',
        message: `Ngày kết thúc niêm yết (Bước 3: ${formatDate(step3.completedDate)}) lại trước ngày bắt đầu niêm yết (Bước 2: ${formatDate(step2.completedDate)}).`,
      });
    }

    return issues;
  }, [workflowData, dossier, steps]);

  const handleAutoSyncUnifiedData = () => {
    if (!dossier) return;
    setWorkflowData((prev) => {
      const next = { ...prev };
      next.owner = dossier.owner;
      next.parcel = dossier.parcel;
      next.mapSheet = dossier.mapSheet;
      if (!next.landAddress) next.landAddress = dossier.address;

      // Ensure 15 days for publicEndDate
      if (next.publicStartDate) {
        try {
          const parts = String(next.publicStartDate).split('-');
          if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            d.setDate(d.getDate() + 15);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            next.publicEndDate = `${yyyy}-${mm}-${dd}`;
          }
        } catch (_) {}
      }

      // Reconcile total area if landTypes sum matches
      if (next.landTypes && next.landTypes.length > 0) {
        const sumTypes = next.landTypes.reduce((acc, t) => {
          const clean = String(t.area).replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.]/g, '');
          const n = parseFloat(clean);
          return acc + (isNaN(n) ? 0 : n);
        }, 0);
        if (sumTypes > 0) {
          next.totalLandArea = sumTypes.toFixed(1).replace('.', ',');
        }
      }

      return next;
    });
  };

  const handleOpenPrintDoc = (slipType: DossierSlipType) => {
    if (onOpenPrintSlip && dossier) {
      const mergedDossier: Dossier = {
        ...dossier,
        owner: workflowData.owner || dossier.owner,
        parcel: workflowData.parcel || dossier.parcel,
        mapSheet: workflowData.mapSheet || dossier.mapSheet,
        address: workflowData.landAddress || dossier.address,
        workflowSteps: steps,
        workflowData: workflowData,
      };

      // Save merged workflow data in background to prevent data loss
      apiService
        .updateDossier(dossier.id, {
          owner: mergedDossier.owner,
          parcel: mergedDossier.parcel,
          mapSheet: mergedDossier.mapSheet,
          address: mergedDossier.address,
          workflowSteps: steps,
          workflowData: workflowData,
          updatedBy: user?.id,
          updatedByName: user?.name,
        })
        .then((res) => {
          const finalRes = { ...res, workflowData: res.workflowData || workflowData };
          localVault.upsertLocalDossier(finalRes).catch(() => {});
          if (onDossierUpdated) onDossierUpdated(finalRes);
        })
        .catch((err) => console.warn('Auto-save before print warning:', err));

      onOpenPrintSlip(mergedDossier, slipType);
    }
  };

  const handleFileUpload = async (stepIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploadingStepIndex(stepIndex);
    try {
      const uploaded = await apiService.uploadFiles(
        fileList,
        user?.id || 'officer',
        user?.name || dossier.handlerName || 'Chuyên viên Phòng Kinh tế'
      );
      if (uploaded && uploaded.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const stepDef = DEFAULT_WORKFLOW_STEPS[stepIndex - 1];
        const uploadedWithStep: Attachment[] = uploaded.map((att) => ({
          ...att,
          stepIndex: stepIndex,
          stepTitle: stepDef ? stepDef.title : `Bước ${stepIndex}`,
          isResult: stepIndex === 8,
        }));

        const nextSteps = steps.map((s) => {
          if (s.stepIndex === stepIndex) {
            const existingAtts = s.attachments || [];
            return {
              ...s,
              attachments: [...existingAtts, ...uploadedWithStep],
              isCompleted: true,
              completedDate: s.completedDate || today,
              completedByName: s.completedByName || user?.name || dossier.handlerName || 'Chuyên viên Phòng Kinh tế',
            };
          }
          return s;
        });
        setSteps(nextSteps);

        let updatedAttachments = [...(dossier.attachments || [])];
        uploadedWithStep.forEach((att) => {
          if (!updatedAttachments.some((a) => a.id === att.id || a.url === att.url)) {
            updatedAttachments.push(att);
          }
        });

        try {
          const updatedDossier = await apiService.updateDossier(dossier.id, {
            workflowSteps: nextSteps,
            attachments: updatedAttachments,
            updatedBy: user?.id,
            updatedByName: user?.name,
          });
          await localVault.upsertLocalDossier(updatedDossier);
          if (onDossierUpdated) {
            onDossierUpdated(updatedDossier);
          }
        } catch (saveErr) {
          console.warn('Auto-save after upload warning:', saveErr);
        }
      }
    } catch (err: any) {
      alert('Lỗi tải tệp: ' + (err?.message || 'Không thể tải tệp lên máy chủ'));
    } finally {
      setUploadingStepIndex(null);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = async (stepIndex: number, attachmentId: string) => {
    const nextSteps = steps.map((s) => {
      if (s.stepIndex === stepIndex) {
        return {
          ...s,
          attachments: (s.attachments || []).filter((a) => a.id !== attachmentId),
        };
      }
      return s;
    });
    setSteps(nextSteps);

    const updatedAttachments = (dossier.attachments || []).filter((a) => a.id !== attachmentId);

    try {
      const updatedDossier = await apiService.updateDossier(dossier.id, {
        workflowSteps: nextSteps,
        attachments: updatedAttachments,
        updatedBy: user?.id,
        updatedByName: user?.name,
      });
      await localVault.upsertLocalDossier(updatedDossier);
      if (onDossierUpdated) {
        onDossierUpdated(updatedDossier);
      }
    } catch (saveErr) {
      console.warn('Auto-save after remove attachment warning:', saveErr);
    }
  };

  const handleSaveWorkflow = async () => {
    if (!dossier || isSaving) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      let updatedAttachments = [...(dossier.attachments || [])];
      steps.forEach((s) => {
        (s.attachments || []).forEach((att) => {
          if (!updatedAttachments.some((a) => a.id === att.id || a.url === att.url)) {
            updatedAttachments.push({
              ...att,
              stepIndex: s.stepIndex,
              stepTitle: DEFAULT_WORKFLOW_STEPS[s.stepIndex - 1]?.title,
              isResult: s.stepIndex === 8,
            });
          }
        });
      });

      const updatedDossier = await apiService.updateDossier(dossier.id, {
        owner: workflowData.owner || dossier.owner,
        parcel: workflowData.parcel || dossier.parcel,
        mapSheet: workflowData.mapSheet || dossier.mapSheet,
        address: workflowData.landAddress || dossier.address,
        workflowSteps: steps,
        workflowData: workflowData,
        attachments: updatedAttachments,
        status: steps[7]?.isCompleted && dossier.status === 'in_progress' ? 'resolved' : dossier.status,
        result: steps[7]?.isCompleted ? dossier.result || 'Đã cấp và trả Giấy chứng nhận cho người sử dụng đất.' : dossier.result,
        updatedBy: user?.id,
        updatedByName: user?.name,
      });

      const finalUpdatedDossier: Dossier = {
        ...updatedDossier,
        workflowData: updatedDossier.workflowData || workflowData,
        workflowSteps: updatedDossier.workflowSteps || steps,
      };

      try {
        await localVault.upsertLocalDossier(finalUpdatedDossier);
      } catch (_) {}

      setSaveSuccess(true);
      if (onDossierUpdated) {
        onDossierUpdated(finalUpdatedDossier);
      }
      if (onSave) {
        onSave(steps);
      }
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2500);
    } catch (err: any) {
      alert('Lỗi lưu tiến độ: ' + (err?.message || 'Không thể cập nhật hồ sơ'));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintSlip = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>BẢNG THEO DÕI QUY TRÌNH HỒ SƠ - ${dossier.code}</title>
        <style>
          * { box-sizing: border-box; font-family: 'Times New Roman', 'Tinos', Times, serif !important; }
          body { font-family: 'Times New Roman', 'Tinos', Times, serif !important; font-size: 13pt; line-height: 1.4; margin: 20mm 15mm; color: #000; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h3 { margin: 0; text-transform: uppercase; font-size: 13pt; font-weight: bold; }
          .header h2 { margin: 10px 0; text-transform: uppercase; font-size: 15pt; font-weight: bold; }
          .info-box { border: 1px solid #000; padding: 10px 15px; margin-bottom: 20px; border-radius: 4px; }
          .info-row { display: flex; margin-bottom: 6px; }
          .info-label { width: 190px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #000; padding: 6px 8px; font-size: 11pt; }
          th { background: #f5f5f5; font-weight: bold; text-align: center; }
          .text-center { text-align: center; }
          .status-done { font-weight: bold; }
          .status-wait { color: #555; }
          .signature { margin-top: 30px; display: flex; justify-content: space-between; text-align: center; }
          .sig-box { width: 45%; }
          @media print {
            body { margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h3>UBND XÃ LÃNH NGỌC</h3>
          <h3>PHÒNG KINH TẾ</h3>
          <hr style="width: 30%; margin: 8px auto; border-top: 1px solid #000;" />
          <h2>PHIẾU THEO DÕI TIẾN ĐỘ THỰC HIỆN HỒ SƠ ĐẤT ĐAI</h2>
          <div>(Kèm theo hồ sơ Một Cửa mã số: <b>${dossier.code}</b>)</div>
        </div>

        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Chủ sử dụng đất:</span>
            <span><b>${dossier.owner}</b></span>
          </div>
          <div class="info-row">
            <span class="info-label">Vị trí thửa đất:</span>
            <span>Thửa đất số <b>${dossier.parcel}</b>, Tờ bản đồ số <b>${dossier.mapSheet}</b> (${dossier.address || 'Xã Lãnh Ngọc'})</span>
          </div>
          <div class="info-row">
            <span class="info-label">Thủ tục hành chính:</span>
            <span>${dossier.procedure}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Kẹp hồ sơ lưu trữ:</span>
            <span><b>${dossier.storageFolder || 'Chưa kẹp'}</b> ${dossier.storageIndex ? `(Số thứ tự: #${dossier.storageIndex})` : ''}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Ngày nhận - Hạn trả:</span>
            <span>${formatDate(dossier.receivedDate)} ➔ ${formatDate(dossier.dueDate)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Cán bộ thụ lý chính:</span>
            <span><b>${dossier.handlerName || 'Đoàn Văn Hoài Vũ - Chuyên viên Phòng Kinh tế'}</b></span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">TT</th>
              <th style="width: 260px;">Nội dung bước nghiệp vụ</th>
              <th style="width: 110px;">Trạng thái</th>
              <th style="width: 110px;">Ngày hoàn thành</th>
              <th style="width: 130px;">Cán bộ thực hiện</th>
              <th>Ghi chú / Tệp đính kèm</th>
            </tr>
          </thead>
          <tbody>
            ${steps
              .map(
                (st, i) => `
              <tr>
                <td class="text-center">${i + 1}</td>
                <td><b>${DEFAULT_WORKFLOW_STEPS[i]?.shortDesc || st.title}</b><br/><small style="color: #444;">${DEFAULT_WORKFLOW_STEPS[i]?.detailGuide || ''}</small></td>
                <td class="text-center ${st.isCompleted ? 'status-done' : 'status-wait'}">
                  ${st.isCompleted ? '✔ ĐÃ XONG' : '○ CHƯA XONG'}
                </td>
                <td class="text-center">${st.completedDate ? formatDate(st.completedDate) : '—'}</td>
                <td class="text-center">${st.completedByName || '—'}</td>
                <td>${st.note || ''} ${st.attachments && st.attachments.length > 0 ? `(${st.attachments.length} tệp đính kèm)` : ''}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="signature">
          <div class="sig-box">
            <b>NGƯỜI NỘP HỒ SƠ</b><br/>
            <i>(Ký và ghi rõ họ tên)</i>
            <div style="height: 70px;"></div>
            <b>${dossier.owner}</b>
          </div>
          <div class="sig-box">
            <i>Lãnh Ngọc, ngày ..... tháng ..... năm 2026</i><br/>
            <b>CHUYÊN VIÊN PHÒNG KINH TẾ</b><br/>
            <i>(Ký, đóng dấu xác nhận)</i>
            <div style="height: 70px;"></div>
            <b>${dossier.handlerName || 'Đoàn Văn Hoài Vũ'}</b>
          </div>
        </div>
      </body>
      </html>
    `;

    // Hidden iframe printing to avoid popup blockers and dialog cuts
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.top = '-9999px';
    printFrame.style.left = '-9999px';
    printFrame.style.width = '0px';
    printFrame.style.height = '0px';
    printFrame.style.border = 'none';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (frameDoc && printFrame.contentWindow) {
      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();

      setTimeout(() => {
        try {
          printFrame.contentWindow?.focus();
          printFrame.contentWindow?.print();
        } catch (e) {
          console.error('Frame print failed, falling back to window.open', e);
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
          }
        } finally {
          setTimeout(() => {
            if (document.body.contains(printFrame)) {
              document.body.removeChild(printFrame);
            }
          }, 60000);
        }
      }, 350);
    } else {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }
    }
  };

  // Gather all attachments from all steps and from dossier
  const allStepAttachments: (Attachment & { stepIndex?: number; stepTitle?: string })[] = [];
  steps.forEach((s) => {
    (s.attachments || []).forEach((att) => {
      allStepAttachments.push({
        ...att,
        stepIndex: s.stepIndex,
        stepTitle: DEFAULT_WORKFLOW_STEPS[s.stepIndex - 1]?.title || `Bước ${s.stepIndex}`,
      });
    });
  });

  (dossier.attachments || []).forEach((att) => {
    if (!allStepAttachments.some((a) => a.id === att.id || a.url === att.url)) {
      allStepAttachments.push({
        ...att,
        stepIndex: att.stepIndex || 1,
        stepTitle: att.stepTitle || (att.isResult ? 'Bước 8: Kết quả cấp GCN' : 'Hồ sơ Một Cửa ban đầu'),
      });
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full my-auto shadow-2xl border border-emerald-200 overflow-hidden flex flex-col max-h-[96vh] animate-in fade-in duration-150">
        
        {/* 1. Header Tinh Gọn (Mã hồ sơ nhỏ gọn dành không gian cho các bước) */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shrink-0 border border-white/20">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Theo Dõi Tiến Độ 8 Bước Nghiệp Vụ Hồ Sơ Đất Đai
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-700/90 text-emerald-100 font-mono text-[11px] font-bold border border-emerald-500/50">
                {dossier.code}
              </span>
              <span className="text-[11px] text-emerald-200 font-medium">
                {dossier.storageFolder ? `📁 ${dossier.storageFolder}` : 'Chưa phân kẹp'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. DÒNG THÔNG TIN CHÍNH (ĐẶC BIỆT CHÚ Ý BỐ TRÍ DỄ THẤY, TO RÕ, NỔI BẬT THEO YÊU CẦU NGƯỜI DÙNG) */}
        <div className="px-4 py-3 bg-gradient-to-b from-slate-50 to-emerald-50/30 border-b border-emerald-100 shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Cột 1: Chủ hồ sơ */}
            <div className="p-2.5 rounded-xl bg-white border border-blue-200/90 shadow-2xs hover:border-blue-300 transition">
              <div className="flex items-center gap-1.5 text-blue-700 mb-1">
                <User className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Chủ hồ sơ</span>
              </div>
              <div className="text-sm sm:text-base font-black text-slate-900 truncate" title={dossier.owner}>
                {workflowData.owner || dossier.owner}
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5" title={workflowData.owner2 ? `Vợ/chồng: ${workflowData.owner2}` : (workflowData.permanentAddress1 || dossier.address)}>
                {workflowData.owner2 ? `👥 Vợ/chồng: ${workflowData.owner2}` : (workflowData.permanentAddress1 || dossier.address || 'Xã Lãnh Ngọc')}
              </div>
            </div>

            {/* Cột 2: Vị trí thửa đất */}
            <div className="p-2.5 rounded-xl bg-white border border-rose-200/90 shadow-2xs hover:border-rose-300 transition">
              <div className="flex items-center gap-1.5 text-rose-700 mb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Vị trí thửa đất</span>
              </div>
              <div className="text-sm sm:text-base font-black text-slate-900 truncate">
                Thửa {workflowData.parcel || dossier.parcel}, TBĐ {workflowData.mapSheet || dossier.mapSheet}
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                <span className="font-bold text-slate-700">{workflowData.totalLandArea || '549,5'} m²</span> • {workflowData.landAddress || dossier.address || 'Xã Lãnh Ngọc'}
              </div>
            </div>

            {/* Cột 3: Hạn giải quyết */}
            <div className="p-2.5 rounded-xl bg-white border border-amber-200/90 shadow-2xs hover:border-amber-300 transition">
              <div className="flex items-center gap-1.5 text-amber-800 mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Hạn giải quyết</span>
              </div>
              <div className="text-sm sm:text-base font-black text-amber-900 font-mono">
                {formatDate(dossier.dueDate)}
              </div>
              <div className="text-[11px] text-amber-700 mt-0.5 font-medium flex items-center gap-1">
                <span>Nhận: {formatDate(dossier.receivedDate)}</span>
              </div>
            </div>

            {/* Cột 4: Cán bộ thụ lý */}
            <div className="p-2.5 rounded-xl bg-white border border-emerald-200/90 shadow-2xs hover:border-emerald-300 transition">
              <div className="flex items-center gap-1.5 text-emerald-800 mb-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Cán bộ thụ lý</span>
              </div>
              <div className="text-sm sm:text-base font-black text-emerald-900 truncate" title={dossier.handlerName || 'Đoàn Văn Hoài Vũ'}>
                {dossier.handlerName || 'Đoàn Văn Hoài Vũ'}
              </div>
              <div className="text-[11px] text-emerald-700 truncate mt-0.5">
                Phòng Kinh tế xã Lãnh Ngọc
              </div>
            </div>
          </div>
        </div>

        {/* 3. Thanh Tiến Độ Một Cửa (Nhỏ gọn) & Thanh Kho Đính Kèm (Nhỏ gọn) */}
        <div className="px-4 py-2 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0 text-xs">
          {/* Tiến độ nhỏ gọn */}
          <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
            <span className="font-bold text-slate-700 text-xs flex items-center gap-1 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Tiến độ Một Cửa:</span>
            </span>
            <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden max-w-[180px]">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-bold text-emerald-800 font-mono text-xs shrink-0">
              {completedCount}/8 bước ({progressPercent}%)
            </span>
          </div>

          {/* Kho đính kèm nhỏ gọn & Các nút hành động chính */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Nút Kho Tệp Nhỏ Gọn */}
            <button
              type="button"
              onClick={() => setIsOpenAttachmentVaultModal(true)}
              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Mở kho quản lý tất cả tệp đính kèm của 8 bước"
            >
              <Paperclip className="w-3.5 h-3.5 text-blue-700" />
              <span>Kho tệp đính kèm</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-200 text-blue-900 text-[10px]">
                {allStepAttachments.length}
              </span>
            </button>

            {/* In Phiếu Theo Dõi Tiến Độ */}
            <button
              type="button"
              onClick={handlePrintSlip}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold text-xs flex items-center gap-1 transition cursor-pointer"
              title="In phiếu kiểm soát quá trình giải quyết hồ sơ"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In phiếu theo dõi</span>
            </button>

            {/* In Phiếu Theo Dõi Giao Nhận & Luân Chuyển Hồ Sơ */}
            {onOpenPrintSlip && (
              <button
                type="button"
                onClick={() => handleOpenPrintDoc('handover_tracking')}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                title="In Phiếu theo dõi giao nhận và luân chuyển hồ sơ (Một Cửa ➔ Chuyên viên ➔ Trình ký ➔ Trả kết quả)"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-700" />
                <span>Phiếu giao nhận hồ sơ</span>
              </button>
            )}

            {/* Lưu Tiến Độ */}
            <button
              type="button"
              onClick={handleSaveWorkflow}
              disabled={isSaving}
              className={`px-3 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Đang lưu...' : saveSuccess ? 'Đã lưu ✔' : 'Lưu tiến độ'}</span>
            </button>
          </div>
        </div>

        {/* 3.1 CẢNH BÁO NẾU DỮ LIỆU CÁC BƯỚC KHÔNG TRÙNG KHỚP */}
        {dataInconsistencies.length > 0 ? (
          <div className="mx-4 mt-2.5 p-3 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-950 shadow-sm animate-in fade-in duration-200 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-xs sm:text-sm text-amber-900 flex items-center gap-1.5">
                    <span>⚠️ Cảnh báo: Phát hiện {dataInconsistencies.length} điểm dữ liệu không trùng khớp giữa các bước / hồ sơ</span>
                  </h4>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                    {dataInconsistencies.map((issue) => (
                      <li key={issue.id}>{issue.message}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAutoSyncUnifiedData}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-xs transition cursor-pointer"
                title="Tự động đồng bộ các trường dữ liệu theo thông tin hồ sơ và quy định chuẩn 15 ngày"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Đồng bộ dữ liệu chung</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-4 mt-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-medium flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dữ liệu 8 bước đã được đồng bộ chuẩn hóa và liên kết nhất quán với hồ sơ gốc.</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-mono font-bold">Liên kết 2 chiều: Đạt chuẩn</span>
          </div>
        )}

        {/* 4. MỤC DỮ LIỆU THỐNG NHẤT 8 BƯỚC (THANH TỔNG QUAN + NÚT MỞ RỘNG BẢNG THÔNG TIN ĐẦY ĐỦ RỘNG RÃI) */}
        <div className="mx-4 mt-3 bg-gradient-to-r from-emerald-50/90 via-teal-50/80 to-emerald-50/90 border border-emerald-300 rounded-xl p-3 shadow-2xs shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-md bg-emerald-700 text-white">
                  <LinkIcon className="w-3.5 h-3.5" />
                </span>
                <h3 className="font-bold text-xs sm:text-sm text-emerald-950 flex items-center gap-2">
                  <span>Dữ Liệu Thống Nhất 8 Bước & Các Mẫu Văn Bản</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                    Đồng bộ 2 chiều
                  </span>
                </h3>
              </div>
              {/* Tóm tắt nhanh các trường chung */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-emerald-900">
                <span>👤 Chủ: <b>{workflowData.owner || dossier.owner}</b> {workflowData.owner2 ? `& ${workflowData.owner2}` : ''}</span>
                <span>• 📍 Thửa <b>{workflowData.parcel || dossier.parcel}</b>, TBĐ <b>{workflowData.mapSheet || dossier.mapSheet}</b></span>
                <span>• 📐 Tổng DT: <b>{workflowData.totalLandArea || '549,5'} m²</b></span>
                <span>• 📅 Niêm yết: <b>{formatDate(workflowData.publicStartDate)} ➔ {formatDate(workflowData.publicEndDate)}</b> (+15 ngày)</span>
                <span>• 📋 Trích đo: <b>{workflowData.trichDoNumber || '879-2025'}</b></span>
              </div>
            </div>

            {/* NÚT BẤM MỞ RỘNG BẢNG THÔNG TIN RỘNG RÃI, DỄ NHẬP DỄ THAO TÁC THEO YÊU CẦU */}
            <button
              type="button"
              onClick={() => setIsOpenUnifiedModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer shrink-0"
              title="Mở bảng thông tin rộng rãi để điền tất cả các trường chung, các loại đất (+), thời điểm, nguồn gốc, quy hoạch, hồ sơ thuế..."
            >
              <Edit3 className="w-4 h-4 text-emerald-200" />
              <span>Mở Bảng Dữ Liệu Thống Nhất (Đầy Đủ & Rộng Rãi)</span>
            </button>
          </div>
        </div>

        {/* 5. DANH SÁCH 8 BƯỚC NGHIỆP VỤ (GIAO DIỆN TINH GỌN, THOÁNG ĐÃNG, RÕ RÀNG) */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {steps.map((st, i) => {
            const def = DEFAULT_WORKFLOW_STEPS[i];
            const attachments = st.attachments || [];

            return (
              <div
                key={st.stepIndex}
                className={`rounded-xl border transition-all ${
                  st.isCompleted
                    ? 'bg-emerald-50/40 border-emerald-300 shadow-2xs'
                    : 'bg-white border-gray-200 hover:border-emerald-200'
                }`}
              >
                {/* Dòng chính của bước */}
                <div className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Cột trái: Checkbox + Tiêu đề + Hướng dẫn */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => handleToggleStep(st.stepIndex)}
                      className="mt-0.5 shrink-0 cursor-pointer focus:outline-none"
                      title={st.isCompleted ? 'Đánh dấu chưa xong' : 'Đánh dấu đã hoàn thành bước này'}
                    >
                      {st.isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-emerald-500" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-bold text-xs sm:text-sm ${
                            st.isCompleted ? 'text-emerald-950' : 'text-slate-900'
                          }`}
                        >
                          {def.title}
                        </span>
                        {st.isCompleted && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                            Đã xong ({formatDate(st.completedDate)})
                          </span>
                        )}
                        {attachments.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center gap-1 border border-blue-200">
                            <Paperclip className="w-3 h-3 text-blue-600" />
                            <span>{attachments.length} tệp</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {def.detailGuide}
                      </p>
                    </div>
                  </div>

                  {/* Cột phải: Các nút In văn bản nhanh + Nút mở Bảng thông tin chi tiết bước rộng rãi */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-start md:self-center">
                    {/* BƯỚC 1: In BB Kiểm Tra Thực Địa & In BB Xác Minh Nguồn Gốc (3 Hộ) */}
                    {st.stepIndex === 1 && onOpenPrintSlip && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenPrintDoc('site_inspection')}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                          title="In Biên bản kiểm tra thực địa theo NĐ 151/2025 & QĐ 2267/QĐ-UBND"
                        >
                          <Printer className="w-3.5 h-3.5 text-teal-700" />
                          <span>In BB Thực Địa</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenPrintDoc('origin_verification')}
                          className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                          title="In Biên bản xác minh nguồn gốc đất (lấy ý kiến 3 hộ dân làm chứng)"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-700" />
                          <span>In BB Xác Minh Nguồn Gốc</span>
                        </button>
                      </>
                    )}

                    {/* BƯỚC 2: In Mẫu 17 + In Thông Báo Niêm Yết */}
                    {st.stepIndex === 2 && onOpenPrintSlip && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenPrintDoc('public_list')}
                          className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                          title="In Mẫu 17: Danh sách công khai kết quả kiểm tra hồ sơ (13 cột)"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-700" />
                          <span>In Mẫu 17</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenPrintDoc('public_notice')}
                          className="px-2 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                          title="In Thông báo niêm yết công khai (15 ngày)"
                        >
                          <Printer className="w-3.5 h-3.5 text-cyan-700" />
                          <span>In TB Niêm Yết</span>
                        </button>
                      </>
                    )}

                    {/* BƯỚC 3: In BB Kết Thúc + In TB Kết Thúc */}
                    {st.stepIndex === 3 && onOpenPrintSlip && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenPrintDoc('public_closing_minutes')}
                          className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                          title="In Biên bản kết thúc thời hạn niêm yết công khai"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-700" />
                          <span>In BB Kết Thúc</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenPrintDoc('public_closing_notice')}
                          className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                          title="In Thông báo kết thúc niêm yết công khai"
                        >
                          <FileText className="w-3.5 h-3.5 text-purple-700" />
                          <span>In TB Kết Thúc</span>
                        </button>
                      </>
                    )}

                    {/* BƯỚC 6: In Phiếu Trình & In Tờ Trình Cấp GCN */}
                    {st.stepIndex === 6 && onOpenPrintSlip && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenPrintDoc('submission_phieutrinh')}
                          className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                          title="In Phiếu trình đề nghị cấp GCN lần đầu"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-700" />
                          <span>In Phiếu Trình</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenPrintDoc('submission_totrinh')}
                          className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                          title="In Tờ trình đề nghị cấp GCN trình Lãnh đạo UBND xã"
                        >
                          <FileBadge className="w-3.5 h-3.5 text-rose-700" />
                          <span>In Tờ Trình</span>
                        </button>
                      </>
                    )}

                    {/* BƯỚC 8: In Phiếu Giao Nhận & Luân Chuyển Hồ Sơ */}
                    {st.stepIndex === 8 && onOpenPrintSlip && (
                      <button
                        type="button"
                        onClick={() => handleOpenPrintDoc('handover_tracking')}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition"
                        title="In Phiếu theo dõi giao nhận và luân chuyển hồ sơ (Một Cửa ➔ Chuyên viên ➔ Trình ký ➔ Trả kết quả)"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-700" />
                        <span>In Phiếu Giao Nhận</span>
                      </button>
                    )}

                    {/* NÚT ĐÍNH KÈM TỆP NHANH */}
                    <label
                      className={`px-2 py-1 rounded-lg border font-bold text-[11px] flex items-center gap-1 cursor-pointer transition ${
                        uploadingStepIndex === st.stepIndex
                          ? 'bg-slate-100 text-slate-400 border-slate-300'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                      title="Tải lên tệp đính kèm cho bước này"
                    >
                      <Upload className="w-3 h-3 text-slate-600" />
                      <span>{uploadingStepIndex === st.stepIndex ? 'Đang tải...' : 'Tệp'}</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        disabled={uploadingStepIndex === st.stepIndex}
                        onChange={(e) => handleFileUpload(st.stepIndex, e)}
                      />
                    </label>

                    {/* NÚT MỞ BẢNG CHI TIẾT BƯỚC RỘNG RÃI (THEO YÊU CẦU NGƯỜI DÙNG: BẤM VÀO CHI TIẾT SẼ XUẤT HIỆN BẢNG THÔNG TIN ĐỂ ĐIỀN RỘNG RÃI, KHI LƯU TỰ ĐÓNG VÀ HIỂN THỊ LẠI BẢNG 8 BƯỚC) */}
                    <button
                      type="button"
                      onClick={() => setActiveStepModalIndex(st.stepIndex)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-2xs"
                      title="Mở bảng thông tin chi tiết bước này để điền các trường rộng rãi, dễ thao tác"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Chi tiết / Nhập dữ liệu</span>
                    </button>
                  </div>
                </div>

                {/* Dòng tóm tắt ghi chú & ngày hoàn thành nhỏ gọn */}
                <div className="px-3 py-1.5 bg-slate-50/70 border-t border-gray-100 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Ngày xong:</span>
                      <input
                        type="date"
                        value={st.completedDate || ''}
                        onChange={(e) => handleUpdateStepField(st.stepIndex, 'completedDate', e.target.value)}
                        className="bg-white border border-gray-300 rounded px-1.5 py-0.2 text-[11px] text-slate-800 outline-none"
                      />
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="truncate max-w-[250px]" title={st.note || 'Chưa có ghi chú'}>
                      Ghi chú: {st.note || <i className="text-slate-400">Chưa nhập</i>}
                    </span>
                  </div>

                  {attachments.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {attachments.slice(0, 3).map((att) => (
                        <button
                          key={att.id}
                          type="button"
                          onClick={() => setPreviewFile(att)}
                          className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 hover:bg-blue-100 font-medium text-[10px] flex items-center gap-1 truncate max-w-[130px]"
                          title={`Xem tệp: ${att.name}`}
                        >
                          <Eye className="w-2.5 h-2.5" />
                          <span className="truncate">{att.name}</span>
                        </button>
                      ))}
                      {attachments.length > 3 && (
                        <span className="text-[10px] text-slate-500 font-bold">
                          +{attachments.length - 3} tệp khác
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 6. MODAL BẢNG DỮ LIỆU THỐNG NHẤT 8 BƯỚC (RỘNG RÃI, ĐẦY ĐỦ CÁC TRƯỜNG CHUNG THEO YÊU CẦU: CHỦ SỬ DỤNG VỢ/CHỒNG, ĐỊA CHỈ THƯỜNG TRÚ, ĐỊA CHỈ THỬA ĐẤT, TBĐ SỐ THỬA, DIỆN TÍCH ONT/CLN/BHK CÓ NÚT +, THỜI ĐIỂM SỬ DỤNG, TẠO LẬP TÀI SẢN, NGUỒN GỐC, HIỆN TRẠNG, TRANH CHẤP, QUY HOẠCH, NIÊM YẾT TỪ NGÀY ĐẾN NGÀY, TRÍCH ĐO SỐ, CÁC THÔNG BÁO THUẾ TRƯỚC BẠ/TIỀN SDĐ/HOÀN THÀNH NVTC) */}
        {isOpenUnifiedModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-5xl w-full my-auto shadow-2xl border border-emerald-300 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0 border border-white/20">
                    <LinkIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                      Bảng Dữ Liệu Thống Nhất 8 Bước & Các Mẫu Văn Bản
                    </h2>
                    <p className="text-[11px] text-emerald-200">
                      Tất cả các trường dưới đây được liên kết tự động đến 8 bước và các mẫu in (Biên bản kiểm tra thực địa, Mẫu 17, TB niêm yết, Phiếu trình, Tờ trình)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpenUnifiedModal(false)}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer"
                  title="Đóng bảng"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body: Spacious Form Sections */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
                
                {/* PHẦN 1: THÔNG TIN CHỦ SỬ DỤNG & ĐỊA CHỈ THƯỜNG TRÚ */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">
                    <User className="w-4 h-4 text-emerald-700" />
                    <span>1. Thông tin Chủ sử dụng (Vợ / Chồng) & Địa chỉ thường trú</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Người đại diện 1 */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <span className="font-bold text-emerald-800 block text-xs">
                        👤 Chủ sử dụng đất / Người đứng tên hồ sơ (Đại diện 1):
                      </span>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Họ và tên:</label>
                        <input
                          type="text"
                          value={workflowData.owner || ''}
                          onChange={(e) => handleUpdateWorkflowField('owner', e.target.value)}
                          placeholder="Họ và tên chủ hồ sơ..."
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-slate-600 block mb-0.5">Năm sinh:</label>
                          <input
                            type="text"
                            value={workflowData.birthYear1 || ''}
                            onChange={(e) => handleUpdateWorkflowField('birthYear1', e.target.value)}
                            placeholder="1975"
                            className="w-full bg-slate-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-600 block mb-0.5">Số CCCD / Định danh:</label>
                          <input
                            type="text"
                            value={workflowData.citizenId1 || ''}
                            onChange={(e) => handleUpdateWorkflowField('citizenId1', e.target.value)}
                            placeholder="0480..."
                            className="w-full bg-slate-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Vợ / Chồng / Người đại diện 2 */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <span className="font-bold text-teal-800 block text-xs">
                        👥 Vợ / Chồng hoặc Người đồng sở hữu (Đại diện 2):
                      </span>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Họ và tên vợ/chồng:</label>
                        <input
                          type="text"
                          value={workflowData.owner2 || ''}
                          onChange={(e) => handleUpdateWorkflowField('owner2', e.target.value)}
                          placeholder="Họ và tên vợ/chồng..."
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-slate-600 block mb-0.5">Năm sinh:</label>
                          <input
                            type="text"
                            value={workflowData.birthYear2 || ''}
                            onChange={(e) => handleUpdateWorkflowField('birthYear2', e.target.value)}
                            placeholder="1978"
                            className="w-full bg-slate-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-600 block mb-0.5">Số CCCD / Định danh:</label>
                          <input
                            type="text"
                            value={workflowData.citizenId2 || ''}
                            onChange={(e) => handleUpdateWorkflowField('citizenId2', e.target.value)}
                            placeholder="0480..."
                            className="w-full bg-slate-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Địa chỉ thường trú */}
                    <div className="md:col-span-2">
                      <VillageAddressInput
                        label="🏡 Địa chỉ thường trú của người sử dụng đất"
                        mode="address"
                        placeholder="Thôn Tiên Hiệp, xã Lãnh Ngọc, thành phố Đà Nẵng"
                        value={workflowData.permanentAddress1 || ''}
                        onChange={(val) => handleUpdateWorkflowField('permanentAddress1', val)}
                      />
                    </div>

                  </div>
                </div>

                {/* PHẦN 2: THỬA ĐẤT & TRÍCH ĐO SỐ */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">
                    <MapPin className="w-4 h-4 text-rose-700" />
                    <span>2. Thông tin Thửa đất, Địa chỉ thửa đất & Trích đo</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Thửa đất số:
                      </label>
                      <input
                        type="text"
                        value={workflowData.parcel || ''}
                        onChange={(e) => handleUpdateWorkflowField('parcel', e.target.value)}
                        placeholder="304"
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Tờ bản đồ (TBĐ) số:
                      </label>
                      <input
                        type="text"
                        value={workflowData.mapSheet || ''}
                        onChange={(e) => handleUpdateWorkflowField('mapSheet', e.target.value)}
                        placeholder="19"
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Trích đo thửa đất số:
                      </label>
                      <input
                        type="text"
                        value={workflowData.trichDoNumber || ''}
                        onChange={(e) => handleUpdateWorkflowField('trichDoNumber', e.target.value)}
                        placeholder="879-2025"
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Ngày duyệt trích đo:
                      </label>
                      <input
                        type="text"
                        value={workflowData.trichDoDate || ''}
                        onChange={(e) => handleUpdateWorkflowField('trichDoDate', e.target.value)}
                        placeholder="11/11/2025"
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-4">
                      <VillageAddressInput
                        label="Địa chỉ thửa đất"
                        mode="address"
                        placeholder="Thôn Tiên Hiệp, xã Lãnh Ngọc, thành phố Đà Nẵng"
                        value={workflowData.landAddress || ''}
                        onChange={(val) => handleUpdateWorkflowField('landAddress', val)}
                      />
                    </div>

                  </div>
                </div>

                {/* PHẦN 3: CƠ CẤU DIỆN TÍCH (ONT, CLN, BHK...) CÓ NÚT DẤU + THÊM LOẠI ĐẤT, THỜI ĐIỂM SỬ DỤNG & THỜI ĐIỂM TẠO LẬP TÀI SẢN */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                      <Award className="w-4 h-4 text-blue-700" />
                      <span>3. Cơ cấu Diện tích, Thời điểm sử dụng & Tạo lập tài sản (Có nút + thêm loại đất)</span>
                    </div>

                    {/* NÚT THÊM LOẠI ĐẤT (+) THEO YÊU CẦU NGƯỜI DÙNG */}
                    <button
                      type="button"
                      onClick={handleAddLandType}
                      className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition shadow-2xs"
                      title="Bấm để thêm loại đất mới (HNK, LUC, TSC...)"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm loại đất (+)</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Tổng diện tích thửa đất đo đạc (m²):
                      </label>
                      <input
                        type="text"
                        value={workflowData.totalLandArea || ''}
                        onChange={(e) => handleUpdateWorkflowField('totalLandArea', e.target.value)}
                        placeholder="549,5"
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500 outline-none text-right"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Tứ cận giáp ranh thửa đất (Đông, Tây, Nam, Bắc):
                      </label>
                      <input
                        type="text"
                        value={workflowData.adjacentNeighbors || ''}
                        onChange={(e) => handleUpdateWorkflowField('adjacentNeighbors', e.target.value)}
                        placeholder="Đông giáp đường; Tây giáp đất ông A; Nam giáp bà B; Bắc giáp suối"
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* BẢNG DANH MỤC CÁC LOẠI ĐẤT */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                          <th className="py-2 px-3">Mục / Loại đất (ONT, CLN, BHK...)</th>
                          <th className="py-2 px-3 w-28 text-right">Diện tích (m²)</th>
                          <th className="py-2 px-3 w-48">Thời điểm bắt đầu sử dụng</th>
                          <th className="py-2 px-3 w-48">Thời điểm tạo lập tài sản</th>
                          <th className="py-2 px-2 w-12 text-center">Xóa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(workflowData.landTypes || DEFAULT_LAND_TYPES).map((lt) => (
                          <tr key={lt.id} className="hover:bg-slate-50 transition">
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={lt.category}
                                onChange={(e) => handleUpdateLandTypeItem(lt.id, 'category', e.target.value)}
                                placeholder="Tên / Mã loại đất..."
                                className="w-full bg-transparent border-0 font-bold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-0.5 outline-none"
                              />
                            </td>
                            <td className="py-2 px-3 text-right">
                              <input
                                type="text"
                                value={lt.area}
                                onChange={(e) => handleUpdateLandTypeItem(lt.id, 'area', e.target.value)}
                                placeholder="0,0"
                                className="w-full bg-transparent border-0 font-bold text-emerald-900 text-xs focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-0.5 outline-none text-right"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={lt.usageTime || ''}
                                onChange={(e) => handleUpdateLandTypeItem(lt.id, 'usageTime', e.target.value)}
                                placeholder="Từ trước 15/10/1993 / Năm 1990..."
                                className="w-full bg-transparent border-0 text-slate-700 text-xs focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-0.5 outline-none"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={lt.assetCreatedTime || ''}
                                onChange={(e) => handleUpdateLandTypeItem(lt.id, 'assetCreatedTime', e.target.value)}
                                placeholder="Năm 1990..."
                                className="w-full bg-transparent border-0 text-slate-700 text-xs focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-0.5 outline-none"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveLandTypeItem(lt.id)}
                                className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Xóa loại đất này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PHẦN 4: NGUỒN GỐC, HIỆN TRẠNG, TRANH CHẤP, QUY HOẠCH */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">
                    <ShieldCheck className="w-4 h-4 text-teal-700" />
                    <span>4. Nguồn gốc, Hiện trạng, Tình trạng tranh chấp & Phù hợp quy hoạch</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Nguồn gốc sử dụng đất:
                      </label>
                      <textarea
                        rows={3}
                        value={workflowData.landOrigin || ''}
                        onChange={(e) => handleUpdateWorkflowField('landOrigin', e.target.value)}
                        placeholder="Thửa đất do hộ ông/bà tự khai hoang canh tác, quản lý sử dụng ổn định từ năm 1990..."
                        className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Hiện trạng sử dụng đất & Tài sản gắn liền:
                      </label>
                      <textarea
                        rows={3}
                        value={workflowData.currentStatus || ''}
                        onChange={(e) => handleUpdateWorkflowField('currentStatus', e.target.value)}
                        placeholder="Đất ở và đất trồng cây lâu năm; có nhà ở và cây trồng gắn liền với đất..."
                        className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Tình trạng tranh chấp:
                      </label>
                      <input
                        type="text"
                        value={workflowData.disputeStatus || ''}
                        onChange={(e) => handleUpdateWorkflowField('disputeStatus', e.target.value)}
                        placeholder="Đất không tranh chấp"
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Sự phù hợp quy hoạch sử dụng đất:
                      </label>
                      <input
                        type="text"
                        value={workflowData.planningSuitability || ''}
                        onChange={(e) => handleUpdateWorkflowField('planningSuitability', e.target.value)}
                        placeholder="Thửa đất phù hợp quy hoạch sử dụng đất theo quyết định phê duyệt..."
                        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* PHẦN 5: CHU KỲ NIÊM YẾT TỪ NGÀY ĐẾN NGÀY (B2 ➔ B3 TỰ ĐỘNG +15 NGÀY) */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">
                    <Calendar className="w-4 h-4 text-cyan-700" />
                    <span>5. Chu kỳ Niêm yết công khai (Tự động tính Ngày bắt đầu ➔ +15 ngày kết thúc)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        📅 Niêm yết từ ngày:
                      </label>
                      <input
                        type="date"
                        value={workflowData.publicStartDate || ''}
                        onChange={(e) => handleUpdateWorkflowField('publicStartDate', e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-cyan-500 outline-none"
                      />
                      <span className="text-[10px] text-cyan-700 mt-0.5 block italic">
                        * Nhập ngày này sẽ tự động tính ngày kết thúc +15 ngày
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        📅 Đến hết ngày (15 ngày):
                      </label>
                      <input
                        type="date"
                        value={workflowData.publicEndDate || ''}
                        onChange={(e) => handleUpdateWorkflowField('publicEndDate', e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-cyan-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Số Thông báo niêm yết:
                      </label>
                      <input
                        type="text"
                        value={workflowData.publicNoticeNumber || ''}
                        onChange={(e) => handleUpdateWorkflowField('publicNoticeNumber', e.target.value)}
                        placeholder="316/TB-UBND"
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-cyan-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Số Danh sách Mẫu 17:
                      </label>
                      <input
                        type="text"
                        value={workflowData.publicListNumber || ''}
                        onChange={(e) => handleUpdateWorkflowField('publicListNumber', e.target.value)}
                        placeholder="28/CKHS-ĐKĐĐ"
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-cyan-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* PHẦN 6: HỒ SƠ KÈM THEO: THÔNG BÁO THUẾ TRƯỚC BẠ, TIỀN SỬ DỤNG ĐẤT, HOÀN THÀNH NVTC */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">
                    <DollarSign className="w-4 h-4 text-amber-700" />
                    <span>6. Hồ sơ nghĩa vụ tài chính kèm theo (Thông báo thuế trước bạ, tiền SDĐ, hoàn thành NVTC)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* TB Thuế Trước Bạ */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-800 block text-xs">
                        1. Thông báo lệ phí trước bạ:
                      </span>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Số thông báo:</label>
                        <input
                          type="text"
                          value={workflowData.taxNoticeTruocBaNumber || ''}
                          onChange={(e) => handleUpdateWorkflowField('taxNoticeTruocBaNumber', e.target.value)}
                          placeholder="LTB2650321-TK0001799/TB-TCS10"
                          className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Ngày ban hành:</label>
                        <input
                          type="date"
                          value={workflowData.taxNoticeTruocBaDate || ''}
                          onChange={(e) => handleUpdateWorkflowField('taxNoticeTruocBaDate', e.target.value)}
                          className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* TB Tiền Sử Dụng Đất */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-800 block text-xs">
                        2. Thông báo tiền sử dụng đất:
                      </span>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Số thông báo:</label>
                        <input
                          type="text"
                          value={workflowData.taxNoticeTienSDDNumber || ''}
                          onChange={(e) => handleUpdateWorkflowField('taxNoticeTienSDDNumber', e.target.value)}
                          placeholder="LTB2650321-TK0001797/TB-TCS10"
                          className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Ngày ban hành:</label>
                        <input
                          type="date"
                          value={workflowData.taxNoticeTienSDDDate || ''}
                          onChange={(e) => handleUpdateWorkflowField('taxNoticeTienSDDDate', e.target.value)}
                          className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* TB Hoàn Thành NVTC */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-800 block text-xs">
                        3. Thông báo hoàn thành NVTC:
                      </span>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Số thông báo:</label>
                        <input
                          type="text"
                          value={workflowData.taxNoticeHoanThanhNVTCNumber || ''}
                          onChange={(e) => handleUpdateWorkflowField('taxNoticeHoanThanhNVTCNumber', e.target.value)}
                          placeholder="3178/TB-TCS10"
                          className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Ngày ban hành:</label>
                        <input
                          type="date"
                          value={workflowData.taxNoticeHoanThanhNVTCDate || ''}
                          onChange={(e) => handleUpdateWorkflowField('taxNoticeHoanThanhNVTCDate', e.target.value)}
                          className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* PHẦN 7: SỐ HIỆU GCN, TỜ TRÌNH, PHIẾU TRÌNH */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">
                    <FileBadge className="w-4 h-4 text-purple-700" />
                    <span>7. Số hiệu Giấy chứng nhận, Tờ trình UBND & Phiếu trình thẩm định</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Số phôi seri GCN:
                      </label>
                      <input
                        type="text"
                        value={workflowData.gcnDraftNumber || ''}
                        onChange={(e) => handleUpdateWorkflowField('gcnDraftNumber', e.target.value)}
                        placeholder="DA 981240"
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Số vào sổ cấp GCN:
                      </label>
                      <input
                        type="text"
                        value={workflowData.gcnBookNumber || ''}
                        onChange={(e) => handleUpdateWorkflowField('gcnBookNumber', e.target.value)}
                        placeholder="CS 01429"
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Số Tờ trình UBND:
                      </label>
                      <input
                        type="text"
                        value={workflowData.totrinhNumber || ''}
                        onChange={(e) => handleUpdateWorkflowField('totrinhNumber', e.target.value)}
                        placeholder="15/TTr-PKT"
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Số Phiếu trình:
                      </label>
                      <input
                        type="text"
                        value={workflowData.phieutrinhNumber || ''}
                        onChange={(e) => handleUpdateWorkflowField('phieutrinhNumber', e.target.value)}
                        placeholder="08/PT-PKT"
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* PHẦN 8: BẢNG GIÁ ĐẤT, KÍCH THƯỚC THỬA ĐẤT & PHÂN BỔ HẠN MỨC NVTC */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">
                    <DollarSign className="w-4 h-4 text-emerald-700" />
                    <span>8. Vị trí Bảng giá đất, Kích thước thửa đất & Phân bổ Hạn mức NVTC (Theo NĐ 151/2025)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Vị trí Bảng giá đất ở:</label>
                      <input
                        type="text"
                        value={workflowData.landPriceLocationResidential || ''}
                        onChange={(e) => handleUpdateWorkflowField('landPriceLocationResidential', e.target.value)}
                        placeholder="Vị trí 1 - Đường nhóm 2"
                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Vị trí Bảng giá đất NN:</label>
                      <input
                        type="text"
                        value={workflowData.landPriceLocationAgri || ''}
                        onChange={(e) => handleUpdateWorkflowField('landPriceLocationAgri', e.target.value)}
                        placeholder="Vị trí 1 - Đồng bằng"
                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Chiều sâu thửa đất:</label>
                      <input
                        type="text"
                        value={workflowData.landDepth || ''}
                        onChange={(e) => handleUpdateWorkflowField('landDepth', e.target.value)}
                        placeholder="25m"
                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Chiều rộng ngõ hẻm:</label>
                      <input
                        type="text"
                        value={workflowData.alleyWidth || ''}
                        onChange={(e) => handleUpdateWorkflowField('alleyWidth', e.target.value)}
                        placeholder="Đường rộng trên 5m"
                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Đất ở trong hạn mức (m²):</label>
                      <input
                        type="text"
                        value={workflowData.residentialAreaInQuota || ''}
                        onChange={(e) => handleUpdateWorkflowField('residentialAreaInQuota', e.target.value)}
                        placeholder="300,0"
                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-bold text-emerald-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Đất ở ngoài hạn mức (m²):</label>
                      <input
                        type="text"
                        value={workflowData.residentialAreaOutOfQuota || ''}
                        onChange={(e) => handleUpdateWorkflowField('residentialAreaOutOfQuota', e.target.value)}
                        placeholder="0"
                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-bold text-emerald-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Đất nông nghiệp tính thuế (m²):</label>
                      <input
                        type="text"
                        value={workflowData.agricultureTaxArea || ''}
                        onChange={(e) => handleUpdateWorkflowField('agricultureTaxArea', e.target.value)}
                        placeholder="249,5"
                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs font-bold text-emerald-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">Đối tượng miễn/giảm tiền SDĐ:</label>
                      <input
                        type="text"
                        value={workflowData.taxExemptionDetails || ''}
                        onChange={(e) => handleUpdateWorkflowField('taxExemptionDetails', e.target.value)}
                        placeholder="Không thuộc diện miễn, giảm"
                        className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* PHẦN 9: THÔNG TIN 3 HỘ LÀM CHỨNG XÁC MINH NGUỒN GỐC ĐẤT */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">
                    <UserCheck className="w-4 h-4 text-teal-700" />
                    <span>9. Người làm chứng xác minh nguồn gốc đất (3 Hộ dân sinh sống lâu năm)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-800 block text-xs">Hộ làm chứng 1:</span>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Họ và tên:</label>
                        <input
                          type="text"
                          value={workflowData.witness1Name || ''}
                          onChange={(e) => handleUpdateWorkflowField('witness1Name', e.target.value)}
                          placeholder="Nguyễn Văn Được"
                          className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <VillageAddressInput
                          label="Địa chỉ thường trú (Hộ 1)"
                          mode="address"
                          placeholder="Thôn Tiên Hiệp, xã Lãnh Ngọc..."
                          value={workflowData.witness1Address || ''}
                          onChange={(val) => handleUpdateWorkflowField('witness1Address', val)}
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-800 block text-xs">Hộ làm chứng 2:</span>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Họ và tên:</label>
                        <input
                          type="text"
                          value={workflowData.witness2Name || ''}
                          onChange={(e) => handleUpdateWorkflowField('witness2Name', e.target.value)}
                          placeholder="Lê Thị Thu"
                          className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <VillageAddressInput
                          label="Địa chỉ thường trú (Hộ 2)"
                          mode="address"
                          placeholder="Thôn Tiên Hiệp, xã Lãnh Ngọc..."
                          value={workflowData.witness2Address || ''}
                          onChange={(val) => handleUpdateWorkflowField('witness2Address', val)}
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-800 block text-xs">Hộ làm chứng 3:</span>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Họ và tên:</label>
                        <input
                          type="text"
                          value={workflowData.witness3Name || ''}
                          onChange={(e) => handleUpdateWorkflowField('witness3Name', e.target.value)}
                          placeholder="Trần Đình Cử"
                          className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <VillageAddressInput
                          label="Địa chỉ thường trú (Hộ 3)"
                          mode="address"
                          placeholder="Thôn Tiên Hiệp, xã Lãnh Ngọc..."
                          value={workflowData.witness3Address || ''}
                          onChange={(val) => handleUpdateWorkflowField('witness3Address', val)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* PHẦN 10: THEO DÕI GIAO NHẬN & LUÂN CHUYỂN HỒ SƠ */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm border-b border-slate-200 pb-2">
                    <Clock className="w-4 h-4 text-indigo-700" />
                    <span>10. Theo dõi Giao nhận & Luân chuyển Hồ sơ (Một Cửa ➔ Chuyên viên ➔ Trình ký ➔ Trả kết quả)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {/* Một Cửa */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-800 block text-xs">1. Một Cửa bàn giao hồ sơ:</span>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Ngày bàn giao tiếp nhận:</label>
                        <input
                          type="date"
                          value={workflowData.handover1Date || ''}
                          onChange={(e) => handleUpdateWorkflowField('handover1Date', e.target.value)}
                          className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Người bàn giao Một Cửa:</label>
                        <input
                          type="text"
                          value={workflowData.handover1Giver || ''}
                          onChange={(e) => handleUpdateWorkflowField('handover1Giver', e.target.value)}
                          className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Chuyên viên thụ lý nhận:</label>
                        <input
                          type="text"
                          value={workflowData.handover1Receiver || ''}
                          onChange={(e) => handleUpdateWorkflowField('handover1Receiver', e.target.value)}
                          className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* Trình ký */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-800 block text-xs">2. Trình ký & Lãnh đạo duyệt:</span>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Ngày chuyên viên trình ký:</label>
                        <input
                          type="date"
                          value={workflowData.submissionSignDate || ''}
                          onChange={(e) => handleUpdateWorkflowField('submissionSignDate', e.target.value)}
                          className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Ngày Lãnh đạo ký duyệt:</label>
                        <input
                          type="date"
                          value={workflowData.leaderSignDate || ''}
                          onChange={(e) => handleUpdateWorkflowField('leaderSignDate', e.target.value)}
                          className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Lãnh đạo ký duyệt:</label>
                        <input
                          type="text"
                          value={workflowData.leaderSignerName || ''}
                          onChange={(e) => handleUpdateWorkflowField('leaderSignerName', e.target.value)}
                          className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* Trả kết quả */}
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <span className="font-bold text-slate-800 block text-xs">3. Bàn giao trả kết quả GCN:</span>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Ngày trao GCN:</label>
                        <input
                          type="date"
                          value={workflowData.finalHandoverDate || workflowData.gcnIssueDate || ''}
                          onChange={(e) => {
                            handleUpdateWorkflowField('finalHandoverDate', e.target.value);
                            handleUpdateWorkflowField('gcnIssueDate', e.target.value);
                          }}
                          className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Người nhận GCN:</label>
                        <input
                          type="text"
                          value={workflowData.finalHandoverReceiver || workflowData.recipientName || ''}
                          onChange={(e) => {
                            handleUpdateWorkflowField('finalHandoverReceiver', e.target.value);
                            handleUpdateWorkflowField('recipientName', e.target.value);
                          }}
                          className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-0.5">Ghi chú bàn giao trả:</label>
                        <input
                          type="text"
                          value={workflowData.finalHandoverNote || ''}
                          onChange={(e) => handleUpdateWorkflowField('finalHandoverNote', e.target.value)}
                          className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Modal Footer: Nút Lưu Dữ Liệu & Tự Đóng Modal */}
              <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
                <span className="text-[11px] text-slate-500 italic">
                  * Khi bấm lưu, dữ liệu sẽ tự động đồng bộ vào toàn bộ các bước và các biểu mẫu in.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpenUnifiedModal(false)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs transition cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={async () => {
                      await handleSaveWorkflow();
                      setIsOpenUnifiedModal(false);
                    }}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{isSaving ? 'Đang lưu dữ liệu...' : 'Lưu Dữ Liệu & Đóng'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. MODAL CHI TIẾT TỪNG BƯỚC RỘNG RÃI (BẤM VÀO CHI TIẾT SẼ XUẤT HIỆN BẢNG THÔNG TIN ĐỂ ĐIỀN CÁC TRƯỜNG RỘNG DỄ THAO TÁC, KHI LƯU TỰ ĐÓNG VÀ HIỂN THỊ LẠI BẢNG 8 BƯỚC) */}
        {activeStepModalIndex !== null && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full my-auto shadow-2xl border border-emerald-300 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
              
              {/* Header của Modal Bước */}
              <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white shrink-0 border border-white/20">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white leading-tight">
                      {DEFAULT_WORKFLOW_STEPS[activeStepModalIndex - 1]?.title}
                    </h2>
                    <p className="text-[11px] text-emerald-200">
                      {DEFAULT_WORKFLOW_STEPS[activeStepModalIndex - 1]?.detailGuide}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStepModalIndex(null)}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body: Form trường rộng rãi cho từng bước cụ thể */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
                
                {/* NỘI DUNG CHI TIẾT BƯỚC 1: BIÊN BẢN KIỂM TRA THỰC ĐỊA & XÁC MINH NGUỒN GỐC */}
                {activeStepModalIndex === 1 && (
                  <div className="space-y-4">
                    {/* Header Action Banner */}
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-teal-950 text-xs block">
                          Biên bản kiểm tra thực địa & Xác minh nguồn gốc đất (Chuẩn Luật Đất đai 2024 & NĐ 151/2025)
                        </span>
                        <span className="text-[11px] text-teal-700">
                          Đầy đủ thông số kỹ thuật, bảng giá đất, hạn mức thuế, miễn giảm, tình trạng vi phạm và 3 hộ làm chứng
                        </span>
                      </div>
                      {onOpenPrintSlip && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveStepModalIndex(null);
                              handleOpenPrintDoc('site_inspection');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                            title="In Biên bản kiểm tra thực địa"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>In BB Thực Địa</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveStepModalIndex(null);
                              handleOpenPrintDoc('origin_verification');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                            title="In Biên bản xác minh nguồn gốc đất với 3 hộ dân"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>In BB Nguồn Gốc (3 Hộ)</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Phần 1: Thời gian, địa điểm */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <span className="font-bold text-slate-800 text-xs block border-b border-slate-200 pb-1.5">
                        1. Thời gian, địa điểm kiểm tra thực địa:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Ngày kiểm tra:</label>
                          <input
                            type="date"
                            value={workflowData.inspectionDate || ''}
                            onChange={(e) => handleUpdateWorkflowField('inspectionDate', e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-slate-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Giờ bắt đầu:</label>
                          <input
                            type="text"
                            value={workflowData.inspectionTime || ''}
                            onChange={(e) => handleUpdateWorkflowField('inspectionTime', e.target.value)}
                            placeholder="08 giờ 30 phút"
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-slate-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Giờ kết thúc:</label>
                          <input
                            type="text"
                            value={workflowData.inspectionEndTime || ''}
                            onChange={(e) => handleUpdateWorkflowField('inspectionEndTime', e.target.value)}
                            placeholder="09 giờ 30 phút"
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-slate-900 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <VillageAddressInput
                            label="Địa điểm kiểm tra thực địa"
                            mode="location"
                            placeholder="Thực địa Thửa đất số ..., Tờ bản đồ số ..., Thôn Tiên Hiệp, xã Lãnh Ngọc"
                            value={workflowData.inspectionLocation || ''}
                            onChange={(val) => handleUpdateWorkflowField('inspectionLocation', val)}
                          />
                        </div>

                      </div>
                    </div>

                    {/* Phần 2: Thành phần tham gia (3 bên) */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <span className="font-bold text-slate-800 text-xs block border-b border-slate-200 pb-1.5">
                        2. Thành phần tham gia kiểm tra thực địa (3 Bên theo NĐ 151/2025):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1.5">
                          <span className="font-bold text-emerald-800 block text-xs">Cán bộ 1 (Phòng KT):</span>
                          <input
                            type="text"
                            value={workflowData.officer1Name || ''}
                            onChange={(e) => handleUpdateWorkflowField('officer1Name', e.target.value)}
                            placeholder="Đoàn Văn Hoài Vũ"
                            className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none"
                          />
                          <input
                            type="text"
                            value={workflowData.officer1Role || ''}
                            onChange={(e) => handleUpdateWorkflowField('officer1Role', e.target.value)}
                            placeholder="Chuyên viên"
                            className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none"
                          />
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1.5">
                          <span className="font-bold text-emerald-800 block text-xs">Cán bộ 2 (Phòng KT):</span>
                          <input
                            type="text"
                            value={workflowData.officer2Name || ''}
                            onChange={(e) => handleUpdateWorkflowField('officer2Name', e.target.value)}
                            placeholder="Võ Tấn Lạt"
                            className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none"
                          />
                          <input
                            type="text"
                            value={workflowData.officer2Role || ''}
                            onChange={(e) => handleUpdateWorkflowField('officer2Role', e.target.value)}
                            placeholder="Phó Trưởng phòng"
                            className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none"
                          />
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1.5">
                          <span className="font-bold text-teal-800 block text-xs">Đại diện Thôn:</span>
                          <input
                            type="text"
                            value={workflowData.villageLeaderName || ''}
                            onChange={(e) => handleUpdateWorkflowField('villageLeaderName', e.target.value)}
                            placeholder="Nguyễn Văn Chính"
                            className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none"
                          />
                          <input
                            type="text"
                            value={workflowData.villageLeaderRole || ''}
                            onChange={(e) => handleUpdateWorkflowField('villageLeaderRole', e.target.value)}
                            placeholder="Trưởng thôn Tiên Hiệp"
                            className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none"
                          />
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1.5">
                          <span className="font-bold text-blue-800 block text-xs">Chủ sử dụng đất:</span>
                          <input
                            type="text"
                            value={workflowData.owner || ''}
                            onChange={(e) => handleUpdateWorkflowField('owner', e.target.value)}
                            placeholder="Chủ hồ sơ..."
                            className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs font-bold text-slate-900 outline-none"
                          />
                          <input
                            type="text"
                            value={workflowData.owner2 || ''}
                            onChange={(e) => handleUpdateWorkflowField('owner2', e.target.value)}
                            placeholder="Vợ/chồng (nếu có)..."
                            className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Phần 3: Bảng giá đất & Kích thước */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <span className="font-bold text-slate-800 text-xs block border-b border-slate-200 pb-1.5">
                        3. Vị trí bảng giá đất, Chiều sâu & Ngõ hẻm:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Vị trí Bảng giá đất ở:</label>
                          <input
                            type="text"
                            value={workflowData.landPriceLocationResidential || ''}
                            onChange={(e) => handleUpdateWorkflowField('landPriceLocationResidential', e.target.value)}
                            placeholder="Vị trí 1 - Đường nhóm 2"
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Vị trí Bảng giá đất NN:</label>
                          <input
                            type="text"
                            value={workflowData.landPriceLocationAgri || ''}
                            onChange={(e) => handleUpdateWorkflowField('landPriceLocationAgri', e.target.value)}
                            placeholder="Vị trí 1 - Đồng bằng"
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Chiều sâu thửa đất:</label>
                          <input
                            type="text"
                            value={workflowData.landDepth || ''}
                            onChange={(e) => handleUpdateWorkflowField('landDepth', e.target.value)}
                            placeholder="25m"
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Chiều rộng ngõ hẻm:</label>
                          <input
                            type="text"
                            value={workflowData.alleyWidth || ''}
                            onChange={(e) => handleUpdateWorkflowField('alleyWidth', e.target.value)}
                            placeholder="Đường rộng trên 5m"
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Phần 4: Phân bổ diện tích tính NVTC & Miễn giảm */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <span className="font-bold text-slate-800 text-xs block border-b border-slate-200 pb-1.5">
                        4. Diện tích thực hiện nghĩa vụ tài chính & Miễn giảm:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Tổng diện tích tính NVTC (m²):</label>
                          <input
                            type="text"
                            value={workflowData.taxObligationArea || ''}
                            onChange={(e) => handleUpdateWorkflowField('taxObligationArea', e.target.value)}
                            placeholder="549,5"
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs font-bold text-slate-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Đất ở trong hạn mức (m²):</label>
                          <input
                            type="text"
                            value={workflowData.residentialAreaInQuota || ''}
                            onChange={(e) => handleUpdateWorkflowField('residentialAreaInQuota', e.target.value)}
                            placeholder="300,0"
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs font-bold text-emerald-800 outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Đất ở ngoài hạn mức (m²):</label>
                          <input
                            type="text"
                            value={workflowData.residentialAreaOutOfQuota || ''}
                            onChange={(e) => handleUpdateWorkflowField('residentialAreaOutOfQuota', e.target.value)}
                            placeholder="0"
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs font-bold text-emerald-800 outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Đất nông nghiệp (m²):</label>
                          <input
                            type="text"
                            value={workflowData.agricultureTaxArea || ''}
                            onChange={(e) => handleUpdateWorkflowField('agricultureTaxArea', e.target.value)}
                            placeholder="249,5"
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs font-bold text-teal-800 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="font-bold text-slate-700 block mb-1">Đối tượng miễn, giảm tiền SDĐ:</label>
                          <input
                            type="text"
                            value={workflowData.taxExemptionDetails || ''}
                            onChange={(e) => handleUpdateWorkflowField('taxExemptionDetails', e.target.value)}
                            placeholder="Không thuộc diện miễn, giảm"
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="font-bold text-slate-700 block mb-1">Tình hình vi phạm pháp luật đất đai:</label>
                          <input
                            type="text"
                            value={workflowData.landLawViolation || ''}
                            onChange={(e) => handleUpdateWorkflowField('landLawViolation', e.target.value)}
                            placeholder="Không có vi phạm"
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Phần 5: Kết quả kiểm tra & Ý kiến */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <span className="font-bold text-slate-800 text-xs block border-b border-slate-200 pb-1.5">
                        5. Kết quả kiểm tra hiện trạng & Ý kiến thống nhất:
                      </span>
                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Nội dung kết quả kiểm tra:</label>
                          <textarea
                            rows={2}
                            value={workflowData.inspectionContent || ''}
                            onChange={(e) => handleUpdateWorkflowField('inspectionContent', e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded p-2 text-xs text-slate-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Ý kiến các bên tham gia kiểm tra:</label>
                          <textarea
                            rows={2}
                            value={workflowData.inspectionFeedback || ''}
                            onChange={(e) => handleUpdateWorkflowField('inspectionFeedback', e.target.value)}
                            placeholder="Thống nhất với ranh giới, mốc giới và hiện trạng sử dụng đất đo đạc trên thực địa..."
                            className="w-full bg-white border border-gray-300 rounded p-2 text-xs text-slate-900 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Phần 6: 3 Hộ làm chứng xác minh nguồn gốc */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <span className="font-bold text-slate-800 text-xs block border-b border-slate-200 pb-1.5">
                        6. Người làm chứng xác minh nguồn gốc đất (3 Hộ dân sinh sống cùng thời điểm):
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-2.5 bg-white rounded border border-slate-200 space-y-1.5">
                          <span className="font-bold text-slate-800 block text-xs">Hộ 1:</span>
                          <input
                            type="text"
                            value={workflowData.witness1Name || ''}
                            onChange={(e) => handleUpdateWorkflowField('witness1Name', e.target.value)}
                            placeholder="Họ tên người làm chứng 1..."
                            className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none"
                          />
                          <VillageAddressInput
                            placeholder="Địa chỉ thường trú hộ 1..."

                            mode="address"
                            value={workflowData.witness1Address || ''}
                            onChange={(val) => handleUpdateWorkflowField('witness1Address', val)}
                          />
                        </div>
                        <div className="p-2.5 bg-white rounded border border-slate-200 space-y-1.5">
                          <span className="font-bold text-slate-800 block text-xs">Hộ 2:</span>
                          <input
                            type="text"
                            value={workflowData.witness2Name || ''}
                            onChange={(e) => handleUpdateWorkflowField('witness2Name', e.target.value)}
                            placeholder="Họ tên người làm chứng 2..."
                            className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none"
                          />
                          <VillageAddressInput
                            placeholder="Địa chỉ thường trú hộ 2..."
                            mode="address"
                            value={workflowData.witness2Address || ''}
                            onChange={(val) => handleUpdateWorkflowField('witness2Address', val)}
                          />
                        </div>
                        <div className="p-2.5 bg-white rounded border border-slate-200 space-y-1.5">
                          <span className="font-bold text-slate-800 block text-xs">Hộ 3:</span>
                          <input
                            type="text"
                            value={workflowData.witness3Name || ''}
                            onChange={(e) => handleUpdateWorkflowField('witness3Name', e.target.value)}
                            placeholder="Họ tên người làm chứng 3..."
                            className="w-full bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none"
                          />
                          <VillageAddressInput
                            placeholder="Địa chỉ thường trú hộ 3..."
                            mode="address"
                            value={workflowData.witness3Address || ''}
                            onChange={(val) => handleUpdateWorkflowField('witness3Address', val)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* NỘI DUNG CHI TIẾT BƯỚC 2: NIÊM YẾT CÔNG KHAI */}
                {activeStepModalIndex === 2 && (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-blue-950 text-xs block">
                          Niêm yết công khai (Mẫu 17 & Thông báo niêm yết)
                        </span>
                        <span className="text-[11px] text-blue-700">
                          Thời gian niêm yết bắt buộc 15 ngày tại Trụ sở UBND xã và Nhà văn hóa thôn
                        </span>
                      </div>
                      {onOpenPrintSlip && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveStepModalIndex(null);
                              handleOpenPrintDoc('public_list');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>In Mẫu 17</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveStepModalIndex(null);
                              handleOpenPrintDoc('public_notice');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>In TB Niêm Yết</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Ngày bắt đầu niêm yết:</label>
                        <input
                          type="date"
                          value={workflowData.publicStartDate || ''}
                          onChange={(e) => handleUpdateWorkflowField('publicStartDate', e.target.value)}
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-[10px] text-blue-600 block mt-0.5">
                          * Tự động tính ngày kết thúc niêm yết = ngày bắt đầu + 15 ngày
                        </span>
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Ngày kết thúc niêm yết (tự động link B3):</label>
                        <input
                          type="date"
                          value={workflowData.publicEndDate || ''}
                          onChange={(e) => handleUpdateWorkflowField('publicEndDate', e.target.value)}
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Số Thông báo niêm yết:</label>
                        <input
                          type="text"
                          value={workflowData.publicNoticeNumber || ''}
                          onChange={(e) => handleUpdateWorkflowField('publicNoticeNumber', e.target.value)}
                          placeholder="316/TB-UBND"
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Số Danh sách công khai Mẫu 17:</label>
                        <input
                          type="text"
                          value={workflowData.publicListNumber || ''}
                          onChange={(e) => handleUpdateWorkflowField('publicListNumber', e.target.value)}
                          placeholder="28/CKHS-ĐKĐĐ"
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <VillageAddressInput
                          label="Địa điểm niêm yết tại thôn"
                          mode="location"
                          placeholder="Nhà văn hóa thôn Tiên Hiệp"
                          value={workflowData.publicLocationVillage || ''}
                          onChange={(val) => handleUpdateWorkflowField('publicLocationVillage', val)}
                        />
                      </div>

                    </div>
                  </div>
                )}

                {/* NỘI DUNG CHI TIẾT BƯỚC 3: KẾT THÚC NIÊM YẾT */}
                {activeStepModalIndex === 3 && (
                  <div className="space-y-4">
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-indigo-950 text-xs block">
                          Biên bản & Thông báo kết thúc niêm yết công khai
                        </span>
                        <span className="text-[11px] text-indigo-700">
                          Xác nhận sau 15 ngày niêm yết không có đơn thư khiếu nại, tranh chấp phát sinh
                        </span>
                      </div>
                      {onOpenPrintSlip && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveStepModalIndex(null);
                              handleOpenPrintDoc('public_closing_minutes');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>In BB Kết Thúc</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveStepModalIndex(null);
                              handleOpenPrintDoc('public_closing_notice');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>In TB Kết Thúc</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Ngày kết thúc niêm yết:</label>
                        <input
                          type="date"
                          value={workflowData.publicEndDate || ''}
                          onChange={(e) => handleUpdateWorkflowField('publicEndDate', e.target.value)}
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Thời gian lập biên bản kết thúc:</label>
                        <input
                          type="text"
                          value={workflowData.closingTimeStr || ''}
                          onChange={(e) => handleUpdateWorkflowField('closingTimeStr', e.target.value)}
                          placeholder="08 giờ 30 phút"
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Số Thông báo kết thúc niêm yết:</label>
                        <input
                          type="text"
                          value={workflowData.closingNoticeNumber || ''}
                          onChange={(e) => handleUpdateWorkflowField('closingNoticeNumber', e.target.value)}
                          placeholder="320/TB-UBND"
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Tình trạng đơn thư, khiếu nại phản ánh:</label>
                        <input
                          type="text"
                          value="Không phát sinh đơn thư, tranh chấp hay khiếu nại"
                          readOnly
                          className="w-full bg-slate-100 border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-800 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* NỘI DUNG CHI TIẾT BƯỚC 4: HƯỚNG DẪN KÊ KHAI NGHĨA VỤ TÀI CHÍNH */}
                {activeStepModalIndex === 4 && (
                  <div className="space-y-4">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <span className="font-bold text-amber-950 text-xs block">
                        Kê khai hồ sơ nghĩa vụ tài chính
                      </span>
                      <span className="text-[11px] text-amber-700">
                        Kiểm tra tờ khai lệ phí trước bạ, tờ khai tiền sử dụng đất và các giấy tờ miễn giảm (nếu có)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Số Thông báo lệ phí trước bạ:</label>
                        <input
                          type="text"
                          value={workflowData.taxNoticeTruocBaNumber || ''}
                          onChange={(e) => handleUpdateWorkflowField('taxNoticeTruocBaNumber', e.target.value)}
                          placeholder="LTB2650321-TK0001799/TB-TCS10"
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Số Thông báo tiền sử dụng đất:</label>
                        <input
                          type="text"
                          value={workflowData.taxNoticeTienSDDNumber || ''}
                          onChange={(e) => handleUpdateWorkflowField('taxNoticeTienSDDNumber', e.target.value)}
                          placeholder="LTB2650321-TK0001797/TB-TCS10"
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* NỘI DUNG CHI TIẾT BƯỚC 5: PHIẾU CHUYỂN THUẾ */}
                {activeStepModalIndex === 5 && (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <span className="font-bold text-blue-950 text-xs block">
                        Phiếu chuyển thông tin địa chính để xác định nghĩa vụ tài chính
                      </span>
                      <span className="text-[11px] text-blue-700">
                        Chuyển thông tin sang Chi cục Thuế khu vực để tính thuế và nghĩa vụ tài chính
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Số Phiếu chuyển thông tin:</label>
                        <input
                          type="text"
                          value={workflowData.taxTransferNumber || ''}
                          onChange={(e) => handleUpdateWorkflowField('taxTransferNumber', e.target.value)}
                          placeholder="142/PCTT-PKT"
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Ngày chuyển thông tin thuế:</label>
                        <input
                          type="date"
                          value={workflowData.taxTransferDate || ''}
                          onChange={(e) => handleUpdateWorkflowField('taxTransferDate', e.target.value)}
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="font-bold text-slate-700 block mb-1">Số Thông báo hoàn thành nghĩa vụ tài chính:</label>
                        <input
                          type="text"
                          value={workflowData.taxNoticeHoanThanhNVTCNumber || ''}
                          onChange={(e) => handleUpdateWorkflowField('taxNoticeHoanThanhNVTCNumber', e.target.value)}
                          placeholder="3178/TB-TCS10"
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* NỘI DUNG CHI TIẾT BƯỚC 6: SOẠN THẢO GCN, PHIẾU TRÌNH & TỜ TRÌNH CẤP GCN */}
                {activeStepModalIndex === 6 && (
                  <div className="space-y-4">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-amber-950 text-xs block">
                          Soạn thảo Giấy chứng nhận, Phiếu trình & Tờ trình trình Lãnh đạo UBND
                        </span>
                        <span className="text-[11px] text-amber-800">
                          Tự động hoàn thành trên cơ sở hồ sơ; kiểm tra và in trực tiếp tại đây
                        </span>
                      </div>
                      {onOpenPrintSlip && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveStepModalIndex(null);
                              handleOpenPrintDoc('submission_phieutrinh');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>In Phiếu Trình</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveStepModalIndex(null);
                              handleOpenPrintDoc('submission_totrinh');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                          >
                            <FileBadge className="w-3.5 h-3.5" />
                            <span>In Tờ Trình</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Số phôi seri GCN:</label>
                        <input
                          type="text"
                          value={workflowData.gcnDraftNumber || ''}
                          onChange={(e) => handleUpdateWorkflowField('gcnDraftNumber', e.target.value)}
                          placeholder="DA 981240"
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Số vào sổ cấp GCN:</label>
                        <input
                          type="text"
                          value={workflowData.gcnBookNumber || ''}
                          onChange={(e) => handleUpdateWorkflowField('gcnBookNumber', e.target.value)}
                          placeholder="CS 01429"
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Số Tờ trình UBND:</label>
                        <input
                          type="text"
                          value={workflowData.totrinhNumber || ''}
                          onChange={(e) => handleUpdateWorkflowField('totrinhNumber', e.target.value)}
                          placeholder="15/TTr-PKT"
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Số Phiếu trình thẩm định:</label>
                        <input
                          type="text"
                          value={workflowData.phieutrinhNumber || ''}
                          onChange={(e) => handleUpdateWorkflowField('phieutrinhNumber', e.target.value)}
                          placeholder="08/PT-PKT"
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* NỘI DUNG CHI TIẾT BƯỚC 7: CẬP NHẬT CSDL VBDLIS */}
                {activeStepModalIndex === 7 && (
                  <div className="space-y-4">
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                      <span className="font-bold text-teal-950 text-xs block">
                        Cập nhật cơ sở dữ liệu địa chính quốc gia (VBDLIS / CSDLPL)
                      </span>
                      <span className="text-[11px] text-teal-700">
                        Cập nhật thuộc tính thửa đất, số phát hành GCN, chủ sử dụng và không gian bản đồ
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Ngày đồng bộ CSDL VBDLIS:</label>
                        <input
                          type="date"
                          value={workflowData.vbdlisSyncDate || ''}
                          onChange={(e) => handleUpdateWorkflowField('vbdlisSyncDate', e.target.value)}
                          className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:bg-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="font-bold text-slate-700 block mb-1">Trạng thái đồng bộ CSDL:</label>
                        <input
                          type="text"
                          value="Đã hoàn tất tích hợp dữ liệu không gian & thuộc tính"
                          readOnly
                          className="w-full bg-slate-100 border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-bold text-teal-800 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* NỘI DUNG CHI TIẾT BƯỚC 8: TRẢ KẾT QUẢ CHO CÔNG DÂN & PHIẾU THEO DÕI GIAO NHẬN */}
                {activeStepModalIndex === 8 && (
                  <div className="space-y-4">
                    {/* Header Action Banner */}
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-emerald-950 text-xs block">
                          Trả kết quả cho công dân & Quản lý Luân chuyển / Giao nhận hồ sơ
                        </span>
                        <span className="text-[11px] text-emerald-700">
                          Theo dõi toàn bộ quá trình: Một Cửa bàn giao ➔ Chuyên viên nhận ➔ Trình ký Lãnh đạo ➔ Thuế ➔ Trao GCN
                        </span>
                      </div>
                      {onOpenPrintSlip && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveStepModalIndex(null);
                              handleOpenPrintDoc('handover_tracking');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                            title="In Phiếu theo dõi giao nhận và luân chuyển hồ sơ"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>In Phiếu Giao Nhận</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveStepModalIndex(null);
                              handlePrintSlip();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                            title="In Phiếu theo dõi tiến độ giải quyết hồ sơ"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>In Phiếu Tiến Độ</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Khối 1: Một Cửa bàn giao */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <span className="font-bold text-slate-800 text-xs block border-b border-slate-200 pb-1.5">
                        1. Giai đoạn tiếp nhận hồ sơ từ Bộ phận Một Cửa:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Ngày Một Cửa bàn giao:</label>
                          <input
                            type="date"
                            value={workflowData.handover1Date || ''}
                            onChange={(e) => handleUpdateWorkflowField('handover1Date', e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Người bàn giao Một Cửa:</label>
                          <input
                            type="text"
                            value={workflowData.handover1Giver || ''}
                            onChange={(e) => handleUpdateWorkflowField('handover1Giver', e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Chuyên viên thụ lý nhận bàn giao:</label>
                          <input
                            type="text"
                            value={workflowData.handover1Receiver || ''}
                            onChange={(e) => handleUpdateWorkflowField('handover1Receiver', e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="font-bold text-slate-700 block mb-1">Nội dung / Ghi chú bàn giao tiếp nhận:</label>
                          <input
                            type="text"
                            value={workflowData.handover1Note || ''}
                            onChange={(e) => handleUpdateWorkflowField('handover1Note', e.target.value)}
                            placeholder="Nhận đủ 01 bộ hồ sơ gốc kèm trích đo địa chính..."
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Khối 2: Trình ký Lãnh đạo */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <span className="font-bold text-slate-800 text-xs block border-b border-slate-200 pb-1.5">
                        2. Giai đoạn trình ký & Lãnh đạo UBND phê duyệt:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Ngày chuyên viên trình ký:</label>
                          <input
                            type="date"
                            value={workflowData.submissionSignDate || ''}
                            onChange={(e) => handleUpdateWorkflowField('submissionSignDate', e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Ngày Lãnh đạo ký duyệt GCN:</label>
                          <input
                            type="date"
                            value={workflowData.leaderSignDate || ''}
                            onChange={(e) => handleUpdateWorkflowField('leaderSignDate', e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Họ tên Lãnh đạo ký duyệt:</label>
                          <input
                            type="text"
                            value={workflowData.leaderSignerName || ''}
                            onChange={(e) => handleUpdateWorkflowField('leaderSignerName', e.target.value)}
                            placeholder="Thái Công Cần"
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Khối 3: Bàn giao GCN & Trả kết quả */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <span className="font-bold text-slate-800 text-xs block border-b border-slate-200 pb-1.5">
                        3. Giai đoạn bàn giao Giấy chứng nhận và hoàn trả kết quả:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Ngày bàn giao trao GCN:</label>
                          <input
                            type="date"
                            value={workflowData.finalHandoverDate || workflowData.gcnIssueDate || ''}
                            onChange={(e) => {
                              handleUpdateWorkflowField('finalHandoverDate', e.target.value);
                              handleUpdateWorkflowField('gcnIssueDate', e.target.value);
                            }}
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Người nhận kết quả:</label>
                          <input
                            type="text"
                            value={workflowData.finalHandoverReceiver || workflowData.recipientName || ''}
                            onChange={(e) => {
                              handleUpdateWorkflowField('finalHandoverReceiver', e.target.value);
                              handleUpdateWorkflowField('recipientName', e.target.value);
                            }}
                            placeholder="Họ và tên người nhận..."
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="font-bold text-slate-700 block mb-1">Số CCCD người nhận:</label>
                          <input
                            type="text"
                            value={workflowData.recipientIdCard || ''}
                            onChange={(e) => handleUpdateWorkflowField('recipientIdCard', e.target.value)}
                            placeholder="Số CCCD/Định danh..."
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <label className="font-bold text-slate-700 block mb-1">Ghi chú bàn giao trả kết quả:</label>
                          <input
                            type="text"
                            value={workflowData.finalHandoverNote || ''}
                            onChange={(e) => handleUpdateWorkflowField('finalHandoverNote', e.target.value)}
                            placeholder="Đã thu biên lai hoàn thành NVTC, đã vào Sổ cấp GCN và giao trả GCN cho công dân..."
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-slate-900 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Phần chung chân modal bước: Checkbox hoàn thành, Ngày xong, Ghi chú & Tệp đính kèm */}
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-xs">
                      <input
                        type="checkbox"
                        checked={steps[activeStepModalIndex - 1]?.isCompleted || false}
                        onChange={() => handleToggleStep(activeStepModalIndex)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Đánh dấu bước này đã hoàn thành</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 text-xs">Ngày xong:</span>
                      <input
                        type="date"
                        value={steps[activeStepModalIndex - 1]?.completedDate || ''}
                        onChange={(e) => handleUpdateStepField(activeStepModalIndex, 'completedDate', e.target.value)}
                        className="bg-slate-50 border border-gray-300 rounded px-2 py-1 text-xs text-slate-900 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1 text-xs">Ghi chú thực hiện:</label>
                    <input
                      type="text"
                      value={steps[activeStepModalIndex - 1]?.note || ''}
                      onChange={(e) => handleUpdateStepField(activeStepModalIndex, 'note', e.target.value)}
                      placeholder="Ghi chú kết quả thực hiện, số hiệu văn bản liên quan..."
                      className="w-full bg-slate-50 border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 outline-none focus:bg-white"
                    />
                  </div>

                  {/* Tệp đính kèm của bước */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                        <span>Tệp đính kèm của bước này ({steps[activeStepModalIndex - 1]?.attachments?.length || 0}):</span>
                      </span>
                      <label className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition">
                        <Upload className="w-3 h-3 text-emerald-700" />
                        <span>Tải tệp lên</span>
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => handleFileUpload(activeStepModalIndex, e)}
                        />
                      </label>
                    </div>

                    {(steps[activeStepModalIndex - 1]?.attachments || []).length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {(steps[activeStepModalIndex - 1]?.attachments || []).map((att) => (
                          <div
                            key={att.id}
                            className="p-2 rounded bg-white border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                          >
                            <span className="text-xs text-slate-800 font-medium truncate" title={att.name}>
                              {att.name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setPreviewFile(att)}
                                className="p-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition"
                                title="Xem tệp"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveAttachment(activeStepModalIndex, att.id)}
                                className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition"
                                title="Xóa"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer: Nút Lưu & Tự Động Đóng Quay Lại Bảng 8 Bước */}
              <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
                <span className="text-[11px] text-slate-500 italic">
                  * Khi bấm lưu, dữ liệu bước sẽ được lưu và tự đóng quay lại màn hình 8 bước.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveStepModalIndex(null)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs transition cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={async () => {
                      await handleSaveWorkflow();
                      setActiveStepModalIndex(null);
                    }}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 disabled:opacity-60 text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>{isSaving ? 'Đang lưu bước...' : 'Lưu Bước & Quay Lại 8 Bước'}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 8. MODAL KHO TỆP ĐÍNH KÈM TẬP TRUNG */}
        {isOpenAttachmentVaultModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-3xl w-full my-auto shadow-2xl border border-blue-300 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
              <div className="px-5 py-3.5 bg-blue-800 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    Kho Quản Lý Tệp Đính Kèm Của 8 Bước ({allStepAttachments.length} tệp)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpenAttachmentVaultModal(false)}
                  className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 space-y-2 text-xs">
                {allStepAttachments.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    Chưa có tệp đính kèm nào được tải lên trong 8 bước.
                  </div>
                ) : (
                  allStepAttachments.map((att) => (
                    <div
                      key={att.id}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 truncate block max-w-md" title={att.name}>
                            {att.name}
                          </span>
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            {att.stepTitle || `Bước ${att.stepIndex || 1}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewFile(att)}
                          className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold text-xs flex items-center gap-1 transition"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Xem</span>
                        </button>
                        <a
                          href={att.url}
                          download={att.name}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-600 transition"
                          title="Tải về"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="px-5 py-2.5 bg-slate-100 border-t border-slate-200 text-right shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpenAttachmentVaultModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-200 transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Xem trước file trực tiếp */}
        {previewFile && (
          <FilePreviewModal
            isOpen={Boolean(previewFile)}
            onClose={() => setPreviewFile(null)}
            file={previewFile}
          />
        )}

      </div>
    </div>
  );
};
