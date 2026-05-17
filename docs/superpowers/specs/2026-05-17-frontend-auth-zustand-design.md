# Frontend Auth Zustand Migration

## Goal

Replace the current auth `Context` + `AuthProvider` setup with a single
Zustand store while preserving the existing login, register, logout, route
guard, and `localStorage` session behavior.

## Current State

- Auth state is split across `auth-context.ts`, `auth-provider.tsx`, and
  `use-auth.ts`.
- `main.tsx` wraps the app in `AuthProvider`.
- `login-page.tsx`, `protected-route.tsx`, and `public-route.tsx` read auth via
  `useAuth()`.
- Session hydration is done in a `useEffect` inside the provider.

## Design

### Store shape

Create a single auth store module that owns:

- `user: User | null`
- `isHydrated: boolean`
- derived auth access through `isAuthenticated`
- actions: `hydrateSession`, `login`, `logout`, `register`

### Hydration

- Keep `SESSION_KEY` and the current `localStorage` payload format.
- Move hydration logic out of React context and into the store module.
- Run `hydrateSession` once from a small hook or bootstrap call so route guards
  can still wait for hydration before redirecting.

### Consumer API

- Replace context usage with direct Zustand selectors.
- Preferred usage is selector-based reads from `useAuthStore(...)`.
- Keep a thin `useAuth` compatibility hook only if needed during migration; the
  final target is direct store usage in route guards and auth screens.

### App wiring

- Remove `AuthProvider` from `main.tsx`.
- Route guards and auth screens read state/actions directly from Zustand.
- No other app provider changes are needed.

## Files Expected To Change

- `frontend/package.json`
- `frontend/pnpm-lock.yaml`
- `frontend/src/app/main.tsx`
- `frontend/src/app/router/protected-route.tsx`
- `frontend/src/app/router/public-route.tsx`
- `frontend/src/features/auth/index.ts`
- `frontend/src/features/auth/ui/login-page.tsx`
- `frontend/src/features/auth/model/*`

## Non-Goals

- No backend/API auth integration changes
- No changes to route structure
- No persistence format migration
- No broader state-management rollout outside auth

## Verification

- `pnpm typecheck`
- `pnpm build`
- Manual check that login/register/logout and route redirects still behave the
  same after hydration
