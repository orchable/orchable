# Báo cáo rà soát cấu trúc Tier (Lite Mode & Login Mode)

## 1. Giới thiệu
Báo cáo này đối chiếu tình trạng hiện tại của mã nguồn dự án `orchable` so với kế hoạch Implementation Plan của giai đoạn trước (`61d7ae40-8496-4369-aac4-1ae545aa47a2`), nhằm đánh giá mức độ hoàn thiện của kiến trúc đa bậc (Anonymous Lite, Free, Premium).

## 2. Kết quả đối chiếu với Implementation Plan

### 2.1. Nền tảng Storage (Storage Adapter Layer)
* **Kỳ vọng:** Phải có một interface `IStorageAdapter` bọc các thao tác DB. `IndexedDBAdapter` dành cho Lite Mode và `SupabaseAdapter` cho Login Mode.
* **Thực tế:** **ĐÃ TRIỂN KHAI (90%)**.
  * Các file kiến trúc như `IndexedDBAdapter.ts` (dùng Dexie), `SupabaseAdapter.ts` và `StorageAdapter.ts` đều đã có mặt trong `src/lib/storage`.
  * Các file service như `executionService.ts`, `taskActionService.ts`, `batchService.ts` đã sử dụng `storage.adapter` để tự chọn DB tương ứng.
  * **Điểm thiếu sót:** `configService.ts` (quản lý Orchestrator Configs) hiện tại chưa đi qua Storage Adapter mà vẫn gọi trực tiếp `supabase.from(...)`. Do đó, người dùng chưa đăng nhập không thể tải cấu hình (config), dẫn đến việc không the khởi chạy Launcher trong màn hình Guest Mode một cách độc lập hoàn toàn.

### 2.2. Tiến trình thực thi nền web (In-Browser Task Executor)
* **Kỳ vọng:** Chạy Web Worker ở background của trình duyệt (thay vì n8n) cho Lite Tier.
* **Thực tế:** **ĐÃ CẤU TRÚC**.
  * Tồn tại `src/workers/taskExecutor.worker.ts` và `src/services/executorService.ts`.
  * Tuy nhiên, theo ghi nhận thực tế trên UI (như nút Run bằng n8n), quy trình `Launcher` hiện tại vẫn đang mix logic gọi Supabase `task_batches` và trigger thẳng vào `n8nService.ts` (hành động `triggerMasterWorkflow`). Mức độ tích hợp WebWorker 100% thay thế hệ thống cũ cho Guest Mode dường như chưa kết nối hoàn thiện với giao diện Launcher.

### 2.3. Logic Gate & Context (Tier Context)
* **Kỳ vọng:** Có `TierContext` để phân luồng người dùng thành `anonymous`, `free` và `premium`.
* **Thực tế:** **ĐÃ TRIỂN KHAI HOÀN TOÀN**. 
  * File `TierContext.tsx` kiểm tra `useAuth()`. Nếu không có user -> `anonymous`. Nếu có user thực -> `free` hoặc `premium` (định danh bằng email `makexyzfun@gmail.com`). 
  * Cung cấp các biến Boolean (`isLite`, `isPremium`) và phân tầng giới hạn usage chính xác.

### 2.4. Tính năng đồng bộ đám mây (Sync Service & Phase 2)
* **Kỳ vọng:** Đồng bộ dữ liệu tác vụ và batch từ IndexedDB lên Supabase khi User từ Guest đăng nhập vào tài khoản.
* **Thực tế:** **ĐÃ TRIỂN KHAI**. 
  * `syncService.ts` đã được xây dựng. `TierContext.tsx` tự động chạy hàm `syncService.migrateAnonymousData()` mỗi khi trạng thái đăng nhập thay đổi. 

## 3. Tổng kết tình hình đáp ứng kỳ vọng

### 🎯 Đối với Lite mode (Unauthenticated user tier)
* Mã nguồn **đã có bộ khung Storage cục bộ (IndexedDB)** và **Task Executor Worker** để chạy nền mà không cần cloud backend.
* **Vấn đề cốt lõi kìm hãm:** `configService` chưa dùng IndexedDB. Điều này khiến cho người dùng chưa đăng nhập gặp khó khăn/lỗi khi muốn xem hoặc tạo Orchestrator pipeline, vì app cố gắng lấy thông tin Config từ Supabase, dẫn đến mảng rỗng theo như bản vá lỗi trước đó.
* **Đánh giá:** Chỉ đáp ứng **~70%** Lite Mode do gãy kết nối giữa UI và Local Storage ở phần Configuration.

### 🎯 Đối với Login Mode (Authenticated User tier)
* Hệ thống hoạt động **rất trơn tru**. Lớp `SupabaseAdapter` làm rất tốt việc map dữ liệu.
* Khi có User Authentication, các luồng từ cấu hình, chạy tiến trình (qua DB tạo `task_batches`) cho tới báo cáo kết quả đều liền mạch. 
* Lỗi phân quyền của Dashboard và truy cập cấu hình trái pháp vừa được xử lý, đảm bảo 100% dữ liệu config là Private với từng User (created_by filter).
* Đồng bộ usage/limits cũng đã online.
* **Đánh giá:** Đáp ứng **100%** kỳ vọng kỹ thuật cho Tier có định danh.

## 4. Công việc khuyến nghị tiếp theo (Next Steps)
Để biến Orchable thành công cụ SaaS hoàn hảo (cho phép dùng thử không cần đăng nhập thực sự):
1. **Đưa Configuration vào Storage Adapter**: Sửa lại `configService.ts` để lưu `lab_orchestrator_configs` xuống `storage.adapter`. Khi đó, User ở trạng thái Guest vẫn xem được danh sách Config (đọc từ IndexedDB cục bộ) mà không bị trống trơn mặt UI.
2. **Loại bỏ n8nService khỏi Guest Launch**: Ở trang Launcher, bảo đảm hàm thực thi chạy bằng `executorService.ts (Web Worker)` khi ở Lite Mode, không bắt buộc gọi API trigger của n8n.
