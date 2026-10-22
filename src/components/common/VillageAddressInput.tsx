import React, { useState, useMemo, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Plus, Trash2, Check, X, Search, Sparkles } from 'lucide-react';
import { useRealtime } from '../../contexts/RealtimeContext';
import { LANH_NGOC_VILLAGES, COMMUNE_FULL_SUFFIX } from '../../constants/procedures';

export interface VillageAddressInputProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  mode?: 'address' | 'location';
  helperText?: string;
  disabled?: boolean;
}

export const VillageAddressInput: React.FC<VillageAddressInputProps> = ({
  value,
  onChange,
  label,
  placeholder,
  required = false,
  className = '',
  mode = 'address',
  helperText,
  disabled = false,
}) => {
  const { villages, addVillage, deleteVillage } = useRealtime();

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [detectedNewVillage, setDetectedNewVillage] = useState<string | null>(null);
  const [declinedVillages, setDeclinedVillages] = useState<Set<string>>(new Set());

  // Modal / prompt for adding village manually
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [manualVillageName, setManualVillageName] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered villages list based on dropdown search
  const filteredVillages = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return villages;
    return villages.filter((v) => v.toLowerCase().includes(term));
  }, [villages, searchTerm]);

  // Normalize village name (e.g. "tái đa" -> "Thôn Tái Đa", "thôn tái đa" -> "Thôn Tái Đa")
  const normalizeVillageName = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) return '';
    let body = trimmed;
    if (trimmed.toLowerCase().startsWith('thôn ') || trimmed.toLowerCase().startsWith('thon ')) {
      body = trimmed.slice(5).trim();
    }
    // Capitalize each word nicely
    const capitalized = body
      .split(/\s+/)
      .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : ''))
      .join(' ');
    return `Thôn ${capitalized}`;
  };

  // Detect if current input value contains a new village not yet in saved list
  useEffect(() => {
    if (!value || disabled) {
      setDetectedNewVillage(null);
      return;
    }

    const trimmed = value.trim();

    // Check if input matches an already saved village
    const matchesSaved = villages.some((v) => {
      const vLower = v.toLowerCase();
      const valLower = trimmed.toLowerCase();
      return valLower.includes(vLower) || vLower === valLower;
    });

    if (matchesSaved) {
      setDetectedNewVillage(null);
      return;
    }

    // Try to extract potential village name like "Thôn XYZ" or "thôn XYZ"
    const match = trimmed.match(/(?:Thôn|thôn|THÔN)\s+([^,;.\n]+)/);
    if (match && match[1]) {
      const candidateRaw = match[1].trim();
      const candidate = normalizeVillageName(candidateRaw);
      if (
        candidateRaw.length >= 2 &&
        !villages.some((v) => v.toLowerCase() === candidate.toLowerCase()) &&
        !declinedVillages.has(candidate.toLowerCase())
      ) {
        setDetectedNewVillage(candidate);
        return;
      }
    } else if (
      // If user typed a short custom location without the word "Thôn", e.g. "Tái Đa"
      trimmed.length >= 3 &&
      trimmed.length <= 25 &&
      !trimmed.includes(',') &&
      !trimmed.includes('/') &&
      !declinedVillages.has(normalizeVillageName(trimmed).toLowerCase())
    ) {
      const candidate = normalizeVillageName(trimmed);
      if (!villages.some((v) => v.toLowerCase() === candidate.toLowerCase())) {
        setDetectedNewVillage(candidate);
        return;
      }
    }

    setDetectedNewVillage(null);
  }, [value, villages, declinedVillages, disabled]);

  // Handle selecting a village from dropdown
  const handleSelectVillage = (village: string) => {
    const cleanVillage = village.replace(/,\s*xã Lãnh Ngọc.*$/i, '').trim();
    onChange(`${cleanVillage}, ${COMMUNE_FULL_SUFFIX}`);
    setIsOpen(false);
    setSearchTerm('');
    setDetectedNewVillage(null);
  };

  // Save detected new village
  const handleConfirmSaveNewVillage = async (villageName: string) => {
    const normalized = normalizeVillageName(villageName);
    if (!normalized) return;
    await addVillage(normalized);
    setDetectedNewVillage(null);
  };

  // Decline saving detected new village
  const handleDeclineSaveNewVillage = (villageName?: string) => {
    if (villageName) {
      setDeclinedVillages((prev) => new Set(prev).add(villageName.toLowerCase()));
    }
    setDetectedNewVillage(null);
  };

  // Add village manually via modal/prompt
  const handleAddManualVillage = async (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e && 'preventDefault' in e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    const normalized = normalizeVillageName(manualVillageName);
    if (!normalized) return;
    await addVillage(normalized);
    handleSelectVillage(normalized);
    setManualVillageName('');
    setIsAddModalOpen(false);
  };

  return (
    <div ref={containerRef} className={`space-y-1.5 ${className}`}>
      {/* Label & Header */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>Xã Lãnh Ngọc ({villages.length} thôn)</span>
          </span>
        </div>
      )}

      {/* Main Input with Dropdown trigger */}
      <div className="relative">
        <div className="relative flex items-center">
          <input
            type="text"
            required={required}
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onClick={() => setIsOpen(true)}
            placeholder={
              placeholder ||
              (mode === 'location'
                ? 'VD: Thôn Tiên Hiệp (hoặc bấm chọn/gõ thôn mới...)'
                : 'VD: Thôn Tiên Hiệp, xã Lãnh Ngọc, thành phố Đà Nẵng')
            }
            className="w-full pl-3 pr-16 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-medium"
          />

          <div className="absolute right-1.5 flex items-center gap-1">
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Xóa nhanh nội dung"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer"
              title="Xem danh sách thôn xã Lãnh Ngọc"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-72 flex flex-col"
          >
            {/* Dropdown Header & Search */}
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400 ml-1 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm thôn hoặc gõ thôn mới để thêm..."
                className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden"
                autoFocus
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Inside dropdown: Prompt if new village is detected */}
            {detectedNewVillage && (
              <div className="m-2 p-2.5 bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 rounded-xl space-y-1.5 text-xs shadow-xs animate-in fade-in">
                <div className="flex items-start gap-1.5">
                  <span className="text-base leading-none">📍</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-amber-900 dark:text-amber-200">
                        Phát hiện thôn mới:
                      </span>
                      <span className="font-extrabold text-rose-700 dark:text-rose-400 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.5 rounded-md">
                        {detectedNewVillage}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-1 leading-snug">
                      <strong>Hệ thống hỏi:</strong> Có lưu thôn mới để chọn lần sau không? (Sau khi lưu sẽ tự động xổ xuống và áp dụng cho tất cả các tab)
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200 dark:border-amber-800/60">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeclineSaveNewVillage(detectedNewVillage);
                    }}
                    className="px-2.5 py-1 text-xs rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-medium cursor-pointer"
                  >
                    Không
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmSaveNewVillage(detectedNewVillage);
                    }}
                    className="px-3 py-1 text-xs rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" /> Có, lưu thôn mới
                  </button>
                </div>
              </div>
            )}

            {/* List of Villages */}
            <div className="overflow-y-auto p-1.5 space-y-0.5 flex-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Chọn nhanh Thôn ({villages.length}) — Tự động thêm {COMMUNE_FULL_SUFFIX}
              </div>

              {filteredVillages.map((v) => {
                const isSelected = value.includes(v);
                const isDefault = (LANH_NGOC_VILLAGES as readonly string[]).includes(v);

                return (
                  <div
                    key={v}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    onClick={() => handleSelectVillage(v)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="truncate">
                        {v}, <span className="text-slate-500 font-normal">{COMMUNE_FULL_SUFFIX}</span>
                      </span>
                      {isDefault ? (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 font-normal shrink-0">
                          Mặc định
                        </span>
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold shrink-0">
                          Thêm mới
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      {!isDefault && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Bạn có chắc chắn muốn xóa thôn "${v}" khỏi danh mục dùng chung không?`)) {
                              deleteVillage(v);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 transition rounded-md hover:bg-rose-50 dark:hover:bg-rose-950"
                          title="Xóa thôn này khỏi danh mục dùng chung"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* If search term is typed and not found, suggest adding immediately */}
              {searchTerm.trim() &&
                !villages.some((v) => v.toLowerCase() === normalizeVillageName(searchTerm).toLowerCase()) && (
                  <button
                    type="button"
                    onClick={() => {
                      const newName = normalizeVillageName(searchTerm);
                      addVillage(newName);
                      handleSelectVillage(newName);
                    }}
                    className="w-full text-left px-2.5 py-2 mt-1 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-dashed border-emerald-300 dark:border-emerald-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Thêm thôn mới: "{normalizeVillageName(searchTerm)}"</span>
                  </button>
                )}
            </div>

            {/* Dropdown Footer: Manual Add Button */}
            <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500">Áp dụng cho tất cả các tab</span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsAddModalOpen(true);
                }}
                className="px-2 py-1 rounded-md text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Ghi thêm thôn mới
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Smart Prompt on New Village Detection (Outside Dropdown) */}
      {!isOpen && detectedNewVillage && (
        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-xs space-y-1.5 animate-in fade-in duration-150 shadow-xs">
          <div className="flex items-start gap-2">
            <span className="text-base leading-none">📍</span>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-amber-900 dark:text-amber-200">
                  Phát hiện thôn mới:
                </span>
                <span className="font-extrabold text-rose-700 dark:text-rose-400 bg-amber-100 dark:bg-amber-900/60 px-1.5 py-0.2 rounded-md">
                  {detectedNewVillage}
                </span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-snug">
                <strong>Hệ thống hỏi:</strong> Có lưu thôn mới để chọn lần sau không? (Sau khi lưu sẽ tự động xổ xuống và áp dụng cho tất cả các tab)
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200 dark:border-amber-900/60">
            <button
              type="button"
              onClick={() => handleDeclineSaveNewVillage(detectedNewVillage)}
              className="px-2.5 py-1 text-xs rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-medium cursor-pointer"
            >
              Không
            </button>
            <button
              type="button"
              onClick={() => handleConfirmSaveNewVillage(detectedNewVillage)}
              className="px-3 py-1 text-xs rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Có, lưu thôn mới
            </button>
          </div>
        </div>
      )}

      {helperText && (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
          {helperText}
        </p>
      )}

      {/* Manual Add Village Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                  <MapPin className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold uppercase text-slate-800 dark:text-white">
                  Thêm Thôn Mới Vào Danh Mục
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên Thôn / Địa bàn <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="VD: Thôn Tái Đa"
                  value={manualVillageName}
                  onChange={(e) => setManualVillageName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddManualVillage(e);
                    }
                  }}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-semibold"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Thôn mới sau khi lưu sẽ tự động xuất hiện trong danh sách xổ xuống của tất cả các tab (Hồ sơ đất đai, Quỹ đất 5%, Trật tự xây dựng, Tranh chấp, GPMB).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleAddManualVillage}
                  className="px-3.5 py-1.5 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Lưu thôn mới
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
