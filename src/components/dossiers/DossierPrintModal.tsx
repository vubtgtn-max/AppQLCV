import React, { useState, useRef, useEffect } from 'react';
import { Dossier } from '../../types';
import { useRealtime } from '../../contexts/RealtimeContext';
import { formatDate } from '../../utils/date';
import { PREVIEW_ACTIONS_LAYOUT, PREVIEW_ACTION_BUTTON_LAYOUT, PREVIEW_DOCUMENT_BODY_LAYOUT, PREVIEW_HEADER_LAYOUT, PREVIEW_TAB_BUTTON_LAYOUT, PREVIEW_TABS_LAYOUT } from '../common/previewModalStyles';
import { downloadWordDocumentND30 } from '../../utils/wordExportND30';
import {
  Printer,
  X,
  FileCheck,
  FileQuestion,
  FileX,
  FileSpreadsheet,
  FileText,
  QrCode,
  Download,
  Copy,
  Check,
  Building,
  UserCheck,
  Edit3,
  Plus,
  Trash2,
  Calendar,
  Award,
  FileBadge,
  Send,
  Eye,
} from 'lucide-react';

export type DossierSlipType =
  | 'receipt'
  | 'supplement'
  | 'return'
  | 'site_inspection'
  | 'origin_verification'
  | 'public_notice'
  | 'public_list'
  | 'public_closing_minutes'
  | 'public_closing_notice'
  | 'submission_phieutrinh'
  | 'submission_totrinh'
  | 'handover_tracking';

interface DossierPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  dossier: Dossier | null;
  initialSlipType?: DossierSlipType;
}

export interface LandParcelItem {
  id: string;
  stt: number;
  owner: string;
  permanentAddress: string;
  landAddress: string;
  mapSheet: string;
  parcel: string;
  area: string;
  usageTime: string;
  origin: string;
  currentStatus: string;
  assetCreatedTime: string;
  disputeStatus: string;
  planningSuitability: string;
}

