# subscriptions Specification

## Purpose
TBD - created by archiving change add-role-system. Update Purpose after archive.
## Requirements
### Requirement: User Subscriptions Table Schema

Hệ thống SHALL duy trì bảng `user_subscriptions` như là nguồn sự thật duy nhất cho tier của user.

Columns bắt buộc:
- `user_id` (FK → `auth.users`, UNIQUE)
- `tier` (`'free' | 'premium'`, NOT NULL, DEFAULT `'free'`)
- `stripe_customer_id`, `stripe_subscription_id` (nullable, cho Stripe integration sau)
- `current_period_start`, `current_period_end` (nullable timestamptz)
- `cancel_at_period_end` (boolean, DEFAULT false)

#### Scenario: New user subscription record

- **WHEN** user profile được tạo lần đầu sau signup
- **THEN** một row `user_subscriptions` với `tier = 'free'` được tạo cho user đó

---

### Requirement: Tier Sync Trigger

Hệ thống SHALL tự động đồng bộ `user_profiles.tier` khi `user_subscriptions.tier` thay đổi.

#### Scenario: Tier updated via external system

- **WHEN** `user_subscriptions.tier` được UPDATE từ `'free'` sang `'premium'`
- **THEN** trigger thực thi trong cùng transaction
- **AND** `user_profiles.tier` được cập nhật thành `'premium'`

---

### Requirement: RLS for User Subscriptions

Hệ thống SHALL bảo vệ `user_subscriptions` với RLS policies:
- User chỉ đọc được subscription của chính mình
- Admin đọc được tất cả subscriptions
- Không ai (kể cả chính user) có thể UPDATE/DELETE trực tiếp (chỉ qua service role)

#### Scenario: User reads own subscription

- **WHEN** authenticated user SELECT từ `user_subscriptions`
- **THEN** chỉ thấy row có `user_id = auth.uid()`

#### Scenario: User cannot modify subscription

- **WHEN** authenticated user UPDATE `user_subscriptions`
- **THEN** operation bị reject bởi RLS (no UPDATE policy for `authenticated` role)

