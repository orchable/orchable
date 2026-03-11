# Bộ Prompt cho AI Agent — Tái tạo Giáo án Chi tiết từ Khung Chương trình

> **Mục tiêu:** Tái tạo tài liệu giáo án chi tiết theo chuẩn định dạng của *"Giáo án chi tiết cho Học phần 5: Device Networks & MQTT"*, từ đầu vào là khung chương trình (Doc 1: bảng tổng quan) và khung LO chi tiết (Doc 2: learning_objectives JSON).
>
> **Pipeline gồm 4 process độc lập, chạy tuần tự. Mỗi process nhận output của process trước làm input.**

---

## 🔖 QUY ƯỚC CHUNG CHO TẤT CẢ PROMPTS

Trước khi chạy bất kỳ prompt nào, AI Agent cần nắm các quy ước sau:

- **Ngôn ngữ output:** Tiếng Việt toàn bộ, giữ nguyên thuật ngữ kỹ thuật tiếng Anh (ESP-NOW, MQTT, struct, callback...).
- **Xưng hô:** GV (Giáo viên), HS (Học sinh).
- **Định dạng:** Markdown với heading H2/H3, bullet point, code block (``` ```) cho code mẫu.
- **Mô hình sư phạm:** 5E (Engage → Explore → Explain → Elaborate → Evaluate) áp dụng cho phần Giáo án chi tiết.
- **Tông văn phong:** Chuyên nghiệp nhưng thân thiện, phù hợp giáo viên đọc để dạy học sinh 15–18 tuổi.
- **KHÔNG sáng tạo tùy tiện:** Chỉ mở rộng những gì đã có trong Input. Nếu thiếu thông tin kỹ thuật, ghi chú `[CẦN BỔ SUNG]` thay vì bịa.

---

## ⚙️ PROCESS 1 — Xác định Sản phẩm Cuối Học phần

### Mục tiêu
Từ **khung chương trình tổng quan** (Doc 1), xác định và mô tả chi tiết **sản phẩm cuối học phần** — dự án lớn tích hợp mà học sinh hoàn thành vào cuối khóa.

### Input
```
[DOC_1_CURRICULUM_TABLE]
Dán vào đây toàn bộ bảng khung chương trình (Doc 1) của học phần cần tạo giáo án.
Bảng gồm các cột: Học phần | Công cụ học tập | Bài | Thời lượng | Tiêu đề | Chủ đề bài học | Vấn đề | Mục tiêu bài học | Sản phẩm bài học
```

### Prompt

```
Bạn là chuyên gia thiết kế chương trình IoT/STEM cho học sinh 15–18 tuổi.

Dưới đây là khung chương trình tổng quan của một học phần:

<curriculum_table>
{{DOC_1_CURRICULUM_TABLE}}
</curriculum_table>

Nhiệm vụ của bạn: Phân tích toàn bộ bảng trên và xác định **Sản phẩm Cuối Học phần** — một dự án lớn, tích hợp mà học sinh hoàn thành để kết thúc học phần.

Hãy output theo đúng cấu trúc sau:

---

## Tổng hợp Sản phẩm / Dự án Cuối Học phần [TÊN HỌC PHẦN]

### 1. Tên dự án cuối
[Tên dự án ngắn gọn, hấp dẫn]

### 2. Mô tả tổng quan
[2–4 câu mô tả dự án, nêu rõ: dự án tạo ra cái gì, hoạt động như thế nào, phục vụ mục đích thực tế gì]

### 3. Các thành phần của hệ thống
[Liệt kê từng thành phần phần cứng và phần mềm, vai trò của từng thành phần]

### 4. Luồng hoạt động (Data Flow)
[Mô tả từng bước: dữ liệu/tín hiệu đi từ đâu → qua gì → đến đâu → hiển thị/hành động gì]

### 5. Kiến thức học phần được tích hợp
[Map từng bài học (tên bài + số bài) sang kiến thức/kỹ năng cụ thể được dùng trong dự án]

### 6. Sản phẩm đầu ra mong đợi (Demo Day)
[Mô tả cụ thể cảnh demo: HS làm gì → hệ thống phản hồi thế nào → người quan sát thấy gì]

### 7. Outcome tổng thể học phần
[Liệt kê 6–10 kỹ năng học sinh có thể làm được sau khi hoàn thành dự án]

---

**Lưu ý khi thực hiện:**
- Sản phẩm cuối phải tích hợp kiến thức từ ÍT NHẤT 70% số bài trong học phần.
- Ưu tiên tính thực tế: dự án giải quyết một vấn đề có trong đời sống thực.
- Tham khảo các cột "Sản phẩm bài học" trong Doc 1 để đảm bảo sản phẩm cuối là sự tích hợp tự nhiên của các sản phẩm nhỏ.
- Nếu Doc 1 đã chỉ rõ tên dự án (ví dụ: "Mạng Cảm Biến Vườn Mini"), giữ nguyên và bổ sung chi tiết.
```

