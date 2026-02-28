# Input/Output Node & Document Asset Architecture

## 1. Mục tiêu kiến trúc
- Tách bạch Input, Output và AI Stage thành các loại node riêng biệt.
- Cho phép Pipeline có 1 Main Input và nhiều Auxiliary Inputs.
- Cho phép Pipeline có nhiều Output destinations (CSV, Google Sheets, etc.).
- Tránh phình to Database/Payload bằng cách lưu Auxiliary Inputs dưới dạng Reference ID (Lookup Pattern).
- Quản lý tập trung các tài liệu phụ trợ thông qua Asset Library (Documents Tab).

## 2. Quản lý Tài liệu (Document Asset Library)
Như bạn đã đề xuất, chúng ta thêm 1 tab **Documents** vào Asset Library để quản lý các file text, markdown, csv, tsv, pdf, hình ảnh.

### 2.1 Cấu trúc Dữ liệu (DocumentAsset)
```typescript
interface DocumentAsset {
  id: string;             // UUID
  name: string;           // Tên file (e.g., "Rubric_Math_G3.pdf")
  type: "text" | "markdown" | "csv" | "tsv" | "pdf" | "image";
  size_bytes: number;
  storage_path: string;   // Đường dẫn vật lý hoặc reference
  is_public: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}
```

### 2.2 Cơ sở Hạ tầng Lưu trữ (Storage Strategy)
Bài toán lớn nhất là **Free Tier lưu ở đâu** khi IndexedDB được thiết kế ưu tiên cho text/structured data, không phải Blob (file lớn).

*   **Premium Users / Admin:**
    *   Metadata: Lưu vào Supabase table `document_assets`.
    *   Nội dung file: Lưu vào **Supabase Storage** bucket `user_documents/`.
*   **Free / BYOK Users:**
    *   IndexedDB *có thể* lưu Blob (File). Browser thường cho phép quota rất lớn cho IndexedDB (lên tới hàng GB tùy ổ cứng trống).
    *   Do đó, ta có thể mở rộng `StorageAdapter` để thêm các hàm `uploadDocument`, `downloadDocument`.
    *   Metadata: Lưu vào bảng `indexedDB.documents`.
    *   Nội dung file: Có thể parse ra text (nếu là markdown/csv) lưu thẳng vào text field, hoặc dùng `Blob` lưu vào store dành cho file nhị phân (PDF/Image).

## 3. Cấu trúc Pipeline mới (OrchestratorConfig V2)

```typescript
interface OrchestratorConfig {
  // ... existing metadata ...
  inputs: InputNode[],     // Main và Aux
  steps: StepConfig[],     // Nguyên trạng hiện tại (AI Stages)
  outputs: OutputNode[],   // Các điểm xuất dữ liệu
}

interface InputNode {
  id: string;              // e.g., "input_main", "input_aux_1"
  label: string;
  type: "main_tasklist" | "auxiliary_document";
  
  // Dành cho Auxiliary Document
  document_id?: string;    // ID từ Document Asset Library
  inject_key?: string;     // Tên biến để xài trong prompt, vd: "rubric"
  
  position: { x: number; y: number };
}

interface OutputNode {
  id: string;
  label: string;
  dependsOn: string[];     // Chờ stage nào chạy xong (thường là stage cuối)
  
  // Cấu hình xuất
  destination_type: "download_csv" | "google_sheets" | "webhook";
  
  // Dành cho Google Sheets
  spreadsheet_id?: string;
  sheet_name?: string;
  
  position: { x: number; y: number };
}
```

## 4. Cơ chế External Data Fetch (Khi chạy Batch)

Áp dụng mô hình Lookup Node / Reference như đã bàn:

1.  **Lúc thiết kế (Designer):** User kéo thả Input Node (loại `auxiliary_document`), chọn tài liệu từ Asset Library (ví dụ ID: `doc-1234`). User đặt `inject_key` là `rubric`.
2.  **Khởi chạy Batch (Launcher):** Hệ thống đọc `OrchestratorConfig`, thấy có `inputs` chứa `document_id`. Lập tức fetch nội dung text của Document đó từ DB (hoặc Storage).
3.  **Lưu Global Context:** Thay vì nhét Document vào hàng ngàn task nhỏ, Launcher đóng gói cấu trúc này lưu thẳng vào `task_batches.global_context`.
    ```json
    {
      "rubric": "Đây là nội dung cực dài của Rubric phân loại câu hỏi..."
    }
    ```
4.  **Thực thi (Worker / n8n):**
    *   Khi n8n hoặc WebWorker chuẩn bị gọi Gemini API, nó luôn fetch `input_data` của task HIỆN TẠI + `global_context` của BATCH.
    *   Template Renderer (Hàm thay thế `%%...%%`) sẽ tự động map `%%global_context.rubric%%` thành chuỗi văn bản hoàn chỉnh.

## 5. Kế hoạch Triển khai (Phân kỳ)

**Giai đoạn 1: Schema & Giao diện Asset Library**
1. Thêm bảng `document_assets` vào Supabase.
2. Nâng cấp IndexedDB schema thêm store `documents` (hỗ trợ Blob).
3. Tạo tab **Documents** trên UI Asset Library (Upload, Xóa, Xem file Text/CSV/Markdown).

**Giai đoạn 2: Refactor Orchestrator V2**
1. Mở rộng `OrchestratorConfig` format (thêm `inputs`, `outputs`).
2. Sửa UI Designer để hỗ trợ thêm Node: Input (Main/Aux), Output.
3. Node Aux Input cho phép chọn file từ Asset Library.

**Giai đoạn 3: Global Context & Execution**
1. Sửa `task_batches` schema, thêm cột `global_context` (JSONB).
2. Viết hàm Launcher tổng hợp Aux Inputs thành `global_context` khi bấm Run.
3. Sửa Engine (Local Worker + n8n payload) để truyền `global_context` vào hàm Gen AI, hỗ trợ cú pháp `%%global_context.XYZ%%`.

**Giai đoạn 4: Output Nodes (Google Sheet & File)**
1. Cài đặt các Trigger cho Output Nodes chạy khi Batch Completed.
2. Xử lý xuất CSV/JSON cục bộ.
3. (Tương lai) Tích hợp OAuth Google Sheets.
