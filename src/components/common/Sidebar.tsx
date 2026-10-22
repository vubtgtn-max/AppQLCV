import React, { useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  FolderArchive,
  CalendarDays,
  BookOpen,
  BarChart3,
  History,
  Users,
  FileText,
  Settings,
  X,
  Building2,
  BellRing,
  Landmark,
  Scale,
  Wheat,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from 'lucide-react';
import { useRealtime } from '../../contexts/RealtimeContext';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOpen,
  onClose,
  onOpen,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { tasks, dossiers, projects, disputes, publicLands, violations, registerBooks } = useRealtime();

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const overdueTasksCount = tasks.filter((t) => t.status === 'overdue').length;
  const inProgressTasksCount = tasks.filter((t) => t.status === 'in_progress').length;
  const inProgressDossiersCount = dossiers.filter((d) => d.status === 'in_progress' || d.status === 'overdue').length;
  const activeProjectsCount = (projects || []).filter((p) => p.status !== 'completed' && p.status !== 'cancelled').length;
  const activeDisputesCount = (disputes || []).filter(
    (d) => d.status !== 'resolved_success' && d.status !== 'resolved_failure' && d.status !== 'withdrawn'
  ).length;
  const activeViolationsCount = (violations || []).filter((v) => v.status !== 'resolved').length;
  const leasedPublicLandsCount = (publicLands || []).filter((p) => p.status === 'leased').length;
  const registerBooksCount = (registerBooks || []).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const urgentAlertsCount = [...tasks, ...dossiers].filter((item) => {
    if ((item as any).status === 'completed' || (item as any).status === 'resolved' || (item as any).status === 'cancelled') return false;
    if (!item.dueDate) return false;
    const due = new Date(item.dueDate);
    due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff <= 7;
  }).length;

  const menuSections = [
    {
      key: 'core',
      title: 'ĐIỀU HÀNH CHUNG',
      items: [
        {
          id: 'dashboard',
          label: 'Tổng quan',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'tasks',
          label: 'Nhiệm vụ công việc',
          icon: CheckSquare,
          badge: inProgressTasksCount > 0 ? `${inProgressTasksCount}` : null,
          badgeColor: overdueTasksCount > 0 ? 'bg-rose-500 text-white' : 'bg-blue-500/20 text-blue-300',
        },
        {
          id: 'calendar',
          label: 'Lịch & Hạn chót',
          icon: CalendarDays,
          badge: null,
        },
        {
          id: 'alerts',
          label: 'Nhắc việc Telegram',
          icon: BellRing,
          badge: urgentAlertsCount > 0 ? `${urgentAlertsCount}` : null,
          badgeColor: 'bg-amber-500 text-slate-950 font-bold',
        },
      ],
    },
    {
      key: 'land',
      title: 'NGHIỆP VỤ ĐẤT ĐAI',
      items: [
        {
          id: 'dossiers',
          label: 'Hồ sơ địa chính',
          icon: FolderArchive,
          badge: inProgressDossiersCount > 0 ? `${inProgressDossiersCount}` : null,
          badgeColor: 'bg-emerald-500/20 text-emerald-300 font-semibold',
        },
        {
          id: 'projects',
          label: 'Dự án & GPMB',
          icon: Landmark,
          badge: activeProjectsCount > 0 ? `${activeProjectsCount}` : null,
          badgeColor: 'bg-indigo-500/20 text-indigo-300 font-semibold',
        },
        {
          id: 'publicLand',
          label: 'Quỹ đất công 5%',
          icon: Wheat,
          badge: leasedPublicLandsCount > 0 ? `${leasedPublicLandsCount}` : null,
          badgeColor: 'bg-emerald-500/20 text-emerald-300 font-semibold',
        },
        {
          id: 'violations',
          label: 'Vi phạm & Trật tự XD',
          icon: ShieldAlert,
          badge: activeViolationsCount > 0 ? `${activeViolationsCount}` : null,
          badgeColor: 'bg-rose-500/25 text-rose-300 font-semibold',
        },
        {
          id: 'disputes',
          label: 'Tranh chấp & Hòa giải',
          icon: Scale,
          badge: activeDisputesCount > 0 ? `${activeDisputesCount}` : null,
          badgeColor: 'bg-amber-500/25 text-amber-300 font-semibold',
        },
      ],
    },
    {
      key: 'records',
      title: 'SỔ BỘ & THỐNG KÊ',
      items: [
        {
          id: 'reports',
          label: 'Báo cáo thống kê',
          icon: BarChart3,
          badge: null,
        },
        {
          id: 'documents',
          label: 'Văn bản điều hành',
          icon: FileText,
          badge: null,
        },
        {
          id: 'registerBooks',
          label: 'Sổ bộ theo dõi',
          icon: BookOpen,
          badge: registerBooksCount > 0 ? `${registerBooksCount}` : null,
          badgeColor: 'bg-amber-500/20 text-amber-300 font-semibold',
        },
      ],
    },
    {
      key: 'system',
      title: 'HỆ THỐNG',
      items: [
        {
          id: 'users',
          label: 'Cán bộ & Phân quyền',
          icon: Users,
          badge: null,
        },
        {
          id: 'activityLogs',
          label: 'Nhật ký tác nghiệp',
          icon: History,
          badge: null,
        },
        {
          id: 'settings',
          label: 'Cấu hình đơn vị',
          icon: Settings,
          badge: null,
        },
      ],
    },
  ];

  const mobileBottomItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard, badge: null },
    { id: 'tasks', label: 'Nhiệm vụ', icon: CheckSquare, badge: inProgressTasksCount || null },
    { id: 'dossiers', label: 'Hồ sơ', icon: FolderArchive, badge: inProgressDossiersCount || null },
    { id: 'alerts', label: 'Cảnh báo', icon: BellRing, badge: urgentAlertsCount || null },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-slate-900 text-white border-r border-slate-800/90 flex flex-col transition-all duration-200 ease-in-out lg:translate-x-0 ${
          isCollapsed ? 'lg:w-[64px]' : 'lg:w-[232px]'
        } w-[250px] max-w-[82vw] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Brand header */}
        <div className="h-12 flex items-center justify-between px-3 border-b border-slate-800/90 bg-slate-950/90 shrink-0">
          <div className={`flex items-center gap-2 min-w-0 ${isCollapsed ? 'lg:justify-center lg:w-full' : ''}`}>
            <div
              onClick={() => onTabChange('dashboard')}
              className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xs font-bold shrink-0 cursor-pointer"
              title="Trung tâm Điều hành Đất đai"
            >
              <Building2 className="w-4 h-4" />
            </div>
            <div className={`min-w-0 ${isCollapsed ? 'lg:hidden' : ''}`}>
              <div className="font-extrabold text-xs tracking-wide text-white uppercase flex items-center gap-1 leading-none">
                <span>QLCV ĐẤT ĐAI</span>
                <span className="text-[8px] px-1 py-0.5 rounded bg-blue-500/30 text-blue-300 border border-blue-400/30 font-bold shrink-0">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">UBND xã Lãnh Ngọc</p>
            </div>
          </div>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={`hidden lg:flex p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ${
                isCollapsed ? 'mx-auto mt-1 hidden' : ''
              }`}
              title={isCollapsed ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'}
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2.5 scrollbar-thin">
          {menuSections.map((section) => {
            const hasActiveItem = section.items.some((i) => i.id === activeTab);
            const isSectionCollapsed = Boolean(collapsedSections[section.key]) && !hasActiveItem && !isCollapsed;

            return (
              <div key={section.key} className="space-y-0.5">
                {!isCollapsed ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.key)}
                    className="w-full flex items-center justify-between px-2 py-1 text-[9px] uppercase font-bold text-slate-400 hover:text-slate-200 tracking-wider transition-colors cursor-pointer"
                  >
                    <span>{section.title}</span>
                    {isSectionCollapsed ? (
                      <ChevronRight className="w-3 h-3 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    )}
                  </button>
                ) : (
                  <div className="hidden lg:block h-px bg-slate-800/80 my-1.5 mx-2" />
                )}

                {!isSectionCollapsed && (
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onTabChange(item.id);
                            onClose();
                          }}
                          title={item.label}
                          className={`w-full relative flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer text-left group ${
                            isCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : ''
                          } ${
                            isActive
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-xs'
                              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                          }`}
                        >
                          <div className={`flex items-center gap-2 min-w-0 flex-1 text-left ${isCollapsed ? 'lg:justify-center lg:flex-none' : ''}`}>
                            <Icon
                              className={`w-3.5 h-3.5 shrink-0 transition-transform group-hover:scale-105 ${
                                isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                              }`}
                            />
                            <span className={`truncate whitespace-nowrap text-left ${isCollapsed ? 'lg:hidden' : ''}`}>
                              {item.label}
                            </span>
                          </div>
                          {item.badge && (
                            <span
                              className={`shrink-0 ml-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full leading-tight ${
                                isCollapsed ? 'lg:absolute lg:top-1 lg:right-1 lg:px-1 lg:min-w-[14px] lg:text-[8px] lg:text-center' : ''
                              } ${
                                isActive ? 'bg-white/25 text-white' : item.badgeColor || 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info & Collapse Toggle */}
        <div className="p-2.5 bg-slate-950/90 text-[10px] border-t border-slate-800/90 shrink-0">
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex w-full items-center justify-center gap-1.5 py-1.5 mb-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer font-semibold"
              title={isCollapsed ? 'Mở rộng menu (Ctrl+B)' : 'Thu gọn menu'}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <>
                  <PanelLeftClose className="w-3.5 h-3.5 text-blue-400" />
                  <span>Thu gọn menu</span>
                </>
              )}
            </button>
          )}
          <div className={`flex justify-between items-center ${isCollapsed ? 'lg:justify-center' : ''}`}>
            <span className={`text-slate-400 font-medium truncate ${isCollapsed ? 'lg:hidden' : ''}`}>Trạng thái máy chủ</span>
            <div className="flex items-center gap-1" title="Đồng bộ thời gian thực trực tuyến">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className={`text-[10px] font-semibold text-emerald-400 ${isCollapsed ? 'lg:hidden' : ''}`}>Trực tuyến</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Quick Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 h-13 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-1 lg:hidden shadow-lg">
        {mobileBottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                onClose();
              }}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
                isActive ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[14px] h-3.5 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 leading-tight">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => {
            if (isOpen) onClose();
            else if (onOpen) onOpen();
          }}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors cursor-pointer ${
            isOpen ? 'text-blue-600 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Menu className="w-4 h-4" />
          <span className="text-[10px] mt-0.5 leading-tight">Danh mục</span>
        </button>
      </nav>
    </>
  );
};
