# Tích hợp Gemini Context Caching cho Auxiliary Inputs

Việc bạn đề xuất sử dụng **Context Caching** của Gemini là một bước đi cực kỳ xuất sắc. Nó giải quyết triệt để nhược điểm lớn nhất của mô hình Global Context: **Bùng nổ chi phí token và giới hạn Context Window** khi truyền tài liệu lớn (như nguyên cuốn sách giáo khoa, toàn bộ codebase, hoặc bộ rubric phức tạp) vào hàng nghìn task con.

## 1. Bản chất của Gemini Context Caching
- **Nguyên lý:** Thay vì gửi file PDF 100,000 token kèm theo *mỗi* prompt (ví dụ 1,000 task = 100 triệu token input), ta gửi file PDF đó cho Gemini **khi bắt đầu Batch** để tạo một bộ đệm (Cache). Gemini trả về một `cache_id` (ví dụ: `cachedContents/12345`).
- **Lúc chạy task:** Mỗi task con (1,000 task) chỉ cần gửi câu prompt ngắn xíu kèm theo cái `cache_id` đó.
- **Lợi ích:**
  - **Giảm chi phí cực mạnh:** Phí đọc token từ cache rẻ hơn 4 lần so với phí đọc token mới.
  - **Độ trễ (Latency) siêu thấp:** Gemini không phải đọc lại PDF cho mỗi task, tốc độ phản hồi tăng vọt.
  - **Vượt qua giới hạn độ dài:** Xử lý dễ dàng Document lên tới 2 triệu token mà không sợ timeout của HTTP request.

## 2. Thiết kế Kiến trúc Tích hợp (Caching Architecture)

### 2.1 Cập nhật Orchestrator V2 (Launcher Node)
Khi user bấm **"Launch"**, hệ thống xác định xem Batch này có sử dụng Auxiliary Input (các Document từ Asset Library) hay không.

- **Bước 1: Kiểm tra Điều kiện Caching:**
  - Tổng số token của các Document có > 32,000 token (Giới hạn tối thiểu Gemini ưu tiên cache)?
  - API Key đang dùng có hỗ trợ Caching không (Free key của Google AI Studio bị cấm tính năng này)?
- **Bước 2: Khởi tạo Cache (Pre-computation):**
  - Nếu đủ điều kiện, **Launcher** lấy nội dung các Auxiliary Documents (Text/PDF) gọi lên endpoint `/v1beta/cachedContents` của Gemini API.
  - Nhận về tham chiếu (VD: `cachedContents/abc-xyz`).
- **Bước 3: Lưu Global Context thông minh:**
  - Thay vì kéo văn bản khổng lồ vào database, bảng `task_batches.global_context` giờ đây chỉ lưu ID nhỏ gọn:
    ```json
    {
      "gemini_cache_name": "cachedContents/abc-xyz",
      "ttl": 60, // Phút (Thời gian sống của cache)
      "cached_keys": ["rubric", "syllabus"] // Để prompt editor biết key này đã được ngầm chèn bằng cache
    }
    ```

### 2.2 Thực thi tại AI Stage (Local Worker / N8n)
Khi WebWorker (hoặc node n8n) thực thi 1 task ở Stage bất kỳ:

1. Đọc cục `global_context` của Batch.
2. Thấy biến `gemini_cache_name`. Nó hiểu rằng Document gốc ĐÃ NẰM SẴN trên máy chủ của Google.
3. Khi parse Payload gửi cho Gemini, thay vì nhét chữ trực tiếp, nó dùng thuộc tính `cachedContent` chuẩn của API:
    ```json
    {
      "contents": [
         { "role": "user", "parts": [{ "text": "%%input_data.question%% Hãy đánh giá dựa trên rubric." }] }
      ],
      "cachedContent": "cachedContents/abc-xyz",
      "generationConfig": { ... }
    }
    ```
4. LLM lập tức nối ghép bối cảnh từ Cache + Lời gọi của User và trả về kết quả mượt mà.

## 3. Vấn đề Đau đầu Nhất: Quản lý Vòng đời Cache (Lifecycle Management)

Đây là thách thức kỹ thuật lớn nhất: **Cache của Gemini bị tính tiền theo THỜI GIAN LỰU TRỮ** (VD: $X / 1 triệu token / 1 giờ). Nếu Launch thành công tạo Cache mà quên xóa sau khi Batch chạy xong, hệ thống sẽ gây rò rỉ phí API của user.

**Giải pháp đề xuất (3 lớp bảo vệ):**
1. **TTL (Time-To-Live) Mặc định:** Khi gọi tạo Cache, hàm Launcher PHẢI truyền tham số `ttl: "3600s"` (1 tiếng). Gemini sẽ tự động hủy cache khi hết hiệu lực để chống rò rỉ.
2. **Auto-Delete (Dọn rác chủ động):** Khi Batch đạt status `completed` (tất cả task chạy xong sớm hơn 1 tiếng), hệ thống lập tức đá một Webhook gọi lệnh `DELETE /v1beta/cachedContents/abc-xyz` để tiết kiệm từng xu cho User.
3. **Cache Renewal (Tái gia hạn):** Nếu Batch quá dài (chạy chậm rỉ rả hơn 1 tiếng), Worker n8n gặp lỗi *"Cache Not Found"*, Worker có quyền check lại file Document gốc từ Database để tái tạo lại bộ Cache mới ngay lúc đó.

## 4. Giao diện (UX) Caching

Bạn có quyền chọn mức độ chuyên sâu để hiển thị điều kiện này:

*   **UX Cấp 1 (Chế độ chuyên gia):** Ở setting của Auxiliary Input Node, cho thêm 1 toggle tùy chọn: *"⚡ Enable Gemini Context Caching (Require Paid API Key) - Recommended for documents > 50 pages"*.
*   **UX Cấp 2 (Magic / Tàng hình):** User cứ nhập tài liệu. Orchestrator Launcher tự xắn tay tính toán số chữ. Nếu lớn hơn 32k token = Auto Cache. Nếu < 32k token = Băm vào Prompt truyền thống cho lẹ. User chỉ việc hưởng thụ thành quả là Tốc độ bàn thờ + Giá rẻ.

Kế hoạch khả thi nhất là tích hợp ngay logic này vào **Phase 3 (Global Context)** khi chúng ta xây dựng cầu nối giữa Launcher và Database batch!
