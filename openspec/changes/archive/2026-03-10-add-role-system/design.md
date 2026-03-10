## Context

Orchable hiện có `user_profiles.role` dạng `varchar` không ràng buộc, và `TierContext` đang dùng hardcode email `makexyzfun@gmail.com` để xác định admin. Đây là kỹ thuật nợ cần được giải quyết.

Hệ thống mới tách biệt 2 khái niệm:
1. **Role**: Phân quyền chức năng → `user_profiles.role` (enum: `user/admin/superadmin`)
2. **Tier**: Giới hạn tài nguyên → `user_subscriptions.tier` (đồng bộ vào `user_profiles.tier`)

## Goals / Non-Goals

- **Goals**:
  - Role được enforce server-side qua RLS
  - Frontend đọc role từ DB, không hardcode
  - `ProtectedRoute` support `requiredRole` prop
  - `user_subscriptions` table sẵn sàng nhận webhook từ Stripe
  - Community Hub mở cho mọi authenticated user

- **Non-Goals**:
  - Không làm UI admin panel (scope riêng)
  - Không làm admin impersonation
  - Không làm `org_admin` hay multi-org (scope tương lai)
  - Không tích hợp Stripe thực sự (chỉ tạo schema sẵn)

## Decisions

| Quyết định | Lý do |
|---|---|
| 3 roles: `user/admin/superadmin` | Đơn giản, đủ dùng cho giai đoạn hiện tại |
| `premium_user` là tier, không phải role | Tách biệt phân quyền (role) và giới hạn tài nguyên (tier) |
| `user_subscriptions` độc lập | Dễ tích hợp Stripe, tier logic không ràng buộc với role |
| Sync `tier` vào `user_profiles.tier` | Frontend query đơn giản, không cần JOIN |
| Không impersonation | Tránh phức tạp hóa, audit trail chưa cần |
| Hub mở cho mọi authenticated user | Tăng community engagement ngay từ đầu |

## Risks / Trade-offs

- **Risk**: Migrate `user_profiles.role` varchar → enum có thể fail nếu có giá trị không hợp lệ.
  - **Mitigation**: Chạy `UPDATE user_profiles SET role = 'user' WHERE role NOT IN ('user', 'admin', 'superadmin')` trước khi ALTER.
- **Trade-off**: Sync `tier` vào `user_profiles.tier` tạo denormalization nhỏ, nhưng trade-off performance đơn giản là đáng.
- **Risk**: RLS `is_admin()` function gọi subquery mỗi request — có thể chậm khi scale.
  - **Mitigation**: Function được đánh dấu `SECURITY DEFINER` + `STABLE`, Postgres sẽ cache trong transaction.

## Migration Plan

1. UPDATE invalid role values → `'user'`
2. CREATE enum `user_role`
3. ALTER `user_profiles.role` → enum  
4. CREATE `user_subscriptions` table
5. CREATE helper functions `get_my_role()`, `is_admin()`
6. UPDATE RLS policies với admin bypass
7. UPDATE `hub_assets` policies → authenticated users
8. BACKFILL: Gán `superadmin` cho `makexyzfun@gmail.com`

## Open Questions

- Khi Stripe webhook gọi, cần Edge Function để update `user_subscriptions`. Đây là scope riêng nhưng cần đặt placeholder trong schema để không phá vỡ migration sau.
