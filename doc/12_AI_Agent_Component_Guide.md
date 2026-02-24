# 🎨 AI Agent Authoring Guide: Custom View Components

> **Audience:** AI Agents requested to create Custom View Components (TSX) for the Orchable system.
> **Last Updated:** 2026-02-24

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
```tsx
React           // React namespace
useState        // React.useState
useEffect       // React.useEffect
useMemo         // React.useMemo
useCallback     // React.useCallback
```

#### Utility
```tsx
cn              // classNames utility (from @/lib/utils)
                // Example: cn("base-class", isActive && "active-class")
```

#### Shadcn/UI Components (fully injected)
```tsx
// Cards
Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter

// Badge
Badge

// Table (from @/components/ui/table)
Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter, TableCaption
```

#### Lucide Icons (all icons)
```tsx
// All Lucide icons are available, e.g.:
User, Users, Activity, Check, X, ChevronDown, ChevronRight,
AlertCircle, CheckCircle, Info, Star, Bookmark, Heart,
FileText, Image, Code, Layers, Zap, Brain, Bot, Sparkles
// ... and all icons in lucide-react
```

---

### 1.3 Forbidden Patterns (ABSOLUTELY FORBIDDEN)

The system scans the source code before compilation. The following will cause validation errors:

| Pattern | Reason |
|:--------|:------|
| `window` | Browser API access |
| `document` | DOM manipulation |
| `fetch` | Network request |
| `localStorage` / `sessionStorage` | Storage access |
| `XMLHttpRequest` | HTTP request |
| `WebSocket` | Real-time connection |
| `eval` | Code injection risk |
| `Function` | Dynamic code execution |
| `import` | Module system (not supported in sandbox) |
| `require` | CommonJS module |
| `globalThis` / `self` | Global scope access |
| `__proto__` / `prototype` | Prototype manipulation |
| `postMessage` | Cross-origin messaging |
| `setTimeout` / `setInterval` | Timer-based side effects |
| `dangerouslySetInnerHTML` | XSS vulnerability |

---

### 1.4 Props: Component Interface

The component MUST be named `Component` (capitalized). It receives props:

```tsx
interface ComponentProps {
  data: Record<string, unknown>;   // output_data of the task (JSON object)
  schema?: {                        // Output schema (optional, may be undefined)
    type: string;
    properties?: Record<string, { type: string; description?: string }>;
  };
}

const Component = ({ data, schema }) => { ... };
```

> **Important:** The name `Component` is mandatory. The sandbox identifies `typeof Component !== 'undefined'` to extract the component after compilation.

---

## PART 2: COMPONENT STRUCTURE

### 2.1 Minimal Template

```tsx
const Component = ({ data, schema }) => {
  return (
    <div className="space-y-4 p-4">
      <pre className="text-sm text-slate-300 bg-slate-950 p-3 rounded-lg">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};
```

---

### 2.2 Full-Featured Component

```tsx
const Component = ({ data, schema }) => {
  // State to toggle sections
  const [expanded, setExpanded] = useState({});

  // Helper: render diverse values
  const renderValue = (val) => {
    if (val === null || val === undefined)
      return <span className="text-slate-500 italic text-[11px]">null</span>;
    if (typeof val === 'boolean')
      return (
        <Badge
          variant={val ? "default" : "secondary"}
          className={cn(
            "text-[10px] h-5",
            val ? "bg-green-500/10 text-green-600 border-green-200"
                : "bg-white/5 text-slate-500"
          )}
        >
          {val ? 'YES' : 'NO'}
        </Badge>
      );
    if (typeof val === 'number')
      return <code className="text-[12px] bg-white/5 px-1.5 py-0.5 rounded font-mono text-primary">{val}</code>;
    if (typeof val === 'object')
      return (
        <pre className="text-[10px] bg-slate-950/50 p-2 rounded-md border border-white/5 overflow-auto max-h-40 font-mono text-slate-400 whitespace-pre-wrap">
          {JSON.stringify(val, null, 2)}
        </pre>
      );
    return <span className="text-slate-200 break-words">{String(val)}</span>;
  };

  // Helper: render array of objects as a Table
  const renderTable = (items) => {
    if (!items.length) return <span className="text-slate-500 italic">Empty array</span>;
    if (typeof items[0] !== 'object' || items[0] === null)
      return (
        <div className="flex flex-wrap gap-1 mt-1">
          {items.map((it, i) => (
            <Badge key={i} variant="outline" className="text-[10px] bg-white/5 border-white/10">
              {String(it)}
            </Badge>
          ))}
        </div>
      );

    const keys = Object.keys(items[0]);
    return (
      <div className="rounded-md border border-white/10 bg-black/20 overflow-hidden mt-2">
        <div className="overflow-x-auto">
          <Table className="min-w-[600px]">
            <TableHeader className="bg-white/5">
              <TableRow className="hover:bg-transparent border-white/5">
                {keys.map(k => (
                  <TableHead key={k} className="h-9 text-[10px] uppercase font-bold text-slate-500 px-4">
                    {k}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, i) => (
                <TableRow key={i} className="border-white/5 hover:bg-white/[0.02]">
                  {keys.map(k => (
                    <TableCell key={k} className="py-2 px-4 align-top text-sm">
                      {renderValue(item[k])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="space-y-6">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{key}</h4>
          </div>
          {Array.isArray(value)
            ? renderTable(value)
            : (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                {renderValue(value)}
              </div>
            )
          }
        </div>
      ))}
    </div>
  );
};
```