### Output mong đợi
Một mô tả dự án cuối đầy đủ, gồm 7 phần như template trên, dài khoảng **400–600 từ**.

### Checkpoint trước khi sang Process 2
- [ ] Dự án cuối có tên cụ thể chưa?
- [ ] Có liệt kê phần cứng/phần mềm rõ ràng chưa?
- [ ] Luồng hoạt động có logic từ đầu đến cuối chưa?
- [ ] Kiến thức tích hợp có map được về các bài cụ thể chưa?

---

## ⚙️ PROCESS 2 — Xác định Sản phẩm Từng Bài Học

### Mục tiêu
Từ khung chương trình + sản phẩm cuối học phần, xác định **sản phẩm cụ thể của từng bài** sao cho các sản phẩm nhỏ **tích lũy dần** và hội tụ về sản phẩm cuối.

### Input
```
[DOC_1_CURRICULUM_TABLE]   — Khung chương trình (giống Process 1)
[FINAL_PRODUCT]            — Output từ Process 1
```

### Prompt

```
Bạn là chuyên gia thiết kế chương trình IoT/STEM cho học sinh 15–18 tuổi.

Dưới đây là khung chương trình và sản phẩm cuối của một học phần:

<curriculum_table>
{{DOC_1_CURRICULUM_TABLE}}
</curriculum_table>

<final_product>
{{FINAL_PRODUCT}}
</final_product>

Nhiệm vụ: Với mỗi bài học trong Doc 1, xác định **Sản phẩm cụ thể** — thứ học sinh tạo ra được, chạy được, quan sát được vào cuối buổi học đó.

**Nguyên tắc thiết kế sản phẩm từng bài:**
1. **Tích lũy:** Sản phẩm bài N phải kế thừa / mở rộng từ sản phẩm bài N-1.
2. **Hội tụ:** Đến bài cuối (dự án), tất cả sản phẩm nhỏ được tích hợp vào sản phẩm cuối.
3. **Quan sát được:** Học sinh phải nhìn thấy hoặc đo được kết quả (đèn sáng, serial monitor hiển thị, dashboard cập nhật...).
4. **Vừa sức:** Sản phẩm phải hoàn thành được trong thời lượng buổi học.
5. **Cụ thể:** Nêu rõ INPUT nào → PROCESSING gì → OUTPUT gì.

Output theo định dạng sau cho TỪNG bài:

---

### Bài [X]: [Tên bài]

**Sản phẩm:** [Tên sản phẩm ngắn gọn]

**Mô tả hoạt động:**
[2–3 câu: mô tả hệ thống làm gì, quan sát được gì, thể hiện kiến thức gì của bài]

**Kế thừa từ bài trước:** [Thành phần/code nào được giữ lại từ bài trước — hoặc "Bài đầu tiên" nếu là bài 1]

**Đóng góp cho sản phẩm cuối:** [Thành phần/kỹ năng này sẽ được dùng ở đâu trong dự án cuối]

---

[Lặp lại cho tất cả các bài trong học phần]

**Lưu ý:**
- Với các bài Ôn tập: sản phẩm là "hoàn thiện + mở rộng" các sản phẩm đã làm trước đó.
- Với các bài Dự án (thường 2–3 buổi cuối): chia rõ giai đoạn (Thiết kế → Lập trình → Demo).
- Nếu Doc 1 đã có cột "Sản phẩm bài học", hãy giữ nguyên và bổ sung phần "Mô tả hoạt động", "Kế thừa", "Đóng góp".
```

