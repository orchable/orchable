# Orchable Role & Permission Design

> **Status: 🟡 DRAFT — Awaiting Review**

## 1. Bối cảnh

Orchable là một **AI Orchestration Platform** với các tính năng chính:
- **Core Orchestration**: Lab configs, task batches, AI tasks, prompt templates
- **Community Hub**: Chia sẻ public orchestrations/templates/components
- **Workflow System**: Orchestrators, phases, steps, executions
- **AI Model Management**: API keys, model settings, usage tracking
- **System Prompts**: Customization & override

Với tính chất SaaS multi-user, cần phân quyền theo **2 trục**:
1. **Trục nằm ngang (Tier)**: Giới hạn tài nguyên/quota → `free`, `premium`
2. **Trục dọc (Role)**: Giới hạn chức năng/quyền hạn → Đây là trọng tâm document này

---

## 2. Định nghĩa Roles

### 2.1 `user` — Người dùng thường (Free & Premium)

> Mọi người đăng ký đều bắt đầu ở đây.

- Truy cập toàn bộ tính năng cơ bản của chính mình
- Bị giới hạn bởi **tier** (free/premium), không phải role
- Có thể publish lên Community Hub (nếu premium)
- **Không thể** thấy data của user khác

### 2.2 `premium_user` — Người dùng trả phí

> Sẽ được xử lý bởi `TierContext` thay vì role column.

- Tăng quota: AI tasks, API keys, storage
- Unlock tính năng cao cấp: custom components, advanced models
- Được publish asset lên Hub không giới hạn

> [!NOTE]
> `premium_user` không phải là một **role DB** riêng biệt. Đây là **subscription tier** được lưu trong `user_profiles.tier` hoặc `user_subscriptions`. Không nên nhầm lẫn với role phân quyền.

### 2.3 `org_admin` — Quản trị viên tổ chức

> Xuất hiện khi một tổ chức (trường học, công ty, nhóm) dùng Orchable.

- Quản lý **workspace** của tổ chức: thêm/xóa thành viên
- Chia sẻ prompt templates, lab configs trong nội bộ tổ chức
- Xem báo cáo sử dụng của team
- **Không thể** xem data của tổ chức khác
- **Không thể** thực hiện hành động admin toàn hệ thống

> [!IMPORTANT]
> `org_admin` yêu cầu thêm bảng `organizations` và `org_memberships`. Đây là tính năng **Phase 2/3** — cần thiết kế riêng.

### 2.4 `admin` — Quản trị viên hệ thống

> Nhân viên Orchable có quyền hỗ trợ người dùng và quản trị nội dung.

- Xem tất cả user data (để debug/support)
- Quản lý Community Hub: resolve reports, hide/show assets
- Quản lý AI model settings toàn hệ thống
- Chỉnh sửa system prompt overrides
- **Không thể** thay đổi billing hoặc cấu trúc DB

### 2.5 `superadmin` — Quản trị viên tối cao

> Tương đương với người tạo hệ thống, hiện tại = `makexyzfun@gmail.com`.

- Mọi quyền của `admin`
- Thay đổi role của user khác (bao gồm gán `admin`)
- Xem và reset subscription/billing
- Bypass tất cả RLS (via Supabase service role key)

---

## 3. Permission Matrix