---

### 2.3 Specialized Component: Question List Viewer

Example component for a Question Generation pipeline (output_data containing multiple choice questions):

```tsx
const Component = ({ data, schema }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const questions = data.output_data || [];
  const selected = questions[selectedIdx];

  if (!questions.length) {
    return (
      <div className="flex items-center gap-2 text-slate-500 p-6">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">No questions found</span>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Sidebar: question list */}
      <div className="w-48 shrink-0 space-y-1 border-r border-white/10 pr-4">
        {questions.map((q, i) => (
          <button
            key={i}
            onClick={() => setSelectedIdx(i)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors",
              selectedIdx === i
                ? "bg-primary/20 text-primary"
                : "text-slate-400 hover:bg-white/5"
            )}
          >
            <div className="font-mono text-[10px] text-slate-500">#{i + 1}</div>
            <div className="truncate mt-0.5">{q.lo_code || q.id}</div>
          </button>
        ))}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="flex-1 space-y-4 overflow-auto">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
              {selected.target_question_type}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {selected.bloom_level}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {selected.difficulty}
            </Badge>
          </div>

          {selected.scenario && (
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="text-[10px] uppercase text-slate-500 mb-2 font-bold">Scenario</div>
              <p className="text-sm text-slate-200 leading-relaxed">{selected.scenario}</p>
            </div>
          )}

          {selected.core_question && (
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
              <div className="text-[10px] uppercase text-primary/70 mb-2 font-bold">Question</div>
              <p className="text-sm text-slate-100 font-medium leading-relaxed">{selected.core_question}</p>
            </div>
          )}

          {selected.ideal_response && (
            <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/20">
              <div className="text-[10px] uppercase text-green-500/70 mb-2 font-bold">Ideal Response</div>
              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{selected.ideal_response}</p>
            </div>
          )}

          {selected.misconceptions && (
            <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/20">
              <div className="text-[10px] uppercase text-amber-500/70 mb-2 font-bold">Common Misconceptions</div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{selected.misconceptions}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## PART 3: CORE PATTERNS

### 3.1 Styling Rules

| Rule | Correct | Incorrect |
|:-----|:-----|:----|
| Breakpoints | Use Tailwind CSS classes | Do not use inline `style={{}}` for responsiveness |
| Colors | Use Tailwind semantic tokens | Do not hardcode hex colors |
| Dark mode | Design for dark background (slate-950) | Do not assume a light background |
| Nesting | Maximum 4 levels | Avoid div soup |
| State | `useState` hook | Do not use `this.state` |
| Event handlers | Arrow functions | Do not use `function handleX()` outside the component |

### 3.2 Safe Data Handling

```tsx
// Optional chaining is always required
const items = data?.output_data ?? [];
const count = data?.batch_summary?.total_questions ?? 0;

// Guard for empty arrays
if (!Array.isArray(items) || items.length === 0) {
  return <div className="text-slate-500 italic p-4">No data</div>;
}

// Guard for objects
const keys = item && typeof item === 'object' ? Object.keys(item) : [];
```

### 3.3 When to Use Table vs. Cards

```
Array of objects with 3+ fields  → Table (easier for comparison)
Complex array of objects          → Card grid (1 card/item)
Array of strings/primitives       → Badge list
Single object with many fields    → Grid (2-3 columns)
Single long string/text           → Prose block with whitespace-pre-wrap
```

---

## PART 4: CHECKLIST FOR AI AGENTS

Check before submitting a component:

- [ ] Component name is `Component` (capitalized, correct spelling)?
- [ ] No `import`, `require`, or any forbidden patterns?
- [ ] Props signature is `({ data, schema })`?
- [ ] `data` access uses optional chaining (`data?.field`)?
- [ ] Guard present for empty or undefined arrays?
- [ ] Styling uses Tailwind classes, no hardcoded hex?
- [ ] All UI components from globals (Badge, Card, Table, Lucide...)? No re-defining them?
- [ ] State uses `useState` hook (available in scope, no import needed)?
- [ ] Component returns valid JSX (exactly 1 root element)?
- [ ] `dangerouslySetInnerHTML` is not used?

---

## PART 5: QUICK REFERENCE

### Available Globals Summary
```tsx
// Hooks
useState, useEffect, useMemo, useCallback

// Utility
cn                    // classNames

// Shadcn UI
Badge                 // <Badge variant="default|secondary|outline|destructive">
Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter
Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter, TableCaption

// All Lucide icons
User, Activity, CheckCircle, AlertCircle, ChevronRight, Sparkles, Brain, ...
```

### Forbidden (Validation will fail)
```
window, document, fetch, localStorage, sessionStorage,
XMLHttpRequest, WebSocket, eval, Function, import, require,
globalThis, self, __proto__, prototype, postMessage,
setTimeout, setInterval, dangerouslySetInnerHTML
```

### Component Signature
```tsx
const Component = ({ data, schema }) => {
  // data = task output_data (JSON object)
  // schema = output JSON schema (may be undefined)
  return <div>...</div>;
};
```

*Updated: 2026-02-24*