### Output mong đợi
Danh sách đầy đủ sản phẩm cho **tất cả các bài**, mỗi bài theo template 4 phần trên.

### Checkpoint trước khi sang Process 3
- [ ] Tất cả các bài đều có sản phẩm chưa?
- [ ] Chuỗi sản phẩm có tính tích lũy (bài sau dùng thành quả bài trước) chưa?
- [ ] Sản phẩm bài cuối có phải là sản phẩm cuối học phần không?
- [ ] Mỗi sản phẩm có quan sát được (đo được, nhìn thấy được) không?

---

## ⚙️ PROCESS 3 — Tóm tắt Học phần (Mục tiêu, Chi tiết, Outcome từng bài)

### Mục tiêu
Tạo phần **"Tóm tắt Học phần"** — tương đương phần đầu của file HP5-LessonPlan.md — gồm 4 mục cho từng bài: Mục tiêu chính / Chi tiết hóa nội dung / Sản phẩm/Kết quả cụ thể / Outcome.

### Input
```
[DOC_1_CURRICULUM_TABLE]   — Khung chương trình
[DOC_2_LEARNING_OBJECTIVES] — JSON learning_objectives từng bài (nếu có)
[FINAL_PRODUCT]             — Output từ Process 1
[LESSON_PRODUCTS]           — Output từ Process 2
```

### Prompt

```
Bạn là chuyên gia thiết kế chương trình IoT/STEM cho học sinh 15–18 tuổi.

Dưới đây là đầy đủ thông tin về một học phần:

<curriculum_table>
{{DOC_1_CURRICULUM_TABLE}}
</curriculum_table>

<learning_objectives_json>
{{DOC_2_LEARNING_OBJECTIVES}}
</learning_objectives_json>

<final_product>
{{FINAL_PRODUCT}}
</final_product>

<lesson_products>
{{LESSON_PRODUCTS}}
</lesson_products>

Nhiệm vụ: Với MỖI BÀI HỌC, viết phần TÓM TẮT theo đúng 4 mục sau, theo chuẩn định dạng mẫu bên dưới.

**ĐỊNH DẠNG MẪU (bắt buộc tuân theo):**

---

### **Buổi [X.Y]: [Tên bài học]**

* Mục tiêu chính:
  * [Mục tiêu 1 — bắt đầu bằng động từ hành động: Hiểu / Biết / Lập trình / Sử dụng / Giải thích...]
  * [Mục tiêu 2]
  * [Mục tiêu 3]
  * [...] *(4–8 mục tiêu, phân cấp từ khái niệm → kỹ năng → ứng dụng)*

* Chi tiết hóa nội dung:
  * [Chủ đề con 1]:
    * [Giải thích khái niệm — ngắn gọn, có ví dụ thực tế]
    * [Code mẫu nếu cần — đặt trong code block]
    * [Lưu ý kỹ thuật / lỗi thường gặp nếu có]
  * [Chủ đề con 2]:
    * [...]
  * [...] *(Bao phủ toàn bộ nội dung kỹ thuật của bài)*

* Sản phẩm/Kết quả cụ thể:
  * [Kết quả quan sát được 1 — ví dụ: "Serial Monitor hiển thị trạng thái gửi thành công"]
  * [Kết quả quan sát được 2]
  * [...] *(3–5 kết quả, cụ thể và kiểm chứng được)*

* Outcome (Học sinh có thể làm được):
  * [Kỹ năng 1 — bắt đầu bằng động từ: Giải thích / Lấy / Khởi tạo / Viết / Sử dụng...]
  * [Kỹ năng 2]
  * [...] *(5–8 kỹ năng, tương ứng với Mục tiêu chính)*

---

**Hướng dẫn điền từng mục:**

**Mục tiêu chính:**
- Dịch các CIO và SIO từ learning_objectives JSON thành câu mục tiêu tiếng Việt.
- Mỗi CIO → 1 mục tiêu tổng quát.
- Mỗi SIO → 1 mục tiêu cụ thể hơn bên dưới.
- Thêm các mục tiêu về phần cứng/ngữ cảnh từ cột "Mục tiêu bài học" trong Doc 1.

**Chi tiết hóa nội dung:**
- Mỗi SIO → 1 chủ đề con với giải thích + code mẫu (nếu bài có lập trình).
- Code mẫu phải đúng ngôn ngữ của học phần (Arduino C++, MicroPython, Python...).
- Độ dài giải thích: 3–6 dòng mỗi chủ đề con.
- Chèn lưu ý `(Optional)` cho các kỹ năng nâng cao.

**Sản phẩm/Kết quả cụ thể:**
- Lấy từ output Process 2 (sản phẩm từng bài).
- Chia nhỏ thành các kết quả quan sát được riêng lẻ.
- Ưu tiên kết quả đo được / nhìn thấy được / chạy được.

**Outcome:**
- Viết lại Mục tiêu chính dưới dạng "HS có thể làm được...".
- Dùng động từ cụ thể: Giải thích / Viết / Lập trình / Kết nối / Debug / Tích hợp...
- Phân biệt Outcome bắt buộc và `(Optional)`.

**Xử lý các loại bài đặc biệt:**
- **Bài Ôn tập:** Mục tiêu chính tập trung vào củng cố + phát hiện lỗ hổng + quiz. Chi tiết hóa là danh sách câu hỏi ôn tập theo chủ đề.
- **Bài Dự án (P1/P2/P3):** Mục tiêu chính là các mốc hoàn thành (milestone). Chi tiết hóa mô tả quy trình làm việc nhóm và các quyết định kỹ thuật.
- **Bài Trắc nghiệm + Thực hành:** Nêu số câu, phạm vi kiến thức, và yêu cầu bài thực hành.
```

