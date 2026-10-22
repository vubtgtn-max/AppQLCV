import React, { useState, useMemo, useEffect } from 'react';
import {
  Landmark,
  Plus,
  Search,
  Filter,
  FileText,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  Edit,
  Trash2,
  FileSignature,
  Layers,
  BarChart3,
  Calendar,
  Building2,
  MapPin,
  TrendingUp,
  PieChart as PieChartIcon,
  ChevronUp,
  RotateCcw,
  MoreVertical,
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
import { useRealtime } from '../contexts/RealtimeContext';
import { useAuth } from '../contexts/AuthContext';
import { PublicLandParcel, PublicLandStatus } from '../types';
import { apiService } from '../services/api';
import { localVault } from '../services/localVault';
import { PublicLandFormModal } from '../components/publicLand/PublicLandFormModal';
import { PublicLandDetailModal } from '../components/publicLand/PublicLandDetailModal';
import { PublicLandContractModal } from '../components/publicLand/PublicLandContractModal';
import { PublicLandPaymentModal } from '../components/publicLand/PublicLandPaymentModal';
import { PublicLandPrintModal } from '../components/publicLand/PublicLandPrintModal';
import { PublicLandReportsView } from '../components/publicLand/PublicLandReportsView';
import { ConfirmModal } from '../components/common/ConfirmModal';

export const PublicLandPage: React.FC = () => {
  const { publicLands, refreshData } = useRealtime();
  const { canModifyRecord } = useAuth();

  // Navigation sub-tabs
  const [subTab, setSubTab] = useState<'parcels' | 'contracts' | 'reports'>('parcels');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [landTypeFilter, setLandTypeFilter] = useState<string>('all');

  // Analytics Chart Toggle & Filter
  const [isChartVisible, setIsChartVisible] = useState(false);
  const [chartPublicLandStatusFilter, setChartPublicLandStatusFilter] = useState<string>('all');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [parcelToEdit, setParcelToEdit] = useState<PublicLandParcel | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<PublicLandParcel | null>(null);
  const [activeMenuParcelId, setActiveMenuParcelId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuParcelId(null);
    if (activeMenuParcelId) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [activeMenuParcelId]);

  useEffect(() => {
    if (selectedParcel) {
      const latest = (publicLands || []).find((p) => p.id === selectedParcel.id);
      if (latest && JSON.stringify(latest) !== JSON.stringify(selectedParcel)) {
        setSelectedParcel(latest);
      }
    }
  }, [publicLands, selectedParcel]);

  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractParcel, setContractParcel] = useState<PublicLandParcel | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentParcel, setPaymentParcel] = useState<PublicLandParcel | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printParcel, setPrintParcel] = useState<PublicLandParcel | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{
    isOpen: boolean;
    parcel: PublicLandParcel | null;
  }>({
    isOpen: false,
    parcel: null,
  });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    const list = publicLands || [];
    const totalParcels = list.length;
    const totalArea = list.reduce((sum, p) => sum + (Number(p.area) || 0), 0);
    const leasedList = list.filter((p) => p.status === 'leased');
    const leasedArea = leasedList.reduce((sum, p) => sum + (Number(p.area) || 0), 0);
    const availableList = list.filter((p) => p.status === 'available' || p.status === 'auctioning');
    const availableArea = availableList.reduce((sum, p) => sum + (Number(p.area) || 0), 0);
    const totalAnnualRevenue = leasedList.reduce((sum, p) => sum + (Number(p.annualRent) || 0), 0);

    // Expiring soon or expired
    const expiringSoonOrExpired = list.filter((p) => {
      if (p.status === 'expired') return true;
      if (p.status !== 'leased' || !p.leaseEndDate) return false;
      const end = new Date(p.leaseEndDate);
      if (isNaN(end.getTime())) return false;
      end.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 60;
    }).length;

    const encroachedCount = list.filter((p) => p.status === 'encroached').length;

    return {
      totalParcels,
      totalArea,
      leasedCount: leasedList.length,
      leasedArea,
      availableCount: availableList.length,
      availableArea,
      totalAnnualRevenue,
      expiringSoonOrExpired,
      encroachedCount,
    };
  }, [publicLands, today]);

  // Public Land Chart calculations
  const publicLandChartData = useMemo(() => {
    const list = publicLands || [];
    const statusMeta: Record<string, { label: string; color: string }> = {
      leased: { label: 'Đang cho thuê', color: '#10b981' },
      available: { label: 'Đất trống chưa giao', color: '#3b82f6' },
      auctioning: { label: 'Đang đấu giá', color: '#f59e0b' },
      expired: { label: 'Đã hết hạn HĐ', color: '#8b5cf6' },
      encroached: { label: 'Bị lấn chiếm / Vi phạm', color: '#ef4444' },
    };

    const statusCounts: Record<string, number> = {};
    const villageAreaCounts: Record<string, number> = {};

    list.forEach((p) => {
      const st = p.status || 'available';
      statusCounts[st] = (statusCounts[st] || 0) + 1;

      const loc = p.location ? p.location.split(',')[0].trim() : 'Chưa phân thôn';
      villageAreaCounts[loc] = (villageAreaCounts[loc] || 0) + (Number(p.area) || 0);
    });

    const pieData = Object.entries(statusCounts)
      .map(([key, count]) => ({
        key,
        name: statusMeta[key]?.label || key,
        value: count,
        color: statusMeta[key]?.color || '#94a3b8',
      }))
      .filter((i) => i.value > 0);

    const barVillageData = Object.entries(villageAreaCounts)
      .map(([name, area]) => ({ name, area: Math.round(area) }))
      .sort((a, b) => b.area - a.area)
      .slice(0, 6);

    const revenueBarData = [
      { name: 'Thu NS / năm (Triệu đ)', amount: Math.round(stats.totalAnnualRevenue / 1000000), fill: '#10b981' },
      { name: 'DT đã thuê (trăm m²)', amount: Math.round(stats.leasedArea / 100), fill: '#3b82f6' },
      { name: 'DT còn trống (trăm m²)', amount: Math.round(stats.availableArea / 100), fill: '#f59e0b' },
    ];

    return {
      total: list.length,
      pieData,
      barVillageData,
      revenueBarData,
    };
  }, [publicLands, stats]);

  // Unique locations & land types for filtering
  const locations = useMemo(() => {
    const set = new Set<string>();
    (publicLands || []).forEach((p) => {
      if (p.location) set.add(p.location.split(',')[0].trim());
    });
    return Array.from(set);
  }, [publicLands]);

  // Filtered parcels
  const filteredParcels = useMemo(() => {
    return (publicLands || []).filter((p) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        p.code?.toLowerCase().includes(q) ||
        p.parcel?.toLowerCase().includes(q) ||
        p.mapSheet?.toLowerCase().includes(q) ||
        p.location?.toLowerCase().includes(q) ||
        p.tenantName?.toLowerCase().includes(q) ||
        p.tenantPhone?.toLowerCase().includes(q) ||
        p.contractNumber?.toLowerCase().includes(q);

      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchLocation = locationFilter === 'all' || p.location.includes(locationFilter);
      const matchLandType = landTypeFilter === 'all' || p.landType.includes(landTypeFilter);

      const matchChart =
        chartPublicLandStatusFilter === 'all' || p.status === chartPublicLandStatusFilter;

      return matchSearch && matchStatus && matchLocation && matchLandType && matchChart;
    });
  }, [publicLands, searchTerm, statusFilter, locationFilter, landTypeFilter, chartPublicLandStatusFilter]);

  // All active and expired contracts
  const allContracts = useMemo(() => {
    const list: Array<{ parcel: PublicLandParcel; contract: any }> = [];
    (publicLands || []).forEach((p) => {
      if (p.contracts && p.contracts.length > 0) {
        p.contracts.forEach((c) => {
          list.push({ parcel: p, contract: c });
        });
      } else if (p.tenantName && p.contractNumber) {
        list.push({
          parcel: p,
          contract: {
            id: `direct_${p.id}`,
            contractNumber: p.contractNumber,
            tenantName: p.tenantName,
            tenantPhone: p.tenantPhone,
            startDate: p.leaseStartDate || '2023-01-01',
            endDate: p.leaseEndDate || '2027-12-31',
            annualRent: p.annualRent,
            status: p.status === 'expired' ? 'expired' : 'active',
          },
        });
      }
    });
    return list;
  }, [publicLands]);

  const handleDeleteConfirm = async () => {
    if (!confirmDelete.parcel) return;
    const target = confirmDelete.parcel;
    if (!canModifyRecord(target)) {
      alert('Chỉ Admin, Lãnh đạo hoặc Cán bộ quản lý thửa đất này mới có quyền xóa.');
      setConfirmDelete({ isOpen: false, parcel: null });
      return;
    }
    try {
      await apiService.deletePublicLand(target.id);
      try {
        await localVault.deleteLocalPublicLand(target.id, target.code);
      } catch (_) {}
      if (selectedParcel?.id === target.id) {
        setIsDetailModalOpen(false);
        setSelectedParcel(null);
      }
      refreshData();
    } catch (err: any) {
      console.error('Delete public land error:', err);
      alert('Không thể xóa thửa đất: ' + (err.message || 'Lỗi hệ thống'));
    } finally {
      setConfirmDelete({ isOpen: false, parcel: null });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                QUẢN LÝ QUỸ ĐẤT CÔNG ÍCH (QUỸ ĐẤT 5%)
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Điều 179 Luật Đất Đai 2024
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quản lý danh mục đất 5%, hợp đồng thuê khoán, cảnh báo hết hạn đấu giá lại và thu ngân sách xã
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsChartVisible(!isChartVisible)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border shadow-2xs transition-colors cursor-pointer ${
              isChartVisible
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-slate-900 dark:border-slate-800 dark:text-emerald-400'
            }`}
            title="Bật/Tắt Biểu đồ phân tích đất 5%"
          >
            <BarChart3 className="w-4 h-4" />
            <span>{isChartVisible ? 'Ẩn biểu đồ' : 'Biểu đồ phân tích'}</span>
          </button>

          <button
            onClick={() => {
              setParcelToEdit(null);
              setIsFormModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Thêm thửa đất 5%
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Tổng quỹ đất 5%</span>
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
            {stats.totalParcels} <span className="text-xs font-normal text-slate-400">thửa</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Tổng diện tích: <b className="text-emerald-600">{stats.totalArea.toLocaleString('vi-VN')} m²</b>
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
            Diện tích thuê: <b>{stats.leasedArea.toLocaleString('vi-VN')} m²</b>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Thu ngân sách / năm</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.totalAnnualRevenue.toLocaleString('vi-VN')} <span className="text-xs font-normal text-slate-400">đ</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Đất trống: <b>{stats.availableCount} thửa</b> ({stats.availableArea.toLocaleString('vi-VN')} m²)
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Sắp hết hạn / Quá hạn</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400">
            {stats.expiringSoonOrExpired} <span className="text-xs font-normal text-slate-400">hợp đồng</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Bị lấn chiếm: <b className="text-rose-600">{stats.encroachedCount} thửa</b>
          </div>
        </div>
      </div>

      {/* Collapsible Executive Analytics Panel */}
      {isChartVisible && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200 dark:border-slate-800 shadow-xs overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3.5 border-b border-emerald-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white dark:from-emerald-950/20 dark:to-slate-900">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide flex items-center gap-2">
                  Phân tích Cơ cấu & Hiệu quả Quỹ đất 5%
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/60 dark:text-emerald-300">
                    {stats.totalParcels} Thửa • {stats.totalArea.toLocaleString('vi-VN')} m²
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Phân bổ theo tình trạng pháp lý, diện tích đất 5% theo thôn và doanh thu thu nộp ngân sách
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {chartPublicLandStatusFilter !== 'all' && (
                <button
                  onClick={() => setChartPublicLandStatusFilter('all')}
                  className="text-xs px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                  title="Xem tất cả thửa đất"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Xóa lọc tình trạng</span>
                </button>
              )}
              <button
                onClick={() => setIsChartVisible(false)}
                className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 font-medium transition-colors cursor-pointer"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Thu gọn</span>
              </button>
            </div>
          </div>

          <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left: Recharts Donut Pie Chart */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
              <div className="w-full h-52 relative flex items-center justify-center">
                {publicLandChartData.total === 0 ? (
                  <div className="text-xs text-slate-400">Chưa có thửa đất nào</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={publicLandChartData.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                        cursor="pointer"
                        onClick={(entry: any) => {
                          if (entry && entry.key) {
                            setChartPublicLandStatusFilter((prev) => (prev === entry.key ? 'all' : entry.key));
                          }
                        }}
                      >
                        {publicLandChartData.pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke={chartPublicLandStatusFilter === entry.key ? '#047857' : '#ffffff'}
                            strokeWidth={chartPublicLandStatusFilter === entry.key ? 3 : 1.5}
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: any, name: any) => [`${value} thửa đất`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                {/* Center metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">
                    {publicLandChartData.total}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">
                    Thửa đất
                  </span>
                </div>
              </div>

              {/* Mini Legend Buttons */}
              <div className="w-full grid grid-cols-2 gap-1.5 mt-2">
                {publicLandChartData.pieData.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setChartPublicLandStatusFilter((prev) => (prev === item.key ? 'all' : item.key))}
                    className={`p-1.5 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                      chartPublicLandStatusFilter === item.key
                        ? 'border-emerald-500 ring-2 ring-emerald-200 bg-white dark:bg-slate-800'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-900 dark:text-white ml-1">{item.value}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Middle: Area Distribution by Village (Bar Chart) */}
            <div className="lg:col-span-4 flex flex-col justify-between bg-slate-50/50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Diện tích đất 5% theo Thôn
                </span>
                <span className="text-[10px] text-slate-400">m²</span>
              </div>
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={publicLandChartData.barVillageData} layout="vertical" margin={{ top: 5, right: 15, left: 15, bottom: 5 }}>
                    <XAxis type="number" allowDecimals={false} hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={95}
                      tick={{ fontSize: 10, fill: '#475569' }}
                    />
                    <RechartsTooltip formatter={(val: any) => [`${Number(val).toLocaleString('vi-VN')} m²`, 'Diện tích']} />
                    <Bar dataKey="area" fill="#10b981" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-slate-500 text-center mt-1">
                Phản ánh sự phân bổ quỹ đất nông nghiệp công ích trên địa bàn xã
              </div>
            </div>

            {/* Right: Revenue & Leased Ratio (Bar Chart) */}
            <div className="lg:col-span-4 flex flex-col justify-between bg-slate-50/50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                  Hiệu quả khai thác quỹ đất
                </span>
                <span className="text-[10px] text-slate-400">Chỉ số</span>
              </div>
              <div className="w-full h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={publicLandChartData.revenueBarData} layout="vertical" margin={{ top: 5, right: 15, left: 15, bottom: 5 }}>
                    <XAxis type="number" allowDecimals={false} hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={125}
                      tick={{ fontSize: 9.5, fill: '#475569' }}
                    />
                    <RechartsTooltip formatter={(val: any, name: any, props: any) => [`${Number(val).toLocaleString('vi-VN')}`, props.payload.name]} />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {publicLandChartData.revenueBarData.map((entry, index) => (
                        <Cell key={`bar-rev-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-slate-500 text-center mt-1">
                Thu ngân sách: <b>{stats.totalAnnualRevenue.toLocaleString('vi-VN')} đ/năm</b> • Đã thuê: <b>{stats.leasedCount} thửa</b>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs font-medium">
        <button
          onClick={() => setSubTab('parcels')}
          className={`px-4 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            subTab === 'parcels'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" /> Danh mục quỹ đất 5% ({publicLands?.length || 0})
        </button>
        <button
          onClick={() => setSubTab('contracts')}
          className={`px-4 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            subTab === 'contracts'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileSignature className="w-3.5 h-3.5" /> Hợp đồng thuê đất & Thu tiền ({allContracts.length})
        </button>
        <button
          onClick={() => setSubTab('reports')}
          className={`px-4 py-2 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            subTab === 'reports'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-emerald-600" /> Báo cáo định kỳ quỹ đất 5% (Tuần • Tháng • Quý • 6T • 9T • Năm)
        </button>
      </div>

      {subTab === 'parcels' && (
        <div className="space-y-3">
          {/* Filter & Search Bar */}
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo số thửa, tờ bản đồ, xứ đồng, người thuê, số hợp đồng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="all">Tất cả hiện trạng</option>
                <option value="leased">Đang cho thuê</option>
                <option value="available">Đất trống (Chưa thuê)</option>
                <option value="expired">Hết hạn hợp đồng</option>
                <option value="auctioning">Đang đấu giá</option>
                <option value="encroached">Bị lấn chiếm</option>
              </select>

              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="all">Tất cả khu vực/thôn</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>

              <select
                value={landTypeFilter}
                onChange={(e) => setLandTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value="all">Tất cả loại đất</option>
                <option value="LUC">Đất lúa (LUC)</option>
                <option value="HNK">Đất hoa màu (HNK)</option>
                <option value="CLN">Cây lâu năm (CLN)</option>
                <option value="NTS">Thủy sản (NTS)</option>
              </select>
            </div>
          </div>

          {/* Table of Public Land Parcels */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-3.5 py-2.5">Mã Thửa</th>
                    <th className="px-3.5 py-2.5">Thửa / TBĐ</th>
                    <th className="px-3.5 py-2.5">Vị Trí / Xứ Đồng</th>
                    <th className="px-3.5 py-2.5 text-right">Diện Tích</th>
                    <th className="px-3.5 py-2.5">Loại Đất</th>
                    <th className="px-3.5 py-2.5">Hiện Trạng Quản Lý</th>
                    <th className="px-3.5 py-2.5">Bên Thuê / Hợp Đồng</th>
                    <th className="px-3.5 py-2.5 text-right">Tiền Thuê/Năm</th>
                    <th className="px-3.5 py-2.5 text-center">Nộp Ngân Sách</th>
                    <th className="px-3.5 py-2.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredParcels.length > 0 ? (
                    filteredParcels.map((parcel) => (
                      <tr
                        key={parcel.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-3.5 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {parcel.code}
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="font-bold text-slate-800 dark:text-slate-100">Thửa {parcel.parcel}</span>
                          <span className="text-[11px] text-slate-400 block">TBĐ {parcel.mapSheet}</span>
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="font-medium text-slate-800 dark:text-slate-200 block">{parcel.location}</span>
                          <span className="text-[11px] text-slate-400 truncate max-w-[200px] block" title={parcel.planningPurpose}>
                            {parcel.planningPurpose}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-right font-bold text-slate-800 dark:text-slate-100">
                          {parcel.area.toLocaleString('vi-VN')} m²
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                            {parcel.landType}
                          </span>
                        </td>
                        <td className="px-3.5 py-3">
                          {parcel.status === 'leased' ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                              Đang cho thuê
                            </span>
                          ) : parcel.status === 'available' ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              Đất trống
                            </span>
                          ) : parcel.status === 'expired' ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                              Hết hạn HĐ
                            </span>
                          ) : parcel.status === 'auctioning' ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              Đang đấu giá
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                              Bị lấn chiếm
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3">
                          {parcel.tenantName ? (
                            <div>
                              <div className="font-semibold text-slate-800 dark:text-slate-100">{parcel.tenantName}</div>
                              <div className="text-[11px] font-mono text-slate-400">
                                {parcel.contractNumber} ({parcel.leaseStartDate?.slice(0, 4)} - {parcel.leaseEndDate?.slice(0, 4)})
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Chưa cho thuê</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-right font-semibold text-slate-800 dark:text-slate-100">
                          {parcel.annualRent ? `${parcel.annualRent.toLocaleString('vi-VN')} đ` : '0 đ'}
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          {parcel.status === 'leased' ? (
                            parcel.paymentStatus === 'paid' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                Đã nộp
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                                Chưa nộp
                              </span>
                            )
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-right relative" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedParcel(parcel);
                                setIsDetailModalOpen(true);
                              }}
                              title="Xem chi tiết"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            {canModifyRecord(parcel) ? (
                              <>
                                <button
                                  onClick={() => {
                                    setParcelToEdit(parcel);
                                    setIsFormModalOpen(true);
                                  }}
                                  title="Sửa thông tin thửa đất"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                {/* 3-dot Secondary Menu */}
                                <div className="relative inline-block text-left">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuParcelId(activeMenuParcelId === parcel.id ? null : parcel.id);
                                    }}
                                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                      activeMenuParcelId === parcel.id
                                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                                        : 'text-slate-400 border-transparent hover:border-slate-200 hover:bg-slate-100'
                                    }`}
                                    title="Thao tác khác"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>

                                  {activeMenuParcelId === parcel.id && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-40 text-left animate-in fade-in-50 zoom-in-95"
                                    >
                                      <button
                                        onClick={() => {
                                          setActiveMenuParcelId(null);
                                          setPaymentParcel(parcel);
                                          setIsPaymentModalOpen(true);
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                        Thu tiền thuê đất
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveMenuParcelId(null);
                                          setContractParcel(parcel);
                                          setIsContractModalOpen(true);
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        <FileSignature className="w-3.5 h-3.5 text-blue-600" />
                                        Lập / gia hạn hợp đồng
                                      </button>
                                      <button
                                        onClick={() => {
                                          setActiveMenuParcelId(null);
                                          setPrintParcel(parcel);
                                          setIsPrintModalOpen(true);
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                                        In hợp đồng thuê đất
                                      </button>
                                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                      <button
                                        onClick={() => {
                                          setActiveMenuParcelId(null);
                                          setConfirmDelete({ isOpen: true, parcel });
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                        Xóa thửa đất
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <span
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-semibold select-none"
                                title="Thửa đất của cán bộ khác (Chỉ xem)"
                              >
                                Chỉ xem
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                        Không tìm thấy thửa đất công ích nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'contracts' && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Danh Sách Hợp Đồng Thuê Khoán & Lịch Sử Thu Tiền Ngân Sách
                </h3>
                <p className="text-[11px] text-slate-400">
                  Hợp đồng cho thuê quỹ đất 5% xã Lãnh Ngọc chu kỳ đến 5 năm theo Luật Đất đai
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-3.5 py-2.5">Số Hợp Đồng</th>
                    <th className="px-3.5 py-2.5">Thửa Đất & Vị Trí</th>
                    <th className="px-3.5 py-2.5">Bên Thuê (Họ tên & SĐT)</th>
                    <th className="px-3.5 py-2.5">Thời Hạn Thuê</th>
                    <th className="px-3.5 py-2.5 text-right">Giá Thuê/Năm</th>
                    <th className="px-3.5 py-2.5 text-center">Trạng Thái HĐ</th>
                    <th className="px-3.5 py-2.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {allContracts.length > 0 ? (
                    allContracts.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-3.5 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {item.contract.contractNumber}
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            Thửa {item.parcel.parcel}, TBĐ {item.parcel.mapSheet}
                          </span>
                          <span className="text-[11px] text-slate-400 block">{item.parcel.location}</span>
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="font-semibold text-slate-800 dark:text-slate-100 block">
                            {item.contract.tenantName}
                          </span>
                          <span className="text-[11px] text-slate-400">{item.contract.tenantPhone || 'Không có SĐT'}</span>
                        </td>
                        <td className="px-3.5 py-3">
                          <span>{item.contract.startDate} đến {item.contract.endDate}</span>
                        </td>
                        <td className="px-3.5 py-3 text-right font-bold text-emerald-600">
                          {Number(item.contract.annualRent).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="px-3.5 py-3 text-center">
                          {item.contract.status === 'expired' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                              Đã hết hạn
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                              Đang hiệu lực
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setPrintParcel(item.parcel);
                                setIsPrintModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3 h-3" /> In hợp đồng
                            </button>
                            {canModifyRecord(item.parcel) && (
                              <button
                                onClick={() => {
                                  setPaymentParcel(item.parcel);
                                  setIsPaymentModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1 cursor-pointer"
                              >
                                <DollarSign className="w-3 h-3" /> Thu tiền
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Chưa có hợp đồng thuê nào được ghi nhận.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'reports' && (
        <PublicLandReportsView
          parcels={publicLands || []}
          onSelectParcel={(p) => {
            setSelectedParcel(p);
            setIsDetailModalOpen(true);
          }}
          onOpenContract={(p) => {
            if (!canModifyRecord(p)) {
              alert('Chỉ Admin, Lãnh đạo hoặc Cán bộ quản lý thửa đất này mới có quyền lập hợp đồng.');
              return;
            }
            setContractParcel(p);
            setIsContractModalOpen(true);
          }}
          onOpenPayment={(p) => {
            if (!canModifyRecord(p)) {
              alert('Chỉ Admin, Lãnh đạo hoặc Cán bộ quản lý thửa đất này mới có quyền cập nhật thu tiền.');
              return;
            }
            setPaymentParcel(p);
            setIsPaymentModalOpen(true);
          }}
        />
      )}

      {/* Modals */}
      <PublicLandFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        parcelToEdit={parcelToEdit}
        onSuccess={() => {
          setIsFormModalOpen(false);
          refreshData();
        }}
      />

      <PublicLandDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        parcel={selectedParcel}
        onOpenEdit={(p) => {
          if (!canModifyRecord(p)) {
            alert('Chỉ Admin, Lãnh đạo hoặc Cán bộ quản lý thửa đất này mới có quyền chỉnh sửa.');
            return;
          }
          setParcelToEdit(p);
          setIsFormModalOpen(true);
        }}
        onOpenPayment={(p) => {
          if (!canModifyRecord(p)) {
            alert('Chỉ Admin, Lãnh đạo hoặc Cán bộ quản lý thửa đất này mới có quyền cập nhật thu tiền.');
            return;
          }
          setPaymentParcel(p);
          setIsPaymentModalOpen(true);
        }}
        onOpenContract={(p) => {
          if (!canModifyRecord(p)) {
            alert('Chỉ Admin, Lãnh đạo hoặc Cán bộ quản lý thửa đất này mới có quyền lập hợp đồng.');
            return;
          }
          setContractParcel(p);
          setIsContractModalOpen(true);
        }}
        onPrintContract={(p) => {
          setPrintParcel(p);
          setIsPrintModalOpen(true);
        }}
      />

      <PublicLandContractModal
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        parcel={contractParcel}
        onSuccess={() => {
          setIsContractModalOpen(false);
          refreshData();
        }}
      />

      <PublicLandPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        parcel={paymentParcel}
        onSuccess={() => {
          setIsPaymentModalOpen(false);
          refreshData();
        }}
      />

      <PublicLandPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        parcel={printParcel}
      />

      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Xóa Thửa Đất Công Ích 5%"
        message={`Bạn có chắc chắn muốn xóa thửa đất [${confirmDelete.parcel?.code}] Thửa ${confirmDelete.parcel?.parcel}, TBĐ ${confirmDelete.parcel?.mapSheet}? Hành động này không thể hoàn tác.`}
        confirmText="Xóa thửa đất"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setConfirmDelete({ isOpen: false, parcel: null })}
      />
    </div>
  );
};