| Feature Area | `user` | `premium_user` | `org_admin` | `admin` | `superadmin` |
|---|:---:|:---:|:---:|:---:|:---:|
| **Core Orchestration** |
| Tạo/chỉnh sửa Lab Config (của mình) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Xem Lab Config public | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tạo Task Batch | ✅ (giới hạn) | ✅ | ✅ | ✅ | ✅ |
| Chạy AI Tasks | ✅ (quota free) | ✅ (quota premium) | ✅ | ✅ | ✅ |
| Approve AI Tasks | ✅ (của mình) | ✅ (của mình) | ✅ (của mình) | ✅ (tất cả) | ✅ |
| **Prompt Templates** |
| Xem public templates | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tạo template cá nhân | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tạo template org-shared | ❌ | ❌ | ✅ | ✅ | ✅ |
| Chỉnh sửa system templates | ❌ | ❌ | ❌ | ✅ | ✅ |
| **AI Model Settings** |
| Thêm/xóa API key của mình | ✅ | ✅ | ✅ | ✅ | ✅ |
| Xem global model catalog | ✅ | ✅ | ✅ | ✅ | ✅ |
| Thêm model vào catalog | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Custom Components** |
| Tạo custom component | ❌ | ✅ | ✅ | ✅ | ✅ |
| Xem public components | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Community Hub** |
| Xem public assets | ✅ | ✅ | ✅ | ✅ | ✅ |
| Star / Fork assets | ✅ | ✅ | ✅ | ✅ | ✅ |
| Publish asset lên Hub | ❌ | ✅ | ✅ | ✅ | ✅ |
| Report asset vi phạm | ✅ | ✅ | ✅ | ✅ | ✅ |
| Resolve reports & hide assets | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Admin Panel** |
| Xem danh sách tất cả users | ❌ | ❌ | ❌ | ✅ | ✅ |
| Xem data của user bất kỳ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Gán role cho user | ❌ | ❌ | ❌ | ❌ | ✅ |
| Chỉnh System Prompt Overrides | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 4. Quota / Limits (Tier-based, không phải role-based)

| Limit | Free | Premium |
|---|---|---|
| AI Tasks / tháng | 100 | Unlimited |
| API Keys | 2 | 10 |
| Concurrent Batches | 1 | 5 |
| Lab Configs | 3 | Unlimited |
| Hub Publishing | ❌ | ✅ |
| Custom Components | ❌ | ✅ |

---

## 5. Cách lưu Role trong Database

### Hiện tại
`user_profiles.role` đang là `character varying` với các giá trị tự do → rủi ro.

### Đề xuất

```sql
-- Tạo enum type
CREATE TYPE public.user_role AS ENUM (
  'user',
  'org_admin',
  'admin',
  'superadmin'
);

-- Migrate column
ALTER TABLE public.user_profiles
  ALTER COLUMN role TYPE public.user_role
  USING role::public.user_role;

ALTER TABLE public.user_profiles
  ALTER COLUMN role SET DEFAULT 'user';
```

> [!NOTE]
> `premium_user` **không** thêm vào enum này. Tier được lưu riêng ở column `tier` hoặc bảng `user_subscriptions`.

### RLS Helper Function

```sql
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role IN ('admin', 'superadmin')
  FROM public.user_profiles
  WHERE id = auth.uid();
$$;
```

### RLS Pattern cho admin bypass

```sql
-- Ví dụ: Admin xem được tất cả executions
CREATE POLICY "Admins can view all executions"
  ON public.orchestrator_executions FOR SELECT TO authenticated
  USING (public.is_admin());

-- Regular user chỉ xem của mình
CREATE POLICY "Users can view own executions"
  ON public.orchestrator_executions FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND NOT public.is_admin());
```

---

## 6. Frontend: `RoleContext`

Adaption của LearnWell's pattern cho Orchable:

```tsx
export type UserRole = 'user' | 'org_admin' | 'admin' | 'superadmin';

interface RoleContextType {
  role: UserRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isImpersonating: boolean; // Admin giả lập user để debug
  impersonatedUserId: string | null;
  startImpersonating: (userId: string) => void;
  stopImpersonating: () => void;
}
```

### `useRoleGuard` Hook

```tsx
// Trong component
const { hasAccess } = useRoleGuard('admin');
if (!hasAccess) return <UnauthorizedView />;
```

---

## 7. Decisions Made ✅

> Các câu hỏi dưới đây đã được xác nhận bởi product owner.

1. **`org_admin`**: ❌ Chưa cần — giữ 3 roles: `user`, `admin`, `superadmin`
2. **Tier storage**: Bảng `user_subscriptions` **độc lập** + trigger sync vào `user_profiles.tier` (Stripe-ready)
3. **Admin impersonation**: ❌ Bỏ qua — không implement ở phase này
4. **Hub publishing**: ✅ Mọi authenticated user đều có thể publish lên Hub (không cần premium)
