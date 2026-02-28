## Context
The Orchable engine needs a way to separate primary batch looping variables (Main Input list) from static contextual references (Auxiliary Inputs like PDF, TXT) to reduce pipeline bloat. Furthermore, users need granular control over exporting intermediate or final results on a per-stage basis, rather than waiting for the entire batch to finish.

## Goals / Non-Goals
- **Goals**: Support large text documents as generic inputs across multiple stages. Enable native export configurations inside a stage without building complex "Output Node" canvas entities. Support file formats Markdown, TXT, CSV, TSV in Phase 1. Add quota safeguarding for Free tier.
- **Non-Goals**: Full multi-modal processing (Audio/Video). Google Drive/OneDrive sync integrations (Phase 1). Multi-tenant cross-user document sharing.

## Decisions
- **Decision**: Embed Export Settings in `StepConfig.IO` Tab.
  - **Reason**: Simplifies Canvas UX by mitigating node bloat. Exploits the existing "Last Sibling Standing" stage-aggregation logic (`handleManyToOne`) inside the Worker for accurate trigger timing.
- **Decision**: Auxiliary Data Snapshotting using `global_context`.
  - **Reason**: Copying the document text or Caching ID at the moment the batch launches prevents data drift if the user modifies the parent document in the Asset Library while the batch is running.
- **Decision**: Hard Limit Free Tier vs Caching Premium Tier.
  - **Reason**: Free API keys don't support Gemini Context Caching. The engine must enforce a token quota threshold (< 10000) on Launcher initialization for Free Tiers to prevent massive cost overruns. Premium users get full 1M+ token processing via `gemini_cache_name`.

## Risks / Trade-offs
- Risk: Token inflation causing `QUOTA_EXCEEDED` for Free Users. Mitigated by explicit warning blocks in `Launcher.tsx` Calculator view. 
- Risk: Gemini TTL Cache expiry midway during run. Open question handled via Cron jobs on Supabase Edge Functions.

## Migration Plan
- Existing Orchestrators continue without breaking changes, as `export_config` will be an optional property.
- The `ai_tasks` and `task_batches` views might need minor index enhancements if `global_context` becomes heavily queried.

## Open Questions
- None. Solved by aligning Auxiliary handling to pre-launch Snapshotting (A).
