# DANANG LAND & TASK MANAGEMENT - PHIÊN BẢN CHUẨN V1.0 (CANONICAL CHECKPOINT)

**Thời điểm ghi nhớ:** 25/09/2026  
**Mã phiên bản:** `v1.0-canonical-stable`  
**File sao lưu chuẩn hệ thống:** `data/snapshot_v1.0_canonical.json` và `data/backups/snapshot_version_v1.0_golden_checkpoint.json`

---

## 1. CÁC TÍNH NĂNG ĐẶC TRƯNG CỦA PHIÊN BẢN V1.0

### Giao diện & Điều hành (Dashboard)
- **Biểu đồ Recharts Donut & Bar Chart** tóm tắt tình hình hồ sơ đất đai:
  - Đang làm / Đang thụ lý (`#2563eb`)
  - Chờ xử lý / Bổ sung Mẫu 02 / Tạm dừng (`#f59e0b`)
  - Đã hoàn thành (`#10b981`)
  - Quá hạn / Cần gấp (`#ef4444`)
  - Phân bổ hồ sơ theo Cán bộ thụ lý (Lê Văn Liệu, Đoàn Văn Hoài Vũ, Phùng Thanh Tín,...)
  - Nhấp trực tiếp vào biểu đồ để lọc danh sách hồ sơ tương ứng.
- **Hệ thống 7 Thẻ KPI công việc & hồ sơ** với thanh màu `border-l-4`.
- **Banner Dự án Bồi thường & GPMB** tích hợp nhanh.
- **Phân loại công việc theo lĩnh vực đất đai**, Deadline 7 ngày tới, và Nhật ký hoạt động gần đây.

### Quản lý Hồ sơ Đất đai (Dossiers)
- 70 hồ sơ đất đai chuẩn ban đầu với đầy đủ thông tin: Chủ hộ, thửa đất, tờ bản đồ, thủ tục TTHC, hạn giải quyết, kẹp lưu trữ giấy (Kẹp 1, Kẹp 2, Kẹp 3), STT kẹp.
- In phiếu tiếp nhận / Giấy hẹn có mã QR xác thực.
- Quy trình Yêu cầu bổ sung hồ sơ (Mẫu số 02) tính lại thời hạn từ đầu.
- Quy trình Tạm dừng hồ sơ đóng băng số ngày quá hạn.
- In thẻ bìa hồ sơ lưu trữ kẹp giấy theo TCVN.
- Nhập/Xuất dữ liệu Excel chuyên nghiệp.
- Nhắc hạn tự động qua Telegram Bot.

### Quản lý Công việc & Giao việc (Tasks)
- Giao việc theo cán bộ, lĩnh vực địa chính, ngày bắt đầu, ngày đến hạn.
- Liên kết nhiệm vụ với hồ sơ đất đai hoặc dự án GPMB.
- Tự động cảnh báo trước hạn 20 ngày.
- Đính kèm tệp kết quả và biên bản thực địa.

### Cơ chế Chống Mất Dữ Liệu Bền Vững (Zero Data Loss Architecture)
- **LocalVault (IndexedDB + LocalStorage)**: Toàn bộ hồ sơ được lưu an toàn trên ổ cứng máy tính cá nhân; khi tắt máy và mở lại ngày hôm sau dữ liệu được nạp tức thì và tự động đối soát với máy chủ.
- **Tự động lưu nháp (`useModalDraft`)**: Cả 3 biểu mẫu `DossierModal`, `TaskModal`, `DocumentModal` tự động lưu nháp sau mỗi 600ms và mỗi 4 giây, tự động khôi phục khi gặp sự cố gián đoạn.
- **Bảo hiểm Server Atomic Mirror**: Mỗi lần lưu vào `db.json` đều tạo đồng thời bản sao lưu mirror `db.json.bak` và lưu vào thư mục `data/backups/`.
- **Tự phục hồi dữ liệu từ bản sao lưu (`tryRecoverFromBackups`)**: Nếu server khởi động lại mà dữ liệu chính bị trống hoặc lỗi, tự động quét và nạp bản sao lưu mới nhất.

---

## 2. QUY TRÌNH KHÔI PHỤC KHI ĐƯỢC YÊU CẦU:
Khi người dùng yêu cầu: *"khôi phục lại phiên bản v1.0"*, hệ thống sẽ:
1. Sao chép nội dung từ `data/snapshot_v1.0_canonical.json` vào `data/db.json` và `data/db.json.bak`.
2. Kích hoạt khôi phục toàn bộ mã nguồn, cấu hình dashboard và các biểu mẫu về đúng trạng thái của Manifest này.
