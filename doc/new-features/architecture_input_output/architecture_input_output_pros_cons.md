# Phân tích Ưu & Nhược điểm (PROS & CONS): Lookup + Global Context Architecture

Việc sử dụng mô hình **Asset Library (Document Lookup) kết hợp với Global Context cấp Batch** là một thiết kế chia tách rõ ràng (decoupled), nhưng mang lại một số đánh đổi nhất định. Dưới đây là phân tích kỹ lưỡng các khía cạnh Kỹ thuật và Trải nghiệm Người dùng (UX).

---

## 1. Mảng Input (Auxiliary Documents & Global Context)

### 🟢 PROS (Ưu điểm)

1. **Hiệu suất Cơ sở dữ liệu Xuất sắc (O(1) Storage vs O(N)):**
   *   Nếu một file PDF dài 100KB được inject cho 10,000 tasks con. Thay vì lưu 10,000 bản sao (gây phình DB lên 1GB chỉ cho 1 batch), ta chỉ lưu **đúng 1 bản** trong `task_batches.global_context`. DB Postgres/IndexedDB sẽ không bị "nghẽn cổ chai" (I/O bottleneck) khi insert tasks.
   
2. **Reuse Data cực tốt (Reusability):**
   *   Nhờ Asset Library, user upload file `Rubric_Toan_Lop3.pdf` một lần. Nó sẽ có mã ID riêng. User có thể dùng lại nó cho 100 Orchestrator Configurations khác nhau mà không cần upload lại.
   *   Phù hợp mảng "Share to Hub": Khi user share tài sản, Document này cũng có thể được export đi kèm.

3. **Cập nhật theo thời gian thực (Hot-swap Config):**
   *   User có thể vào Asset Library sửa nội dung file "System Message Chung". Mọi Batch chạy SAU ĐÓ sẽ tự động lấy nội dung mới nhất mà không chạm vào thiết kế của Pipeline.

4. **Giữ Payload của N8n / Local Executor Siêu Nhẹ:**
   *   Trong lúc chuyển state giữa các node, N8n flow / UI không phải truyền theo "cục tạ" dữ liệu 100KB qua mỗi bước. Context chỉ được load CHÍNH XÁC ngay trước lúc ném vào LLM.

### 🔴 CONS (Nhược điểm / Rủi ro cần xử lý)

1. **Vấn đề Data Snapshotting (Tính bất biến của Batch cũ):**
   *   **Rủi ro:** Nếu user chạy Batch A dùng Document X. Sau đó rảnh rỗi vào Asset Library *sửa* nội dung Document X. Khi xem lại lịch sử chạy của Batch A, prompt được hiển thị có thể không khớp với sự thật lúc chạy.
   *   **Cách khắc phục:** Launcher **BẮT BUỘC** phải copy toán bộ nội dung text của file vào `task_batches.global_context` LÚC BẤM RUN. (Thiết kế hiện tại của tôi đã cover vụ này bằng `global_context`).
   
2. **Khó khăn khi Debugging cho User:**
   *   Vì dữ liệu phụ (Aux) bị hide vào `global_context`, ở trang "Monitor / Task Detail", nếu user chỉ nhìn vào `input_data` của từng task, họ sẽ KHÔNG thấy Document Context đâu (chỉ thấy cái biến `%%global_context.XYZ%%`).
   *   **Cách khắc phục:** UI trang Monitor phải thiết kế thêm một tab "Global Context" hoặc tự động render preview các biến `%%...%%` để user dễ debug Prompt.

3. **Limit Độ dài Prompt Trực tiếp:**
   *   Bằng việc inject thẳng Text khổng lồ (từ PDF/CSV) vào `global_context` trước lúc vào model, ta phó thác hoàn toàn việc xử lý độ dài này cho Model Context Window (của Gemini). Nếu file PDF quá tải giới hạn token (e.g. > 1 triệu token), luồng sẽ chết thẳng cẳng.
   *   **(Future-proofing):** Cách này không thay thế được RAG (Retrieval-Augmented Generation). Text ngắn thì ổn, Text siêu dài đáng lý phải dùng Vector Search, không thể nhồi kiểu biến tĩnh `%%...%%`.

