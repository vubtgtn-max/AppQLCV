import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Filter,
  Printer,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Hammer,
  Scale,
  FileText,
  MapPin,
  Eye,
  DollarSign,
  TrendingUp,
  Search,
  Copy,
  Check,
  Building2,
  PieChart,
  BarChart3,
  CalendarRange,
} from 'lucide-react';
import { LandViolationCase, ViolationType, ViolationStatus } from '../../types';
import { exportToExcel } from '../../utils/export';
import { VietnameseDateInput } from '../common/VietnameseDateInput';

interface ViolationReportsViewProps {
  violations: LandViolationCase[];
  onSelectViolation?: (violation: LandViolationCase) => void;
  onProcessViolation?: (violation: LandViolationCase) => void;
  onPrintViolation?: (violation: LandViolationCase) => void;
}

type PeriodMode =
  | 'week'
  | 'month'
  | 'quarter'
  | 'half_year'
  | 'nine_months'
  | 'year'
  | 'custom';

export const ViolationReportsView: React.FC<ViolationReportsViewProps> = ({
  violations = [],
  onSelectViolation,
  onProcessViolation,
  onPrintViolation,
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Period State
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(Math.floor((currentMonth - 1) / 3) + 1);
  const [selectedHalfYear, setSelectedHalfYear] = useState<1 | 2>(currentMonth <= 6 ? 1 : 2);
  const [selectedWeekType, setSelectedWeekType] = useState<'this_week' | 'last_week'>('this_week');

  // Custom date range
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Secondary Filters
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [tableSearch, setTableSearch] = useState('');

  // Presentation View: 'visual' (thống kê trực quan) | 'document' (bản in hành chính)
  const [viewMode, setViewMode] = useState<'visual' | 'document'>('visual');
  const [copied, setCopied] = useState(false);

  // Administrative metadata
  const [reportNumber, setReportNumber] = useState('      /BC-UBND');
  const [signerTitle, setSignerTitle] = useState('KT. CHỦ TỊCH\nPHÓ CHỦ TỊCH');
  const [signerName, setSignerName] = useState('Thái Công Cần');

  // Compute Active Date Range
  const { startDate, endDate, periodTitle, periodSubTitle } = useMemo(() => {
    let start = new Date(selectedYear, 0, 1);
    let end = new Date(selectedYear, 11, 31, 23, 59, 59);
    let title = '';
    let sub = '';

    if (periodMode === 'week') {
      const today = new Date();
      const currentDay = today.getDay();
      const diffToMonday = today.getDate() - (currentDay === 0 ? 6 : currentDay - 1);

      const monday = new Date(today.setDate(diffToMonday));
      monday.setHours(0, 0, 0, 0);

      if (selectedWeekType === 'last_week') {
        monday.setDate(monday.getDate() - 7);
      }
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      start = monday;
      end = sunday;
      title = selectedWeekType === 'this_week' ? 'Tuần này' : 'Tuần trước';
      sub = `Từ ngày ${monday.toLocaleDateString('vi-VN')} đến ngày ${sunday.toLocaleDateString('vi-VN')}`;
    } else if (periodMode === 'month') {
      start = new Date(selectedYear, selectedMonth - 1, 1);
      end = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);
      title = `Tháng ${selectedMonth}/${selectedYear}`;
      sub = `Từ ngày 01/${selectedMonth < 10 ? '0' + selectedMonth : selectedMonth}/${selectedYear} đến ${end.getDate()}/${selectedMonth < 10 ? '0' + selectedMonth : selectedMonth}/${selectedYear}`;
    } else if (periodMode === 'quarter') {
      const startM = (selectedQuarter - 1) * 3;
      start = new Date(selectedYear, startM, 1);
      end = new Date(selectedYear, startM + 3, 0, 23, 59, 59);
      title = `Quý ${selectedQuarter} năm ${selectedYear}`;
      sub = `Từ ngày 01/${startM + 1 < 10 ? '0' + (startM + 1) : startM + 1}/${selectedYear} đến ngày ${end.getDate()}/${startM + 3 < 10 ? '0' + (startM + 3) : startM + 3}/${selectedYear}`;
    } else if (periodMode === 'half_year') {
      if (selectedHalfYear === 1) {
        start = new Date(selectedYear, 0, 1);
        end = new Date(selectedYear, 5, 30, 23, 59, 59);
        title = `6 tháng đầu năm ${selectedYear}`;
        sub = `Từ ngày 01/01/${selectedYear} đến ngày 30/06/${selectedYear}`;
      } else {
        start = new Date(selectedYear, 6, 1);
        end = new Date(selectedYear, 11, 31, 23, 59, 59);
        title = `6 tháng cuối năm ${selectedYear}`;
        sub = `Từ ngày 01/07/${selectedYear} đến ngày 31/12/${selectedYear}`;
      }
    } else if (periodMode === 'nine_months') {
      start = new Date(selectedYear, 0, 1);
      end = new Date(selectedYear, 8, 30, 23, 59, 59);
      title = `9 tháng đầu năm ${selectedYear}`;
      sub = `Từ ngày 01/01/${selectedYear} đến ngày 30/09/${selectedYear} (Sơ kết 9 tháng)`;
    } else if (periodMode === 'year') {
      start = new Date(selectedYear, 0, 1);
      end = new Date(selectedYear, 11, 31, 23, 59, 59);
      title = `Cả năm ${selectedYear}`;
      sub = `Từ ngày 01/01/${selectedYear} đến ngày 31/12/${selectedYear}`;
    } else if (periodMode === 'custom') {
      start = new Date(customStartDate || '2026-01-01');
      start.setHours(0, 0, 0, 0);
      end = new Date(customEndDate || '2026-12-31');
      end.setHours(23, 59, 59, 999);
      title = 'Giai đoạn tùy chọn';
      sub = `Từ ngày ${start.toLocaleDateString('vi-VN')} đến ngày ${end.toLocaleDateString('vi-VN')}`;
    }

    return { startDate: start, endDate: end, periodTitle: title, periodSubTitle: sub };
  }, [
    periodMode,
    selectedYear,
    selectedMonth,
    selectedQuarter,
    selectedHalfYear,
    selectedWeekType,
    customStartDate,
    customEndDate,
  ]);

  // Unique locations
  const locations = useMemo(() => {
    const set = new Set<string>();
    violations.forEach((v) => {
      if (v.location) {
        const match = v.location.match(/Thôn\s+[^,;.\n]+|\bThôn\s*\d+/i);
        set.add(match ? match[0].trim() : v.location.trim());
      }
    });
    return Array.from(set).sort();
  }, [violations]);

  // Overall and Period metrics
  const stats = useMemo(() => {
    const totalCases = violations.length;
    const totalArea = violations.reduce((sum, v) => sum + (Number(v.violatedArea) || 0), 0);

    const detectedCount = violations.filter((v) => v.status === 'detected').length;
    const minuteIssuedCount = violations.filter((v) => v.status === 'minute_issued').length;
    const sanctionDecidedCount = violations.filter((v) => v.status === 'sanction_decided').length;
    const enforcementPendingCount = violations.filter((v) => v.status === 'enforcement_pending').length;
    const enforcedCount = violations.filter((v) => v.status === 'enforced').length;
    const resolvedCount = violations.filter((v) => v.status === 'resolved').length;
    const forwardedCount = violations.filter((v) => v.status === 'forwarded_to_district').length;

    const inProgressCases = totalCases - resolvedCount;

    // Financial calculations
    const totalFines = violations.reduce((sum, v) => sum + (Number(v.fineAmount) || 0), 0);
    const collectedFines = violations
      .filter((v) => v.finePaymentStatus === 'paid')
      .reduce((sum, v) => sum + (Number(v.fineAmount) || 0), 0);
    const pendingFines = totalFines - collectedFines;
    const fineCollectionRate = totalFines > 0 ? Math.round((collectedFines / totalFines) * 100) : 0;

    return {
      totalCases,
      totalArea,
      detectedCount,
      minuteIssuedCount,
      sanctionDecidedCount,
      enforcementPendingCount,
      enforcedCount,
      resolvedCount,
      forwardedCount,
      inProgressCases,
      totalFines,
      collectedFines,
      pendingFines,
      fineCollectionRate,
    };
  }, [violations]);

  // Breakdown by Violation Type
  const typeBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; area: number; fines: number }> = {
      illegal_construction: { count: 0, area: 0, fines: 0 },
      encroachment: { count: 0, area: 0, fines: 0 },
      unauthorized_land_use_change: { count: 0, area: 0, fines: 0 },
      land_destruction: { count: 0, area: 0, fines: 0 },
      obstacle_creation: { count: 0, area: 0, fines: 0 },
      other: { count: 0, area: 0, fines: 0 },
    };

    violations.forEach((v) => {
      const t = v.violationType || 'other';
      if (!counts[t]) counts[t] = { count: 0, area: 0, fines: 0 };
      counts[t].count += 1;
      counts[t].area += Number(v.violatedArea) || 0;
      counts[t].fines += Number(v.fineAmount) || 0;
    });

    const typeLabels: Record<string, string> = {
      illegal_construction: 'Xây dựng không phép / sai phép',
      encroachment: 'Lấn chiếm đất công / HLAT giao thông',
      unauthorized_land_use_change: 'Tự ý chuyển mục đích sử dụng đất',
      land_destruction: 'Hủy hoại đất / khai thác đất trái phép',
      obstacle_creation: 'Cản trở lối đi chung & thoát nước',
      other: 'Hành vi vi phạm khác',
    };

    return Object.entries(counts).map(([typeKey, data]) => ({
      key: typeKey,
      label: typeLabels[typeKey] || typeKey,
      count: data.count,
      area: data.area,
      fines: data.fines,
      percent: stats.totalCases > 0 ? Math.round((data.count / stats.totalCases) * 100) : 0,
    }));
  }, [violations, stats.totalCases]);

  // Breakdown by Thôn
  const locationBreakdown = useMemo(() => {
    const map: Record<string, { count: number; area: number; fines: number; resolved: number }> = {};
    violations.forEach((v) => {
      const locMatch = v.location?.match(/Thôn\s+[^,;.\n]+|\bThôn\s*\d+/i);
      const locKey = locMatch ? locMatch[0].trim() : (v.location?.trim() || 'Địa bàn khác');
      if (!map[locKey]) {
        map[locKey] = { count: 0, area: 0, fines: 0, resolved: 0 };
      }
      map[locKey].count += 1;
      map[locKey].area += Number(v.violatedArea) || 0;
      map[locKey].fines += Number(v.fineAmount) || 0;
      if (v.status === 'resolved') map[locKey].resolved += 1;
    });

    return Object.entries(map)
      .map(([loc, data]) => ({
        location: loc,
        ...data,
        percentCases: stats.totalCases > 0 ? Math.round((data.count / stats.totalCases) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [violations, stats.totalCases]);

  // Filtered violations for table
  const filteredViolations = useMemo(() => {
    return violations.filter((v) => {
      if (filterLocation !== 'all' && !v.location.includes(filterLocation)) return false;
      if (filterStatus !== 'all' && v.status !== filterStatus) return false;
      if (filterType !== 'all' && v.violationType !== filterType) return false;
      if (filterSeverity !== 'all' && v.severity !== filterSeverity) return false;

      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        const matchCode = v.code?.toLowerCase().includes(q);
        const matchName = v.violatorName?.toLowerCase().includes(q);
        const matchCccd = v.violatorCccd?.toLowerCase().includes(q);
        const matchLoc = v.location?.toLowerCase().includes(q);
        const matchDesc = v.violationDescription?.toLowerCase().includes(q);
        const matchMinute = v.minuteNumber?.toLowerCase().includes(q);
        const matchDecision = v.sanctionDecisionNumber?.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchCccd && !matchLoc && !matchDesc && !matchMinute && !matchDecision) {
          return false;
        }
      }

      return true;
    });
  }, [violations, filterLocation, filterStatus, filterType, filterSeverity, tableSearch]);

  // Helper label for status
  const getStatusLabel = (status: ViolationStatus) => {
    switch (status) {
      case 'detected':
        return 'Mới phát hiện';
      case 'minute_issued':
        return 'Đã lập BB VPHC';
      case 'sanction_decided':
        return 'Đã ra QĐ xử phạt';
      case 'enforcement_pending':
        return 'Chờ cưỡng chế';
      case 'enforced':
        return 'Đã cưỡng chế';
      case 'resolved':
        return 'Đã chấp hành xong';
      case 'forwarded_to_district':
        return 'Chuyển huyện';
      default:
        return status;
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    if (filteredViolations.length === 0) {
      alert('Không có dữ liệu để xuất Excel.');
      return;
    }

    const rows = filteredViolations.map((v, i) => ({
      STT: i + 1,
      'Mã hồ sơ': v.code,
      'Đối tượng vi phạm': v.violatorName,
      'Số CCCD': v.violatorCccd || '---',
      'Địa chỉ thường trú': v.violatorAddress || '---',
      'Vị trí vi phạm': v.location,
      'Thửa đất': v.parcel || '---',
      'Tờ bản đồ': v.mapSheet || '---',
      'Diện tích vi phạm (m2)': v.violatedArea,
      'Hành vi vi phạm': v.violationDescription,
      'Mức độ': v.severity,
      'Tiến trình xử lý': getStatusLabel(v.status),
      'Ngày phát hiện': v.discoveryDate || '---',
      'Số BB VPHC': v.minuteNumber || '---',
      'Ngày lập BB': v.minuteDate || '---',
      'Số QĐ xử phạt': v.sanctionDecisionNumber || '---',
      'Ngày QĐ': v.sanctionDecisionDate || '---',
      'Tiền phạt (VNĐ)': v.fineAmount || 0,
      'Tình trạng nộp phạt': v.finePaymentStatus === 'paid' ? 'Đã nộp Kho bạc' : 'Chưa nộp',
      'Biện pháp buộc KPHQ': v.remedialMeasure || '---',
      'Số QĐ cưỡng chế': v.enforcementDecisionNumber || '---',
      'Cán bộ thụ lý': v.handlerName,
    }));

    exportToExcel(rows, `BaoCao_TratTuXayDung_ViPhamDatDai_${periodMode}_${selectedYear}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const textElement = document.getElementById('printable-violation-doc');
    if (textElement) {
      navigator.clipboard.writeText(textElement.innerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadWord = () => {
    const el = document.getElementById('printable-violation-doc');
    if (!el) return;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Bao_cao_trat_tu_xay_dung_vi_pham_dat_dai_${selectedYear}</title>
    <style>
      body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.35; text-align: justify; }
      h1, h2, h3 { text-align: center; font-weight: bold; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 8px; }
      th, td { border: 1px solid black; padding: 4px; text-align: center; font-size: 11pt; }
      .text-center { text-align: center; }
      .text-left { text-align: left; }
      .text-right { text-align: right; }
      .bold { font-weight: bold; }
      .italic { font-style: italic; }
      p { margin: 4px 0; text-align: justify; }
    </style>
    </head><body>`;
    const footer = '</body></html>';
    const sourceHTML = header + el.innerHTML + footer;
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement('a');
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `Bao_cao_trat_tu_xay_dung_vi_pham_dat_dai_${periodMode}_${selectedYear}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  return (
    <div className="space-y-4">
      {/* PERIOD SELECTION BAR */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-rose-600" />
              <span>Chu kỳ thời gian báo cáo trật tự xây dựng</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Thiết lập chu kỳ báo cáo định kỳ theo tuần, tháng, quý, 6 tháng, 9 tháng, năm hoặc khoảng ngày tùy chọn
            </p>
          </div>

          {/* Quick Period Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setPeriodMode('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'week'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Tuần
            </button>
            <button
              onClick={() => setPeriodMode('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'month'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Tháng
            </button>
            <button
              onClick={() => setPeriodMode('quarter')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'quarter'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Quý
            </button>
            <button
              onClick={() => setPeriodMode('half_year')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'half_year'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              6 Tháng
            </button>
            <button
              onClick={() => setPeriodMode('nine_months')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'nine_months'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              9 Tháng
            </button>
            <button
              onClick={() => setPeriodMode('year')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'year'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Cả năm
            </button>
            <button
              onClick={() => setPeriodMode('custom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'custom'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Tùy chọn ngày
            </button>
          </div>
        </div>

        {/* Dynamic Period Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {periodMode === 'week' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Chọn tuần:</span>
              <select
                value={selectedWeekType}
                onChange={(e) => setSelectedWeekType(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="this_week">Tuần này</option>
                <option value="last_week">Tuần trước</option>
              </select>
            </div>
          )}

          {periodMode === 'month' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Chọn tháng:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {periodMode === 'quarter' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Chọn quý:</span>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value={1}>Quý I (Tháng 1 - Tháng 3)</option>
                <option value={2}>Quý II (Tháng 4 - Tháng 6)</option>
                <option value={3}>Quý III (Tháng 7 - Tháng 9)</option>
                <option value={4}>Quý IV (Tháng 10 - Tháng 12)</option>
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {periodMode === 'half_year' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Chọn kỳ 6 tháng:</span>
              <select
                value={selectedHalfYear}
                onChange={(e) => setSelectedHalfYear(Number(e.target.value) as any)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value={1}>6 tháng đầu năm (01/01 - 30/06)</option>
                <option value={2}>6 tháng cuối năm (01/07 - 31/12)</option>
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {periodMode === 'nine_months' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Sơ kết 9 tháng năm:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {periodMode === 'year' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Chọn năm báo cáo:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {periodMode === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 font-medium">Từ ngày:</span>
              <div className="w-36">
                <VietnameseDateInput
                  value={customStartDate}
                  onChange={(val) => setCustomStartDate(val)}
                  className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 w-full text-xs"
                />
              </div>
              <span className="text-slate-500 font-medium">Đến ngày:</span>
              <div className="w-36">
                <VietnameseDateInput
                  value={customEndDate}
                  onChange={(val) => setCustomEndDate(val)}
                  className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 w-full text-xs"
                />
              </div>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-3 py-1 rounded-lg">
              {periodTitle} ({periodSubTitle})
            </span>
          </div>
        </div>
      </div>

      {/* VIEW MODE & ACTION TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
          <button
            onClick={() => setViewMode('visual')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'visual'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Thống kê & Biểu đồ trực quan
          </button>
          <button
            onClick={() => setViewMode('document')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'document'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Mẫu báo cáo hành chính (In / Xuất Word)
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Xuất Excel (.xlsx)
          </button>
          <button
            onClick={handleDownloadWord}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Tải file Word (.doc)
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> In / Lưu PDF
          </button>
        </div>
      </div>

      {/* =========================================================================
          VIEW MODE 1: VISUAL (THỐNG KÊ, BIỂU ĐỒ, BẢNG KÊ)
         ========================================================================= */}
      {viewMode === 'visual' && (
        <div className="space-y-4">
          {/* KPI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Tổng vụ phát sinh</span>
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
                {stats.totalCases} <span className="text-xs font-normal text-slate-400">vụ việc</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Diện tích vi phạm: <b className="text-rose-600">{stats.totalArea.toLocaleString('vi-VN')} m²</b>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Đã lập BB & QĐ xử phạt</span>
                <Scale className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">
                {stats.minuteIssuedCount + stats.sanctionDecidedCount} <span className="text-xs font-normal text-slate-400">vụ</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Đã ra QĐ xử phạt: <b>{stats.sanctionDecidedCount} vụ</b>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Tiền phạt & Số lợi thu nộp</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.collectedFines.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-400">đ</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Tổng mức phạt: <b>{stats.totalFines.toLocaleString('vi-VN')} đ</b> (Đạt {stats.fineCollectionRate}%)
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Chờ cưỡng chế / Quá hạn</span>
                <Hammer className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">
                {stats.enforcementPendingCount} <span className="text-xs font-normal text-slate-400">vụ việc</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Đã chấp hành xong: <b className="text-emerald-600">{stats.resolvedCount} vụ</b>
              </div>
            </div>
          </div>

          {/* CHARTS & BREAKDOWN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phân loại theo hành vi vi phạm */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-rose-600" /> Cơ cấu phân loại hành vi vi phạm
                </span>
                <span className="text-[11px] font-normal text-slate-400">Nghị định 123/2024/NĐ-CP</span>
              </h4>
              <div className="space-y-2.5 text-xs">
                {typeBreakdown.map((item) => (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">{item.label}</span>
                      <span className="text-[11px]">
                        <b>{item.count} vụ</b> ({item.percent}%) • <b>{item.area.toLocaleString('vi-VN')} m²</b>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(item.percent, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Tiền xử phạt: {item.fines.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Phân bổ theo thôn & Tiến trình xử lý */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" /> Phân bổ theo địa bàn thôn & Tình hình xử lý
                </span>
                <span className="text-[11px] font-normal text-slate-400">{locationBreakdown.length} địa bàn</span>
              </h4>

              <div className="space-y-2.5 text-xs max-h-72 overflow-y-auto pr-1">
                {locationBreakdown.map((item, idx) => (
                  <div key={`loc-bk-${item.location}-${idx}`} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{item.location}</span>
                      <span className="text-[11px] text-slate-400">
                        {item.count} vụ vi phạm • {item.area.toLocaleString('vi-VN')} m²
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-rose-600 dark:text-rose-400 block">
                        Phạt: {item.fines.toLocaleString('vi-VN')} đ
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        Đã giải quyết xong: {item.resolved} vụ
                      </span>
                    </div>
                  </div>
                ))}

                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-lg space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-purple-900 dark:text-purple-200">Tiền phạt còn nợ đọng Kho bạc:</span>
                    <b className="text-rose-600 font-bold">{stats.pendingFines.toLocaleString('vi-VN')} đ</b>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-purple-900 dark:text-purple-200">Số vụ việc đang thụ lý giải quyết:</span>
                    <b className="text-amber-600 font-bold">{stats.inProgressCases} vụ</b>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TABLE FILTERS & SEARCH */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã vụ, đối tượng, CCCD, thôn, số BB, số QĐ xử phạt..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="all">Tất cả thôn</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="all">Tất cả tiến trình</option>
                <option value="detected">Mới phát hiện</option>
                <option value="minute_issued">Đã lập BB VPHC</option>
                <option value="sanction_decided">Đã ra QĐ xử phạt</option>
                <option value="enforcement_pending">Chờ cưỡng chế</option>
                <option value="enforced">Đã cưỡng chế</option>
                <option value="resolved">Đã chấp hành xong</option>
                <option value="forwarded_to_district">Chuyển huyện</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="all">Tất cả hành vi</option>
                <option value="illegal_construction">Xây dựng không phép</option>
                <option value="encroachment">Lấn chiếm đất/HLAT</option>
                <option value="unauthorized_land_use_change">Chuyển mục đích trái phép</option>
                <option value="land_destruction">Hủy hoại đất/san gạt</option>
                <option value="obstacle_creation">Cản trở lối đi</option>
              </select>
            </div>
          </div>

          {/* DETAILED TABLE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-200">
                BẢNG KÊ DANH MỤC HỒ SƠ VI PHẠM TRẬT TỰ XÂY DỰNG & ĐẤT ĐAI ({filteredViolations.length} vụ)
              </span>
              <span className="text-slate-500 font-normal">
                Tổng diện tích lọc: <b>{filteredViolations.reduce((s, v) => s + (Number(v.violatedArea) || 0), 0).toLocaleString('vi-VN')} m²</b>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3 font-semibold text-center w-10">STT</th>
                    <th className="py-2.5 px-3 font-semibold">Mã vụ / Ngày phát hiện</th>
                    <th className="py-2.5 px-3 font-semibold">Đối tượng vi phạm</th>
                    <th className="py-2.5 px-3 font-semibold">Vị trí / Thửa đất</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Diện tích (m²)</th>
                    <th className="py-2.5 px-3 font-semibold">Hành vi vi phạm</th>
                    <th className="py-2.5 px-3 font-semibold">Tiến trình xử lý</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Mức xử phạt (đ)</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Nộp phạt</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-24">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredViolations.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Không tìm thấy hồ sơ vi phạm nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredViolations.map((v, idx) => (
                      <tr
                        key={`report-viol-${v.id || 'v'}-${v.code || idx}-${idx}`}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          <div>
                            <span className="font-bold text-rose-600">{v.code}</span>
                            <div className="text-[11px] text-slate-400">{v.discoveryDate}</div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 font-semibold">
                          <div>{v.violatorName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{v.violatorCccd || '---'}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                          <div>{v.location}</div>
                          {v.parcel && <div className="text-[10px] text-slate-400">Thửa {v.parcel}, TBĐ {v.mapSheet}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-slate-100">
                          {v.violatedArea ? v.violatedArea.toLocaleString('vi-VN') : '---'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 max-w-[200px] truncate" title={v.violationDescription}>
                          {v.violationDescription}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              v.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : v.status === 'enforcement_pending'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                                : v.status === 'sanction_decided'
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {getStatusLabel(v.status)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                          {v.fineAmount ? `${v.fineAmount.toLocaleString('vi-VN')} đ` : '0 đ'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {v.finePaymentStatus === 'paid' ? (
                            <span className="text-emerald-600 font-bold text-[10px] flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Đã nộp
                            </span>
                          ) : (
                            <span className="text-rose-600 font-bold text-[10px] flex items-center justify-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Chưa nộp
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onSelectViolation && onSelectViolation(v)}
                              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Xem chi tiết hồ sơ"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onPrintViolation && onPrintViolation(v)}
                              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                              title="In tài liệu xử phạt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 2: DOCUMENT (BẢN IN HÀNH CHÍNH THEO NGHỊ ĐỊNH 30/2020/NĐ-CP)
         ========================================================================= */}
      {viewMode === 'document' && (
        <div className="space-y-4">
          {/* Document Controls */}
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between text-xs">
            <span className="text-rose-800 dark:text-rose-200 font-medium">
              Văn bản báo cáo chuẩn theo Nghị định 30/2020/NĐ-CP phục vụ công tác thanh tra trật tự xây dựng, báo cáo Thường trực UBND cấp xã và Phòng Quản lý đô thị / TN&MT cấp trên.
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-md border border-slate-300 dark:border-slate-700 flex items-center gap-1 font-semibold cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Đã chép' : 'Sao chép nội dung'}
              </button>
            </div>
          </div>

          {/* A4 Sheet */}
          <div className="flex justify-center bg-slate-200 dark:bg-slate-950 p-2 sm:p-6 rounded-2xl overflow-x-auto">
            <div
              id="printable-violation-doc"
              className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black p-8 sm:p-14 shadow-xl font-serif text-[14px] leading-normal select-text"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              {/* Header Quốc hiệu & Đơn vị */}
              <div className="grid grid-cols-12 gap-2 pb-2">
                <div className="col-span-5 text-center font-sans">
                  <p className="uppercase font-bold text-[12px] leading-tight text-black">
                    ỦY BAN NHÂN DÂN
                  </p>
                  <p className="uppercase font-bold text-[12px] leading-tight text-black mt-0.5">
                    XÃ LÃNH NGỌC
                  </p>
                  <div className="w-20 h-[1px] bg-black mx-auto my-1"></div>
                  <p className="text-[12px] font-sans mt-0.5">
                    Số: {reportNumber}
                  </p>
                </div>

                <div className="col-span-7 text-center font-sans">
                  <p className="uppercase font-bold text-[12px] leading-tight tracking-normal text-black">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </p>
                  <p className="font-bold text-[12px] leading-tight mt-0.5 text-black">
                    Độc lập - Tự do - Hạnh phúc
                  </p>
                  <div className="w-32 h-[1px] bg-black mx-auto my-1"></div>
                  <p className="italic text-[12px] mt-1 font-serif">
                    Lãnh Ngọc, ngày {now.getDate()} tháng {now.getMonth() + 1} năm {now.getFullYear()}
                  </p>
                </div>
              </div>

              {/* Title */}
              <div className="text-center my-6">
                <h1 className="text-base sm:text-lg font-bold uppercase tracking-wider text-black">
                  BÁO CÁO
                </h1>
                <p className="text-sm font-bold uppercase text-black mt-1">
                  KẾT QUẢ CÔNG TÁC KIỂM TRA, XỬ LÝ VI PHẠM TRẬT TỰ XÂY DỰNG VÀ LĨNH VỰC ĐẤT ĐAI
                </p>
                <p className="italic text-xs text-black mt-0.5">
                  ({periodTitle} - Thực hiện theo Luật Xử lý VPHC và Nghị định số 123/2024/NĐ-CP)
                </p>
              </div>

              {/* Kính gửi */}
              <div className="text-center font-bold text-[13px] mb-4">
                Kính gửi: Thường trực Đảng ủy, HĐND và UBND xã Lãnh Ngọc.
              </div>

              {/* Nội dung báo cáo */}
              <div className="space-y-3 text-justify leading-relaxed">
                <p className="indent-8">
                  Thực hiện chức năng quản lý nhà nước về trật tự xây dựng và quản lý đất đai trên địa bàn xã Lãnh Ngọc; căn cứ Luật Xử lý vi phạm hành chính, Luật Đất đai năm 2024 và Nghị định số 123/2024/NĐ-CP ngày 04/10/2024 của Chính phủ; Ủy ban nhân dân xã Lãnh Ngọc báo cáo tình hình kiểm tra, xử lý vi phạm trật tự xây dựng và đất đai trong <b>{periodTitle}</b> cụ thể như sau:
                </p>

                {/* Phần I */}
                <div>
                  <h3 className="font-bold text-black uppercase text-[13px]">
                    I. TÌNH HÌNH PHÁT SINH VÀ TIẾN TRÌNH XỬ LÝ VI PHẠM
                  </h3>
                  <div className="space-y-1.5 mt-1.5 ml-4">
                    <p>
                      <b>1. Tổng số vụ việc phát hiện, lập hồ sơ:</b> Trong kỳ báo cáo, Tổ kiểm tra quy tắc đô thị và công chức Địa chính - Xây dựng xã đã phát hiện và thiết lập hồ sơ xử lý đối với <b>{stats.totalCases} vụ việc</b>, với tổng diện tích đất vi phạm là <b>{stats.totalArea.toLocaleString('vi-VN')} m²</b>.
                    </p>
                    <p>
                      <b>2. Kết quả thiết lập hồ sơ xử lý vi phạm hành chính:</b>
                    </p>
                    <ul className="list-disc ml-6 space-y-1 text-[13px]">
                      <li>
                        Số vụ việc đã lập Biên bản vi phạm hành chính (đình chỉ hiện trường): <b>{stats.minuteIssuedCount} vụ</b>.
                      </li>
                      <li>
                        Số vụ việc đã ban hành Quyết định xử phạt vi phạm hành chính: <b>{stats.sanctionDecidedCount} vụ</b>.
                      </li>
                      <li>
                        Số vụ việc đã chấp hành xong (đã nộp phạt Kho bạc và tự tháo dỡ/khôi phục hiện trạng): <b>{stats.resolvedCount} vụ</b>.
                      </li>
                      <li>
                        Số vụ việc quá thời hạn tự nguyện thi hành, đang xây dựng phương án cưỡng chế: <b>{stats.enforcementPendingCount} vụ</b>.
                      </li>
                      <li>
                        Số vụ việc đã tổ chức cưỡng chế thành công: <b>{stats.enforcedCount} vụ</b>.
                      </li>
                      <li>
                        Số vụ việc vượt quá thẩm quyền cấp xã, đã lập hồ sơ chuyển UBND cấp huyện: <b>{stats.forwardedCount} vụ</b>.
                      </li>
                    </ul>

                    <p>
                      <b>3. Kết quả xử phạt vi phạm hành chính và thu nộp ngân sách:</b>
                    </p>
                    <ul className="list-disc ml-6 space-y-1 text-[13px]">
                      <li>
                        Tổng số tiền xử phạt VPHC và thu hồi số lợi bất hợp pháp: <b>{stats.totalFines.toLocaleString('vi-VN')} đồng</b>.
                      </li>
                      <li>
                        Số tiền đã thực nộp vào Kho bạc Nhà nước: <b>{stats.collectedFines.toLocaleString('vi-VN')} đồng</b> (đạt <b>{stats.fineCollectionRate}%</b>).
                      </li>
                      <li>
                        Số tiền phạt còn tồn đọng cần đôn đốc thu nộp: <b>{stats.pendingFines.toLocaleString('vi-VN')} đồng</b>.
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Phần II: Bảng phân loại hành vi */}
                <div>
                  <h3 className="font-bold text-black uppercase text-[13px] mt-2">
                    II. PHÂN LOẠI VI PHẠM THEO HÀNH VI VÀ ĐỊA BÀN
                  </h3>
                  <div className="mt-2">
                    <table className="w-full border-collapse border border-black text-center text-xs">
                      <thead>
                        <tr className="bg-slate-100 font-bold">
                          <th className="border border-black p-1.5 w-10">STT</th>
                          <th className="border border-black p-1.5 text-left">Nhóm hành vi vi phạm</th>
                          <th className="border border-black p-1.5 w-20">Số vụ</th>
                          <th className="border border-black p-1.5 w-28">Diện tích (m²)</th>
                          <th className="border border-black p-1.5 w-24">Tỷ lệ (%)</th>
                          <th className="border border-black p-1.5 text-right">Tiền phạt (đ)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {typeBreakdown.map((item, idx) => (
                          <tr key={`type-bk-${item.key}-${idx}`}>
                            <td className="border border-black p-1">{idx + 1}</td>
                            <td className="border border-black p-1 text-left font-medium">{item.label}</td>
                            <td className="border border-black p-1">{item.count}</td>
                            <td className="border border-black p-1 font-semibold">{item.area.toLocaleString('vi-VN')}</td>
                            <td className="border border-black p-1">{item.percent}%</td>
                            <td className="border border-black p-1 text-right">{item.fines.toLocaleString('vi-VN')}</td>
                          </tr>
                        ))}
                        <tr className="font-bold bg-slate-50">
                          <td colSpan={2} className="border border-black p-1.5 text-center uppercase">Tổng cộng</td>
                          <td className="border border-black p-1.5">{stats.totalCases}</td>
                          <td className="border border-black p-1.5">{stats.totalArea.toLocaleString('vi-VN')}</td>
                          <td className="border border-black p-1.5">100%</td>
                          <td className="border border-black p-1.5 text-right">{stats.totalFines.toLocaleString('vi-VN')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Phần III: Khó khăn & Kiến nghị */}
                <div>
                  <h3 className="font-bold text-black uppercase text-[13px] mt-2">
                    III. ĐÁNH GIÁ, KHÓ KHĂN VÀ PHƯƠNG HƯỚNG NHIỆM VỤ THỜI GIAN TỚI
                  </h3>
                  <div className="space-y-1.5 ml-4 mt-1.5">
                    <p>
                      <b>1. Đánh giá chung:</b> Công tác tuần tra, kiểm soát địa bàn đã được thực hiện thường xuyên; các hành vi vi phạm cơ bản được phát hiện kịp thời từ lúc mới manh nha đào móng, san gạt hoặc dựng cọc rào; hồ sơ xử lý được lập chặt chẽ theo đúng biểu mẫu Nghị định số 118/2021/NĐ-CP và Nghị định số 123/2024/NĐ-CP.
                    </p>
                    <p>
                      <b>2. Khó khăn, vướng mắc:</b> Một số đối tượng vi phạm lợi dụng ngày nghỉ cuối tuần hoặc ban đêm để lén lút thi công, che chắn; một số vụ việc đương sự chây ì không tự giác nộp phạt và không tự tháo dỡ công trình vi phạm, buộc chính quyền địa phương phải hoàn thiện hồ sơ cưỡng chế giải tỏa.
                    </p>
                    <p>
                      <b>3. Phương hướng, nhiệm vụ trọng tâm:</b>
                    </p>
                    <ul className="list-disc ml-6 space-y-1 text-[13px]">
                      <li>
                        Tăng cường công tác kiểm tra đột xuất tại các thôn trọng điểm, các khu vực giáp ranh dự án quy hoạch;
                      </li>
                      <li>
                        Đôn đốc thi hành dứt điểm các Quyết định xử phạt đã có hiệu lực pháp luật; kiên quyết tổ chức cưỡng chế đối với các trường hợp cố tình không chấp hành;
                      </li>
                      <li>
                        Đẩy mạnh công tác tuyên truyền, phổ biến các quy định của Luật Đất đai năm 2024 để nâng cao ý thức chấp hành pháp luật của nhân dân.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Nơi nhận & Ký tên */}
              <div className="avoid-break grid grid-cols-2 gap-4 pt-8 text-xs font-sans mt-6">
                <div className="text-left text-[11px] leading-relaxed text-black">
                  <p className="font-bold italic">Nơi nhận:</p>
                  <p>- Thường trực Đảng ủy xã (báo cáo);</p>
                  <p>- Thường trực HĐND xã;</p>
                  <p>- Chủ tịch, các PCT UBND xã;</p>
                  <p>- Phòng Quản lý Đô thị / TN&MT;</p>
                  <p>- Đội Kiểm tra quy tắc đô thị;</p>
                  <p>- Lưu: VT, Hồ sơ TTXD.</p>
                </div>

                <div className="text-center font-sans">
                  <p className="font-bold uppercase text-[12px]">{signerTitle.split('\n')[0]}</p>
                  <p className="font-bold uppercase text-[12px]">{signerTitle.split('\n')[1] || ''}</p>
                  <p className="italic text-[11px]">(Ký tên, đóng dấu và ghi rõ họ tên)</p>
                  <div className="h-20 flex items-center justify-center">
                    <span className="text-red-700/60 font-serif italic text-xs border border-dashed border-red-300 px-3 py-1 rounded">
                      [Đóng dấu đỏ UBND XÃ LÃNH NGỌC]
                    </span>
                  </div>
                  <p className="font-bold text-[13px] uppercase text-black">{signerName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
