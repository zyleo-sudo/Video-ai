# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Video AI** is a React + TypeScript web application for generating videos and images using multiple AI model APIs (Google Veo, OpenAI Sora, Grok Video, and Gemini). It is a pure frontend SPA with no backend required - all API calls are made directly from the browser using the user's API key stored in localStorage.

Current version: v1.0.2

---

## Development Commands

```bash
npm run dev      # Start Vite dev server on port 3000, auto-opens browser
npm run build    # TypeScript compile + Vite production build
npm run preview  # Preview production build locally
```

**No testing framework or linter is configured.** Code style should follow existing patterns in the codebase.

---

## Architecture

### Application Structure

The app uses a **layout-based navigation system** with a fixed workspace and dynamic content:

```
App.tsx (Main Container - 580 lines)
├── Sidebar (left nav, 80px fixed)
├── TopBar (model selection, batch mode toggle, version badge)
├── CanvasWorkspace (main content - infinite canvas with pan/zoom)
│   └── VideoNode[] (draggable task cards with position persistence)
├── BottomEditor (prompt input + generation controls - shows only on 'generate' nav)
├── RightRail (selected task details - shows when task is selected)
└── Modal (task detail popup)
```

### Navigation Views

- `generate` - Canvas workspace + BottomEditor for creating tasks
- `templates` - PromptTemplates component (pre-built professional prompts)
- `tasks` - Canvas workspace (same UI, different nav state)
- `history` - VideoHistory component (past generations with search)
- `settings` - API key and base URL configuration

### State Management

- **React hooks** (`useState`, `useCallback`, `useEffect`) - no external state library
- **localStorage persistence** via `src/services/storage.ts` (type-safe wrappers)
  - API keys, tasks (last 50), history (last 100), downloads, settings
- **Date serialization**: Dates stored as ISO strings, deserialized with `new Date(value)`

### Key Directories

```
src/
├── components/
│   ├── layout/       # Sidebar, TopBar, BottomEditor, CanvasWorkspace, RightRail
│   ├── canvas/       # VideoNode (draggable task cards)
│   └── [others]      # Feature-specific components
├── services/
│   ├── allapi.ts     # API calls (Veo, Sora, Grok, Gemini)
│   └── storage.ts    # localStorage wrappers (type-safe)
├── types/
│   └── index.ts      # All TypeScript types
├── utils/
│   ├── constants.ts  # Model configs, defaults, formatters
│   └── prompts.ts
├── App.tsx           # Main app component
└── main.tsx          # Entry point
```

---

## Code Style (from AGENTS.md)

### Component Structure
```tsx
import { useState, useEffect } from 'react';
import { SomeType } from './types';

export function ComponentName({ prop }: Props) {
  // Hooks at top
  const [state, setState] = useState(defaultValue);

  // Event handlers
  const handleEvent = useCallback(() => {
    // logic
  }, [deps]);

  return <div className="...">...</div>;
}
```

### Naming
- **Components**: PascalCase (`VideoGenerator`, `TaskList`)
- **Functions**: camelCase (`getApiKey`, `handleTaskAdd`)
- **Constants**: SCREAMING_SNAKE_CASE (`STORAGE_KEYS`, `DEFAULT_SETTINGS`)
- **Types**: PascalCase (`VideoTask`, `AppSettings`)

### Exports
- Use **named exports** for components: `export function ComponentName() {}`

### Import Order
1. React hooks
2. External libraries
3. Local types
4. Local components
5. Local services/utilities

### Styling
- **Tailwind CSS** is the primary approach
- Custom colors in `tailwind.config.js`: primary (blue), accent (purple)
- Custom animations: `pulse-slow`, `spin-slow`, `float`

---

## TypeScript Configuration

**Strict mode enabled** with:
- `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- React JSX transform (`react-jsx`)
- ES2020 target with ESNext modules

**Important**: Never use `as any`, `@ts-ignore`, or `@ts-expect-error`. Fix type errors properly.

---

## API Integration

**Provider**: allapi.store (customizable via settings)

### Video Models
- **Google Veo**: `veo_3_1`, `veo_3_1-fast`, `veo_3_1-fast-4K`, `veo_3_1-pro`
- **OpenAI Sora**: `sora-2-all`
- **Grok Video**: `grok-video-3`

### Image Models
- **Gemini 3 Pro**: `gemini-3-pro-image-preview`

### Generation Types
- Text-to-video, Image-to-video (reference/start-end frames)
- Text-to-image (720P to 4K resolutions)

### API Pattern
All APIs use OpenAI-compatible format:
- POST `/videos` for video generation
- Polling pattern: submit task → poll status → complete/error

---

## UI Language Convention

**Mixed Chinese/English**:
- UI text (labels, buttons, messages): Chinese
- Code, comments, variable names: English
- Example: "API 已连接" (API Connected)

---

## Important Files

- `AGENTS.md` - Comprehensive development guidelines (delegate to this for detailed patterns)
- `vite.config.ts` - Dev server on port 3000, base path `'./'` for relative assets
- `VERSION` - Current version file (v1.0.2)
- `DISTRIBUTION.md`, `DEPLOY.md` - Distribution and deployment guides