### Output mong đợi
Phần "Tóm tắt Học phần" đầy đủ cho tất cả các bài, theo đúng định dạng mẫu 4 mục, có code block cho phần kỹ thuật.

### Checkpoint trước khi sang Process 4
- [ ] Tất cả bài đều có đủ 4 mục: Mục tiêu chính / Chi tiết hóa / Sản phẩm / Outcome?
- [ ] Chi tiết hóa có code mẫu ở những bài lập trình không?
- [ ] Mục tiêu chính và Outcome có tương ứng với nhau không?
- [ ] Sản phẩm/Kết quả có cụ thể, quan sát được không?
- [ ] Nội dung kỹ thuật có đúng với công nghệ của học phần không?

---

## ⚙️ PROCESS 4 — Giáo án Chi tiết Một Bài (Mô hình 5E)

### Mục tiêu
Tạo **giáo án chi tiết đầy đủ** cho **một bài cụ thể**, gồm: thông tin chung, tài liệu đọc (nội dung kỹ thuật), và tiến trình dạy học theo mô hình 5E.

> **Lưu ý:** Chạy process này **lần lượt từng bài** để kiểm soát chất lượng. Không chạy nhiều bài cùng lúc.

### Input
```
[LESSON_SUMMARY_CURRENT]   — Tóm tắt bài hiện tại (Output Process 3 — bài đang tạo)
[LESSON_SUMMARY_PREV]      — Tóm tắt bài trước (Output Process 3 — bài N-1, để biết HS đã học gì)
[LESSON_SUMMARY_NEXT]      — Tóm tắt bài sau (Output Process 3 — bài N+1, để biết cần chuẩn bị gì)
[LESSON_PRODUCT_CURRENT]   — Sản phẩm bài hiện tại (Output Process 2)
[FINAL_PRODUCT]            — Sản phẩm cuối học phần (Output Process 1)
[METADATA]                 — Thông tin: Tên học phần | Số bài | Thời lượng | Đối tượng | Công cụ
```

