# Change: Add Role System — user, admin, superadmin

## Why

Orchable hiện không có hệ thống phân quyền theo role. `TierContext` đang dùng hardcode email để xác định admin. Cần một hệ thống role rõ ràng, lưu trong DB, được enforce qua RLS và được đọc đúng ở frontend.

Đồng thời, tier (free/premium) cần được tách biệt hoàn toàn thành bảng `user_subscriptions` độc lập để chuẩn bị tích hợp Stripe.

## What Changes

- **BREAKING**: `user_profiles.role` chuyển từ `character varying` tự do sang PostgreSQL enum `user_role` với 3 giá trị: `user`, `admin`, `superadmin`
- **NEW**: Bảng `user_subscriptions` lưu tier (free/premium) với cột `tier` được sync vào `user_profiles.tier`
- **NEW**: SQL helper functions `get_my_role()` và `is_admin()` cho RLS policies
- **NEW**: Admin-bypass RLS policies trên các bảng quan trọng
- **NEW**: `RoleContext` frontend với `useRole()` hook
- **MODIFY**: `TierContext.tsx` đọc tier từ `user_subscriptions` thay vì hardcode email
- **MODIFY**: `ProtectedRoute` thêm optional prop `requiredRole`
- **NEW**: `useRoleGuard(role)` hook cho conditional rendering
- **MODIFY**: Community Hub `hub_assets` — mọi authenticated user đều có thể publish (không cần premium)

## Impact

- **Specs**: `specs/auth`, `specs/subscriptions`
- **Code Files**:
  - `src/supabase/20260226_add_role_system.sql` (new migration)
  - `src/contexts/RoleContext.tsx` (new)
  - `src/contexts/TierContext.tsx` (modify — remove hardcoded email)
  - `src/contexts/AuthContext.tsx` (modify — expose profile with role)
  - `src/components/common/ProtectedRoute.tsx` (modify — add requiredRole)
  - `src/hooks/useRoleGuard.ts` (new)
  - `src/supabase/20260226_add_rls_to_hub_assets.sql` (new — fix hub policies)
