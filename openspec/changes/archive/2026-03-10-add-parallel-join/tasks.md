## 1. Cập nhật Model và Type
- [x] 1.1 Thêm `dependsOn: string[]` vào `PromptTemplateRecord.stage_config` object trong `src/lib/types.ts` (nếu chưa có).
- [x] 1.2 Bổ sung `batch_grouping: "global" | "isolated"` cho Parallel Join (có thể dùng lại cờ hiện có của N:1).

## 2. Lưu trữ Dependency Graph
- [x] 2.1 Cập nhật `syncStagesToPromptTemplates` trong `src/services/stageService.ts` để lưu toàn bộ mảng `dependsOn` của một stage vào cấu hình `stage_config` của template tương ứng.

## 3. Worker Logic: "Trì hoãn sinh Task" (Late Task Spawning)
- [x] 3.1 Trong `src/workers/taskExecutor.worker.ts`, cập nhật hàm `handleNextStages`.
- [x] 3.2 Sinh logic kiểm tra `checkDependenciesMet` trước khi gọi `db.ai_tasks.add`:
  - **Global Mode:** Truy vấn tất cả các task thuộc `dependsOn` (theo `launch_id`) đã hoàn thành chưa.
  - **Isolated Mode:** Truy vấn tất cả các task thuộc `dependsOn` có chung ID trong mảng `hierarchy_path` đã hoàn thành chưa.
- [x] 3.3 Nếu chưa hoàn thành (thiếu bất kỳ nhánh nào): `return` sớm.

## 4. Worker Logic: Payload Merging (Gộp Data)
- [x] 4.1 Bổ sung hàm gộp Output Data của tất cả các Dependency.
- [x] 4.2 Lưu dữ liệu gộp vào Input Data của Task đích theo format Namespace: `{ [parent_stage_key]: output_data }`.
- [x] 4.3 Khởi tạo Task đích với Payload đã Merge.

## 5. UI / Designer
- [x] 5.1 Cập nhật Designer UI để hiển thị trực quan các đường nối Parallel Join.
- [x] 5.2 (Tuỳ chọn) Đảm bảo tuỳ chọn `Isolated` hay `Global` Join có thể được người dùng custom.
