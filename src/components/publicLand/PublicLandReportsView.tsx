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
  Landmark,
  Layers,
  FileText,
  MapPin,
  Eye,
  FileSignature,
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
import { PublicLandParcel, PublicLandStatus } from '../../types';
import { exportToExcel } from '../../utils/export';
import { VietnameseDateInput } from '../common/VietnameseDateInput';

interface PublicLandReportsViewProps {
  parcels: PublicLandParcel[];
  onSelectParcel?: (parcel: PublicLandParcel) => void;
  onOpenContract?: (parcel: PublicLandParcel) => void;
  onOpenPayment?: (parcel: PublicLandParcel) => void;
}

type PeriodMode =
  | 'week'
  | 'month'
  | 'quarter'
  | 'half_year'
  | 'nine_months'
  | 'year'
  | 'custom';

export const PublicLandReportsView: React.FC<PublicLandReportsViewProps> = ({
  parcels = [],
  onSelectParcel,
  onOpenContract,
  onOpenPayment,
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
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [filterLandType, setFilterLandType] = useState<string>('all');
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

  // Unique locations and land types
  const locations = useMemo(() => {
    const set = new Set<string>();
    parcels.forEach((p) => {
      if (p.location) {
        // Normalize location if needed
        const match = p.location.match(/Thôn\s*\d+/i);
        set.add(match ? match[0] : p.location);
      }
    });
    return Array.from(set).sort();
  }, [parcels]);

  const landTypes = useMemo(() => {
    const set = new Set<string>();
    parcels.forEach((p) => {
      if (p.landType) set.add(p.landType);
    });
    return Array.from(set).sort();
  }, [parcels]);

  // Overall and Period metrics
  const stats = useMemo(() => {
    const totalParcels = parcels.length;
    const totalArea = parcels.reduce((sum, p) => sum + (Number(p.area) || 0), 0);

    const leasedParcels = parcels.filter((p) => p.status === 'leased');
    const leasedCount = leasedParcels.length;
    const leasedArea = leasedParcels.reduce((sum, p) => sum + (Number(p.area) || 0), 0);

    const availableParcels = parcels.filter((p) => p.status === 'available');
    const availableCount = availableParcels.length;
    const availableArea = availableParcels.reduce((sum, p) => sum + (Number(p.area) || 0), 0);

    const expiredParcels = parcels.filter((p) => p.status === 'expired');
    const expiredCount = expiredParcels.length;

    const auctioningParcels = parcels.filter((p) => p.status === 'auctioning');
    const auctioningCount = auctioningParcels.length;

    const encroachedParcels = parcels.filter((p) => p.status === 'encroached');
    const encroachedCount = encroachedParcels.length;
    const encroachedArea = encroachedParcels.reduce((sum, p) => sum + (Number(p.area) || 0), 0);

    // Financial calculations
    const annualPlannedRevenue = parcels.reduce((sum, p) => sum + (Number(p.annualRent) || 0), 0);

    // Calculate revenue collected vs pending
    const paidParcels = parcels.filter((p) => p.paymentStatus === 'paid');
    const collectedRevenue = paidParcels.reduce((sum, p) => sum + (Number(p.annualRent) || 0), 0);

    const unpaidParcels = parcels.filter((p) => p.paymentStatus === 'unpaid' || p.paymentStatus === 'overdue');
    const pendingRevenue = unpaidParcels.reduce((sum, p) => sum + (Number(p.annualRent) || 0), 0);

    const collectionRate = annualPlannedRevenue > 0 ? Math.round((collectedRevenue / annualPlannedRevenue) * 100) : 0;
    const exploitationRate = totalArea > 0 ? Math.round((leasedArea / totalArea) * 100) : 0;

    return {
      totalParcels,
      totalArea,
      leasedCount,
      leasedArea,
      availableCount,
      availableArea,
      expiredCount,
      auctioningCount,
      encroachedCount,
      encroachedArea,
      annualPlannedRevenue,
      collectedRevenue,
      pendingRevenue,
      collectionRate,
      exploitationRate,
    };
  }, [parcels]);

  // Breakdown by Thôn
  const locationBreakdown = useMemo(() => {
    const map: Record<string, { count: number; area: number; revenue: number; leased: number }> = {};
    parcels.forEach((p) => {
      const locMatch = p.location.match(/Thôn\s*\d+/i);
      const locKey = locMatch ? locMatch[0] : (p.location || 'Địa bàn khác');
      if (!map[locKey]) {
        map[locKey] = { count: 0, area: 0, revenue: 0, leased: 0 };
      }
      map[locKey].count += 1;
      map[locKey].area += Number(p.area) || 0;
      map[locKey].revenue += Number(p.annualRent) || 0;
      if (p.status === 'leased') map[locKey].leased += 1;
    });

    return Object.entries(map)
      .map(([loc, data]) => ({
        location: loc,
        ...data,
        percentArea: stats.totalArea > 0 ? Math.round((data.area / stats.totalArea) * 100) : 0,
      }))
      .sort((a, b) => b.area - a.area);
  }, [parcels, stats.totalArea]);

  // Breakdown by Land Type
  const landTypeBreakdown = useMemo(() => {
    const map: Record<string, { count: number; area: number }> = {};
    parcels.forEach((p) => {
      const typeKey = p.landType || 'Khác';
      if (!map[typeKey]) map[typeKey] = { count: 0, area: 0 };
      map[typeKey].count += 1;
      map[typeKey].area += Number(p.area) || 0;
    });

    const typeLabels: Record<string, string> = {
      LUC: 'Đất chuyên trồng lúa nước',
      LUK: 'Đất trồng lúa khác',
      HNK: 'Đất trồng cây hàng năm khác',
      CLN: 'Đất trồng cây lâu năm',
      NTS: 'Đất nuôi trồng thủy sản',
      DGT: 'Đất giao thông công ích',
      DTL: 'Đất thủy lợi công ích',
    };

    return Object.entries(map).map(([key, data]) => ({
      key,
      label: typeLabels[key] || `Đất loại ${key}`,
      count: data.count,
      area: data.area,
      percent: stats.totalArea > 0 ? Math.round((data.area / stats.totalArea) * 100) : 0,
    }));
  }, [parcels, stats.totalArea]);

  // Filtered parcels for table
  const filteredParcels = useMemo(() => {
    return parcels.filter((p) => {
      if (filterLocation !== 'all' && !p.location.includes(filterLocation)) return false;
      if (filterStatus !== 'all' && p.status !== filterStatus) return false;
      if (filterPayment !== 'all' && p.paymentStatus !== filterPayment) return false;
      if (filterLandType !== 'all' && p.landType !== filterLandType) return false;

      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        const matchCode = p.code?.toLowerCase().includes(q);
        const matchParcel = p.parcel?.toLowerCase().includes(q);
        const matchMapSheet = p.mapSheet?.toLowerCase().includes(q);
        const matchLoc = p.location?.toLowerCase().includes(q);
        const matchTenant = p.tenantName?.toLowerCase().includes(q);
        const matchContract = p.contractNumber?.toLowerCase().includes(q);
        if (!matchCode && !matchParcel && !matchMapSheet && !matchLoc && !matchTenant && !matchContract) {
          return false;
        }
      }

      return true;
    });
  }, [parcels, filterLocation, filterStatus, filterPayment, filterLandType, tableSearch]);

  // Export Excel
  const handleExportExcel = () => {
    if (filteredParcels.length === 0) {
      alert('Không có dữ liệu để xuất Excel.');
      return;
    }

    const rows = filteredParcels.map((p, i) => ({
      STT: i + 1,
      'Mã thửa': p.code,
      'Thửa số': p.parcel,
      'Tờ bản đồ': p.mapSheet,
      'Vị trí / Thôn': p.location,
      'Diện tích (m2)': p.area,
      'Loại đất': p.landType,
      'Tình trạng quản lý':
        p.status === 'leased'
          ? 'Đang cho thuê'
          : p.status === 'available'
          ? 'Đất trống chưa thuê'
          : p.status === 'expired'
          ? 'Hết hạn hợp đồng'
          : p.status === 'auctioning'
          ? 'Đang đấu giá'
          : 'Bị lấn chiếm',
      'Hộ nhận thuê': p.tenantName || '---',
      'CCCD': p.tenantCccd || '---',
      'Số hợp đồng': p.contractNumber || '---',
      'Ngày hết hạn': p.leaseEndDate || '---',
      'Tiền thuê năm (VNĐ)': p.annualRent || 0,
      'Tình trạng nộp tiền':
        p.paymentStatus === 'paid'
          ? 'Đã nộp đủ'
          : p.paymentStatus === 'partially_paid'
          ? 'Nộp một phần'
          : p.paymentStatus === 'overdue'
          ? 'Quá hạn nợ đọng'
          : 'Chưa nộp',
      'Ghi chú': p.notes || '',
    }));

    exportToExcel(rows, `BaoCao_DatCongIch_5PhanTram_${periodMode}_${selectedYear}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const textElement = document.getElementById('printable-public-land-doc');
    if (textElement) {
      navigator.clipboard.writeText(textElement.innerText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadWord = () => {
    const el = document.getElementById('printable-public-land-doc');
    if (!el) return;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Bao_cao_quan_ly_quy_dat_5_phan_tram_${selectedYear}</title>
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
    fileDownload.download = `Bao_cao_quan_ly_dat_5_phan_tram_${periodMode}_${selectedYear}.doc`;
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
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Chu kỳ thời gian báo cáo quỹ đất 5%</span>
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
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Tuần
            </button>
            <button
              onClick={() => setPeriodMode('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'month'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Tháng
            </button>
            <button
              onClick={() => setPeriodMode('quarter')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'quarter'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Quý
            </button>
            <button
              onClick={() => setPeriodMode('half_year')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'half_year'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              6 Tháng
            </button>
            <button
              onClick={() => setPeriodMode('nine_months')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'nine_months'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              9 Tháng
            </button>
            <button
              onClick={() => setPeriodMode('year')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'year'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Cả năm
            </button>
            <button
              onClick={() => setPeriodMode('custom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                periodMode === 'custom'
                  ? 'bg-emerald-600 text-white shadow-xs'
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
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-lg">
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
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Thống kê & Biểu đồ trực quan
          </button>
          <button
            onClick={() => setViewMode('document')}
            className={`px-3 py-1.5 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'document'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
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
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
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
                <span className="text-xs font-medium">Tổng quỹ đất 5%</span>
                <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
                {stats.totalParcels} <span className="text-xs font-normal text-slate-400">thửa</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Diện tích: <b className="text-emerald-600">{stats.totalArea.toLocaleString('vi-VN')} m²</b>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Đang cho thuê</span>
                <FileSignature className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                {stats.leasedCount} <span className="text-xs font-normal text-slate-400">thửa</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Tỷ lệ khai thác: <b className="text-blue-600">{stats.exploitationRate}%</b> ({stats.leasedArea.toLocaleString('vi-VN')} m²)
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Tiền thuê ngân sách</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.collectedRevenue.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-400">đ</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Đạt <b className="text-emerald-600">{stats.collectionRate}%</b> kế hoạch ({stats.annualPlannedRevenue.toLocaleString('vi-VN')} đ)
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-medium">Chờ đấu giá / Lấn chiếm</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">
                {stats.availableCount + stats.auctioningCount} <span className="text-xs font-normal text-slate-400">đất trống</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Bị lấn chiếm: <b className="text-rose-600">{stats.encroachedCount} thửa</b> ({stats.encroachedArea.toLocaleString('vi-VN')} m²)
              </div>
            </div>
          </div>

          {/* CHARTS & BREAKDOWN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Phân bổ theo địa bàn thôn */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600" /> Quỹ đất 5% theo từng thôn / xứ đồng
                </span>
                <span className="text-[11px] font-normal text-slate-400">{locationBreakdown.length} địa bàn</span>
              </h4>
              <div className="space-y-2.5 text-xs max-h-72 overflow-y-auto pr-1">
                {locationBreakdown.map((item) => (
                  <div key={item.location} className="space-y-1">
                    <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">{item.location}</span>
                      <span className="text-[11px]">
                        <b>{item.count}</b> thửa • <b>{item.area.toLocaleString('vi-VN')} m²</b> ({item.percentArea}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(item.percentArea, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>Đang thuê: {item.leased} thửa</span>
                      <span className="text-emerald-600 font-semibold">{item.revenue.toLocaleString('vi-VN')} đ/năm</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Phân loại mục đích & Hiệu quả thu ngân sách */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <span className="flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-blue-600" /> Cơ cấu loại đất & Tình hình thu tiền thuê
                </span>
                <span className="text-[11px] font-normal text-slate-400">Luật Đất đai 2024</span>
              </h4>

              <div className="space-y-2.5 text-xs">
                {landTypeBreakdown.map((item) => (
                  <div key={item.key} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{item.label}</span>
                      <span className="text-[11px] text-slate-400 font-mono">Mã: {item.key}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">
                        {item.count} thửa ({item.area.toLocaleString('vi-VN')} m²)
                      </span>
                      <span className="text-[10px] text-blue-600 font-semibold">{item.percent}% tổng diện tích</span>
                    </div>
                  </div>
                ))}

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-emerald-900 dark:text-emerald-200">Tiền thuê nợ đọng cần đôn đốc:</span>
                    <b className="text-rose-600 font-bold">{stats.pendingRevenue.toLocaleString('vi-VN')} đ</b>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-medium text-emerald-900 dark:text-emerald-200">Thửa đất sắp hết hạn / Quá hạn:</span>
                    <b className="text-amber-600 font-bold">{stats.expiredCount} hợp đồng</b>
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
                placeholder="Tìm mã thửa, số thửa, tờ bản đồ, thôn, người thuê, số HĐ..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="all">Tất cả thôn / địa bàn</option>
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
                <option value="all">Tất cả tình trạng</option>
                <option value="leased">Đang cho thuê</option>
                <option value="available">Đất trống chưa thuê</option>
                <option value="expired">Hết hạn hợp đồng</option>
                <option value="auctioning">Đang đấu giá</option>
                <option value="encroached">Bị lấn chiếm</option>
              </select>

              <select
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="all">Tình trạng nộp tiền</option>
                <option value="paid">Đã nộp đủ</option>
                <option value="unpaid">Chưa nộp</option>
                <option value="overdue">Quá hạn nợ đọng</option>
              </select>

              <select
                value={filterLandType}
                onChange={(e) => setFilterLandType(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="all">Tất cả loại đất</option>
                {landTypes.map((t) => (
                  <option key={t} value={t}>
                    Loại {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* PARCELS DETAILED TABLE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-200">
                BẢNG KÊ DANH MỤC THỬA ĐẤT CÔNG ÍCH ({filteredParcels.length} thửa)
              </span>
              <span className="text-slate-500 font-normal">
                Tổng diện tích lọc: <b>{filteredParcels.reduce((s, p) => s + (Number(p.area) || 0), 0).toLocaleString('vi-VN')} m²</b>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3 font-semibold text-center w-10">STT</th>
                    <th className="py-2.5 px-3 font-semibold">Mã / Thửa số</th>
                    <th className="py-2.5 px-3 font-semibold">Vị trí / Địa bàn</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Diện tích (m²)</th>
                    <th className="py-2.5 px-3 font-semibold">Loại đất</th>
                    <th className="py-2.5 px-3 font-semibold">Tình trạng quản lý</th>
                    <th className="py-2.5 px-3 font-semibold">Hộ thuê / Hợp đồng</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Tiền thuê / năm</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Nộp tiền</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-20">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredParcels.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        Không tìm thấy thửa đất nào phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredParcels.map((p, idx) => (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          <div>
                            <span className="font-bold text-emerald-600">{p.code}</span>
                            <span className="text-slate-400 ml-1.5 font-normal">
                              Thửa {p.parcel}, TBĐ {p.mapSheet}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{p.location}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800 dark:text-slate-100">
                          {p.area.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {p.landType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {p.status === 'leased' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              Đang cho thuê
                            </span>
                          )}
                          {p.status === 'available' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              Đất trống
                            </span>
                          )}
                          {p.status === 'expired' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                              Hết hạn HĐ
                            </span>
                          )}
                          {p.status === 'auctioning' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                              Đang đấu giá
                            </span>
                          )}
                          {p.status === 'encroached' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                              Bị lấn chiếm
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                          {p.tenantName ? (
                            <div>
                              <div className="font-semibold">{p.tenantName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{p.contractNumber || 'Chưa số HĐ'}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Chưa giao thuê</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          {p.annualRent ? `${p.annualRent.toLocaleString('vi-VN')} đ` : '0 đ'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {p.paymentStatus === 'paid' && (
                            <span className="text-emerald-600 font-bold text-[10px] flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Đã nộp
                            </span>
                          )}
                          {p.paymentStatus === 'unpaid' && (
                            <span className="text-slate-400 text-[10px]">Chưa nộp</span>
                          )}
                          {p.paymentStatus === 'overdue' && (
                            <span className="text-rose-600 font-bold text-[10px] flex items-center justify-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Nợ đọng
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => onSelectParcel && onSelectParcel(p)}
                            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                            title="Xem chi tiết thửa đất"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
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
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs">
            <span className="text-emerald-800 dark:text-emerald-200 font-medium">
              Văn bản báo cáo chuẩn theo mẫu của Ủy ban nhân dân cấp xã phục vụ công tác thanh tra, kiểm tra và báo cáo HĐND xã.
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
              id="printable-public-land-doc"
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
                  CÔNG TÁC QUẢN LÝ VÀ SỬ DỤNG QUỸ ĐẤT NÔNG NGHIỆP CÔNG ÍCH (ĐẤT 5%)
                </p>
                <p className="italic text-xs text-black mt-0.5">
                  ({periodTitle} - Theo quy định tại Điều 179 Luật Đất đai số 31/2024/QH15)
                </p>
              </div>

              {/* Kính gửi */}
              <div className="text-center font-bold text-[13px] mb-4">
                Kính gửi: Thường trực Đảng ủy, HĐND và UBND xã Lãnh Ngọc.
              </div>

              {/* Nội dung báo cáo */}
              <div className="space-y-3 text-justify leading-relaxed">
                <p className="indent-8">
                  Thực hiện quy định của Luật Đất đai năm 2024 và các văn bản chỉ đạo của Ủy ban nhân dân thành phố Đà Nẵng về việc quản lý, sử dụng và đấu giá cho thuê quỹ đất nông nghiệp sử dụng vào mục đích công ích của cấp xã; Ủy ban nhân dân xã Lãnh Ngọc báo cáo tình hình quản lý, cho thuê và sử dụng quỹ đất 5% trên địa bàn trong <b>{periodTitle}</b> như sau:
                </p>

                {/* Phần I */}
                <div>
                  <h3 className="font-bold text-black uppercase text-[13px]">
                    I. HIỆN TRẠNG TỔNG QUỸ ĐẤT CÔNG ÍCH VÀ HIỆU QUẢ KHAI THÁC
                  </h3>
                  <div className="space-y-1.5 mt-1.5 ml-4">
                    <p>
                      <b>1. Về quy mô quỹ đất:</b> Tổng số thửa đất công ích (đất 5%) do UBND xã đang trực tiếp quản lý là <b>{stats.totalParcels} thửa</b>, với tổng diện tích là <b>{stats.totalArea.toLocaleString('vi-VN')} m²</b> phân bố tại các thôn trên địa bàn toàn xã.
                    </p>
                    <p>
                      <b>2. Tình hình ký kết hợp đồng cho thuê sản xuất nông nghiệp:</b>
                    </p>
                    <ul className="list-disc ml-6 space-y-1 text-[13px]">
                      <li>
                        Số thửa đang cho các hộ gia đình, cá nhân thuê canh tác theo hợp đồng: <b>{stats.leasedCount} thửa</b>, diện tích <b>{stats.leasedArea.toLocaleString('vi-VN')} m²</b> (đạt tỷ lệ khai thác <b>{stats.exploitationRate}%</b> tổng diện tích).
                      </li>
                      <li>
                        Số thửa đất công ích chưa cho thuê (đang quản lý trống): <b>{stats.availableCount} thửa</b>, diện tích <b>{stats.availableArea.toLocaleString('vi-VN')} m²</b>.
                      </li>
                      <li>
                        Số hợp đồng đã hết thời hạn hoặc sắp hết hạn cần thanh lý/đấu giá lại: <b>{stats.expiredCount} hợp đồng</b>.
                      </li>
                      <li>
                        Số thửa đang có hiện tượng bị lấn chiếm hoặc tranh chấp ranh giới: <b>{stats.encroachedCount} thửa</b> (diện tích <b>{stats.encroachedArea.toLocaleString('vi-VN')} m²</b>), hiện đang được công chức Địa chính phối hợp lập hồ sơ xử lý.
                      </li>
                    </ul>

                    <p>
                      <b>3. Kết quả thu nộp ngân sách xã từ tiền thuê đất công ích:</b>
                    </p>
                    <ul className="list-disc ml-6 space-y-1 text-[13px]">
                      <li>Kế hoạch thu tiền thuê đất cả năm: <b>{stats.annualPlannedRevenue.toLocaleString('vi-VN')} đồng</b>.</li>
                      <li>Số tiền đã thực thu nộp vào ngân sách xã trong kỳ: <b>{stats.collectedRevenue.toLocaleString('vi-VN')} đồng</b> (đạt <b>{stats.collectionRate}%</b> kế hoạch).</li>
                      <li>Số tiền thuê còn nợ đọng đang tiếp tục đôn đốc: <b>{stats.pendingRevenue.toLocaleString('vi-VN')} đồng</b>.</li>
                    </ul>
                  </div>
                </div>

                {/* Phần II: Bảng phân bổ theo thôn */}
                <div>
                  <h3 className="font-bold text-black uppercase text-[13px] mt-2">
                    II. PHÂN BỔ QUỸ ĐẤT CÔNG ÍCH THEO ĐỊA BÀN THÔN
                  </h3>
                  <div className="mt-2">
                    <table className="w-full border-collapse border border-black text-center text-xs">
                      <thead>
                        <tr className="bg-slate-100 font-bold">
                          <th className="border border-black p-1.5 w-10">STT</th>
                          <th className="border border-black p-1.5 text-left">Địa bàn Thôn / Xứ đồng</th>
                          <th className="border border-black p-1.5 w-20">Số thửa</th>
                          <th className="border border-black p-1.5 w-28">Diện tích (m²)</th>
                          <th className="border border-black p-1.5 w-24">Tỷ lệ (%)</th>
                          <th className="border border-black p-1.5 text-right">Tiền thuê / năm (đ)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locationBreakdown.map((item, idx) => (
                          <tr key={item.location}>
                            <td className="border border-black p-1">{idx + 1}</td>
                            <td className="border border-black p-1 text-left font-medium">{item.location}</td>
                            <td className="border border-black p-1">{item.count}</td>
                            <td className="border border-black p-1 font-semibold">{item.area.toLocaleString('vi-VN')}</td>
                            <td className="border border-black p-1">{item.percentArea}%</td>
                            <td className="border border-black p-1 text-right">{item.revenue.toLocaleString('vi-VN')}</td>
                          </tr>
                        ))}
                        <tr className="font-bold bg-slate-50">
                          <td colSpan={2} className="border border-black p-1.5 text-center uppercase">Tổng cộng</td>
                          <td className="border border-black p-1.5">{stats.totalParcels}</td>
                          <td className="border border-black p-1.5">{stats.totalArea.toLocaleString('vi-VN')}</td>
                          <td className="border border-black p-1.5">100%</td>
                          <td className="border border-black p-1.5 text-right">{stats.annualPlannedRevenue.toLocaleString('vi-VN')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Phần III: Khó khăn & Kiến nghị */}
                <div>
                  <h3 className="font-bold text-black uppercase text-[13px] mt-2">
                    III. ĐÁNH GIÁ, KHÓ KHĂN VÀ NHIỆM VỤ TRỌNG TÂM THỜI GIAN TỚI
                  </h3>
                  <div className="space-y-1.5 ml-4 mt-1.5">
                    <p>
                      <b>1. Tồn tại, hạn chế:</b> Một số thửa đất công ích có diện tích nhỏ hẹp, manh mún, xen kẹt trong khu dân cư khó tổ chức đấu giá sản xuất tập trung; còn {stats.encroachedCount} thửa bị người dân canh tác lấn chiếm từ trước chưa thu hồi dứt điểm.
                    </p>
                    <p>
                      <b>2. Nhiệm vụ trọng tâm thời gian tới:</b>
                    </p>
                    <ul className="list-disc ml-6 space-y-1 text-[13px]">
                      <li>
                        Tiếp tục rà soát, đo đạc xác định ranh giới cắm mốc đối với toàn bộ các thửa đất 5% còn lại trên bản đồ địa chính chính quy;
                      </li>
                      <li>
                        Lập phương án đấu giá quyền thuê đất công ích đối với {stats.availableCount} thửa đất trống theo đúng trình tự Luật Đất đai 2024 để tăng nguồn thu ngân sách địa phương;
                      </li>
                      <li>
                        Phối hợp với Tổ kiểm tra trật tự xây dựng xử lý nghiêm, kiên quyết thu hồi các thửa đất công ích bị chiếm đoạt, sử dụng sai mục đích.
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
                  <p>- Phòng TN&MT (TP Đà Nẵng);</p>
                  <p>- Ban Tài chính - Kế toán xã;</p>
                  <p>- Lưu: VT, Hồ sơ Địa chính.</p>
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
