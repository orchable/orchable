---
description: Archive a deployed OpenSpec change and apply spec deltas to main specs
---

// turbo-all

## Steps

1. Run the openspec archive command:

```bash
openspec archive <change-id> --yes
```

2. Confirm the spec delta was applied. The CLI will report which specs were updated.

3. **Check `doc/` for stale content** — scan `doc/00_Index.md` and any doc files
   related to the archived change. Update them or add `<!-- STALE: reason -->` comments.

4. Re-sync all platform AI rule files:

```bash
npm run sync:context
```

5. Commit everything together:

```bash
git add openspec/ doc/ .cursor/ .windsurfrules .agents/ .github/copilot-instructions.md
git commit -m "chore: archive <change-id> + sync AI context"
```

Return a summary of: which specs were updated, which doc/ files were checked, and
whether `sync:context` reported any written or unchanged files.