4. **Kích thước Local Storage (Free Tier):**
   *   Việc parse PDF/Image để lưu lấy text/base64 trong IndexedDB đòi hỏi logic xử lý ở Frontend khá phức tạp (cần thư viện parse PDF.js etc.). 

---

## 2. Mảng Output Nodes (Tách rời khỏi AI Stage)

### 🟢 PROS (Ưu điểm)

1. **Multiplexing Dễ dàng (Tỏa tia):**
   *   Một Pipeline kết thúc có thể "bắn" dữ liệu ra 3 đường song song cùng lúc: (1) Lưu file CSV cho tải, (2) Đẩy lên Google Sheets cho team Sales check, (3) Bắn Webhook sang ERP nội bộ.
   *   Chỉ cần thêm nhiều Output nodes nối vào Stage cuối cùng; Logic AI Stage không bị trộn lẫn với Logic Delivery.

2. **Khôi phục Lỗi (Error Isolation):**
   *   Giả sử việc xuất sang Google Sheets bị lỗi mạng. Vì Output là Node riêng, Batch status vẫn là `completed_generation`. User chỉ cần bấm nút "Retry Output" thay vì phải chạy lại AI prompt tốn tiền (hoặc tốn quota free).

### 🔴 CONS (Nhược điểm)

1. **Phức tạp về Logic "Lúc nào thì Output chạy?":**
   *   Mô hình Batch hiện tại xử lý phân tán: Task hoàn thành rải rác.
   *   Nếu Output Node là "Write to Google Sheet (1 cục bự)", hệ thống phải CHỜ đến khi TẤT CẢ sub-tasks của Batch báo trạng thái "Xong". Hiện tại ta chưa có cơ chế Watcher/Trigger cho Event "Batch Done". Sẽ phải viết thêm Cron Job hoặc Subcription Lắng nghe sự kiện này.
   *   *Alternative:* Nếu Output Node dạng "Stream" (Xong task nào ném lên GG Sheet task đó), nó sẽ phá vỡ tính năng "Approval" (Kiểm duyệt trước khi xuất) mà bạn dùng trong Stage cấu hình.

2. **Dữ liệu nào sẽ được đưa vào Output?**
   *   Một Pipeline có Stage A (Tạo câu hỏi) -> Stage B (Format câu hỏi) -> Stage C (Kiểm duyệt).
   *   Output node nối sau C. Vậy Output chỉ in ra kết quả của C? Hay in ra cả `output` của A và B?
   *   **Cách khắc phục:** Output Node cần một field config `Data Mapping` (ví dụ: Cột 1 lấy từ Stage A.question, Cột 2 lấy từ Stage C.feedback). Nghĩa là phải viết thêm Mapping UI phức tạp cho Designer.

---

## TỔNG KẾT: Có đáng làm không?

**YES, BẮT BUỘC NÊN LÀM.**
Dù việc lập trình UI cho Data Mapping ở Output Node hay Document Manager sẽ vất vả, nhưng đây là bước chuyển mình từ một "Tool tự động chạy chuỗi Prompt" thành một **"Data Transformation Engine"** thực thụ giống N8n/Zapier. 

**Tuy nhiên, nên cắt nhỏ tham vọng cho Phase 1:**
1. Rủi ro nặng nhất nằm ở Output Mapping.
2. Rủi ro thứ hai ở việc Parse PDF/File cho Free Tier (Local).
=> **Phase 1** nên chỉ hỗ trợ file `TXT/CSV/MD` làm Document Aux Input. Output Node Phase 1 chỉ hỗ trợ Download File CSV chứa `output_data` của Stage cuối cùng (chưa có Google Sheets hay Mapping phức tạp).
