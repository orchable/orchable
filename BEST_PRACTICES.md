# Orchable – Best Practices cho AI-Assisted Development

> **Cập nhật**: 11 tháng 3, 2026
> **Áp dụng cho**: Dự án Orchable (hiện tại: Production)

---

## 📊 Mục lục

1. [AI Agent Context Sharing](#1-ai-agent-context-sharing)
2. [Architecture Discipline](#2-architecture-discipline)
3. [Cơ Chế Hạn Chế Lỗi với AI Agent](#3-cơ-chế-hạn-chế-lỗi-với-ai-agent)
4. [Worker Development Guidelines](#4-worker-development-guidelines)
5. [Tóm Tắt Nhanh](#5-tóm-tắt-nhanh)

---

## 1. AI Agent Context Sharing

### a) OpenSpec (đã có)

Single Source of Truth cho requirements. Trước khi code:
1. Đọc `openspec/project.md` để hiểu project rules.
2. Chạy `openspec list` và `openspec list --specs` để biết trạng thái hiện tại.
3. Tạo proposal trước khi triển khai thay đổi lớn.

### b) `.ai/` Context Directory

```
.ai/
├── ARCHITECTURE.md     # Tổng quan kiến trúc & data flow
├── CONVENTIONS.md      # Coding conventions, naming patterns
├── GLOSSARY.md         # Thuật ngữ dự án (Stage, Batch, Task...)
├── GUARDRAILS.md       # Do's and Don'ts cho AI Agent
└── STACK.md            # Tech stack & versions
```

AI Agent đọc các file này để hiểu **tại sao** hệ thống được thiết kế như vậy.

### c) Knowledge Items (KIs)

Mỗi conversation tạo ra KIs tự động. Để maximize hiệu quả:
- Đảm bảo dùng **cùng workspace** để KIs được share.
- Tạo KIs thủ công cho kiến thức quan trọng (decisions, gotchas).

---

## 2. Architecture Discipline

### Dual-Tier Storage

Mọi service phải tuân thủ:
```typescript
// ✅ Đúng: Dùng StorageAdapter
const adapter = storage.adapter;
await adapter.createBatch(data);

// ❌ Sai: Truy cập trực tiếp
await supabase.from('task_batches').insert(data);
```

### Backward Compatibility

| Loại thay đổi | An toàn? | Cách làm |
|---|---|---|
| Thêm field optional vào StepConfig | ✅ An toàn | Thêm `?` suffix |
| Thêm field required vào StepConfig | ❌ Breaking | Dùng optional + default |
| Đổi tên stage_key | ❌ Breaking | Thêm mới, migrate, xóa cũ |
| Thêm Supabase column nullable | ✅ An toàn | `ALTER TABLE ADD COLUMN ... NULL` |
| Thêm IndexedDB field | ✅ An toàn | Schema-less, tự động |

### OpenSpec-First Change Flow

```
1. Idea → `openspec/changes/{change-id}/proposal.md`
2. Review → Approval
3. Implement → Follow `tasks.md` checklist
4. Verify → Manual test + `openspec validate --strict`
5. Deploy → Archive change
```

---

## 3. Cơ Chế Hạn Chế Lỗi với AI Agent

### Guardrails

```markdown
## Do NOT
- Modify taskExecutor.worker.ts without thorough review
- Bypass StorageAdapter — use services layer
- Hardcode API keys
- Break backward compatibility of StepConfig

## Always
- Run `npm run build` before committing
- Test with both Free and Premium tier
- Use stage_key as stable runtime identifier
- Log with module prefix: [Worker], [BatchService], etc.
```

### Automated Safety Nets

| Tool | Purpose |
|---|---|
| `npm run build` | Catch TypeScript errors |
| `npm run lint` | Consistent code style |
| `openspec validate --strict` | Spec integrity |
| `npm run test` | Unit tests (Vitest) |

### Review Protocol cho AI-generated code

1. AI phải tạo OpenSpec proposal cho thay đổi lớn.
2. Thay đổi Worker phải được test với actual task execution.
3. Thay đổi types phải verify backward compat.

---

## 4. Worker Development Guidelines

`taskExecutor.worker.ts` là trái tim của hệ thống. Quy tắc:

### a) Không block poll loop

```typescript
// ✅ Đúng: Non-blocking processing
async function processTask(task) {
  // Process single task, return quickly
}

// ❌ Sai: Blocking loop
while (allTasksDone) {
  await sleep(1000); // Blocks entire worker
}
```

### b) Transaction Safety

```typescript
// ✅ Đúng: Use transaction for atomic operations
await db.transaction('rw', db.ai_tasks, db.task_batches, async () => {
  // Atomic check + create to prevent duplicates
});
```

### c) Key Management

- Never log API keys.
- Always use `keyManager.getBestKey()` to get the healthiest available key.
- Report success/failure back to KeyManager for tracking.

---

## 5. Tóm Tắt Nhanh

| Vấn đề | Giải pháp |
|---|---|
| AI Agent thiếu context | `.ai/` context dir + OpenSpec |
| Breaking changes | Optional fields + OpenSpec proposal |
| Worker bugs | Transaction safety + pre-flight checklist |
| Storage inconsistency | Always use StorageAdapter, never direct access |
| Code quality | `npm run build` + `openspec validate --strict` |
| Thay đổi lớn | OpenSpec proposal → review → implement |
