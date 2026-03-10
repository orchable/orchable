## Phase 1: Database Foundation

- [x] 1.1 Viết migration `20260226_add_role_system.sql`:
  - UPDATE invalid roles → `'user'`
  - CREATE enum `public.user_role` (`user`, `admin`, `superadmin`)  
  - ALTER `user_profiles.role` → `user_role` enum với DEFAULT `'user'`
  - ADD `user_profiles.tier` column (`varchar`, DEFAULT `'free'`)
  - CREATE `user_subscriptions` table (xem schema trong spec)
  - CREATE `public.get_my_role()` function
  - CREATE `public.is_admin()` function
  - CREATE `public.get_my_tier()` function
- [x] 1.2 UPDATE RLS policies trên `orchestrator_executions`, `ai_tasks`, `task_batches` với admin bypass
- [x] 1.3 UPDATE `hub_assets` RLS: Mọi authenticated user có thể INSERT (không cần premium)
- [x] 1.4 BACKFILL: Gán `superadmin` cho `makexyzfun@gmail.com` trong `user_profiles`
- [x] 1.5 Chạy migration trong Supabase local và kiểm tra không có lỗi

## Phase 2: Frontend Role Layer

- [x] 2.1 Tạo `src/contexts/RoleContext.tsx`:
  - `UserRole` type: `'user' | 'admin' | 'superadmin'`
  - Fetch role từ `user_profiles` sau khi auth
  - Expose: `role`, `isAdmin`, `isSuperAdmin`
- [x] 2.2 Sửa `src/contexts/AuthContext.tsx`:
  - Expose `profile: UserProfile | null` (bao gồm `role` và `tier`)
  - Load profile sau `onAuthStateChange`
- [x] 2.3 Sửa `src/contexts/TierContext.tsx`:
  - Bỏ hardcode `user.email === 'makexyzfun@gmail.com'`
  - Đọc tier từ `profile.tier` (đã load ở AuthContext)
- [x] 2.4 Tạo `src/hooks/useRoleGuard.ts`:
  - `useRoleGuard(requiredRole: UserRole)` → `{ hasAccess: boolean }`
- [x] 2.5 Sửa `src/components/common/ProtectedRoute.tsx`:
  - Thêm optional prop `requiredRole?: UserRole`
  - Nếu `requiredRole` set và user không đủ quyền → render `<UnauthorizedView />`
- [x] 2.6 Tạo `src/components/common/UnauthorizedView.tsx`:
  - UI đơn giản: icon Lock + message + Back button (tương tự LearnWell `FeatureRoute`)
- [x] 2.7 Wrap `App.tsx` với `<RoleProvider>` bên trong `<AuthProvider>`
- [x] 2.8 Kiểm tra: Login with superadmin → `isAdmin === true`
- [x] 2.9 Kiểm tra: Login with user thường → `isAdmin === false`

## Phase 3: Subscription Schema (Stripe-Ready)

- [x] 3.1 Bổ sung `user_subscriptions` table vào Supabase (đã làm ở Phase 1)
- [x] 3.2 Tạo Supabase Edge Function placeholder `handle-stripe-webhook` (chỉ log, không xử lý)
- [x] 3.3 Tạo DB trigger: khi `user_subscriptions.tier` thay đổi → sync vào `user_profiles.tier`
- [x] 3.4 Viết RLS cho `user_subscriptions`: users chỉ đọc của mình, admin đọc tất cả
- [x] 3.5 Document schema trong `openspec/specs/subscriptions/spec.md`

## Verification

- [x] V1 Chạy migration locally: `supabase db reset && supabase db push`
- [x] V2 Kiểm tra `user_profiles.role` là enum qua Supabase Studio
- [x] V3 Login với tài khoản superadmin → `useTier().isPremium === true`
- [x] V4 Login với tài khoản user thường → `useRole().isAdmin === false`
- [x] V5 Truy cập route `/admin` với user thường → `UnauthorizedView` hiển thị
- [x] V6 Truy cập route `/admin` với admin → pass through
- [x] V7 Publish asset lên Hub với free user → thành công (không bị chặn)
