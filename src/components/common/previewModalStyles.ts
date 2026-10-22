export const PREVIEW_HEADER_LAYOUT = 'flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-2.5 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';
export const PREVIEW_ACTIONS_LAYOUT = 'flex items-center justify-end gap-1.5 shrink-0';
export const PREVIEW_ACTION_BUTTON_LAYOUT = 'px-2.5 py-1.5 text-[11px] gap-1.5';
export const PREVIEW_TABS_LAYOUT = 'flex flex-nowrap items-center gap-1 overflow-x-auto min-w-0 max-w-full shrink-0';
export const PREVIEW_TAB_BUTTON_LAYOUT = 'shrink-0 px-2.5 py-1.5 text-[11px] whitespace-nowrap';
export const PREVIEW_DOCUMENT_BODY_LAYOUT = 'min-h-0 flex-1 overflow-auto p-2 sm:p-4';

export const previewModalStyles = {
  header: PREVIEW_HEADER_LAYOUT,
  headerLeft: 'flex items-center gap-2 sm:gap-3 min-w-0 flex-1',
  headerIcon: 'p-2 rounded-lg shrink-0 flex items-center justify-center',
  headerTextGroup: 'min-w-0 flex-1',
  headerTitleRow: 'flex items-center gap-2 flex-wrap',
  headerTitle: 'text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate',
  codeBadge: 'px-2 py-0.5 text-xs font-mono font-semibold rounded border',
  headerMetaRow: 'flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5',
  headerActions: PREVIEW_ACTIONS_LAYOUT,
  btnSecondary: `inline-flex items-center ${PREVIEW_ACTION_BUTTON_LAYOUT} font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded transition-colors`,
  btnExcel: `inline-flex items-center ${PREVIEW_ACTION_BUTTON_LAYOUT} font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded transition-colors`,
  btnWord: `inline-flex items-center ${PREVIEW_ACTION_BUTTON_LAYOUT} font-medium text-blue-700 dark:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded transition-colors`,
  btnPrint: `inline-flex items-center ${PREVIEW_ACTION_BUTTON_LAYOUT} font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded transition-colors`,
  btnClose: 'p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors',
};
