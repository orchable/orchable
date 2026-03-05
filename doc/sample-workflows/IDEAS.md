# 💡 Orchable Community Hub — Ideas Bank

> **Purpose:** Danh sách ý tưởng để làm giàu nội dung Community Hub của Orchable, bao gồm AI Presets, Orchestration Configs, Prompt Templates, và Custom View Components.
> **Created:** 2026-03-05
> **Status:** Draft — Chưa implement

---

## Table of Contents

1. [AI Presets — Công khai từ Supabase](#1-ai-presets--công-khai-từ-supabase)
2. [Orchestrations — Đa lĩnh vực](#2-orchestrations--đa-lĩnh-vực)
3. [Prompt Templates](#3-prompt-templates)
4. [Custom View Components](#4-custom-view-components)
5. [Starter Kits (Bundle)](#5-starter-kits-bundle)
6. [Roadmap ưu tiên](#6-roadmap-ưu-tiên)

---

## 1. AI Presets — Công khai từ Supabase

> **Hành động cần làm:** Set `is_public = TRUE` cho các preset mặc định trong bảng `ai_model_settings`, sau đó tạo `hub_assets` tương ứng với `asset_type = 'ai_preset'`.

Các AI Preset được khuyến nghị publish ngay lên Hub (không cần viết thêm prompt):

| # | Tên Preset | Model | Mô tả | Tags |
|---|------------|-------|-------|------|
| P-01 | **Flash Standard** | gemini-flash-latest | Cấu hình cân bằng tốc độ và chất lượng cho hầu hết tác vụ | #general #fast |
| P-02 | **Flash Creative** | gemini-flash-latest | Temperature cao (1.4) cho brainstorm và creative writing | #creative #writing |
| P-03 | **Flash Deterministic** | gemini-flash-latest | Temperature thấp (0.2) cho tác vụ cần output ổn định | #extraction #classification |
| P-04 | **Pro Analyst** | gemini-pro-latest | Pro model, maxTokens cao cho analysis phức tạp | #analysis #research |
| P-05 | **Flash Budget** | gemini-flash-latest | maxOutputTokens thấp (4096) để tiết kiệm token | #budget #summary |
| P-06 | **Flash Long Output** | gemini-flash-latest | maxOutputTokens = 65536, phù hợp sinh nội dung dài | #content #long-form |
| P-07 | **Thinking Flash** | gemini-2.5-flash | Bật thinking budget cho reasoning tasks | #reasoning #math |
| P-08 | **Pro Precise** | gemini-pro-latest | topP thấp (0.7), dành cho tác vụ coding và structured output | #code #structured |

---

## 2. Orchestrations — Đa lĩnh vực

> **Thiết kế nguyên tắc:** Mỗi orchestration trong Orchable được xây dựng để thể hiện 3 điểm mạnh cốt lõi:
> - **🔗 Đa bước có ý nghĩa** — mỗi stage giải quyết đúng 1 vấn đề cụ thể, output stage trước là input stage sau
> - **💰 Tối ưu chi phí** — dùng model nhẹ (Flash) cho tác vụ generation/format, model mạnh (Pro/Thinking) chỉ khi cần reasoning sâu
> - **🔍 Kiểm soát chất lượng** — mỗi stage trả về structured JSON có thể inspect ngay trên Monitor; stage cuối hoặc stage độc lập luôn là Validator/QA

---

### 📌 Legend — Ký hiệu trong bảng Stage Flow

| Ký hiệu | Ý nghĩa |
|---------|---------|
| ⚡ Flash | `gemini-flash-latest` — nhanh, rẻ |
| 🧠 Pro | `gemini-pro-latest` — chất lượng cao, reasoning tốt |
| 💡 Thinking | `gemini-2.5-flash` (thinking budget) — cho task logic/reasoning |
| ✅ Validator | Stage này output bao gồm `status`, `issues[]`, `passed/failed` để kiểm soát chất lượng |
| 🔀 1:N | Stage split ra nhiều sub-tasks |
| 🔁 N:1 | Stage merge nhiều sub-tasks lại |

---

### 🎓 Giáo dục (Education)

#### ORC-01 — Question Gen Batch *(đã có — flagship demo)*

| Stage | Tên | Model | Vai trò | Checkpoint |
|-------|-----|-------|---------|------------|
| A | Core Question Generator | ⚡ Flash | Sinh câu hỏi thô từ Learning Objectives | JSON: `{scenario, core_question, ideal_response, misconceptions}` |
| B | Assessment Formatter | ⚡ Flash | Format thành question type cụ thể (MCQ, FIB...) | JSON: `{prompt, options, correctAnswer, points}` |
| C | QA Qualifier ✅ | ⚡ Flash Deterministic | Detect lỗi logic, ambiguity → PASS/CORRECTED/CRITICAL | `{status, issues[], batch_summary}` → Human review nếu CRITICAL |

- **Cardinality:** 1:1 → 1:N → N:1
- **Cost logic:** 100% Flash — thích hợp batch lớn (500+ câu hỏi), chi phí predictable
- **Tags:** `#education` `#assessment` `#batch` `#3-stage`

---

#### ORC-02 — Smart Lesson Plan Builder

| Stage | Tên | Model | Vai trò | Checkpoint |
|-------|-----|-------|---------|------------|
| A | Pedagogical Mapper | 🧠 Pro | Phân tích learning standard → mapping Bloom's taxonomy, prior knowledge, misconceptions | JSON: `{bloom_levels[], prior_knowledge[], key_misconceptions[]}` |
| B | Activity Designer | ⚡ Flash (1:N) | Sinh activities đa dạng (direct teach, guided, independent, assessment) cho từng bloom level | JSON: `[{activity_type, instructions, materials, duration}]` |
| C | Coherence Validator ✅ | ⚡ Flash Deterministic | Kiểm tra chuỗi activities có đảm bảo pedagogical flow không, detect gaps | `{coherence_score, gaps[], final_lesson_plan}` |

- **Cardinality:** 1:1 → 1:N → N:1
- **Cost logic:** Pro chỉ ở Stage A (phân tích chuẩn — cần reasoning tốt), Flash cho B+C để tiết kiệm
- **Tags:** `#education` `#lesson-plan` `#pedagogy` `#3-stage`

---

#### ORC-03 — Flashcard Set Builder

| Stage | Tên | Model | Vai trò | Checkpoint |
|-------|-----|-------|---------|------------|
| A | Concept Extractor | ⚡ Flash | Trích xuất khái niệm key, định nghĩa, ví dụ từ văn bản dài | JSON: `[{concept, definition, example, difficulty}]` |
| B | Flashcard Formatter ✅ | ⚡ Flash Deterministic | Format thành cặp front/back chuẩn Anki, thêm hint, detect duplicates | JSON: `[{front, back, hint, tags, is_duplicate}]` |

- **Cardinality:** 1:1 → 1:1
- **Cost logic:** 2 stage Flash đơn giản là đủ — chunking + formatting không cần Pro
- **Tags:** `#education` `#flashcard` `#anki` `#2-stage`

---

### 📝 Nội dung & Marketing

#### ORC-04 — SEO Blog Writer

| Stage | Tên | Model | Vai trò | Checkpoint |
|-------|-----|-------|---------|------------|
| A | Content Strategist | 🧠 Pro | Phân tích keyword intent, audience, competitor angles → strategy brief | JSON: `{primary_intent, audience_persona, angle, outline[]}` |
| B | Content Writer | ⚡ Flash Long Output | Viết bài đầy đủ theo outline, đảm bảo tone & word count | JSON: `{title, sections[], word_count}` |
| C | SEO & Quality Auditor ✅ | ⚡ Flash Deterministic | Chấm điểm readability, keyword density, CTA presence → suggest fixes | `{seo_score, readability_score, issues[], meta_description, final_content}` |

- **Cardinality:** 1:1 → 1:1 → 1:1
- **Cost logic:** Pro chỉ ở Stage A (strategy cần context window lớn + reasoning); Flash viết nhanh + rẻ; Flash Deterministic kiểm tra chuẩn mực SEO
- **Tags:** `#marketing` `#seo` `#blog` `#3-stage`

---

#### ORC-05 — Social Media Pack Generator

| Stage | Tên | Model | Vai trò | Checkpoint |
|-------|-----|-------|---------|------------|
| A | Core Message Distiller | ⚡ Flash | Trích lọc key message, USPs, CTA từ bài viết/sản phẩm gốc | JSON: `{core_message, usps[], cta, tone}` |
| B | Platform Adapter ✅ | ⚡ Flash Creative (1:N) | Sinh copy riêng cho từng platform theo character limit, tone, format đặc thù; kèm char_count validation | `[{platform, content, hashtags, char_count, within_limit}]` |

- **Cardinality:** 1:1 → 1:N
- **Cost logic:** Thuần Flash — tác vụ sáng tạo nhưng có cấu trúc rõ, Flash Creative là đủ
- **Tags:** `#marketing` `#social-media` `#content` `#2-stage`

---

#### ORC-06 — Product Description Batch Writer

| Stage | Tên | Model | Vai trò | Checkpoint |
|-------|-----|-------|---------|------------|
| A | Attribute Structurer | ⚡ Flash Deterministic | Parse raw product data thô → normalize thành structured attributes | JSON: `{product_id, category, features[], target_buyer, price_tier}` |
| B | Copywriter | ⚡ Flash Creative | Viết short + long description, selling points, SEO title từ structured attributes | JSON: `{short_desc, long_desc, selling_points[], seo_title}` |
| C | Brand Voice Checker ✅ | ⚡ Flash Deterministic | Kiểm tra tone/voice consistency, detect generic phrases, validate char count | `{passed, issues[], final_short_desc, final_long_desc}` |

- **Cardinality:** 1:1 → 1:1 → 1:1
- **Cost logic:** Deterministic cho parse/check (ổn định, tiết kiệm token), Creative cho copy
- **Tags:** `#ecommerce` `#marketing` `#batch` `#3-stage`

---

### 🔍 Phân tích & Nghiên cứu (Research & Analysis)

#### ORC-07 — Document Intelligence

| Stage | Tên | Model | Vai trò | Checkpoint |
|-------|-----|-------|---------|------------|
| A | Chunk Analyzer | ⚡ Flash (1:N) | Phân tích từng chunk văn bản → trích facts, entities, key claims | JSON per chunk: `{facts[], entities[], key_claims[], source_section}` |
| B | Cross-Chunk Synthesizer | 🧠 Pro (N:1) | Merge insights từ tất cả chunks → xác định themes chính, contradictions, gaps | JSON: `{themes[], contradictions[], evidence_map}` |
| C | Executive Report Writer ✅ | ⚡ Flash | Viết báo cáo executive từ synthesis; validate coverage so với input | `{executive_summary, key_findings[], risks[], recommendations[], coverage_score}` |

- **Cardinality:** 1:N → N:1 → 1:1
- **Cost logic:** Flash cho chunk analysis (scale theo số trang), Pro chỉ cho synthesis (1 lần, giá cao nhưng cần reasoning tổng thể)
- **Tags:** `#research` `#document` `#analysis` `#3-stage`

---

#### ORC-08 — Competitive Intelligence Analyzer

| Stage | Tên | Model | Vai trò | Checkpoint |
|-------|-----|-------|---------|------------|
| A | Feature Extractor | ⚡ Flash Deterministic (1:N) | Parse mô tả từng competitor → chuẩn hóa feature list, pricing, positioning | JSON per competitor: `{name, features[], pricing_model, target_segment}` |
| B | Comparison Matrix Builder | 🧠 Pro (N:1) | Tổng hợp feature matrix, xác định differentiators, market gaps | JSON: `{comparison_matrix[][], differentiators[], uncontested_areas[]}` |
| C | SWOT & Strategy Advisor ✅ | 🧠 Pro | Sinh SWOT dựa trên matrix; validate logic SWOT (mỗi quadrant có evidence) | `{swot_analysis, opportunity_gaps[], strategic_recommendations[], swot_evidence_map}` |

- **Cardinality:** 1:N → N:1 → 1:1
- **Cost logic:** Flash cho extraction (structured, predictable); Pro cho B+C — competitive reasoning cần context rộng và logic sâu
- **Tags:** `#business` `#competitive-analysis` `#strategy` `#3-stage`

---

### 💻 Lập trình & Kỹ thuật (Tech & Engineering)

#### ORC-09 — Code Review & Refactor Advisor

| Stage | Tên | Model | Vai trò | Checkpoint |
|-------|-----|-------|---------|------------|
| A | Static Analyzer | 💡 Thinking Flash | Deep analysis: bugs, security vulnerabilities, N+1, memory leaks, anti-patterns | JSON: `[{issue_type, severity, line, description, evidence}]` |
| B | Refactor Architect | 🧠 Pro | Viết code refactored hoàn chỉnh + giải thích từng thay đổi | JSON: `{refactored_code, changes_explained[], design_patterns_applied[]}` |
| C | Diff Validator ✅ | ⚡ Flash Deterministic | So sánh original vs refactored: đảm bảo logic không bị thay đổi, check coverage issues | `{logic_preserved, new_issues[], net_improvement_score, approved}` |

- **Cardinality:** 1:1 → 1:1 → 1:1
- **Cost logic:** Thinking cho analysis (cần reasoning về code path); Pro cho refactor (quality output); Flash Deterministic cho validation (low cost, high precision)
- **Tags:** `#engineering` `#code-review` `#refactor` `#3-stage`

---

#### ORC-10 — API Documentation Generator

| Stage | Tên | Model | Vai trò | Checkpoint |
|-------|-----|-------|---------|------------|
| A | Endpoint Parser | ⚡ Flash Deterministic (1:N) | Parse từng endpoint: method, path, params, body schema từ source code | JSON per endpoint: `{method, path, params[], body_schema, auth_required}` |
| B | Doc Writer & Example Builder ✅ | ⚡ Flash Creative | Viết description, generate request/response examples thực tế, thêm use-case | `[{endpoint, description, request_example, response_example, error_codes[], use_case}]` |

- **Cardinality:** 1:N → 1:1
- **Cost logic:** Thuần Flash — parsing có cấu trúc + creative doc writing không cần Pro
- **Tags:** `#engineering` `#api` `#documentation` `#2-stage`

---

### 🏥 Y tế (Healthcare)

#### ORC-11 — Clinical Note to SOAP

| Stage | Tên | Model | Vai trò | Checkpoint |
|-------|-----|-------|---------|------------|
| A | Clinical Entity Extractor | ⚡ Flash Deterministic | Trích xuất symptoms, vitals, medications, timeline từ raw notes | JSON: `{symptoms[], vitals{}, medications[], timeline[]}` |
| B | SOAP Structurer | 🧠 Pro | Tổ chức entities vào cấu trúc SOAP chuẩn; inference Assessment từ S+O | JSON: `{subjective, objective, assessment, plan}` |
| C | Completeness Auditor ✅ | ⚡ Flash Deterministic | Kiểm tra mỗi SOAP section đủ thông tin; flag missing critical fields | `{completeness_score, missing_fields[], flags[], requires_clinician_review}` |

- **Cardinality:** 1:1 → 1:1 → 1:1
- **Cost logic:** Pro chỉ ở Stage B (clinical reasoning cần chất lượng cao); Flash cho extract + audit
- **Disclaimer:** ⚠️ Cho mục đích học tập/nghiên cứu. Không thay thế chẩn đoán y tế chuyên nghiệp.
- **Tags:** `#healthcare` `#medical` `#soap` `#3-stage`

---

### ⚖️ Pháp lý (Legal)

#### ORC-12 — Contract Risk Scanner

| Stage | Tên | Model | Vai trò | Checkpoint |
|-------|-----|-------|---------|------------|
| A | Clause Segmenter | ⚡ Flash Deterministic (1:N) | Tách hợp đồng thành từng clause, gán clause_type, xác định điều khoản bất thường | JSON per clause: `{clause_id, type, text, is_standard, anomaly_flag}` |
| B | Risk Assessor | 🧠 Pro (N:1) | Đánh giá rủi ro từng clause theo jurisdiction + contract_type; so sánh vs market standard | JSON: `[{clause_id, risk_level, reason, market_deviation}]` |
| C | Legal Plain-English Summarizer ✅ | ⚡ Flash | Viết tóm tắt ngôn ngữ đơn giản; validate rằng mọi high-risk clause đều có explanation | `{risk_score, plain_summary, high_risk_clauses[], recommendations[], human_review_required}` |

- **Cardinality:** 1:N → N:1 → 1:1
- **Cost logic:** Flash cho segmentation (structured parsing); Pro cho legal reasoning; Flash cho summary (fast & cheap)
- **Disclaimer:** ⚠️ Cho review sơ bộ. Không thay thế tư vấn pháp lý chuyên nghiệp.
- **Tags:** `#legal` `#contract` `#risk` `#3-stage`

---

### 🌐 Đa ngôn ngữ (Localization)

#### ORC-13 — Product Localization Pipeline

| Stage | Tên | Model | Vai trò | Checkpoint |
|-------|-----|-------|---------|------------|
| A | Contextual Translator | 🧠 Pro (1:N per language) | Dịch có ngữ cảnh (không word-for-word), hiểu product domain và brand voice | JSON per string: `{string_id, source, translated, translation_notes}` |
| B | Cultural Adapter | ⚡ Flash Creative | Điều chỉnh idioms, metaphors, humor, số đo, ngày tháng cho phù hợp văn hóa địa phương | JSON: `{string_id, adapted_text, cultural_delta_notes[]}` |
| C | Linguistic QA Auditor ✅ | ⚡ Flash Deterministic | Kiểm tra consistency terminolog, char limit (UI strings), back-translation sanity check | `{string_id, status, issues[], final_text, char_count, within_ui_limit}` |

- **Cardinality:** 1:N → 1:1 → 1:1
- **Cost logic:** Pro cho translation (chất lượng quyết định trải nghiệm người dùng); Flash cho cultural adapt + QA (rule-based, không cần Pro)
- **Tags:** `#localization` `#translation` `#multilingual` `#3-stage`

---

### 📧 Chăm sóc khách hàng (Customer Support)

#### ORC-14 — Support Ticket Intelligence

| Stage | Tên | Model | Vai trò | Checkpoint |
|-------|-----|-------|---------|------------|
| A | Intent & Sentiment Classifier | ⚡ Flash Deterministic | Phân loại intent, sentiment, urgency, topic từ ticket text | JSON: `{ticket_id, intent, sentiment, urgency_score, topic, language}` |
| B | Knowledge-Based Response Drafter | ⚡ Flash Creative | Draft response cá nhân hóa; inject product knowledge từ %%input_data%% (FAQ, KB) | JSON: `{draft_response, referenced_kb_articles[], escalation_recommended}` |
| C | Response Quality Validator ✅ | ⚡ Flash Deterministic | Kiểm tra: response có address đúng intent không, có tone phù hợp không, có hallucination không | `{quality_score, issues[], approved, final_response}` |

- **Cardinality:** 1:1 → 1:1 → 1:1
- **Cost logic:** 100% Flash — volume lớn (hàng nghìn ticket/ngày), cần speed và cost efficiency; quality được đảm bảo bởi Stage C validator
- **Tags:** `#customer-support` `#classification` `#automation` `#3-stage`

---

### 🎨 Sáng tạo (Creative)

#### ORC-15 — Story World Builder

| Stage | Tên | Model | Vai trò | Checkpoint |
|-------|-----|-------|---------|------------|
| A | World Architect | 🧠 Pro | Xây dựng world lore đầy đủ: geography, history, magic system, factions, conflicts | JSON: `{world_name, lore, geography, factions[], central_conflict, rules_of_world[]}` |
| B | Character Creator | ⚡ Flash Creative (1:N) | Sinh N nhân vật đa chiều với backstory, motivation, relationships dựa trên world lore từ Stage A | JSON: `[{name, role, backstory, motivation, relationships[], arc_potential}]` |
| C | Scene & Plot Outliner ✅ | ⚡ Flash Creative | Outline 3 opening scenes; validate rằng nhân vật và lore từ A+B được tích hợp nhất quán | `{scenes[], consistency_check: {lore_used, characters_introduced, hooks[]}}` |

- **Cardinality:** 1:1 → 1:N → 1:1
- **Cost logic:** Pro cho World Building (cần sáng tạo có chiều sâu và consistency); Flash Creative cho character/scene generation (volume + creativity)
- **Tags:** `#creative` `#writing` `#worldbuilding` `#3-stage`

---

## 3. Prompt Templates

> Templates standalone (không kèm orchestration) có thể dùng độc lập hoặc embed vào pipeline.

| # | Tên Template | Mô tả | Input Variables | Tags |
|---|--------------|-------|-----------------|------|
| T-01 | **Executive Summary Writer** | Tóm tắt executive 1 trang từ tài liệu dài | `%%input_data%%`, `%%max_words%%` | `#summarization` `#business` |
| T-02 | **Meeting Minutes Formatter** | Chuyển raw notes cuộc họp → minutes có cấu trúc | `%%input_data%%`, `%%attendees%%` | `#productivity` `#business` |
| T-03 | **Email Tone Rewriter** | Điều chỉnh tone email (formal/casual/friendly/assertive) | `%%input_data%%`, `%%target_tone%%` | `#email` `#writing` |
| T-04 | **Data Schema Inferrer** | Nhận JSON mẫu, trả về JSON Schema đầy đủ | `%%input_data%%` | `#code` `#data` |
| T-05 | **Persona-Based Response** | Trả lời câu hỏi theo persona được định nghĩa | `%%input_data%%`, `%%persona%%` | `#roleplay` `#creative` |
| T-06 | **Batch Sentiment Analyzer** | Phân tích sentiment cho list reviews/comments | `%%input_data%%` | `#sentiment` `#analysis` `#batch` |
| T-07 | **Technical Explainer (ELI5)** | Giải thích khái niệm kỹ thuật theo ngôn ngữ đơn giản | `%%input_data%%`, `%%audience_level%%` | `#education` `#technical` |
| T-08 | **SQL Query Generator** | Sinh SQL query từ mô tả nghiệp vụ + schema | `%%input_data%%`, `%%db_schema%%` | `#code` `#sql` `#data` |
| T-09 | **Interview Question Bank** | Tạo bộ câu hỏi phỏng vấn cho một role/skill | `%%input_data%%`, `%%level%%` | `#hr` `#recruitment` |
| T-10 | **Bug Report Formatter** | Chuyển mô tả lỗi tự do → bug report chuẩn | `%%input_data%%` | `#engineering` `#qa` |

---

## 4. Custom View Components

> Các Component hiển thị output_data theo cách chuyên biệt, phù hợp với từng pipeline.

| # | Tên Component | Hiển thị gì | Use Case | Tags |
|---|---------------|-------------|----------|------|
| C-01 | **QuizCard Viewer** | Câu hỏi multiple-choice với reveal answer | Question Gen pipelines | `#education` `#quiz` |
| C-02 | **SWOT Matrix** | Bảng 2×2 Strengths/Weaknesses/Opportunities/Threats | Competitive Analysis | `#business` `#strategy` |
| C-03 | **Risk Heatmap Table** | Table với màu theo severity (red/amber/green) | Contract Scanner, Risk Analysis | `#legal` `#risk` |
| C-04 | **Side-by-Side Translator** | 2 cột song song Source vs Translated | Localization pipelines | `#translation` `#localization` |
| C-05 | **Sentiment Badge List** | List items với badge màu theo sentiment | Sentiment Analysis | `#sentiment` `#marketing` |
| C-06 | **Code Diff Viewer** | Hiện original vs refactored code side-by-side | Code Review pipeline | `#code` `#engineering` |
| C-07 | **Character Card Grid** | Grid cards cho các nhân vật fiction (avatar placeholder, traits) | Story World Builder | `#creative` `#writing` |
| C-08 | **Ticket Priority Board** | Kanban-style columns (Low/Med/High/Critical) | Support Ticket Triager | `#customer-support` `#crm` |
| C-09 | **Flashcard Flipper** | Interactive flip card (front/back) với navigation | Flashcard Builder | `#education` `#memorization` |
| C-10 | **SOAP Note Renderer** | Structured clinical note với 4 sections màu phân biệt | Medical Case Summarizer | `#healthcare` `#medical` |
| C-11 | **Social Media Preview** | Mock-up card cho mỗi platform (LinkedIn, X, IG) | Social Media Pack | `#marketing` `#social-media` |
| C-12 | **Token Cost Estimator Panel** | Panel hiển thị token usage + estimated cost cho batch output | Utility/general | `#utility` `#monitoring` |

---

## 5. Starter Kits (Bundle)

> Bundle kết hợp 1 Orchestration + N Templates + M Components + AI Preset để dùng ngay 1 click.

| # | Tên Kit | Bao gồm | Lĩnh vực |
|---|---------|---------|---------|
| SK-01 | **EdTech Question Generator Starter** | ORC-01 + 3 templates + QuizCard Viewer + Flash Standard Preset | Education |
| SK-02 | **Content Marketing Starter** | ORC-04 + ORC-05 + 4 templates + Social Media Preview + Flash Creative Preset | Marketing |
| SK-03 | **Competitive Research Starter** | ORC-08 + 2 templates + SWOT Matrix + Pro Analyst Preset | Business |
| SK-04 | **DevOps Productivity Starter** | ORC-09 + ORC-10 + 3 templates + Code Diff Viewer + Pro Precise Preset | Engineering |

---

## 6. Roadmap Ưu tiên

### Phase A — Publish ngay (Low effort, High impact)

- [ ] **P-01 đến P-08**: Publish 8 AI Presets mặc định từ Supabase lên Hub
- [ ] **ORC-01** (Question Gen Batch 3-Stage): Đã có, chỉ cần tag + publish
- [ ] **T-01, T-02, T-03, T-06**: 4 templates phổ dụng nhất
- [ ] **C-01** (QuizCard Viewer): Extend component đang có

### Phase B — Build & Publish (Medium effort)

- [ ] **ORC-04** (SEO Blog Writer): Marketing use-case phổ biến
- [ ] **ORC-05** (Social Media Pack): Viral potential cao
- [ ] **ORC-07** (Document Intelligence): Broad appeal
- [ ] **ORC-14** (Support Ticket Triager): B2B value
- [ ] Components C-02, C-03, C-05, C-06

### Phase C — Advanced Domains (Higher effort, specialized)

- [ ] **ORC-11** (Medical Case Summarizer) — cần disclaimer
- [ ] **ORC-12** (Contract Risk Scanner) — cần disclaimer
- [ ] **ORC-13** (Product Localization Pipeline) — multi-lang complexity
- [ ] **ORC-15** (Story World Builder) — creative niche
- [ ] **SK-01 đến SK-04**: Bundle packaging

---

## Notes

- **Tất cả Orchestration** cần có full JSON config (theo chuẩn doc `11_AI_Agent_Authoring_Guide.md`) trước khi publish.
- **Tất cả Template** cần follow chuẩn prompt structure từ `11_AI_Agent_Authoring_Guide.md` (MISSION → INPUT DATA → INSTRUCTIONS → VALIDATION → OUTPUT FORMAT).
- **Tất cả Component** cần tuân thủ sandbox rules của `12_AI_Agent_Component_Guide.md` (no `import`, no `fetch`, dùng injected globals).
- Các pipeline liên quan đến **y tế** và **pháp lý** phải có disclaimer rõ ràng trong `description` khi publish lên Hub.

---

*Last updated: 2026-03-05 | Orchable Community Hub Ideas Bank v1.0*
