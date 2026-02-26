## ADDED Requirements

### Requirement: Role Enum Type

Hệ thống SHALL định nghĩa một PostgreSQL enum `public.user_role` với các giá trị cố định:
- `user` — người dùng thường (mặc định)
- `admin` — quản trị viên hệ thống Orchable
- `superadmin` — quản trị viên tối cao, có thể gán role và thay đổi billing

#### Scenario: Enum created

- **WHEN** migration `add_role_system.sql` được chạy
- **THEN** `SELECT * FROM pg_type WHERE typname = 'user_role'` trả về 1 row
- **AND** `user_profiles.role` chấp nhận `'user'`, `'admin'`, `'superadmin'`
- **AND** INSERT với role `'org_admin'` bị reject bởi DB constraint

---

### Requirement: User Profiles Role Column Migration

Hệ thống SHALL migrate `user_profiles.role` từ `character varying` sang enum `public.user_role`.

#### Scenario: Existing invalid values handled

- **WHEN** migration chạy và có rows với role nằm ngoài enum set
- **THEN** những rows đó được UPDATE thành `'user'` trước khi ALTER
- **AND** migration hoàn thành không lỗi

#### Scenario: Default role set

- **WHEN** user mới đăng ký (row mới insert vào `user_profiles`)
- **THEN** `role` mặc định là `'user'`

---

### Requirement: User Subscriptions Table

Hệ thống SHALL tạo bảng `user_subscriptions` để lưu tier subscription độc lập với role.

Schema:
```sql
CREATE TABLE public.user_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier          varchar NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  stripe_customer_id  text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
```

#### Scenario: Subscription row created on signup

- **WHEN** user đăng ký tài khoản mới
- **THEN** `user_subscriptions` có 1 row cho user đó với `tier = 'free'`

#### Scenario: Tier synced to user_profiles

- **WHEN** `user_subscriptions.tier` được UPDATE (ví dụ: Stripe webhook → `'premium'`)
- **THEN** trigger cập nhật `user_profiles.tier` về cùng giá trị trong vòng 1 transaction

---

### Requirement: RLS Helper Functions

Hệ thống SHALL cung cấp 2 helper functions cho RLS policies:

```sql
-- Returns role of current authenticated user
get_my_role() RETURNS public.user_role

-- Returns true if current user is admin or superadmin
is_admin() RETURNS boolean
```

#### Scenario: Admin check in policy

- **WHEN** `is_admin()` được gọi trong context của user với role `'admin'`
- **THEN** function trả về `true`
- **WHEN** `is_admin()` được gọi với role `'user'`
- **THEN** function trả về `false`

---

### Requirement: Admin Bypass RLS Policies

Hệ thống SHALL thêm admin-bypass policies trên các bảng dữ liệu quan trọng để admin có thể xem data của bất kỳ user nào (phục vụ hỗ trợ kỹ thuật).

Bảng cần admin bypass: `orchestrator_executions`, `ai_tasks`, `task_batches`, `workflow_jobs`.

#### Scenario: Admin views all executions

- **WHEN** user với role `'admin'` query `orchestrator_executions` mà không có `WHERE user_id`
- **THEN** query trả về executions của tất cả users
- **AND** user với role `'user'` query cùng bảng chỉ thấy data của chính mình

---

### Requirement: Hub Publishing Open to All Authenticated Users

Hệ thống SHALL cho phép mọi authenticated user (kể cả free tier) publish asset lên Community Hub.

#### Scenario: Free user publishes to Hub

- **WHEN** user với `tier = 'free'` INSERT vào `hub_assets` với `is_public = true`
- **THEN** insert thành công, không bị reject bởi RLS