### Prompt

```
Bạn là chuyên gia thiết kế giáo án IoT/STEM cho học sinh 15–18 tuổi, có kinh nghiệm thực tế với [CÔNG CỤ HỌC TẬP].

Dưới đây là toàn bộ thông tin cần thiết để viết giáo án cho một buổi học:

<metadata>
{{METADATA}}
</metadata>

<lesson_summary_previous>
{{LESSON_SUMMARY_PREV}}
</lesson_summary_previous>

<lesson_summary_current>
{{LESSON_SUMMARY_CURRENT}}
</lesson_summary_current>

<lesson_summary_next>
{{LESSON_SUMMARY_NEXT}}
</lesson_summary_next>

<lesson_product>
{{LESSON_PRODUCT_CURRENT}}
</lesson_product>

<final_product>
{{FINAL_PRODUCT}}
</final_product>

Nhiệm vụ: Viết giáo án chi tiết đầy đủ cho buổi học này theo đúng cấu trúc sau:

---

## **Giáo án Buổi học [X.Y]: [Tên bài]**

* Học phần: [Tên học phần]
* Dự án: [Mô tả ngắn liên quan đến dự án cuối — hoặc "Bài học nền tảng cho [dự án]"]
* Thời lượng: ~[X] phút
* Đối tượng: [Học sinh X-Y tuổi] (đã hoàn thành [tên bài trước])
* Mục tiêu buổi học:
  * [Mục tiêu 1 — viết đầy đủ, rõ ràng hơn phần Tóm tắt]
  * [Mục tiêu 2]
  * [...]
* Chuẩn bị:
  * GV: [Danh sách thiết bị, file, slide cần chuẩn bị]
  * HS (Mỗi Nhóm): [Danh sách thiết bị, linh kiện, phần mềm cần có]
* Tài liệu đọc/hướng dẫn: "[Tên tài liệu bài này]" (file PDF hoặc trang web nội bộ)

---

Tài liệu đọc/hướng dẫn: "[Tên tài liệu]"
*(Nội dung cốt lõi cần có trong tài liệu này)*

[PHẦN NỘI DUNG KỸ THUẬT]

Cấu trúc tài liệu theo các phần đánh số:

1. [Phần giới thiệu ngữ cảnh / Vấn đề thực tế]
   * [Đặt vấn đề: tại sao cần kỹ năng này?]
   * [Ví dụ thực tế từ đời sống]
   * [Kết nối với bài trước]

2. [Khái niệm/Lý thuyết chính]
   * [Giải thích rõ ràng, dùng ví dụ/so sánh dễ hiểu]
   * [Sơ đồ hoặc bảng so sánh nếu cần — dùng markdown table]

3. [Hướng dẫn kỹ thuật từng bước — lặp lại cho mỗi SIO]
   * [Tiêu đề bước]
   * [Giải thích ngắn]
   * [Code mẫu trong code block, có comment tiếng Việt]
   * [Lưu ý / lỗi thường gặp]

[...Thêm phần nếu bài có nhiều khái niệm...]

Thực Hành:
[Liệt kê 4–6 bước thực hành cụ thể, học sinh tự làm theo]

[Câu kết thúc tài liệu — preview nội dung buổi tiếp theo]

---

Tiến trình bài học (Mô hình 5E)

**Phân bổ thời gian chuẩn cho buổi [X] phút:**

| Giai đoạn | Thời lượng | Tỷ lệ |
|-----------|-----------|-------|
| Engage    | ~[X] phút | ~10%  |
| Explore   | ~[X] phút | ~40%  |
| Explain   | ~[X] phút | ~20%  |
| Elaborate | ~[X] phút | ~20%  |
| Evaluate  | ~[X] phút | ~10%  |

---

1\. Engage (Gắn kết — [X] phút)

* Hoạt động: "[Tên hoạt động gắn kết — ngắn gọn, gợi tò mò]"
  * GV: "[Câu hỏi kích hoạt — lấy từ cột 'Vấn đề' trong Doc 1]"
  * [Mô tả hoạt động demo ngắn của GV — nếu có]
  * GV: "[Câu nối dẫn dắt vào bài — liên kết với bài trước]"
  * GV: "[Câu tóm tắt mục tiêu buổi học]"
  * Nêu mục tiêu: [Liệt kê 3–4 mục tiêu chính của buổi]

2\. Explore (Khám phá — [X] phút)

* Hoạt động 1: "[Tên hoạt động 1]" ([X] phút):
  * [Mô tả: HS làm gì, theo thứ tự nào]
  * [Yêu cầu cụ thể: viết code gì, kết nối gì, quan sát gì]
  * GV hỗ trợ: [GV cần chú ý điểm gì, lỗi thường gặp nào]

* Hoạt động 2: "[Tên hoạt động 2]" ([X] phút):
  * [...]

* Hoạt động 3 (nếu cần): "[Tên]" ([X] phút):
  * [...]

3\. Explain (Giải thích — [X] phút)

* Hoạt động:
  * [Giải thích khái niệm 1: GV trình bày, dùng ví dụ/so sánh gì]
  * [Giải thích khái niệm 2]
  * [Kết nối kiến thức hôm nay với bài trước và bài sau]
  * Câu hỏi thảo luận: "[1–2 câu hỏi mở để HS suy nghĩ]"

4\. Elaborate (Mở rộng/Áp dụng — [X] phút)

* Hoạt động: "[Tên thử thách mở rộng]"
  * [Mô tả thử thách: khó hơn phần Explore một chút]
  * [Gợi ý nếu HS bị kẹt]
  * Thảo luận về Mở rộng:
    * "[Câu hỏi 'Làm thế nào nếu...' — kết nối với dự án cuối]"
    * "[Câu hỏi so sánh với bài trước hoặc bài sau]"

5\. Evaluate (Đánh giá — [X] phút)

* Hoạt động:
  * Kiểm tra tại chỗ: [Yêu cầu HS show gì để GV xác nhận đạt sản phẩm bài]
  * Câu hỏi nhanh:
    * [Câu 1 — kiểm tra khái niệm chính]
    * [Câu 2 — kiểm tra kỹ năng thực hành]
    * [Câu 3 — kiểm tra hiểu ngữ cảnh]
    * [Đáp án trong ngoặc: (Đáp án)]

Kết thúc buổi học:

* GV Tóm tắt: "[1–2 câu tóm tắt thành tựu của buổi học, dùng ngôn ngữ tích cực, khen ngợi nỗ lực]"
* GV Giới thiệu buổi học tiếp theo: "[1–2 câu preview bài tiếp theo — liên kết sản phẩm hôm nay với bài sau]"

---

**HƯỚNG DẪN CHI TIẾT CHO TỪNG GIAI ĐOẠN 5E:**

**Engage:**
- Bắt buộc dùng câu hỏi từ cột "Vấn đề" trong Doc 1 làm câu mở đầu.
- GV demo ngắn (nếu bài trước đã có sản phẩm) hoặc đặt câu hỏi tình huống.
- Thời lượng: nghiêm ngặt ~10% tổng buổi.

**Explore:**
- Chia thành 2–3 hoạt động nhỏ, mỗi hoạt động tương ứng 1–2 SIO.
- Thứ tự hoạt động: từ đơn giản → phức tạp, từ khái niệm → code → chạy thử.
- GV đi quan sát, KHÔNG giải thích trước — để HS tự khám phá trước.
- Ghi rõ "GV hỗ trợ: [lỗi thường gặp]" để GV chuẩn bị.

**Explain:**
- GV giải thích SAU KHI HS đã tự thử, không phải trước.
- Tập trung vào "Tại sao hoạt động như vậy?" chứ không phải "Cách làm" (đã làm ở Explore).
- Có thể dùng sơ đồ, bảng so sánh, hoặc code walk-through.

**Elaborate:**
- Yêu cầu nâng cao hơn Explore nhưng vẫn trong phạm vi bài.
- Ví dụ: thêm tính năng, xử lý edge case, tối ưu code, kết hợp với bài trước.
- Có thể là câu hỏi thảo luận nhóm thay vì thực hành nếu thời gian ít.

**Evaluate:**
- Bắt buộc có "Kiểm tra tại chỗ" — GV xem màn hình Serial Monitor / kết quả thực tế.
- Câu hỏi nhanh: 3–5 câu, mix giữa khái niệm và thực hành, có đáp án kèm theo.
- Kết thúc bằng preview bài tiếp theo (tạo kỳ vọng, kết nối chuỗi học).
```

