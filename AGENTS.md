# AGENTS.md - Video AI Project

Guidelines for agentic coding in this React/TypeScript video generation app.

## Commands

```bash
npm run dev      # Start Vite dev server (port 3000)
npm run build    # TypeScript compile + Vite build
npm run preview  # Preview production build locally
```

**No testing framework configured.** Follow existing code patterns.

## Tech Stack

- **Frontend**: React 18.3.1 + TypeScript 5.7.2 (Strict mode)
- **Build**: Vite 6.0.5
- **Styling**: Tailwind CSS 3.4.17
- **API**: Allapi.store (Veo, Sora, Grok, Gemini models)

## TypeScript Rules

- **Never** use `as any`, `@ts-ignore`, or `@ts-expect-error`
- Strict mode enabled: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- ES2020 target, ESNext modules, bundler resolution
- Fix type errors properly—no suppressions

## Code Style

### Import Order
```tsx
import { useState, useEffect, useCallback } from 'react';  // 1. React
import { SomeType } from '../types';                       // 2. Types
import { Component } from './Component';                   // 3. Components
import { serviceFn } from '../services/storage';           // 4. Services/utils
```

### Naming Conventions
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `VideoNode`, `CanvasWorkspace` |
| Functions | camelCase | `handleGenerate`, `getApiKey` |
| Constants | SCREAMING_SNAKE_CASE | `STORAGE_KEYS`, `DEFAULT_SETTINGS` |
| Types/Interfaces | PascalCase | `VideoTask`, `AppSettings` |
| Private vars | camelCase with clear names | `isDragging`, `dragStart` |

### Exports
- Use **named exports** for all components: `export function ComponentName() {}`
- Default export **only** for `App.tsx` and entry points

### Component Structure
```tsx
export function ComponentName({ prop }: Props) {
  // 1. Hooks at top
  const [state, setState] = useState(defaultValue);
  // 2. Event handlers with useCallback
  const handleEvent = useCallback(() => { /* logic */ }, [deps]);
  // 3. useEffect for side effects
  useEffect(() => { /* cleanup */ }, []);
  // 4. Render
  return <div className="...">...</div>;
}
```

## Error Handling

**Async functions must use try/catch:**
```tsx
try {
  const result = await apiCall();
} catch (error) {
  console.error('[Context] Operation failed:', error);
}
```

**Error message convention:**
- User-facing: Chinese (UI text)
- Technical logs: English with `[Context]` prefix for filtering

## File Organization

```
src/
├── components/
│   ├── layout/       # Sidebar, TopBar, BottomEditor, CanvasWorkspace, RightRail
│   ├── canvas/       # VideoNode (draggable cards)
│   └── *.tsx         # Feature components
├── services/
│   ├── allapi.ts     # API calls (Veo, Sora, Grok, Gemini)
│   └── storage.ts    # localStorage wrappers (type-safe)
├── types/
│   └── index.ts      # All TypeScript types
├── utils/
│   └── constants.ts  # Model configs, defaults, formatters
├── App.tsx           # Main container
└── main.tsx          # Entry point
```

## Styling (Tailwind CSS)

**Primary approach:** Utility classes
- Custom colors: `primary` (blue scale), `accent` (purple) in `tailwind.config.js`
- Custom animations: `pulse-slow`, `spin-slow`, `float`
- Shadows: `shadow-soft`, `shadow-glow`, `shadow-card`, `shadow-floating`

**CSS Pattern:**
```tsx
className="bg-white rounded-xl shadow-card hover:shadow-lg transition-all"
// Inline styles ONLY for dynamic values
style={{ width: `${progress}%` }}
```

**UI Language:** Mixed Chinese/English
- UI text (labels, buttons, messages): **Chinese**
- Code, comments, variables: **English**

## State Management

- React hooks only (`useState`, `useCallback`, `useEffect`)
- localStorage for persistence via `src/services/storage.ts`
- Date serialization: `new Date(value)` when deserializing from storage

## API Pattern

**Service functions** (`src/services/allapi.ts`):
```tsx
export async function createVeoVideo(
  apiKey: string,
  prompt: string,
  subModel: string,
  options: VeoOptions
): Promise<{ taskId: string; status: TaskStatus }> {
  const { apiBaseUrl } = getSettings();
  const url = `${apiBaseUrl}/videos`;
  const formData = new FormData();
  formData.append('model', subModel);
  // ...
}
```

**Polling pattern:** submit task → poll status interval → complete/error

## Key Conventions

1. **No `as any` or type suppressions** - fix types properly
2. **Named exports** for components
3. **Console logs** use `[Context]` prefix: `console.log('[API] message')`
4. **Destructuring** for props and settings
5. **Consistent spacing** - check existing files for patterns
6. **DELEGATE** visual/styling changes to frontend-ui-ux specialist

## When to Consult

- **Oracle**: Architecture decisions, complex state patterns, performance, security
- **Frontend-UI-UX**: Any visual/styling/layout/animation work
- **Librarian**: Unfamiliar external libraries
