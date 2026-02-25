## 1. SQL Migration
- [ ] 1.1 Create migration file `20260224_convert_ai_tasks_status_to_enum.sql`
- [ ] 1.2 Migration content:
    - Create type `ai_task_status` AS ENUM ('plan', 'pending', 'running', 'processing', 'awaiting_approval', 'completed', 'generated', 'failed', 'cancelled', 'skipped')
    - Alter `ai_tasks` status column type
    - Update default value for `status` to 'plan'

## 2. Schema Synchronization
- [ ] 2.1 Update `src/supabase/ai_tasks_schema.sql`
- [ ] 2.2 Update `src/supabase/all-schemas.sql`
- [ ] 2.3 Update `src/supabase/v_runnable_tasks_schema.sql` (filter by `plan`)

## 3. n8n Workflow Updates
- [ ] 3.1 Update `[Base] Base Agent with Key.json`:
    - Phase 5: Set child task status to `plan`
    - Merge Logic: Filter by `status IN ('completed', 'generated', 'approved')`
- [ ] 3.2 Update `[Base] Load Batch - Supabase to n8n.json`:
    - Set n8n internal status to `pending`

## 4. Frontend Updates
- [ ] 4.1 Update `src/pages/Launcher.tsx` to set initial task status to `plan`
- [ ] 4.2 Update `src/components/common/StatusBadge.tsx` to include new statuses

## 5. Verification
- [ ] 5.1 Verify existing tasks migrate correctly
- [ ] 5.2 Verify `v_runnable_tasks` still works
- [ ] 5.3 Verify batch counter triggers still work
