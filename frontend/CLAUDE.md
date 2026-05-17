# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

```bash
pnpm dev          # Start dev server (http://localhost:5173)
pnpm build        # Type-check and build for production
pnpm lint         # Lint with ESLint
pnpm lint:fix     # Auto-fix lint issues
pnpm typecheck    # TypeScript type checking only
pnpm format       # Format with Prettier
pnpm format:check # Check formatting without writing
```

## Architecture

### Directory Structure
- `src/app/` — App shell, routing, providers
- `src/features/` — Feature modules (auth, home). Each feature has `model/` (state), `ui/` (components), and `index.ts` (public API)
- `src/shared/` — Shared UI components and utilities
- `@/` alias maps to `src/` (e.g., `@/features/auth`)

### Layering Rules (enforced by ESLint boundaries plugin)
```
app → features → shared
```
- `app` can import features and shared
- `features` can import shared only
- `shared` can import shared only
- Features must be imported through their public `index.ts` export, not internal paths

### Routing
- React Router v7 with file-based router pattern via `createBrowserRouter`
- `ProtectedRoute` — redirects to /login if unauthenticated
- `PublicRoute` — redirects to / if already authenticated
- Routes defined in `src/app/router/routes.tsx`

### Auth State
- Zustand store in `src/features/auth/model/auth-store.ts`
- Session persisted to localStorage under `cowork-chat-session`
- `hydrateAuthSession()` must be called on app mount to restore session
- `useAuth()` hook provides access to auth state