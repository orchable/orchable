---
sidebar_position: 3
title: Custom Components
---

# 🎨 AI Agent Authoring Guide: Custom View Components

> **Audience:** AI Agents requested to create Custom View Components (TSX) for the Orchable system.

This document provides full sandbox information, available globals, security constraints, and practical patterns for an AI Agent to write **Custom View Components** following system standards.

---

## PART 1: SANDBOX ENVIRONMENT

### 1.1 Concept

A Custom View Component is a **TSX** file written by the user to display the `output_data` of an AI task in a custom way. The component is compiled and executed within a **scoped function sandbox** (no direct DOM access).

**Execution Flow:**
```
Source TSX → [Validation] → [Sucrase Compile] → [Scoped Function] → React Element
```

---

### 1.2 Injected Globals (Available, NO import needed)

All the following identifiers are scope-injected — **DO NOT `import` them**. Use them directly as built-ins.

#### React Hooks
- `useState`, `useEffect`, `useMemo`, `useCallback`

#### Utility
- `cn` (classNames utility)

#### Shadcn/UI Components
- `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription`, `CardFooter`
- `Badge`
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`, `TableFooter`, `TableCaption`

#### Lucide Icons
- All icons from `lucide-react` are available (e.g., `User`, `Activity`, `Brain`, `Sparkles`).

---

### 1.3 Forbidden Patterns

The system scans the source code before compilation. The following will cause validation errors:

| Pattern | Reason |
|:--------|:------|
| `window`, `document` | Browser API / DOM access |
| `fetch`, `XMLHttpRequest` | Network request |
| `localStorage` | Storage access |
| `eval`, `Function` | Dynamic code execution |
| `import`, `require` | Module system |
| `dangerouslySetInnerHTML` | XSS vulnerability |

---

### 1.4 Component Interface

The component MUST be named `Component` (capitalized). It receives props:

```tsx
const Component = ({ data, schema }) => {
  // data = task output_data (JSON object)
  // schema = output JSON schema (optional)
  return <div>...</div>;
};
```

---

## PART 2: COMPONENT TEMPLATES

### 2.1 Full-Featured Example

```tsx
const Component = ({ data, schema }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const items = data.output_data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-primary" />
        <h3 className="font-bold">Results Analyzer</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, i) => (
          <Card key={i} className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Item #{i + 1}</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-slate-400 overflow-auto">
                {JSON.stringify(item, null, 2)}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
```

*Last Updated: 2026-02-24*
