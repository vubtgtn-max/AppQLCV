import React, { useState } from 'react';
import {
  X,
  Scale,
  FileText,
  Printer,
  Calendar,
  User,
  Users,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Edit,
  Save,
  AlertTriangle,
  Send,
  Plus,
  Compass,
  ArrowRight,
  Camera,
} from 'lucide-react';
import { DisputeCase, VerificationMinute, ExaminationReport, MediationRecord } from '../../types';
import { apiService } from '../../services/api';
import { formatDate } from '../../utils/date';
import { useRealtime } from '../../contexts/RealtimeContext';
import { PrintDisputeDocModal } from './PrintDisputeDocModal';
import { DisputeEvidenceManager } from './DisputeEvidenceManager';
import { DecimalAreaInput } from '../common/DecimalAreaInput';
import { VietnameseDateInput } from '../common/VietnameseDateInput';

interface DisputeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispute: DisputeCase | null;
  onOpenEdit: (dispute: DisputeCase) => void;
}

export const DisputeDetailModal: React.FC<DisputeDetailModalProps> = ({
  isOpen,
  onClose,
  dispute: initialDispute,
  onOpenEdit,
}) => {
  const { refreshData } = useRealtime();
  const [currentDispute, setCurrentDispute] = useState<DisputeCase | null>(initialDispute);
  const [activeTab, setActiveTab] = useState<'overview' | 'field_data' | 'minute' | 'report' | 'mediation'>('overview');

  // Print modal state
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<
    'verification_minute' | 'examination_report' | 'invitation' | 'mediation_minute' | 'field_evidence'
  >('examination_report');

  // Loading states
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');

  // Editing state for minute
  const [isEditingMinute, setIsEditingMinute] = useState(false);
  const [minuteForm, setMinuteForm] = useState<VerificationMinute>({
    minuteNumber: '',
    date: new Date().toISOString().slice(0, 16),
    location: '',
    presidedBy: '',
    delegation: [],
    partyAPresent: true,
    partyBPresent: true,
    actualCheckFindings: '',
    measuredDimensions: { east: '', west: '', south: '', north: '', disputedArea: 0 },
    historicalOrigin: '',
    partyAOpinion: '',
    partyBOpinion: '',
    witnessOpinions: '',
    conclusion: '',
    signedBy: [],
  });

  // Editing state for examination report
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [reportForm, setReportForm] = useState<ExaminationReport>({
    reportNumber: '',
    date: new Date().toISOString().split('T')[0],
    issuingAgency: 'UBND XÃ LÃNH NGỌC - TỔ CÔNG TÁC XÁC MINH TRANH CHẤP ĐẤT ĐAI',
    recipient: 'Chủ tịch UBND xã Lãnh Ngọc và Hội đồng hòa giải',
    disputeSummary: '',
    historicalOriginSummary: '',
    fieldVerificationSummary: '',
    legalEvaluation: '',
    settlementProposal: '',
    reporterName: '',
    leaderApprovalStatus: 'submitted',
    leaderComments: '',
    suggestedMediationDate: '',
  });

  // Editing state for mediation
  const [isEditingMediation, setIsEditingMediation] = useState(false);
  const [mediationForm, setMediationForm] = useState<MediationRecord>({
    invitationNumber: '',
    invitationDate: new Date().toISOString().split('T')[0],
    meetingDate: '',
    meetingLocation: 'Phòng họp số 2, Trụ sở UBND xã Lãnh Ngọc',
    councilChairman: 'Phó Chủ tịch UBND xã',
    councilMembers: [],
    result: 'pending',
    minuteNumber: '',
    agreementDetails: '',
    failureReasons: '',
    postMediationGuidance: '',
  });

  React.useEffect(() => {
    setCurrentDispute(initialDispute);
    if (initialDispute) {
      if (initialDispute.verificationMinute) {
        setMinuteForm(initialDispute.verificationMinute);
      } else {
        setMinuteForm({
          minuteNumber: `${initialDispute.code.replace(/[^0-9]/g, '').slice(-2)}/BB-XM`,
          date: new Date().toISOString().slice(0, 16),
          location: `Tại thực địa thửa đất số ${initialDispute.parcel}, tờ BĐ số ${initialDispute.mapSheet}, ${initialDispute.location}`,
          presidedBy: `${initialDispute.handlerName} - Công chức Địa chính`,
          delegation: [
            { name: initialDispute.assignedLeaderName || 'Võ Tấn Lạt', position: 'Phó Chủ tịch UBND xã - Trưởng đoàn', present: true },
            { name: initialDispute.handlerName || 'Đoàn Văn Hoài Vũ', position: 'Công chức Địa chính - Thư ký', present: true },
            { name: 'Trần Đình Trọng', position: 'Công chức Tư pháp - Hộ tịch', present: true },
            { name: 'Trưởng thôn', position: `Đại diện ${initialDispute.location}`, present: true },
          ],
          partyAPresent: true,
          partyBPresent: true,
          actualCheckFindings: `Kiểm tra đo đạc thực tế tại hiện trường thửa ${initialDispute.parcel}, tờ BĐ ${initialDispute.mapSheet}: Đo đạc các cạnh ranh giới tiếp giáp, mốc giới hiện trạng và công trình, cây trồng trên đất tranh chấp.`,
          measuredDimensions: {
            east: 'Giáp thửa liền kề',
            west: 'Giáp ngõ đi',
            south: 'Giáp đường giao thông',
            north: 'Giáp hộ phía sau',
            disputedArea: initialDispute.disputedArea || 0,
          },
          historicalOrigin: `Theo hồ sơ địa chính qua các thời kỳ: Thửa đất số ${initialDispute.parcel}, tờ BĐ ${initialDispute.mapSheet}. Tình trạng cấp GCN: ${
            initialDispute.certificateStatus === 'has_cert' ? `Đã cấp GCN số ${initialDispute.certificateNumber || ''}` : 'Chưa cấp GCN'
          }.`,
          partyAOpinion: initialDispute.partyA.claim,
          partyBOpinion: initialDispute.partyB.claim,
          witnessOpinions: 'Các hộ tứ cận liền kề xác nhận quá trình sử dụng đất và mốc giới ban đầu.',
          conclusion: 'Kết quả đo đạc xác minh ban đầu: Đề nghị Tổ công tác tổng hợp hồ sơ, lập Báo cáo thẩm tra kết quả xác minh trình Chủ tịch UBND xã xem xét tổ chức hòa giải.',
          signedBy: [initialDispute.partyA.name, initialDispute.partyB.name, initialDispute.handlerName],
        });
      }

      if (initialDispute.examinationReport) {
        setReportForm(initialDispute.examinationReport);
      }

      if (initialDispute.mediationRecord) {
        setMediationForm(initialDispute.mediationRecord);
      } else {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        setMediationForm({
          invitationNumber: `${initialDispute.code.replace(/[^0-9]/g, '').slice(-2)}/GM-UBND`,
          invitationDate: new Date().toISOString().split('T')[0],
          meetingDate: `${nextWeek.toISOString().split('T')[0]}T08:30`,
          meetingLocation: 'Phòng họp số 2, Trụ sở UBND xã Lãnh Ngọc',
          councilChairman: initialDispute.assignedLeaderName || 'Võ Tấn Lạt - Phó Chủ tịch UBND xã',
          councilMembers: [
            { name: initialDispute.handlerName || 'Đoàn Văn Hoài Vũ', position: 'Công chức Địa chính' },
            { name: 'Trần Đình Trọng', position: 'Công chức Tư pháp' },
            { name: 'Ủy ban MTTQ xã', position: 'Đại diện đoàn thể' },
          ],
          result: 'pending',
          minuteNumber: `${initialDispute.code.replace(/[^0-9]/g, '').slice(-2)}/BB-HGHĐ`,
          agreementDetails: '',
          failureReasons: '',
          postMediationGuidance:
            'Căn cứ Điều 236 Luật Đất đai 2024, trường hợp hòa giải không thành, đương sự có quyền nộp đơn khởi kiện giải quyết tại Tòa án nhân dân có thẩm quyền.',
        });
      }
    }
  }, [initialDispute]);

  if (!isOpen || !currentDispute) return null;

  // Handler: AUTOMATICALLY GENERATE EXAMINATION REPORT FROM VERIFICATION MINUTE
  const handleGenerateReport = async () => {
    if (!currentDispute.verificationMinute) {
      setActionErrorMsg('Vui lòng lưu Biên bản xác minh thực địa trước khi tạo Báo cáo thẩm tra.');
      return;
    }

    setIsGeneratingReport(true);
    setActionErrorMsg('');
    setActionSuccessMsg('');

    try {
      const res = await apiService.generateExaminationReport(currentDispute.id);
      setCurrentDispute(res.dispute);
      setReportForm(res.report);
      setActionSuccessMsg('Đã tự động trích xuất Biên bản xác minh và tạo Báo cáo thẩm tra kết quả thành công!');
      setActiveTab('report');
      await refreshData();
      setTimeout(() => setActionSuccessMsg(''), 4000);
    } catch (err: any) {
      setActionErrorMsg(err?.message || 'Lỗi khi tạo báo cáo thẩm tra');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Handler: Save Minute
  const handleSaveMinute = async () => {
    try {
      const updated = await apiService.saveVerificationMinute(currentDispute.id, minuteForm);
      setCurrentDispute(updated);
      setIsEditingMinute(false);
      setActionSuccessMsg('Đã lưu Biên bản xác minh hiện trường thành công.');
      await refreshData();
      setTimeout(() => setActionSuccessMsg(''), 3000);
    } catch (err: any) {
      setActionErrorMsg(err?.message || 'Lỗi khi lưu biên bản xác minh');
    }
  };

  // Handler: Save Examination Report
  const handleSaveReport = async () => {
    try {
      const updated = await apiService.saveExaminationReport(currentDispute.id, reportForm);
      setCurrentDispute(updated);
      setIsEditingReport(false);
      setActionSuccessMsg('Đã lưu Báo cáo thẩm tra kết quả xác minh thành công.');
      await refreshData();
      setTimeout(() => setActionSuccessMsg(''), 3000);
    } catch (err: any) {
      setActionErrorMsg(err?.message || 'Lỗi khi lưu báo cáo thẩm tra');
    }
  };

  // Handler: Save Mediation Record
  const handleSaveMediation = async () => {
    try {
      const updated = await apiService.saveMediationRecord(currentDispute.id, mediationForm);
      setCurrentDispute(updated);
      setIsEditingMediation(false);
      setActionSuccessMsg('Đã lưu thông tin và kết quả phiên hòa giải thành công.');
      await refreshData();
      setTimeout(() => setActionSuccessMsg(''), 3000);
    } catch (err: any) {
      setActionErrorMsg(err?.message || 'Lỗi khi lưu phiên hòa giải');
    }
  };

  // Status mapping
  const statusLabels: Record<string, { label: string; bg: string; text: string }> = {
    received: { label: 'Mới tiếp nhận', bg: 'bg-gray-100', text: 'text-slate-700 border border-gray-200' },
    verifying: { label: 'Đang xác minh thực địa', bg: 'bg-sky-50', text: 'text-sky-700 border border-sky-200' },
    verified: { label: 'Đã có Biên bản xác minh', bg: 'bg-indigo-50', text: 'text-indigo-700 border border-indigo-200' },
    reported: { label: 'Đã lập Báo cáo thẩm tra', bg: 'bg-purple-50', text: 'text-purple-700 border border-purple-200' },
    scheduled: { label: 'Đã lên lịch hòa giải', bg: 'bg-amber-50', text: 'text-amber-800 border border-amber-200' },
    resolved_success: { label: 'Hòa giải THÀNH', bg: 'bg-emerald-50', text: 'text-emerald-700 border border-emerald-300' },
    resolved_failure: { label: 'Hòa giải KHÔNG THÀNH', bg: 'bg-rose-50', text: 'text-rose-700 border border-rose-300' },
    withdrawn: { label: 'Đình chỉ / Rút đơn', bg: 'bg-gray-100', text: 'text-slate-500 border border-gray-200' },
  };

  const st = statusLabels[currentDispute.status] || statusLabels.received;

  // Deadline calculation
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = currentDispute.deadlineDate ? new Date(currentDispute.deadlineDate) : null;
  const isValidDue = due && !isNaN(due.getTime());
  let daysDiff = 0;
  if (isValidDue && due) {
    due.setHours(0, 0, 0, 0);
    daysDiff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
        <div className="bg-white border border-gray-200 w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-slate-800">
          {/* Top Bar */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-bold shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {currentDispute.code}
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${st.bg} ${st.text}`}>
                    {st.label}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                      daysDiff < 0
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : daysDiff <= 7
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-gray-100 text-slate-600 border border-gray-200'
                    }`}
                  >
                    {daysDiff < 0
                      ? `Quá hạn ${Math.abs(daysDiff)} ngày`
                      : `Hạn luật định: còn ${daysDiff} ngày (${formatDate(currentDispute.deadlineDate)})`}
                  </span>
                </div>
                <h1 className="text-base font-bold text-slate-900 truncate max-w-2xl mt-0.5" title={currentDispute.title}>
                  {currentDispute.title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setPrintDocType('examination_report');
                  setIsPrintModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-gray-100 text-slate-700 border border-gray-300 flex items-center gap-1.5 cursor-pointer transition-colors"
                title="In hoặc xuất văn bản chuẩn hành chính"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>In văn bản</span>
              </button>

              <button
                onClick={() => onOpenEdit(currentDispute)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Sửa vụ việc</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-gray-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Success / Error notification bar */}
          {actionSuccessMsg && (
            <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shrink-0">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}
          {actionErrorMsg && (
            <div className="px-6 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center gap-2 shrink-0">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{actionErrorMsg}</span>
            </div>
          )}

          {/* Process Workflow Nav Tabs */}
          <div className="px-6 py-2 bg-gray-50 border-b border-gray-200 flex gap-1 overflow-x-auto shrink-0">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-gray-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>1. Thông tin chung & Các bên</span>
            </button>

            <button
              onClick={() => setActiveTab('field_data')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap relative ${
                activeTab === 'field_data'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-gray-200'
              }`}
            >
              <Camera className="w-4 h-4 text-sky-500" />
              <span>2. Thu thập hiện trường & Chứng cứ</span>
              {(currentDispute.fieldEvidences || []).length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-sky-500 text-white">
                  {(currentDispute.fieldEvidences || []).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('minute')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap relative ${
                activeTab === 'minute'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-gray-200'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>3. Biên bản xác minh hiện trường</span>
              {currentDispute.verificationMinute && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap relative ${
                activeTab === 'report'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-gray-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>4. Báo cáo thẩm tra kết quả</span>
              {currentDispute.examinationReport && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('mediation')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'mediation'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-gray-200'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>5. Hòa giải & Kết quả</span>
            </button>
          </div>

          {/* Modal Content Body */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Highlights Card */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="text-[11px] uppercase font-semibold text-slate-500">Thửa đất tranh chấp</p>
                    <p className="text-base font-bold text-slate-900 mt-1">
                      Thửa {currentDispute.parcel || '...'} - TBĐ {currentDispute.mapSheet || '...'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{currentDispute.location}</p>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="text-[11px] uppercase font-semibold text-slate-500">Diện tích tranh chấp</p>
                    <p className="text-xl font-extrabold text-amber-700 mt-1">
                      {currentDispute.disputedArea || 0} m²
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Tổng thửa: {currentDispute.area || 0} m²</p>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="text-[11px] uppercase font-semibold text-slate-500">Tình trạng pháp lý GCN</p>
                    <p className="text-sm font-bold text-emerald-700 mt-1">
                      {currentDispute.certificateStatus === 'has_cert'
                        ? 'Đã cấp Giấy chứng nhận'
                        : currentDispute.certificateStatus === 'overlap_cert'
                        ? 'Chồng lấn / Cấp trùng ranh GCN'
                        : 'Chưa cấp GCN'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">{currentDispute.certificateNumber || 'Chưa có số GCN'}</p>
                  </div>

                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="text-[11px] uppercase font-semibold text-slate-500">Cán bộ phụ trách</p>
                    <p className="text-sm font-bold text-slate-900 mt-1">{currentDispute.handlerName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Lãnh đạo: {currentDispute.assignedLeaderName || 'Chưa chỉ định'}</p>
                  </div>
                </div>

                {/* Parties Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Party A */}
                  <div className="p-5 bg-blue-50/40 rounded-2xl border border-blue-200 relative">
                    <div className="flex items-center justify-between pb-3 border-b border-blue-100">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                        <h3 className="font-bold text-sm text-blue-800 uppercase">Bên A: Người yêu cầu giải quyết</h3>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 font-semibold">
                        Chủ đơn
                      </span>
                    </div>

                    <div className="space-y-2 mt-4 text-xs">
                      <div>
                        <span className="text-slate-500">Họ và tên:</span>{' '}
                        <span className="font-bold text-slate-900 text-sm">{currentDispute.partyA.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Số CCCD:</span>{' '}
                        <span className="font-mono text-slate-700">{currentDispute.partyA.cccd || 'Chưa cập nhật'}</span>
                        {currentDispute.partyA.phone && (
                          <span className="ml-3 text-slate-500">
                            SĐT: <span className="font-mono text-slate-700">{currentDispute.partyA.phone}</span>
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500">Địa chỉ:</span>{' '}
                        <span className="text-slate-700">{currentDispute.partyA.address}</span>
                      </div>
                      <div className="mt-3 p-3 bg-white rounded-xl border border-blue-100 shadow-2xs">
                        <p className="font-semibold text-slate-500 text-[11px] mb-1">Nội dung yêu cầu / Khiếu nại:</p>
                        <p className="text-slate-800 italic leading-relaxed">{currentDispute.partyA.claim}</p>
                      </div>
                    </div>
                  </div>

                  {/* Party B */}
                  <div className="p-5 bg-rose-50/40 rounded-2xl border border-rose-200 relative">
                    <div className="flex items-center justify-between pb-3 border-b border-rose-100">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                        <h3 className="font-bold text-sm text-rose-800 uppercase">Bên B: Người bị tranh chấp</h3>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 font-semibold">
                        Bị khiếu nại
                      </span>
                    </div>

                    <div className="space-y-2 mt-4 text-xs">
                      <div>
                        <span className="text-slate-500">Họ và tên:</span>{' '}
                        <span className="font-bold text-slate-900 text-sm">{currentDispute.partyB.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Số CCCD:</span>{' '}
                        <span className="font-mono text-slate-700">{currentDispute.partyB.cccd || 'Chưa cập nhật'}</span>
                        {currentDispute.partyB.phone && (
                          <span className="ml-3 text-slate-500">
                            SĐT: <span className="font-mono text-slate-700">{currentDispute.partyB.phone}</span>
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-500">Địa chỉ:</span>{' '}
                        <span className="text-slate-700">{currentDispute.partyB.address}</span>
                      </div>
                      <div className="mt-3 p-3 bg-white rounded-xl border border-rose-100 shadow-2xs">
                        <p className="font-semibold text-slate-500 text-[11px] mb-1">Ý kiến phản bác / Lý lẽ:</p>
                        <p className="text-slate-800 italic leading-relaxed">{currentDispute.partyB.claim}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Witness & Adjacent plots */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Hộ tứ cận liền kề, Trưởng thôn và người làm chứng</span>
                  </h4>
                  {currentDispute.relatedParties && currentDispute.relatedParties.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentDispute.relatedParties.map((r, i) => (
                        <div key={i} className="p-3 bg-white rounded-lg border border-gray-200 text-xs shadow-2xs">
                          <p className="font-bold text-slate-900">
                            {r.name} <span className="text-[11px] text-slate-500 font-normal">({r.role})</span>
                          </p>
                          {r.statement && <p className="text-slate-600 italic mt-1">{r.statement}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Chưa ghi nhận ý kiến người làm chứng/hộ liền kề.</p>
                  )}
                </div>

                {/* Next Steps CTA */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Bước tiếp theo: Thẩm tra thực địa & Lập Báo cáo</span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {currentDispute.verificationMinute
                        ? 'Đã có Biên bản xác minh. Bạn có thể tự động tạo ngay Báo cáo thẩm tra kết quả.'
                        : 'Tiến hành thẩm tra hiện trường và lập Biên bản xác minh mốc giới theo quy định.'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab('minute')}
                      className="px-4 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Xem Biên bản xác minh
                    </button>
                    {currentDispute.verificationMinute && (
                      <button
                        onClick={handleGenerateReport}
                        disabled={isGeneratingReport}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{isGeneratingReport ? 'Đang tạo...' : '⚡ Tạo Báo cáo thẩm tra'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FIELD EVIDENCE & DATA COLLECTION */}
            {activeTab === 'field_data' && (
              <DisputeEvidenceManager
                dispute={currentDispute}
                onUpdateDispute={(updated) => {
                  setCurrentDispute(updated);
                  refreshData();
                }}
                onOpenPrintEvidence={() => {
                  setPrintDocType('field_evidence');
                  setIsPrintModalOpen(true);
                }}
              />
            )}

            {/* TAB 3: BIÊN BẢN XÁC MINH */}
            {activeTab === 'minute' && (
              <div className="space-y-6">
                {/* Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Compass className="w-4 h-4 text-emerald-600" />
                      <span>Biên bản kiểm tra, xác minh hiện trạng & nguồn gốc đất</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Lập tại thực địa có sự tham gia của Tổ công tác, các bên tranh chấp và các hộ tứ cận liền kề
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* KEY FEATURE: AUTOMATIC REPORT GENERATION BUTTON */}
                    <button
                      onClick={handleGenerateReport}
                      disabled={isGeneratingReport}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                      title="Tự động từ Biên bản xác minh trích xuất và tạo Báo cáo thẩm tra kết quả"
                    >
                      <Sparkles className="w-4 h-4 fill-slate-950" />
                      <span>{isGeneratingReport ? 'Đang tự động xử lý...' : '⚡ Tạo Báo cáo thẩm tra từ Biên bản'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setPrintDocType('verification_minute');
                        setIsPrintModalOpen(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-gray-100 text-slate-700 text-xs font-medium border border-gray-300 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>In Biên bản</span>
                    </button>

                    <button
                      onClick={() => setIsEditingMinute(!isEditingMinute)}
                      className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-2xs"
                    >
                      {isEditingMinute ? 'Hủy sửa' : 'Chỉnh sửa'}
                    </button>
                  </div>
                </div>

                {isEditingMinute ? (
                  /* Form editing verification minute */
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-slate-700 mb-1 font-semibold">Số biên bản</label>
                        <input
                          type="text"
                          value={minuteForm.minuteNumber}
                          onChange={(e) => setMinuteForm({ ...minuteForm, minuteNumber: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 mb-1 font-semibold">Thời gian tiến hành</label>
                        <input
                          type="datetime-local"
                          value={minuteForm.date}
                          onChange={(e) => setMinuteForm({ ...minuteForm, date: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 mb-1 font-semibold">Người chủ trì / Tổ trưởng</label>
                        <input
                          type="text"
                          value={minuteForm.presidedBy}
                          onChange={(e) => setMinuteForm({ ...minuteForm, presidedBy: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">Địa điểm thực hiện xác minh</label>
                      <input
                        type="text"
                        value={minuteForm.location}
                        onChange={(e) => setMinuteForm({ ...minuteForm, location: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>

                    {/* Measured Dimensions */}
                    <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-3 shadow-2xs">
                      <p className="font-bold text-slate-900 text-xs">Kích thước đo đạc thực tế tại hiện trường (Tứ cận):</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-600 mb-0.5">Phía Đông</label>
                          <input
                            type="text"
                            value={minuteForm.measuredDimensions.east}
                            onChange={(e) =>
                              setMinuteForm({
                                ...minuteForm,
                                measuredDimensions: { ...minuteForm.measuredDimensions, east: e.target.value },
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 mb-0.5">Phía Tây</label>
                          <input
                            type="text"
                            value={minuteForm.measuredDimensions.west}
                            onChange={(e) =>
                              setMinuteForm({
                                ...minuteForm,
                                measuredDimensions: { ...minuteForm.measuredDimensions, west: e.target.value },
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 mb-0.5">Phía Nam</label>
                          <input
                            type="text"
                            value={minuteForm.measuredDimensions.south}
                            onChange={(e) =>
                              setMinuteForm({
                                ...minuteForm,
                                measuredDimensions: { ...minuteForm.measuredDimensions, south: e.target.value },
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-600 mb-0.5">Phía Bắc</label>
                          <input
                            type="text"
                            value={minuteForm.measuredDimensions.north}
                            onChange={(e) =>
                              setMinuteForm({
                                ...minuteForm,
                                measuredDimensions: { ...minuteForm.measuredDimensions, north: e.target.value },
                              })
                            }
                            className="w-full px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500 focus:bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-amber-700 font-bold mb-0.5">Diện tích lấn chiếm / tranh chấp đo đạc thực tế (m²)</label>
                        <DecimalAreaInput
                          value={minuteForm.measuredDimensions.disputedArea || 0}
                          onChange={(val) =>
                            setMinuteForm({
                              ...minuteForm,
                              measuredDimensions: {
                                ...minuteForm.measuredDimensions,
                                disputedArea: val,
                              },
                            })
                          }
                          placeholder="VD: 25,5"
                          className="w-full max-w-xs px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 font-bold focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">Kết quả kiểm tra hiện trạng thực tế</label>
                      <textarea
                        rows={3}
                        value={minuteForm.actualCheckFindings}
                        onChange={(e) => setMinuteForm({ ...minuteForm, actualCheckFindings: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">
                        Lịch sử nguồn gốc sử dụng đất theo hồ sơ địa chính qua các thời kỳ (299, VN-2000, GCN)
                      </label>
                      <textarea
                        rows={3}
                        value={minuteForm.historicalOrigin}
                        onChange={(e) => setMinuteForm({ ...minuteForm, historicalOrigin: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-blue-700 mb-1 font-semibold">Ý kiến của Bên A tại hiện trường</label>
                        <textarea
                          rows={2}
                          value={minuteForm.partyAOpinion}
                          onChange={(e) => setMinuteForm({ ...minuteForm, partyAOpinion: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-rose-700 mb-1 font-semibold">Ý kiến của Bên B tại hiện trường</label>
                        <textarea
                          rows={2}
                          value={minuteForm.partyBOpinion}
                          onChange={(e) => setMinuteForm({ ...minuteForm, partyBOpinion: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">Ý kiến nhân chứng và các hộ liền kề</label>
                      <textarea
                        rows={2}
                        value={minuteForm.witnessOpinions}
                        onChange={(e) => setMinuteForm({ ...minuteForm, witnessOpinions: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">Kết luận, nhận xét bước đầu của Tổ xác minh</label>
                      <textarea
                        rows={2}
                        value={minuteForm.conclusion}
                        onChange={(e) => setMinuteForm({ ...minuteForm, conclusion: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setIsEditingMinute(false)}
                        className="px-4 py-2 rounded-xl bg-white border border-gray-300 text-slate-700 font-semibold hover:bg-gray-100"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleSaveMinute}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer"
                      >
                        Lưu Biên bản xác minh
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display verification minute details */
                  <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-6 text-sm">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                      <div>
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-slate-700 border border-gray-200">
                          {minuteForm.minuteNumber || 'Biên bản thực địa'}
                        </span>
                        <span className="ml-3 text-xs text-slate-500">
                          Thời gian: {minuteForm.date ? minuteForm.date.replace('T', ' ') : '...'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-600">Chủ trì: <strong className="text-slate-800">{minuteForm.presidedBy}</strong></span>
                    </div>

                    {/* Measured Dimensions Box */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <h4 className="font-bold text-xs text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>Kích thước đo đạc ranh giới thực tế tại hiện trường</span>
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-2.5 bg-white border border-gray-200 rounded-lg shadow-2xs">
                          <span className="text-slate-500 block text-[11px]">Phía Đông:</span>
                          <span className="font-semibold text-slate-900">{minuteForm.measuredDimensions?.east || 'Theo ranh'}</span>
                        </div>
                        <div className="p-2.5 bg-white border border-gray-200 rounded-lg shadow-2xs">
                          <span className="text-slate-500 block text-[11px]">Phía Tây:</span>
                          <span className="font-semibold text-slate-900">{minuteForm.measuredDimensions?.west || 'Theo ranh'}</span>
                        </div>
                        <div className="p-2.5 bg-white border border-gray-200 rounded-lg shadow-2xs">
                          <span className="text-slate-500 block text-[11px]">Phía Nam:</span>
                          <span className="font-semibold text-slate-900">{minuteForm.measuredDimensions?.south || 'Theo ranh'}</span>
                        </div>
                        <div className="p-2.5 bg-white border border-gray-200 rounded-lg shadow-2xs">
                          <span className="text-slate-500 block text-[11px]">Phía Bắc:</span>
                          <span className="font-semibold text-slate-900">{minuteForm.measuredDimensions?.north || 'Theo ranh'}</span>
                        </div>
                      </div>
                      <div className="mt-3 text-xs flex items-center justify-between p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                        <span className="text-slate-700 font-medium">Diện tích đo đạc lấn chiếm / tranh chấp thực tế:</span>
                        <span className="text-amber-800 font-extrabold text-sm">
                          {Number(minuteForm.measuredDimensions?.disputedArea || currentDispute.disputedArea || 0).toLocaleString('vi-VN')} m²
                        </span>
                      </div>
                    </div>

                    {/* Actual check findings */}
                    <div>
                      <h4 className="font-bold text-xs text-slate-700 uppercase mb-1">Hiện trạng kiểm tra thực tế:</h4>
                      <p className="text-xs text-slate-700 leading-relaxed p-3 bg-gray-50 rounded-xl border border-gray-200 whitespace-pre-line">
                        {minuteForm.actualCheckFindings || 'Chưa có ghi nhận'}
                      </p>
                    </div>

                    {/* Historical origin */}
                    <div>
                      <h4 className="font-bold text-xs text-slate-700 uppercase mb-1">
                        Lịch sử nguồn gốc sử dụng đất qua các thời kỳ:
                      </h4>
                      <p className="text-xs text-slate-700 leading-relaxed p-3 bg-gray-50 rounded-xl border border-gray-200 whitespace-pre-line">
                        {minuteForm.historicalOrigin || 'Chưa có ghi nhận'}
                      </p>
                    </div>

                    {/* Opinions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-bold text-xs text-blue-700 uppercase mb-1">Ý kiến Bên A:</h4>
                        <p className="text-xs text-slate-700 italic p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                          {minuteForm.partyAOpinion || currentDispute.partyA.claim}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-rose-700 uppercase mb-1">Ý kiến Bên B:</h4>
                        <p className="text-xs text-slate-700 italic p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                          {minuteForm.partyBOpinion || currentDispute.partyB.claim}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-slate-700 uppercase mb-1">Ý kiến nhân chứng và các hộ liền kề:</h4>
                      <p className="text-xs text-slate-700 p-3 bg-gray-50 rounded-xl border border-gray-200">{minuteForm.witnessOpinions}</p>
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-emerald-700 uppercase mb-1">Kết luận sơ bộ của Tổ xác minh:</h4>
                      <p className="text-xs text-slate-700 p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                        {minuteForm.conclusion}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: BÁO CÁO THẨM TRA KẾT QUẢ XÁC MINH */}
            {activeTab === 'report' && (
              <div className="space-y-6">
                {/* Header actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>Báo cáo thẩm tra kết quả xác minh tranh chấp đất đai</span>
                      {currentDispute.examinationReport && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                          {reportForm.reportNumber || 'Chính thức'}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Văn bản thẩm tra của Tổ xác minh trình Chủ tịch UBND xã & Hội đồng hòa giải
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Re-generate button */}
                    <button
                      onClick={handleGenerateReport}
                      disabled={isGeneratingReport}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isGeneratingReport ? 'Đang tạo...' : 'Tạo lại từ Biên bản'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setPrintDocType('examination_report');
                        setIsPrintModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>In / Xuất Word</span>
                    </button>

                    <button
                      onClick={() => setIsEditingReport(!isEditingReport)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-2xs"
                    >
                      {isEditingReport ? 'Hủy sửa' : 'Chỉnh sửa'}
                    </button>
                  </div>
                </div>

                {!currentDispute.examinationReport && !isEditingReport ? (
                  /* Empty State: Prompt user to generate */
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300 space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-800">Chưa lập Báo cáo thẩm tra kết quả xác minh</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                        Hệ thống hỗ trợ tự động tổng hợp toàn bộ thông tin thụ lý, nguồn gốc đất, số liệu đo đạc tứ cận từ Biên bản xác minh để sinh ra Báo cáo chuẩn thể thức văn bản hành chính.
                      </p>
                    </div>
                    <button
                      onClick={handleGenerateReport}
                      disabled={isGeneratingReport}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs flex items-center gap-2 mx-auto cursor-pointer shadow-md transition-transform hover:scale-105"
                    >
                      <Sparkles className="w-4 h-4 fill-slate-950" />
                      <span>{isGeneratingReport ? 'Đang tự động xử lý...' : '⚡ Bấm để Tự động tạo Báo cáo thẩm tra ngay'}</span>
                    </button>
                  </div>
                ) : isEditingReport ? (
                  /* Report edit form */
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-slate-700 mb-1 font-semibold">Số báo cáo</label>
                        <input
                          type="text"
                          value={reportForm.reportNumber}
                          onChange={(e) => setReportForm({ ...reportForm, reportNumber: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 mb-1 font-semibold">Ngày ban hành (dd/mm/yyyy)</label>
                        <VietnameseDateInput
                          value={reportForm.date}
                          onChange={(val) => setReportForm({ ...reportForm, date: val })}
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 mb-1 font-semibold">Người lập báo cáo</label>
                        <input
                          type="text"
                          value={reportForm.reporterName}
                          onChange={(e) => setReportForm({ ...reportForm, reporterName: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">1. Tóm tắt nội dung vụ việc & quá trình thụ lý</label>
                      <textarea
                        rows={3}
                        value={reportForm.disputeSummary}
                        onChange={(e) => setReportForm({ ...reportForm, disputeSummary: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">2. Kết quả thẩm tra hồ sơ địa chính và nguồn gốc đất</label>
                      <textarea
                        rows={3}
                        value={reportForm.historicalOriginSummary}
                        onChange={(e) => setReportForm({ ...reportForm, historicalOriginSummary: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">3. Kết quả xác minh hiện trạng thực tế từ Biên bản</label>
                      <textarea
                        rows={3}
                        value={reportForm.fieldVerificationSummary}
                        onChange={(e) => setReportForm({ ...reportForm, fieldVerificationSummary: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">4. Đánh giá và nhận xét pháp lý (Luật Đất đai 2024)</label>
                      <textarea
                        rows={3}
                        value={reportForm.legalEvaluation}
                        onChange={(e) => setReportForm({ ...reportForm, legalEvaluation: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">5. Đề xuất phương án hòa giải và hướng xử lý</label>
                      <textarea
                        rows={3}
                        value={reportForm.settlementProposal}
                        onChange={(e) => setReportForm({ ...reportForm, settlementProposal: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">Ý kiến chỉ đạo của Lãnh đạo UBND xã</label>
                      <textarea
                        rows={2}
                        value={reportForm.leaderComments || ''}
                        onChange={(e) => setReportForm({ ...reportForm, leaderComments: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-900 focus:outline-hidden focus:border-blue-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setIsEditingReport(false)}
                        className="px-4 py-2 rounded-xl bg-white border border-gray-300 text-slate-700 font-semibold hover:bg-gray-100"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleSaveReport}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs cursor-pointer"
                      >
                        Lưu Báo cáo thẩm tra
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Formal Document Preview Container */
                  <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-6">
                    {/* Header snippet */}
                    <div className="flex justify-between items-start border-b border-gray-200 pb-4 text-xs">
                      <div>
                        <p className="font-bold text-slate-900 uppercase">{reportForm.issuingAgency}</p>
                        <p className="font-mono text-slate-500">Số: {reportForm.reportNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                        <p className="text-slate-500 italic">Ngày {reportForm.date}</p>
                      </div>
                    </div>

                    <div className="text-center py-2">
                      <h2 className="text-base font-bold text-slate-900 uppercase">
                        BÁO CÁO THẨM TRA KẾT QUẢ XÁC MINH
                      </h2>
                      <p className="text-xs text-slate-600 italic">
                        V/v giải quyết tranh chấp đất đai giữa hộ {currentDispute.partyA.name} và hộ {currentDispute.partyB.name}
                      </p>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div>
                        <h4 className="font-bold text-blue-700 uppercase">I. TÓM TẮT NỘI DUNG VỤ VIỆC & THỤ LÝ:</h4>
                        <p className="text-slate-700 mt-1 leading-relaxed p-3 bg-gray-50 rounded-xl border border-gray-200 whitespace-pre-line">
                          {reportForm.disputeSummary}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold text-blue-700 uppercase">II. KẾT QUẢ THẨM TRA HỒ SƠ ĐỊA CHÍNH:</h4>
                        <p className="text-slate-700 mt-1 leading-relaxed p-3 bg-gray-50 rounded-xl border border-gray-200 whitespace-pre-line">
                          {reportForm.historicalOriginSummary}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold text-blue-700 uppercase">III. KẾT QUẢ XÁC MINH HIỆN TRẠNG THỰC ĐỊA:</h4>
                        <p className="text-slate-700 mt-1 leading-relaxed p-3 bg-gray-50 rounded-xl border border-gray-200 whitespace-pre-line">
                          {reportForm.fieldVerificationSummary}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold text-blue-700 uppercase">IV. ĐÁNH GIÁ & NHẬN XÉT PHÁP LÝ:</h4>
                        <p className="text-slate-700 mt-1 leading-relaxed p-3 bg-gray-50 rounded-xl border border-gray-200 whitespace-pre-line">
                          {reportForm.legalEvaluation}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-bold text-amber-700 uppercase">V. ĐỀ XUẤT PHƯƠNG ÁN HÒA GIẢI:</h4>
                        <p className="text-slate-700 mt-1 leading-relaxed p-3 bg-amber-50/60 border border-amber-200 rounded-xl whitespace-pre-line">
                          {reportForm.settlementProposal}
                        </p>
                      </div>

                      {reportForm.leaderComments && (
                        <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                          <p className="font-bold text-emerald-800 uppercase text-[11px]">Ý kiến Lãnh đạo UBND xã:</p>
                          <p className="text-slate-700 italic mt-0.5">{reportForm.leaderComments}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: HÒA GIẢI & KẾT QUẢ */}
            {activeTab === 'mediation' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <Scale className="w-4 h-4 text-amber-600" />
                      <span>Tổ chức phiên hòa giải & Kết quả giải quyết</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Quy trình hòa giải tranh chấp đất đai theo Điều 235 Luật Đất đai 2024
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setPrintDocType('invitation');
                        setIsPrintModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-100 text-slate-700 text-xs font-semibold border border-gray-300 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>In Giấy mời hòa giải</span>
                    </button>

                    <button
                      onClick={() => {
                        setPrintDocType('mediation_minute');
                        setIsPrintModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-gray-100 text-slate-700 text-xs font-semibold border border-gray-300 shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-500" />
                      <span>In Biên bản hòa giải</span>
                    </button>

                    <button
                      onClick={() => setIsEditingMediation(!isEditingMediation)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
                    >
                      {isEditingMediation ? 'Hủy sửa' : 'Cập nhật hòa giải'}
                    </button>
                  </div>
                </div>

                {isEditingMediation ? (
                  /* Form edit mediation */
                  <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-slate-700 mb-1 font-semibold">Kết quả phiên hòa giải</label>
                        <select
                          value={mediationForm.result}
                          onChange={(e) => setMediationForm({ ...mediationForm, result: e.target.value as any })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-800 font-bold focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="pending">Chưa tổ chức / Đang chuẩn bị</option>
                          <option value="success">HÒA GIẢI THÀNH (Đạt thỏa thuận)</option>
                          <option value="failure">HÒA GIẢI KHÔNG THÀNH (Bất đồng)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 mb-1 font-semibold">Thời gian tổ chức phiên họp</label>
                        <input
                          type="datetime-local"
                          value={mediationForm.meetingDate || ''}
                          onChange={(e) => setMediationForm({ ...mediationForm, meetingDate: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-800 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 mb-1 font-semibold">Địa điểm tổ chức</label>
                        <input
                          type="text"
                          value={mediationForm.meetingLocation}
                          onChange={(e) => setMediationForm({ ...mediationForm, meetingLocation: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-800 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-700 mb-1 font-semibold">Số Giấy mời họp</label>
                        <input
                          type="text"
                          value={mediationForm.invitationNumber}
                          onChange={(e) => setMediationForm({ ...mediationForm, invitationNumber: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-800 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 mb-1 font-semibold">Số Biên bản phiên hòa giải</label>
                        <input
                          type="text"
                          value={mediationForm.minuteNumber}
                          onChange={(e) => setMediationForm({ ...mediationForm, minuteNumber: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-800 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1 font-semibold">Chủ tịch Hội đồng hòa giải</label>
                      <input
                        type="text"
                        value={mediationForm.councilChairman}
                        onChange={(e) => setMediationForm({ ...mediationForm, councilChairman: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-800 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {mediationForm.result === 'success' && (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                        <label className="block text-emerald-800 font-bold">Nội dung các bên thỏa thuận đạt được (Hòa giải thành):</label>
                        <textarea
                          rows={3}
                          value={mediationForm.agreementDetails || ''}
                          onChange={(e) => setMediationForm({ ...mediationForm, agreementDetails: e.target.value })}
                          placeholder="Hai bên thống nhất nắn lại hàng rào theo mốc giới mới, Bên B hỗ trợ chi phí cho Bên A..."
                          className="w-full px-3 py-2 rounded-xl bg-white border border-emerald-300 text-slate-800 focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}

                    {mediationForm.result === 'failure' && (
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                        <div>
                          <label className="block text-rose-800 font-bold mb-1">Nguyên nhân không đạt thỏa thuận (Hòa giải không thành):</label>
                          <textarea
                            rows={2}
                            value={mediationForm.failureReasons || ''}
                            onChange={(e) => setMediationForm({ ...mediationForm, failureReasons: e.target.value })}
                            placeholder="Hai bên giữ nguyên quan điểm, không chấp thuận mức đền bù hay nắn ranh..."
                            className="w-full px-3 py-2 rounded-xl bg-white border border-rose-300 text-slate-800 focus:ring-2 focus:ring-rose-500"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-700 mb-1 font-semibold">Hướng dẫn đương sự nộp đơn khởi kiện TAND:</label>
                          <textarea
                            rows={2}
                            value={mediationForm.postMediationGuidance || ''}
                            onChange={(e) => setMediationForm({ ...mediationForm, postMediationGuidance: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-slate-800 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => setIsEditingMediation(false)}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-gray-100 border border-gray-300 text-slate-700 font-semibold transition-colors cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleSaveMediation}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors cursor-pointer shadow-xs"
                      >
                        Lưu phiên hòa giải
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display mediation info */
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200 space-y-6 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
                        <span className="text-slate-500 text-xs block">Kết quả</span>
                        <span
                          className={`text-base font-bold mt-1 inline-block ${
                            mediationForm.result === 'success'
                              ? 'text-emerald-600'
                              : mediationForm.result === 'failure'
                              ? 'text-rose-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {mediationForm.result === 'success'
                            ? '✓ Hòa giải THÀNH'
                            : mediationForm.result === 'failure'
                            ? '✗ Hòa giải KHÔNG THÀNH'
                            : 'Chờ tổ chức phiên họp'}
                        </span>
                      </div>

                      <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
                        <span className="text-slate-500 text-xs block">Thời gian & Địa điểm</span>
                        <p className="text-slate-800 font-semibold text-xs mt-1">
                          {mediationForm.meetingDate ? mediationForm.meetingDate.replace('T', ' hồi ') : 'Chưa xếp lịch'}
                        </p>
                        <p className="text-slate-500 text-xs mt-0.5">{mediationForm.meetingLocation}</p>
                      </div>

                      <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
                        <span className="text-slate-500 text-xs block">Chủ tịch Hội đồng</span>
                        <p className="text-slate-800 font-semibold text-xs mt-1">{mediationForm.councilChairman}</p>
                        <p className="text-slate-500 text-xs mt-0.5">Biên bản số: {mediationForm.minuteNumber || 'Chưa lập'}</p>
                      </div>
                    </div>

                    {mediationForm.result === 'success' && (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <h4 className="text-xs font-bold text-emerald-800 uppercase mb-1">Nội dung thỏa thuận đạt được:</h4>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                          {mediationForm.agreementDetails || 'Các bên đồng thuận mốc giới và cam kết không khiếu nại.'}
                        </p>
                      </div>
                    )}

                    {mediationForm.result === 'failure' && (
                      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                        <h4 className="text-xs font-bold text-rose-800 uppercase">Lý do hòa giải không thành:</h4>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                          {mediationForm.failureReasons || 'Các bên không đạt được thỏa thuận giải quyết ranh giới.'}
                        </p>
                        <h4 className="text-xs font-bold text-slate-600 uppercase pt-2">Hướng dẫn tiếp theo:</h4>
                        <p className="text-xs text-slate-600 italic leading-relaxed">
                          {mediationForm.postMediationGuidance ||
                            'Hướng dẫn đương sự nộp đơn khởi kiện đến Tòa án nhân dân theo quy định của pháp luật.'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
            <span>
              Thụ lý bởi <span className="font-semibold text-slate-800">{currentDispute.handlerName}</span> • Ngày nhận:{' '}
              {currentDispute.receivedDate}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-gray-100 border border-gray-300 text-slate-700 font-medium cursor-pointer transition-colors shadow-xs"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Print Document Modal */}
      {isPrintModalOpen && (
        <PrintDisputeDocModal
          isOpen={true}
          onClose={() => setIsPrintModalOpen(false)}
          dispute={currentDispute}
          docType={printDocType}
        />
      )}
    </>
  );
};
