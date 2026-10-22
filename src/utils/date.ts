import { getProcedureWorkingDays } from '../constants/procedures';

export function parseExcelDate(raw: any, fallback?: string): string {
  const fallbackDate = fallback ?? new Date().toISOString().split('T')[0];
  if (raw === null || raw === undefined || raw === '') return fallbackDate;

  // If already Date object
  if (raw instanceof Date) {
    if (!isNaN(raw.getTime())) {
      const y = raw.getFullYear();
      const m = String(raw.getMonth() + 1).padStart(2, '0');
      const d = String(raw.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return fallbackDate;
  }

  // If Excel numeric serial number (e.g. 46157 or 46157.5) or numeric string without dashes/slashes
  const numCandidate = Number(raw);
  const isNumericOnly = !isNaN(numCandidate) && !String(raw).includes('-') && !String(raw).includes('/') && !String(raw).includes(':');
  if (isNumericOnly && numCandidate > 1000 && numCandidate < 100000) {
    // Excel epoch starts at 1899-12-30 due to the 1900 leap year bug
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + Math.round(numCandidate * 86400000));
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  const str = String(raw).trim();
  if (!str) return fallbackDate;

  // Match DD/MM/YYYY or D/M/YYYY or DD-MM-YYYY or D-M-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Match YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
  const ymdMatch = str.match(/^(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Match 8-digit compact string YYYYMMDD e.g. 20260515
  const compactYmd = str.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactYmd) {
    const year = compactYmd[1];
    const month = compactYmd[2];
    const day = compactYmd[3];
    if (Number(month) >= 1 && Number(month) <= 12 && Number(day) >= 1 && Number(day) <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  // Try standard Date constructor
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      // Guard against JavaScript parsing "46157" into year 46157
      if (parsed.getFullYear() > 3000) {
        const num = Number(str);
        if (!isNaN(num) && num > 1000 && num < 100000) {
          const excelEpoch = new Date(Date.UTC(1899, 11, 30));
          const realDate = new Date(excelEpoch.getTime() + Math.round(num * 86400000));
          const y = realDate.getUTCFullYear();
          const m = String(realDate.getUTCMonth() + 1).padStart(2, '0');
          const d = String(realDate.getUTCDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      }
      const year = parsed.getFullYear();
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {}

  return fallbackDate;
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '-';
  const cleanStr = String(dateString).trim();
  if (!cleanStr) return '-';

  // Normalize Excel serial numbers or standard date strings first
  const normalized = parseExcelDate(cleanStr, '');
  if (normalized && normalized.includes('-')) {
    const parts = normalized.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  try {
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return cleanStr;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return cleanStr || '-';
  }
}

/**
 * Standard Vietnamese Public Holidays (MM-DD format)
 */
const VIETNAM_PUBLIC_HOLIDAYS = [
  '01-01', // Tết Dương Lịch
  '04-30', // Giải phóng Miền Nam
  '05-01', // Quốc tế Lao động
  '09-02', // Quốc khánh
  '09-03', // Quốc khánh ngày 2
];

/**
 * Checks if a given date is a weekend (Saturday or Sunday) or a standard holiday
 */
export function isNonWorkingDay(date: Date): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return true; // 0 = Sunday, 6 = Saturday

  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const dateKey = `${mm}-${dd}`;
  return VIETNAM_PUBLIC_HOLIDAYS.includes(dateKey);
}

/**
 * Counts the number of WORKING DAYS between two dates (excluding start date, including end date if it's a working day)
 */
export function countWorkingDaysBetween(startDateStr: string | Date, endDateStr: string | Date): number {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (start.getTime() >= end.getTime()) return 0;

  let count = 0;
  const current = new Date(start);
  while (current < end) {
    current.setDate(current.getDate() + 1);
    if (!isNonWorkingDay(current)) {
      count++;
    }
  }
  return count;
}

/**
 * Calculates new due date when resuming a paused dossier.
 * Preserves the exact remaining working days that were left when paused.
 */
export function calculateResumedDueDate(
  originalDueDate: string,
  pauseStartDate: string,
  resumeDate: string = new Date().toISOString().split('T')[0]
): { newDueDate: string; remainingWorkingDays: number; pausedWorkingDays: number } {
  const resume = resumeDate || new Date().toISOString().split('T')[0];
  const pauseStart = pauseStartDate || resume;
  
  // Remaining working days that were left before pause
  const remainingWorkingDays = Math.max(1, countWorkingDaysBetween(pauseStart, originalDueDate));
  const pausedWorkingDays = countWorkingDaysBetween(pauseStart, resume);
  
  // Calculate new due date by adding the remaining working days from resume date
  const newDueDate = addWorkingDays(resume, remainingWorkingDays);

  return {
    newDueDate,
    remainingWorkingDays,
    pausedWorkingDays,
  };
}

/**
 * Adds a specific number of WORKING DAYS (excluding Sat, Sun and holidays) to a start date.
 */
export function addWorkingDays(startDateStr: string | Date, workingDays: number): string {
  const current = new Date(startDateStr);
  if (isNaN(current.getTime())) return new Date().toISOString().split('T')[0];

  let added = 0;
  while (added < workingDays) {
    current.setDate(current.getDate() + 1);
    if (!isNonWorkingDay(current)) {
      added++;
    }
  }

  const yyyy = current.getFullYear();
  const mm = (current.getMonth() + 1).toString().padStart(2, '0');
  const dd = current.getDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Computes standard administrative working days for land procedures according to Decree & Land Law
 */
export function getStandardWorkingDaysForProcedure(procedureName: string): number {
  return getProcedureWorkingDays(procedureName);
}

export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return '-';
  const cleanStr = String(dateString).trim();
  if (!cleanStr) return '-';

  // If numeric serial number without time, return formatted date directly
  if (!isNaN(Number(cleanStr)) && !cleanStr.includes(':') && !cleanStr.includes('-')) {
    return formatDate(cleanStr);
  }

  try {
    // Handle DD/MM/YYYY HH:mm or HH:mm DD/MM/YYYY
    const dmyTimeMatch = cleanStr.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})\s+(\d{1,2}):(\d{2})/);
    if (dmyTimeMatch) {
      const dd = dmyTimeMatch[1].padStart(2, '0');
      const mm = dmyTimeMatch[2].padStart(2, '0');
      const yyyy = dmyTimeMatch[3];
      const hh = dmyTimeMatch[4].padStart(2, '0');
      const min = dmyTimeMatch[5].padStart(2, '0');
      return `${hh}:${min} ${dd}/${mm}/${yyyy}`;
    }

    const timeDmyMatch = cleanStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s+(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})/);
    if (timeDmyMatch) {
      const hh = timeDmyMatch[1].padStart(2, '0');
      const min = timeDmyMatch[2].padStart(2, '0');
      const dd = timeDmyMatch[3].padStart(2, '0');
      const mm = timeDmyMatch[4].padStart(2, '0');
      const yyyy = timeDmyMatch[5];
      return `${hh}:${min} ${dd}/${mm}/${yyyy}`;
    }

    const d = cleanStr.includes(':') ? new Date(cleanStr) : new Date(parseExcelDate(cleanStr, cleanStr));
    if (isNaN(d.getTime())) return formatDate(cleanStr);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    if (cleanStr.includes(':')) {
      return `${hours}:${minutes} ${day}/${month}/${year}`;
    }
    return `${day}/${month}/${year}`;
  } catch (e) {
    return formatDate(cleanStr);
  }
}

export function getDaysRemaining(dueDateString: string): {
  days: number;
  label: string;
  isOverdue: boolean;
  isDueToday: boolean;
  statusClass: string;
  badgeClass: string;
} {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const normalizedDueStr = parseExcelDate(dueDateString, '');
    const due = normalizedDueStr ? new Date(normalizedDueStr) : new Date(NaN);
    if (!normalizedDueStr || isNaN(due.getTime())) {
      return {
        days: 0,
        label: dueDateString || '-',
        isOverdue: false,
        isDueToday: false,
        statusClass: 'text-slate-600 dark:text-slate-400',
        badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      };
    }
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
      return {
        days: diffDays,
        label: `Quá hạn ${overdueDays} ngày`,
        isOverdue: true,
        isDueToday: false,
        statusClass: 'text-rose-600 dark:text-rose-400 font-semibold',
        badgeClass: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      };
    } else if (diffDays === 0) {
      return {
        days: 0,
        label: 'Đến hạn hôm nay',
        isOverdue: false,
        isDueToday: true,
        statusClass: 'text-amber-600 dark:text-amber-400 font-semibold animate-pulse',
        badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      };
    } else if (diffDays <= 3) {
      return {
        days: diffDays,
        label: `Còn ${diffDays} ngày`,
        isOverdue: false,
        isDueToday: false,
        statusClass: 'text-orange-600 dark:text-orange-400 font-medium',
        badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      };
    } else if (diffDays <= 7) {
      return {
        days: diffDays,
        label: `Còn ${diffDays} ngày`,
        isOverdue: false,
        isDueToday: false,
        statusClass: 'text-blue-600 dark:text-blue-400',
        badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      };
    } else {
      return {
        days: diffDays,
        label: `Còn ${diffDays} ngày`,
        isOverdue: false,
        isDueToday: false,
        statusClass: 'text-slate-600 dark:text-slate-400',
        badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      };
    }
  } catch (e) {
    return {
      days: 0,
      label: dueDateString,
      isOverdue: false,
      isDueToday: false,
      statusClass: 'text-slate-600',
      badgeClass: 'bg-slate-100 text-slate-700',
    };
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Single unified logic to determine if a task is overdue across all modules
 */
export function isTaskOverdue(task?: {
  status?: string;
  dueDate?: string;
  note?: string;
  direction?: string;
} | null): boolean {
  if (!task || task.status === 'completed') return false;
  if (task.note?.toLowerCase().includes('bổ sung') || task.direction?.toLowerCase().includes('bổ sung')) {
    return false;
  }
  if (!task.dueDate) return false;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const normalizedDue = parseExcelDate(task.dueDate, '');
    if (!normalizedDue) return false;
    const due = new Date(normalizedDue);
    if (isNaN(due.getTime())) return false;
    due.setHours(0, 0, 0, 0);
    return due.getTime() < today.getTime();
  } catch {
    return false;
  }
}

/**
 * Single unified logic to determine if a dossier is overdue across all modules
 */
export function isDossierOverdue(dossier?: {
  status?: string;
  dueDate?: string;
  supplementDate?: string;
  resumedDate?: string;
} | null): boolean {
  if (!dossier || dossier.status === 'resolved' || dossier.status === 'rejected') return false;
  if (dossier.status === 'supplement' || dossier.status === 'paused') return false;
  if (dossier.supplementDate && !dossier.resumedDate) return false;
  if (!dossier.dueDate) return false;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const normalizedDue = parseExcelDate(dossier.dueDate, '');
    if (!normalizedDue) return false;
    const due = new Date(normalizedDue);
    if (isNaN(due.getTime())) return false;
    due.setHours(0, 0, 0, 0);
    return due.getTime() < today.getTime();
  } catch {
    return false;
  }
}
