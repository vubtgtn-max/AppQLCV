import React, { useState, useEffect } from 'react';

interface CurrencyInputProps {
  value?: number;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

function formatVietnameseCurrency(val?: number): string {
  if (val === undefined || val === null || isNaN(val) || val === 0) return '';
  return Math.round(val).toLocaleString('vi-VN');
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  placeholder = 'VD: 850.000.000',
  className = '',
  required = false,
  disabled = false,
}) => {
  const [displayValue, setDisplayValue] = useState<string>(() =>
    formatVietnameseCurrency(value)
  );
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatVietnameseCurrency(value));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly) {
      setDisplayValue('');
      onChange(0);
      return;
    }
    const num = parseInt(digitsOnly, 10) || 0;
    setDisplayValue(num === 0 ? '0' : num.toLocaleString('vi-VN'));
    onChange(num);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setDisplayValue(formatVietnameseCurrency(value));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
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
