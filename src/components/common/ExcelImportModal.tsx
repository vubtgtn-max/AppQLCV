import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Dossier, Task, User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../contexts/RealtimeContext';
import { apiService } from '../../services/api';
import { localVault } from '../../services/localVault';
import { exportToExcel } from '../../utils/export';
import { parseExcelDate, formatDate } from '../../utils/date';
import {
  FileSpreadsheet,
  Upload,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  FolderArchive,
  Briefcase,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'dossiers' | 'tasks';
  onSuccess: () => void;
}

// Robust helper to extract Excel cell value across diverse column naming styles
function findExcelValue(row: any, candidates: string[], pattern?: RegExp): any {
  if (!row || typeof row !== 'object') return undefined;

  // 1. Direct exact match
  for (const c of candidates) {
    if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') {
      return row[c];
    }
  }

  // 2. Case-insensitive & trimmed match
  const rowKeys = Object.keys(row);
  for (const c of candidates) {
    const cLower = c.toLowerCase().trim();
    for (const key of rowKeys) {
      if (key.toLowerCase().trim() === cLower) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
          return row[key];
        }
      }
    }
  }

  // 3. Substring match
  for (const c of candidates) {
    const cLower = c.toLowerCase().trim();
    for (const key of rowKeys) {
      const kLower = key.toLowerCase().trim();
      if (kLower.includes(cLower) || cLower.includes(kLower)) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
          return row[key];
        }
      }
    }
  }

  // 4. Regex pattern match
  if (pattern) {
    for (const key of rowKeys) {
      if (pattern.test(key) || pattern.test(key.toLowerCase())) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
          return row[key];
        }
      }
    }
  }

  return undefined;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'dossiers',
  onSuccess,
}) => {
  const { user } = useAuth();
  const { users, refreshData } = useRealtime();

  const [importType, setImportType] = useState<'dossiers' | 'tasks'>(defaultType);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);
  const isParsingRef = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      isProcessingRef.current = false;
      isParsingRef.current = false;
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const todayFormatted = formatDate(new Date().toISOString().split('T')[0]);
    const due15Formatted = formatDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
    const due10Formatted = formatDate(new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]);
    const due7Formatted = formatDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);

    if (importType === 'dossiers') {
      const templateData = [
        {
          'Mã hồ sơ (Bỏ trống tự tạo)': 'H17.130-260822-0001',
          'Chủ sử dụng / Người nộp (*)': 'Nguyễn Văn Nam & Lê Thị Hoa',
          'Số thửa (*)': '125',
          'Tờ bản đồ (*)': '18',
          'Thủ tục hành chính (*)': 'Cấp Giấy chứng nhận QSDĐ lần đầu',
          'Kẹp lưu trữ': 'Kẹp 15',
          'STT kẹp': '15',
          'Địa chỉ thửa đất': 'Thôn Ngọc Sơn, xã Lãnh Ngọc',
          'Ngày tiếp nhận (DD/MM/YYYY)': todayFormatted,
          'Hạn trả (DD/MM/YYYY) (*)': due15Formatted,
          'Cán bộ thụ lý': 'Lê Văn Liệu',
          'Ghi chú': 'Diện tích 250m2 đất ở',
        },
        {
          'Mã hồ sơ (Bỏ trống tự tạo)': '',
          'Chủ sử dụng / Người nộp (*)': 'Trần Văn Bình',
          'Số thửa (*)': '89',
          'Tờ bản đồ (*)': '14',
          'Thủ tục hành chính (*)': 'Đính chính / Cấp đổi GCN bị mất, hư hỏng',
          'Kẹp lưu trữ': 'Kẹp 15',
          'STT kẹp': '16',
          'Địa chỉ thửa đất': 'Thôn Lãnh Thượng',
          'Ngày tiếp nhận (DD/MM/YYYY)': todayFormatted,
          'Hạn trả (DD/MM/YYYY) (*)': due10Formatted,
          'Cán bộ thụ lý': 'Đoàn Văn Hoài Vũ',
          'Ghi chú': 'Đổi do hư hỏng',
        },
      ];
      exportToExcel(templateData, 'Mau_Nhap_Ho_So_Dat_Dai_Chuan_UBND');
    } else {
      const templateData = [
        {
          'Tên nhiệm vụ (*)': 'Kiểm tra hiện trạng xây dựng trái phép',
          'Lĩnh vực (*)': 'Trật tự xây dựng',
          'Mức độ ưu tiên (high/medium/low)': 'high',
          'Ngày bắt đầu (DD/MM/YYYY)': todayFormatted,
          'Hạn xử lý (DD/MM/YYYY) (*)': due7Formatted,
          'Cán bộ thực hiện': 'Lê Văn Liệu',
          'Chỉ đạo / Yêu cầu': 'Lập biên bản xử lý theo thẩm quyền',
          'Ghi chú': 'Báo cáo UBND trước thứ 6',
        },
        {
          'Tên nhiệm vụ (*)': 'Thẩm tra hồ sơ cấp GCN Thửa 45 TBĐ 12',
          'Lĩnh vực (*)': 'Cấp giấy lần đầu',
          'Mức độ ưu tiên (high/medium/low)': 'medium',
          'Ngày bắt đầu (DD/MM/YYYY)': todayFormatted,
          'Hạn xử lý (DD/MM/YYYY) (*)': due10Formatted,
          'Cán bộ thực hiện': 'Đoàn Văn Hoài Vũ',
          'Chỉ đạo / Yêu cầu': 'Kiểm tra đối chiếu hồ sơ địa chính',
          'Ghi chú': '',
        },
      ];
      exportToExcel(templateData, 'Mau_Nhap_Nhiem_Vu_Cong_Viec');
    }
  };

  // Handle File Upload & Parse with Intelligent Header Row Detection
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isParsingRef.current) return;
    setErrorMsg(null);
    setSuccessCount(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setFileName(file.name);

    isParsingRef.current = true;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        const wb = XLSX.read(buffer, { type: 'array', cellDates: false });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];

        // Read sheet as rows to auto-detect header row (skipping banner/title rows)
        const rowsMatrix: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!rowsMatrix || rowsMatrix.length === 0) {
          setErrorMsg('File Excel không có dữ liệu hoặc định dạng không hợp lệ.');
          return;
        }

        let headerRowIndex = 0;
        let maxKeywordsMatched = 0;

        const headerKeywords = [
          /chủ|người nộp|người sử dụng|họ tên|họ và tên|khách hàng|bên chuyển/i,
          /thửa/i,
          /tờ|bản đồ|tbđ/i,
          /thủ tục|nội dung|lĩnh vực|loại hồ sơ/i,
          /tiếp nhận|ngày nhận|ngày nộp|ngày gửi|ngày vào/i,
          /hạn trả|hạn xử lý|hạn giải quyết|hạn chót|ngày hẹn|ngày trả/i,
          /cán bộ|chuyên viên|thụ lý|người xử lý|thực hiện/i,
          /kẹp|vị trí/i,
          /stt|số thứ tự/i,
        ];

        for (let r = 0; r < Math.min(rowsMatrix.length, 15); r++) {
          const row = rowsMatrix[r];
          if (!Array.isArray(row)) continue;
          let matches = 0;
          for (const cell of row) {
            const text = String(cell || '').trim();
            if (!text) continue;
            for (const kw of headerKeywords) {
              if (kw.test(text)) {
                matches++;
                break;
              }
            }
          }
          if (matches > maxKeywordsMatched && matches >= 2) {
            maxKeywordsMatched = matches;
            headerRowIndex = r;
          }
        }

        const rawData = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex, defval: '' });

        if (!rawData || rawData.length === 0) {
          setErrorMsg('File Excel không có dòng dữ liệu nào sau tiêu đề.');
          return;
        }

        setParsedRows(rawData);
      } catch (err: any) {
        setErrorMsg('Lỗi khi đọc file Excel: ' + err.message);
      } finally {
        isParsingRef.current = false;
      }
    };
    reader.onerror = () => {
      isParsingRef.current = false;
      setErrorMsg('Lỗi khi đọc file Excel.');
    };
    reader.readAsArrayBuffer(file);
  };

  // Match specialist name to user object
  const findUserByFuzzyName = (nameString: string): User | undefined => {
    if (!nameString) return users.find((u) => u.role === 'specialist') || users[0];
    const clean = nameString.toLowerCase().trim();
    return users.find((u) => u.name.toLowerCase().includes(clean) || clean.includes(u.name.toLowerCase()));
  };

  // Execute Batch Import
  const handleExecuteImport = async () => {
    if (parsedRows.length === 0 || isProcessing || isProcessingRef.current) return;

    isProcessingRef.current = true;
    setIsProcessing(true);
    setErrorMsg(null);
    let imported = 0;

    try {
      if (importType === 'dossiers') {
        const dossiersToImport: Partial<Dossier>[] = [];

        for (const row of parsedRows) {
          const hasAnyCell = Object.values(row).some((v) => v !== null && v !== undefined && String(v).trim() !== '');
          if (!hasAnyCell) continue;

          const owner = findExcelValue(
            row,
            [
              'Chủ sử dụng / Người nộp (*)',
              'Chủ sử dụng / Người nộp',
              'Chủ sử dụng',
              'Người nộp',
              'Chủ hồ sơ',
              'Chủ đất',
              'Họ và tên',
              'Họ tên',
              'Người sử dụng đất',
              'Người sử dụng',
              'Tên chủ hộ',
              'Chủ hộ',
              'Đối tượng',
              'Bên chuyển nhượng',
              'Tên khách hàng',
              'Chủ sở hữu',
              'Chủ sở hữu đất',
              'Họ tên người nộp',
              'Họ tên chủ sử dụng',
              'owner',
              'name',
            ],
            /chủ|người nộp|người sử dụng|họ và tên|họ tên|chủ hộ|chủ đất|đối tượng/i
          );
          const parcel = String(
            findExcelValue(
              row,
              ['Số thửa (*)', 'Số thửa', 'Thửa đất', 'Thửa', 'Số thửa đất', 'Thửa số', 'parcel', 'plot'],
              /thửa/i
            ) || ''
          ).trim();
          const mapSheet = String(
            findExcelValue(
              row,
              ['Tờ bản đồ (*)', 'Tờ bản đồ', 'Tờ BĐ', 'Tờ BĐ (*)', 'Bản đồ', 'Số tờ', 'Số tờ bản đồ', 'Tờ số', 'TBĐ', 'Số TBĐ', 'Tờ BĐ số', 'Tờ', 'mapSheet', 'sheet'],
              /bản đồ|tờ bđ|tbđ|số tờ|tờ số|^tờ$|^tờ\s+/i
            ) || ''
          ).trim();
          const procedure = findExcelValue(
            row,
            ['Thủ tục hành chính (*)', 'Thủ tục hành chính', 'Tên thủ tục', 'Thủ tục', 'Loại hồ sơ', 'Nội dung', 'procedure'],
            /thủ tục|loại hồ sơ|nội dung/i
          ) || 'Cấp giấy lần đầu';

          const rawReceived = findExcelValue(
            row,
            [
              'Ngày tiếp nhận (DD/MM/YYYY)',
              'Ngày tiếp nhận (dd/mm/yyyy)',
              'Ngày tiếp nhận (YYYY-MM-DD)',
              'Ngày tiếp nhận',
              'Ngày nhận',
              'Ngày nộp',
              'Ngày vào sổ',
              'receivedDate',
            ],
            /tiếp nhận|ngày nhận|ngày nộp/i
          );

          const rawDue = findExcelValue(
            row,
            [
              'Hạn trả (DD/MM/YYYY) (*)',
              'Hạn trả (dd/mm/yyyy) (*)',
              'Hạn trả (DD/MM/YYYY)',
              'Hạn trả (dd/mm/yyyy)',
              'Hạn trả (YYYY-MM-DD) (*)',
              'Hạn trả (YYYY-MM-DD)',
              'Hạn trả',
              'Hạn giải quyết',
              'Hạn xử lý',
              'Hạn chót',
              'Ngày hẹn trả',
              'Ngày trả kết quả',
              'dueDate',
            ],
            /hạn trả|hạn giải quyết|hạn xử lý|hạn chót|ngày hẹn/i
          );
          
          const defaultReceived = new Date().toISOString().split('T')[0];
          const defaultDue = new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0];
          const receivedDate = parseExcelDate(rawReceived, defaultReceived);
          const dueDate = parseExcelDate(rawDue, defaultDue);

          const handlerNameStr = findExcelValue(
            row,
            ['Cán bộ thụ lý', 'Chuyên viên thụ lý', 'Chuyên viên', 'Cán bộ', 'Người thụ lý', 'handler'],
            /thụ lý|cán bộ|chuyên viên/i
          );
          const address = findExcelValue(
            row,
            ['Địa chỉ thửa đất', 'Địa chỉ', 'Vị trí thửa đất', 'Vị trí', 'address'],
            /địa chỉ|vị trí/i
          ) || '';
          const note = findExcelValue(row, ['Ghi chú', 'Ý kiến', 'note'], /ghi chú/i) || '';
          const customCode = findExcelValue(
            row,
            ['Mã hồ sơ (Bỏ trống tự tạo)', 'Mã hồ sơ', 'Số hồ sơ', 'Mã HS', 'code'],
            /mã hồ sơ|mã hs/i
          );

          // Skip only if no identifiable data at all
          if (!owner && !parcel && !mapSheet && !customCode) continue;

          const cleanOwner = owner ? String(owner).trim() : 'Chủ hộ (Chưa ghi tên)';
          const cleanParcel = parcel ? String(parcel).trim() : '-';
          const cleanMapSheet = mapSheet ? String(mapSheet).trim() : '-';

          const matchedUser = findUserByFuzzyName(handlerNameStr);
          const storageFolder = findExcelValue(
            row,
            ['Kẹp lưu trữ', 'Kẹp hồ sơ', 'Kẹp', 'Vị trí kẹp', 'storageFolder'],
            /kẹp/i
          ) || 'Kẹp 1';
          const storageIndex = findExcelValue(
            row,
            ['STT kẹp', 'Số thứ tự kẹp', 'STT trong kẹp', 'STT', 'storageIndex'],
            /stt kẹp|thứ tự kẹp/i
          ) || '';

          dossiersToImport.push({
            code: customCode ? String(customCode).trim() : undefined,
            owner: cleanOwner,
            parcel: cleanParcel,
            mapSheet: cleanMapSheet,
            procedure: String(procedure).trim(),
            receivedDate: String(receivedDate).trim(),
            dueDate: String(dueDate).trim(),
            handlerId: matchedUser?.id || users[0]?.id || 'user_lieulv',
            handlerName: matchedUser?.name || users[0]?.name || 'Lê Văn Liệu',
            address: String(address).trim() || 'Xã Lãnh Ngọc',
            note: String(note).trim(),
            storageFolder: String(storageFolder).trim() || 'Kẹp 1',
            storageIndex: String(storageIndex).trim(),
            status: 'in_progress',
            createdBy: user?.id || 'user_hoaivu',
            createdByName: user?.name || 'Đoàn Văn Hoài Vũ',
          });
        }

        if (dossiersToImport.length === 0) {
          setErrorMsg('Không nhận diện được dòng dữ liệu hồ sơ nào trong file. Vui lòng kiểm tra lại tiêu đề các cột hoặc tải file mẫu chuẩn.');
          setIsProcessing(false);
          return;
        }

        const res = await apiService.createDossiersBatch(dossiersToImport, user?.id, user?.name);
        imported = res.count || dossiersToImport.length;
        if (res && res.dossiers && res.dossiers.length > 0) {
          try {
            await localVault.upsertLocalDossiersBatch(res.dossiers);
          } catch (vErr) {
            console.warn('[EXCEL_IMPORT] Local vault backup warning:', vErr);
          }
        }
      } else {
        // Tasks Import
        const tasksToImport: Partial<Task>[] = [];
        for (const row of parsedRows) {
          const name = findExcelValue(
            row,
            ['Tên nhiệm vụ (*)', 'Tên nhiệm vụ', 'Tên công việc', 'Nhiệm vụ', 'name'],
            /nhiệm vụ|công việc/i
          );
          const field = findExcelValue(row, ['Lĩnh vực (*)', 'Lĩnh vực', 'field'], /lĩnh vực/i) || 'Địa chính - Đất đai';
          const priorityRaw = String(
            findExcelValue(row, ['Mức độ ưu tiên (high/medium/low)', 'Ưu tiên', 'Mức độ ưu tiên', 'priority'], /ưu tiên/i) || 'medium'
          ).toLowerCase();
          
          const rawStart = findExcelValue(
            row,
            [
              'Ngày bắt đầu (DD/MM/YYYY)',
              'Ngày bắt đầu (dd/mm/yyyy)',
              'Ngày bắt đầu (YYYY-MM-DD)',
              'Ngày bắt đầu',
              'startDate',
            ],
            /bắt đầu/i
          );
          const rawDue = findExcelValue(
            row,
            [
              'Hạn xử lý (DD/MM/YYYY) (*)',
              'Hạn xử lý (dd/mm/yyyy) (*)',
              'Hạn xử lý (DD/MM/YYYY)',
              'Hạn xử lý (dd/mm/yyyy)',
              'Hạn xử lý (YYYY-MM-DD) (*)',
              'Hạn xử lý',
              'Hạn hoàn thành',
              'Hạn chót',
              'Hạn trả',
              'dueDate',
            ],
            /hạn xử lý|hạn hoàn thành|hạn chót|hạn trả/i
          );
          
          const defaultStart = new Date().toISOString().split('T')[0];
          const defaultDue = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
          const startDate = parseExcelDate(rawStart, defaultStart);
          const dueDate = parseExcelDate(rawDue, defaultDue);

          const assigneeNameStr = findExcelValue(
            row,
            ['Cán bộ thực hiện', 'Người thực hiện', 'Chuyên viên', 'Cán bộ', 'assignee'],
            /thực hiện|cán bộ/i
          );
          const direction = findExcelValue(
            row,
            ['Chỉ đạo / Yêu cầu', 'Chỉ đạo', 'Yêu cầu', 'direction'],
            /chỉ đạo|yêu cầu/i
          ) || '';
          const note = findExcelValue(row, ['Ghi chú', 'note'], /ghi chú/i) || '';

          if (!name) continue;

          const matchedUser = findUserByFuzzyName(assigneeNameStr);

          tasksToImport.push({
            name: String(name).trim(),
            field: (String(field).trim() as any) || 'Đăng ký đất đai',
            priority: priorityRaw.includes('cao') || priorityRaw === 'high' || priorityRaw === 'urgent' ? 'high' : priorityRaw.includes('thấp') || priorityRaw === 'low' ? 'low' : 'medium',
            startDate: String(startDate).trim(),
            dueDate: String(dueDate).trim(),
            assigneeId: matchedUser?.id || users[0]?.id || 'user_lieulv',
            direction: String(direction).trim(),
            note: String(note).trim(),
            status: 'pending',
            createdBy: user?.id,
            createdByName: user?.name,
          });
        }

        if (tasksToImport.length === 0) {
          setErrorMsg('Không tìm thấy bản ghi nhiệm vụ hợp lệ nào trong file.');
          isProcessingRef.current = false;
          setIsProcessing(false);
          return;
        }

        const idempotencyKey = `import-tasks-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const res = await apiService.createTasksBatch(tasksToImport, user?.id, user?.name, idempotencyKey);
        imported = res.count || tasksToImport.length;
      }

      if (imported === 0) {
        setErrorMsg('Không có bản ghi nào được tạo thành công. Vui lòng kiểm tra lại cấu trúc file Excel.');
        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }

      setSuccessCount(imported);
      await refreshData();
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg('Lỗi trong quá trình nạp dữ liệu: ' + err.message);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Nhập Dữ Liệu Hàng Loạt Từ Excel (.xlsx / .csv)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tải lên danh sách hồ sơ Một cửa hoặc nhiệm vụ chỉ bằng 1 thao tác kéo thả
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Target Type Selector */}
          <div className="flex items-center gap-3 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setImportType('dossiers');
                setParsedRows([]);
                setFileName('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                importType === 'dossiers'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FolderArchive className="w-4 h-4" />
              <span>Nhập Hồ sơ Đất đai (Một Cửa)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setImportType('tasks');
                setParsedRows([]);
                setFileName('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                importType === 'tasks'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Nhập Nhiệm vụ / Công việc</span>
            </button>
          </div>

          {/* Download Template Guide Box */}
          <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-emerald-950 dark:text-emerald-200 block">
                  File mẫu chuẩn định dạng Ngày/Tháng/Năm (dd/mm/yyyy)
                </span>
                <span className="text-emerald-800 dark:text-emerald-300">
                  Hệ thống hỗ trợ chuẩn <b>dd/mm/yyyy</b> (hoặc yyyy-mm-dd), tự động xử lý mã ngày Excel thông minh (không bị lỗi 46157).
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file Excel mẫu (.xlsx)</span>
            </button>
          </div>

          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50/50 dark:bg-slate-800/30 group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center mb-2 group-hover:scale-110 transition">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {fileName ? `File đã chọn: ${fileName}` : 'Bấm vào đây để chọn file Excel (.xlsx / .csv)'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Hỗ trợ kéo thả file trực tiếp vào ô này
            </p>
          </div>

          {/* Error & Success Messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successCount !== null && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                🎉 Đã nhập thành công <b>{successCount}</b> bản ghi vào hệ thống!
              </span>
            </div>
          )}

          {/* Parsed Rows Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Xem trước dữ liệu ({parsedRows.length} dòng):
                </span>
                <span className="text-emerald-600 font-semibold">Đã kiểm tra hợp lệ</span>
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Nội dung chính</th>
                      <th className="p-2">Thửa / TBĐ / Lĩnh vực</th>
                      <th className="p-2">Ngày nhận & Hạn trả (dd/mm/yyyy)</th>
                      <th className="p-2">Cán bộ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {parsedRows.slice(0, 5).map((row, idx) => {
                      const mainTitle = findExcelValue(
                        row,
                        ['Chủ sử dụng / Người nộp (*)', 'Tên nhiệm vụ (*)', 'Chủ sử dụng', 'Người nộp', 'Tên nhiệm vụ', 'name'],
                        /chủ|nhiệm vụ|công việc/i
                      ) || '-';

                      const parcel = findExcelValue(row, ['Số thửa (*)', 'Số thửa', 'parcel'], /thửa/i);
                      const mapSheet = findExcelValue(row, ['Tờ bản đồ (*)', 'Tờ bản đồ', 'mapSheet'], /bản đồ/i);
                      const field = findExcelValue(row, ['Lĩnh vực (*)', 'Lĩnh vực', 'field'], /lĩnh vực/i);
                      const subInfo = parcel ? `Thửa ${parcel}, TBĐ ${mapSheet || '-'}` : (field || '-');

                      const rawDue = findExcelValue(
                        row,
                        [
                          'Hạn trả (DD/MM/YYYY) (*)',
                          'Hạn trả (dd/mm/yyyy) (*)',
                          'Hạn trả (DD/MM/YYYY)',
                          'Hạn trả (dd/mm/yyyy)',
                          'Hạn trả (YYYY-MM-DD) (*)',
                          'Hạn trả (YYYY-MM-DD)',
                          'Hạn trả',
                          'Hạn giải quyết',
                          'Hạn xử lý (DD/MM/YYYY) (*)',
                          'Hạn xử lý (dd/mm/yyyy) (*)',
                          'Hạn xử lý',
                          'Hạn hoàn thành',
                          'Hạn chót',
                          'dueDate',
                        ],
                        /hạn trả|hạn xử lý|hạn giải quyết|hạn chót/i
                      );

                      const rawReceived = findExcelValue(
                        row,
                        [
                          'Ngày tiếp nhận (DD/MM/YYYY)',
                          'Ngày tiếp nhận (dd/mm/yyyy)',
                          'Ngày tiếp nhận (YYYY-MM-DD)',
                          'Ngày tiếp nhận',
                          'Ngày bắt đầu (DD/MM/YYYY)',
                          'Ngày bắt đầu',
                          'receivedDate',
                          'startDate',
                        ],
                        /tiếp nhận|bắt đầu|ngày nhận/i
                      );

                      const formattedDue = rawDue ? formatDate(parseExcelDate(rawDue)) : '-';
                      const formattedReceived = rawReceived ? formatDate(parseExcelDate(rawReceived)) : null;

                      const handler = findExcelValue(
                        row,
                        ['Cán bộ thụ lý', 'Cán bộ thực hiện', 'Chuyên viên', 'handler', 'assignee'],
                        /cán bộ|chuyên viên|thụ lý|thực hiện/i
                      ) || 'Tự động gán';

                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-2 font-semibold text-slate-900 dark:text-white">
                            {mainTitle}
                          </td>
                          <td className="p-2 text-slate-600 dark:text-slate-300">
                            {subInfo}
                          </td>
                          <td className="p-2 font-mono">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {formattedDue}
                            </span>
                            {formattedReceived && (
                              <span className="text-[10px] text-slate-400 block font-normal">
                                Nhận: {formattedReceived}
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-slate-600 dark:text-slate-300">
                            {handler}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 5 && (
                <p className="text-[11px] text-slate-400 italic text-center">
                  ...và còn {parsedRows.length - 5} dòng dữ liệu khác
                </p>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={parsedRows.length === 0 || isProcessing}
              onClick={handleExecuteImport}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              {isProcessing ? (
                <span>Đang xử lý nạp dữ liệu...</span>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Xác nhận nạp {parsedRows.length} bản ghi vào hệ thống</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
