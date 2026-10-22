import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Filter,
  Printer,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Scale,
  Compass,
  Sparkles,
  BarChart3,
  PieChart,
  FileText,
  MapPin,
  ChevronRight,
  Eye,
  Layers,
  ArrowUpDown,
  Search,
} from 'lucide-react';
import { DisputeCase, DisputeType, DisputeStatus } from '../../types';
import { exportToExcel } from '../../utils/export';
import { VietnameseDateInput } from '../common/VietnameseDateInput';

interface DisputeReportsViewProps {
  disputes: DisputeCase[];
  onSelectDispute?: (dispute: DisputeCase) => void;
}

type PeriodMode =
  | 'week'
  | 'month'
  | 'quarter'
  | 'half_year'
  | 'nine_months'
  | 'year'
  | 'custom';

export const DisputeReportsView: React.FC<DisputeReportsViewProps> = ({
  disputes,
  onSelectDispute,
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

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
  const [filterDisputeType, setFilterDisputeType] = useState<string>('all');
  const [filterOutcome, setFilterOutcome] = useState<string>('all');
  const [tableSearch, setTableSearch] = useState('');

  // Presentation View: 'visual' or 'document' (bản in hành chính)
  const [viewMode, setViewMode] = useState<'visual' | 'document'>('visual');

  // Compute Active Date Range [startDate, endDate]
  const { startDate, endDate, periodTitle, periodSubTitle } = useMemo(() => {
    let start = new Date(selectedYear, 0, 1);
    let end = new Date(selectedYear, 11, 31, 23, 59, 59);
    let title = '';
    let sub = '';

    if (periodMode === 'week') {
      const today = new Date();
      const currentDay = today.getDay(); // 0 is Sun, 1 is Mon
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
      const startMonth = (selectedQuarter - 1) * 3;
      start = new Date(selectedYear, startMonth, 1);
      end = new Date(selectedYear, startMonth + 3, 0, 23, 59, 59);
      title = `Quý ${selectedQuarter} năm ${selectedYear}`;
      sub = `Từ ngày 01/${startMonth + 1 < 10 ? '0' + (startMonth + 1) : startMonth + 1}/${selectedYear} đến ngày ${end.getDate()}/${startMonth + 3 < 10 ? '0' + (startMonth + 3) : startMonth + 3}/${selectedYear}`;
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

  // Filter disputes within active date range
  const periodDisputes = useMemo(() => {
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();

    return (disputes || []).filter((d) => {
      // Use receivedDate or createdAt
      const dateStr = d.receivedDate || d.createdAt;
      if (!dateStr) return false;
      const t = new Date(dateStr).getTime();
      return t >= startMs && t <= endMs;
    });
  }, [disputes, startDate, endDate]);

  // Apply secondary filters (location, type, outcome, search)
  const filteredDisputes = useMemo(() => {
    return periodDisputes.filter((d) => {
      if (filterLocation !== 'all' && d.location !== filterLocation) return false;
      if (filterDisputeType !== 'all' && d.disputeType !== filterDisputeType) return false;
      if (filterOutcome !== 'all') {
        if (filterOutcome === 'success' && d.status !== 'resolved_success') return false;
        if (filterOutcome === 'failure' && d.status !== 'resolved_failure') return false;
        if (
          filterOutcome === 'processing' &&
          (d.status === 'resolved_success' || d.status === 'resolved_failure' || d.status === 'withdrawn')
        )
          return false;
      }

      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        const matchCode = d.code.toLowerCase().includes(q);
        const matchTitle = d.title.toLowerCase().includes(q);
        const matchA = d.partyA.name.toLowerCase().includes(q);
        const matchB = d.partyB.name.toLowerCase().includes(q);
        const matchParcel = d.parcel.toLowerCase().includes(q);
        const matchLoc = d.location.toLowerCase().includes(q);
        if (!matchCode && !matchTitle && !matchA && !matchB && !matchParcel && !matchLoc) {
          return false;
        }
      }

      return true;
    });
  }, [periodDisputes, filterLocation, filterDisputeType, filterOutcome, tableSearch]);

  // Calculate comprehensive metrics
  const stats = useMemo(() => {
    const list = periodDisputes;
    const total = list.length;
    const received = list.filter((d) => d.status === 'received').length;
    const verifying = list.filter((d) => d.status === 'verifying').length;
    const verified = list.filter((d) => d.status === 'verified').length;
    const reported = list.filter((d) => d.status === 'reported').length;
    const scheduled = list.filter((d) => d.status === 'scheduled').length;
    const resolvedSuccess = list.filter((d) => d.status === 'resolved_success').length;
    const resolvedFailure = list.filter((d) => d.status === 'resolved_failure').length;
    const withdrawn = list.filter((d) => d.status === 'withdrawn').length;

    const inProgress = total - (resolvedSuccess + resolvedFailure + withdrawn);
    const completedMediation = resolvedSuccess + resolvedFailure;
    const successRate = completedMediation > 0 ? Math.round((resolvedSuccess / completedMediation) * 100) : 0;

    // Overdue count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdueCount = list.filter((d) => {
      if (d.status === 'resolved_success' || d.status === 'resolved_failure' || d.status === 'withdrawn') return false;
      if (!d.deadlineDate) return false;
      const due = new Date(d.deadlineDate);
      if (isNaN(due.getTime())) return false;
      due.setHours(0, 0, 0, 0);
      return due.getTime() < today.getTime();
    }).length;

    // Evidence count in period
    let totalEvidencePhotos = 0;
    let totalEvidenceMinutes = 0;
    list.forEach((d) => {
      (d.fieldEvidences || []).forEach((ev) => {
        if (ev.category === 'photo_field') totalEvidencePhotos++;
        else totalEvidenceMinutes++;
      });
    });

    return {
      total,
      received,
      verifying,
      verified,
      reported,
      scheduled,
      resolvedSuccess,
      resolvedFailure,
      withdrawn,
      inProgress,
      completedMediation,
      successRate,
      overdueCount,
      totalEvidencePhotos,
      totalEvidenceMinutes,
    };
  }, [periodDisputes]);

  // Breakdown by Type
  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {
      boundary: 0,
      encroachment: 0,
      pathway: 0,
      overlapping: 0,
      inheritance: 0,
      transfer: 0,
      other: 0,
    };
    periodDisputes.forEach((d) => {
      const t = d.disputeType || 'other';
      counts[t] = (counts[t] || 0) + 1;
    });

    const typeLabels: Record<string, string> = {
      boundary: 'Ranh giới / Mốc giới thửa đất',
      encroachment: 'Lấn, chiếm đất đai',
      pathway: 'Ngõ đi chung & Lối thoát nước',
      overlapping: 'Chồng lấn ranh / Cấp trùng GCN',
      inheritance: 'Thừa kế quyền sử dụng đất',
      transfer: 'Chuyển nhượng viết tay',
      other: 'Tranh chấp đất đai khác',
    };

    return Object.entries(counts).map(([typeKey, count]) => ({
      key: typeKey,
      label: typeLabels[typeKey] || typeKey,
      count,
      percent: stats.total > 0 ? Math.round((count / stats.total) * 100) : 0,
    }));
  }, [periodDisputes, stats.total]);

  // Breakdown by Village / Location
  const locationBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    periodDisputes.forEach((d) => {
      const loc = d.location || 'Chưa phân loại';
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([loc, count]) => ({
        location: loc,
        count,
        percent: stats.total > 0 ? Math.round((count / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [periodDisputes, stats.total]);

  // Unique locations for filter
  const locations = useMemo(() => {
    const set = new Set<string>();
    (disputes || []).forEach((d) => {
      if (d.location) set.add(d.location);
    });
    return Array.from(set);
  }, [disputes]);

  // Excel Export
  const handleExportExcel = () => {
    if (filteredDisputes.length === 0) {
      alert('Không có dữ liệu để xuất Excel.');
      return;
    }

    const rows = filteredDisputes.map((d, i) => ({
      STT: i + 1,
      'Mã vụ việc': d.code,
      'Ngày nhận đơn': d.receivedDate,
      'Thời hạn xử lý': d.deadlineDate,
      'Người yêu cầu (Bên A)': d.partyA.name,
      'Người bị tranh chấp (Bên B)': d.partyB.name,
      'Thửa đất': d.parcel,
      'Tờ bản đồ': d.mapSheet,
      'Địa bàn / Thôn': d.location,
      'Diện tích thửa (m2)': d.area,
      'Diện tích tranh chấp (m2)': d.disputedArea,
      'Loại tranh chấp': d.disputeType,
      'Trạng thái': d.status,
      'Kết quả hòa giải':
        d.status === 'resolved_success'
          ? 'HÒA GIẢI THÀNH'
          : d.status === 'resolved_failure'
          ? 'HÒA GIẢI KHÔNG THÀNH'
          : 'Đang giải quyết',
      'Cán bộ thụ lý': d.handlerName,
      'Tư liệu hiện trường thu thập': (d.fieldEvidences || []).length,
    }));

    exportToExcel(rows, `BaoCao_TranhChap_HoaGiai_${periodMode}_${selectedYear}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* PERIOD SELECTION BAR */}
      <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Chu kỳ thời gian báo cáo</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chọn chu kỳ báo cáo định kỳ theo tuần, tháng, quý, 6 tháng, 9 tháng, năm hoặc tùy chọn thời gian
            </p>
          </div>

          {/* Quick Period Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setPeriodMode('week')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'week'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
              }`}
            >
              Tuần
            </button>
            <button
              onClick={() => setPeriodMode('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'month'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
              }`}
            >
              Tháng
            </button>
            <button
              onClick={() => setPeriodMode('quarter')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'quarter'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
              }`}
            >
              Quý
            </button>
            <button
              onClick={() => setPeriodMode('half_year')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'half_year'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
              }`}
            >
              6 Tháng
            </button>
            <button
              onClick={() => setPeriodMode('nine_months')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'nine_months'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
              }`}
              title="Báo cáo sơ kết 9 tháng đầu năm theo quy định hành chính"
            >
              9 Tháng
            </button>
            <button
              onClick={() => setPeriodMode('year')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'year'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
              }`}
            >
              Cả Năm
            </button>
            <button
              onClick={() => setPeriodMode('custom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'custom'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-slate-700 hover:bg-gray-200'
              }`}
            >
              Tùy chọn
            </button>
          </div>
        </div>

        {/* Dynamic Period Control Inputs */}
        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-3">
          {/* Week options */}
          {periodMode === 'week' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Chọn tuần:</span>
              <select
                value={selectedWeekType}
                onChange={(e) => setSelectedWeekType(e.target.value as any)}
                className="text-xs px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white"
              >
                <option value="this_week">Tuần này</option>
                <option value="last_week">Tuần trước</option>
              </select>
            </div>
          )}

          {/* Month options */}
          {periodMode === 'month' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Chọn tháng:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-xs px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quarter options */}
          {periodMode === 'quarter' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Chọn quý:</span>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                className="text-xs px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white"
              >
                <option value={1}>Quý I (Tháng 1 - Tháng 3)</option>
                <option value={2}>Quý II (Tháng 4 - Tháng 6)</option>
                <option value={3}>Quý III (Tháng 7 - Tháng 9)</option>
                <option value={4}>Quý IV (Tháng 10 - Tháng 12)</option>
              </select>
            </div>
          )}

          {/* 6 months options */}
          {periodMode === 'half_year' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Giai đoạn:</span>
              <select
                value={selectedHalfYear}
                onChange={(e) => setSelectedHalfYear(Number(e.target.value) as 1 | 2)}
                className="text-xs px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white"
              >
                <option value={1}>6 tháng đầu năm (01/01 - 30/06)</option>
                <option value={2}>6 tháng cuối năm (01/07 - 31/12)</option>
              </select>
            </div>
          )}

          {/* Year selector for non-custom & non-week modes */}
          {periodMode !== 'custom' && periodMode !== 'week' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Năm:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white"
              >
                {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Custom Date Range Picker */}
          {periodMode === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">Từ ngày:</span>
              <div className="w-36">
                <VietnameseDateInput
                  value={customStartDate}
                  onChange={(val) => setCustomStartDate(val)}
                  className="text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white w-full"
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">Đến ngày:</span>
              <div className="w-36">
                <VietnameseDateInput
                  value={customEndDate}
                  onChange={(val) => setCustomEndDate(val)}
                  className="text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white w-full"
                />
              </div>
            </div>
          )}

          {/* Display active period summary badge */}
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-900 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl">
              {periodTitle}: {periodSubTitle}
            </span>
          </div>
        </div>
      </div>

      {/* VIEW MODE TOGGLE & ACTIONS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Toggle Visual / Document */}
        <div className="flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200">
          <button
            onClick={() => setViewMode('visual')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              viewMode === 'visual'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Trực quan & Biểu đồ</span>
          </button>
          <button
            onClick={() => setViewMode('document')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              viewMode === 'document'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Văn bản Báo cáo Hành chính</span>
          </button>
        </div>

        {/* Export & Print actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Xuất danh sách vụ việc trong kỳ ra file Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="In báo cáo kết quả xử lý"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In Báo cáo</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: VISUAL & CHARTS & DATA */}
      {viewMode === 'visual' && (
        <div className="space-y-6">
          {/* KPI STATS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Tổng đơn thụ lý</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
              <p className="text-[10px] text-slate-400 mt-1">Trong kỳ báo cáo</p>
            </div>

            <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Đang thụ lý xác minh</span>
              <p className="text-2xl font-black text-sky-600 mt-1">{stats.inProgress}</p>
              <p className="text-[10px] text-slate-400 mt-1">Chưa hòa giải xong</p>
            </div>

            <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Đã có BB xác minh</span>
              <p className="text-2xl font-black text-indigo-600 mt-1">{stats.verified}</p>
              <p className="text-[10px] text-slate-400 mt-1">Đã đo đạc thực tế</p>
            </div>

            <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Hòa giải THÀNH</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{stats.resolvedSuccess}</p>
              <p className="text-[10px] text-emerald-700 font-bold mt-1">
                Tỷ lệ: {stats.successRate}%
              </p>
            </div>

            <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Hòa giải KHÔNG THÀNH</span>
              <p className="text-2xl font-black text-rose-600 mt-1">{stats.resolvedFailure}</p>
              <p className="text-[10px] text-slate-400 mt-1">Chuyển Tòa án / Cơ quan thẩm quyền</p>
            </div>

            <div className="p-4 bg-white border border-gray-200 rounded-2xl shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Cảnh báo Quá hạn</span>
              <p
                className={`text-2xl font-black mt-1 ${
                  stats.overdueCount > 0 ? 'text-rose-600' : 'text-slate-800'
                }`}
              >
                {stats.overdueCount}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Hạn luật định (30-45 ngày)</p>
            </div>
          </div>

          {/* DETAILED BREAKDOWNS (Cơ cấu loại tranh chấp & Phân bố thôn) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Type Breakdown */}
            <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-blue-600" />
                  <span>Cơ cấu theo tính chất tranh chấp</span>
                </h4>
                <span className="text-xs text-slate-400 font-medium">Tổng: {stats.total} vụ</span>
              </div>

              <div className="space-y-3">
                {typeBreakdown.map((item) => (
                  <div key={item.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{item.label}</span>
                      <span className="font-bold text-slate-900">
                        {item.count} vụ ({item.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Village / Location Breakdown */}
            <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Phân bố theo địa bàn thôn / khu vực</span>
                </h4>
                <span className="text-xs text-slate-400 font-medium">{locationBreakdown.length} địa bàn</span>
              </div>

              {locationBreakdown.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Không có vụ việc nào trong kỳ</p>
              ) : (
                <div className="space-y-3">
                  {locationBreakdown.map((item) => (
                    <div key={item.location} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{item.location}</span>
                        <span className="font-bold text-slate-900">
                          {item.count} vụ ({item.percent}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* TABLE OF DISPUTES IN PERIOD */}
          <div className="p-5 bg-white border border-gray-200 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Danh sách chi tiết các vụ việc trong kỳ báo cáo ({filteredDisputes.length} vụ)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nhấp vào từng dòng để mở toàn bộ hồ sơ chi tiết, biên bản xác minh và chứng cứ hiện trường
                </p>
              </div>

              {/* Search & Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Tìm tên, mã vụ, thửa..."
                    className="text-xs pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:border-blue-500 w-44"
                  />
                </div>

                <select
                  value={filterOutcome}
                  onChange={(e) => setFilterOutcome(e.target.value)}
                  className="text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white"
                >
                  <option value="all">Tất cả kết quả</option>
                  <option value="success">✓ Hòa giải THÀNH</option>
                  <option value="failure">✗ Hòa giải KHÔNG THÀNH</option>
                  <option value="processing">Đang giải quyết</option>
                </select>

                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:bg-white"
                >
                  <option value="all">Tất cả thôn</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-slate-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">STT</th>
                    <th className="py-2.5 px-3">Mã & Ngày nhận</th>
                    <th className="py-2.5 px-3">Bên yêu cầu (Bên A) - Bên B</th>
                    <th className="py-2.5 px-3">Thửa đất / Địa bàn</th>
                    <th className="py-2.5 px-3">Loại tranh chấp</th>
                    <th className="py-2.5 px-3">Tiến độ xác minh</th>
                    <th className="py-2.5 px-3">Kết quả hòa giải</th>
                    <th className="py-2.5 px-3">Cán bộ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDisputes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Không có vụ việc nào phù hợp với bộ lọc trong kỳ báo cáo này
                      </td>
                    </tr>
                  ) : (
                    filteredDisputes.map((d, idx) => (
                      <tr
                        key={d.id}
                        onClick={() => onSelectDispute && onSelectDispute(d)}
                        className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-blue-700 block">{d.code}</span>
                          <span className="text-[11px] text-slate-400">{d.receivedDate}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-900 block">{d.partyA.name}</span>
                          <span className="text-[11px] text-slate-500">giáp với {d.partyB.name}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-slate-800 block">
                            Thửa {d.parcel} - TBĐ {d.mapSheet}
                          </span>
                          <span className="text-[11px] text-slate-500">{d.location}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-slate-700">
                            {d.disputeType === 'boundary'
                              ? 'Ranh giới / Mốc'
                              : d.disputeType === 'encroachment'
                              ? 'Lấn chiếm đất'
                              : d.disputeType === 'pathway'
                              ? 'Ngõ đi / Thoát nước'
                              : d.disputeType === 'overlapping'
                              ? 'Chồng lấn ranh'
                              : 'Tranh chấp khác'}
                          </span>
                          {d.disputedArea ? (
                            <span className="text-[11px] text-amber-700 block font-semibold">
                              {Number(d.disputedArea).toLocaleString('vi-VN')} m²
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            {d.verificationMinute ? (
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                                title="Đã có biên bản xác minh"
                              >
                                Đã xác minh
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-gray-100 text-slate-500">
                                Đang thu thập
                              </span>
                            )}
                            {(d.fieldEvidences || []).length > 0 && (
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                {(d.fieldEvidences || []).length} tư liệu
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          {d.status === 'resolved_success' ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                              ✓ THÀNH
                            </span>
                          ) : d.status === 'resolved_failure' ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-300">
                              ✗ KHÔNG THÀNH
                            </span>
                          ) : (
                            <span className="text-[11px] text-amber-700 font-medium">
                              Đang giải quyết
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-[120px]">
                          {d.handlerName}
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

      {/* VIEW MODE 2: FORMAL ADMINISTRATIVE REPORT DOCUMENT */}
      {viewMode === 'document' && (
        <div className="p-8 bg-white border border-gray-300 rounded-2xl shadow-sm text-slate-900 max-w-4xl mx-auto space-y-6 print:border-none print:p-0 print:shadow-none font-serif leading-relaxed">
          {/* Top National Header */}
          <div className="flex justify-between items-start text-center">
            <div className="w-1/2">
              <p className="uppercase text-xs font-semibold">ỦY BAN NHÂN DÂN XÃ LÃNH NGỌC</p>
              <p className="uppercase text-xs font-bold">HỘI ĐỒNG HÒA GIẢI TRANH CHẤP ĐẤT ĐAI</p>
              <div className="w-24 h-0.5 bg-slate-900 mx-auto mt-1 mb-1"></div>
              <p className="text-xs italic mt-1">Số: &nbsp; &nbsp; /BC-UBND</p>
            </div>

            <div className="w-1/2">
              <p className="uppercase text-xs font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p className="text-xs font-bold">Độc lập - Tự do - Hạnh phúc</p>
              <div className="w-32 h-0.5 bg-slate-900 mx-auto mt-1 mb-1"></div>
              <p className="text-xs italic mt-1">
                Lãnh Ngọc, ngày {now.getDate()} tháng {now.getMonth() + 1} năm {now.getFullYear()}
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center pt-4">
            <h2 className="text-base sm:text-lg font-bold uppercase tracking-wide">
              BÁO CÁO KẾT QUẢ TIẾP NHẬN, XÁC MINH VÀ HÒA GIẢI TRANH CHẤP ĐẤT ĐAI
            </h2>
            <p className="text-xs font-bold uppercase mt-1 text-slate-700">
              {periodTitle} ({periodSubTitle})
            </p>
          </div>

          {/* Main content body */}
          <div className="space-y-4 text-xs sm:text-sm text-justify">
            <p>
              Căn cứ Luật Đất đai 2024; Nghị định của Chính phủ quy định chi tiết thi hành Luật Đất đai;
              <br />
              Ủy ban nhân dân xã Lãnh Ngọc báo cáo tình hình, kết quả công tác thụ lý, kiểm tra xác minh thực địa và tổ chức hòa giải tranh chấp quyền sử dụng đất trong {periodTitle.toLowerCase()} với các nội dung cụ thể sau:
            </p>

            <div>
              <h4 className="font-bold uppercase text-xs sm:text-sm">
                I. TÌNH HÌNH TIẾP NHẬN ĐƠN VÀ THẨM TRA XÁC MINH
              </h4>
              <p className="mt-1">
                1. <strong>Tổng số đơn thụ lý trong kỳ:</strong> Đã tiếp nhận và thụ lý{' '}
                <strong>{stats.total}</strong> vụ việc tranh chấp quyền sử dụng đất.
              </p>
              <p className="mt-1">
                2. <strong>Công tác thẩm tra xác minh thực địa:</strong>
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-1">
                <li>
                  Số vụ đã tổ chức đo đạc thực tế, lập Biên bản xác minh hiện trường:{' '}
                  <strong>{stats.verified}</strong> vụ.
                </li>
                <li>
                  Số vụ đã tự động trích xuất và ban hành Báo cáo thẩm tra kết quả xác minh:{' '}
                  <strong>{stats.reported}</strong> vụ.
                </li>
                <li>
                  Tổng số tư liệu chứng cứ, hình ảnh chụp mốc giới và biên bản thực địa đã thu thập lưu hồ sơ:{' '}
                  <strong>{stats.totalEvidencePhotos + stats.totalEvidenceMinutes}</strong> tài liệu.
                </li>
                <li>
                  Số vụ đang tiếp tục xác minh, thu thập chứng cứ và đối chiếu hồ sơ 299/VN-2000:{' '}
                  <strong>{stats.inProgress}</strong> vụ.
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold uppercase text-xs sm:text-sm">
                II. KẾT QUẢ TỔ CHỨC CÁC PHIÊN HÒA GIẢI CẤP XÃ
              </h4>
              <p className="mt-1">
                Hội đồng hòa giải tranh chấp đất đai UBND xã đã tổ chức các phiên hòa giải theo đúng trình tự, thủ tục quy định tại Điều 235 và Điều 236 Luật Đất đai 2024, kết quả như sau:
              </p>
              <ul className="list-disc pl-6 space-y-1 mt-1">
                <li>
                  <strong>Hòa giải THÀNH:</strong> Đạt <strong>{stats.resolvedSuccess}</strong> vụ, chiếm tỷ lệ{' '}
                  <strong className="text-emerald-700">{stats.successRate}%</strong> trên tổng số vụ đã đưa ra hòa giải. Các bên đã ký biên bản thỏa thuận thống nhất mốc giới ranh đất và cam kết không khiếu nại.
                </li>
                <li>
                  <strong>Hòa giải KHÔNG THÀNH:</strong> Có <strong>{stats.resolvedFailure}</strong> vụ. UBND xã đã hoàn thiện hồ sơ, lập Biên bản hòa giải không thành và hướng dẫn đương sự nộp đơn khởi kiện đến Tòa án nhân dân có thẩm quyền theo quy định.
                </li>
                <li>
                  <strong>Số vụ giải quyết đúng hạn luật định:</strong>{' '}
                  <strong>{stats.total - stats.overdueCount}</strong> vụ (tỷ lệ{' '}
                  {stats.total > 0
                    ? Math.round(((stats.total - stats.overdueCount) / stats.total) * 100)
                    : 100}
                  %).
                </li>
                {stats.overdueCount > 0 && (
                  <li className="text-rose-700 font-semibold">
                    Số vụ việc quá hạn luật định 30 ngày: {stats.overdueCount} vụ (do hồ sơ nguồn gốc đất phức tạp qua nhiều thời kỳ và đương sự vắng mặt).
                  </li>
                )}
              </ul>
            </div>

            <div>
              <h4 className="font-bold uppercase text-xs sm:text-sm">
                III. ĐÁNH GIÁ VÀ KIẾN NGHỊ PHƯƠNG HƯỚNG TIẾP THEO
              </h4>
              <p className="mt-1">
                - Công tác kiểm tra thực địa, chụp ảnh lưu chứng cứ mốc giới và số hóa hồ sơ xác minh đã giúp Hội đồng hòa giải có căn cứ thực tế vững chắc, nâng cao tỷ lệ hòa giải thành tại cơ sở.
                <br />
                - Tiếp tục đôn đốc cán bộ Địa chính và Tư pháp xã tập trung giải quyết dứt điểm {stats.inProgress} vụ việc còn đang thụ lý, không để xảy ra tình trạng khiếu kiện vượt cấp./.
              </p>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 flex justify-between items-start text-center">
            <div className="text-left">
              <p className="font-bold text-xs">Nơi nhận:</p>
              <p className="text-[11px] text-slate-600">- Thường trực Đảng ủy xã (b/c);</p>
              <p className="text-[11px] text-slate-600">- Chủ tịch, các PCT UBND xã;</p>
              <p className="text-[11px] text-slate-600">- Sở Nông nghiệp và Môi trường TP (b/c);</p>
              <p className="text-[11px] text-slate-600">- Lưu: VT, PKT.</p>
            </div>

            <div className="w-1/2">
              <p className="font-bold uppercase text-xs">TM. HỘI ĐỒNG HÒA GIẢI</p>
              <p className="font-bold uppercase text-xs">CHỦ TỊCH HỘI ĐỒNG / CHỦ TỊCH UBND XÃ</p>
              <p className="text-[11px] italic text-slate-400 mt-12">(Ký, đóng dấu và ghi rõ họ tên)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
