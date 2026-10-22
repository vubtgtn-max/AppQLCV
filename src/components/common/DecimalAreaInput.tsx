import React, { useState, useEffect } from 'react';

interface DecimalAreaInputProps {
  value?: number;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

function formatNumberToVietnameseDecimal(val?: number): string {
  if (val === undefined || val === null || isNaN(val) || val === 0) return '';
  return String(val).replace('.', ',');
}

function parseVietnameseDecimal(raw: string): number {
  if (!raw || !raw.trim()) return 0;
  // Normalize comma to dot for parseFloat
  const normalized = raw.trim().replace(/,/g, '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

export const DecimalAreaInput: React.FC<DecimalAreaInputProps> = ({
  value,
  onChange,
  placeholder = 'VD: 125,5',
  className = '',
  required = false,
  disabled = false,
}) => {
  const [displayValue, setDisplayValue] = useState<string>(() =>
    formatNumberToVietnameseDecimal(value)
  );
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatNumberToVietnameseDecimal(value));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // Allow digits, comma (,), and dot (.) — convert dot to comma for consistent Vietnamese display
    raw = raw.replace(/\./g, ',').replace(/[^0-9,]/g, '');

    // Ensure at most one comma
    const parts = raw.split(',');
    if (parts.length > 2) {
      raw = `${parts[0]},${parts.slice(1).join('')}`;
    }

    setDisplayValue(raw);
    onChange(parseVietnameseDecimal(raw));
  };

  const handleBlur = () => {
    setIsFocused(false);
    const num = parseVietnameseDecimal(displayValue);
    onChange(num);
    setDisplayValue(num === 0 && !displayValue.trim() ? '' : num === 0 ? '0' : String(num).replace('.', ','));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onFocus={() => setIsFocused(true)}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={className}
    />
  );
};
