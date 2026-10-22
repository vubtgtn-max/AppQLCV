import React, { useState, useMemo, useRef } from 'react';
import {
  Calendar,
  CalendarRange,
  FileSpreadsheet,
  Printer,
  Copy,
  Check,
  Building2,
  Users,
  DollarSign,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Landmark,
  Layers,
  FileText,
  Filter,
  Download,
  Edit3,
  RefreshCw,
  Home,
  ShieldAlert,
  Search,
  Sparkles,
  ArrowRight,
  PieChart,
  BarChart3,
} from 'lucide-react';
import { LandProject, ProjectHousehold, ProjectStatus } from '../../types';
import { formatDate } from '../../utils/date';
import { exportToExcel } from '../../utils/export';
import { VietnameseDateInput } from '../common/VietnameseDateInput';

interface ProjectReportsViewProps {
  projects: LandProject[];
  onBackToProjects?: () => void;
  onSelectProject?: (project: LandProject) => void;
}

type PeriodType = 'week' | 'month' | 'quarter' | 'custom';

export const ProjectReportsView: React.FC<ProjectReportsViewProps> = ({
  projects = [],
  onBackToProjects,
  onSelectProject,
}) => {
  // Period Selection
  const [periodType, setPeriodType] = useState<PeriodType>('month');

  // Week selection
  const now = new Date();
  const currentWeekNumber = useMemo(() => {
    const start = new Date(now.getFullYear(), 0, 1);
    return Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  }, []);
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeekNumber);
  const [selectedWeekYear, setSelectedWeekYear] = useState<number>(now.getFullYear());

  // Month selection
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedMonthYear, setSelectedMonthYear] = useState<number>(now.getFullYear());

  // Quarter selection
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  const [selectedQuarter, setSelectedQuarter] = useState<number>(currentQuarter);
  const [selectedQuarterYear, setSelectedQuarterYear] = useState<number>(now.getFullYear());

  // Custom date range
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Project scope filter: 'all' or specific project ID
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // View presentation mode: 'visual' (Thống kê & Biểu đồ) or 'document' (Văn bản báo cáo hành chính)
  const [viewPresentation, setViewPresentation] = useState<'visual' | 'document'>('visual');

  // Document metadata for administrative report formatting
  const [issuingUpper, setIssuingUpper] = useState<string>('UBND XÃ LÃNH NGỌC');
  const [issuingUnit, setIssuingUnit] = useState<string>('PHÒNG KINH TẾ');
  const [reportNumber, setReportNumber] = useState<string>('      /BC-HĐBT');
  const [reportRecipient, setReportRecipient] = useState<string>('Ủy ban nhân dân xã Lãnh Ngọc; Thường trực HĐND - UBND xã');
  const [signerRole, setSignerRole] = useState<string>('KT. TRƯỞNG PHÒNG\nPHÓ TRƯỞNG PHÒNG');
  const [signerName, setSignerName] = useState<string>('Võ Tấn Lạt');
  const [docLocation, setDocLocation] = useState<string>('Lãnh Ngọc');
  const [showRedSeal, setShowRedSeal] = useState<boolean>(true);
  const [customRemarks, setCustomRemarks] = useState<string>('');

  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Compute calculated start and end dates based on period selection
  const periodRange = useMemo(() => {
    let start: Date;
    let end: Date;
    let label = '';
    let shortLabel = '';

    if (periodType === 'week') {
      // Find start of week (Monday)
      const daysOffset = (selectedWeek - 1) * 7;
      const targetDate = new Date(selectedWeekYear, 0, 1 + daysOffset);
      const day = targetDate.getDay();
      const diffToMonday = targetDate.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(targetDate.setDate(diffToMonday));
      start.setHours(0, 0, 0, 0);

      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const startFormatted = !isNaN(start.getTime()) ? formatDate(start.toISOString().split('T')[0]) : '';
      const endFormatted = !isNaN(end.getTime()) ? formatDate(end.toISOString().split('T')[0]) : '';
      label = `Tuần ${selectedWeek} năm ${selectedWeekYear} (từ ${startFormatted} đến ${endFormatted})`;
      shortLabel = `Tuần ${selectedWeek}/${selectedWeekYear}`;
    } else if (periodType === 'month') {
      start = new Date(selectedMonthYear, selectedMonth - 1, 1, 0, 0, 0, 0);
      end = new Date(selectedMonthYear, selectedMonth, 0, 23, 59, 59, 999);
      const startFormatted = !isNaN(start.getTime()) ? formatDate(start.toISOString().split('T')[0]) : '';
      const endFormatted = !isNaN(end.getTime()) ? formatDate(end.toISOString().split('T')[0]) : '';
      label = `Tháng ${selectedMonth} năm ${selectedMonthYear} (từ ${startFormatted} đến ${endFormatted})`;
      shortLabel = `Tháng ${selectedMonth}/${selectedMonthYear}`;
    } else if (periodType === 'quarter') {
      const startMonth = (selectedQuarter - 1) * 3;
      start = new Date(selectedQuarterYear, startMonth, 1, 0, 0, 0, 0);
      end = new Date(selectedQuarterYear, startMonth + 3, 0, 23, 59, 59, 999);
      const startFormatted = !isNaN(start.getTime()) ? formatDate(start.toISOString().split('T')[0]) : '';
      const endFormatted = !isNaN(end.getTime()) ? formatDate(end.toISOString().split('T')[0]) : '';
      label = `Quý ${selectedQuarter} năm ${selectedQuarterYear} (từ ${startFormatted} đến ${endFormatted})`;
      shortLabel = `Quý ${selectedQuarter}/${selectedQuarterYear}`;
    } else {
      const parsedStart = customStartDate ? new Date(customStartDate) : new Date();
      start = !isNaN(parsedStart.getTime()) ? parsedStart : new Date();
      start.setHours(0, 0, 0, 0);

      const parsedEnd = customEndDate ? new Date(customEndDate) : new Date();
      end = !isNaN(parsedEnd.getTime()) ? parsedEnd : new Date();
      end.setHours(23, 59, 59, 999);

      label = `Giai đoạn từ ngày ${formatDate(customStartDate)} đến ngày ${formatDate(customEndDate)}`;
      shortLabel = `${formatDate(customStartDate)} - ${formatDate(customEndDate)}`;
    }

    const safeStartStr = !isNaN(start.getTime()) ? start.toISOString().split('T')[0] : '';
    const safeEndStr = !isNaN(end.getTime()) ? end.toISOString().split('T')[0] : '';

    return {
      startDate: start,
      endDate: end,
      startStr: safeStartStr,
      endStr: safeEndStr,
      label,
      shortLabel,
    };
  }, [
    periodType,
    selectedWeek,
    selectedWeekYear,
    selectedMonth,
    selectedMonthYear,
    selectedQuarter,
    selectedQuarterYear,
    customStartDate,
    customEndDate,
  ]);

  // Target projects in scope
  const targetProjects = useMemo(() => {
    if (selectedProjectId === 'all') return projects;
    return projects.filter((p) => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  // Aggregated Report Metrics
  const reportData = useMemo(() => {
    let totalProjectsInScope = targetProjects.length;
    let completedProjects = 0;
    let inProgressProjects = 0;
    let pausedProjects = 0;

    let totalHouseholds = 0;
    let totalInventoryDone = 0;
    let totalPaidHouseholds = 0;
    let totalPartialPaidHouseholds = 0;
    let totalUnpaidHouseholds = 0;
    let totalRefusedHouseholds = 0;

    let totalHandedOverHouseholds = 0;
    let totalAreaRecovery = 0;
    let totalAreaHandedOver = 0;

    let totalApprovedBudget = 0;
    let totalPaidAmount = 0;

    // Resettlement metrics
    let totalResettlementEligible = 0;
    let totalResettlementAllocated = 0;
    let totalResettlementMonetary = 0;

    // Obstacles metrics
    let totalObstacles = 0;
    const obstacleCategoryCounts: Record<string, { label: string; count: number }> = {
      price_dispute: { label: 'Đơn giá bồi thường chưa thỏa đáng', count: 0 },
      origin_dispute: { label: 'Vướng mắc nguồn gốc / Thời điểm sử dụng đất', count: 0 },
      boundary_dispute: { label: 'Tranh chấp ranh giới / Thừa kế đất', count: 0 },
      resettlement_demand: { label: 'Yêu cầu thêm suất / Vị trí Tái định cư', count: 0 },
      area_mismatch: { label: 'Sai lệch diện tích kiểm đếm hiện trạng', count: 0 },
      compensation_policy: { label: 'Chính sách hỗ trợ chuyển đổi nghề / Ổn định đời sống', count: 0 },
      missing_papers: { label: 'Thiếu giấy tờ pháp lý / Chưa cấp GCN', count: 0 },
      complaint_lawsuit: { label: 'Có đơn khiếu nại, tố cáo đang thụ lý', count: 0 },
      court_lawsuit: { label: 'Khởi kiện Tòa án nhân dân', count: 0 },
      other: { label: 'Khác', count: 0 },
    };

    const obstacleHouseholdsList: Array<{
      projectName: string;
      projectCode: string;
      household: ProjectHousehold;
    }> = [];

    // Milestone stats across projects
    let noticeIssuedCount = 0;
    let inventoryCompletedCount = 0;
    let publicPlanCount = 0;
    let approvalDecisionCount = 0;
    let recoveryDecisionCount = 0;

    // Project breakdown table rows
    const projectBreakdowns = targetProjects.map((p) => {
      if (p.status === 'completed') completedProjects++;
      else if (p.status === 'paused' || p.status === 'halted') pausedProjects++;
      else if (p.status !== 'cancelled') inProgressProjects++;

      if (p.milestones?.noticeOfRecovery?.issued) noticeIssuedCount++;
      if (p.milestones?.surveyAndInventory?.completed) inventoryCompletedCount++;
      if (p.milestones?.publicPlan?.isPublic) publicPlanCount++;
      if (p.milestones?.approvalDecision?.approved) approvalDecisionCount++;
      if (p.milestones?.recoveryDecision?.issued) recoveryDecisionCount++;

      const households = p.households || [];
      const count = households.length > 0 ? households.length : p.totalHouseholds || 0;
      totalHouseholds += count;

      const pBudget = households.reduce((sum, h) => sum + (h.compensationAmount || 0), 0) || p.totalBudget || 0;
      totalApprovedBudget += pBudget;

      const pPaidAmt = households.reduce((sum, h) => sum + (h.paidAmount || 0), 0);
      totalPaidAmount += pPaidAmt;

      const pArea = p.totalArea || households.reduce((sum, h) => sum + (h.totalArea || 0), 0);
      totalAreaRecovery += pArea;

      let pPaidCount = 0;
      let pHandedOverCount = 0;
      let pObstacleCount = 0;
      let pAreaHandedOver = 0;

      households.forEach((h) => {
        if (h.inventoryDone) totalInventoryDone++;

        if (h.paymentStatus === 'paid') {
          pPaidCount++;
          totalPaidHouseholds++;
        } else if (h.paymentStatus === 'partially_paid' || h.paymentStatus === 'partial') {
          totalPartialPaidHouseholds++;
        } else if (h.paymentStatus === 'refused') {
          totalRefusedHouseholds++;
        } else {
          totalUnpaidHouseholds++;
        }

        if (h.handoverStatus === 'handed_over') {
          pHandedOverCount++;
          totalHandedOverHouseholds++;
          const a = h.handoverArea || h.totalArea || 0;
          pAreaHandedOver += a;
          totalAreaHandedOver += a;
        }

        if (h.resettlementStatus === 'eligible') totalResettlementEligible++;
        if (h.resettlementStatus === 'allocated' || h.resettlementStatus === 'handed_over') totalResettlementAllocated++;
        if (h.resettlementStatus === 'monetary') totalResettlementMonetary++;

        if (h.hasObstacle || h.paymentStatus === 'refused') {
          pObstacleCount++;
          totalObstacles++;
          obstacleHouseholdsList.push({
            projectName: p.name,
            projectCode: p.code,
            household: h,
          });

          const cat = h.obstacleCategory || 'other';
          if (obstacleCategoryCounts[cat]) {
            obstacleCategoryCounts[cat].count++;
          } else {
            obstacleCategoryCounts.other.count++;
          }
        }
      });

      return {
        id: p.id,
        code: p.code,
        name: p.name,
        location: p.location,
        status: p.status,
        investor: p.investor,
        totalHouseholds: count,
        paidHouseholds: pPaidCount,
        handedOverHouseholds: pHandedOverCount,
        obstacleHouseholds: pObstacleCount,
        budget: pBudget,
        paidAmount: pPaidAmt,
        disbursementRate: pBudget > 0 ? Math.round((pPaidAmt / pBudget) * 100) : 0,
        householdPaidRate: count > 0 ? Math.round((pPaidCount / count) * 100) : 0,
        totalArea: pArea,
        areaHandedOver: pAreaHandedOver,
      };
    });

    const overallDisbursementRate = totalApprovedBudget > 0 ? Math.round((totalPaidAmount / totalApprovedBudget) * 100) : 0;
    const overallHouseholdPaidRate = totalHouseholds > 0 ? Math.round((totalPaidHouseholds / totalHouseholds) * 100) : 0;
    const overallHandoverRate = totalHouseholds > 0 ? Math.round((totalHandedOverHouseholds / totalHouseholds) * 100) : 0;
    const overallAreaHandoverRate = totalAreaRecovery > 0 ? Math.round((totalAreaHandedOver / totalAreaRecovery) * 100) : 0;

    return {
      totalProjectsInScope,
      completedProjects,
      inProgressProjects,
      pausedProjects,
      totalHouseholds,
      totalInventoryDone,
      totalPaidHouseholds,
      totalPartialPaidHouseholds,
      totalUnpaidHouseholds,
      totalRefusedHouseholds,
      totalHandedOverHouseholds,
      totalAreaRecovery,
      totalAreaHandedOver,
      totalApprovedBudget,
      totalPaidAmount,
      totalResettlementEligible,
      totalResettlementAllocated,
      totalResettlementMonetary,
      totalObstacles,
      obstacleCategoryCounts,
      obstacleHouseholdsList,
      noticeIssuedCount,
      inventoryCompletedCount,
      publicPlanCount,
      approvalDecisionCount,
      recoveryDecisionCount,
      projectBreakdowns,
      overallDisbursementRate,
      overallHouseholdPaidRate,
      overallHandoverRate,
      overallAreaHandoverRate,
    };
  }, [targetProjects]);

  // Export to Excel handler
  const handleExportExcel = () => {
    const filename = `Bao_Cao_Tong_Hop_GPMB_${periodRange.shortLabel.replace(/[\/\s-]/g, '_')}`;

    // Sheet 1: Tổng hợp theo dự án
    const projectExportData = reportData.projectBreakdowns.map((p, idx) => ({
      STT: idx + 1,
      'Mã dự án': p.code,
      'Tên dự án': p.name,
      'Địa bàn': p.location,
      'Chủ đầu tư': p.investor || '',
      'Tổng số hộ': p.totalHouseholds,
      'Số hộ đã nhận tiền': p.paidHouseholds,
      'Tỷ lệ hộ nhận tiền (%)': p.householdPaidRate,
      'Số hộ đã bàn giao MB': p.handedOverHouseholds,
      'Kinh phí bồi thường được duyệt (VNĐ)': p.budget,
      'Kinh phí đã chi trả (VNĐ)': p.paidAmount,
      'Tỷ lệ giải ngân (%)': p.disbursementRate,
      'Tổng diện tích thu hồi (m2)': p.totalArea,
      'Diện tích đã bàn giao (m2)': p.areaHandedOver,
      'Số hộ vướng mắc': p.obstacleHouseholds,
    }));

    // Sheet 2: Danh sách hộ vướng mắc
    const obstacleExportData = reportData.obstacleHouseholdsList.map((item, idx) => ({
      STT: idx + 1,
      'Mã dự án': item.projectCode,
      'Tên dự án': item.projectName,
      'Chủ hộ': item.household.ownerName,
      CCCD: item.household.cccd || '',
      'Thôn/Địa chỉ': item.household.address,
      'Tờ BĐ': item.household.mapSheet,
      'Số thửa': item.household.parcel,
      'Loại đất': item.household.landType,
      'Diện tích thu hồi (m2)': item.household.totalArea,
      'Kinh phí duyệt (VNĐ)': item.household.compensationAmount,
      'Trạng thái chi trả': item.household.paymentStatus,
      'Nhóm vướng mắc': item.household.obstacleCategory || '',
      'Nội dung vướng mắc, kiến nghị': item.household.obstacleDetail || '',
      'Số lần đã vận động': item.household.campaignCount || 0,
      'Biện pháp xử lý': item.household.actionPlan || '',
    }));

    exportToExcel(projectExportData, filename, 'TongHopDuAn');
  };

  // Copy document text handler
  const handleCopyDoc = () => {
    if (!printAreaRef.current) return;
    const text = printAreaRef.current.innerText;
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  const currentDateFormatted = useMemo(() => {
    const d = new Date();
    return `ngày ${String(d.getDate()).padStart(2, '0')} tháng ${String(d.getMonth() + 1).padStart(2, '0')} năm ${d.getFullYear()}`;
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              Báo cáo Tổng hợp Công tác Bồi thường & GPMB
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp kết quả đạt được theo Tuần, Tháng, Quý hoặc khoảng thời gian tự chọn chuẩn thể thức hành chính
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onBackToProjects && (
            <button
              onClick={onBackToProjects}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Landmark className="w-4 h-4 text-slate-500" />
              <span>Quay lại Danh sách Dự án</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Xuất Excel tổng hợp</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>In / Xuất PDF</span>
          </button>
        </div>
      </div>

      {/* Main Filter & Period Selector Menu */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-4">
        {/* Period Mode Selector Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setPeriodType('week')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                periodType === 'week'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Báo cáo Tuần</span>
            </button>

            <button
              onClick={() => setPeriodType('month')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                periodType === 'month'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Báo cáo Tháng</span>
            </button>

            <button
              onClick={() => setPeriodType('quarter')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                periodType === 'quarter'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Báo cáo Quý</span>
            </button>

            <button
              onClick={() => setPeriodType('custom')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                periodType === 'custom'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Thời gian Tự chọn</span>
            </button>
          </div>

          {/* Presentation Switch: Visual Dashboard vs Formal Document */}
          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 p-1 rounded-xl">
            <button
              onClick={() => setViewPresentation('visual')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewPresentation === 'visual'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-700 hover:bg-indigo-100/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Bảng số liệu & Biểu đồ</span>
            </button>

            <button
              onClick={() => setViewPresentation('document')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewPresentation === 'document'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-700 hover:bg-indigo-100/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Văn bản Báo cáo Hành chính</span>
            </button>
          </div>
        </div>

        {/* Dynamic Period Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          {/* Week options */}
          {periodType === 'week' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Chọn Tuần trong năm
                </label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 outline-hidden font-medium"
                >
                  {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>
                      Tuần {w} {w === currentWeekNumber ? '(Tuần hiện tại)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Năm
                </label>
                <select
                  value={selectedWeekYear}
                  onChange={(e) => setSelectedWeekYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 outline-hidden font-medium"
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      Năm {y}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Month options */}
          {periodType === 'month' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Chọn Tháng
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 outline-hidden font-medium"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      Tháng {m} {m === now.getMonth() + 1 ? '(Tháng này)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Năm
                </label>
                <select
                  value={selectedMonthYear}
                  onChange={(e) => setSelectedMonthYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 outline-hidden font-medium"
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      Năm {y}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Quarter options */}
          {periodType === 'quarter' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Chọn Quý
                </label>
                <select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 outline-hidden font-medium"
                >
                  <option value={1}>Quý I (Tháng 1 - Tháng 3)</option>
                  <option value={2}>Quý II (Tháng 4 - Tháng 6)</option>
                  <option value={3}>Quý III (Tháng 7 - Tháng 9)</option>
                  <option value={4}>Quý IV (Tháng 10 - Tháng 12)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Năm
                </label>
                <select
                  value={selectedQuarterYear}
                  onChange={(e) => setSelectedQuarterYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 outline-hidden font-medium"
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      Năm {y}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Custom Date Range */}
          {periodType === 'custom' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Từ ngày
                </label>
                <VietnameseDateInput
                  value={customStartDate}
                  onChange={(val) => setCustomStartDate(val)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Đến ngày
                </label>
                <VietnameseDateInput
                  value={customEndDate}
                  onChange={(val) => setCustomEndDate(val)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 outline-hidden font-medium"
                />
              </div>
            </>
          )}

          {/* Project Scope Filter */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Phạm vi Báo cáo Dự án
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 outline-hidden font-medium"
            >
              <option value="all">⭐ Tất cả {projects.length} dự án GPMB trên địa bàn</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name} ({p.location})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Active Filter Badge */}
        <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-indigo-900 font-medium">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>
              Chu kỳ báo cáo:{' '}
              <strong className="font-bold text-indigo-700">{periodRange.label}</strong>
            </span>
          </div>
          <div className="text-slate-500 text-[11px]">
            Đang tổng hợp cho <strong className="text-slate-800">{targetProjects.length}</strong> dự án bồi thường, GPMB
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: VISUAL KPI DASHBOARD & PROGRESS BREAKDOWN */}
      {/* ========================================================================= */}
      {viewPresentation === 'visual' && (
        <div className="space-y-6">
          {/* Key Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Dự án triển khai */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Dự án trong kỳ</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {reportData.totalProjectsInScope}{' '}
                <span className="text-xs font-medium text-slate-500">dự án</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                <span className="text-indigo-600 font-semibold">{reportData.inProgressProjects} đang thực hiện</span>
                <span>•</span>
                <span className="text-emerald-600 font-semibold">{reportData.completedProjects} hoàn thành</span>
              </div>
            </div>

            {/* Card 2: Hộ nhận tiền bồi thường */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Hộ dân đã nhận tiền</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {reportData.totalPaidHouseholds}{' '}
                <span className="text-xs font-medium text-slate-500">/ {reportData.totalHouseholds} hộ</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold mt-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Đạt tỷ lệ {reportData.overallHouseholdPaidRate}%</span>
              </div>
            </div>

            {/* Card 3: Giải ngân kinh phí */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Kinh phí đã chi trả</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {(reportData.totalPaidAmount / 1000000000).toFixed(2)}{' '}
                <span className="text-xs font-medium text-slate-500">tỷ VNĐ</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Duyệt: {(reportData.totalApprovedBudget / 1000000000).toFixed(2)} tỷ ({reportData.overallDisbursementRate}%)
              </div>
            </div>

            {/* Card 4: Mặt bằng & Vướng mắc */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Bàn giao MB & Vướng mắc</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {reportData.totalHandedOverHouseholds}{' '}
                <span className="text-xs font-medium text-slate-500">hộ đã giao MB</span>
              </div>
              <div className="text-[11px] text-amber-700 mt-1 font-semibold">
                {reportData.totalObstacles} hộ còn vướng mắc ({reportData.totalRefusedHouseholds} từ chối)
              </div>
            </div>
          </div>

          {/* Legal Milestones Overview Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Tổng hợp Tiến độ 6 Mốc Pháp lý GPMB (Toàn chu kỳ)
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {targetProjects.length} dự án trong phạm vi
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
              {/* Milestone 1 */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-[11px] font-bold text-slate-600 uppercase">1. Thông báo thu hồi</div>
                <div className="text-lg font-bold text-indigo-600 mt-1">
                  {reportData.noticeIssuedCount} / {targetProjects.length}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Dự án đã ban hành</div>
              </div>

              {/* Milestone 2 */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                <div className="text-[11px] font-bold text-blue-900 uppercase">2. Kiểm đếm hiện trạng</div>
                <div className="text-lg font-bold text-blue-700 mt-1">
                  {reportData.inventoryCompletedCount} / {targetProjects.length}
                </div>
                <div className="text-[10px] text-blue-600 mt-0.5">
                  {reportData.totalInventoryDone}/{reportData.totalHouseholds} hộ đã đếm
                </div>
              </div>

              {/* Milestone 3 */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                <div className="text-[11px] font-bold text-amber-900 uppercase">3. Niêm yết công khai PA</div>
                <div className="text-lg font-bold text-amber-700 mt-1">
                  {reportData.publicPlanCount} / {targetProjects.length}
                </div>
                <div className="text-[10px] text-amber-600 mt-0.5">Dự án đã niêm yết</div>
              </div>

              {/* Milestone 4 */}
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
                <div className="text-[11px] font-bold text-purple-900 uppercase">4. QĐ Phê duyệt PA</div>
                <div className="text-lg font-bold text-purple-700 mt-1">
                  {reportData.approvalDecisionCount} / {targetProjects.length}
                </div>
                <div className="text-[10px] text-purple-600 mt-0.5">Dự án đã duyệt PA</div>
              </div>

              {/* Milestone 5 */}
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                <div className="text-[11px] font-bold text-indigo-900 uppercase">5. Chi trả tiền bồi thường</div>
                <div className="text-lg font-bold text-indigo-700 mt-1">
                  {reportData.overallHouseholdPaidRate}%
                </div>
                <div className="text-[10px] text-indigo-600 mt-0.5">
                  {reportData.totalPaidHouseholds}/{reportData.totalHouseholds} hộ nhận đủ
                </div>
              </div>

              {/* Milestone 6 */}
              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <div className="text-[11px] font-bold text-emerald-900 uppercase">6. Bàn giao mặt bằng</div>
                <div className="text-lg font-bold text-emerald-700 mt-1">
                  {reportData.overallHandoverRate}%
                </div>
                <div className="text-[10px] text-emerald-600 mt-0.5">
                  {reportData.totalHandedOverHouseholds}/{reportData.totalHouseholds} hộ giao đất
                </div>
              </div>
            </div>
          </div>

          {/* Project Progress Breakdown Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-indigo-600" />
                  Bảng Tổng hợp Chi tiết Kết quả GPMB theo từng Dự án
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Số liệu cập nhật theo chu kỳ {periodRange.shortLabel}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5">STT</th>
                    <th className="py-3 px-3.5">Mã & Tên Dự án</th>
                    <th className="py-3 px-3.5">Địa bàn</th>
                    <th className="py-3 px-3.5 text-center">Tổng hộ</th>
                    <th className="py-3 px-3.5 text-center">Đã nhận tiền</th>
                    <th className="py-3 px-3.5 text-center">Đã giao MB</th>
                    <th className="py-3 px-3.5 text-right">Kinh phí duyệt (VNĐ)</th>
                    <th className="py-3 px-3.5 text-right">Đã chi trả (VNĐ)</th>
                    <th className="py-3 px-3.5 text-center">Tỷ lệ GN</th>
                    <th className="py-3 px-3.5 text-center">Vướng mắc</th>
                    <th className="py-3 px-3.5 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.projectBreakdowns.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 font-medium text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {p.code} {p.investor ? `• ${p.investor}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-700">{p.location}</td>
                      <td className="py-3 px-3.5 text-center font-bold text-slate-900">{p.totalHouseholds}</td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="font-bold text-emerald-700">{p.paidHouseholds}</span>{' '}
                        <span className="text-[10px] text-slate-400">({p.householdPaidRate}%)</span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="font-bold text-blue-700">{p.handedOverHouseholds}</span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-medium text-slate-800">
                        {Number(p.budget).toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-3.5 text-right font-bold text-emerald-700">
                        {Number(p.paidAmount).toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.disbursementRate >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.disbursementRate >= 50
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.disbursementRate}%
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {p.obstacleHouseholds > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                            {p.obstacleHouseholds} hộ
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {onSelectProject && (
                          <button
                            onClick={() => {
                              const found = projects.find((item) => item.id === p.id);
                              if (found) onSelectProject(found);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                          >
                            Xem chi tiết
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Total Row */}
                <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 text-xs">
                  <tr>
                    <td colSpan={3} className="py-3 px-3.5 uppercase tracking-wider text-slate-800">
                      TỔNG CỘNG ({reportData.totalProjectsInScope} Dự án)
                    </td>
                    <td className="py-3 px-3.5 text-center">{reportData.totalHouseholds}</td>
                    <td className="py-3 px-3.5 text-center text-emerald-800">
                      {reportData.totalPaidHouseholds} ({reportData.overallHouseholdPaidRate}%)
                    </td>
                    <td className="py-3 px-3.5 text-center text-blue-800">
                      {reportData.totalHandedOverHouseholds} ({reportData.overallHandoverRate}%)
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      {Number(reportData.totalApprovedBudget).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3 px-3.5 text-right text-emerald-800">
                      {Number(reportData.totalPaidAmount).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900">
                        {reportData.overallDisbursementRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-center text-amber-800">
                      {reportData.totalObstacles} hộ
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Obstacles & Campaign Breakdown Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Obstacles Categorization */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Phân loại Khó khăn & Vướng mắc
              </h3>

              <div className="space-y-2.5 text-xs">
                {(Object.entries(reportData.obstacleCategoryCounts) as [string, { label: string; count: number }][])
                  .filter(([_, data]) => data.count > 0)
                  .map(([key, data]) => (
                    <div key={key} className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between gap-2">
                      <span className="text-slate-700 font-medium truncate">{data.label}</span>
                      <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 shrink-0">
                        {data.count} hộ
                      </span>
                    </div>
                  ))}

                {reportData.totalObstacles === 0 && (
                  <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">Không có vướng mắc tồn đọng</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Tất cả các hộ dân đều đồng thuận tiến độ</p>
                  </div>
                )}
              </div>
            </div>

            {/* Column 2 & 3: Detailed Obstacle Households List */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Danh sách Hộ dân Chưa đồng thuận & Cần Vận động tiếp
                </h3>
                <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full">
                  {reportData.obstacleHouseholdsList.length} hộ trọng điểm
                </span>
              </div>

              {reportData.obstacleHouseholdsList.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100 text-slate-500">
                  <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <div className="font-bold text-slate-700">Toàn bộ hộ dân đã nhận tiền hoặc đồng thuận phương án</div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
                  {reportData.obstacleHouseholdsList.map((item, idx) => (
                    <div key={idx} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                          <span>{item.household.ownerName}</span>
                          <span className="font-normal text-slate-500 font-mono text-[11px]">
                            ({item.household.address} • Thửa {item.household.parcel} - Tờ {item.household.mapSheet})
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {item.projectCode}
                        </span>
                      </div>

                      <div className="text-xs text-rose-800 bg-rose-50/70 p-2 rounded-lg border border-rose-100/60">
                        <strong>Nội dung vướng mắc:</strong> {item.household.obstacleDetail || 'Chưa nhận tiền bồi thường'}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <span>
                          Kinh phí:{' '}
                          <strong className="text-slate-800">
                            {Number(item.household.compensationAmount || 0).toLocaleString('vi-VN')} đ
                          </strong>
                        </span>
                        <span>
                          Đã vận động:{' '}
                          <strong className="text-indigo-600">{item.household.campaignCount || 0} lần</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: FORMAL ADMINISTRATIVE REPORT (NGHỊ ĐỊNH 30/2020/NĐ-CP) */}
      {/* ========================================================================= */}
      {viewPresentation === 'document' && (
        <div className="space-y-6">
          {/* Custom Edit Controls for Document Header */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-indigo-600" />
              Thiết lập Thông tin Thể thức Văn bản Hành chính
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Cơ quan cấp trên
                </label>
                <input
                  type="text"
                  value={issuingUpper}
                  onChange={(e) => setIssuingUpper(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Cơ quan / Đơn vị ban hành
                </label>
                <input
                  type="text"
                  value={issuingUnit}
                  onChange={(e) => setIssuingUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Số ký hiệu văn bản
                </label>
                <input
                  type="text"
                  value={reportNumber}
                  onChange={(e) => setReportNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Địa danh hành chính
                </label>
                <input
                  type="text"
                  value={docLocation}
                  onChange={(e) => setDocLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Nơi nhận báo cáo (Kính gửi)
                </label>
                <input
                  type="text"
                  value={reportRecipient}
                  onChange={(e) => setReportRecipient(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-slate-500">
                    Chức vụ người ký (xuống dòng được)
                  </label>
                  <div className="flex items-center gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        setSignerRole('KT. TRƯỞNG PHÒNG\nPHÓ TRƯỞNG PHÒNG');
                        setSignerName('Võ Tấn Lạt');
                      }}
                      className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                    >
                      Võ Tấn Lạt
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSignerRole('TRƯỞNG PHÒNG');
                        setSignerName('Mai Huy');
                      }}
                      className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                    >
                      Mai Huy
                    </button>
                  </div>
                </div>
                <textarea
                  value={signerRole}
                  onChange={(e) => setSignerRole(e.target.value)}
                  rows={2}
                  placeholder="KT. TRƯỞNG PHÒNG&#10;PHÓ TRƯỞNG PHÒNG"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold leading-tight resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Họ và tên người ký
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Võ Tấn Lạt"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Bổ sung Ghi chú / Nhận xét / Đề xuất của đơn vị (tùy chọn)
              </label>
              <textarea
                value={customRemarks}
                onChange={(e) => setCustomRemarks(e.target.value)}
                placeholder="Nhập thêm các đánh giá, kết luận chỉ đạo hoặc kiến nghị bổ sung vào cuối văn bản..."
                rows={2}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRedSeal}
                  onChange={(e) => setShowRedSeal(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Hiển thị xác nhận (Đã ký)</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyDoc}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSuccess ? 'Đã sao chép!' : 'Sao chép văn bản'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Printable Formal Document Paper Sheet */}
          <div className="bg-slate-100 p-4 md:p-8 rounded-2xl flex justify-center overflow-x-auto">
            <div
              ref={printAreaRef}
              className="bg-white p-8 md:p-12 rounded-lg shadow-md border border-slate-300 max-w-[850px] w-full text-slate-900 font-serif leading-relaxed text-[13.5px] print:shadow-none print:border-none print:p-0 print:m-0"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              {/* Header Box (Quốc hiệu & Tên cơ quan) */}
              <div className="grid grid-cols-2 gap-4 pb-4">
                <div className="text-center space-y-1">
                  <div className="font-bold text-[12px] uppercase">{issuingUpper}</div>
                  <div className="font-bold text-[12.5px] uppercase">{issuingUnit}</div>
                  <div className="w-24 h-[1px] bg-slate-900 mx-auto my-1"></div>
                  <div className="text-[12px] font-normal font-sans">
                    Số: {reportNumber}
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <div className="font-bold text-[12.5px] uppercase">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                  <div className="font-bold text-[13px] underline underline-offset-4 decoration-1">
                    Độc lập - Tự do - Hạnh phúc
                  </div>
                  <div className="text-[12px] italic pt-1">
                    {docLocation}, {currentDateFormatted}
                  </div>
                </div>
              </div>

              {/* Title Section */}
              <div className="text-center py-6 space-y-1.5">
                <h2 className="text-[17px] font-bold uppercase tracking-wide">
                  BÁO CÁO
                </h2>
                <h3 className="text-[14.5px] font-bold uppercase max-w-xl mx-auto">
                  KẾT QUẢ CÔNG TÁC BỒI THƯỜNG, HỖ TRỢ, TÁI ĐỊNH CƯ VÀ GIẢI PHÓNG MẶT BẰNG
                </h3>
                <div className="text-[13px] font-semibold italic text-slate-800">
                  ({periodRange.label})
                </div>
              </div>

              {/* Recipient */}
              <div className="pb-4 text-center">
                <span className="font-bold italic">Kính gửi: </span>
                <span className="font-semibold">{reportRecipient}</span>
              </div>

              {/* Document Body */}
              <div className="space-y-4 text-justify">
                <p className="indent-8">
                  Căn cứ Luật Đất đai số 31/2024/QH15 và các Nghị định quy định chi tiết thi hành; thực hiện nhiệm vụ được giao về công tác giải phóng mặt bằng các công trình, dự án đầu tư phát triển kinh tế - xã hội trên địa bàn; {issuingUnit} báo cáo kết quả công tác bồi thường, hỗ trợ, tái định cư và giải phóng mặt bằng trong <strong>{periodRange.shortLabel}</strong> như sau:
                </p>

                {/* Section I */}
                <div>
                  <h4 className="font-bold uppercase text-[14px] mb-2">
                    I. TÌNH HÌNH TRIỂN KHAI VÀ KẾT QUẢ ĐẠT ĐƯỢC
                  </h4>

                  <div className="space-y-2 indent-8">
                    <p>
                      <strong>1. Về quy mô và số lượng dự án triển khai:</strong> Trong kỳ, toàn địa bàn thực hiện công tác bồi thường, GPMB đối với <strong>{reportData.totalProjectsInScope}</strong> dự án (trong đó: <strong>{reportData.inProgressProjects}</strong> dự án đang tích cực triển khai, <strong>{reportData.completedProjects}</strong> dự án đã hoàn thành công tác bàn giao mặt bằng). Tổng số hộ gia đình, cá nhân và tổ chức bị ảnh hưởng là <strong>{reportData.totalHouseholds}</strong> hộ với tổng diện tích đất thu hồi dự kiến <strong>{Number(reportData.totalAreaRecovery).toLocaleString('vi-VN')} m²</strong>.
                    </p>

                    <p>
                      <strong>2. Kết quả thực hiện các mốc pháp lý và đo đạc kiểm đếm:</strong> Đã hoàn thành ban hành Thông báo thu hồi đất cho <strong>{reportData.noticeIssuedCount}/{reportData.totalProjectsInScope}</strong> dự án; thực hiện kiểm đếm hiện trạng cây cối, hoa màu, vật kiến trúc cho <strong>{reportData.totalInventoryDone}/{reportData.totalHouseholds}</strong> hộ dân (đạt tỷ lệ <strong>{reportData.totalHouseholds > 0 ? Math.round((reportData.totalInventoryDone / reportData.totalHouseholds) * 100) : 0}%</strong>); hoàn thành lập, niêm yết công khai dự thảo phương án bồi thường tại trụ sở UBND và nhà văn hóa thôn đối với <strong>{reportData.publicPlanCount}</strong> dự án; phê duyệt phương án bồi thường, hỗ trợ cho <strong>{reportData.approvalDecisionCount}</strong> dự án với tổng kinh phí được phê duyệt là <strong>{Number(reportData.totalApprovedBudget).toLocaleString('vi-VN')} đồng</strong>.
                    </p>

                    <p>
                      <strong>3. Kết quả chi trả tiền bồi thường, hỗ trợ:</strong> Hội đồng bồi thường đã phối hợp với Kho bạc Nhà nước và Chủ đầu tư tổ chức chi trả kinh phí bồi thường cho <strong>{reportData.totalPaidHouseholds}</strong> hộ (đạt tỷ lệ <strong>{reportData.overallHouseholdPaidRate}%</strong> tổng số hộ). Tổng kinh phí đã giải ngân, chi trả trực tiếp cho người dân đạt <strong>{Number(reportData.totalPaidAmount).toLocaleString('vi-VN')} đồng</strong> (đạt <strong>{reportData.overallDisbursementRate}%</strong> kế hoạch vốn được phê duyệt).
                    </p>

                    <p>
                      <strong>4. Kết quả bàn giao mặt bằng và bố trí tái định cư:</strong> Đã vận động bàn giao mặt bằng sạch cho đơn vị thi công được <strong>{reportData.totalHandedOverHouseholds}</strong> hộ với diện tích <strong>{Number(reportData.totalAreaHandedOver).toLocaleString('vi-VN')} m²</strong> (đạt tỷ lệ <strong>{reportData.overallAreaHandoverRate}%</strong>). Về công tác tái định cư: Có <strong>{reportData.totalResettlementEligible}</strong> hộ đủ điều kiện bố trí TĐC, trong đó đã bàn giao đất TĐC tại thực địa cho <strong>{reportData.totalResettlementAllocated}</strong> hộ, <strong>{reportData.totalResettlementMonetary}</strong> hộ nhận tiền tự lo chỗ ở.
                    </p>
                  </div>
                </div>

                {/* Table inside formal report */}
                <div className="py-2">
                  <div className="text-center font-bold text-[12.5px] uppercase pb-1">
                    Bảng 1: Tổng hợp tiến độ triển khai các dự án GPMB
                  </div>
                  <table className="w-full border-collapse border border-slate-900 text-[11.5px] text-center">
                    <thead>
                      <tr className="bg-slate-100 font-bold">
                        <th className="border border-slate-900 py-1.5 px-2">STT</th>
                        <th className="border border-slate-900 py-1.5 px-2 text-left">Tên công trình, dự án</th>
                        <th className="border border-slate-900 py-1.5 px-2">Địa bàn</th>
                        <th className="border border-slate-900 py-1.5 px-2">Tổng số hộ</th>
                        <th className="border border-slate-900 py-1.5 px-2">Đã nhận tiền</th>
                        <th className="border border-slate-900 py-1.5 px-2 text-right">Kinh phí duyệt (đ)</th>
                        <th className="border border-slate-900 py-1.5 px-2 text-right">Đã chi trả (đ)</th>
                        <th className="border border-slate-900 py-1.5 px-2">Tỷ lệ GN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.projectBreakdowns.map((p, idx) => (
                        <tr key={p.id}>
                          <td className="border border-slate-900 py-1 px-1.5">{idx + 1}</td>
                          <td className="border border-slate-900 py-1 px-2 text-left font-semibold">{p.name}</td>
                          <td className="border border-slate-900 py-1 px-1.5">{p.location}</td>
                          <td className="border border-slate-900 py-1 px-1.5">{p.totalHouseholds}</td>
                          <td className="border border-slate-900 py-1 px-1.5">
                            {p.paidHouseholds} ({p.householdPaidRate}%)
                          </td>
                          <td className="border border-slate-900 py-1 px-2 text-right">
                            {Number(p.budget).toLocaleString('vi-VN')}
                          </td>
                          <td className="border border-slate-900 py-1 px-2 text-right font-semibold">
                            {Number(p.paidAmount).toLocaleString('vi-VN')}
                          </td>
                          <td className="border border-slate-900 py-1 px-1.5">{p.disbursementRate}%</td>
                        </tr>
                      ))}
                      <tr className="font-bold bg-slate-100">
                        <td colSpan={3} className="border border-slate-900 py-1.5 px-2 uppercase">
                          Tổng cộng
                        </td>
                        <td className="border border-slate-900 py-1.5 px-1.5">{reportData.totalHouseholds}</td>
                        <td className="border border-slate-900 py-1.5 px-1.5">{reportData.totalPaidHouseholds}</td>
                        <td className="border border-slate-900 py-1.5 px-2 text-right">
                          {Number(reportData.totalApprovedBudget).toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-slate-900 py-1.5 px-2 text-right">
                          {Number(reportData.totalPaidAmount).toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-slate-900 py-1.5 px-1.5">{reportData.overallDisbursementRate}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section II */}
                <div>
                  <h4 className="font-bold uppercase text-[14px] mb-2">
                    II. TỒN TẠI, HẠN CHẾ, KHÓ KHĂN VƯỚNG MẮC VÀ NGUYÊN NHÂN
                  </h4>

                  <div className="space-y-2 indent-8">
                    <p>
                      Bên cạnh các kết quả đạt được, công tác GPMB trong kỳ vẫn còn một số khó khăn, vướng mắc: Hiện còn <strong>{reportData.totalObstacles}</strong> hộ gia đình chưa đồng thuận nhận tiền hoặc chưa bàn giao mặt bằng (trong đó có <strong>{reportData.totalRefusedHouseholds}</strong> hộ có biên bản từ chối nhận tiền).
                    </p>

                    <p>
                      <strong>Nguyên nhân chủ yếu:</strong> (1) Một số hộ dân có ý kiến về đơn giá bồi thường đất nông nghiệp và tài sản gắn liền với đất còn thấp so với thị trường; (2) Giấy tờ nguồn gốc đất chưa rõ ràng, đất có tranh chấp ranh giới giữa các hộ liền kề hoặc phân chia thừa kế chưa hoàn tất; (3) Hộ dân có nhu cầu bố trí thêm suất đất tái định cư nhưng không đủ điều kiện theo quy định của Luật Đất đai.
                    </p>
                  </div>
                </div>

                {/* Section III */}
                <div>
                  <h4 className="font-bold uppercase text-[14px] mb-2">
                    III. NHIỆM VỤ TRỌNG TÂM VÀ GIẢI PHÁP TRONG THỜI GIAN TỚI
                  </h4>

                  <div className="space-y-2 indent-8">
                    <p>
                      <strong>1.</strong> Tiếp tục phối hợp với Ủy ban Mặt trận Tổ quốc và các đoàn thể chính trị - xã hội tổ chức các buổi đối thoại trực tiếp, kiên trì tuyên truyền, vận động các hộ gia đình còn vướng mắc đồng thuận chấp hành chính sách bồi thường GPMB.
                    </p>
                    <p>
                      <strong>2.</strong> Phối hợp với Phòng Tài nguyên và Môi trường, Văn phòng Đăng ký đất đai nhanh chóng thẩm định, xác minh nguồn gốc đất và hoàn thiện hồ sơ pháp lý đối với các thửa đất có biến động.
                    </p>
                    <p>
                      <strong>3.</strong> Đẩy nhanh tiến độ thi công hạ tầng các khu tái định cư để sớm giao đất thực địa cho các hộ đủ điều kiện, bàn giao 100% mặt bằng sạch cho chủ đầu tư thi công đúng tiến độ.
                    </p>
                    {customRemarks && (
                      <p className="text-slate-800 italic">
                        <strong>Ghi chú bổ sung:</strong> {customRemarks}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Signature Box */}
              <div className="pt-8 grid grid-cols-2 gap-4 text-[13px]">
                {/* Recipients */}
                <div className="space-y-1">
                  <div className="font-bold italic underline">Nơi nhận:</div>
                  <div className="text-[11.5px] leading-tight space-y-0.5">
                    <div>- Như trên;</div>
                    <div>- TT Đảng ủy, HĐND xã (b/c);</div>
                    <div>- Chủ tịch, các PCT UBND xã;</div>
                    <div>- Phòng Kinh tế;</div>
                    <div>- Chủ đầu tư các dự án;</div>
                    <div>- Lưu: VT, HĐBT.</div>
                  </div>
                </div>

                {/* Signer */}
                <div className="text-center relative space-y-1">
                  <div className="font-bold uppercase whitespace-pre-line">{signerRole}</div>
                  <div className="h-16 flex items-center justify-center relative">
                    {showRedSeal ? (
                      <div className="text-slate-600 italic font-serif text-[13.5px] select-none">
                        (Đã ký)
                      </div>
                    ) : (
                      <div className="h-4" />
                    )}
                  </div>
                  <div className="font-bold text-[14px]">{signerName}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