export const DossierPrintModal: React.FC<DossierPrintModalProps> = ({
  isOpen,
  onClose,
  dossier,
  initialSlipType = 'receipt',
}) => {
  const { settings } = useRealtime();
  const [slipType, setSlipType] = useState<DossierSlipType>(initialSlipType);
  const [copied, setCopied] = useState(false);

  // Administrative Dispatch fields
  const [dispatchNumber, setDispatchNumber] = useState('');
  const [signerTitle, setSignerTitle] = useState('KT. TRƯỞNG PHÒNG\nPHÓ TRƯỞNG PHÒNG');
  const [signerName, setSignerName] = useState('Võ Tấn Lạt');

  // Fields for Public Notice & Closing Minutes & Reports
  const [publicNoticeNumber, setPublicNoticeNumber] = useState('316/TB-UBND');
  const [publicListNumber, setPublicListNumber] = useState('28/CKHS-ĐKĐĐ');
  const [publicStartDate, setPublicStartDate] = useState('');
  const [publicEndDate, setPublicEndDate] = useState('');
  const [publicLocationVillage, setPublicLocationVillage] = useState('Nhà văn hóa thôn Tiên Hiệp');
  const [villageName, setVillageName] = useState('thôn Tiên Hiệp');
  const [communeLeaderRole, setCommuneLeaderRole] = useState('KT. CHỦ TỊCH\nPHÓ CHỦ TỊCH');
  const [communeLeaderName, setCommuneLeaderName] = useState('Thái Công Cần');
  const [villageLeaderName, setVillageLeaderName] = useState('Nguyễn Văn Chính');
  const [villageLeaderRole, setVillageLeaderRole] = useState('Trưởng thôn Tiên Hiệp');
  const [officerRecorderName, setOfficerRecorderName] = useState('');
  const [closingTimeStr, setClosingTimeStr] = useState('08 giờ 30 phút');

  // Detailed Land Specifics for Submission (Phiếu trình & Tờ trình)
  const [residentialArea, setResidentialArea] = useState('300,0');
  const [agricultureArea, setAgricultureArea] = useState('249,5');
  const [totalLandArea, setTotalLandArea] = useState('549,5');
  const [trichDoNumber, setTrichDoNumber] = useState('879-2025');
  const [trichDoDate, setTrichDoDate] = useState('11/11/2025');
  const [taxNotice1, setTaxNotice1] = useState('LTB2650321-TK0001799/TB-TCS10 ngày 24/9/2026 của Thuế cơ sở 10 thành phố Đà Nẵng về lệ phí trước bạ nhà, đất');
  const [taxNotice2, setTaxNotice2] = useState('LTB2650321-TK0001797/TB-TCS10 ngày 24/9/2026 của Thuế cơ sở 10 thành phố Đà Nẵng về lệ phí trước bạ nhà, đất');
  const [taxConfirmNotice, setTaxConfirmNotice] = useState('3178/TB-TCS10 ngày 30/9/2026 của Thuế cơ sở 10 về việc xác nhận việc hoàn thành nghĩa vụ tài chính về đất');

  // Fields for Inspection Minutes (Bước 1: Biên bản kiểm tra thực địa theo NĐ 151/2025 & QĐ 2267/QĐ-UBND)
  const [inspectionTime, setInspectionTime] = useState('08 giờ 30 phút');
  const [inspectionEndTime, setInspectionEndTime] = useState('09 giờ 30 phút');
  const [inspectionDay, setInspectionDay] = useState('');
  const [inspectionMonth, setInspectionMonth] = useState('');
  const [inspectionYear, setInspectionYear] = useState('');
  const [inspectionLocation, setInspectionLocation] = useState('');
  const [officer1Name, setOfficer1Name] = useState('Đoàn Văn Hoài Vũ');
  const [officer1Role, setOfficer1Role] = useState('Chuyên viên');
  const [officer1Org, setOfficer1Org] = useState('Phòng Kinh tế xã Lãnh Ngọc');
  const [officer2Name, setOfficer2Name] = useState('Võ Tấn Lạt');
  const [officer2Role, setOfficer2Role] = useState('Phó Trưởng phòng');
  const [officer2Org, setOfficer2Org] = useState('Phòng Kinh tế xã Lãnh Ngọc');
  const [citizen1Name, setCitizen1Name] = useState('');
  const [citizen1BirthYear, setCitizen1BirthYear] = useState('1975');
  const [citizen1Address, setCitizen1Address] = useState('');
  const [citizen2Name, setCitizen2Name] = useState('');
  const [citizen2BirthYear, setCitizen2BirthYear] = useState('1978');
  const [citizen2Address, setCitizen2Address] = useState('');
  const [currentStatus, setCurrentStatus] = useState('Đất ở và đất trồng cây lâu năm; có nhà ở và cây trồng gắn liền với đất');
  const [usageTime, setUsageTime] = useState('1990');
  const [disputeStatus, setDisputeStatus] = useState('Đất không tranh chấp');
  const [planningSuitability, setPlanningSuitability] = useState('Thửa đất phù hợp quy hoạch sử dụng đất theo quyết định phê duyệt điều chỉnh Quy hoạch sử dụng đất của cấp có thẩm quyền');
  const [adjacentNeighbors, setAdjacentNeighbors] = useState('Hộ ông Nguyễn Văn A (phía Bắc), Hộ bà Trần Thị B (phía Nam), Đường giao thông nông thôn (phía Đông), Đất lâm nghiệp (phía Tây)');

  // New detailed inspection fields from Word Doc template (media_1792229385690_0b9e70dd.doc)
  const [soDoThuaDat, setSoDoThuaDat] = useState('trích đo bản đồ địa chính số 879-2025 do Chi nhánh Văn phòng ĐKĐĐ Tiên Phước duyệt ngày 11/11/2025');
  const [villageRepName, setVillageRepName] = useState('Nguyễn Văn Chính');
  const [villageRepRole, setVillageRepRole] = useState('Trưởng thôn Tiên Hiệp');
  const [landPriceLocationResidential, setLandPriceLocationResidential] = useState('Vị trí 1 - Đường ĐT 614');
  const [landPriceLocationAgri, setLandPriceLocationAgri] = useState('Vị trí 1');
  const [landDepth, setLandDepth] = useState('25');
  const [alleyWidth, setAlleyWidth] = useState('4,5');
  const [taxObligationArea, setTaxObligationArea] = useState('549,5');
  const [residentialAreaInQuota, setResidentialAreaInQuota] = useState('300,0');
  const [residentialAreaOutOfQuota, setResidentialAreaOutOfQuota] = useState('0');
  const [agricultureTaxArea, setAgricultureTaxArea] = useState('249,5');
  const [taxExemptionDetails, setTaxExemptionDetails] = useState('Không thuộc đối tượng miễn, giảm tiền sử dụng đất');
  const [landLawViolation, setLandLawViolation] = useState('Không có hành vi vi phạm pháp luật về đất đai');
  const [inspectionFeedback, setInspectionFeedback] = useState('Các thành phần tham gia kiểm tra thực địa thống nhất với vị trí, diện tích, ranh giới và hiện trạng sử dụng của thửa đất nêu trên; hồ sơ đủ điều kiện thực hiện các bước tiếp theo để cấp Giấy chứng nhận quyền sử dụng đất theo quy định.');
  const [dossierReceivedDateStr, setDossierReceivedDateStr] = useState('04/06/2026');

  // 3 Witnesses for Land Origin Verification (Document 2)
  const [witness1Name, setWitness1Name] = useState('Trần Văn Tâm');
  const [witness1Address, setWitness1Address] = useState('thôn Tiên Hiệp, xã Lãnh Ngọc');
  const [witness2Name, setWitness2Name] = useState('Lê Thị Hoa');
  const [witness2Address, setWitness2Address] = useState('thôn Tiên Hiệp, xã Lãnh Ngọc');
  const [witness3Name, setWitness3Name] = useState('Nguyễn Đức Thọ');
  const [witness3Address, setWitness3Address] = useState('thôn Tiên Hiệp, xã Lãnh Ngọc');

  // Handover Tracking States (Document: PHIẾU THEO DÕI BÀN GIAO HỒ SƠ)
  const [handoverOwner, setHandoverOwner] = useState('');
  const [handoverAddress, setHandoverAddress] = useState('');
  const [handoverProcedure, setHandoverProcedure] = useState('');
  const [handoverComponents, setHandoverComponents] = useState('');
  const [handoverQuantity, setHandoverQuantity] = useState('01 bộ hồ sơ gốc');
  const [handover1Content, setHandover1Content] = useState('Tiếp nhận hồ sơ từ Bộ phận Một cửa để xử lý');
  const [handover1Date, setHandover1Date] = useState('04/06/2026');
  const [handover1Giver, setHandover1Giver] = useState('Bộ phận Tiếp nhận và Trả kết quả (Một Cửa)');
  const [handover1Receiver, setHandover1Receiver] = useState('Đoàn Văn Hoài Vũ');
  const [handover1Note, setHandover1Note] = useState('Đầy đủ 01 bộ hồ sơ gốc gồm đơn đăng ký, giấy tờ nguồn gốc đất, CCCD');
  const [handover2Content, setHandover2Content] = useState('Bàn giao hồ sơ để bổ sung, hoàn thiện hoặc phối hợp xử lý');
  const [handover2Date, setHandover2Date] = useState('');
  const [handover2Giver, setHandover2Giver] = useState('');
  const [handover2Receiver, setHandover2Receiver] = useState('');
  const [handover3Content, setHandover3Content] = useState('Bàn giao hồ sơ đã xử lý cho Bộ phận Một cửa trả kết quả');
  const [handover3Date, setHandover3Date] = useState('');
  const [handover3Giver, setHandover3Giver] = useState('');
  const [handover3Receiver, setHandover3Receiver] = useState('');
  const [handover4Content, setHandover4Content] = useState('');
  const [handover4Date, setHandover4Date] = useState('');
  const [handover4Giver, setHandover4Giver] = useState('');
  const [handover4Receiver, setHandover4Receiver] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [submissionSignDate, setSubmissionSignDate] = useState('15/09/2026');
  const [leaderSignDate, setLeaderSignDate] = useState('18/09/2026');
  const [leaderSignerName, setLeaderSignerName] = useState('Thái Công Cần - Phó Chủ tịch UBND xã');
  const [taxReturnDate, setTaxReturnDate] = useState('30/09/2026');
  const [finalHandoverDate, setFinalHandoverDate] = useState('03/10/2026');
  const [finalHandoverReceiver, setFinalHandoverReceiver] = useState('Vũ Thị Minh Chỉnh (Chủ hồ sơ)');
  const [finalHandoverNote, setFinalHandoverNote] = useState('Đã thu biên lai thuế, trao GCN số DA 981240, vào Sổ cấp GCN số CS 01429');

  // Custom reason content for Supplement & Return
  const [supplementReason, setSupplementReason] = useState(
    `1. Thông tin về địa chỉ thường trú của người sử dụng đất chưa thống nhất giữa Đơn đề nghị xác nhận và Đơn đăng ký biến động đất đai, tài sản gắn liền với đất. Đề nghị công dân kiểm tra, kê khai và thống nhất lại thông tin địa chỉ thường trú trong các giấy tờ, đơn đề nghị có liên quan.\n2. Phần “Kính gửi” tại Đơn đăng ký biến động đất đai, tài sản gắn liền với đất chưa phù hợp, hiện đơn được ghi gửi đến Chi nhánh Văn phòng Đăng ký đất đai, trong khi hồ sơ được nộp và tiếp nhận để thực hiện thủ tục tại UBND xã Lãnh Ngọc. Đề nghị công dân kiểm tra, kê khai lại phần “Kính gửi” bảo đảm đúng cơ quan tiếp nhận, giải quyết thủ tục hành chính.`
  );

  const [returnReason, setReturnReason] = useState(
    `1. Hồ sơ nộp không đúng thẩm quyền giải quyết theo quy định của Luật Đất đai hoặc chưa đủ điều kiện cấp Giấy chứng nhận quyền sử dụng đất.\n2. Quá thời hạn bổ sung hồ sơ theo quy định nhưng công dân không hoàn thiện thành phần hồ sơ theo Phiếu hướng dẫn.`
  );

  // Land Parcels for Public List (Mẫu số 17)
  const [parcels, setParcels] = useState<LandParcelItem[]>([]);

  const printContentRef = useRef<HTMLDivElement>(null);
  const prevOpenRef = useRef(false);
  const prevDossierIdRef = useRef<string | null | undefined>(undefined);
  const prevWfJsonRef = useRef<string>('');
  const prevInitialSlipTypeRef = useRef<DossierSlipType | undefined>(undefined);

  useEffect(() => {
    if (!isOpen || !dossier) {
      prevOpenRef.current = false;
      prevDossierIdRef.current = undefined;
      prevWfJsonRef.current = '';
      return;
    }

    const currentWfJson = JSON.stringify(dossier.workflowData || {});
    const isNewlyOpened = !prevOpenRef.current && isOpen;
    const isTargetChanged = dossier.id !== prevDossierIdRef.current;
    const isWfChanged = currentWfJson !== prevWfJsonRef.current;
    const isSlipChanged = Boolean(initialSlipType && initialSlipType !== prevInitialSlipTypeRef.current);

    if (isNewlyOpened || isTargetChanged || isWfChanged || isSlipChanged) {
      prevOpenRef.current = true;
      prevDossierIdRef.current = dossier.id;
      prevWfJsonRef.current = currentWfJson;
      prevInitialSlipTypeRef.current = initialSlipType;

      if (initialSlipType) {
        setSlipType(initialSlipType);
      }

      const wf = dossier.workflowData || {};

      const randomNum = Math.floor(Math.random() * 80) + 120;
      setDispatchNumber(randomNum.toString());

      // Extract village name from address if available
      let vName = wf.villageName || 'thôn Tiên Hiệp';
      if (!wf.villageName && dossier.address) {
        const match = dossier.address.match(/thôn\s+[^,]+/i);
        if (match) {
          vName = match[0].trim();
        }
      }
      setVillageName(vName);
      setPublicLocationVillage(wf.publicLocationVillage || `Nhà văn hóa ${vName}`);

      const today = new Date();
      const sDate = wf.publicStartDate || today.toISOString().split('T')[0];
      let eDate = wf.publicEndDate || '';
      if (!eDate) {
        const endDateObj = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
        eDate = endDateObj.toISOString().split('T')[0];
      }
      setPublicStartDate(sDate);
      setPublicEndDate(eDate);

      // Initialize Step 1 Inspection fields
      setInspectionTime(wf.inspectionTime || '08 giờ 30 phút');
      setInspectionEndTime(wf.inspectionEndTime || '09 giờ 30 phút');
      if (wf.inspectionDate) {
        try {
          const p = wf.inspectionDate.split('-');
          setInspectionYear(p[0] || today.getFullYear().toString());
          setInspectionMonth(p[1] ? String(Number(p[1])) : (today.getMonth() + 1).toString());
          setInspectionDay(p[2] ? String(Number(p[2])) : today.getDate().toString());
        } catch (_) {
          setInspectionDay(today.getDate().toString());
          setInspectionMonth((today.getMonth() + 1).toString());
          setInspectionYear(today.getFullYear().toString());
        }
      } else {
        setInspectionDay(today.getDate().toString());
        setInspectionMonth((today.getMonth() + 1).toString());
        setInspectionYear(today.getFullYear().toString());
      }

      setInspectionLocation(
        wf.inspectionLocation ||
          `Thực địa Thửa đất số ${wf.parcel || dossier.parcel}, Tờ bản đồ số ${wf.mapSheet || dossier.mapSheet}, ${wf.landAddress || dossier.address || `${vName}, xã Lãnh Ngọc`}`
      );

      setOfficer1Name(wf.officer1Name || dossier.handlerName || 'Đoàn Văn Hoài Vũ');
      setOfficer1Role(wf.officer1Role || 'Chuyên viên');
      setOfficer1Org(wf.officer1Org || 'Phòng Kinh tế xã Lãnh Ngọc');

      setOfficer2Name(wf.officer2Name || 'Võ Tấn Lạt');
      setOfficer2Role(wf.officer2Role || 'Phó Trưởng phòng');
      setOfficer2Org(wf.officer2Org || 'Phòng Kinh tế xã Lãnh Ngọc');

      setOfficerRecorderName(wf.officer1Name || dossier.handlerName || 'Đoàn Văn Hoài Vũ');

      setCitizen1Name(wf.owner || wf.citizen1Name || dossier.owner);
      setCitizen1BirthYear(wf.birthYear1 || '1975');
      setCitizen1Address(wf.permanentAddress1 || dossier.address || `${vName}, xã Lãnh Ngọc, thành phố Đà Nẵng`);

      setCitizen2Name(wf.owner2 || wf.citizen2Name || '');
      setCitizen2BirthYear(wf.birthYear2 || '1978');
      setCitizen2Address(wf.permanentAddress2 || dossier.address || `${vName}, xã Lãnh Ngọc, thành phố Đà Nẵng`);

      setAdjacentNeighbors(
        wf.adjacentNeighbors ||
          'Hộ ông Nguyễn Văn A (phía Bắc), Hộ bà Trần Thị B (phía Nam), Đường giao thông nông thôn (phía Đông), Đất lâm nghiệp (phía Tây)'
      );

      setTotalLandArea(wf.totalLandArea || '549,5');
      if (wf.landTypes && wf.landTypes.length > 0) {
        const ont = wf.landTypes.find((t: any) => t.category.toUpperCase().includes('ONT') || t.category.toLowerCase().includes('đất ở'));
        const cln = wf.landTypes.find((t: any) => t.category.toUpperCase().includes('CLN') || t.category.toLowerCase().includes('lâu năm') || t.category.toUpperCase().includes('BHK'));
        if (ont) setResidentialArea(ont.area);
        if (cln) setAgricultureArea(cln.area);
      } else {
        setResidentialArea(wf.residentialArea || '300,0');
        setAgricultureArea(wf.agricultureArea || '249,5');
      }

      if (wf.taxNoticeTruocBaNumber) {
        setTaxNotice1(`Thông báo số ${wf.taxNoticeTruocBaNumber} ngày ${wf.taxNoticeTruocBaDate ? wf.taxNoticeTruocBaDate.split('-').reverse().join('/') : '...'} của cơ quan Thuế về lệ phí trước bạ nhà, đất`);
      } else if (wf.taxNotice1) {
        setTaxNotice1(wf.taxNotice1);
      }

      if (wf.taxNoticeTienSDDNumber) {
        setTaxNotice2(`Thông báo số ${wf.taxNoticeTienSDDNumber} ngày ${wf.taxNoticeTienSDDDate ? wf.taxNoticeTienSDDDate.split('-').reverse().join('/') : '...'} của cơ quan Thuế về tiền sử dụng đất`);
      } else if (wf.taxNotice2) {
        setTaxNotice2(wf.taxNotice2);
      }

      if (wf.taxNoticeHoanThanhNVTCNumber) {
        setTaxConfirmNotice(`Thông báo số ${wf.taxNoticeHoanThanhNVTCNumber} ngày ${wf.taxNoticeHoanThanhNVTCDate ? wf.taxNoticeHoanThanhNVTCDate.split('-').reverse().join('/') : '...'} về việc xác nhận hoàn thành nghĩa vụ tài chính về đất`);
      } else if (wf.taxConfirmNotice) {
        setTaxConfirmNotice(wf.taxConfirmNotice);
      }

      setTrichDoNumber(wf.trichDoNumber || '879-2025');
      setTrichDoDate(wf.trichDoDate || '11/11/2025');

      setPublicNoticeNumber(wf.publicNoticeNumber || '316/TB-UBND');
      setPublicListNumber(wf.publicListNumber || '28/CKHS-ĐKĐĐ');
      setCommuneLeaderName(wf.communeLeaderName || 'Thái Công Cần');
      setCommuneLeaderRole(wf.communeLeaderRole || 'KT. CHỦ TỊCH\nPHÓ CHỦ TỊCH');
      setVillageLeaderName(wf.villageLeaderName || 'Nguyễn Văn Chính');
      setVillageLeaderRole(wf.villageLeaderRole || 'Trưởng thôn Tiên Hiệp');

      setCurrentStatus(wf.currentStatus || 'Đất ở và đất trồng cây lâu năm; có nhà ở và cây trồng gắn liền với đất');
      setUsageTime(wf.usageTime || '1990');
      setDisputeStatus(wf.disputeStatus || 'Đất không tranh chấp');
      setPlanningSuitability(
        wf.planningSuitability ||
          'Thửa đất phù hợp quy hoạch sử dụng đất theo quyết định phê duyệt điều chỉnh Quy hoạch sử dụng đất của cấp có thẩm quyền'
      );

      setSoDoThuaDat(wf.soDoThuaDat || `trích đo bản đồ địa chính số ${wf.trichDoNumber || '879-2025'} do Chi nhánh Văn phòng ĐKĐĐ Tiên Phước duyệt ngày ${wf.trichDoDate || '11/11/2025'}`);
      setVillageRepName(wf.villageLeaderName || 'Nguyễn Văn Chính');
      setVillageRepRole(wf.villageLeaderRole || 'Trưởng thôn Tiên Hiệp');
      setLandPriceLocationResidential(wf.landPriceLocationResidential || 'Vị trí 1 - Đường ĐT 614');
      setLandPriceLocationAgri(wf.landPriceLocationAgri || 'Vị trí 1');
      setLandDepth(wf.landDepth || '25');
      setAlleyWidth(wf.alleyWidth || '4,5');
      setTaxObligationArea(wf.taxObligationArea || wf.totalLandArea || '549,5');
      setResidentialAreaInQuota(wf.residentialAreaInQuota || wf.residentialArea || '300,0');
      setResidentialAreaOutOfQuota(wf.residentialAreaOutOfQuota || '0');
      setAgricultureTaxArea(wf.agricultureTaxArea || wf.agricultureArea || '249,5');
      setTaxExemptionDetails(wf.taxExemptionDetails || 'Không thuộc đối tượng miễn, giảm tiền sử dụng đất');
      setLandLawViolation(wf.landLawViolation || 'Không có hành vi vi phạm pháp luật về đất đai');
      setInspectionFeedback(wf.inspectionFeedback || 'Các thành phần tham gia kiểm tra thực địa thống nhất với vị trí, diện tích, ranh giới và hiện trạng sử dụng của thửa đất nêu trên; hồ sơ đủ điều kiện thực hiện các bước tiếp theo để cấp Giấy chứng nhận quyền sử dụng đất theo quy định.');
      setDossierReceivedDateStr(dossier.receivedDate ? dossier.receivedDate.split('-').reverse().join('/') : '04/06/2026');

      setWitness1Name(wf.witness1Name || 'Trần Văn Tâm');
      setWitness1Address(wf.witness1Address || `${vName}, xã Lãnh Ngọc`);
      setWitness2Name(wf.witness2Name || 'Lê Thị Hoa');
      setWitness2Address(wf.witness2Address || `${vName}, xã Lãnh Ngọc`);
      setWitness3Name(wf.witness3Name || 'Nguyễn Đức Thọ');
      setWitness3Address(wf.witness3Address || `${vName}, xã Lãnh Ngọc`);

      // Handover Tracking Slip initialization
      setHandoverOwner(wf.handoverOwner || dossier.owner || '');
      setHandoverAddress(wf.handoverAddress || dossier.address || `${vName}, xã Lãnh Ngọc, thành phố Đà Nẵng`);
      setHandoverProcedure(wf.handoverProcedure || dossier.procedure || 'Đăng ký, cấp Giấy chứng nhận quyền sử dụng đất lần đầu');
      setHandoverComponents(
        wf.handoverComponents ||
          `Đơn đăng ký, cấp Giấy chứng nhận; Giấy tờ về nguồn gốc sử dụng đất; Trích đo địa chính thửa đất số ${dossier.parcel || '...'}, TBĐ số ${dossier.mapSheet || '...'}; Bản sao CCCD người sử dụng đất.`
      );
      setHandoverQuantity(wf.handoverQuantity || '01 bộ hồ sơ gốc (kèm các tài liệu liên quan)');
      setHandover1Content(wf.handover1Content || 'Tiếp nhận hồ sơ từ Bộ phận Một cửa để xử lý');
      setHandover1Date(
        wf.handover1Date
          ? (wf.handover1Date.includes('-') ? wf.handover1Date.split('-').reverse().join('/') : wf.handover1Date)
          : (dossier.receivedDate ? dossier.receivedDate.split('-').reverse().join('/') : `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`)
      );
      setHandover1Giver(wf.handover1Giver || 'Bộ phận Tiếp nhận và Trả kết quả (Một Cửa)');
      setHandover1Receiver(wf.handover1Receiver || (dossier.handlerName || 'Đoàn Văn Hoài Vũ'));
      setHandover1Note(wf.handover1Note || 'Đầy đủ 01 bộ hồ sơ gốc gồm đơn đăng ký, giấy tờ nguồn gốc đất, CCCD');

      setHandover2Content(wf.handover2Content || 'Bàn giao hồ sơ để bổ sung, hoàn thiện hoặc phối hợp xử lý');
      setHandover2Giver(wf.handover2Giver || (dossier.handlerName || 'Đoàn Văn Hoài Vũ'));
      setHandover2Receiver(wf.handover2Receiver || 'Bộ phận Một Cửa / Người sử dụng đất');
      setHandover2Date(
        wf.handover2Date
          ? (wf.handover2Date.includes('-') ? wf.handover2Date.split('-').reverse().join('/') : wf.handover2Date)
          : (dossier.supplementDate ? dossier.supplementDate.split('-').reverse().join('/') : '')
      );

      setHandover3Content(wf.handover3Content || 'Bàn giao hồ sơ đã xử lý cho Bộ phận Một cửa trả kết quả');
      setHandover3Giver(wf.handover3Giver || (dossier.handlerName || 'Đoàn Văn Hoài Vũ'));
      setHandover3Receiver(wf.handover3Receiver || 'Bộ phận Tiếp nhận và Trả kết quả (Một Cửa)');
      setHandover3Date(
        wf.handover3Date
          ? (wf.handover3Date.includes('-') ? wf.handover3Date.split('-').reverse().join('/') : wf.handover3Date)
          : (dossier.actualEndDate ? dossier.actualEndDate.split('-').reverse().join('/') : (dossier.dueDate ? dossier.dueDate.split('-').reverse().join('/') : ''))
      );

      setHandover4Content(wf.handover4Content || '');
      setHandover4Giver(wf.handover4Giver || '');
      setHandover4Receiver(wf.handover4Receiver || '');
      setHandover4Date(wf.handover4Date || '');
      setHandoverNotes(wf.handoverNotes || dossier.note || '');

      setSubmissionSignDate(wf.submissionSignDate ? wf.submissionSignDate.split('-').reverse().join('/') : '15/09/2026');
      setLeaderSignDate(wf.leaderSignDate ? wf.leaderSignDate.split('-').reverse().join('/') : '18/09/2026');
      setLeaderSignerName(wf.leaderSignerName || 'Thái Công Cần - Phó Chủ tịch UBND xã');
      setTaxReturnDate(wf.taxReturnDate ? wf.taxReturnDate.split('-').reverse().join('/') : '30/09/2026');
      setFinalHandoverDate(wf.finalHandoverDate ? wf.finalHandoverDate.split('-').reverse().join('/') : (dossier.actualEndDate ? dossier.actualEndDate.split('-').reverse().join('/') : '03/10/2026'));
      setFinalHandoverReceiver(wf.finalHandoverReceiver || `${dossier.owner} (Chủ hồ sơ)`);
      setFinalHandoverNote(wf.finalHandoverNote || `Đã thu biên lai thuế, trao GCN số ${wf.gcnDraftNumber || 'DA 981240'}, vào Sổ cấp GCN số ${wf.gcnBookNumber || 'CS 01429'}`);

      const defaultParcels: LandParcelItem[] = [
        {
          id: 'p1',
          stt: 1,
          owner: wf.owner || wf.citizen1Name || dossier.owner,
          permanentAddress: wf.permanentAddress1 || dossier.address || `${vName}, xã Lãnh Ngọc, thành phố Đà Nẵng`,
          landAddress: wf.landAddress || dossier.address || `${vName}, xã Lãnh Ngọc, thành phố Đà Nẵng`,
          mapSheet: wf.mapSheet || dossier.mapSheet || '19',
          parcel: wf.parcel || dossier.parcel || '304',
          area: wf.totalLandArea || '549,5',
          usageTime: wf.usageTime ? `Năm ${wf.usageTime}` : 'Năm 1990',
          origin:
            wf.landOrigin ||
            `Thửa đất do hộ ông/bà ${wf.owner || dossier.owner} tự khai hoang canh tác, quản lý sử dụng ổn định từ năm 1990 đến nay không tranh chấp với các hộ liền kề. Năm 2024, đo đạc xác định diện tích thực tế là ${wf.totalLandArea || '549,5'} m² theo hiện trạng.`,
          currentStatus: wf.currentStatus || 'Đất ở và đất trồng cây lâu năm; trên đất có cây trồng lâu năm và công trình phụ trợ',
          assetCreatedTime: wf.assetCreatedTime || '1990',
          disputeStatus: wf.disputeStatus || 'Đất không tranh chấp',
          planningSuitability:
            wf.planningSuitability ||
            'Thửa đất phù hợp quy hoạch sử dụng đất theo quyết định phê duyệt điều chỉnh Quy hoạch sử dụng đất của cấp có thẩm quyền',
        },
      ];
      setParcels(defaultParcels);
    }
  }, [isOpen, dossier, initialSlipType]);

  if (!isOpen || !dossier) return null;

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const preparePrintableClone = (): HTMLElement | null => {
    if (!printContentRef.current) return null;
    const clone = printContentRef.current.cloneNode(true) as HTMLElement;

    // 1. Remove controls with .no-print class
    clone.querySelectorAll('.no-print').forEach((el) => el.remove());

    // 2. Replace inputs with clean formatted text
    clone.querySelectorAll('input').forEach((inp) => {
      const span = document.createElement('span');
      span.textContent = inp.value || (inp.placeholder && inp.placeholder.includes('..') ? inp.placeholder : '');
      if (inp.classList.contains('font-bold') || inp.parentElement?.classList.contains('font-bold')) {
        span.style.fontWeight = 'bold';
      }
      if (inp.classList.contains('text-center') || inp.parentElement?.classList.contains('text-center')) {
        span.style.textAlign = 'center';
      }
      inp.parentNode?.replaceChild(span, inp);
    });

    // 3. Replace textareas with clean formatted text preserving newlines
    clone.querySelectorAll('textarea').forEach((ta) => {
      const span = document.createElement('span');
      span.textContent = ta.value || (ta.placeholder && ta.placeholder.includes('..') ? ta.placeholder : '');
      span.style.whiteSpace = 'pre-wrap';
      ta.parentNode?.replaceChild(span, ta);
    });

    // 4. Convert all h1, h2, h3 to centered bold paragraphs so Word does not apply its Heading styles
    clone.querySelectorAll('h1, h2, h3').forEach((heading) => {
      const p = document.createElement('p');
      p.setAttribute('align', 'center');
      p.style.textAlign = 'center';
      p.style.fontWeight = 'bold';
      p.style.fontSize = heading.tagName.toLowerCase() === 'h1' ? '15pt' : '13pt';
      p.style.marginTop = '10pt';
      p.style.marginBottom = '4pt';
      p.style.textTransform = 'uppercase';
      p.style.fontFamily = "'Times New Roman', Times, serif";
      p.innerHTML = `<b>${heading.innerHTML}</b>`;
      heading.parentNode?.replaceChild(p, heading);
    });

    // 5. Replace empty div horizontal divider lines with Word-compatible single-cell tables
    clone.querySelectorAll('div').forEach((div) => {
      const className = div.className || '';
      const isDivider =
        (className.includes('bg-black') &&
          (className.includes('h-[1.5px]') || className.includes('h-0.5') || className.includes('h-px'))) ||
        (div.children.length === 0 &&
          !div.textContent?.trim() &&
          (className.includes('bg-black') || className.includes('border-b')));

      if (isDivider) {
        let widthPx = '145px';
        if (className.includes('w-24')) widthPx = '95px';
        else if (className.includes('w-20')) widthPx = '80px';
        else if (className.includes('w-28')) widthPx = '145px';
        else if (className.includes('w-32')) widthPx = '165px';
        else if (className.includes('w-36')) widthPx = '185px';
        else if (className.includes('w-40')) widthPx = '205px';

        const hrTable = document.createElement('table');
        hrTable.setAttribute('align', 'center');
        hrTable.setAttribute('border', '0');
        hrTable.setAttribute('cellspacing', '0');
        hrTable.setAttribute('cellpadding', '0');
        hrTable.style.margin = '2pt auto 4pt auto';
        hrTable.style.borderCollapse = 'collapse';
        hrTable.style.border = 'none';
        hrTable.style.width = widthPx;
        hrTable.innerHTML = `<tbody><tr><td style="border: none; border-bottom: 1.5pt solid black; height: 1px; line-height: 1px; font-size: 1px; padding: 0; width: ${widthPx};">&nbsp;</td></tr></tbody>`;
        div.parentNode?.replaceChild(hrTable, div);
        return;
      }

      // Check if it's a signature spacer div (e.g., h-16, h-20, h-24)
      if (
        div.children.length === 0 &&
        !div.textContent?.trim() &&
        (className.includes('h-16') ||
          className.includes('h-20') ||
          className.includes('h-24') ||
          className.includes('h-14'))
      ) {
        div.style.height = '55pt';
        div.style.lineHeight = '55pt';
        div.innerHTML = '&nbsp;';
      }
    });

    // 6. Ensure all tables have proper border/cellspacing attributes for Word compatibility
    clone.querySelectorAll('table').forEach((tbl) => {
      tbl.setAttribute('align', 'center');
      if (tbl.classList.contains('header-table') || tbl.classList.contains('sig-table')) {
        tbl.setAttribute('border', '0');
        tbl.setAttribute('cellspacing', '0');
        tbl.setAttribute('cellpadding', '0');
        tbl.style.border = 'none';
        tbl.style.width = '100%';
        tbl.style.borderCollapse = 'collapse';
        tbl.querySelectorAll('td, th').forEach((cell) => {
          const el = cell as HTMLElement;
          el.style.border = 'none';
          el.setAttribute('valign', 'top');
          el.style.verticalAlign = 'top';
        });
      } else {
        tbl.setAttribute('border', '1');
        tbl.setAttribute('cellspacing', '0');
        tbl.setAttribute('cellpadding', '5');
        tbl.style.borderCollapse = 'collapse';
        tbl.style.width = '100%';
        tbl.querySelectorAll('td, th').forEach((cell) => {
          const el = cell as HTMLElement;
          el.style.border = '1pt solid black';
          el.style.padding = '4pt 6pt';
        });
      }
    });

    // 7. Explicitly propagate alignment and typography inline styles across ALL elements
    clone.querySelectorAll('*').forEach((node) => {
      const el = node as HTMLElement;
      const classList = el.className ? String(el.className) : '';

      if (classList.includes('text-center') || el.getAttribute('align') === 'center') {
        el.setAttribute('align', 'center');
        el.style.textAlign = 'center';
      } else if (classList.includes('text-right') || el.getAttribute('align') === 'right') {
        el.setAttribute('align', 'right');
        el.style.textAlign = 'right';
      } else if (classList.includes('text-justify') || el.getAttribute('align') === 'justify') {
        el.setAttribute('align', 'justify');
        el.style.textAlign = 'justify';
      }

      if (classList.includes('font-bold') || el.tagName === 'B' || el.tagName === 'STRONG') {
        el.style.fontWeight = 'bold';
      }

      if (classList.includes('italic') || el.tagName === 'I' || el.tagName === 'EM') {
        el.style.fontStyle = 'italic';
      }

      if (classList.includes('uppercase')) {
        el.style.textTransform = 'uppercase';
      }

      el.style.fontFamily = "'Times New Roman', Times, serif";
    });

    return clone;
  };

  const fallbackWindowPrint = (html: string) => {
    try {
      const printWindow = window.open('', '_blank', 'width=950,height=800');
      if (!printWindow) {
        window.print();
        return;
      }
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (e) {
          console.error(e);
        }
      }, 300);
    } catch (err) {
      console.warn('Fallback window print error:', err);
      window.print();
    }
  };

  const handlePrint = () => {
    const clone = preparePrintableClone();
    if (!clone) return;
    const orientation = slipType === 'public_list' ? 'landscape' : 'portrait';
    const content = clone.innerHTML;

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>Văn bản - ${dossier.code}</title>
        <style>
          @page {
            size: A4 ${orientation};
            margin: ${orientation === 'landscape' ? '12mm 15mm 12mm 15mm' : '15mm 15mm 15mm 20mm'};
          }
          * {
            box-sizing: border-box;
            font-family: 'Times New Roman', 'Tinos', Times, serif !important;
          }
          body {
            font-family: 'Times New Roman', 'Tinos', Times, serif !important;
            font-size: ${slipType === 'public_list' ? '10.5pt' : '13pt'};
            line-height: 1.35;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          table.header-table, table.sig-table {
            width: 100% !important;
            border: none !important;
            margin-bottom: 8pt;
          }
          table.header-table td, table.sig-table td {
            border: none !important;
            padding: 0 !important;
            vertical-align: top;
          }
          table.data-table {
            width: 100% !important;
            border-collapse: collapse;
            border: 1pt solid #000;
          }
          table.data-table th, table.data-table td {
            border: 1pt solid #000;
            padding: 4pt 6pt;
            font-size: ${slipType === 'public_list' ? '9.5pt' : '11.5pt'};
            vertical-align: middle;
          }
          .no-print {
            display: none !important;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-justify { text-align: justify; }
          .font-bold { font-weight: bold; }
          .italic { font-style: italic; }
          .uppercase { text-transform: uppercase; }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `;

    // 1. Primary method: Hidden iframe (Bypasses popup blocker completely, instant browser print preview)
    try {
      let iframe = document.getElementById('print-iframe-sandbox') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'print-iframe-sandbox';
        iframe.setAttribute(
          'style',
          'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;visibility:hidden;'
        );
        document.body.appendChild(iframe);
      }

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(fullHtml);
        iframeDoc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.warn('Iframe print error, falling back to window print:', e);
            fallbackWindowPrint(fullHtml);
          }
        }, 200);
        return;
      }
    } catch (err) {
      console.warn('Iframe print setup error:', err);
    }

    fallbackWindowPrint(fullHtml);
  };

  const handleCopyText = () => {
    if (!printContentRef.current) return;
    navigator.clipboard.writeText(printContentRef.current.innerText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadWord = () => {
    if (!printContentRef.current) return;
    const orientation = slipType === 'public_list' ? 'landscape' : 'portrait';
    const filename = `Van_Ban_${slipType.toUpperCase()}_${dossier.code}_${new Date().toISOString().split('T')[0]}`;

    downloadWordDocumentND30(printContentRef.current, filename, {
      orientation,
      title: `Văn bản hành chính - Hồ sơ ${dossier.code} - ${dossier.owner}`,
      fontSizePt: slipType === 'public_list' ? 10.5 : 13,
      marginTopMm: 20,
      marginBottomMm: 20,
      marginLeftMm: orientation === 'landscape' ? 25 : 30,
      marginRightMm: 15,
    });
  };

  const addParcelRow = () => {
    const nextStt = parcels.length + 1;
    const newRow: LandParcelItem = {
      id: `p_${Date.now()}`,
      stt: nextStt,
      owner: dossier.owner,
      permanentAddress: dossier.address || `${villageName}, xã Lãnh Ngọc, thành phố Đà Nẵng`,
      landAddress: dossier.address || `${villageName}, xã Lãnh Ngọc, thành phố Đà Nẵng`,
      mapSheet: dossier.mapSheet || '19',
      parcel: '...',
      area: '500,0',
      usageTime: 'Năm 1990',
      origin: `Thửa đất do hộ ông/bà ${dossier.owner} tự khai hoang canh tác, quản lý sử dụng ổn định từ năm 1990 đến nay không tranh chấp.`,
      currentStatus: 'Đất trồng cây lâu năm',
      assetCreatedTime: '1990',
      disputeStatus: 'Đất không tranh chấp',
      planningSuitability: 'Thửa đất phù hợp quy hoạch',
    };
    setParcels([...parcels, newRow]);
  };

  const removeParcelRow = (id: string) => {
    if (parcels.length <= 1) return;
    const updated = parcels.filter((p) => p.id !== id).map((p, idx) => ({ ...p, stt: idx + 1 }));
    setParcels(updated);
  };

  const updateParcelCell = (id: string, field: keyof LandParcelItem, val: string) => {
    setParcels(
      parcels.map((p) => {
        if (p.id === id) {
          return { ...p, [field]: val };
        }
        return p;
      })
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[96vh] min-h-0">
        {/* Modal Header */}
        <div className={`${PREVIEW_HEADER_LAYOUT} bg-slate-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-slate-800`}>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Văn Bản Hành Chính Nghiệp Vụ Đất Đai (Giữ Nguyên 100% Nội Dung Mẫu)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Mã hồ sơ: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{dossier.code}</span> - Chủ hộ: <span className="font-bold text-slate-800 dark:text-slate-200">{dossier.owner}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="px-2.5 py-1.5 bg-emerald-50/60 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/40 flex flex-col gap-1.5 shrink-0">
          {/* Slip Type Tabs */}
          <div className={`p-1 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 ${PREVIEW_TABS_LAYOUT} w-full`}>
            <button
              type="button"
              onClick={() => setSlipType('receipt')}
              className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                slipType === 'receipt'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Phiếu Hẹn (Mẫu 01)</span>
            </button>

            <button
              type="button"
              onClick={() => setSlipType('handover_tracking')}
              className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                slipType === 'handover_tracking'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Phiếu Bàn Giao Hồ Sơ</span>
            </button>

            <button
              type="button"
              onClick={() => setSlipType('supplement')}
              className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                slipType === 'supplement'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <FileQuestion className="w-3.5 h-3.5" />
              <span>Phiếu Bổ Sung (Mẫu 02)</span>
            </button>

            <button
              type="button"
              onClick={() => setSlipType('return')}
              className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                slipType === 'return'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <FileX className="w-3.5 h-3.5" />
              <span>Phiếu Trả HS (Mẫu 03)</span>
            </button>

            <button
              type="button"
              onClick={() => setSlipType('site_inspection')}
              className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                slipType === 'site_inspection'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>BB Kiểm Tra Thực Địa (B1)</span>
            </button>

            <button
              type="button"
              onClick={() => setSlipType('origin_verification')}
              className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                slipType === 'origin_verification'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>BB Xác Minh Nguồn Gốc (3 Hộ)</span>
            </button>

            <button
              type="button"
              onClick={() => setSlipType('public_notice')}
              className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                slipType === 'public_notice'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>TB Niêm Yết (B2)</span>
            </button>

            <button
              type="button"
              onClick={() => setSlipType('public_list')}
              className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                slipType === 'public_list'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Mẫu 17 DS Công Khai (B2)</span>
            </button>

            <button
              type="button"
              onClick={() => setSlipType('public_closing_minutes')}
              className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                slipType === 'public_closing_minutes'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>BB Kết Thúc NY (B3)</span>
            </button>

            <button
              type="button"
              onClick={() => setSlipType('public_closing_notice')}
              className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                slipType === 'public_closing_notice'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>TB Kết Thúc NY (B3)</span>
            </button>

            <button
              type="button"
              onClick={() => setSlipType('submission_phieutrinh')}
              className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                slipType === 'submission_phieutrinh'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <FileBadge className="w-3.5 h-3.5" />
              <span>Phiếu Trình Cấp GCN (B6)</span>
            </button>

            <button
              type="button"
              onClick={() => setSlipType('submission_totrinh')}
              className={`${PREVIEW_TAB_BUTTON_LAYOUT} rounded-lg font-bold transition flex items-center gap-1 cursor-pointer ${
                slipType === 'submission_totrinh'
                  ? 'bg-rose-800 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <FileBadge className="w-3.5 h-3.5" />
              <span>Tờ Trình Cấp GCN (B6)</span>
            </button>
          </div>

          <div className={`${PREVIEW_ACTIONS_LAYOUT} flex-wrap w-full`}>
            <button
              type="button"
              onClick={handleCopyText}
              className={`${PREVIEW_ACTION_BUTTON_LAYOUT} rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Đã chép' : 'Chép nội dung'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadWord}
              className={`${PREVIEW_ACTION_BUTTON_LAYOUT} rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải Word (.doc)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className={`${PREVIEW_ACTION_BUTTON_LAYOUT} rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Văn Bản (A4)</span>
            </button>
          </div>
        </div>

        {/* Printable View Container */}
        <div className={`${PREVIEW_DOCUMENT_BODY_LAYOUT} bg-slate-200/60 dark:bg-slate-950 flex justify-center`}>
          {/* TAB 1: PHIẾU HẸN TRẢ KẾT QUẢ (MẪU 01) */}
          {slipType === 'receipt' && (
            <div
              ref={printContentRef}
              style={{ fontFamily: "'Times New Roman', 'Tinos', Times, serif" }}
              className="admin-doc w-full min-w-[210mm] max-w-[210mm] min-h-[297mm] bg-white text-black p-8 sm:p-12 shadow-xl border border-gray-300 leading-relaxed text-sm relative"
            >
              {/* HEADER TABLE THEO NGHỊ ĐỊNH 30 */}
              <table className="header-table w-full border-collapse border-none mb-3">
                <tbody>
                  <tr>
                    <td className="w-[45%] text-center align-top border-none p-0">
                      <div className="text-xs uppercase text-black">UBND XÃ LÃNH NGỌC</div>
                      <div className="text-xs uppercase font-bold text-black">TRUNG TÂM PHỤC VỤ HÀNH CHÍNH CÔNG</div>
                      <div className="w-24 h-[1.5px] bg-black mx-auto my-1"></div>
                      <div className="text-xs font-mono font-bold text-black">
                        Mã HS: {dossier.code}
                      </div>
                    </td>
                    <td className="w-[55%] text-center align-top border-none p-0">
                      <div className="text-xs uppercase font-bold text-black">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                      <div className="text-xs font-bold text-black">Độc lập - Tự do - Hạnh phúc</div>
                      <div className="w-28 h-[1.5px] bg-black mx-auto my-1"></div>
                      <div className="text-[11px] text-black italic">
                        Lãnh Ngọc, ngày {currentDay} tháng {currentMonth} năm {currentYear}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="my-5 text-center">
                <h1 className="text-base sm:text-xl font-bold uppercase text-black tracking-tight">
                  GIẤY TIẾP NHẬN HỒ SƠ VÀ HẸN TRẢ KẾT QUẢ
                </h1>
                <div className="text-xs font-mono font-bold text-black mt-1">
                  Mã số biên nhận: {dossier.code}
                </div>
              </div>

              <div className="mt-6 space-y-3.5 text-xs sm:text-sm text-black">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold min-w-[170px]">• Họ và tên người nộp:</span>
                  <span className="flex-1 font-bold text-black uppercase border-b border-dotted border-black pb-0.5">
                    {dossier.owner}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-bold min-w-[170px]">• Địa chỉ liên hệ:</span>
                  <span className="flex-1 text-black border-b border-dotted border-black pb-0.5">
                    {dossier.address || 'UBND xã Lãnh Ngọc, TP. Đà Nẵng'}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-bold min-w-[170px]">• Tên thủ tục hành chính:</span>
                  <span className="flex-1 font-bold text-black border-b border-dotted border-black pb-0.5">
                    {dossier.procedure}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-bold min-w-[170px]">• Thông tin thửa đất:</span>
                  <span className="flex-1 font-semibold text-black border-b border-dotted border-black pb-0.5">
                    Thửa đất số: <b>{dossier.parcel}</b> — Tờ bản đồ số: <b>{dossier.mapSheet}</b>
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-bold min-w-[170px]">• Thời gian tiếp nhận:</span>
                  <span className="flex-1 font-semibold border-b border-dotted border-black pb-0.5">
                    {formatDate(dossier.receivedDate)}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-black rounded-lg my-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase font-bold text-black">
                        THỜI GIAN HẸN TRẢ KẾT QUẢ:
                      </div>
                      <div className="text-base sm:text-lg font-bold text-black mt-1">
                        Ngày {formatDate(dossier.dueDate)}
                      </div>
                      <div className="text-xs font-semibold text-black mt-1">
                        * Trong trường hợp ngày hẹn nhằm vào ngày chủ nhật vui lòng liên hệ lại vào ngày thứ 2
                      </div>
                    </div>

                    <div className="text-center p-2 bg-white rounded-lg border border-black shrink-0 ml-3">
                      <div className="w-16 h-16 bg-black text-white rounded-md flex flex-col items-center justify-center p-1 text-[8px] font-mono text-center">
                        <QrCode className="w-10 h-10 text-white" />
                        <span>QUÉT TRA CỨU</span>
                      </div>
                      <span className="text-[9px] font-bold text-black block mt-1">Mã: {dossier.code.slice(-6)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="font-bold min-w-[170px]">• Chuyên viên thụ lý hồ sơ:</span>
                  <span className="flex-1 font-semibold text-black border-b border-dotted border-black pb-0.5">
                    {dossier.handlerName || 'Chuyên viên Đoàn Văn Hoài Vũ (Phòng Kinh tế)'}
                  </span>
                </div>
              </div>

              {/* SIGNATURE TABLE THEO NGHỊ ĐỊNH 30 */}
              <table className="sig-table w-full border-collapse border-none mt-10 text-center">
                <tbody>
                  <tr>
                    <td className="w-1/2 align-top border-none p-0 text-center" align="center" style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="font-bold text-xs text-black">Người nộp hồ sơ</div>
                      <div className="text-[11px] italic text-black">(Ký và ghi rõ họ tên)</div>
                      <div className="h-20"></div>
                      <div className="font-bold text-xs text-black">{dossier.owner}</div>
                    </td>
                    <td className="w-1/2 align-top border-none p-0 text-center" align="center" style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="font-bold text-xs text-black">Người tiếp nhận hồ sơ</div>
                      <div className="text-[11px] italic text-black">(Ký và ghi rõ họ tên)</div>
                      <div className="h-20"></div>
                      <div className="font-bold text-xs text-black">
                        {dossier.handlerName || 'Cán bộ Tiếp nhận'}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-8 pt-3 border-t border-black text-xs text-black leading-relaxed text-justify space-y-1">
                <p className="font-bold text-black">
                  * Ghi chú quan trọng:
                </p>
                <p>
                  - <b>Trong trường hợp ngày hẹn nhằm vào ngày chủ nhật vui lòng liên hệ lại vào ngày thứ 2.</b>
                </p>
                <p>
                  - <b>Đề nghị ông (bà) giữ biên nhận này và đem theo chứng minh nhân dân/CCCD (bản chính) để xuất trình khi cần liên hệ theo dõi diễn biến giải quyết hồ sơ ở các cơ quan. Nếu nhận thay phải kèm theo giấy xác nhận ủy quyền của cơ quan công chứng ghi rõ nhận thay hồ sơ biên nhận số trên và địa chỉ thửa đất.</b>
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PHIẾU YÊU CẦU BỔ SUNG (MẪU 02) */}
          {slipType === 'supplement' && (
            <div
              ref={printContentRef}
              style={{ fontFamily: "'Times New Roman', 'Tinos', Times, serif" }}
              className="admin-doc w-full max-w-[210mm] min-h-[260mm] bg-white text-black p-8 sm:p-12 shadow-xl border border-gray-300 leading-relaxed text-sm relative"
            >
              {/* HEADER TABLE THEO NGHỊ ĐỊNH 30 */}
              <table className="header-table w-full border-collapse border-none mb-3">
                <tbody>
                  <tr>
                    <td className="w-[45%] text-center align-top border-none p-0">
                      <div className="text-xs uppercase text-black">UBND XÃ LÃNH NGỌC</div>
                      <div className="text-xs uppercase font-bold text-black">PHÒNG KINH TẾ</div>
                      <div className="w-24 h-[1.5px] bg-black mx-auto my-1"></div>
                      <div className="text-xs font-mono font-bold text-black">
                        Số: {dispatchNumber ? `${dispatchNumber}/KT` : '       /KT'}
                      </div>
                    </td>
                    <td className="w-[55%] text-center align-top border-none p-0">
                      <div className="text-xs uppercase font-bold text-black">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                      <div className="text-xs font-bold text-black">Độc lập - Tự do - Hạnh phúc</div>
                      <div className="w-28 h-[1.5px] bg-black mx-auto my-1"></div>
                      <div className="text-[11px] text-black italic">
                        Lãnh Ngọc, ngày {currentDay} tháng {currentMonth} năm {currentYear}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="my-5 text-center font-bold text-sm text-black uppercase">
                PHIẾU YÊU CẦU BỔ SUNG, HOÀN THIỆN HỒ SƠ
              </div>

              <div className="my-3 text-center font-bold text-xs text-black">
                Kính gửi: Trung tâm Phục vụ hành chính công xã Lãnh Ngọc.
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-black text-justify leading-relaxed">
                <p>
                  Phòng Kinh tế xã Lãnh Ngọc tiếp nhận hồ sơ của hộ <b>{dossier.owner}</b>, số biên nhận <b>{dossier.code}</b>, ngày tiếp nhận <b>{formatDate(dossier.receivedDate)}</b>, về việc <b>{dossier.procedure}</b> (Thửa đất số <b>{dossier.parcel}</b>, Tờ bản đồ số <b>{dossier.mapSheet}</b>{dossier.address ? `, địa chỉ: ${dossier.address}` : ''}).
                </p>
                <p>
                  Qua kiểm tra thành phần hồ sơ, nhận thấy hồ sơ chưa bảo đảm tính thống nhất và đầy đủ để tiếp tục xem xét, giải quyết, cụ thể:
                </p>

                <div className="p-3 bg-amber-50/50 border border-amber-300 rounded-lg space-y-1.5 text-black">
                  <div className="flex items-center justify-between text-[11px] font-bold text-black pb-1 border-b border-amber-300">
                    <span>Nội dung yêu cầu bổ sung, chỉnh sửa:</span>
                    <span className="text-[10px] text-slate-600 font-normal italic no-print">(Có thể chỉnh sửa trực tiếp)</span>
                  </div>
                  <textarea
                    rows={6}
                    value={supplementReason}
                    onChange={(e) => setSupplementReason(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2 bg-white border border-amber-300 rounded outline-none leading-relaxed text-black"
                    placeholder="Nhập các nội dung cần bổ sung..."
                  />
                </div>

                <p>
                  Vì vậy, Phòng Kinh tế đề nghị Trung tâm Phục vụ hành chính công xã Lãnh Ngọc hướng dẫn công dân kiểm tra, chỉnh sửa và hoàn thiện các nội dung nêu trên trước khi nộp lại hồ sơ để được xem xét, giải quyết theo quy định.
                </p>
                <p>
                  Phòng Kinh tế xã Lãnh Ngọc đề nghị Trung tâm Phục vụ hành chính công xã Lãnh Ngọc phối hợp thực hiện./.
                </p>
              </div>

              {/* SIGNATURE & NƠI NHẬN TABLE THEO NGHỊ ĐỊNH 30 */}
              <table className="sig-table w-full border-collapse border-none mt-8">
                <tbody>
                  <tr>
                    <td className="w-1/2 align-top border-none p-0 text-left text-xs text-black space-y-1">
                      <p className="font-bold text-black">Nơi nhận:</p>
                      <p>- Như trên;</p>
                      <p>- Lưu: VT, PKT.</p>
                    </td>
                    <td className="w-1/2 align-top border-none p-0 text-center">
                      <div className="font-bold text-xs uppercase text-black whitespace-pre-line">
                        {signerTitle}
                      </div>
                      <div className="h-20 flex items-center justify-center">
                        <span className="text-[10px] italic text-slate-400 no-print">(Ký, ghi rõ họ tên)</span>
                      </div>
                      <div className="font-bold text-xs text-black uppercase">
                        {signerName}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: PHIẾU TRẢ HỒ SƠ (MẪU 03) */}
          {slipType === 'return' && (
            <div
              ref={printContentRef}
              style={{ fontFamily: "'Times New Roman', 'Tinos', Times, serif" }}
              className="admin-doc w-full max-w-[210mm] min-h-[260mm] bg-white text-black p-8 sm:p-12 shadow-xl border border-gray-300 leading-relaxed text-sm relative"
            >
              {/* HEADER TABLE THEO NGHỊ ĐỊNH 30 */}
              <table className="header-table w-full border-collapse border-none mb-3">
                <tbody>
                  <tr>
                    <td className="w-[45%] text-center align-top border-none p-0">
                      <div className="text-xs uppercase text-black">UBND XÃ LÃNH NGỌC</div>
                      <div className="text-xs uppercase font-bold text-black">PHÒNG KINH TẾ</div>
                      <div className="w-24 h-[1.5px] bg-black mx-auto my-1"></div>
                      <div className="text-xs font-mono font-bold text-black">
                        Số: {dispatchNumber ? `${dispatchNumber}/KT` : '       /KT'}
                      </div>
                    </td>
                    <td className="w-[55%] text-center align-top border-none p-0">
                      <div className="text-xs uppercase font-bold text-black">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                      <div className="text-xs font-bold text-black">Độc lập - Tự do - Hạnh phúc</div>
                      <div className="w-28 h-[1.5px] bg-black mx-auto my-1"></div>
                      <div className="text-[11px] text-black italic">
                        Lãnh Ngọc, ngày {currentDay} tháng {currentMonth} năm {currentYear}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="my-5 text-center font-bold text-sm text-black uppercase">
                PHIẾU TỪ CHỐI TIẾP NHẬN / TRẢ LẠI HỒ SƠ
              </div>

              <div className="my-3 text-center font-bold text-xs text-black">
                Kính gửi: Trung tâm Phục vụ hành chính công xã Lãnh Ngọc.
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-black text-justify leading-relaxed">
                <p>
                  Phòng Kinh tế xã Lãnh Ngọc tiếp nhận hồ sơ của hộ <b>{dossier.owner}</b>, số biên nhận <b>{dossier.code}</b>, ngày tiếp nhận <b>{formatDate(dossier.receivedDate)}</b>, về việc <b>{dossier.procedure}</b> (Thửa đất số <b>{dossier.parcel}</b>, Tờ bản đồ số <b>{dossier.mapSheet}</b>{dossier.address ? `, địa chỉ: ${dossier.address}` : ''}).
                </p>
                <p>
                  Qua kiểm tra và thẩm định hồ sơ, Phòng Kinh tế nhận thấy hồ sơ chưa đủ điều kiện giải quyết theo quy định của pháp luật, cụ thể lý do như sau:
                </p>

                <div className="p-3 bg-rose-50/50 border border-rose-300 rounded-lg space-y-1.5 text-black">
                  <div className="flex items-center justify-between text-[11px] font-bold text-black pb-1 border-b border-rose-300">
                    <span>Lý do trả lại hồ sơ:</span>
                    <span className="text-[10px] text-slate-600 font-normal italic no-print">(Có thể chỉnh sửa trực tiếp)</span>
                  </div>
                  <textarea
                    rows={5}
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2 bg-white border border-rose-300 rounded outline-none leading-relaxed text-black"
                    placeholder="Nhập lý do trả lại hồ sơ..."
                  />
                </div>

                <p>
                  Vì vậy, Phòng Kinh tế kính chuyển trả lại hồ sơ nêu trên đến Trung tâm Phục vụ hành chính công xã Lãnh Ngọc để thông báo và trả lại kết quả cho công dân theo quy định.
                </p>
                <p>
                  Phòng Kinh tế xã Lãnh Ngọc kính đề nghị Trung tâm Phục vụ hành chính công xã Lãnh Ngọc phối hợp thực hiện./.
                </p>
              </div>

              {/* SIGNATURE & NƠI NHẬN TABLE THEO NGHỊ ĐỊNH 30 */}
              <table className="sig-table w-full border-collapse border-none mt-8">
                <tbody>
                  <tr>
                    <td className="w-1/2 align-top border-none p-0 text-left text-xs text-black space-y-1">
                      <p className="font-bold text-black">Nơi nhận:</p>
                      <p>- Như trên;</p>
                      <p>- Lưu: VT, PKT.</p>
                    </td>
                    <td className="w-1/2 align-top border-none p-0 text-center">
                      <div className="font-bold text-xs uppercase text-black whitespace-pre-line">
                        {signerTitle}
                      </div>
                      <div className="h-20 flex items-center justify-center">
                        <span className="text-[10px] italic text-slate-400 no-print">(Ký, ghi rõ họ tên)</span>
                      </div>
                      <div className="font-bold text-xs text-black uppercase">
                        {signerName}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: BIÊN BẢN KIỂM TRA THỰC ĐỊA THỬA ĐẤT (BƯỚC 1 - MẪU CHUẨN CHÍNH THỨC 2026 TỪ FILE WORD) */}
          {slipType === 'site_inspection' && (
            <div
              ref={printContentRef}
              style={{ fontFamily: "'Times New Roman', 'Tinos', Times, serif" }}
              className="admin-doc w-full min-w-[210mm] max-w-[210mm] min-h-[297mm] bg-white text-black p-8 sm:p-12 shadow-xl border border-gray-300 leading-relaxed text-xs sm:text-sm relative"
            >
              {/* Header Quốc hiệu - Tiêu ngữ */}
              <div className="text-center mb-3">
                <div className="text-xs uppercase font-bold text-black tracking-wide">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </div>
                <div className="text-xs font-bold text-black mt-0.5">
                  Độc lập – Tự do – Hạnh phúc
                </div>
                <div className="w-28 h-[1.5px] bg-black mx-auto my-1.5"></div>
              </div>

              {/* Tên biên bản chính thức verbatim */}
              <div className="my-4 text-center">
                <h1 className="text-sm sm:text-base font-bold uppercase text-black tracking-tight leading-tight">
                  BIÊN BẢN
                </h1>
                <p className="text-xs sm:text-sm font-bold text-black mt-1 leading-snug">
                  Về việc kiểm tra thực địa thửa đất đề nghị đăng ký đất đai, tài sản gắn liền<br />
                  với đất, cấp giấy chứng nhận QSD đất lần đầu của hộ gia đình, cá nhân
                </p>
              </div>

              {/* Các căn cứ pháp lý verbatim chuẩn 100% từ file Word mẫu */}
              <div className="space-y-1.5 text-black text-justify leading-relaxed text-xs">
                <p>
                  Căn cứ Luật Đất đai ngày 18/01/2024; Luật sửa đổi, bổ sung một số điều của Luật Đất đai số 31/2024/QH15, Luật Nhà ở số 27/2023/QH15, Luật Kinh doanh bất động sản số 29/2023/QH15 và Luật Các tổ chức tín dụng số 32/2024/QH15 ngày 29 tháng 6 năm 2024;
                </p>
                <p>
                  Căn cứ Nghị định số: 102/2024/NĐ-CP ngày 30 tháng 7 năm 2024 của Chính phủ về quy định chi tiết thi hành một số điều của luật đất đai;
                </p>
                <p>
                  Căn cứ Nghị định số: 101/2024/NĐ-CP ngày 29 tháng 7 năm 2024 của Chính phủ quy định về điều tra cơ bản đất đai; đăng ký, cấp giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất và hệ thống thông tin đất đai;
                </p>
                <p>
                  Căn cứ Nghị định số 151/2025/NĐ-CP ngày 12 tháng 6 năm 2025 của Chính phủ Quy định về phân định thẩm quyền của chính quyền địa phương 02 cấp, phân phân quyền, phân cấp trong lĩnh vực đất đai; Quyết định số 2418/QĐ-BNNMT ngày 28 tháng 6 năm 2025 của Bộ trưởng Bộ Nông nghiệp và Môi trường về việc đính chính Nghị định số 151/2025/NĐ-CP ngày 12 tháng 6 năm 2025 của Chính phủ Quy định về phân định thẩm quyền của chính quyền địa phương 02 cấp, phân quyền, phân cấp trong lĩnh vực đất đai;
                </p>
                <p>
                  Căn cứ Quyết định số 2267/QĐ-UBND ngày 26/6/2025 của UBND thành phố Đà Nẵng về việc công bố Danh mục thủ tục hành chính trong lĩnh vực đất đai thuộc thẩm quyền giải quyết của Sở Nông nghiệp và Môi trường; UBND cấp xã trên địa bàn thành phố Đà Nẵng;
                </p>
                <p>
                  Căn cứ các hồ sơ, tài liệu và quy định pháp luật khác có liên quan.
                </p>
              </div>

              {/* Thời gian và Địa điểm */}
              <div className="mt-3 text-black text-justify leading-relaxed text-xs space-y-1">
                <p>
                  Hôm nay, vào lúc <input type="text" value={inspectionTime} onChange={(e) => setInspectionTime(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-28 inline-block bg-transparent outline-none text-center" /> ngày <input type="text" value={inspectionDay} onChange={(e) => setInspectionDay(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-10 inline-block bg-transparent outline-none text-center" /> tháng <input type="text" value={inspectionMonth} onChange={(e) => setInspectionMonth(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-10 inline-block bg-transparent outline-none text-center" /> năm <input type="text" value={inspectionYear} onChange={(e) => setInspectionYear(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-16 inline-block bg-transparent outline-none text-center" />
                </p>
                <p>
                  Tại: Thửa đất số <input type="text" value={dossier.parcel} readOnly className="font-bold border-b border-dotted border-black px-1 w-20 inline-block bg-transparent outline-none text-center" />, tờ bản đồ số: <input type="text" value={dossier.mapSheet} readOnly className="font-bold border-b border-dotted border-black px-1 w-16 inline-block bg-transparent outline-none text-center" />, thôn <input type="text" value={villageName} onChange={(e) => setVillageName(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-32 inline-block bg-transparent outline-none text-center" />, xã Lãnh Ngọc, thành phố Đà Nẵng.
                </p>
                <p className="font-bold mt-2">Chúng tôi gồm:</p>
              </div>

              {/* 3 Thành phần tham gia đúng 100% mẫu Word */}
              <div className="mt-2 text-black text-xs space-y-1.5">
                <p className="font-bold">1/ Đại diện phòng Kinh tế xã Lãnh Ngọc:</p>
                <div className="pl-3 space-y-1">
                  <p>
                    - Ông (Bà): <input type="text" value={officer1Name} onChange={(e) => setOfficer1Name(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-52 inline-block bg-transparent outline-none" /> Chức vụ: <input type="text" value={officer1Role} onChange={(e) => setOfficer1Role(e.target.value)} className="border-b border-dotted border-black px-1 w-36 inline-block bg-transparent outline-none" />
                  </p>
                  <p>
                    - Ông (Bà): <input type="text" value={officer2Name} onChange={(e) => setOfficer2Name(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-52 inline-block bg-transparent outline-none" /> Chức vụ: <input type="text" value={officer2Role} onChange={(e) => setOfficer2Role(e.target.value)} className="border-b border-dotted border-black px-1 w-36 inline-block bg-transparent outline-none" />
                  </p>
                </div>

                <p className="font-bold mt-1.5">2. Đại diện Ban nhân dân thôn <input type="text" value={villageName} onChange={(e) => setVillageName(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-36 inline-block bg-transparent outline-none" />:</p>
                <div className="pl-3 space-y-1">
                  <p>
                    - Ông (bà): <input type="text" value={villageRepName} onChange={(e) => setVillageRepName(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-52 inline-block bg-transparent outline-none" /> Chức vụ: <input type="text" value={villageRepRole} onChange={(e) => setVillageRepRole(e.target.value)} className="border-b border-dotted border-black px-1 w-36 inline-block bg-transparent outline-none" />
                  </p>
                </div>

                <p className="font-bold mt-1.5">3. Đại diện người sử dụng đất/người kê khai:</p>
                <div className="pl-3 space-y-1">
                  <p>
                    Ông (bà) <input type="text" value={citizen1Name || dossier.owner} onChange={(e) => setCitizen1Name(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-64 inline-block bg-transparent outline-none" />, thường trú tại thôn <input type="text" value={villageName} onChange={(e) => setVillageName(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-32 inline-block bg-transparent outline-none text-center" /> xã Lãnh Ngọc, thành phố Đà Nẵng là người sử dụng đất/người kê khai.
                  </p>
                  {citizen2Name && (
                    <p>
                      Đồng sở hữu/vợ (chồng): <input type="text" value={citizen2Name} onChange={(e) => setCitizen2Name(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-64 inline-block bg-transparent outline-none" />
                    </p>
                  )}
                </div>
              </div>

              {/* Nội dung kiểm tra chi tiết đúng 100% mẫu Word */}
              <div className="mt-3 text-black text-xs space-y-2 leading-relaxed text-justify">
                <p>
                  <b>Nội dung:</b> Phòng Kinh tế xã Lãnh Ngọc nhận được hồ sơ đăng ký đất đai, tài sản gắn liền với đất ngày <input type="text" value={dossierReceivedDateStr} onChange={(e) => setDossierReceivedDateStr(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-24 inline-block bg-transparent outline-none text-center" /> của ông (bà) <b>{citizen1Name || dossier.owner}</b> thường trú tại xã Lãnh Ngọc (thôn {villageName}), thành phố Đà Nẵng.
                </p>
                <p>
                  Để có cơ sở tham mưu UBND xã Lãnh Ngọc xem xét giải quyết theo quy định của pháp luật. Phòng Kinh tế tiến hành kiểm tra thực địa vị trí, diện tích đất theo hồ sơ đăng ký đất đai, tài sản gắn liền với đất của hộ gia đình, cá nhân, cụ thể như sau:
                </p>

                {/* 1. Thông tin, vị trí thửa đất */}
                <div className="space-y-1 pl-2">
                  <p className="font-bold">1. Thông tin, vị trí thửa đất:</p>
                  <p>
                    - Sơ đồ thửa đất: Thửa đất được xác định theo <input type="text" value={soDoThuaDat} onChange={(e) => setSoDoThuaDat(e.target.value)} className="border-b border-dotted border-black px-1 w-[70%] inline-block bg-transparent outline-none font-medium" />
                  </p>
                  <p>
                    - Thửa đất số: <b>{dossier.parcel}</b> tờ bản đồ số: <b>{dossier.mapSheet}</b>, xã Lãnh Ngọc
                  </p>
                  <p>
                    - Diện tích: <input type="text" value={totalLandArea} onChange={(e) => setTotalLandArea(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-20 inline-block bg-transparent outline-none text-right" /> m2, trong đó: Đất ở: <input type="text" value={residentialArea} onChange={(e) => setResidentialArea(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-20 inline-block bg-transparent outline-none text-right" /> m2, đất nông nghiệp (trồng cây lâu năm): <input type="text" value={agricultureArea} onChange={(e) => setAgricultureArea(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-20 inline-block bg-transparent outline-none text-right" /> m2.
                  </p>
                  <p>- Vị trí thửa đất theo bảng giá đất:</p>
                  <div className="pl-4 space-y-0.5">
                    <p>
                      + Đất ở: <input type="text" value={landPriceLocationResidential} onChange={(e) => setLandPriceLocationResidential(e.target.value)} className="border-b border-dotted border-black px-1 w-[80%] inline-block bg-transparent outline-none" />
                    </p>
                    <p>
                      + Đất nông nghiệp: <input type="text" value={landPriceLocationAgri} onChange={(e) => setLandPriceLocationAgri(e.target.value)} className="border-b border-dotted border-black px-1 w-[75%] inline-block bg-transparent outline-none" />
                    </p>
                    <p>
                      + Chiều sâu của thửa đất (nếu có): <input type="text" value={landDepth} onChange={(e) => setLandDepth(e.target.value)} className="border-b border-dotted border-black px-1 w-16 inline-block bg-transparent outline-none text-center" /> m.
                    </p>
                    <p>
                      + Chiều rộng của ngõ/hẻm (nếu có): <input type="text" value={alleyWidth} onChange={(e) => setAlleyWidth(e.target.value)} className="border-b border-dotted border-black px-1 w-16 inline-block bg-transparent outline-none text-center" /> m.
                    </p>
                  </div>

                  <p>
                    - Diện tích đất phải thực hiện nghĩa vụ tài chính: <input type="text" value={taxObligationArea} onChange={(e) => setTaxObligationArea(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-20 inline-block bg-transparent outline-none text-right" /> m2, trong đó:
                  </p>
                  <div className="pl-4 space-y-0.5">
                    <p>
                      + Đất nông nghiệp: <input type="text" value={agricultureTaxArea} onChange={(e) => setAgricultureTaxArea(e.target.value)} className="border-b border-dotted border-black px-1 w-20 inline-block bg-transparent outline-none text-right" /> m2
                    </p>
                    <p>
                      + Đất ở: <input type="text" value={residentialArea} onChange={(e) => setResidentialArea(e.target.value)} className="border-b border-dotted border-black px-1 w-20 inline-block bg-transparent outline-none text-right" /> m2 (diện tích đất trong hạn mức: <input type="text" value={residentialAreaInQuota} onChange={(e) => setResidentialAreaInQuota(e.target.value)} className="border-b border-dotted border-black px-1 w-20 inline-block bg-transparent outline-none text-right" /> m2, ngoài hạn mức: <input type="text" value={residentialAreaOutOfQuota} onChange={(e) => setResidentialAreaOutOfQuota(e.target.value)} className="border-b border-dotted border-black px-1 w-16 inline-block bg-transparent outline-none text-center" /> m2)
                    </p>
                  </div>
                  <p>
                    - Đối tượng miễn/giảm tiền sử dụng đất: <input type="text" value={taxExemptionDetails} onChange={(e) => setTaxExemptionDetails(e.target.value)} className="border-b border-dotted border-black px-1 w-[70%] inline-block bg-transparent outline-none" />
                  </p>
                </div>

                {/* 2 -> 7 các mục theo mẫu Word */}
                <div className="space-y-1.5 pl-2">
                  <p>
                    <b>2. Hiện trạng sử dụng đất:</b> <input type="text" value={currentStatus} onChange={(e) => setCurrentStatus(e.target.value)} className="border-b border-dotted border-black px-1 w-[80%] inline-block bg-transparent outline-none" />
                  </p>
                  <p>
                    <b>3. Nguồn gốc sử dụng đất:</b> <input type="text" value={dossier.workflowData?.landOrigin || `Thửa đất do hộ ông/bà tự khai hoang canh tác, quản lý sử dụng ổn định từ năm ${usageTime} đến nay không tranh chấp với các hộ liền kề.`} onChange={(e) => {}} className="border-b border-dotted border-black px-1 w-[78%] inline-block bg-transparent outline-none" />
                  </p>
                  <p>
                    <b>4. Thời điểm sử dụng:</b> Từ năm <input type="text" value={usageTime} onChange={(e) => setUsageTime(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-20 inline-block bg-transparent outline-none text-center" /> đến nay.
                  </p>
                  <p>
                    <b>5. Tình trạng tranh chấp:</b> <input type="text" value={disputeStatus} onChange={(e) => setDisputeStatus(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-[80%] inline-block bg-transparent outline-none" />
                  </p>
                  <p>
                    <b>6. Về sự phù hợp với quy hoạch:</b> <input type="text" value={planningSuitability} onChange={(e) => setPlanningSuitability(e.target.value)} className="border-b border-dotted border-black px-1 w-[75%] inline-block bg-transparent outline-none" />
                  </p>
                  <p>
                    <b>7. Về vi phạm pháp luật đất đai:</b> <input type="text" value={landLawViolation} onChange={(e) => setLandLawViolation(e.target.value)} className="border-b border-dotted border-black px-1 w-[73%] inline-block bg-transparent outline-none" />
                  </p>
                  <p>
                    <b>Sau khi kiểm tra thực địa và các quy định có liên quan, các bên có ý kiến như sau:</b>
                  </p>
                  <textarea rows={2} value={inspectionFeedback} onChange={(e) => setInspectionFeedback(e.target.value)} className="w-full text-xs p-1.5 bg-white border border-dashed border-gray-400 rounded outline-none leading-relaxed text-black" />
                </div>
              </div>

              {/* Kết thúc biên bản */}
              <div className="mt-3 text-black text-xs leading-relaxed text-justify">
                <p>
                  Biên bản kết thúc vào lúc <input type="text" value={inspectionEndTime} onChange={(e) => setInspectionEndTime(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-28 inline-block bg-transparent outline-none text-center" /> cùng ngày, mọi người có mặt thống nhất về nội dung biên bản và ký tên./.
                </p>
              </div>

              {/* 3 Khối chữ ký đúng chuẩn mẫu file Word */}
              <div className="mt-6 text-center">
                <table className="sig-table w-full border-collapse border-none text-center text-xs">
                  <tbody>
                    <tr>
                      <td className="w-1/3 align-top border-none p-0 text-center">
                        <div className="font-bold uppercase text-black">ĐẠI DIỆN PHÒNG KINH TẾ</div>
                        <div className="text-[10px] italic text-slate-500">(Ký, ghi rõ họ tên)</div>
                        <div className="h-16"></div>
                        <div className="font-bold text-black uppercase">{officer1Name}</div>
                        <div className="text-[11px] text-black">{officer2Name ? `và ${officer2Name}` : ''}</div>
                      </td>
                      <td className="w-1/3 align-top border-none p-0 text-center">
                        <div className="font-bold uppercase text-black">ĐẠI DIỆN BND THÔN</div>
                        <div className="text-[10px] italic text-slate-500">(Ký, ghi rõ họ tên)</div>
                        <div className="h-16"></div>
                        <div className="font-bold text-black uppercase">{villageRepName}</div>
                        <div className="text-[11px] text-black">{villageRepRole}</div>
                      </td>
                      <td className="w-1/3 align-top border-none p-0 text-center">
                        <div className="font-bold uppercase text-black">CHỦ SỬ DỤNG ĐẤT</div>
                        <div className="text-[10px] italic text-slate-500">(Ký, ghi rõ họ tên)</div>
                        <div className="h-16"></div>
                        <div className="font-bold text-black uppercase">{citizen1Name || dossier.owner}</div>
                        <div className="text-[11px] text-black">{citizen2Name ? `và ${citizen2Name}` : ''}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB MỚI: BIÊN BẢN XÁC MINH NGUỒN GỐC ĐẤT VÀ TẠO LẬP TÀI SẢN (3 HỘ DÂN LIỀN KỀ THEO FILE WORD MẪU) */}
          {slipType === 'origin_verification' && (
            <div
              ref={printContentRef}
              style={{ fontFamily: "'Times New Roman', 'Tinos', Times, serif" }}
              className="admin-doc w-full min-w-[210mm] max-w-[210mm] min-h-[297mm] bg-white text-black p-8 sm:p-12 shadow-xl border border-gray-300 leading-relaxed text-xs sm:text-sm relative"
            >
              {/* Header Quốc hiệu - Tiêu ngữ */}
              <div className="text-center mb-3">
                <div className="text-xs uppercase font-bold text-black tracking-wide">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </div>
                <div className="text-xs font-bold text-black mt-0.5">
                  Độc lập – Tự do – Hạnh phúc
                </div>
                <div className="w-28 h-[1.5px] bg-black mx-auto my-1.5"></div>
              </div>

              {/* Tên biên bản */}
              <div className="my-4 text-center">
                <h1 className="text-sm sm:text-base font-bold uppercase text-black tracking-tight leading-tight">
                  BIÊN BẢN
                </h1>
                <p className="text-xs sm:text-sm font-bold text-black mt-1 leading-snug">
                  Xác minh nguồn gốc sử dụng đất và thời điểm tạo lập tài sản trên đất<br />
                  đối với thửa đất được đề nghị cấp giấy chứng nhận quyền sử dụng đất
                </p>
              </div>

              {/* Thời gian và địa điểm */}
              <div className="mt-3 text-black text-justify leading-relaxed text-xs space-y-1">
                <p>
                  Hôm nay đúng vào lúc <input type="text" value={inspectionTime} onChange={(e) => setInspectionTime(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-28 inline-block bg-transparent outline-none text-center" /> ngày <input type="text" value={inspectionDay} onChange={(e) => setInspectionDay(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-10 inline-block bg-transparent outline-none text-center" /> tháng <input type="text" value={inspectionMonth} onChange={(e) => setInspectionMonth(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-10 inline-block bg-transparent outline-none text-center" /> năm <input type="text" value={inspectionYear} onChange={(e) => setInspectionYear(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-16 inline-block bg-transparent outline-none text-center" />.
                </p>
                <p>
                  Tại: Thôn <input type="text" value={villageName} onChange={(e) => setVillageName(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-32 inline-block bg-transparent outline-none text-center" /> xã Lãnh Ngọc, thành phố Đà Nẵng.
                </p>
              </div>

              {/* Thành phần gồm có */}
              <div className="mt-2 text-black text-xs space-y-1.5">
                <p className="font-bold">1/ Đại diện phòng Kinh tế xã Lãnh Ngọc:</p>
                <div className="pl-3 space-y-1">
                  <p>
                    - Ông (Bà): <input type="text" value={officer1Name} onChange={(e) => setOfficer1Name(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-52 inline-block bg-transparent outline-none" /> Chức vụ: <input type="text" value={officer1Role} onChange={(e) => setOfficer1Role(e.target.value)} className="border-b border-dotted border-black px-1 w-36 inline-block bg-transparent outline-none" />
                  </p>
                  <p>
                    - Ông (Bà): <input type="text" value={officer2Name} onChange={(e) => setOfficer2Name(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-52 inline-block bg-transparent outline-none" /> Chức vụ: <input type="text" value={officer2Role} onChange={(e) => setOfficer2Role(e.target.value)} className="border-b border-dotted border-black px-1 w-36 inline-block bg-transparent outline-none" />
                  </p>
                </div>

                <p className="font-bold mt-1.5">2. Đại diện Ban nhân dân thôn {villageName}:</p>
                <div className="pl-3 space-y-1">
                  <p>
                    - Ông (bà): <input type="text" value={villageRepName} onChange={(e) => setVillageRepName(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-52 inline-block bg-transparent outline-none" /> Chức vụ: <input type="text" value={villageRepRole} onChange={(e) => setVillageRepRole(e.target.value)} className="border-b border-dotted border-black px-1 w-36 inline-block bg-transparent outline-none" />
                  </p>
                </div>

                <p className="font-bold mt-1.5">3. Đại diện các hộ dân được lấy ý kiến về nguồn gốc đất:</p>
                <div className="pl-3 space-y-1">
                  <p>
                    - Ông (bà) <input type="text" value={witness1Name} onChange={(e) => setWitness1Name(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-48 inline-block bg-transparent outline-none" />, thường trú tại thôn <input type="text" value={witness1Address} onChange={(e) => setWitness1Address(e.target.value)} className="border-b border-dotted border-black px-1 w-64 inline-block bg-transparent outline-none" />
                  </p>
                  <p>
                    - Ông (bà) <input type="text" value={witness2Name} onChange={(e) => setWitness2Name(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-48 inline-block bg-transparent outline-none" />, thường trú tại thôn <input type="text" value={witness2Address} onChange={(e) => setWitness2Address(e.target.value)} className="border-b border-dotted border-black px-1 w-64 inline-block bg-transparent outline-none" />
                  </p>
                  <p>
                    - Ông (bà) <input type="text" value={witness3Name} onChange={(e) => setWitness3Name(e.target.value)} className="font-bold border-b border-dotted border-black px-1 w-48 inline-block bg-transparent outline-none" />, thường trú tại thôn <input type="text" value={witness3Address} onChange={(e) => setWitness3Address(e.target.value)} className="border-b border-dotted border-black px-1 w-64 inline-block bg-transparent outline-none" />
                  </p>
                </div>
              </div>

              {/* Mục đích xác minh */}
              <div className="mt-3 text-black text-xs leading-relaxed text-justify space-y-2">
                <p>
                  Chúng tôi tiến hành xác minh nguồn gốc sử dụng đất và thời điểm tạo lập tài sản trên đất của gia đình ông (bà) <b>{citizen1Name || dossier.owner}</b>, thường trú tại thôn {villageName} xã Lãnh Ngọc, thành phố Đà Nẵng. Gia đình ông (bà) <b>{citizen1Name || dossier.owner}</b> hiện là người đang sử dụng thửa đất số <b>{dossier.parcel}</b>, tờ bản đồ số <b>{dossier.mapSheet}</b>, diện tích <b>{totalLandArea} m2</b>.
                </p>

                <p className="font-bold uppercase text-[11px] pt-1">NỘI DUNG XÁC MINH:</p>
                <div className="pl-3 space-y-1.5">
                  <p>
                    <b>1. Nguồn gốc và thời điểm sử dụng đất:</b> Thửa đất do hộ ông/bà tự khai hoang canh tác, sử dụng ổn định từ năm <b>{usageTime}</b> đến nay, ranh giới mốc giới rõ ràng và quản lý liên tục.
                  </p>
                  <p>
                    <b>2. Thời điểm bắt đầu sử dụng vào mục đích đăng ký, đề nghị cấp GCN:</b> Sử dụng làm đất ở và đất trồng cây lâu năm từ trước ngày 15/10/1993 (năm <b>{usageTime}</b>).
                  </p>
                  <p>
                    <b>3. Tình trạng tranh chấp:</b> {disputeStatus}. Quá trình sử dụng không xảy ra tranh chấp với các hộ sử dụng đất liền kề.
                  </p>
                  <p>
                    <b>4. Thống nhất kết luận:</b> Thống nhất xác nhận nguồn gốc sử dụng đất và tài sản trên đất của hộ gia đình ông/bà {citizen1Name || dossier.owner} đủ điều kiện lập hồ sơ cấp Giấy chứng nhận quyền sử dụng đất theo quy định pháp luật.
                  </p>
                </div>

                <p className="pt-1">
                  Vậy chúng tôi lập biên bản xác minh nguồn gốc sử dụng đất của ông (bà) <b>{citizen1Name || dossier.owner}</b> để làm cơ sở đề nghị Ủy ban nhân dân xã Lãnh Ngọc xem xét giải quyết và cấp giấy chứng nhận quyền sử dụng đất cho gia đình ông (bà) <b>{citizen1Name || dossier.owner}</b> theo hiện trạng đã được kiểm tra xác minh.
                </p>
                <p>
                  Biên bản lập xong đọc lại cho mọi người cùng nghe và thống nhất ký tên./.
                </p>
              </div>

              {/* 3 Khối chữ ký xác minh nguồn gốc */}
              <div className="mt-8 text-center">
                <table className="sig-table w-full border-collapse border-none text-center text-xs">
                  <tbody>
                    <tr>
                      <td className="w-1/3 align-top border-none p-0 text-center">
                        <div className="font-bold uppercase text-black">ĐẠI DIỆN BND THÔN</div>
                        <div className="text-[10px] italic text-slate-500">(Ký, ghi rõ họ tên)</div>
                        <div className="h-16"></div>
                        <div className="font-bold text-black uppercase">{villageRepName}</div>
                      </td>
                      <td className="w-1/3 align-top border-none p-0 text-center">
                        <div className="font-bold uppercase text-black">ĐẠI DIỆN PHÒNG KINH TẾ</div>
                        <div className="text-[10px] italic text-slate-500">(Ký, ghi rõ họ tên)</div>
                        <div className="h-16"></div>
                        <div className="font-bold text-black uppercase">{officer1Name}</div>
                      </td>
                      <td className="w-1/3 align-top border-none p-0 text-center">
                        <div className="font-bold uppercase text-black">ĐẠI DIỆN CÁC HỘ DÂN LẤY Ý KIẾN</div>
                        <div className="text-[10px] italic text-slate-500">(Ký, ghi rõ họ tên)</div>
                        <div className="h-14"></div>
                        <div className="text-[11px] font-bold text-black">{witness1Name} - {witness2Name}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB MỚI: PHIẾU THEO DÕI QUÁ TRÌNH GIAO NHẬN VÀ XỬ LÝ HỒ SƠ ĐỊA CHÍNH (THEO YÊU CẦU NGƯỜI DÙNG: BÀN GIAO 1 CỬA, CHUYÊN VIÊN NHẬN, TRÌNH KÝ, TRẢ KẾT QUẢ, CÓ CHỖ KÝ) */}
          {slipType === 'handover_tracking' && (
            <div
              ref={printContentRef}
              style={{ fontFamily: "'Times New Roman', 'Tinos', Times, serif" }}
              className="admin-doc w-full min-w-[210mm] max-w-[210mm] min-h-[297mm] bg-white text-black p-8 sm:p-12 shadow-xl border border-gray-300 leading-relaxed text-xs sm:text-sm relative"
            >
              {/* Header cơ quan theo Nghị định 30 */}
              <table className="header-table w-full border-collapse border-none mb-4" align="center" style={{ width: '100%', border: 'none', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td className="w-[45%] text-center align-top border-none p-0" align="center" style={{ width: '45%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="text-xs uppercase text-black" align="center" style={{ textAlign: 'center', margin: 0 }}>UBND XÃ LÃNH NGỌC</div>
                      <div className="text-xs uppercase font-bold text-black" align="center" style={{ textAlign: 'center', fontWeight: 'bold', margin: 0 }}>PHÒNG KINH TẾ</div>
                      <div className="w-24 h-[1.5px] bg-black mx-auto my-1"></div>
                    </td>
                    <td className="w-[55%] text-center align-top border-none p-0" align="center" style={{ width: '55%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="text-xs uppercase font-bold text-black" align="center" style={{ textAlign: 'center', fontWeight: 'bold', margin: 0 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                      <div className="text-xs font-bold text-black" align="center" style={{ textAlign: 'center', fontWeight: 'bold', margin: 0 }}>Độc lập - Tự do - Hạnh phúc</div>
                      <div className="w-28 h-[1.5px] bg-black mx-auto my-1"></div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Tiêu đề */}
              <div className="my-5 text-center">
                <h1 className="text-base sm:text-lg font-bold uppercase text-black tracking-tight" style={{ fontSize: '15pt', textAlign: 'center' }}>
                  PHIẾU THEO DÕI BÀN GIAO HỒ SƠ
                </h1>
                <p className="text-xs sm:text-sm font-bold text-black mt-1 italic" style={{ fontSize: '12pt', textAlign: 'center' }}>
                  Về việc cấp Giấy chứng nhận quyền sử dụng đất
                </p>
              </div>

              {/* 1. Thông tin hồ sơ */}
              <div className="mb-5 space-y-2.5 text-xs sm:text-[13pt] leading-relaxed">
                <div className="font-bold uppercase text-black mb-1.5 text-xs sm:text-[13pt]">1. Thông tin hồ sơ</div>

                <div className="flex items-baseline gap-1">
                  <span className="font-semibold whitespace-nowrap">Mã số hồ sơ:</span>
                  <input
                    type="text"
                    value={dossier.code}
                    readOnly
                    className="flex-1 font-mono font-bold bg-transparent border-b border-dotted border-gray-400 focus:outline-hidden px-1 text-xs sm:text-[13pt]"
                  />
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="font-semibold whitespace-nowrap">Người đề nghị cấp Giấy chứng nhận:</span>
                  <input
                    type="text"
                    value={handoverOwner}
                    onChange={(e) => setHandoverOwner(e.target.value)}
                    className="flex-1 font-bold bg-transparent border-b border-dotted border-gray-400 focus:outline-hidden px-1 text-xs sm:text-[13pt]"
                    placeholder="...................................................................................................."
                  />
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="font-semibold whitespace-nowrap">Địa chỉ:</span>
                  <input
                    type="text"
                    value={handoverAddress}
                    onChange={(e) => setHandoverAddress(e.target.value)}
                    className="flex-1 bg-transparent border-b border-dotted border-gray-400 focus:outline-hidden px-1 text-xs sm:text-[13pt]"
                    placeholder="...................................................................................................."
                  />
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="font-semibold whitespace-nowrap">Nội dung thủ tục:</span>
                  <input
                    type="text"
                    value={handoverProcedure}
                    onChange={(e) => setHandoverProcedure(e.target.value)}
                    className="flex-1 bg-transparent border-b border-dotted border-gray-400 focus:outline-hidden px-1 text-xs sm:text-[13pt]"
                    placeholder="...................................................................................................."
                  />
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="font-semibold whitespace-nowrap">Thành phần hồ sơ bàn giao:</span>
                  <input
                    type="text"
                    value={handoverComponents}
                    onChange={(e) => setHandoverComponents(e.target.value)}
                    className="flex-1 bg-transparent border-b border-dotted border-gray-400 focus:outline-hidden px-1 text-xs sm:text-[13pt]"
                    placeholder="...................................................................................................."
                  />
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="font-semibold whitespace-nowrap">Số lượng hồ sơ/tài liệu:</span>
                  <input
                    type="text"
                    value={handoverQuantity}
                    onChange={(e) => setHandoverQuantity(e.target.value)}
                    className="flex-1 bg-transparent border-b border-dotted border-gray-400 focus:outline-hidden px-1 text-xs sm:text-[13pt]"
                    placeholder="...................................................................................................."
                  />
                </div>
              </div>

              {/* 2. Theo dõi bàn giao, tiếp nhận và xử lý hồ sơ */}
              <div className="mb-5">
                <div className="font-bold uppercase text-black mb-2 text-xs sm:text-[13pt]">
                  2. Theo dõi bàn giao, tiếp nhận và xử lý hồ sơ
                </div>
                <table className="w-full border-collapse border border-black text-xs sm:text-[12pt] mb-4">
                  <thead>
                    <tr className="font-bold text-center bg-gray-50">
                      <th className="border border-black p-2 w-12 sm:w-16">Lần bàn giao</th>
                      <th className="border border-black p-2 min-w-[190px]">Nội dung bàn giao</th>
                      <th className="border border-black p-2 w-36 sm:w-44">
                        Bên giao<br />
                        <span className="font-normal italic text-[10pt] sm:text-[11pt]">(ký, ghi rõ họ tên)</span>
                      </th>
                      <th className="border border-black p-2 w-36 sm:w-44">
                        Bên nhận<br />
                        <span className="font-normal italic text-[10pt] sm:text-[11pt]">(ký, ghi rõ họ tên)</span>
                      </th>
                      <th className="border border-black p-2 w-28 sm:w-32">Ngày, tháng, năm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Dòng 1 */}
                    <tr>
                      <td className="border border-black p-2 text-center font-bold align-middle">1</td>
                      <td className="border border-black p-2 align-middle font-medium">
                        <input
                          type="text"
                          value={handover1Content}
                          onChange={(e) => setHandover1Content(e.target.value)}
                          className="w-full bg-transparent border-0 focus:outline-hidden font-medium text-xs sm:text-[12pt]"
                        />
                      </td>
                      <td className="border border-black p-2 text-center align-bottom h-24">
                        <div className="flex flex-col justify-end h-full min-h-[70px]">
                          <input
                            type="text"
                            value={handover1Giver}
                            onChange={(e) => setHandover1Giver(e.target.value)}
                            className="w-full text-center font-semibold bg-transparent border-0 border-b border-dotted border-gray-400 focus:outline-hidden text-xs sm:text-[11pt]"
                            placeholder="............................"
                          />
                        </div>
                      </td>
                      <td className="border border-black p-2 text-center align-bottom h-24">
                        <div className="flex flex-col justify-end h-full min-h-[70px]">
                          <input
                            type="text"
                            value={handover1Receiver}
                            onChange={(e) => setHandover1Receiver(e.target.value)}
                            className="w-full text-center font-semibold bg-transparent border-0 border-b border-dotted border-gray-400 focus:outline-hidden text-xs sm:text-[11pt]"
                            placeholder="............................"
                          />
                        </div>
                      </td>
                      <td className="border border-black p-2 text-center align-middle">
                        <input
                          type="text"
                          value={handover1Date}
                          onChange={(e) => setHandover1Date(e.target.value)}
                          className="w-full text-center bg-transparent border-0 border-b border-dotted border-gray-400 focus:outline-hidden text-xs sm:text-[11pt]"
                          placeholder=".../.../202..."
                        />
                      </td>
                    </tr>

                    {/* Dòng 2 */}
                    <tr>
                      <td className="border border-black p-2 text-center font-bold align-middle">2</td>
                      <td className="border border-black p-2 align-middle font-medium">
                        <input
                          type="text"
                          value={handover2Content}
                          onChange={(e) => setHandover2Content(e.target.value)}
                          className="w-full bg-transparent border-0 focus:outline-hidden font-medium text-xs sm:text-[12pt]"
                        />
                      </td>
                      <td className="border border-black p-2 text-center align-bottom h-24">
                        <div className="flex flex-col justify-end h-full min-h-[70px]">
                          <input
                            type="text"
                            value={handover2Giver}
                            onChange={(e) => setHandover2Giver(e.target.value)}
                            className="w-full text-center font-semibold bg-transparent border-0 border-b border-dotted border-gray-400 focus:outline-hidden text-xs sm:text-[11pt]"
                            placeholder="............................"
                          />
                        </div>
                      </td>
                      <td className="border border-black p-2 text-center align-bottom h-24">
                        <div className="flex flex-col justify-end h-full min-h-[70px]">
                          <input
                            type="text"
                            value={handover2Receiver}
                            onChange={(e) => setHandover2Receiver(e.target.value)}
                            className="w-full text-center font-semibold bg-transparent border-0 border-b border-dotted border-gray-400 focus:outline-hidden text-xs sm:text-[11pt]"
                            placeholder="............................"
                          />
                        </div>
                      </td>
                      <td className="border border-black p-2 text-center align-middle">
                        <input
                          type="text"
                          value={handover2Date}
                          onChange={(e) => setHandover2Date(e.target.value)}
                          className="w-full text-center bg-transparent border-0 border-b border-dotted border-gray-400 focus:outline-hidden text-xs sm:text-[11pt]"
                          placeholder=".../.../202..."
                        />
                      </td>
                    </tr>

                    {/* Dòng 3 */}
                    <tr>
                      <td className="border border-black p-2 text-center font-bold align-middle">3</td>
                      <td className="border border-black p-2 align-middle font-medium">
                        <input
                          type="text"
                          value={handover3Content}
                          onChange={(e) => setHandover3Content(e.target.value)}
                          className="w-full bg-transparent border-0 focus:outline-hidden font-medium text-xs sm:text-[12pt]"
                        />
                      </td>
                      <td className="border border-black p-2 text-center align-bottom h-24">
                        <div className="flex flex-col justify-end h-full min-h-[70px]">
                          <input
                            type="text"
                            value={handover3Giver}
                            onChange={(e) => setHandover3Giver(e.target.value)}
                            className="w-full text-center font-semibold bg-transparent border-0 border-b border-dotted border-gray-400 focus:outline-hidden text-xs sm:text-[11pt]"
                            placeholder="............................"
                          />
                        </div>
                      </td>
                      <td className="border border-black p-2 text-center align-bottom h-24">
                        <div className="flex flex-col justify-end h-full min-h-[70px]">
                          <input
                            type="text"
                            value={handover3Receiver}
                            onChange={(e) => setHandover3Receiver(e.target.value)}
                            className="w-full text-center font-semibold bg-transparent border-0 border-b border-dotted border-gray-400 focus:outline-hidden text-xs sm:text-[11pt]"
                            placeholder="............................"
                          />
                        </div>
                      </td>
                      <td className="border border-black p-2 text-center align-middle">
                        <input
                          type="text"
                          value={handover3Date}
                          onChange={(e) => setHandover3Date(e.target.value)}
                          className="w-full text-center bg-transparent border-0 border-b border-dotted border-gray-400 focus:outline-hidden text-xs sm:text-[11pt]"
                          placeholder=".../.../202..."
                        />
                      </td>
                    </tr>

                    {/* Dòng 4 */}
                    <tr>
                      <td className="border border-black p-2 text-center font-bold align-middle">4</td>
                      <td className="border border-black p-2 align-middle">
                        <div className="flex items-baseline gap-1">
                          <span className="font-medium whitespace-nowrap">Nội dung khác:</span>
                          <input
                            type="text"
                            value={handover4Content}
                            onChange={(e) => setHandover4Content(e.target.value)}
                            className="flex-1 bg-transparent border-b border-dotted border-gray-400 focus:outline-hidden px-1 text-xs sm:text-[11pt]"
                            placeholder="............................................................"
                          />
                        </div>
                      </td>
                      <td className="border border-black p-2 text-center align-bottom h-24">
                        <div className="flex flex-col justify-end h-full min-h-[70px]">
                          <input
                            type="text"
                            value={handover4Giver}
                            onChange={(e) => setHandover4Giver(e.target.value)}
                            className="w-full text-center font-semibold bg-transparent border-0 border-b border-dotted border-gray-400 focus:outline-hidden text-xs sm:text-[11pt]"
                            placeholder="............................"
                          />
                        </div>
                      </td>
                      <td className="border border-black p-2 text-center align-bottom h-24">
                        <div className="flex flex-col justify-end h-full min-h-[70px]">
                          <input
                            type="text"
                            value={handover4Receiver}
                            onChange={(e) => setHandover4Receiver(e.target.value)}
                            className="w-full text-center font-semibold bg-transparent border-0 border-b border-dotted border-gray-400 focus:outline-hidden text-xs sm:text-[11pt]"
                            placeholder="............................"
                          />
                        </div>
                      </td>
                      <td className="border border-black p-2 text-center align-middle">
                        <input
                          type="text"
                          value={handover4Date}
                          onChange={(e) => setHandover4Date(e.target.value)}
                          className="w-full text-center bg-transparent border-0 border-b border-dotted border-gray-400 focus:outline-hidden text-xs sm:text-[11pt]"
                          placeholder=".../.../202..."
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 3. Ghi chú */}
              <div className="mt-4 space-y-2">
                <div className="font-bold uppercase text-black text-xs sm:text-[13pt]">3. Ghi chú</div>
                <div className="pt-1 text-xs sm:text-[12pt]">
                  <textarea
                    rows={3}
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    className="w-full bg-transparent border-0 focus:outline-hidden text-xs sm:text-[12pt] leading-loose p-0 resize-y"
                    placeholder="....................................................................................................................................................&#10;....................................................................................................................................................&#10;...................................................................................................................................................."
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: THÔNG BÁO NIÊM YẾT CÔNG KHAI (BƯỚC 2) - Y HỆT MẪU NGƯỜI DÙNG CUNG CẤP */}
          {slipType === 'public_notice' && (
            <div
              ref={printContentRef}
              style={{ fontFamily: "'Times New Roman', 'Tinos', Times, serif" }}
              className="admin-doc w-full min-w-[210mm] max-w-[210mm] min-h-[297mm] bg-white text-black p-8 sm:p-12 shadow-xl border border-gray-300 leading-relaxed text-xs sm:text-sm relative"
            >
              {/* HEADER TABLE THEO NGHỊ ĐỊNH 30 */}
              <table className="header-table w-full border-collapse border-none mb-3" align="center" style={{ width: '100%', border: 'none', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td className="w-[45%] text-center align-top border-none p-0" align="center" style={{ width: '45%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="text-xs uppercase text-black" align="center" style={{ textAlign: 'center', margin: 0 }}>ỦY BAN NHÂN DÂN</div>
                      <div className="text-xs uppercase font-bold text-black" align="center" style={{ textAlign: 'center', fontWeight: 'bold', margin: 0 }}>XÃ LÃNH NGỌC</div>
                      <div className="w-24 h-[1.5px] bg-black mx-auto my-1"></div>
                      <div className="text-xs font-mono font-bold text-black" align="center" style={{ textAlign: 'center', marginTop: '4px' }}>
                        Số: {publicNoticeNumber || '       / TB-UBND'}
                      </div>
                    </td>
                    <td className="w-[55%] text-center align-top border-none p-0" align="center" style={{ width: '55%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="text-xs uppercase font-bold text-black" align="center" style={{ textAlign: 'center', fontWeight: 'bold', margin: 0 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                      <div className="text-xs font-bold text-black" align="center" style={{ textAlign: 'center', fontWeight: 'bold', margin: 0 }}>Độc lập - Tự do - Hạnh phúc</div>
                      <div className="w-28 h-[1.5px] bg-black mx-auto my-1"></div>
                      <div className="text-[11px] text-black italic" align="center" style={{ textAlign: 'center', fontStyle: 'italic', marginTop: '4px' }}>
                        Lãnh Ngọc, ngày {currentDay} tháng {currentMonth} năm {currentYear}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="my-5 text-center" align="center" style={{ textAlign: 'center', margin: '20px 0' }}>
                <h1 className="text-base sm:text-lg font-bold uppercase text-black tracking-tight" align="center" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15pt', textTransform: 'uppercase', margin: 0 }}>
                  THÔNG BÁO
                </h1>
                <p className="text-xs sm:text-sm font-bold text-black mt-1" align="center" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12pt', marginTop: '6px' }}>
                  Về việc niêm yết công khai kết quả kiểm tra hồ sơ đăng ký, cấp Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất
                </p>
              </div>

              {/* Exact legal citations verbatim from user prompt */}
              <div className="space-y-2 text-black text-justify leading-relaxed text-xs">
                <p>Căn cứ Luật Tổ chức chính quyền địa phương số 72/2025/QH15 ngày 16 tháng 6 năm 2025;</p>
                <p>Căn cứ Luật Đất đai số 31/2024/QH15 ngày 18 tháng 01 năm 2024 và Luật số 43/2024/QH15 ngày 29 tháng 6 năm 2024 sửa đổi, bổ sung một số điều của Luật Đất đai số 31/2024/QH15;</p>
                <p>Căn cứ định số 101/2024/NĐ-CP ngày 29/7/2024 của Chính phủ về điều tra cơ bản đất đai, đăng ký, cấp giấy chứng nhận quyền sử dụng đất, quyền sở hữ tài sản gắn liền với đất và Hệ thống thông tin đất đai;</p>
                <p>Căn cứ Nghị định số 102/2024/NĐ-CP ngày 30 tháng 7 năm 2024 của Chính phủ quy định chi tiết thi hành một số điều của Luật Đất đai, được sửa đổi, bổ sung theo quy định hiện hành;</p>
                <p>Căn cứ Nghị định số 151/2025/NĐ-CP ngày 12 tháng 6 năm 2025 của Chính phủ Quy định về phân định thẩm quyền của chính quyền địa phương 02 cấp, phân phân quyền, phân cấp trong lĩnh vực đất đai;</p>
                <p>Căn cứ Nghị định số 226/2025/NĐ-CP ngày 15 tháng 8 năm 2025 của Chính phủ sửa đổi, bổ sung một số điều của các nghị định quy định chi tiết thi hành Luật Đất đai;</p>
                <p>Căn cứ Quyết định số 26/2026/QĐ-UBND ngày 27 tháng 3 năm 2026 của Ủy ban nhân dân thành phố Đà Nẵng ban hành Quy chế phối hợp thực hiện chức năng, nhiệm vụ, quyền hạn giữa Văn phòng Đăng ký đất đai, Chi nhánh Văn phòng Đăng ký đất đai với cơ quan có chức năng quản lý đất đai, Ủy ban nhân dân cấp xã, Bộ phận Một cửa, cơ quan tài chính, cơ quan thuế và các cơ quan, đơn vị khác có liên quan trên địa bàn thành phố Đà Nẵng;</p>
                <p>Căn cứ Quyết định số 2267/QĐ-UBND ngày 26 tháng 6 năm 2025 của Chủ tịch Ủy ban nhân dân thành phố Đà Nẵng về việc công bố Danh mục thủ tục hành chính trong lĩnh vực đất đai thuộc thẩm quyền giải quyết của Sở Nông nghiệp và Môi trường, Ủy ban nhân dân cấp xã trên địa bàn thành phố Đà Nẵng;</p>
                <p>Căn cứ Quyết định số 91/2026/QĐ-UBND ngày 22 tháng 6 năm 2026 của Ủy ban nhân dân thành phố Đà Nẵng quy định phân cấp một số nhiệm vụ trong lĩnh vực đất đai trên địa bàn thành phố Đà Nẵng;</p>
                <p>Căn cứ Quyết định số 135/2026/QĐ-UBND ngày 24 tháng 9 năm 2026 của Ủy ban nhân dân thành phố Đà Nẵng ban hành Quy định trình tự, thủ tục hành chính về đất đai trên địa bàn thành phố Đà Nẵng;</p>
                <p>Căn cứ Thông tư số 10/2024/TT-BTNMT ngày 31/7/2024 quy định về hồ sơ địa chính, giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất;</p>
                <p>
                  Căn cứ hồ sơ đăng ký, cấp Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất; Biên bản kiểm tra hiện trạng thửa đất và biên bản xác minh tại khu dân cư của Phòng Kinh tế xã Lãnh Ngọc đối với thửa đất số <b>{dossier.parcel}</b>, tờ bản đồ số <b>{dossier.mapSheet}</b> của <b>{dossier.owner}</b>;
                </p>
                <p className="pl-4">Theo đề nghị của Phòng Kinh tế xã Lãnh Ngọc.</p>

                <p className="pt-1">
                  Ủy ban nhân dân xã Lãnh Ngọc thông báo niêm yết công khai kết quả kiểm tra hồ sơ đăng ký, cấp Giấy chứng nhận thửa đất số <b>{dossier.parcel}</b>, tờ bản đồ số <b>{dossier.mapSheet}</b>, diện tích <b>{parcels[0]?.area || totalLandArea} m²</b>, sử dụng vào mục đích <b>{parcels[0]?.currentStatus || 'đất ở tại nông thôn và đất trồng cây lâu năm'}</b> tại <b>{dossier.address || `${villageName}, xã Lãnh Ngọc, thành phố Đà Nẵng`}</b> do <b>{dossier.owner}</b> đăng ký, kê khai cụ thể như sau:
                </p>

                <p>1. Thời gian niêm yết công khai: 15 ngày kể từ ngày ban hành Thông báo này.</p>
                <p>2. Địa điểm niêm yết: Trụ sở Ủy ban nhân dân xã, Trung tâm Phục vụ hành chính công xã, Nhà văn hóa thôn nơi có đất.</p>
                <p>
                  3. Nguồn gốc: {parcels[0]?.origin || `Thửa đất do hộ ông/bà ${dossier.owner} khai hoang canh tác, quản lý sử dụng ổn định từ năm 1990 đến nay không tranh chấp.`}
                </p>
                <p>
                  4. Giao Phòng Kinh tế thực hiện niêm yết tại Trụ sở Ủy ban nhân dân xã và Trung tâm Phục vụ hành chính công xã; đề nghị Trưởng thôn thực hiện niêm yết tại Nhà văn hóa thôn nơi có đất.
                </p>
                <p>
                  Chi nhánh Văn phòng Đăng ký đất đai khu vực XVI chịu trách nhiệm toàn diện về ranh giới, mốc giới, kết quả đo đạc và chữ ký của các chủ sử dụng đất giáp ranh thể hiện trong bản mô tả ranh giới thửa đất. Mọi ý kiến thắc mắc, phản ánh, khiếu nại, tranh chấp liên quan đến nội dung công khai, đề nghị liên hệ Phòng Kinh tế xã để được giải quyết. Sau thời gian niêm yết nếu không nhận được ý kiến thắc mắc, phản ánh, khiếu nại, tranh chấp về nội dung nêu trên, Phòng Kinh tế tham mưu Ủy ban nhân dân xã lập biên bản kết thúc niêm yết, ban hành Thông báo kết thúc niêm yết công khai kết quả kiểm tra hồ sơ đăng ký, cấp Giấy chứng nhận quyền sử dụng đất của <b>{dossier.owner}</b> và thực hiện các trình tự, thủ tục theo quy định.
                </p>
                <p className="italic">
                  (Gửi kèm: Danh sách công khai kết quả kiểm tra hồ sơ đăng ký, cấp Giấy chứng nhận số {publicListNumber} ngày {currentDay}/{currentMonth}/{currentYear} của Ủy ban nhân dân xã)
                </p>
              </div>

              {/* SIGNATURE & NƠI NHẬN TABLE THEO NGHỊ ĐỊNH 30 */}
              <table className="sig-table w-full border-collapse border-none mt-6">
                <tbody>
                  <tr>
                    <td className="noi-nhan w-[45%] align-top border-none p-0 text-left" align="left" style={{ width: '45%', textAlign: 'left', verticalAlign: 'top', border: 'none', padding: 0, paddingLeft: 0, marginLeft: 0 }}>
                      <div className="font-bold italic text-xs text-black" align="left" style={{ textAlign: 'left', fontWeight: 'bold', fontStyle: 'italic' }}>Nơi nhận:</div>
                      <div className="text-[11px] text-black mt-1" align="left" style={{ textAlign: 'left' }}>- CT, PCT UBND xã;</div>
                      <div className="text-[11px] text-black" align="left" style={{ textAlign: 'left' }}>- Phòng Kinh tế;</div>
                      <div className="text-[11px] text-black" align="left" style={{ textAlign: 'left' }}>- TT Phục vụ hành chính công xã;</div>
                      <div className="text-[11px] text-black" align="left" style={{ textAlign: 'left' }}>- BND các thôn;</div>
                      <div className="text-[11px] text-black" align="left" style={{ textAlign: 'left' }}>- Lưu VT.</div>
                    </td>
                    <td className="w-[55%] text-center align-top border-none p-0" align="center" style={{ width: '55%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="font-bold text-xs uppercase text-black">TM. ỦY BAN NHÂN DÂN</div>
                      <div className="font-bold text-xs uppercase text-black">KT. CHỦ TỊCH</div>
                      <div className="font-bold text-xs uppercase text-black">PHÓ CHỦ TỊCH</div>
                      <div className="h-16"></div>
                      <div className="font-bold text-xs text-black">Thái Công Cần</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 6: DANH SÁCH CÔNG KHAI - MẪU SỐ 17 (BƯỚC 2) - KHỚP 100% FILE GỐC */}
          {slipType === 'public_list' && (
            <div
              ref={printContentRef}
              style={{ fontFamily: "'Times New Roman', 'Tinos', Times, serif" }}
              className="admin-doc w-full max-w-[297mm] min-h-[210mm] bg-white text-black p-6 sm:p-10 shadow-xl border border-gray-300 leading-relaxed text-xs sm:text-sm relative overflow-x-auto"
            >
              <div className="text-right text-xs font-bold text-black pb-1 italic">
                Mẫu số 17
              </div>

              {/* HEADER TABLE THEO NGHỊ ĐỊNH 30 */}
              <table className="header-table w-full border-collapse border-none mb-3" align="center" style={{ width: '100%', border: 'none', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td className="w-[45%] text-center align-top border-none p-0" align="center" style={{ width: '45%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="text-xs uppercase text-black" align="center" style={{ textAlign: 'center', margin: 0 }}>ỦY BAN NHÂN DÂN</div>
                      <div className="text-xs uppercase font-bold text-black" align="center" style={{ textAlign: 'center', fontWeight: 'bold', margin: 0 }}>XÃ LÃNH NGỌC</div>
                      <div className="w-24 h-[1.5px] bg-black mx-auto my-1"></div>
                      <div className="text-xs font-mono font-bold text-black" align="center" style={{ textAlign: 'center', marginTop: '4px' }}>
                        Số: {publicListNumber || '       /DS-UBND'}
                      </div>
                    </td>
                    <td className="w-[55%] text-center align-top border-none p-0" align="center" style={{ width: '55%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="text-xs uppercase font-bold text-black" align="center" style={{ textAlign: 'center', fontWeight: 'bold', margin: 0 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                      <div className="text-xs font-bold text-black" align="center" style={{ textAlign: 'center', fontWeight: 'bold', margin: 0 }}>Độc lập - Tự do - Hạnh phúc</div>
                      <div className="w-28 h-[1.5px] bg-black mx-auto my-1"></div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="my-4 text-center" align="center" style={{ textAlign: 'center', margin: '16px 0' }}>
                <h1 className="text-sm sm:text-base font-bold uppercase text-black tracking-tight" align="center" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15pt', textTransform: 'uppercase', margin: 0 }}>
                  DANH SÁCH CÔNG KHAI
                </h1>
                <p className="text-xs font-bold text-black mt-0.5" align="center" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12pt', marginTop: '4px' }}>
                  Kết quả kiểm tra hồ sơ đăng ký, cấp Giấy chứng nhận
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pb-2 text-xs no-print">
                <span className="text-slate-500 font-medium italic">
                  * Nhấp trực tiếp vào ô để sửa nội dung trước khi in/tải Word
                </span>
                <button
                  type="button"
                  onClick={addParcelRow}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm dòng thửa đất</span>
                </button>
              </div>

              {/* Table 13 Standard Columns (Mẫu 17) */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-black text-[10.5pt] leading-snug">
                  <thead>
                    <tr className="bg-slate-100 text-center font-bold text-black">
                      <th className="border border-black p-1 w-8">Số TT</th>
                      <th className="border border-black p-1 min-w-[120px]">
                        Tên người sử dụng đất, chủ sở hữu tài sản gắn liền với đất
                      </th>
                      <th className="border border-black p-1 min-w-[100px]">Địa chỉ thường trú</th>
                      <th className="border border-black p-1 min-w-[100px]">Địa chỉ thửa đất</th>
                      <th className="border border-black p-1 w-12">Tờ bản đồ số</th>
                      <th className="border border-black p-1 w-12">Thửa đất số</th>
                      <th className="border border-black p-1 w-14">Diện tích đất (m²)</th>
                      <th className="border border-black p-1 w-16">Thời điểm sử dụng đất</th>
                      <th className="border border-black p-1 min-w-[130px]">Nguồn gốc sử dụng đất</th>
                      <th className="border border-black p-1 min-w-[130px]">
                        Hiện trạng sử dụng đất, tài sản gắn liền với đất
                      </th>
                      <th className="border border-black p-1 w-16">
                        Thời điểm tạo lập tài sản gắn liền với đất
                      </th>
                      <th className="border border-black p-1 w-20">Tình trạng tranh chấp</th>
                      <th className="border border-black p-1 min-w-[120px]">Sự phù hợp với quy hoạch</th>
                      <th className="border border-black p-1 w-8 no-print">Xóa</th>
                    </tr>
                    <tr className="bg-slate-50 text-center text-[9pt] text-black">
                      <td className="border border-black p-0.5">(1)</td>
                      <td className="border border-black p-0.5">(2)</td>
                      <td className="border border-black p-0.5">(3)</td>
                      <td className="border border-black p-0.5">(4)</td>
                      <td className="border border-black p-0.5">(5)</td>
                      <td className="border border-black p-0.5">(6)</td>
                      <td className="border border-black p-0.5">(7)</td>
                      <td className="border border-black p-0.5">(8)</td>
                      <td className="border border-black p-0.5">(9)</td>
                      <td className="border border-black p-0.5">(10)</td>
                      <td className="border border-black p-0.5">(11)</td>
                      <td className="border border-black p-0.5">(12)</td>
                      <td className="border border-black p-0.5">(13)</td>
                      <td className="border border-black p-0.5 no-print">-</td>
                    </tr>
                  </thead>
                  <tbody>
                    {parcels.map((p) => (
                      <tr key={p.id}>
                        <td className="border border-black p-1 text-center font-bold">{p.stt}</td>
                        <td className="border border-black p-1">
                          <input
                            type="text"
                            value={p.owner}
                            onChange={(e) => updateParcelCell(p.id, 'owner', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-[10pt] font-bold text-black outline-none"
                          />
                        </td>
                        <td className="border border-black p-1">
                          <input
                            type="text"
                            value={p.permanentAddress}
                            onChange={(e) => updateParcelCell(p.id, 'permanentAddress', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-[10pt] text-black outline-none"
                          />
                        </td>
                        <td className="border border-black p-1">
                          <input
                            type="text"
                            value={p.landAddress}
                            onChange={(e) => updateParcelCell(p.id, 'landAddress', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-[10pt] text-black outline-none"
                          />
                        </td>
                        <td className="border border-black p-1 text-center font-bold">
                          <input
                            type="text"
                            value={p.mapSheet}
                            onChange={(e) => updateParcelCell(p.id, 'mapSheet', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-[10pt] text-center font-bold outline-none"
                          />
                        </td>
                        <td className="border border-black p-1 text-center font-bold">
                          <input
                            type="text"
                            value={p.parcel}
                            onChange={(e) => updateParcelCell(p.id, 'parcel', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-[10pt] text-center font-bold outline-none"
                          />
                        </td>
                        <td className="border border-black p-1 text-right">
                          <input
                            type="text"
                            value={p.area}
                            onChange={(e) => updateParcelCell(p.id, 'area', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-[10pt] text-right outline-none"
                          />
                        </td>
                        <td className="border border-black p-1 text-center">
                          <input
                            type="text"
                            value={p.usageTime}
                            onChange={(e) => updateParcelCell(p.id, 'usageTime', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-[10pt] text-center outline-none"
                          />
                        </td>
                        <td className="border border-black p-1">
                          <textarea
                            rows={3}
                            value={p.origin}
                            onChange={(e) => updateParcelCell(p.id, 'origin', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-[9.5pt] leading-tight outline-none resize-none"
                          />
                        </td>
                        <td className="border border-black p-1">
                          <textarea
                            rows={3}
                            value={p.currentStatus}
                            onChange={(e) => updateParcelCell(p.id, 'currentStatus', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-[9.5pt] leading-tight outline-none resize-none"
                          />
                        </td>
                        <td className="border border-black p-1 text-center">
                          <input
                            type="text"
                            value={p.assetCreatedTime}
                            onChange={(e) => updateParcelCell(p.id, 'assetCreatedTime', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-[10pt] text-center outline-none"
                          />
                        </td>
                        <td className="border border-black p-1 text-center">
                          <input
                            type="text"
                            value={p.disputeStatus}
                            onChange={(e) => updateParcelCell(p.id, 'disputeStatus', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-[10pt] text-center outline-none"
                          />
                        </td>
                        <td className="border border-black p-1">
                          <textarea
                            rows={3}
                            value={p.planningSuitability}
                            onChange={(e) => updateParcelCell(p.id, 'planningSuitability', e.target.value)}
                            className="w-full bg-transparent border-none p-0 text-[9.5pt] leading-tight outline-none resize-none"
                          />
                        </td>
                        <td className="border border-black p-1 text-center no-print">
                          <button
                            type="button"
                            onClick={() => removeParcelRow(p.id)}
                            className="text-rose-500 hover:text-rose-700 p-0.5 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3 mx-auto" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Exact clause from user's template */}
              <div className="mt-4 text-xs text-black space-y-1 text-justify">
                <p>
                  Danh sách này được công khai trong thời gian <b>15 ngày</b>, kể từ ngày{' '}
                  <span className="font-bold border-b border-dotted border-black px-1">
                    {publicStartDate.split('-').reverse().join('/')}
                  </span>{' '}
                  đến hết ngày{' '}
                  <span className="font-bold border-b border-dotted border-black px-1">
                    {publicEndDate.split('-').reverse().join('/')}
                  </span>{' '}
                  tại địa điểm: <b>{publicLocationVillage}</b> và <b>trụ sở UBND xã Lãnh Ngọc, thành phố Đà Nẵng</b>.
                </p>
                <p>
                  Người không đồng ý với kết quả kiểm tra trên đây thì gửi đơn đến UBND xã Lãnh Ngọc để giải quyết; sau thời gian trên sẽ không xem xét giải quyết./.
                </p>
              </div>

              {/* SIGNATURE & NƠI NHẬN TABLE THEO NGHỊ ĐỊNH 30 */}
              <table className="sig-table w-full border-collapse border-none mt-6">
                <tbody>
                  <tr>
                    <td className="noi-nhan w-[45%] align-top border-none p-0 text-left" align="left" style={{ width: '45%', textAlign: 'left', verticalAlign: 'top', border: 'none', padding: 0, paddingLeft: 0, marginLeft: 0 }}>
                      <div className="font-bold italic text-xs text-black" align="left" style={{ textAlign: 'left', fontWeight: 'bold', fontStyle: 'italic' }}>Nơi nhận:</div>
                      <div className="text-[11px] text-black mt-1" align="left" style={{ textAlign: 'left' }}>- Chủ tịch, Phó Chủ tịch UBND xã;</div>
                      <div className="text-[11px] text-black" align="left" style={{ textAlign: 'left' }}>- Phòng Kinh tế xã;</div>
                      <div className="text-[11px] text-black" align="left" style={{ textAlign: 'left' }}>- Thôn trưởng {villageName} (Niêm yết tại NVH);</div>
                      <div className="text-[11px] text-black" align="left" style={{ textAlign: 'left' }}>- TT Phục vụ hành chính công;</div>
                      <div className="text-[11px] text-black" align="left" style={{ textAlign: 'left' }}>- Lưu: VT, PKT.</div>
                    </td>
                    <td className="w-[55%] text-center align-top border-none p-0" align="center" style={{ width: '55%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="italic text-xs text-black">
                        Lãnh Ngọc, ngày {currentDay} tháng {currentMonth} năm {currentYear}
                      </div>
                      <div className="font-bold text-xs uppercase text-black mt-1">TM. ỦY BAN NHÂN DÂN</div>
                      <div className="font-bold text-xs uppercase text-black whitespace-pre-line">{communeLeaderRole}</div>
                      <div className="h-16"></div>
                      <div className="font-bold text-xs text-black">{communeLeaderName}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 7: BIÊN BẢN KẾT THÚC NIÊM YẾT (BƯỚC 3) - KHỚP 100% FILE GỐC */}
          {slipType === 'public_closing_minutes' && (
            <div
              ref={printContentRef}
              style={{ fontFamily: "'Times New Roman', 'Tinos', Times, serif" }}
              className="admin-doc w-full min-w-[210mm] max-w-[210mm] min-h-[297mm] bg-white text-black p-8 sm:p-12 shadow-xl border border-gray-300 leading-relaxed text-xs sm:text-sm relative"
            >
              {/* HEADER TABLE THEO NGHỊ ĐỊNH 30 */}
              <table className="header-table w-full border-collapse border-none mb-3" align="center" style={{ width: '100%', border: 'none', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td className="w-[45%] text-center align-top border-none p-0" align="center" style={{ width: '45%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="text-xs uppercase text-black" align="center" style={{ textAlign: 'center', margin: 0 }}>ỦY BAN NHÂN DÂN</div>
                      <div className="text-xs uppercase font-bold text-black" align="center" style={{ textAlign: 'center', fontWeight: 'bold', margin: 0 }}>XÃ LÃNH NGỌC</div>
                      <div className="w-24 h-[1.5px] bg-black mx-auto my-1"></div>
                      <div className="text-xs font-mono font-bold text-black" align="center" style={{ textAlign: 'center', marginTop: '4px' }}>
                        Số:       / BB-UBND
                      </div>
                    </td>
                    <td className="w-[55%] text-center align-top border-none p-0" align="center" style={{ width: '55%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="text-xs uppercase font-bold text-black" align="center" style={{ textAlign: 'center', fontWeight: 'bold', margin: 0 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                      <div className="text-xs font-bold text-black" align="center" style={{ textAlign: 'center', fontWeight: 'bold', margin: 0 }}>Độc lập - Tự do - Hạnh phúc</div>
                      <div className="w-28 h-[1.5px] bg-black mx-auto my-1"></div>
                      <div className="text-[11px] text-black italic" align="center" style={{ textAlign: 'center', fontStyle: 'italic', marginTop: '4px' }}>
                        Lãnh Ngọc, ngày {currentDay} tháng {currentMonth} năm {currentYear}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="my-5 text-center" align="center" style={{ textAlign: 'center', margin: '20px 0' }}>
                <h1 className="text-base sm:text-lg font-bold uppercase text-black tracking-tight" align="center" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15pt', textTransform: 'uppercase', margin: 0 }}>
                  BIÊN BẢN
                </h1>
                <p className="text-xs sm:text-sm font-bold text-black mt-1" align="center" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12pt', marginTop: '6px' }}>
                  Kết thúc thời gian niêm yết công khai kết quả kiểm tra hồ sơ đăng ký, cấp Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất
                </p>
              </div>

              <div className="space-y-3 text-black text-justify leading-relaxed">
                <p>
                  Hôm nay, vào lúc <b>{closingTimeStr}</b>, ngày {currentDay} tháng {currentMonth} năm {currentYear}, tại trụ sở UBND xã Lãnh Ngọc, chúng tôi tiến hành lập Biên bản kết thúc thời gian niêm yết công khai kết quả kiểm tra hồ sơ đăng ký, cấp Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất đối với hồ sơ của <b>{dossier.owner}</b>, trú tại <b>{dossier.address || `${villageName}, xã Lãnh Ngọc, thành phố Đà Nẵng`}</b>.
                </p>

                <div>
                  <h3 className="font-bold text-black uppercase text-xs">
                    Thành phần tham dự lập biên bản gồm có:
                  </h3>
                  <div className="space-y-1.5 pl-3 pt-1">
                    <p>- Ông: <b>Thái Công Cần</b> &nbsp;&nbsp;&nbsp;&nbsp; Chức vụ: &nbsp;<b>Phó Chủ tịch UBND xã;</b></p>
                    <p>- Ông: <b>Võ Tấn Lạt</b> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Chức vụ: &nbsp;<b>Phó Trưởng Phòng Kinh tế;</b></p>
                    <p>- Ông: <b>Đoàn Văn Hoài Vũ</b> &nbsp; Chức vụ: &nbsp;<b>Chuyên viên Phòng Kinh tế;</b></p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <p>
                    Thực hiện Thông báo số <b>{publicNoticeNumber}</b> ngày {publicStartDate.split('-').reverse().join('/')} của UBND xã Lãnh Ngọc về việc niêm yết công khai kết quả kiểm tra hồ sơ đăng ký, cấp Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất đối với <b>{dossier.owner}</b>, UBND xã đã thực hiện niêm yết công khai đối với thửa đất số <b>{dossier.parcel}</b>, tờ bản đồ số <b>{dossier.mapSheet}</b>, tại <b>{dossier.address || `${villageName}, xã Lãnh Ngọc, thành phố Đà Nẵng`}</b>.
                  </p>
                  <p>
                    Nội dung niêm yết gồm các thông tin về người đăng ký sử dụng đất, thửa đất, diện tích, mục đích sử dụng, nguồn gốc và thời điểm sử dụng đất, hiện trạng sử dụng đất cùng các nội dung có liên quan đến việc đăng ký, cấp Giấy chứng nhận theo hồ sơ đã được kiểm tra.
                  </p>
                  <p>
                    Thời gian niêm yết công khai được thực hiện trong <b>15 ngày</b>, từ ngày <b>{publicStartDate.split('-').reverse().join('/')}</b> đến hết ngày <b>{publicEndDate.split('-').reverse().join('/')}</b> tại trụ sở UBND xã Lãnh Ngọc, Trung tâm Phục vụ hành chính công xã Lãnh Ngọc và Nhà văn hóa {villageName}.
                  </p>
                  <p>
                    Trong thời gian niêm yết, UBND xã <b>không nhận được ý kiến phản ánh, kiến nghị, khiếu nại hoặc tranh chấp</b> của tổ chức, cá nhân liên quan đến thửa đất và hồ sơ đăng ký của <b>{dossier.owner}</b>.
                  </p>
                  <p>
                    Đến hết thời gian niêm yết, UBND xã kiểm tra và xác nhận việc niêm yết đã được thực hiện đúng thời gian, địa điểm theo Thông báo đã ban hành; không phát sinh ý kiến làm thay đổi nội dung kết quả kiểm tra hồ sơ đã được công khai.
                  </p>
                  <p>
                    Biên bản này được lập để làm cơ sở tiếp tục hoàn thiện hồ sơ đăng ký, cấp Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất cho <b>{dossier.owner}</b> theo quy định.
                  </p>
                  <p>
                    Biên bản kết thúc vào lúc 10 giờ 30 phút cùng ngày. Biên bản được đọc lại cho những người tham dự cùng nghe, thống nhất nội dung và ký xác nhận./.
                  </p>
                </div>
              </div>

              {/* SIGNATURE 3-COLUMN TABLE THEO NGHỊ ĐỊNH 30 */}
              <table className="sig-table w-full border-collapse border-none mt-8 text-center">
                <tbody>
                  <tr>
                    <td className="noi-nhan w-[30%] align-top border-none p-0 text-left" align="left" style={{ width: '30%', textAlign: 'left', verticalAlign: 'top', border: 'none', padding: 0, paddingLeft: 0, marginLeft: 0 }}>
                      <div className="font-bold text-xs text-black" align="left" style={{ textAlign: 'left', fontWeight: 'bold' }}>Nơi nhận:</div>
                      <div className="text-[11px] text-black mt-1" align="left" style={{ textAlign: 'left' }}>- CT, PCT UBND xã;</div>
                      <div className="text-[11px] text-black" align="left" style={{ textAlign: 'left' }}>- Phòng Kinh tế;</div>
                      <div className="text-[11px] text-black" align="left" style={{ textAlign: 'left' }}>- TT Phục vụ hành chính công xã;</div>
                      <div className="text-[11px] text-black" align="left" style={{ textAlign: 'left' }}>- BND các thôn;</div>
                      <div className="text-[11px] text-black" align="left" style={{ textAlign: 'left' }}>- Lưu VT, PKT.</div>
                    </td>
                    <td className="w-[35%] align-top border-none p-0 text-center" align="center" style={{ width: '35%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="font-bold text-xs uppercase text-black">ĐD. PHÒNG KINH TẾ</div>
                      <div className="text-[10px] italic text-slate-500">(Ký, ghi rõ họ tên)</div>
                      <div className="h-16"></div>
                      <div className="font-bold text-xs text-black">Võ Tấn Lạt</div>
                    </td>
                    <td className="w-[35%] align-top border-none p-0 text-center" align="center" style={{ width: '35%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="font-bold text-xs text-black">Xác nhận UBND xã Lãnh Ngọc</div>
                      <div className="font-bold text-xs uppercase text-black">PHÓ CHỦ TỊCH</div>
                      <div className="text-[10px] italic text-slate-500">(Ký, ghi rõ họ tên)</div>
                      <div className="h-16"></div>
                      <div className="font-bold text-xs text-black">Thái Công Cần</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 8: THÔNG BÁO KẾT THÚC NIÊM YẾT (BƯỚC 3) - KHỚP 100% FILE GỐC */}
          {slipType === 'public_closing_notice' && (
            <div
              ref={printContentRef}
              style={{ fontFamily: "'Times New Roman', 'Tinos', Times, serif" }}
              className="admin-doc w-full min-w-[210mm] max-w-[210mm] min-h-[297mm] bg-white text-black p-8 sm:p-12 shadow-xl border border-gray-300 leading-relaxed text-xs sm:text-sm relative"
            >
              {/* HEADER TABLE THEO NGHỊ ĐỊNH 30 */}
              <table className="header-table w-full border-collapse border-none mb-3" align="center" style={{ width: '100%', border: 'none', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td className="w-[45%] text-center align-top border-none p-0" align="center" style={{ width: '45%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="text-xs uppercase text-black" align="center" style={{ textAlign: 'center', margin: 0 }}>ỦY BAN NHÂN DÂN</div>
                      <div className="text-xs uppercase font-bold text-black" align="center" style={{ textAlign: 'center', fontWeight: 'bold', margin: 0 }}>XÃ LÃNH NGỌC</div>
                      <div className="w-24 h-[1.5px] bg-black mx-auto my-1"></div>
                      <div className="text-xs font-mono font-bold text-black" align="center" style={{ textAlign: 'center', marginTop: '4px' }}>
                        Số:       / TB-UBND
                      </div>
                    </td>
                    <td className="w-[55%] text-center align-top border-none p-0" align="center" style={{ width: '55%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="text-xs uppercase font-bold text-black" align="center" style={{ textAlign: 'center', fontWeight: 'bold', margin: 0 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                      <div className="text-xs font-bold text-black" align="center" style={{ textAlign: 'center', fontWeight: 'bold', margin: 0 }}>Độc lập - Tự do - Hạnh phúc</div>
                      <div className="w-28 h-[1.5px] bg-black mx-auto my-1"></div>
                      <div className="text-[11px] text-black italic" align="center" style={{ textAlign: 'center', fontStyle: 'italic', marginTop: '4px' }}>
                        Lãnh Ngọc, ngày {currentDay} tháng {currentMonth} năm {currentYear}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="my-5 text-center" align="center" style={{ textAlign: 'center', margin: '20px 0' }}>
                <h1 className="text-base sm:text-lg font-bold uppercase text-black tracking-tight" align="center" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15pt', textTransform: 'uppercase', margin: 0 }}>
                  THÔNG BÁO
                </h1>
                <p className="text-xs sm:text-sm font-bold text-black mt-1" align="center" style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '12pt', marginTop: '6px' }}>
                  Về việc kết thúc niêm yết công khai kết quả kiểm tra hồ sơ đăng ký,<br/>
                  cấp Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất
                </p>
              </div>

              {/* Exact legal citations verbatim from user file */}
              <div className="space-y-2.5 text-black text-justify leading-relaxed text-xs">
                <p>Căn cứ Luật Tổ chức chính quyền địa phương số 72/2025/QH15 ngày 16 tháng 6 năm 2025;</p>
                <p>Căn cứ Luật Đất đai số 31/2024/QH15 ngày 18 tháng 01 năm 2024 và Luật số 43/2024/QH15 ngày 29 tháng 6 năm 2024 sửa đổi, bổ sung một số điều của Luật Đất đai số 31/2024/QH15;</p>
                <p>Căn cứ Nghị định số 101/2024/NĐ-CP ngày 29/7/2024 của Chính phủ về điều tra cơ bản đất đai, đăng ký, cấp giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất và Hệ thống thông tin đất đai;</p>
                <p>Căn cứ Nghị định số 102/2024/NĐ-CP ngày 30 tháng 7 năm 2024 của Chính phủ quy định chi tiết thi hành một số điều của Luật Đất đai, được sửa đổi, bổ sung theo quy định hiện hành;</p>
                <p>Căn cứ Nghị định số 151/2025/NĐ-CP ngày 12 tháng 6 năm 2025 của Chính phủ Quy định về phân định thẩm quyền của chính quyền địa phương 02 cấp, phân quyền, phân cấp trong lĩnh vực đất đai;</p>
                <p>Căn cứ Nghị định số 226/2025/NĐ-CP ngày 15 tháng 8 năm 2025 của Chính phủ sửa đổi, bổ sung một số điều của các nghị định quy định chi tiết thi hành Luật Đất đai;</p>
                <p>Căn cứ Quyết định số 26/2026/QĐ-UBND ngày 27 tháng 3 năm 2026 của Ủy ban nhân dân thành phố Đà Nẵng ban hành Quy chế phối hợp thực hiện chức năng, nhiệm vụ, quyền hạn giữa Văn phòng Đăng ký đất đai, Chi nhánh Văn phòng Đăng ký đất đai với cơ quan có chức năng quản lý đất đai, Ủy ban nhân dân cấp xã, Bộ phận Một cửa, cơ quan tài chính, cơ quan thuế và các cơ quan, đơn vị khác có liên quan trên địa bàn thành phố Đà Nẵng;</p>
                <p>Căn cứ Quyết định số 2267/QĐ-UBND ngày 26 tháng 6 năm 2025 của Chủ tịch Ủy ban nhân dân thành phố Đà Nẵng về việc công bố Danh mục thủ tục hành chính trong lĩnh vực đất đai thuộc thẩm quyền giải quyết của Sở Nông nghiệp và Môi trường, Ủy ban nhân dân cấp xã trên địa bàn thành phố Đà Nẵng;</p>
                <p>Căn cứ Quyết định số 91/2026/QĐ-UBND ngày 22 tháng 6 năm 2026 của Ủy ban nhân dân thành phố Đà Nẵng quy định phân cấp một số nhiệm vụ trong lĩnh vực đất đai trên địa bàn thành phố Đà Nẵng;</p>
                <p>Căn cứ Quyết định số 135/2026/QĐ-UBND ngày 24 tháng 9 năm 2026 của Ủy ban nhân dân thành phố Đà Nẵng ban hành Quy định trình tự, thủ tục hành chính về đất đai trên địa bàn thành phố Đà Nẵng;</p>
                <p>Căn cứ Thông tư số 10/2024/TT-BTNMT ngày 31/7/2024 quy định về hồ sơ địa chính, giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất;</p>
                <p>Căn cứ Thông báo số {publicNoticeNumber} ngày {publicStartDate.split('-').reverse().join('/')} của Ủy ban nhân dân xã Lãnh Ngọc về việc niêm yết công khai kết quả kiểm tra hồ sơ đăng ký, cấp Giấy chứng nhận quyền sử dụng đất của {dossier.owner};</p>
                <p>Theo đề nghị của Phòng Kinh tế xã Lãnh Ngọc.</p>

                <p className="font-bold pt-1">Ủy ban nhân dân xã Lãnh Ngọc thông báo như sau:</p>

                <p>
                  Ngày {publicStartDate.split('-').reverse().join('/')}, Ủy ban nhân dân xã đã ban hành Thông báo số {publicNoticeNumber} về việc niêm yết công khai kết quả kiểm tra hồ sơ đăng ký, cấp Giấy chứng nhận quyền sử dụng đất của <b>{dossier.owner}</b> (thửa đất số <b>{dossier.parcel}</b> tờ bản đồ số <b>{dossier.mapSheet}</b>, diện tích <b>{parcels[0]?.area || totalLandArea} m²</b> tại {dossier.address || `${villageName}, xã Lãnh Ngọc, thành phố Đà Nẵng`}, do {dossier.owner} đăng ký, kê khai) và kèm theo Danh sách niêm yết công khai số {publicListNumber} ngày {publicStartDate.split('-').reverse().join('/')} đã được niêm yết công khai tại Trụ sở Ủy ban nhân dân xã, Trung tâm Phục vụ hành chính công xã, {publicLocationVillage}. Thời gian niêm yết công khai kể từ ngày {publicStartDate.split('-').reverse().join('/')} đến hết ngày {publicEndDate.split('-').reverse().join('/')}.
                </p>

                <p>
                  Trong thời gian niêm yết công khai, Ủy ban nhân dân xã, Phòng Kinh tế xã, Trung tâm Phục vụ hành chính công xã, Ban nhân dân thôn <b>không nhận được ý kiến thắc mắc, phản ánh, kiến nghị, khiếu nại, tố cáo hoặc tranh chấp</b> liên quan đến nội dung công khai kết quả kiểm tra hồ sơ đăng ký, cấp Giấy chứng nhận quyền sử dụng đất nêu trên; đã tiến hành lập Biên bản kết thúc niêm yết công khai ngày {currentDay}/{currentMonth}/{currentYear}.
                </p>

                <p>
                  Nay, Ủy ban nhân dân xã Lãnh Ngọc thông báo kết thúc niêm yết công khai kết quả kiểm tra, đăng ký cấp Giấy chứng nhận quyền sử dụng đất của <b>{dossier.owner}</b> có đất tại {dossier.address || `${villageName}, xã Lãnh Ngọc, thành phố Đà Nẵng`} nêu tại Thông báo số {publicNoticeNumber}; chuyển các phòng, ban, đơn vị biết và thực hiện các trình tự, thủ tục theo quy định.
                </p>

                <p className="italic">
                  (Gửi kèm: Thông báo số {publicNoticeNumber} của Ủy ban nhân dân xã, Biên bản kết thúc niêm yết và hồ sơ kèm theo).
                </p>
              </div>

              {/* SIGNATURE & NƠI NHẬN TABLE THEO NGHỊ ĐỊNH 30 */}
              <table className="sig-table w-full border-collapse border-none mt-8">
                <tbody>
                  <tr>
                    <td className="noi-nhan w-[45%] align-top border-none p-0 text-left" align="left" style={{ width: '45%', textAlign: 'left', verticalAlign: 'top', border: 'none', padding: 0, paddingLeft: 0, marginLeft: 0 }}>
                      <div className="font-bold text-xs text-black" align="left" style={{ textAlign: 'left', fontWeight: 'bold' }}>Nơi nhận:</div>
                      <div className="text-[11px] text-black mt-1" align="left" style={{ textAlign: 'left' }}>- CT, PCT UBND xã;</div>
                      <div className="text-[11px] text-black" align="left" style={{ textAlign: 'left' }}>- Phòng Kinh tế;</div>
                      <div className="text-[11px] text-black" align="left" style={{ textAlign: 'left' }}>- TT Phục vụ hành chính công xã;</div>
                      <div className="text-[11px] text-black" align="left" style={{ textAlign: 'left' }}>- BND các thôn;</div>
                      <div className="text-[11px] text-black" align="left" style={{ textAlign: 'left' }}>- Lưu VT, PKT.</div>
                    </td>
                    <td className="w-[55%] text-center align-top border-none p-0" align="center" style={{ width: '55%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="font-bold text-xs uppercase text-black">TM. ỦY BAN NHÂN DÂN</div>
                      <div className="font-bold text-xs uppercase text-black">KT. CHỦ TỊCH</div>
                      <div className="font-bold text-xs uppercase text-black">PHÓ CHỦ TỊCH</div>
                      <div className="h-16"></div>
                      <div className="font-bold text-xs text-black">Thái Công Cần</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 9: PHIẾU TRÌNH CẤP GCN (BƯỚC 6) - KHỚP 100% FILE GỐC */}
          {slipType === 'submission_phieutrinh' && (
            <div
              ref={printContentRef}
              style={{ fontFamily: "'Times New Roman', 'Tinos', Times, serif" }}
              className="admin-doc w-full min-w-[210mm] max-w-[210mm] min-h-[297mm] bg-white text-black p-8 sm:p-12 shadow-xl border border-gray-300 leading-relaxed text-xs sm:text-sm relative"
            >
              {/* HEADER TABLE THEO NGHỊ ĐỊNH 30 */}
              <table className="header-table w-full border-collapse border-none mb-3">
                <tbody>
                  <tr>
                    <td className="w-[45%] text-center align-top border-none p-0">
                      <div className="text-xs uppercase text-black">UBND XÃ LÃNH NGỌC</div>
                      <div className="text-xs uppercase font-bold text-black">PHÒNG KINH TẾ</div>
                      <div className="w-24 h-[1.5px] bg-black mx-auto my-1"></div>
                      <div className="text-xs font-mono font-bold text-black">
                        Mã HS: {dossier.code}
                      </div>
                    </td>
                    <td className="w-[55%] text-center align-top border-none p-0">
                      <div className="text-xs uppercase font-bold text-black">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                      <div className="text-xs font-bold text-black">Độc lập - Tự do - Hạnh phúc</div>
                      <div className="w-28 h-[1.5px] bg-black mx-auto my-1"></div>
                      <div className="text-[11px] text-black italic">
                        Lãnh Ngọc, ngày {currentDay} tháng {currentMonth} năm {currentYear}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="my-5 text-center">
                <h1 className="text-sm sm:text-base font-bold uppercase text-black tracking-tight">
                  PHIẾU TRÌNH
                </h1>
                <p className="text-xs font-bold text-black mt-1">
                  Về việc đề nghị cấp Giấy chứng nhận quyền sử dụng đất,<br/>
                  quyền sở hữu tài sản gắn liền với đất lần đầu cho {dossier.owner}
                </p>
              </div>

              <div className="my-3 text-center font-bold text-xs text-black">
                Kính gửi: Chủ tịch UBND xã Lãnh Ngọc
              </div>

              {/* Exact content verbatim from media_1792160480452_837b1dc3.docx */}
              <div className="space-y-2.5 text-black text-justify leading-relaxed text-xs">
                <p>
                  Phòng Kinh tế nhận được Đơn đăng ký đất đai, tài sản gắn liền với đất kèm theo các hồ sơ có liên quan của <b>{dossier.owner}</b>, thường trú tại <b>{dossier.address || `${villageName}, xã Lãnh Ngọc, thành phố Đà Nẵng`}</b>, về việc đăng ký đất đai, tài sản gắn liền với đất và cấp Giấy chứng nhận quyền sử dụng đất đối với thửa đất số <b>{dossier.parcel}</b>, tờ bản đồ số <b>{dossier.mapSheet}</b>, tại <b>{dossier.address || `${villageName}, xã Lãnh Ngọc, thành phố Đà Nẵng`}</b>. Sau khi kiểm tra căn cứ quy định của pháp luật về đất đai, Phòng Kinh tế kính báo cáo Chủ tịch UBND xã như sau:
                </p>

                <div>
                  <h3 className="font-bold text-black text-xs uppercase">1. Căn cứ pháp lý</h3>
                  <div className="space-y-1 pl-3 pt-1">
                    <p>Căn cứ Luật Tổ chức chính quyền địa phương số 72/2025/QH15 ngày 16/6/2025;</p>
                    <p>Căn cứ Luật Đất đai số 31/2024/QH15; Luật số 43/2024/QH15 sửa đổi, bổ sung một số điều của Luật Đất đai số 31/2024/QH15, Luật Nhà ở số 27/2023/QH15, Luật Kinh doanh bất động sản số 29/2023/QH15 và Luật Các tổ chức tín dụng số 32/2024/QH15;</p>
                    <p>Căn cứ Nghị quyết số 254/2025/QH15 ngày 11 tháng 12 năm 2025 của Quốc hội quy định một số cơ chế, chính sách tháo gỡ khó khăn, vướng mắc trong tổ chức thi hành Luật Đất đai;</p>
                    <p>Căn cứ Nghị định số 101/2024/NĐ-CP ngày 29/7/2024 của Chính phủ Quy định về điều tra cơ bản đất đai; đăng ký, cấp Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất và Hệ thống thông tin đất đai;</p>
                    <p>Căn cứ Nghị định số 102/2024/NĐ-CP ngày 30 tháng 7 năm 2024, quy định chi tiết thi hành một số điều của Luật Đất đai;</p>
                    <p>Căn cứ Nghị định số 151/2025/NĐ-CP ngày 12 tháng 6 năm 2025 của Chính phủ quy định về phân định thẩm quyền của chính quyền địa phương 02 cấp, phân quyền, phân cấp trong lĩnh vực đất đai;</p>
                    <p>Căn cứ Nghị định số 226/2025/NĐ-CP ngày 15 tháng 8 năm 2025 của Chính phủ sửa đổi, bổ sung một số điều của các nghị định quy định chi tiết thi hành Luật Đất đai;</p>
                    <p>Căn cứ Nghị định số 49/2026/NĐ-CP ngày 31 tháng 01 năm 2026 của Chính phủ quy định chi tiết và hướng dẫn một số điều của Nghị quyết số 254/2025/QH15 của Quốc hội quy định một số cơ chế, chính sách tháo gỡ khó khăn, vướng mắc trong tổ chức thi hành Luật Đất đai;</p>
                    <p>Căn cứ Thông tư số 10/2024/TT-BTNMT ngày 31 tháng 7 năm 2024 của Bộ trưởng Bộ Tài nguyên và Môi trường quy định về hồ sơ địa chính, Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất;</p>
                    <p>Căn cứ Thông tư số 23/2025/TT-BNNMT ngày 20 tháng 6 năm 2025 của Bộ trưởng Bộ Nông nghiệp và Môi trường quy định về phân cấp, phân định thẩm quyền quản lý nhà nước trong lĩnh vực đất đai;</p>
                    <p>Căn cứ Quyết định số 75/2026/QĐ-UBND ngày 30 tháng 5 năm 2026 của UBND thành phố Đà Nẵng ban hành Quy định một số nội dung thuộc lĩnh vực đất đai trên địa bàn thành phố Đà Nẵng;</p>
                    <p>Căn cứ Quyết định số 91/2026/QĐ-UBND ngày 22 tháng 6 năm 2026 của UBND thành phố Đà Nẵng quy định về phân cấp một số nhiệm vụ trong lĩnh vực đất đai trên địa bàn thành phố Đà Nẵng.</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-black text-xs uppercase">2. Hồ sơ đề nghị đăng ký đất đai, cấp Giấy chứng nhận</h3>
                  <div className="space-y-1 pl-3 pt-1">
                    <p>Hồ sơ của <b>{dossier.owner}</b> gồm:</p>
                    <p>- Đơn đăng ký đất đai, tài sản gắn liền với đất của {dossier.owner};</p>
                    <p>- Biên bản kiểm tra hiện trạng sử dụng đất của {dossier.owner};</p>
                    <p>- Danh sách niêm yết công khai và Biên bản kết thúc niêm yết công khai kết quả kiểm tra hồ sơ đăng ký, cấp Giấy chứng nhận quyền sử dụng đất đối với thửa đất số {dossier.parcel}, tờ bản đồ số {dossier.mapSheet} của {dossier.owner};</p>
                    <p>- Các tài liệu khác có liên quan theo thành phần hồ sơ.</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-black text-xs uppercase">3. Kết quả kiểm tra hồ sơ</h3>
                  <div className="space-y-1.5 pl-3 pt-1">
                    <p><b>3.1. Về nguồn gốc và quá trình sử dụng đất:</b> Theo hồ sơ và kết quả xác minh, thửa đất do hộ <b>{dossier.owner}</b> khai hoang, canh tác, sử dụng từ năm <b>{parcels[0]?.usageTime || '1990'}</b> đến nay, quá trình sử dụng đất ổn định và không có tranh chấp.</p>
                    <p><b>3.2. Về hiện trạng sử dụng đất:</b> Thửa đất số <b>{dossier.parcel}</b>, tờ bản đồ số <b>{dossier.mapSheet}</b>, tại {dossier.address || `${villageName}, xã Lãnh Ngọc, thành phố Đà Nẵng`} hiện do <b>{dossier.owner}</b> quản lý, sử dụng với tổng diện tích <b>{parcels[0]?.area || totalLandArea} m²</b>. Trong đó: Đất ở: <b>{residentialArea} m²</b>; Đất trồng cây lâu năm: <b>{agricultureArea} m²</b>. Vị trí, ranh giới thửa đất được xác định theo trích đo bản đồ địa chính số <b>{trichDoNumber}</b>, tỷ lệ 1/1000, do Chi nhánh Văn phòng Đăng ký đất đai Tiên Phước duyệt ngày {trichDoDate}.</p>
                    <p><b>3.3. Về tình trạng tranh chấp:</b> Hồ sơ đã được kiểm tra và thực hiện niêm yết công khai theo quy định. Trong thời gian niêm yết công khai không phát sinh ý kiến tranh chấp, khiếu nại, tố cáo liên quan đến quyền sử dụng đất đối với thửa đất đề nghị cấp Giấy chứng nhận.</p>
                    <p><b>3.4. Về thành phần hồ sơ:</b> Hồ sơ đăng ký đất đai, tài sản gắn liền với đất và đề nghị cấp Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất lần đầu của <b>{dossier.owner}</b> đã được kiểm tra, bảo đảm thành phần hồ sơ theo quy định.</p>
                    <p><b>3.5. Về nghĩa vụ tài chính:</b> <b>{dossier.owner}</b> đã thực hiện đầy đủ nghĩa vụ tài chính theo thông báo của cơ quan thuế.</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-black text-xs uppercase">4. Nhận xét và đề xuất, kiến nghị</h3>
                  <div className="space-y-1.5 pl-3 pt-1">
                    <p>Qua kiểm tra hồ sơ, nguồn gốc, quá trình sử dụng đất, hiện trạng sử dụng đất, tình trạng tranh chấp và việc thực hiện nghĩa vụ tài chính, Phòng Kinh tế nhận thấy:</p>
                    <p>Thửa đất số <b>{dossier.parcel}</b>, tờ bản đồ số <b>{dossier.mapSheet}</b> có nguồn gốc do hộ <b>{dossier.owner}</b> khai hoang, canh tác, sử dụng từ năm 1990 đến nay. Quá trình sử dụng đất ổn định, không có tranh chấp.</p>
                    <p>Thửa đất đã được kiểm tra hiện trạng, xác định vị trí, ranh giới, diện tích theo hồ sơ đo đạc địa chính; đã thực hiện niêm yết công khai kết quả kiểm tra hồ sơ theo quy định và không phát sinh tranh chấp, khiếu nại, tố cáo liên quan đến quyền sử dụng đất.</p>
                    <p>Hồ sơ của <b>{dossier.owner}</b> đã được hoàn thiện theo quy định và người sử dụng đất đã thực hiện đầy đủ nghĩa vụ tài chính đối với Nhà nước.</p>
                    <p>Căn cứ các quy định của pháp luật đất đai hiện hành và quy định về phân cấp thẩm quyền trong lĩnh vực đất đai trên địa bàn thành phố Đà Nẵng, hồ sơ của <b>{dossier.owner}</b> thuộc trường hợp Chủ tịch UBND cấp xã thực hiện thẩm quyền cấp Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất theo quy định. Quyết định 91/2026/QĐ-UBND của UBND thành phố Đà Nẵng hiện quy định việc phân cấp một số nhiệm vụ trong lĩnh vực đất đai cho Chủ tịch UBND cấp xã.</p>
                    <p>Do đó, Phòng Kinh tế kính trình Chủ tịch UBND xã Lãnh Ngọc xem xét, quyết định cấp Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất lần đầu cho <b>{dossier.owner}</b>, cụ thể:</p>
                    <div className="pl-3 space-y-0.5">
                      <p>- Thửa đất số: <b>{dossier.parcel}</b>; Tờ bản đồ số: <b>{dossier.mapSheet}</b>;</p>
                      <p>- Địa chỉ thửa đất: <b>{dossier.address || `${villageName}, xã Lãnh Ngọc, thành phố Đà Nẵng`}</b>;</p>
                      <p>- Tổng diện tích: <b>{parcels[0]?.area || totalLandArea} m²</b>; Trong đó:</p>
                      <p>&nbsp;&nbsp;+ Đất ở: <b>{residentialArea} m²</b>; Thời hạn sử dụng: Lâu dài;</p>
                      <p>&nbsp;&nbsp;+ Đất trồng cây lâu năm: <b>{agricultureArea} m²</b>; Thời hạn sử dụng: 50 năm kể từ ngày cấp Giấy chứng nhận;</p>
                      <p>- Vị trí, ranh giới thửa đất được xác định theo trích đo bản đồ địa chính số {trichDoNumber}, tỷ lệ 1/1000, do Chi nhánh Văn phòng Đăng ký đất đai Tiên Phước duyệt ngày {trichDoDate}.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-black text-xs uppercase">5. Hồ sơ kèm theo</h3>
                  <div className="space-y-0.5 pl-3 pt-1">
                    <p>5.1. {taxNotice1};</p>
                    <p>5.2. {taxNotice2};</p>
                    <p>5.3. {taxConfirmNotice};</p>
                    <p>5.4. Phôi Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất đề nghị cấp cho <b>{dossier.owner}</b>;</p>
                    <p>5.5. Vị trí, ranh giới thửa đất được xác định theo trích đo bản đồ địa chính số {trichDoNumber}, tỷ lệ 1/1000, do Chi nhánh Văn phòng Đăng ký đất đai Tiên Phước duyệt ngày {trichDoDate};</p>
                    <p>5.6. Hồ sơ đề nghị đăng ký đất đai, tài sản gắn liền với đất và các tài liệu có liên quan.</p>
                  </div>
                </div>

                <p className="pt-1">Phòng Kinh tế kính trình Chủ tịch UBND xã Lãnh Ngọc xem xét, quyết định./.</p>
              </div>

              {/* SIGNATURE 3-COLUMN TABLE THEO NGHỊ ĐỊNH 30 */}
              <table className="sig-table w-full border-collapse border-none mt-8 text-center">
                <tbody>
                  <tr>
                    <td className="w-1/3 align-top border-none p-0 text-center" align="center" style={{ width: '33.3%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="font-bold text-xs text-black">Người lập biểu / Chuyên viên</div>
                      <div className="italic text-xs text-black">Kính trình!</div>
                      <div className="italic text-xs text-black">Ngày {currentDay} tháng {currentMonth} năm {currentYear}</div>
                      <div className="h-16"></div>
                      <div className="font-bold text-xs text-black">{officerRecorderName || 'Đoàn Văn Hoài Vũ'}</div>
                    </td>
                    <td className="w-1/3 align-top border-none p-0 text-center" align="center" style={{ width: '33.3%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="font-bold text-xs text-black">Ý kiến của Lãnh đạo Phòng</div>
                      <div className="italic text-xs text-black">Ngày {currentDay} tháng {currentMonth} năm {currentYear}</div>
                      <div className="h-16"></div>
                      <div className="font-bold text-xs text-black">Võ Tấn Lạt</div>
                    </td>
                    <td className="w-1/3 align-top border-none p-0 text-center" align="center" style={{ width: '33.4%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="font-bold text-xs text-black">Ý kiến của Lãnh đạo UBND xã</div>
                      <div className="italic text-xs text-black">Ngày {currentDay} tháng {currentMonth} năm {currentYear}</div>
                      <div className="h-16"></div>
                      <div className="font-bold text-xs text-black">Thái Công Cần</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 10: TỜ TRÌNH CẤP GCN (BƯỚC 6) - KHỚP 100% FILE GỐC */}
          {slipType === 'submission_totrinh' && (
            <div
              ref={printContentRef}
              style={{ fontFamily: "'Times New Roman', 'Tinos', Times, serif" }}
              className="admin-doc w-full min-w-[210mm] max-w-[210mm] min-h-[297mm] bg-white text-black p-8 sm:p-12 shadow-xl border border-gray-300 leading-relaxed text-xs sm:text-sm relative"
            >
              {/* HEADER TABLE THEO NGHỊ ĐỊNH 30 */}
              <table className="header-table w-full border-collapse border-none mb-3">
                <tbody>
                  <tr>
                    <td className="w-[45%] text-center align-top border-none p-0">
                      <div className="text-xs uppercase text-black">UBND XÃ LÃNH NGỌC</div>
                      <div className="text-xs uppercase font-bold text-black">PHÒNG KINH TẾ</div>
                      <div className="w-24 h-[1.5px] bg-black mx-auto my-1"></div>
                      <div className="text-xs font-mono font-bold text-black">
                        Số:       /TTr-KT
                      </div>
                    </td>
                    <td className="w-[55%] text-center align-top border-none p-0">
                      <div className="text-xs uppercase font-bold text-black">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                      <div className="text-xs font-bold text-black">Độc lập - Tự do - Hạnh phúc</div>
                      <div className="w-28 h-[1.5px] bg-black mx-auto my-1"></div>
                      <div className="text-[11px] text-black italic">
                        Lãnh Ngọc, ngày {currentDay} tháng {currentMonth} năm {currentYear}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="my-5 text-center">
                <h1 className="text-sm sm:text-base font-bold uppercase text-black tracking-tight">
                  TỜ TRÌNH
                </h1>
                <p className="text-xs font-bold text-black mt-1">
                  Về việc cấp Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất
                </p>
              </div>

              <div className="my-3 text-center font-bold text-xs text-black">
                Kính gửi: Chủ tịch Ủy ban nhân dân xã Lãnh Ngọc
              </div>

              {/* Exact content verbatim from media_1792160480480_293981f2.docx */}
              <div className="space-y-2.5 text-black text-justify leading-relaxed text-xs">
                <p>
                  Phòng Kinh tế nhận được Đơn đăng ký đất đai, tài sản gắn liền với đất (kèm theo các hồ sơ có liên quan) của <b>{dossier.owner}</b>, thường trú tại <b>{dossier.address || `${villageName}, xã Lãnh Ngọc, thành phố Đà Nẵng`}</b> về việc đề nghị đăng ký đất đai, tài sản gắn liền với đất và cấp Giấy chứng nhận quyền sử dụng đất đối với thửa đất số <b>{dossier.parcel}</b>, tờ bản đồ số <b>{dossier.mapSheet}</b>; tại {dossier.address || `${villageName}, xã Lãnh Ngọc, thành phố Đà Nẵng`}. Sau khi kiểm tra căn cứ quy định của pháp luật về đất đai, Phòng Kinh tế báo cáo Chủ tịch Ủy ban nhân dân xã như sau:
                </p>

                <div>
                  <h3 className="font-bold text-black text-xs uppercase">1. Căn cứ pháp lý:</h3>
                  <div className="space-y-1 pl-3 pt-1">
                    <p>Căn cứ Luật Tổ chức chính quyền địa phương số 72/2025/QH15 ngày 16/6/2025;</p>
                    <p>Căn cứ Luật Đất đai số 31/2024/QH15; Luật số 43/2024/QH15 sửa đổi, bổ sung một số điều của Luật đất đai số 31/2024/QH15, Luật nhà ở số 27/2023/QH15, Luật kinh doanh bất động sản số 29/2023/QH15 và Luật các tổ chức tín dụng số 32/2024/QH15;</p>
                    <p>Căn cứ Nghị quyết số 254/2025/QH15 ngày 11 tháng 12 năm 2025 của Quốc hội quy định một số cơ chế, chính sách tháo gỡ khó khăn, vướng mắc trong tổ chức thi hành Luật Đất đai;</p>
                    <p>Căn cứ Nghị định số 101/2024/NĐ-CP ngày 29/7/2024 của Chính phủ Quy định về điều tra cơ bản đất đai; đăng ký, cấp Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất và Hệ thống thông tin đất đai;</p>
                    <p>Căn cứ Nghị định số 102/2024/NĐ-CP ngày 30 tháng 7 năm 2024, quy định chi tiết thi hành một số điều của Luật Đất đai;</p>
                    <p>Căn cứ Nghị định số 151/2025/NĐ-CP ngày 12/6/2025 của Chính phủ quy định về phân định thẩm quyền của chính quyền địa phương 02 cấp, phân quyền, phân cấp trong lĩnh vực đất đai;</p>
                    <p>Căn cứ Nghị định số 226/2025/NĐ-CP ngày 15/8/2025 của Chính phủ quy định về sửa đổi, bổ sung một số điều của các nghị định quy định chi tiết thi hành Luật Đất đai;</p>
                    <p>Căn cứ Nghị định số 49/2026/NĐ-CP ngày 31 tháng 01 năm 2026 của Chính phủ quy định chi tiết và hướng dẫn một số điều của Nghị quyết số 254/2025/QH15 của Quốc hội quy định một số cơ chế, chính sách tháo gỡ khó khăn, vướng mắc trong tổ chức thi hành Luật Đất đai;</p>
                    <p>Căn cứ Thông tư số 10/2024/TT-BTNMT ngày 31/7/2024 của Bộ Tài nguyên và Môi trường quy định về hồ sơ địa chính, Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất;</p>
                    <p>Căn cứ Thông tư số 23/2025/TT-BNNMT ngày 20 tháng 6 năm 2025 của Bộ trưởng Bộ Nông nghiệp và Môi trường quy định về phân cấp, phân định thẩm quyền quản lý nhà nước trong lĩnh vực đất đai;</p>
                    <p>Căn cứ Quyết định số 75/2026/QĐ-UBND ngày 30/5/2026 của UBND thành phố Đà Nẵng ban hành quy định một số nội dung thuộc lĩnh vực đất đai trên địa bàn thành phố Đà Nẵng;</p>
                    <p>Căn cứ Quyết định số 91/2026/QĐ-UBND ngày 22 tháng 6 năm 2026 của UBND thành phố Đà Nẵng quy định về phân cấp một số nhiệm vụ trong lĩnh vực đất đai trên địa bàn thành phố Đà Nẵng.</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-black text-xs uppercase">2. Căn cứ hồ sơ đề nghị đăng ký đất đai, tài sản gắn liền với đất:</h3>
                  <div className="space-y-1 pl-3 pt-1">
                    <p>Hồ sơ của <b>{dossier.owner}</b> gồm:</p>
                    <p>- Biên bản kiểm tra hiện trạng sử dụng đất của {dossier.owner}.</p>
                    <p>- Danh sách niêm yết công khai và biên bản kết thúc niêm yết công khai kết quả kiểm tra hồ sơ đăng ký, cấp giấy chứng nhận quyền sử dụng đất đối với thửa đất số {dossier.parcel} tờ bản đồ số {dossier.mapSheet} của {dossier.owner}.</p>
                    <p>- Đơn đăng ký đất đai, tài sản gắn liền với đất của {dossier.owner};</p>
                    <p>- Các tài liệu khác có liên quan theo thành phần hồ sơ.</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-black text-xs uppercase">3. Kết quả kiểm tra hồ sơ:</h3>
                  <div className="space-y-1 pl-3 pt-1">
                    <p>- Về nguồn gốc đất: Do hộ <b>{dossier.owner}</b> khai hoang canh tác sử dụng từ năm <b>{parcels[0]?.usageTime || '1990'}</b> đến nay không tranh chấp.</p>
                    <p>- Thành phần hồ sơ đảm bảo theo quy định về thực hiện thủ tục đăng ký đất đai, cấp Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất lần đầu.</p>
                    <p>- Về việc thực hiện nghĩa vụ tài chính: <b>{dossier.owner}</b> đã thực hiện nộp xong nghĩa vụ tài chính.</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-black text-xs uppercase">4. Đề xuất, kiến nghị:</h3>
                  <div className="space-y-1.5 pl-3 pt-1">
                    <p>Qua kiểm tra hồ sơ, đối chiếu các quy định của Luật Đất đai và các văn bản quy định chi tiết thi hành, Phòng Kinh tế nhận thấy hồ sơ đăng ký đất đai, tài sản gắn liền với đất và đề nghị cấp Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất lần đầu của <b>{dossier.owner}</b> đã được kiểm tra, niêm yết công khai theo quy định; người sử dụng đất đã thực hiện đầy đủ nghĩa vụ tài chính theo thông báo của cơ quan thuế.</p>
                    <p>Căn cứ Nghị định số 101/2024/NĐ-CP, Nghị định số 102/2024/NĐ-CP và các văn bản sửa đổi, bổ sung có liên quan; căn cứ Nghị định số 151/2025/NĐ-CP, Nghị định số 226/2025/NĐ-CP, Nghị định số 49/2026/NĐ-CP và Quyết định số 91/2026/QĐ-UBND ngày 22/6/2026 của UBND thành phố Đà Nẵng về phân cấp một số nhiệm vụ trong lĩnh vực đất đai, hồ sơ của <b>{dossier.owner}</b> thuộc trường hợp Chủ tịch UBND cấp xã thực hiện thẩm quyền công nhận quyền sử dụng đất theo quy định.</p>
                    <p>Phòng Kinh tế kính trình Chủ tịch UBND xã Lãnh Ngọc xem xét, quyết định cấp Giấy chứng nhận quyền sử dụng đất, quyền sở hữu tài sản gắn liền với đất cho <b>{dossier.owner}</b> đối với:</p>
                    <div className="pl-3 space-y-0.5">
                      <p>- Thửa đất số <b>{dossier.parcel}</b>, tờ bản đồ số <b>{dossier.mapSheet}</b>;</p>
                      <p>+ Địa chỉ thửa đất: {dossier.address || `${villageName}, xã Lãnh Ngọc, thành phố Đà Nẵng`};</p>
                      <p>+ Diện tích: <b>{parcels[0]?.area || totalLandArea} m²</b></p>
                      <p>+ Mục đích sử dụng: Đất ở: <b>{residentialArea} m²</b>; đất trồng cây lâu năm: <b>{agricultureArea} m²</b>;</p>
                      <p>+ Thời hạn sử dụng đất: Đất ở: Lâu dài; đất trồng cây lâu năm: 50 năm kể từ ngày cấp Giấy chứng nhận.</p>
                      <p>+ Vị trí, ranh giới thửa đất được xác định theo trích đo bản đồ địa chính số {trichDoNumber}, tỷ lệ 1/1000, do Chi nhánh Văn phòng Đăng ký đất đai Tiên Phước duyệt ngày {trichDoDate}.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-black text-xs uppercase">5. Hồ sơ kèm theo:</h3>
                  <div className="space-y-0.5 pl-3 pt-1">
                    <p>5.1. {taxNotice1};</p>
                    <p>5.2. {taxNotice2};</p>
                    <p>5.3. {taxConfirmNotice};</p>
                    <p>5.4. Phôi Giấy chứng nhận quyền sử dụng đất đề nghị cấp cho <b>{dossier.owner}</b>;</p>
                    <p>5.5. Vị trí, ranh giới thửa đất được xác định theo trích đo bản đồ địa chính số {trichDoNumber}, tỷ lệ 1/1000, do Chi nhánh Văn phòng Đăng ký đất đai Tiên Phước duyệt ngày {trichDoDate};</p>
                    <p>5.6. Hồ sơ đề nghị đăng ký đất đai, tài sản gắn liền với đất.</p>
                  </div>
                </div>

                <p className="pt-1">Kính trình Lãnh đạo UBND xã Lãnh Ngọc xem xét, quyết định./.</p>
              </div>

              {/* SIGNATURE & NƠI NHẬN TABLE THEO NGHỊ ĐỊNH 30 */}
              <table className="sig-table w-full border-collapse border-none mt-8">
                <tbody>
                  <tr>
                    <td className="noi-nhan w-[45%] align-top border-none p-0 text-left text-xs text-black space-y-0.5" align="left" style={{ width: '45%', textAlign: 'left', verticalAlign: 'top', border: 'none', padding: 0, paddingLeft: 0, marginLeft: 0 }}>
                      <p className="font-bold text-black" align="left" style={{ textAlign: 'left', fontWeight: 'bold' }}>Nơi nhận:</p>
                      <p align="left" style={{ textAlign: 'left' }}>- Như trên;</p>
                      <p align="left" style={{ textAlign: 'left' }}>- Lưu: VT, PKT.</p>
                    </td>
                    <td className="w-[55%] text-center align-top border-none p-0" align="center" style={{ width: '55%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: 0 }}>
                      <div className="font-bold text-xs uppercase text-black">KT. TRƯỞNG PHÒNG</div>
                      <div className="font-bold text-xs uppercase text-black">PHÓ TRƯỞNG PHÒNG</div>
                      <div className="h-16"></div>
                      <div className="font-bold text-xs text-black">Võ Tấn Lạt</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