### Output mong đợi
Giáo án hoàn chỉnh cho **một buổi học**, bao gồm:
- Phần đầu: Thông tin chung + Chuẩn bị
- Phần giữa: Tài liệu đọc (nội dung kỹ thuật đầy đủ, có code mẫu)
- Phần cuối: Tiến trình 5E chi tiết theo phút

### Checkpoint sau mỗi bài
- [ ] Tài liệu đọc có đầy đủ code mẫu cho tất cả SIO của bài không?
- [ ] Engage có dùng câu hỏi từ "Vấn đề" (Doc 1) không?
- [ ] Explore có tách thành 2–3 hoạt động nhỏ không?
- [ ] Explain đến SAU Explore không (không giải thích trước)?
- [ ] Evaluate có "Kiểm tra tại chỗ" và câu hỏi nhanh có đáp án không?
- [ ] Tổng thời gian các giai đoạn có đúng bằng thời lượng buổi học không?
- [ ] Câu kết thúc có preview bài tiếp theo không?

---

## 📋 TỔNG KẾT PIPELINE

```
INPUT: Doc 1 (Khung chương trình) + Doc 2 (Learning Objectives JSON)
         │
         ▼
PROCESS 1 → Sản phẩm cuối học phần
         │
         ▼
PROCESS 2 → Sản phẩm từng bài (tích lũy, hội tụ về sản phẩm cuối)
         │
         ▼
PROCESS 3 → Tóm tắt học phần (Mục tiêu / Chi tiết / Sản phẩm / Outcome — mỗi bài)
         │
         ▼
PROCESS 4 → Giáo án chi tiết từng bài (Thông tin + Tài liệu đọc + Tiến trình 5E)
              [Chạy lần lượt từng bài, có checkpoint sau mỗi bài]
         │
         ▼
OUTPUT: File giáo án chi tiết hoàn chỉnh (tương đương IOT-HP5-LessonPlan.md)
```

