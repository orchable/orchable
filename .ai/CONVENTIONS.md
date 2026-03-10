# Orchable Coding Conventions

## File Naming

- **Components**: PascalCase → `StageConfigPanel.tsx`, `FlowCanvas.tsx`
- **Hooks**: camelCase with `use` prefix → `useConfigs.ts`, `useTier.ts`
- **Contexts**: PascalCase with `Context` suffix → `AuthContext.tsx`, `TierContext.tsx`
- **Types**: PascalCase → `StepConfig`, `OrchestratorConfig`, `Execution`
- **Services**: camelCase → `batchService.ts`, `stageService.ts`
- **Workers**: camelCase with `.worker` suffix → `taskExecutor.worker.ts`
- **Stores**: camelCase with `Store` suffix → `designerStore.ts`

## Component Patterns

### Page Components

```tsx
// src/pages/[PageName].tsx
export default function PageName() {
  return (
    <div className="...">
      {/* Page content */}
    </div>
  );
}
```

### Service Pattern

Services are plain objects with async methods (not classes):

```typescript
// src/services/[name]Service.ts
export const nameService = {
  async methodName(args): Promise<ReturnType> {
    // ...
  },
};
```

## Import Aliases

- `@/*` resolves to `src/*`
- Always use `@/` prefix for project imports, never relative `../../../`
- Exception: Workers may use relative imports for IndexedDB adapter

## State Rules

1. **Zustand** for complex client state (`designerStore`)
2. **React Context** for cross-cutting concerns (auth, tier)
3. **React Query** for server state / caching
4. Keep component state local unless shared across siblings

## CSS / Styling

- TailwindCSS utility classes for all styling
- `cn()` helper from `@/lib/utils` for conditional classes
- `index.css` for CSS custom properties (HSL color tokens)
- shadcn/ui components for all UI primitives
- Framer Motion for animations

## Type Conventions

- Cardinality values: use tuple style (`"1:1"`, `"1:N"`, `"N:1"`) in UI, normalized form (`"one_to_one"`, `"one_to_many"`, `"many_to_one"`) in runtime.
- `stage_key`: Always lowercase with underscores (`stage_1`, `qgen`, `formatter`).
- Template IDs: `{orchestratorId}_{stageKey}_{stageId}` convention.

## Git Commits

Use Conventional Commits:
- `feat:` new feature
- `fix:` bug fix
- `refactor:` code restructuring
- `docs:` documentation
- `chore:` maintenance (deps, configs)
