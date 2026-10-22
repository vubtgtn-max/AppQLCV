import React from 'react';
import { X, Printer, Download, Copy, Check, Edit3 } from 'lucide-react';
import { previewModalStyles } from './previewModalStyles';

export interface PreviewModalHeaderProps {
  icon: React.ReactNode;
  iconBgClass?: string;
  title: string;
  code?: string;
  codeBadgeClass?: string;
  meta?: React.ReactNode;
  statusBadge?: React.ReactNode;
  // Standard Actions
  onCopy?: () => void;
  isCopied?: boolean;
  copyLabel?: string;
  onDownloadWord?: () => void;
  wordLabel?: string;
  onDownloadExcel?: () => void;
  excelLabel?: string;
  onPrint?: () => void;
  printLabel?: string;
  onEdit?: () => void;
  editLabel?: string;
  onClose: () => void;
  customActions?: React.ReactNode;
}

export const PreviewModalHeader: React.FC<PreviewModalHeaderProps> = ({
  icon,
  iconBgClass = 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
  title,
  code,
  codeBadgeClass = 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
  meta,
  statusBadge,
  onCopy,
  isCopied = false,
  copyLabel = 'Sao chép',
  onDownloadWord,
  wordLabel = 'Tải Word (.doc)',
  onDownloadExcel,
  excelLabel = 'Xuất Excel',
  onPrint,
  printLabel = 'In (A4)',
  onEdit,
  editLabel = 'Chỉnh sửa',
  onClose,
  customActions,
}) => {
  return (
    <div className={previewModalStyles.header}>
      {/* Left: Icon + Text Group */}
      <div className={previewModalStyles.headerLeft}>
        <div className={`${previewModalStyles.headerIcon} ${iconBgClass}`}>
          {icon}
        </div>
        <div className={previewModalStyles.headerTextGroup}>
          {/* Row 1 on mobile, left block on desktop */}
          <div className={previewModalStyles.headerTitleRow}>
            <h2 className={previewModalStyles.headerTitle} title={title}>
              {title}
            </h2>
            {code && (
              <span className={`${previewModalStyles.codeBadge} ${codeBadgeClass}`}>
                {code}
              </span>
            )}
          </div>
          {/* Row 2 on mobile, right block on desktop */}
          {(meta || statusBadge) && (
            <div className={previewModalStyles.headerMetaRow}>
              {meta && <span className="truncate">{meta}</span>}
              {statusBadge}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions Cluster (Icon-only with tooltip/aria-label on mobile, labeled on desktop) */}
      <div className={previewModalStyles.headerActions}>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className={previewModalStyles.btnSecondary}
            title={isCopied ? 'Đã sao chép vào bộ nhớ tạm' : copyLabel}
            aria-label={copyLabel}
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isCopied ? 'Đã chép' : copyLabel}</span>
          </button>
        )}

        {onDownloadExcel && (
          <button
            type="button"
            onClick={onDownloadExcel}
            className={previewModalStyles.btnExcel}
            title={excelLabel}
            aria-label={excelLabel}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{excelLabel}</span>
          </button>
        )}

        {onDownloadWord && (
          <button
            type="button"
            onClick={onDownloadWord}
            className={previewModalStyles.btnWord}
            title={wordLabel}
            aria-label={wordLabel}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{wordLabel}</span>
          </button>
        )}

        {onPrint && (
          <button
            type="button"
            onClick={onPrint}
            className={previewModalStyles.btnPrint}
            title={printLabel}
            aria-label={printLabel}
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{printLabel}</span>
          </button>
        )}

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className={previewModalStyles.btnWord}
            title={editLabel}
            aria-label={editLabel}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{editLabel}</span>
          </button>
        )}

        {customActions}

        <button
          type="button"
          onClick={onClose}
          className={previewModalStyles.btnClose}
          title="Đóng cửa sổ (Esc)"
          aria-label="Đóng cửa sổ"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