### Ước tính token mỗi process (cho 1 học phần ~12 bài)

| Process | Input (token) | Output (token) | Ghi chú |
|---------|--------------|----------------|---------|
| P1 | ~500 | ~600 | Chạy 1 lần / học phần |
| P2 | ~1.200 | ~1.500 | Chạy 1 lần / học phần |
| P3 | ~3.000 | ~6.000 | Chạy 1 lần / học phần |
| P4 | ~2.500 | ~3.000 | Chạy 12 lần (mỗi bài) |
| **Tổng** | | **~50.000** | Kiểm soát được, sửa từng bài |

---

## 🛠️ GHI CHÚ TRIỂN KHAI

1. **Thứ tự bắt buộc:** P1 → P2 → P3 → P4. Không bỏ qua bước nào.
2. **Review tại mỗi checkpoint** trước khi chạy bước tiếp theo.
3. **P4 chạy từng bài:** Truyền đúng `LESSON_SUMMARY_PREV` và `LESSON_SUMMARY_NEXT` từ output P3.
4. **Bài đầu tiên (P4):** `LESSON_SUMMARY_PREV` = mô tả học phần trước đó.
5. **Bài cuối cùng (P4):** `LESSON_SUMMARY_NEXT` = mô tả học phần tiếp theo hoặc "Kết thúc học phần".
6. **Bài Ôn tập và Dự án:** Có thể cần prompt bổ sung riêng nếu cấu trúc khác biệt đáng kể.
7. **Nhất quán thuật ngữ:** Giữ cùng tên gọi cho các khái niệm kỹ thuật xuyên suốt tất cả bài.