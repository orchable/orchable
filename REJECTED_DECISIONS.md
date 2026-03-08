# 🚫 Lịch Sử Các Quyết Định Bị Loại Bỏ (Rejected Decisions Log)

**HƯỚNG DẪN DÀNH CHO AI AGENT:**
Bạn BẮT BUỘC phải đọc toàn bộ tài liệu này trước khi đề xuất bất kỳ thay đổi kiến trúc, thư viện, hoặc pattern code nào. 
Bạn BẮT BUỘC phải đọc toàn bộ tài liệu này trước khi đề xuất bất kỳ thay đổi kiến trúc, thư viện, hoặc pattern code nào.
- Mọi phương án nằm trong cột `[Phương án bị loại bỏ]` là vùng cấm.
- Tuyệt đối không đề xuất lại những phương án này dưới bất kỳ hình thức nào.
- Hãy tham khảo cột `[Giải pháp thay thế hiện tại]` để định hướng cách làm đúng.

**SAMPLE**

### ❌ [Quyết định]: Chia sẻ State quản lý Session giữa các apps trong monorepo
* **Ngữ cảnh:** Cần đồng bộ trạng thái đăng nhập giữa các ứng dụng khác nhau trong workspace.
* **Phương án bị loại bỏ:** Đưa Redux store lên cấp độ root package và share xuống các sub-apps.
* **Lý do loại bỏ:** Gây ra tình trạng re-render chéo không kiểm soát, làm phình to `.turbo` cache và phá vỡ tính độc lập của các package.
* **Giải pháp thay thế hiện tại:** Sử dụng Context API cục bộ cho từng app và đồng bộ token qua trình duyệt (Cookies/LocalStorage) hoặc một thư viện auth dùng chung (nhưng không share state).

---

## 1. Kiến Trúc & Monorepo (Architecture & Monorepo)


---

## 2. API & Xử lý Dữ liệu (API & Data Handling)


---

## 3. UI & Components


---
*(Lưu ý: Bất cứ khi nào bạn (hoặc AI) thảo luận và thống nhất loại bỏ một cách tiếp cận mới, hãy bổ sung ngay một block mới vào đây)*