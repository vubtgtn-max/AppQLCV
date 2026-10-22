import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRealtime } from '../contexts/RealtimeContext';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, isTaskOverdue, isDossierOverdue } from '../utils/date';
import { exportToExcel, escapeHtml } from '../utils/export';
import {
  TrendingUp,
  FileSpreadsheet,
  Calendar,
  User as UserIcon,
  Layers,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BarChart3,
  PieChart,
  Award,
  FileText,
  Briefcase,
  FolderArchive,
  Sparkles,
  Copy,
  Download,
  Check,
  CalendarRange,
  Edit3,
  Plus,
  Trash2,
  Landmark,
  MapPin,
  Scale,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  STANDARD_REPORT_TEMPLATES,
  ReportTemplateDef,
  ReportGeneratorParams,
} from '../components/reports/reportTemplates';
import { CustomReportModal } from '../components/reports/CustomReportModal';
import { VietnameseDateInput } from '../components/common/VietnameseDateInput';

type PeriodType = 'week' | 'month' | 'quarter' | 'custom';

export const ReportsPage: React.FC = () => {
  const { tasks, dossiers: rawDossiers, users, projects } = useRealtime();
  const dossiers = useMemo(() => (rawDossiers || []).filter((d) => d && !d.id?.startsWith('dos_kep')), [rawDossiers]);
  const { user, isLeader, isAdmin } = useAuth();

  // Role scoped tasks
  const accessibleTasks = useMemo(() => {
    if (isLeader || isAdmin) return tasks;
    return tasks.filter((t) => t.assigneeId === user?.id || t.createdBy === user?.id);
  }, [tasks, isLeader, isAdmin, user]);

  // 1. Period Mode Selection (Tuần, Tháng, Quý, Tự chọn)
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

  const formatLocalYMD = (d: Date) => {
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Custom date range
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return formatLocalYMD(d);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return formatLocalYMD(new Date());
  });

  // Presentation Mode: 'visual' (Bảng số liệu & Biểu đồ) or 'document' (Văn bản Báo cáo Hành chính)
  const [viewPresentation, setViewPresentation] = useState<'visual' | 'document'>('visual');

  // Sub-tabs for Visual Charts Mode
  const [reportTab, setReportTab] = useState<'summary' | 'officers' | 'fields' | 'dossiers'>('summary');

  // Custom Templates state (stored in localStorage)
  const [customTemplates, setCustomTemplates] = useState<ReportTemplateDef[]>(() => {
    try {
      const saved = localStorage.getItem('app_custom_report_templates');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((item: any) => ({
          ...item,
          generate: ({ periodLabel, periodShortLabel, docIssuingUnit, customRemarks, docRecipient }: any) => {
            if (item.outline) {
              return `${item.outline}\n\n(${periodLabel})\nKính gửi: ${docRecipient || item.defaultRecipient || 'Ủy ban nhân dân xã Lãnh Ngọc'}\n\n* Đơn vị soạn thảo: ${docIssuingUnit}${customRemarks ? `\n\n* Nội dung ghi chú bổ sung:\n${customRemarks}` : ''}`;
            }
            return `BÁO CÁO\n${item.name.toUpperCase()}\n(${periodLabel})\n\nKính gửi: ${docRecipient || item.defaultRecipient || 'Ủy ban nhân dân xã Lãnh Ngọc'}\n\n    Căn cứ Quy chế làm việc và phân công nhiệm vụ chuyên môn; ${docIssuingUnit} xin báo cáo kết quả thực hiện trong ${periodShortLabel} như sau:\n\nI. TÌNH HÌNH TRIỂN KHAI VÀ KẾT QUẢ ĐẠT ĐƯỢC\n    - Đã tổ chức thực hiện các nhiệm vụ chuyên môn theo đúng tiến độ đề ra...\n\nII. KHÓ KHĂN VƯỚNG MẮC\n    - Tiếp tục phối hợp với các ban ngành liên quan tháo gỡ khó khăn...\n\nIII. KIẾN NGHỊ ĐỀ XUẤT\n    - Kính đề nghị Lãnh đạo UBND xã xem xét chỉ đạo.${customRemarks ? `\n\n* Ý kiến bổ sung:\n${customRemarks}` : ''}\n\n    ${docIssuingUnit} kính báo cáo.`;
          },
        }));
      }
    } catch (e) {
      console.error('Failed to load custom templates', e);
    }
    return [];
  });

  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Combined Templates List
  const allTemplates = useMemo(() => {
    return [...STANDARD_REPORT_TEMPLATES, ...customTemplates];
  }, [customTemplates]);

  // Selected Template Type (default: 'land_project_comprehensive')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('land_project_comprehensive');

  const [docScope, setDocScope] = useState<'all' | 'single' | 'custom'>('all');
  const [selectedSingleUser, setSelectedSingleUser] = useState<string>(users[0]?.id || '');
  const [selectedMultipleUsers, setSelectedMultipleUsers] = useState<string[]>(users.map((u) => u.id));

  // Default values requested by user: UBND XÃ LÃNH NGỌC, PHÒNG KINH TẾ, Lãnh Ngọc
  const [docTitle, setDocTitle] = useState<string>(
    'KẾT QUẢ CÔNG TÁC QUẢN LÝ ĐẤT ĐAI, GIẢI QUYẾT THỦ TỤC HÀNH CHÍNH VÀ TIẾN ĐỘ BỒI THƯỜNG GIẢI PHÓNG MẶT BẰNG'
  );
  const [docIssuingUpper, setDocIssuingUpper] = useState<string>('UBND XÃ LÃNH NGỌC');
  const [docIssuingUnit, setDocIssuingUnit] = useState<string>('PHÒNG KINH TẾ');
  const [docRecipient, setDocRecipient] = useState<string>('Ủy ban nhân dân xã Lãnh Ngọc; Thường trực HĐND - UBND xã');
  const [docReportNumber, setDocReportNumber] = useState<string>('      /BC-PKT');
  const [docSignerRole, setDocSignerRole] = useState<string>('KT. TRƯỞNG PHÒNG\nPHÓ TRƯỞNG PHÒNG');
  // Signer name in normal casing (not all uppercase)
  const [docSignerName, setDocSignerName] = useState<string>('Võ Tấn Lạt');
  const [docLocation, setDocLocation] = useState<string>('Lãnh Ngọc');
  const [docDateText, setDocDateText] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')} tháng ${String(d.getMonth() + 1).padStart(2, '0')} năm ${d.getFullYear()}`;
  });
  const [docRecipientsText, setDocRecipientsText] = useState<string>(
    `- Như trên;\n- Thường trực Đảng ủy, HĐND xã (b/c);\n- Chủ tịch, các PCT UBND xã;\n- Lưu: VT, PKT.`
  );
  const [docCustomCaseNote, setDocCustomCaseNote] = useState<string>('');
  const [showRedSeal, setShowRedSeal] = useState<boolean>(true);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Document Content & Ref
  const [customReportBody, setCustomReportBody] = useState<string>('');
  const [isGenerated, setIsGenerated] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (bodyTextareaRef.current) {
      bodyTextareaRef.current.style.height = 'auto';
      bodyTextareaRef.current.style.height = `${Math.max(400, bodyTextareaRef.current.scrollHeight)}px`;
    }
  }, [customReportBody, selectedTemplateId]);

  // Helper to format date range for week
  const getWeekDateRangeString = (weekNum: number, year: number) => {
    try {
      const daysOffset = (weekNum - 1) * 7;
      const targetDate = new Date(year, 0, 1 + daysOffset);
      const day = targetDate.getDay();
      const diffToMonday = targetDate.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(targetDate.setDate(diffToMonday));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-';
      const startIso = formatLocalYMD(start);
      const endIso = formatLocalYMD(end);
      return `${formatDate(startIso)} - ${formatDate(endIso)}`;
    } catch {
      return '-';
    }
  };

  // Compute calculated start and end dates based on period selection
  const periodRange = useMemo(() => {
    let start: Date;
    let end: Date;
    let label = '';
    let shortLabel = '';

    if (periodType === 'week') {
      const daysOffset = (selectedWeek - 1) * 7;
      const targetDate = new Date(selectedWeekYear, 0, 1 + daysOffset);
      const day = targetDate.getDay();
      const diffToMonday = targetDate.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(targetDate.setDate(diffToMonday));
      start.setHours(0, 0, 0, 0);

      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const startFormatted = !isNaN(start.getTime()) ? formatDate(formatLocalYMD(start)) : '';
      const endFormatted = !isNaN(end.getTime()) ? formatDate(formatLocalYMD(end)) : '';
      label = `Tuần ${selectedWeek} năm ${selectedWeekYear} (từ ${startFormatted} đến ${endFormatted})`;
      shortLabel = `Tuần ${selectedWeek}/${selectedWeekYear}`;
    } else if (periodType === 'month') {
      start = new Date(selectedMonthYear, selectedMonth - 1, 1, 0, 0, 0, 0);
      end = new Date(selectedMonthYear, selectedMonth, 0, 23, 59, 59, 999);
      const startFormatted = !isNaN(start.getTime()) ? formatDate(formatLocalYMD(start)) : '';
      const endFormatted = !isNaN(end.getTime()) ? formatDate(formatLocalYMD(end)) : '';
      label = `Tháng ${selectedMonth} năm ${selectedMonthYear} (từ ${startFormatted} đến ${endFormatted})`;
      shortLabel = `Tháng ${selectedMonth}/${selectedMonthYear}`;
    } else if (periodType === 'quarter') {
      const startMonth = (selectedQuarter - 1) * 3;
      start = new Date(selectedQuarterYear, startMonth, 1, 0, 0, 0, 0);
      end = new Date(selectedQuarterYear, startMonth + 3, 0, 23, 59, 59, 999);
      const romanQuarter = ['I', 'II', 'III', 'IV'][selectedQuarter - 1];
      const startFormatted = !isNaN(start.getTime()) ? formatDate(formatLocalYMD(start)) : '';
      const endFormatted = !isNaN(end.getTime()) ? formatDate(formatLocalYMD(end)) : '';
      label = `Quý ${romanQuarter} năm ${selectedQuarterYear} (từ ${startFormatted} đến ${endFormatted})`;
      shortLabel = `Quý ${romanQuarter}/${selectedQuarterYear}`;
    } else {
      const parsedStart = customStartDate ? new Date(`${customStartDate}T00:00:00`) : new Date();
      start = !isNaN(parsedStart.getTime()) ? parsedStart : new Date();
      start.setHours(0, 0, 0, 0);

      const parsedEnd = customEndDate ? new Date(`${customEndDate}T23:59:59`) : new Date();
      end = !isNaN(parsedEnd.getTime()) ? parsedEnd : new Date();
      end.setHours(23, 59, 59, 999);

      label = `Giai đoạn từ ngày ${formatDate(customStartDate)} đến ngày ${formatDate(customEndDate)}`;
      shortLabel = `${formatDate(customStartDate)} - ${formatDate(customEndDate)}`;
    }

    const safeStartStr = !isNaN(start.getTime()) ? formatLocalYMD(start) : '';
    const safeEndStr = !isNaN(end.getTime()) ? formatLocalYMD(end) : '';

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

  // Filter tasks by active date range
  const filteredTasks = useMemo(() => {
    return accessibleTasks.filter((t) => {
      if (!t.createdAt && !t.dueDate) return true;
      const dateToCheck = new Date(t.createdAt || t.dueDate || '');
      if (isNaN(dateToCheck.getTime())) return true;
      return dateToCheck >= periodRange.startDate && dateToCheck <= periodRange.endDate;
    });
  }, [accessibleTasks, periodRange]);

  // Filter dossiers by active date range
  const filteredDossiers = useMemo(() => {
    return dossiers.filter((d) => {
      if (!d.receivedDate) return true;
      const dateToCheck = new Date(d.receivedDate);
      if (isNaN(dateToCheck.getTime())) return true;
      return dateToCheck >= periodRange.startDate && dateToCheck <= periodRange.endDate;
    });
  }, [dossiers, periodRange]);

  // Aggregated Visual KPI Metrics
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress').length;
  const overdueTasks = filteredTasks.filter((t) => isTaskOverdue(t)).length;
  const urgentTasks = filteredTasks.filter((t) => t.priority === 'urgent').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalDossiers = filteredDossiers.length;
  const resolvedDossiers = filteredDossiers.filter((d) => d.status === 'resolved').length;
  const inProgressDossiers = filteredDossiers.filter((d) => d.status === 'in_progress').length;
  const overdueDossiers = filteredDossiers.filter((d) => isDossierOverdue(d)).length;
  const supplementDossiers = filteredDossiers.filter((d) => d.status === 'supplement').length;
  const dossierResolveRate = totalDossiers > 0 ? Math.round((resolvedDossiers / totalDossiers) * 100) : 0;

  // Breakdown by Officer
  const officerStats = useMemo(() => {
    return users.map((u) => {
      const uTasks = filteredTasks.filter((t) => t.assigneeId === u.id);
      const uTotal = uTasks.length;
      const uCompleted = uTasks.filter((t) => t.status === 'completed').length;
      const uInProgress = uTasks.filter((t) => t.status === 'in_progress').length;
      const uOverdue = uTasks.filter((t) => isTaskOverdue(t)).length;
      const uUrgent = uTasks.filter((t) => t.priority === 'urgent').length;
      const uRate = uTotal > 0 ? Math.round((uCompleted / uTotal) * 100) : 0;

      const uDossiers = filteredDossiers.filter((d) => d.handlerId === u.id);
      const uDossiersResolved = uDossiers.filter((d) => d.status === 'resolved').length;
      const uDossiersOverdue = uDossiers.filter((d) => isDossierOverdue(d)).length;

      let grade = 'Hoàn thành tốt';
      let gradeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      if (uRate >= 90) {
        grade = 'Xuất sắc';
        gradeColor = 'text-purple-700 bg-purple-50 border-purple-200';
      } else if (uRate >= 70) {
        grade = 'Hoàn thành tốt';
        gradeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
      } else if (uRate >= 50) {
        grade = 'Hoàn thành';
        gradeColor = 'text-blue-700 bg-blue-50 border-blue-200';
      } else {
        grade = 'Cần đôn đốc';
        gradeColor = 'text-rose-700 bg-rose-50 border-rose-200';
      }

      return {
        user: u,
        total: uTotal,
        completed: uCompleted,
        inProgress: uInProgress,
        overdue: uOverdue,
        urgent: uUrgent,
        rate: uRate,
        dossiersTotal: uDossiers.length,
        dossiersResolved: uDossiersResolved,
        dossiersOverdue: uDossiersOverdue,
        grade,
        gradeColor,
      };
    });
  }, [users, filteredTasks, filteredDossiers]);

  // Breakdown by Land Field
  const fieldStats = useMemo(() => {
    const map: Record<string, { total: number; completed: number; inProgress: number; overdue: number; urgent: number }> = {};
    filteredTasks.forEach((t) => {
      if (!map[t.field]) {
        map[t.field] = { total: 0, completed: 0, inProgress: 0, overdue: 0, urgent: 0 };
      }
      map[t.field].total++;
      if (t.status === 'completed') map[t.field].completed++;
      if (t.status === 'in_progress') map[t.field].inProgress++;
      if (isTaskOverdue(t)) map[t.field].overdue++;
      if (t.priority === 'urgent') map[t.field].urgent++;
    });

    return Object.entries(map)
      .map(([field, data]) => ({
        field,
        total: data.total,
        completed: data.completed,
        inProgress: data.inProgress,
        overdue: data.overdue,
        urgent: data.urgent,
        rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTasks]);

  // Dossiers by Procedure Type
  const procedureStats = useMemo(() => {
    const map: Record<string, { total: number; resolved: number; inProgress: number; overdue: number; supplement: number }> = {};
    filteredDossiers.forEach((d) => {
      const type = d.procedure || d.procedureType || 'Cấp GCN lần đầu';
      if (!map[type]) {
        map[type] = { total: 0, resolved: 0, inProgress: 0, overdue: 0, supplement: 0 };
      }
      map[type].total++;
      if (d.status === 'resolved') map[type].resolved++;
      if (d.status === 'in_progress') map[type].inProgress++;
      if (isDossierOverdue(d)) map[type].overdue++;
      if (d.status === 'supplement') map[type].supplement++;
    });

    return Object.entries(map)
      .map(([proc, data]) => ({
        proc,
        total: data.total,
        resolved: data.resolved,
        inProgress: data.inProgress,
        overdue: data.overdue,
        supplement: data.supplement,
        rate: data.total > 0 ? Math.round((data.resolved / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredDossiers]);

  // Target Users for Document Report
  const targetUsersForDoc = useMemo(() => {
    if (docScope === 'single') {
      return users.filter((u) => u.id === selectedSingleUser);
    }
    if (docScope === 'custom') {
      return users.filter((u) => selectedMultipleUsers.includes(u.id));
    }
    return users;
  }, [users, docScope, selectedSingleUser, selectedMultipleUsers]);

  // Generate Document Text Handler
  const generateDocumentText = (templateIdToUse?: string) => {
    const currentId = templateIdToUse || selectedTemplateId;
    const templateDef = allTemplates.find((t) => t.id === currentId) || allTemplates[0];

    const params: ReportGeneratorParams = {
      periodLabel: periodRange.label,
      periodShortLabel: periodRange.shortLabel,
      tasks: filteredTasks,
      dossiers: filteredDossiers,
      users,
      projects,
      targetUsers: targetUsersForDoc,
      docRecipient,
      docIssuingUnit,
      customRemarks: docCustomCaseNote,
    };

    const text = templateDef.generate(params);
    setCustomReportBody(text);
    setIsGenerated(true);
  };

  // Handle Template Selection
  const handleSelectTemplate = (template: ReportTemplateDef) => {
    setSelectedTemplateId(template.id);
    if (template.reportTitle) {
      setDocTitle(template.reportTitle);
    } else {
      setDocTitle(template.name.toUpperCase());
    }
    if (template.defaultReportNumber) {
      setDocReportNumber(template.defaultReportNumber);
    }
    if (template.defaultRecipient) {
      setDocRecipient(template.defaultRecipient);
    }
    if (template.defaultRecipientsText) {
      setDocRecipientsText(template.defaultRecipientsText);
    }
    generateDocumentText(template.id);
  };

  // Add/Save New Custom Template
  const handleSaveCustomTemplate = (newTpl: ReportTemplateDef) => {
    const updated = [newTpl, ...customTemplates];
    setCustomTemplates(updated);
    try {
      localStorage.setItem('app_custom_report_templates', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to persist custom template', e);
    }
    handleSelectTemplate(newTpl);
  };

  // Delete Custom Template
  const handleDeleteCustomTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn xóa mẫu báo cáo này không?')) return;
    const updated = customTemplates.filter((t) => t.id !== id);
    setCustomTemplates(updated);
    try {
      localStorage.setItem('app_custom_report_templates', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to remove custom template', err);
    }
    if (selectedTemplateId === id) {
      handleSelectTemplate(STANDARD_REPORT_TEMPLATES[0]);
    }
  };

  // Initial text generation on mount or period / scope change
  useEffect(() => {
    generateDocumentText();
  }, [selectedTemplateId, docScope, selectedSingleUser, selectedMultipleUsers, periodRange.label]);

  // Copy Plain Text Report
  const handleCopyText = () => {
    const fullText = `${docIssuingUpper}
${docIssuingUnit}
Số: ${docReportNumber}

CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc

${docLocation}, ngày ${docDateText}

BÁO CÁO
${docTitle}
(${periodRange.label})

Kính gửi: ${docRecipient || 'Ủy ban nhân dân xã Lãnh Ngọc'}

${customReportBody}

Nơi nhận:
${docRecipientsText}

${docSignerRole}
${showRedSeal ? '\n(Đã ký)\n' : '\n'}
${docSignerName}`;
    navigator.clipboard.writeText(fullText);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  // Print Document Handler
  const handlePrint = () => {
    window.print();
  };

  // Download Word (.doc) Handler - Full Administrative Layout
  const handleDownloadDoc = () => {
    const safeDocTitle = escapeHtml(docTitle);
    const safeIssuingUpper = escapeHtml(docIssuingUpper);
    const safeIssuingUnit = escapeHtml(docIssuingUnit);
    const safeReportNumber = escapeHtml(docReportNumber);
    const safeLocation = escapeHtml(docLocation);
    const safeDateText = escapeHtml(docDateText);
    const safePeriodLabel = escapeHtml(periodRange.label);
    const safeRecipient = escapeHtml(docRecipient || 'Ủy ban nhân dân xã Lãnh Ngọc');
    const safeReportBody = escapeHtml(customReportBody).replace(/\n/g, '<br/>');
    const safeRecipientsText = escapeHtml(docRecipientsText).replace(/\n/g, '<br/>');
    const safeSignerRole = escapeHtml(docSignerRole).replace(/\n/g, '<br/>');
    const safeSignerName = escapeHtml(docSignerName);

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${safeDocTitle}</title>
        <style>
          @page { size: A4 portrait; margin: 20mm 20mm 20mm 25mm; }
          body { font-family: 'Times New Roman', serif; font-size: 13.0pt; line-height: 1.5; color: #000; }
          table { width: 100%; border-collapse: collapse; }
          .header-table td { vertical-align: top; text-align: center; }
          .title-block { text-align: center; margin-top: 16pt; margin-bottom: 12pt; }
          .title-main { font-weight: bold; font-size: 14.0pt; text-transform: uppercase; margin: 0; }
          .title-sub { font-weight: bold; font-size: 13.5pt; text-transform: uppercase; margin: 4pt 0 0 0; }
          .title-period { font-style: italic; font-size: 12.0pt; margin: 3pt 0 0 0; }
          .recipient-line { text-align: center; margin-top: 10pt; margin-bottom: 12pt; }
          .content { text-align: justify; margin-top: 12pt; line-height: 1.6; white-space: pre-wrap; }
          .footer-table { margin-top: 25pt; width: 100%; }
          .footer-table td { vertical-align: top; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="width: 45%;">
              <p style="margin: 0; font-size: 11.5pt;"><b>${safeIssuingUpper}</b></p>
              <p style="margin: 0; font-size: 12.0pt;"><b>${safeIssuingUnit}</b></p>
              <p style="margin: 2pt 0 0 0; font-size: 11.0pt;">Số: ${safeReportNumber}</p>
            </td>
            <td style="width: 55%;">
              <p style="margin: 0; font-size: 11.5pt;"><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b></p>
              <p style="margin: 0; font-size: 12.0pt;"><b><u>Độc lập - Tự do - Hạnh phúc</u></b></p>
              <p style="margin: 4pt 0 0 0; font-size: 12.0pt; font-style: italic;">${safeLocation}, ngày ${safeDateText}</p>
            </td>
          </tr>
        </table>

        <div class="title-block">
          <p class="title-main">BÁO CÁO</p>
          <p class="title-sub">${safeDocTitle}</p>
          <p class="title-period">(${safePeriodLabel})</p>
        </div>

        <div class="recipient-line">
          <b><i>Kính gửi: </i></b><span><b>${safeRecipient}</b></span>
        </div>

        <div class="content">
          ${safeReportBody}
        </div>

        <table class="footer-table">
          <tr>
            <td style="width: 50%; font-size: 10.5pt;">
              <p style="margin: 0; font-weight: bold; font-style: italic; text-decoration: underline;">Nơi nhận:</p>
              <p style="margin: 2pt 0 0 0; font-size: 10.0pt;">${safeRecipientsText}</p>
            </td>
            <td style="width: 50%; text-align: center;">
              <p style="margin: 0; font-weight: bold; text-transform: uppercase;">${safeSignerRole}</p>
              <div style="height: 45pt; padding-top: 15pt;">
                <p style="margin: 0; font-style: italic; color: #374151;">${showRedSeal ? '(Đã ký)' : ''}</p>
              </div>
              <p style="margin: 0; font-weight: bold; font-size: 13.0pt;">${safeSignerName}</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], {
      type: 'application/msword;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bao_cao_Phong_Kinh_Te_${docLocation}_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    if (reportTab === 'summary') {
      const summaryData = [
        { 'Chỉ tiêu': 'Tổng số nhiệm vụ chuyên môn', 'Số lượng / Tỷ lệ': totalTasks, 'Đơn vị': 'Việc' },
        { 'Chỉ tiêu': 'Nhiệm vụ đã hoàn thành', 'Số lượng / Tỷ lệ': completedTasks, 'Đơn vị': 'Việc' },
        { 'Chỉ tiêu': 'Nhiệm vụ đang thực hiện', 'Số lượng / Tỷ lệ': inProgressTasks, 'Đơn vị': 'Việc' },
        { 'Chỉ tiêu': 'Nhiệm vụ quá hạn', 'Số lượng / Tỷ lệ': overdueTasks, 'Đơn vị': 'Việc' },
        { 'Chỉ tiêu': 'Tỷ lệ hoàn thành nhiệm vụ', 'Số lượng / Tỷ lệ': `${completionRate}%`, 'Đơn vị': '%' },
        { 'Chỉ tiêu': 'Tổng số hồ sơ Một cửa tiếp nhận', 'Số lượng / Tỷ lệ': totalDossiers, 'Đơn vị': 'Hồ sơ' },
        { 'Chỉ tiêu': 'Hồ sơ đã giải quyết xong', 'Số lượng / Tỷ lệ': resolvedDossiers, 'Đơn vị': 'Hồ sơ' },
        { 'Chỉ tiêu': 'Hồ sơ đang thụ lý', 'Số lượng / Tỷ lệ': inProgressDossiers, 'Đơn vị': 'Hồ sơ' },
        { 'Chỉ tiêu': 'Hồ sơ cần bổ sung', 'Số lượng / Tỷ lệ': supplementDossiers, 'Đơn vị': 'Hồ sơ' },
        { 'Chỉ tiêu': 'Hồ sơ trễ hạn', 'Số lượng / Tỷ lệ': overdueDossiers, 'Đơn vị': 'Hồ sơ' },
        { 'Chỉ tiêu': 'Tỷ lệ giải quyết hồ sơ đúng hạn', 'Số lượng / Tỷ lệ': `${dossierResolveRate}%`, 'Đơn vị': '%' },
      ];
      exportToExcel(summaryData, `Bao_cao_tong_hop_${periodRange.shortLabel.replace(/[\/\s:]/g, '_')}`);
    } else if (reportTab === 'officers') {
      const officerData = officerStats.map((os) => ({
        'Họ và tên cán bộ': os.user.name,
        'Chức vụ': os.user.position || '',
        'Số điện thoại': os.user.phone || '',
        'Tổng việc phân công': os.total,
        'Việc đã hoàn thành': os.completed,
        'Việc đang làm': os.inProgress,
        'Việc quá hạn': os.overdue,
        'Tỷ lệ hoàn thành (%)': os.rate,
        'Tổng hồ sơ Một cửa phụ trách': os.dossiersTotal,
        'Hồ sơ đã giải quyết': os.dossiersResolved,
        'Hồ sơ trễ hạn': os.dossiersOverdue,
        'Xếp loại chuyên môn': os.grade,
      }));
      exportToExcel(officerData, `Hieu_suat_can_bo_${periodRange.shortLabel.replace(/[\/\s:]/g, '_')}`);
    } else if (reportTab === 'fields') {
      const fieldData = fieldStats.map((fs) => ({
        'Lĩnh vực Đất đai': fs.field,
        'Tổng nhiệm vụ': fs.total,
        'Đã hoàn thành': fs.completed,
        'Đang thụ lý': fs.inProgress,
        'Quá hạn': fs.overdue,
        'Khẩn / Hỏa tốc': fs.urgent,
        'Tỷ lệ hoàn thành (%)': fs.rate,
      }));
      exportToExcel(fieldData, `Linh_vuc_dat_dai_${periodRange.shortLabel.replace(/[\/\s:]/g, '_')}`);
    } else {
      const procData = procedureStats.map((ps) => ({
        'Tên thủ tục hành chính': ps.proc,
        'Tổng tiếp nhận': ps.total,
        'Đã giải quyết': ps.resolved,
        'Đang thụ lý': ps.inProgress,
        'Cần bổ sung hồ sơ': ps.supplement,
        'Trễ hạn': ps.overdue,
        'Tỷ lệ giải quyết (%)': ps.rate,
      }));
      exportToExcel(procData, `Thu_tuc_mot_cua_${periodRange.shortLabel.replace(/[\/\s:]/g, '_')}`);
    }
  };

  // Render Template Icon helper
  const renderTemplateIcon = (iconName: string) => {
    switch (iconName) {
      case 'Landmark':
        return <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'MapPin':
        return <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'AlertTriangle':
        return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'Users':
        return <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
      case 'Scale':
        return <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      case 'Layers':
        return <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      default:
        return <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & GLOBAL ACTION BUTTONS (MATCHING PROJECT REPORTS VIEW) */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Báo cáo & Phân tích Nghiệp vụ Đất đai
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tổng hợp kết quả đạt được theo Tuần, Tháng, Quý hoặc khoảng thời gian tự chọn chuẩn thể thức hành chính
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Xuất Excel tổng hợp</span>
          </button>

          <button
            onClick={handleDownloadDoc}
            className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Tải Word (.doc)</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <span>In / Xuất PDF</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN FILTER & PERIOD SELECTOR MENU (MATCHING PROJECT REPORTS VIEW) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs border border-slate-200 dark:border-slate-800 space-y-4">
        {/* Period Mode Selector Tabs & Presentation Switch */}
        <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setPeriodType('week')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                periodType === 'week'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Báo cáo Tuần</span>
            </button>

            <button
              onClick={() => setPeriodType('month')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                periodType === 'month'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Báo cáo Tháng</span>
            </button>

            <button
              onClick={() => setPeriodType('quarter')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                periodType === 'quarter'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Báo cáo Quý</span>
            </button>

            <button
              onClick={() => setPeriodType('custom')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                periodType === 'custom'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Thời gian Tự chọn</span>
            </button>
          </div>

          {/* Presentation Switch: Visual Dashboard vs Formal Document */}
          <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 p-1 rounded-xl">
            <button
              onClick={() => setViewPresentation('visual')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewPresentation === 'visual'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Bảng số liệu & Biểu đồ</span>
            </button>

            <button
              onClick={() => {
                setViewPresentation('document');
                if (!isGenerated) generateDocumentText();
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewPresentation === 'document'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Văn bản Báo cáo Hành chính</span>
            </button>
          </div>
        </div>

        {/* Dynamic Period Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {/* Week Mode */}
          {periodType === 'week' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Chọn Tuần trong năm
                </label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:bg-white focus:border-indigo-500 outline-none"
                >
                  {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                    <option key={w} value={w}>
                      Tuần {w} ({getWeekDateRangeString(w, selectedWeekYear)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Năm
                </label>
                <select
                  value={selectedWeekYear}
                  onChange={(e) => setSelectedWeekYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:bg-white focus:border-indigo-500 outline-none"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      Năm {y}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Month Mode */}
          {periodType === 'month' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Chọn Tháng
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:bg-white focus:border-indigo-500 outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      Tháng {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Năm
                </label>
                <select
                  value={selectedMonthYear}
                  onChange={(e) => setSelectedMonthYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:bg-white focus:border-indigo-500 outline-none"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      Năm {y}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Quarter Mode */}
          {periodType === 'quarter' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Chọn Quý
                </label>
                <select
                  value={selectedQuarter}
                  onChange={(e) => setSelectedQuarter(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:bg-white focus:border-indigo-500 outline-none"
                >
                  <option value={1}>Quý I (Tháng 1 - Tháng 3)</option>
                  <option value={2}>Quý II (Tháng 4 - Tháng 6)</option>
                  <option value={3}>Quý III (Tháng 7 - Tháng 9)</option>
                  <option value={4}>Quý IV (Tháng 10 - Tháng 12)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Năm
                </label>
                <select
                  value={selectedQuarterYear}
                  onChange={(e) => setSelectedQuarterYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:bg-white focus:border-indigo-500 outline-none"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      Năm {y}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Custom Date Mode */}
          {periodType === 'custom' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Từ ngày
                </label>
                <VietnameseDateInput
                  value={customStartDate}
                  onChange={(val) => setCustomStartDate(val)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Đến ngày
                </label>
                <VietnameseDateInput
                  value={customEndDate}
                  onChange={(val) => setCustomEndDate(val)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:bg-white focus:border-indigo-500 outline-none"
                />
              </div>
            </>
          )}

          {/* Phạm vi cán bộ / Đối tượng báo cáo */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
              Phạm vi tổng hợp cán bộ
            </label>
            <select
              value={docScope}
              onChange={(e) => setDocScope(e.target.value as any)}
              className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:bg-white focus:border-indigo-500 outline-none"
            >
              <option value="all">Toàn phòng Kinh tế (Tổng hợp)</option>
              <option value="single">Từng cán bộ chuyên môn</option>
              <option value="custom">Nhóm cán bộ tự chọn</option>
            </select>
          </div>

          {docScope === 'single' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Chọn cán bộ cụ thể
              </label>
              <select
                value={selectedSingleUser}
                onChange={(e) => setSelectedSingleUser(e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:bg-white focus:border-indigo-500 outline-none"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} - {u.position || 'Chuyên viên'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Current Active Filter Badge */}
        <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-medium">
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>
              Chu kỳ báo cáo:{' '}
              <strong className="font-bold text-indigo-700 dark:text-indigo-300">{periodRange.label}</strong>
            </span>
          </div>
          <div className="text-slate-500 dark:text-slate-400 text-[11px]">
            Đang tổng hợp cho <strong className="text-slate-800 dark:text-slate-200">{accessibleTasks.length}</strong> nhiệm vụ & <strong className="text-slate-800 dark:text-slate-200">{dossiers.length}</strong> hồ sơ Một cửa & <strong className="text-slate-800 dark:text-slate-200">{projects.length}</strong> dự án
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PRESENTATION MODE 1: VISUAL CHARTS & METRICS DASHBOARD */}
      {/* ========================================================================= */}
      {viewPresentation === 'visual' && (
        <div className="space-y-6">
          {/* 4 Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Tổng nhiệm vụ */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Nhiệm vụ chuyên môn</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalTasks}</div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  <span>Đã xong: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{completedTasks}</strong></span>
                  <span>Đang làm: <strong className="text-blue-600 dark:text-blue-400 font-bold">{inProgressTasks}</strong></span>
                </div>
              </div>
            </div>

            {/* Card 2: Tỷ lệ hoàn thành */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tiến độ giải quyết</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completionRate}%</div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Card 3: Hồ sơ Một cửa */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Hồ sơ địa chính Một cửa</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <FolderArchive className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalDossiers}</div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  <span>Đã trả kết quả: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{resolvedDossiers}</strong></span>
                  <span>Tỷ lệ: <strong className="text-purple-600 dark:text-purple-400 font-bold">{dossierResolveRate}%</strong></span>
                </div>
              </div>
            </div>

            {/* Card 4: Quá hạn & Chậm tiến độ */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Việc & Hồ sơ trễ hạn</span>
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{overdueTasks + overdueDossiers}</div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  <span>Nhiệm vụ: <strong className="text-rose-600 dark:text-rose-400 font-bold">{overdueTasks}</strong></span>
                  <span>Hồ sơ Một cửa: <strong className="text-rose-600 dark:text-rose-400 font-bold">{overdueDossiers}</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-tabs Navigation */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
            <button
              onClick={() => setReportTab('summary')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                reportTab === 'summary'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Tổng quan chỉ đạo</span>
            </button>

            <button
              onClick={() => setReportTab('officers')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                reportTab === 'officers'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Hiệu suất Cán bộ ({users.length})</span>
            </button>

            <button
              onClick={() => setReportTab('fields')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                reportTab === 'fields'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Lĩnh vực Đất đai ({fieldStats.length})</span>
            </button>

            <button
              onClick={() => setReportTab('dossiers')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                reportTab === 'dossiers'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Thủ tục Hồ sơ Một cửa ({procedureStats.length})</span>
            </button>
          </div>

          {/* TAB 1.1: TỔNG QUAN CHỈ ĐẠO */}
          {reportTab === 'summary' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden text-xs">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      Bảng tổng hợp nhanh theo từng cán bộ Phòng Kinh tế ({periodRange.shortLabel})
                    </h3>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3">Cán bộ</th>
                        <th className="py-2.5 px-3">Chức vụ</th>
                        <th className="py-2.5 px-3 text-center">Tổng việc</th>
                        <th className="py-2.5 px-3 text-center text-emerald-600 dark:text-emerald-400">Đã xong</th>
                        <th className="py-2.5 px-3 text-center text-blue-600 dark:text-blue-400">Đang làm</th>
                        <th className="py-2.5 px-3 text-center text-rose-600 dark:text-rose-400">Quá hạn</th>
                        <th className="py-2.5 px-3 min-w-[140px]">Tỷ lệ</th>
                        <th className="py-2.5 px-3 text-center">Đánh giá</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {officerStats.map((os) => (
                        <tr key={os.user.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{os.user.name}</td>
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{os.user.position || ''}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-white">{os.total}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">{os.completed}</td>
                          <td className="py-2.5 px-3 text-center font-semibold text-blue-600 dark:text-blue-400">{os.inProgress}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-rose-600 dark:text-rose-400">{os.overdue}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full rounded-full"
                                  style={{ width: `${os.rate}%` }}
                                ></div>
                              </div>
                              <span className="font-bold text-slate-700 dark:text-slate-300 w-8 text-right text-[11px]">{os.rate}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${os.gradeColor}`}>
                              {os.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1.2: CHUYÊN SÂU HIỆU SUẤT CÁN BỘ */}
          {reportTab === 'officers' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {officerStats.map((os) => (
                <div
                  key={os.user.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs overflow-hidden">
                          {os.user.avatar ? (
                            <img src={os.user.avatar} alt={os.user.name} className="w-full h-full object-cover" />
                          ) : (
                            os.user.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-xs">{os.user.name}</h4>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">{os.user.position || os.user.phone}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${os.gradeColor}`}>
                        {os.grade}
                      </span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Nhiệm vụ được giao:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{os.total}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Đã giải quyết xong:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{os.completed} ({os.rate}%)</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Đang thụ lý:</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">{os.inProgress}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Nhiệm vụ trễ hạn:</span>
                        <span className={`font-bold ${os.overdue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {os.overdue}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Hồ sơ địa chính thụ lý:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{os.dossiersTotal} hồ sơ</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1 font-semibold">
                      <span className="text-slate-500 dark:text-slate-400">Tiến độ hoàn thành</span>
                      <span className="text-slate-800 dark:text-slate-200">{os.rate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          os.rate >= 80 ? 'bg-emerald-500' : os.rate >= 50 ? 'bg-blue-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${os.rate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 1.3: CHUYÊN SÂU LĨNH VỰC ĐẤT ĐAI */}
          {reportTab === 'fields' && (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden text-xs">
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                    Phân bổ & Tiến độ giải quyết theo từng Lĩnh vực Đất đai
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Lĩnh vực chuyên môn</th>
                      <th className="py-2.5 px-3 text-center">Tổng nhiệm vụ</th>
                      <th className="py-2.5 px-3 text-center text-emerald-600 dark:text-emerald-400">Đã hoàn thành</th>
                      <th className="py-2.5 px-3 text-center text-blue-600 dark:text-blue-400">Đang làm</th>
                      <th className="py-2.5 px-3 text-center text-rose-600 dark:text-rose-400">Quá hạn</th>
                      <th className="py-2.5 px-3 text-center text-orange-600 dark:text-orange-400">Khẩn / Hỏa tốc</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Tỷ lệ hoàn thành</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {fieldStats.map((fs) => (
                      <tr key={fs.field} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                          <span>{fs.field}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-white">{fs.total}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">{fs.completed}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-blue-600 dark:text-blue-400">{fs.inProgress}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-rose-600 dark:text-rose-400">{fs.overdue}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-orange-600 dark:text-orange-400">{fs.urgent}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-indigo-600 h-full rounded-full"
                                style={{ width: `${fs.rate}%` }}
                              ></div>
                            </div>
                            <span className="font-bold text-slate-700 dark:text-slate-300 w-8 text-right text-[11px]">{fs.rate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 1.4: CHUYÊN SÂU THỦ TỤC HỒ SƠ ĐẤT ĐAI */}
          {reportTab === 'dossiers' && (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden text-xs">
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderArchive className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                    Thống kê Hồ sơ theo từng Loại hình Thủ tục Hành chính Đất đai
                  </h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Tên thủ tục hành chính</th>
                      <th className="py-2.5 px-3 text-center">Tổng tiếp nhận</th>
                      <th className="py-2.5 px-3 text-center text-emerald-600 dark:text-emerald-400">Đã giải quyết</th>
                      <th className="py-2.5 px-3 text-center text-blue-600 dark:text-blue-400">Đang thụ lý</th>
                      <th className="py-2.5 px-3 text-center text-amber-600 dark:text-amber-400">Bổ sung hồ sơ</th>
                      <th className="py-2.5 px-3 text-center text-rose-600 dark:text-rose-400">Trễ hạn</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Tỷ lệ giải quyết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {procedureStats.map((ps) => (
                      <tr key={ps.proc} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <FolderArchive className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{ps.proc}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-white">{ps.total}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">{ps.resolved}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-blue-600 dark:text-blue-400">{ps.inProgress}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-amber-600 dark:text-amber-400">{ps.supplement}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-rose-600 dark:text-rose-400">{ps.overdue}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-600 h-full rounded-full"
                                style={{ width: `${ps.rate}%` }}
                              ></div>
                            </div>
                            <span className="font-bold text-slate-700 dark:text-slate-300 w-8 text-right text-[11px]">{ps.rate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PRESENTATION MODE 2: FORMAL ADMINISTRATIVE DOCUMENT (NGHỊ ĐỊNH 30) */}
      {/* ========================================================================= */}
      {viewPresentation === 'document' && (
        <div className="space-y-6">
          {/* Configuration Settings Panel matching ProjectReportsView */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Thiết lập Thể thức Văn bản Báo cáo (Theo Nghị định 30/2020/NĐ-CP)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Đề xuất / Thêm Mẫu Mới</span>
                </button>
                <button
                  onClick={() => generateDocumentText()}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Sinh lại văn bản</span>
                </button>
              </div>
            </div>

            {/* 1. Chọn Mẫu Văn Bản Báo Cáo Chuẩn & Đề xuất */}
            <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 text-xs sm:text-sm">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Chọn Mẫu Văn Bản Báo Cáo Chuyên Môn & GPMB (Nghị định 30/2020/NĐ-CP & Luật Đất đai 2024):</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(true)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm mẫu riêng ({customTemplates.length})</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {allTemplates.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative group flex flex-col justify-between ${
                        isSelected
                          ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            {renderTemplateIcon(tpl.icon)}
                            <span className="font-bold text-slate-900 dark:text-white text-xs line-clamp-1">
                              {tpl.name}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 font-bold" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {tpl.description}
                        </p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                        <span className="px-2 py-0.5 rounded-md font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
                          {tpl.badge || 'Chuẩn thể thức'}
                        </span>

                        {tpl.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomTemplate(tpl.id, e)}
                            className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Xóa mẫu báo cáo này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Administrative Metadata Configuration Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Thông tin Thể thức Hành chính (Cơ quan, Tiêu đề, Người ký & Nơi nhận)</span>
                </h4>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Mặc định: UBND xã Lãnh Ngọc • Phòng Kinh tế
                </span>
              </div>

              {/* Document Title input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Tiêu đề báo cáo (Căn giữa văn bản - Tự động viết hoa)
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value.toUpperCase())}
                  placeholder="KẾT QUẢ CÔNG TÁC QUẢN LÝ ĐẤT ĐAI..."
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold uppercase text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Cơ quan cấp trên */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Cơ quan cấp trên / Ban hành
                  </label>
                  <input
                    type="text"
                    value={docIssuingUpper}
                    onChange={(e) => setDocIssuingUpper(e.target.value)}
                    placeholder="UBND XÃ LÃNH NGỌC"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 font-bold uppercase text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* 2. Cơ quan / Đơn vị ban hành */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Cơ quan / Đơn vị soạn thảo
                  </label>
                  <input
                    type="text"
                    value={docIssuingUnit}
                    onChange={(e) => setDocIssuingUnit(e.target.value)}
                    placeholder="PHÒNG KINH TẾ"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 font-bold uppercase text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* 3. Số ký hiệu văn bản */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Số ký hiệu văn bản
                  </label>
                  <input
                    type="text"
                    value={docReportNumber}
                    onChange={(e) => setDocReportNumber(e.target.value)}
                    placeholder="      /BC-PKT"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 font-mono text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* 4. Địa danh hành chính */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Địa danh hành chính
                  </label>
                  <input
                    type="text"
                    value={docLocation}
                    onChange={(e) => setDocLocation(e.target.value)}
                    placeholder="Lãnh Ngọc"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 font-semibold text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* 5. Nơi nhận báo cáo (Kính gửi) */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Nơi nhận báo cáo (Kính gửi)
                  </label>
                  <input
                    type="text"
                    value={docRecipient}
                    onChange={(e) => setDocRecipient(e.target.value)}
                    placeholder="Ủy ban nhân dân xã Lãnh Ngọc"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* 6. Chức danh người ký (hỗ trợ xuống dòng & chọn nhanh) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Chức vụ người ký (xuống dòng được)
                    </label>
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          setDocSignerRole('KT. TRƯỞNG PHÒNG\nPHÓ TRƯỞNG PHÒNG');
                          setDocSignerName('Võ Tấn Lạt');
                        }}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                      >
                        Võ Tấn Lạt
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDocSignerRole('TRƯỞNG PHÒNG');
                          setDocSignerName('Mai Huy');
                        }}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                      >
                        Mai Huy
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={docSignerRole}
                    onChange={(e) => setDocSignerRole(e.target.value)}
                    rows={2}
                    placeholder="KT. TRƯỞNG PHÒNG&#10;PHÓ TRƯỞNG PHÒNG"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-800 dark:text-slate-200 font-bold uppercase text-xs leading-tight resize-none outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* 7. Họ và tên người ký (Viết bình thường, KHÔNG viết hoa hết) */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Họ và tên người ký (viết bình thường)
                  </label>
                  <input
                    type="text"
                    value={docSignerName}
                    onChange={(e) => setDocSignerName(e.target.value)}
                    placeholder="Võ Tấn Lạt"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Extra Case Remarks & Red Seal Checkbox */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Ghi chú / Kiến nghị phát sinh bổ sung vào văn bản:
                  </label>
                  <input
                    type="text"
                    value={docCustomCaseNote}
                    onChange={(e) => setDocCustomCaseNote(e.target.value)}
                    placeholder="Ví dụ: Kính đề nghị UBND xã ưu tiên bố trí lịch làm việc trực tiếp với các hộ dân trong tuần tới..."
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={showRedSeal}
                      onChange={(e) => setShowRedSeal(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Hiển thị xác nhận (Đã ký)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons for Document */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSuccess ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                  <span>{copiedSuccess ? 'Đã sao chép vào Clipboard!' : 'Sao chép văn bản'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadDoc}
                  className="px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>Tải Word (.doc)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>In A4 (Nghị định 30)</span>
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 5. PRINTABLE FORMAL A4 PAPER SHEET - UNIFIED SEAMLESS DOCUMENT */}
          {/* ========================================================================= */}
          <div className="bg-slate-100 dark:bg-slate-900/60 p-3 sm:p-6 md:p-8 rounded-2xl flex justify-center overflow-x-auto">
            <div
              ref={printAreaRef}
              className="bg-white p-6 sm:p-10 md:p-14 rounded-md shadow-lg border border-slate-200 max-w-[850px] w-full text-slate-900 font-serif leading-relaxed text-[13.5px] print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none transition-shadow"
              style={{ fontFamily: `'Times New Roman', Times, serif` }}
            >
              {/* 1. Header section: 2 columns */}
              <div className="grid grid-cols-2 gap-4 pb-2">
                {/* Left Header */}
                <div className="text-center space-y-0.5">
                  <div className="font-bold text-[12px] uppercase tracking-wide">
                    {docIssuingUpper}
                  </div>
                  <div className="font-bold text-[12.5px] uppercase tracking-wide">
                    {docIssuingUnit}
                  </div>
                  <div className="w-28 h-[1px] bg-slate-900 mx-auto my-1"></div>
                  <div className="text-[12px] pt-0.5">
                    Số: {docReportNumber}
                  </div>
                </div>

                {/* Right Header */}
                <div className="text-center space-y-0.5">
                  <div className="font-bold text-[12px] uppercase tracking-wide">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                  <div className="font-bold text-[12.5px] underline underline-offset-4 decoration-1">
                    Độc lập - Tự do - Hạnh phúc
                  </div>
                  <div className="text-[12px] italic pt-1">
                    {docLocation}, ngày {docDateText}
                  </div>
                </div>
              </div>

              {/* 2. Centered Formal Report Title (Căn giữa chuẩn Nghị định 30) */}
              <div className="text-center py-5 space-y-1.5">
                <div className="font-bold text-[15px] uppercase tracking-wider text-slate-900">
                  BÁO CÁO
                </div>
                <div className="font-bold text-[14px] uppercase max-w-[700px] mx-auto leading-snug text-slate-900">
                  {docTitle}
                </div>
                <div className="text-[12.5px] font-semibold italic text-slate-800">
                  ({periodRange.label})
                </div>
              </div>

              {/* 3. Formal Recipient (Kính gửi - Căn giữa trang trọng) */}
              <div className="pb-4 text-center">
                <span className="font-bold italic text-[13.5px]">Kính gửi: </span>
                <span className="font-semibold text-[13.5px]">{docRecipient || 'Ủy ban nhân dân xã Lãnh Ngọc'}</span>
              </div>

              {/* 4. Seamless Report Content Body (Không khung, liền mạch tự nhiên như 1 văn bản hoàn chỉnh) */}
              <div className="mt-1">
                <textarea
                  ref={bodyTextareaRef}
                  value={customReportBody}
                  onChange={(e) => {
                    setCustomReportBody(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  className="w-full bg-transparent border-none shadow-none outline-none focus:outline-none focus:ring-0 resize-none p-0 m-0 font-serif text-[13.5px] leading-[1.7] text-slate-900 text-justify overflow-hidden block"
                  style={{
                    fontFamily: `'Times New Roman', Times, serif`,
                    fontSize: '13.5px',
                    lineHeight: '1.7',
                    textAlign: 'justify',
                  }}
                  placeholder="Nội dung báo cáo chi tiết..."
                />
              </div>

              {/* 5. Signatures & Recipients: 2 columns (Liền mạch phần chân văn bản) */}
              <div className="grid grid-cols-2 gap-8 mt-8 pt-4">
                {/* Recipients (Nơi nhận) */}
                <div className="text-left space-y-1">
                  <div className="font-bold italic text-[12px] underline">Nơi nhận:</div>
                  <div className="whitespace-pre-line text-[11px] pl-2 leading-relaxed text-slate-800">
                    {docRecipientsText}
                  </div>
                </div>

                {/* Signer */}
                <div className="text-center relative space-y-1">
                  <div className="font-bold uppercase whitespace-pre-line text-[12px] leading-tight">{docSignerRole}</div>
                  <div className="h-16 flex items-center justify-center relative">
                    {showRedSeal ? (
                      <div className="text-slate-600 italic font-serif text-[13.5px] select-none">
                        (Đã ký)
                      </div>
                    ) : (
                      <div className="h-4" />
                    )}
                  </div>
                  {/* Signer name in normal casing (no uppercase) */}
                  <div className="font-bold text-[14px] text-slate-900">{docSignerName}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Report Proposal Modal */}
      <CustomReportModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onSave={handleSaveCustomTemplate}
      />
    </div>
  );
};

export default ReportsPage;
