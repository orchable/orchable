# Orchable Tech Stack

## Core

| Package | Version | Purpose |
| --- | --- | --- |
| React | 18.3.x | UI framework |
| TypeScript | 5.8.x | Type safety |
| Vite | 5.4.x | Build tool & dev server |
| React Router DOM | 6.x | Client-side routing |

## UI / Styling

| Package | Version | Purpose |
| --- | --- | --- |
| TailwindCSS | 3.4.x | Utility-first CSS |
| shadcn/ui | latest | Component library (Radix primitives) |
| Framer Motion | 12.x | Animations |
| Lucide React | latest | Icon library |
| Recharts | 2.15.x | Charts & data visualization |
| React Flow (@xyflow) | 12.10.x | DAG editor for orchestration designer |

## State & Data

| Package | Version | Purpose |
| --- | --- | --- |
| Zustand | 5.0.x | Client state management (designer store) |
| React Query | 5.83.x | Server state / caching |
| Supabase JS | 2.97.x | Backend client (auth + database + storage) |
| Dexie (via IndexedDB) | — | Local storage for free-tier users |
| Zod | 3.25.x | Schema validation |
| React Hook Form | 7.x | Form management |

## Execution

| Package | Purpose |
| --- | --- |
| Web Worker API | Background AI task execution |
| Fetch API | AI provider API calls (Gemini, DeepSeek, Qwen, MiniMax) |

## Build Tooling

| Package | Version | Purpose |
| --- | --- | --- |
| ESLint | 9.32.x | Linting |
| Vitest | 3.2.x | Unit testing |
| Autoprefixer + PostCSS | latest | CSS processing |

## Constraints

- Node.js >= 18
- No SSR — purely client-side SPA
- Web Worker for AI execution (cannot access DOM)
- Dual-tier storage: IndexedDB (free) / Supabase (premium)
- BYOK model: users provide their own API keys for AI providers
