# AGENTS.md - Video AI Project Guide

This guide provides development guidelines for the Video AI project - a React/TypeScript web application for generating videos using Google Veo and OpenAI Sora APIs.

---

## Development Commands

### Build & Development
- `npm run dev` - Start Vite dev server on port 3000
- `npm run build` - TypeScript compilation + Vite production build
- `npm run preview` - Preview production build locally

### Testing
- **Not configured** - No testing framework currently set up

---

## Technology Stack

- **Frontend**: React 18.3.1 with TypeScript 5.7.2
- **Build Tool**: Vite 6.0.5
- **Styling**: Tailwind CSS 3.4.17
- **API Integration**: Allapi.store (Veo & Sora models)

---

## TypeScript Configuration

**Strict Mode**: Enabled
- `noUnusedLocals` and `noUnusedParameters` enabled
- `noFallthroughCasesInSwitch` enabled
- React JSX transform (`react-jsx`)
- ES2020 target with ESNext modules
- Bundler resolution with `allowImportingTsExtensions`

**Rule**: Never use `as any`, `@ts-ignore`, or `@ts-expect-error`. Fix type errors properly.

---

## Code Style Guidelines

### Component Structure
```tsx
// Import order: React hooks -> local imports
import { useState, useEffect } from 'react';
import { SomeType } from './types';

export function ComponentName({ prop }: Props) {
  // Hooks at top
  const [state, setState] = useState(defaultValue);

  // Event handlers
  const handleEvent = useCallback(() => {
    // logic
  }, [deps]);

  // Render
  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
}
```

### Exports
- Use **named exports** for components: `export function ComponentName() {}`
- Default export only for main `App` component or entry points

### File Organization
```
src/
├── components/        # React components
├── services/         # API calls, localStorage wrappers
├── types/            # TypeScript type definitions
├── utils/            # Utility functions, constants
├── App.tsx           # Main app component
├── main.tsx          # Entry point
└── index.css         # Global styles (Tailwind + custom)
```

### Naming Conventions
- **Components**: PascalCase (`VideoGenerator`, `TaskList`)
- **Functions**: camelCase (`getApiKey`, `handleTaskAdd`)
- **Constants**: SCREAMING_SNAKE_CASE (`STORAGE_KEYS`, `DEFAULT_SETTINGS`)
- **Types/Interfaces**: PascalCase (`VideoTask`, `AppSettings`, `VideoModel`)
- **Private/Local variables**: camelCase with clear naming

---

## Styling Guidelines

**Primary Approach**: Tailwind CSS utility classes
- Custom colors defined in `tailwind.config.js` (primary scale: blue-500 to blue-900)
- Custom animations: `pulse-slow`, `spin-slow`
- Use responsive prefixes: `sm:`, `lg:`, `xl:`

**CSS Pattern**:
```tsx
className="className-value"
// No inline styles unless dynamic values needed
style={{ width: `${progress}%` }}
```

**Visual Changes**: **DELEGATE** all styling, layout, animation, and UI/UX changes to the frontend-ui-ux-engineer agent. Pure logic changes in components can be handled directly.

---

## API & Services Pattern

**Service Structure** (see `src/services/`):
```tsx
// API functions: request → parse → typed response
export async function generateVideo(params): Promise<Response> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(params),
  });
  return response.json();
}
```

**Storage Functions** (see `src/services/storage.ts`):
- Wrap `localStorage` with type-safe getters/setters
- Handle JSON parsing errors with try/catch
- Date fields must be deserialized: `new Date(value)`

---

## Error Handling

**Async Functions**: Always use try/catch
```tsx
try {
  const result = await apiCall();
} catch (error) {
  console.error('Operation failed:', error);
  // Set error state, show user-friendly message
}
```

**Error Messages**: User-facing messages in Chinese (per UI convention), technical logs in English.

---

## Import Organization

1. React hooks (from 'react')
2. External libraries
3. Local types (from './types' or '../types')
4. Local components (from './components' or '../components')
5. Local services, utilities, constants

```tsx
import { useState, useEffect, useCallback } from 'react';
import { VideoModel } from '../types';
import { getApiKey } from '../services/storage';
import { VideoGenerator } from './VideoGenerator';
```

---

## State Management

**Pattern**: React hooks (`useState`, `useCallback`, `useEffect`)
- Props drilling is acceptable for this project size
- localStorage for persistence (api keys, history, downloads, settings)
- Date objects in state (serialized to ISO strings for storage)

---

## Type Definitions

**Location**: All types in `src/types/index.ts`
- Export unions, interfaces, and type aliases
- Keep types in sync with API response structures
- Use discriminated unions for model-specific options

---

## Constants

**Location**: `src/utils/constants.ts`
- API URLs, model configurations, default settings
- Formatting utilities (fileSize, duration, date)
- Model configs with pricing labels and descriptions

---

## No Linting/Testing Setup

**Current State**: No ESLint, Prettier, or testing framework configured
- Code style should follow patterns observed in existing files
- Maintain consistency with existing components and services
- If adding linting/tests in future, choose tools compatible with Vite + TypeScript

---

## API Integration Notes

**Provider**: Allapi.store
- Veo models: fast-4K, components, 4K variants
- Sora models: sora-2, sora-2-all
- Polling pattern: submit task → poll status interval → complete/error
- Max duration: Veo 8s, Sora 60s

---

## UI Language

**Convention**: Mixed Chinese/English
- UI text (labels, buttons, messages): Chinese
- Code comments, variable names, API keys: English
- Example: "API 已连接" (API Connected)

---

## Special Files

- `CLAUDE.md`: High-level project status (minimal content)
- `AGENTS.md`: This file - comprehensive agent guidelines
- `tailwind.config.js`: Tailwind theme customization
- `vite.config.ts`: Vite configuration (dev server on port 3000)

---

## When to Consult

**Oracle** for:
- Architecture decisions involving multiple systems
- Complex state management patterns
- Performance optimizations
- Security concerns (API key handling, CORS, etc.)

**Frontend-UI-UX-Engineer** for:
- Any visual/styling changes (colors, spacing, layout, animations)
- Component redesign or new UI components
- Responsive design improvements
