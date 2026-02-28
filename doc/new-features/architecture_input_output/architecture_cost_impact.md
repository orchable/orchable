# Đánh giá Rủi ro Chi phí & Quản lý Quota (Auxiliary Input)

Vì hệ thống hiện tại không có cơ chế tính tiền/token chi tiết (Calculation) tại màn hình Launcher mà chỉ dùng chốt chặn 30 Tasks/Tháng, việc bổ sung **Auxiliary Input** (Document đính kèm) tạo ra rủi ro thay đổi toàn bộ chi phí sử dụng API.

---

## 1. Cơ chế tính phí hiện tại

Hiện tại, hệ thống của bạn:
*   **Không đếm** lượng token đẩy vào API.
*   **Chỉ đếm** số task (30 task/tháng) đối với tài khoản Free. 

Lý do `QUOTA_EXCEEDED` văng ra là do Limit về Task Count. Điều này ổn khi Prompt tĩnh và Input Text nhỏ (vài chục token).

## 2. Rủi ro khổng lồ của Auxiliary Input

Khi User Free đính kèm một file Markdown hoặc File Txt dài (ví dụ: 10,000 từ ~ 15,000 tokens) vào Auxiliary Input:

1.  **Dùng Free Tier:** 
    *   Họ không được dùng "Gemini Context Caching". 
    *   File Text 15,000 tokens này sẽ bị nhồi vào Prompt của **MỖI MỘT TASK**.
    *   Nếu một Batch có 30 tasks => API Key của hệ thống bạn sẽ phải cõng 30 lần đoạn text 15,000 tokens đó (Tổng 450,000 Input Tokens).
    *   Bạn sẽ cạn kiệt API Limits và Cost rất nhanh chóng!

## 3. Đề xuất Giải pháp Tích hợp vào `Calculator.tsx`

Tôi đã kiểm tra kỹ thuật toán trong file `src/pages/Calculator.tsx`. Hiện tại hàm `calculation` ở dòng `169` đang tính phí theo công thức:
`stageInputTokens = inputTokensPerRecord * currentStageTaskCount` 

Để hỗ trợ Auxiliary Input, chúng ta bắt buộc phải nâng cấp logic của trang Calculator này:

### A. Đối với Free User (Không Caching - Hard Limit)
*   **Giao diện Calculator:** Phải có thêm mục cho phép Mock (giả lập) việc đính kèm Document (ví dụ nhập thử số lượng Token của Document).
*   **Công thức cập nhật:** `stageInputTokens = (inputTokensPerRecord + auxiliaryTokens) * currentStageTaskCount`
*   **Quản trị rủi ro:** Bảng `document_assets` và quá trình Upload LUÔN PHẢI chặn dung lượng file/đếm token (VD: max 10,000 tokens) để tránh vượt quá hạn mức API khi bị nhân lên `currentStageTaskCount` lần.

### B. Đối với Premium User / BYOK (Có Gemini Caching)
*   Google Gemini tính phí **Gemini Caching** khác hoàn toàn so với gọi Request thông thường. Nó có 3 loại phí:
    1.  *Phí tạo Cache (Storage)*: Tính theo Giờ.
    2.  *Phí gọi text nằm trong Cache (Cached Input)*: **Rẻ hơn 50-70%** so với Standard Input.
    3.  *Phí Standard Input (Prompt thường)*: Vẫn tính giá bình thường.
*   **Công thức cập nhật trên Calculator:**
    *   `Token Caching` = `auxiliaryTokens` (Chỉ bị tính phí tạo 1 lần).
    *   `Token Per Task` = `[Cached Input Price] * auxiliaryTokens + [Standard Input Price] * inputTokensPerRecord`
*   Bảng giá trong `pricingService.ts` cũng sẽ phải bổ sung thêm cột giá cho `cachedInputCostPer1M`.

### Kết luận
Tuyệt vời khi bạn đã có sẵn Module Calculator! Chúng ta sẽ sử dụng chính Module này làm nền tảng để minh bạch hóa chi phí khủng khiếp của Auxiliary Input cho người dùng thấy, từ đó thúc đẩy họ Upgrade lên Premium (để sử dụng Caching với giá rẻ hơn).
