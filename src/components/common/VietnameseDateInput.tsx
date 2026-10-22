import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

interface VietnameseDateInputProps {
  value?: string;
  onChange: (yyyyMmDd: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

/**
 * Converts YYYY-MM-DD or DD/MM/YYYY to DD/MM/YYYY for display
 */
function toDisplayDMY(val?: string): string {
  if (!val) return '';
  const trimmed = String(val).trim();
  if (!trimmed) return '';

  // Match YYYY-MM-DD
  const ymd = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) {
    return `${ymd[3].padStart(2, '0')}/${ymd[2].padStart(2, '0')}/${ymd[1]}`;
  }

  // Match DD/MM/YYYY
  const dmy = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (dmy) {
    return `${dmy[1].padStart(2, '0')}/${dmy[2].padStart(2, '0')}/${dmy[3]}`;
  }

  return trimmed;
}

/**
 * Converts DD/MM/YYYY to YYYY-MM-DD if valid
 */
function parseDMYToISO(display: string): string | null {
  const trimmed = display.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
  if (!match) return null;
  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const VietnameseDateInput: React.FC<VietnameseDateInputProps> = ({
  value = '',
  onChange,
  placeholder = 'dd/mm/yyyy',
  className = '',
  required = false,
  disabled = false,
}) => {
  const [displayValue, setDisplayValue] = useState<string>(() => toDisplayDMY(value));
  const [isFocused, setIsFocused] = useState(false);
  const nativePickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(toDisplayDMY(value));
    }
  }, [value, isFocused]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow digits and slashes
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 8);

    let formatted = raw;
    // Auto-insert slashes when typing digits forward
    if (/^\d+$/.test(raw.replace(/\//g, '')) && raw.length >= displayValue.length) {
      if (digitsOnly.length <= 2) {
        formatted = digitsOnly;
      } else if (digitsOnly.length <= 4) {
        formatted = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
      } else {
        formatted = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
      }
    }

    setDisplayValue(formatted);

    if (!formatted.trim()) {
      onChange('');
      return;
    }

    const iso = parseDMYToISO(formatted);
    if (iso !== null && formatted.replace(/\D/g, '').length === 8) {
      onChange(iso);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!displayValue.trim()) {
      onChange('');
      setDisplayValue('');
      return;
    }
    const iso = parseDMYToISO(displayValue);
    if (iso !== null) {
      onChange(iso);
      setDisplayValue(toDisplayDMY(iso));
    } else {
      // Revert to valid prop value if incomplete/invalid
      setDisplayValue(toDisplayDMY(value));
    }
  };

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoVal = e.target.value; // YYYY-MM-DD
    onChange(isoVal);
    setDisplayValue(toDisplayDMY(isoVal));
  };

  const openPicker = () => {
    if (disabled || !nativePickerRef.current) return;
    try {
      if (typeof (nativePickerRef.current as any).showPicker === 'function') {
        (nativePickerRef.current as any).showPicker();
      } else {
        nativePickerRef.current.focus();
        nativePickerRef.current.click();
      }
    } catch {
      nativePickerRef.current.focus();
    }
  };

  const isoValueForPicker = /^\d{4}-\d{2}-\d{2}$/.test(value || '')
    ? value
    : parseDMYToISO(displayValue) || '';

  return (
    <div className="relative flex items-center w-full">
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onFocus={() => setIsFocused(true)}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={10}
        className={`${className} pr-9`}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={openPicker}
        title="Chọn ngày trên lịch (dd/mm/yyyy)"
        className="absolute right-2.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer p-0.5"
      >
        <Calendar className="w-4 h-4" />
      </button>
      <input
        ref={nativePickerRef}
        type="date"
        tabIndex={-1}
        value={isoValueForPicker}
        onChange={handleNativeDateChange}
        disabled={disabled}
        className="sr-only pointer-events-none w-0 h-0 opacity-0 absolute right-0"
      />
    </div>
  );
};
