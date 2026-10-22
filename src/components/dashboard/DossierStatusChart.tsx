import React, { useState, useMemo } from 'react';
import { Dossier } from '../../types';
import { isDossierOverdue } from '../../utils/date';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  FolderArchive,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileQuestion,
  TrendingUp,
  ArrowRight,
  PieChart as PieIcon,
  BarChart3,
  Users,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface DossierStatusChartProps {
  dossiers: Dossier[];
  onNavigateToDossiers: (statusFilter?: string) => void;
}

interface StatusItem {
  key: string;
  name: string;
  shortName: string;
  count: number;
  percentage: number;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export const DossierStatusChart: React.FC<DossierStatusChartProps> = ({
  dossiers,
  onNavigateToDossiers,
}) => {
  const [chartType, setChartType] = useState<'donut' | 'bar'>('donut');
  const [activeTab, setActiveTab] = useState<'status' | 'handler'>('status');

  // Compute status partition
  const { statusData, totalCount, resolvedCount, inProgressCount, pendingCount, overdueCount } = useMemo(() => {
    let resolved = 0;
    let overdue = 0;
    let pending = 0; // supplement or paused
    let inProgress = 0;

    dossiers.forEach((d) => {
      const isOverdue = isDossierOverdue(d);
      if (d.status === 'resolved') {
        resolved++;
      } else if (d.status === 'overdue' || isOverdue) {
        overdue++;
      } else if (
        d.status === 'supplement' ||
        d.status === 'paused' ||
        (d.supplementDate && !d.resumedDate && d.status !== 'resolved')
      ) {
        pending++;
      } else {
        inProgress++;
      }
    });

    const total = dossiers.length;

    const data: StatusItem[] = [
      {
        key: 'in_progress',
        name: 'Đang làm / Đang thụ lý',
        shortName: 'Đang làm',
        count: inProgress,
        percentage: total > 0 ? Math.round((inProgress / total) * 100) : 0,
        color: '#2563eb', // Blue-600
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        icon: Clock,
        description: 'Hồ sơ đang trong thời hạn giải quyết',
      },
      {
        key: 'supplement',
        name: 'Chờ xử lý / Bổ sung',
        shortName: 'Chờ xử lý',
        count: pending,
        percentage: total > 0 ? Math.round((pending / total) * 100) : 0,
        color: '#f59e0b', // Amber-500
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
        icon: FileQuestion,
        description: 'Yêu cầu bổ sung (Mẫu 02) hoặc tạm dừng',
      },
      {
        key: 'resolved',
        name: 'Đã hoàn thành',
        shortName: 'Hoàn thành',
        count: resolved,
        percentage: total > 0 ? Math.round((resolved / total) * 100) : 0,
        color: '#10b981', // Emerald-500
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-200',
        icon: CheckCircle2,
        description: 'Đã có kết quả và trả cho công dân',
      },
      {
        key: 'overdue',
        name: 'Quá hạn / Cần xử lý gấp',
        shortName: 'Quá hạn',
        count: overdue,
        percentage: total > 0 ? Math.round((overdue / total) * 100) : 0,
        color: '#ef4444', // Rose-500
        bgColor: 'bg-rose-50',
        textColor: 'text-rose-700',
        borderColor: 'border-rose-200',
        icon: AlertTriangle,
        description: 'Đã vượt quá hạn hẹn giải quyết',
      },
    ];

    return {
      statusData: data,
      totalCount: total,
      resolvedCount: resolved,
      inProgressCount: inProgress,
      pendingCount: pending,
      overdueCount: overdue,
    };
  }, [dossiers]);

  // Compute breakdown by handler
  const handlerData = useMemo(() => {
    const handlerMap: Record<string, { name: string; inProgress: number; pending: number; resolved: number; overdue: number; total: number }> = {};

    dossiers.forEach((d) => {
      const hName = d.handlerName || 'Chưa phân công';
      if (!handlerMap[hName]) {
        handlerMap[hName] = { name: hName, inProgress: 0, pending: 0, resolved: 0, overdue: 0, total: 0 };
      }
      handlerMap[hName].total++;

      const isOverdue = isDossierOverdue(d);
      if (d.status === 'resolved') {
        handlerMap[hName].resolved++;
      } else if (d.status === 'overdue' || isOverdue) {
        handlerMap[hName].overdue++;
      } else if (
        d.status === 'supplement' ||
        d.status === 'paused' ||
        (d.supplementDate && !d.resumedDate && d.status !== 'resolved')
      ) {
        handlerMap[hName].pending++;
      } else {
        handlerMap[hName].inProgress++;
      }
    });

    return Object.values(handlerMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [dossiers]);

  // Completion rate
  const completionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;
  const onTimeRate = totalCount > 0 ? Math.round(((totalCount - overdueCount) / totalCount) * 100) : 100;

  // Custom Tooltip for Donut Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as StatusItem;
      return (
        <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-gray-200 shadow-xl text-xs z-50">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="font-bold text-slate-800">{item.name}</span>
          </div>
          <div className="space-y-1 text-slate-600">
            <div className="flex items-center justify-between gap-4">
              <span>Số lượng:</span>
              <strong className="text-slate-900 font-extrabold text-sm">{item.count} hồ sơ</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Tỷ lệ cơ cấu:</span>
              <span className="font-bold text-blue-600">{item.percentage}%</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 border-t border-gray-100 pt-1 italic">{item.description}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Bar Chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-gray-200 shadow-xl text-xs z-50 min-w-[160px]">
          <p className="font-bold text-slate-900 border-b border-gray-100 pb-1 mb-1.5">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3 py-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-600">{entry.name}:</span>
              </div>
              <strong className="text-slate-900">{entry.value} hồ sơ</strong>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <FolderArchive className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Biểu đồ Tóm tắt Tình hình Hồ sơ Đất đai
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              {totalCount} hồ sơ
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp thời gian thực theo trạng thái giải quyết Một cửa cấp xã (Đang làm, Chờ xử lý, Đã hoàn thành, Quá hạn).
          </p>
        </div>

        {/* View Controls & Action */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Sub-tabs: Trạng thái vs Cán bộ */}
          <div className="p-0.5 rounded-lg bg-slate-200/80 flex items-center text-xs font-medium">
            <button
              onClick={() => setActiveTab('status')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'status' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Theo trạng thái
            </button>
            <button
              onClick={() => setActiveTab('handler')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                activeTab === 'handler' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Theo cán bộ thụ lý
            </button>
          </div>

          {/* Chart Type Toggle: Donut vs Bar (active on status tab) */}
          {activeTab === 'status' && (
            <div className="p-0.5 rounded-lg bg-slate-200/80 flex items-center text-xs font-medium">
              <button
                onClick={() => setChartType('donut')}
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  chartType === 'donut' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Biểu đồ tròn (Donut)"
              >
                <PieIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`p-1 rounded-md transition-all cursor-pointer ${
                  chartType === 'bar' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Biểu đồ cột (Bar Chart)"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            onClick={() => onNavigateToDossiers('all')}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
          >
            <span>Vào sổ hồ sơ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-4 sm:p-5">
        {totalCount === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <FolderArchive className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-xs">Chưa có dữ liệu hồ sơ đất đai nào để hiển thị biểu đồ.</p>
          </div>
        ) : activeTab === 'status' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Chart Column (5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[260px]">
              {chartType === 'donut' ? (
                <>
                  <div className="w-full h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip content={<CustomPieTooltip />} />
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="count"
                          cursor="pointer"
                          onClick={(data: any) => {
                            const key = data?.payload?.key || data?.key;
                            if (key) {
                              onNavigateToDossiers(key);
                            }
                          }}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Center Stat Inside Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng cộng</span>
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{totalCount}</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-0.5">
                      {completionRate}% hoàn thành
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-full h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statusData}
                      margin={{ top: 15, right: 15, left: -15, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="shortName"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                      <Tooltip content={<CustomPieTooltip />} />
                      <Bar
                        dataKey="count"
                        radius={[6, 6, 0, 0]}
                        cursor="pointer"
                        onClick={(data: any) => {
                          if (data && data.key) onNavigateToDossiers(data.key);
                        }}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Status Breakdown Metric Cards (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {statusData.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.key}
                      onClick={() => onNavigateToDossiers(item.key)}
                      className={`group p-3 rounded-xl border ${item.borderColor} ${item.bgColor} hover:shadow-md transition-all cursor-pointer flex flex-col justify-between`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-2xs"
                            style={{ backgroundColor: item.color, color: '#ffffff' }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-800 line-clamp-1">{item.name}</span>
                            <span className="text-[10px] text-slate-500 font-medium block">
                              {item.percentage}% tổng hồ sơ
                            </span>
                          </div>
                        </div>
                        <span className="text-lg font-black tracking-tight" style={{ color: item.color }}>
                          {item.count}
                        </span>
                      </div>

                      {/* Mini Progress Bar */}
                      <div className="mt-2 w-full bg-white/80 h-1.5 rounded-full overflow-hidden border border-gray-200/50">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(item.percentage, 4)}%`, backgroundColor: item.color }}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/40">
                        <span className="truncate pr-1">{item.description}</span>
                        <span className="font-bold flex items-center gap-0.5 group-hover:underline shrink-0" style={{ color: item.color }}>
                          Lọc <ChevronRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Bottom Bar */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-600">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Chỉ số đúng hạn Một cửa: <strong className="text-slate-900 font-extrabold">{onTimeRate}%</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span>Đang thụ lý: <strong className="text-blue-600 font-bold">{inProgressCount}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>Chờ bổ sung: <strong className="text-amber-600 font-bold">{pendingCount}</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>Quá hạn: <strong className="text-rose-600 font-bold">{overdueCount}</strong></span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Handler Breakdown View */
          <div className="space-y-3">
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={handlerData}
                  margin={{ top: 15, right: 20, left: 0, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#334155' }}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
                  />
                  <Bar dataKey="inProgress" name="Đang làm" fill="#2563eb" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pending" name="Chờ xử lý / Bổ sung" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="resolved" name="Đã hoàn thành" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="overdue" name="Quá hạn" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-slate-400 text-center italic">
              Biểu đồ phân bổ khối lượng hồ sơ địa chính giữa các Cán bộ thụ lý thuộc UBND xã Lãnh Ngọc.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
