## Context
Hiện tại, logic xử lý Worker của Orchable (Free Tier) đang hỗ trợ luồng 1:N (phân tách mảng) và N:1 (gộp mảng). 
Tuy nhiên, khi đối mặt với kiến trúc DAG thực thụ (Parallel Luồng xử lý độc lập trỏ về chung 1 đích, ví dụ: Stage A -> Stage C VÀ Stage B -> Stage C), Worker hoạt động theo nguyên tắc kết thúc sớm: ngay khi A kết thúc, nhiệm vụ C được tạo ra; sau đó B kết thúc, lại sinh thêm một nhiệm vụ C nữa. Điều này làm mất ý nghĩa của Join Stage.

## Goals / Non-Goals
- **Goals:** 
  - Hỗ trợ gộp kết quả từ nhiều nhánh song song lại với nhau trước khi chạy bước tiếp theo.
  - Phân loại rõ Gộp Toàn Cục (Global Join - đợi tất cả các nhánh) và Gộp Theo Nhánh (Isolated Join - chờ luồng hoàn thành trong từng nhánh phân tách).
  - Tích hợp không làm ảnh hưởng đến cơ chế merge array (N:1) hiện hành.
  - Không sinh thêm bất kỳ trường thông tin hay table mới trong Database.
- **Non-Goals:**
  - Viết lại toàn bộ Web Worker engine (giữ vững kiến trúc IndexedDB pub/sub hiện tại).

## Decisions
- **Decision 1: Quản lý Dependency Graph qua `stage_config`:** Lưu trữ và kế thừa `dependsOn: string[]` từ cấu hình gốc của Designer vào `prompt_templates.stage_config`.
- **Decision 2: "Trì hoãn sinh Task":** Để xử lý DAG Join, thay vì kích hoạt Task đích ngay lập tức, Worker sẽ kiểm tra chéo các Stage kề cận nằm trong danh sách `dependsOn`. Nếu mọi dependency chưa hoàn tất (trạng thái `completed` hoặc `failed`), Worker đơn giản là return và im lặng kết thúc. "Người về bờ cuối cùng" sẽ là người tạo ra Task đích.
- **Decision 3: Isolated Join qua `hierarchy_path`:** Đối với luồng phức tạp vừa phân tách 1:N vừa gộp song song, Isolated Join sẽ sử dụng cấu trúc `hierarchy_path` (lưu mọi parent ID của 1 task) để nhóm các task có chung gốc lại với nhau. Điều này tránh gộp nhầm dữ liệu giữa Branch 1 và Branch 2.
- **Decision 4: Payload Namespace:** Để gộp dữ liệu mà không ghi đè cấu trúc schema nhau, Task đích sẽ nhận bộ Input Data theo Namespace:
  ```json
  {
    "stage_A_key": { ...output từ A },
    "stage_B_key": { ...output từ B }
  }
  ```

## Risks / Trade-offs
- **Thêm độ chậm (Wait time):** Chế độ Global Join sẽ khiến hệ thống phải đợi toàn bộ Job kéo về đích (Task cuối cùng hoàn tất) thì mới xử lý nút thắt. Khó tránh đối với nguyên lý DAG.
- **Logic Kiểm Tra (Race Condition):** Phải đảm bảo logic `checkDependenciesMet` nằm gọn trong `db.transaction("rw", ...)` ở `taskExecutor.worker.ts` để chặn triệt để tình trạng 2 task hoàn thành cùng một mili-giây và vô tình sinh ra 2 Task đích.

## Migration Plan
Không cần migration DB do tận dụng trường `hierarchy_path` và `stage_config` sẵn có. Các Workflow cũ chưa có thuộc tính `dependsOn` sẽ bỏ qua check dependency và hoạt động y như cũ.

## Open Questions
- Designer UI cần được tinh chỉnh để hiện thực hóa `Global Join` vs `Isolated Join` dưới mắt người dùng một cách trực quan, tránh gây nhầm lẫn với nút gộp cardinality `N:1` hiện có.
