# Change: Hỗ trợ Parallel DAG Join (Gộp luồng song song)

## Why
Trong hệ thống Orchestration hiện tại, việc gộp phân nhánh (N:1) hoạt động tốt, nhưng tính năng gộp luồng song song (Parallel Join, VD: A -> C và B -> C) chưa được tối ưu, dẫn đến việc Task C bị sinh ra nhiều lần (mỗi lần cho từng nhánh A và B kết thúc). Để hoàn thiện Map-Reduce DAG, hệ thống cần hỗ trợ gom các luồng song song lại thành 1 (hoặc `n` theo nhóm) trước khi thực thi Stage đích.

## What Changes
- **MODIFIED**: Thay vì tạo Task ngay khi 1 tiền trình (parent) kết thúc, Worker sẽ kiểm tra Dependency Tree. 
- **ADDED**: Chế độ gộp `Global Join` (chờ toàn bộ luồng kết thúc) và `Isolated Join` (chỉ chờ các nhánh cùng chung nguồn gốc `hierarchy_path`).
- **MODIFIED**: Dữ liệu đầu vào của Task Join được đưa vào Namespace tương ứng với Parent Stage Key để tránh ghi đè (VD: `input_data: { A: {...}, B: {...} }`).

## Impact
- Specs: `specs/orchestration/spec.md`
- Code: 
  - `src/services/stageService.ts`
  - `src/workers/taskExecutor.worker.ts`
  - `src/lib/types.ts`
