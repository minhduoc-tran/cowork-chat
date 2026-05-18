# Chat Shell Design

## Goal

Add a protected application shell in the frontend that uses the shadcn `sidebar-09` pattern and exposes a dedicated `/chat` route. The shell should become the stable layout layer for future product areas such as task management without requiring another router rewrite.

## Current Context

- The frontend is a React 19 + Vite application under `frontend/`.
- Routing lives in `src/app/router/routes.tsx` and currently renders `HomeScreen` directly at `/`.
- The project already has shadcn configured through `components.json`, with shared UI components under `src/shared/ui`.
- There is no frontend test runner configured yet, so verification must rely on build, lint, and type checking.

## Proposed Approach

### Routing

- Convert the protected root route into a layout route that renders an `AppShell`.
- Redirect `/` to `/chat`.
- Add a child route for `/chat` that renders a dedicated chat screen.
- Keep public auth routes unchanged.

### Layout

- Create an app-level shell component in `src/app` that owns:
  - `SidebarProvider`
  - the `sidebar-09` sidebar component
  - the main content area rendered through `Outlet`
- Keep the shell generic so future routes such as `/tasks` can reuse it without structural changes.

### Sidebar Scope

- Install the shadcn `sidebar-09` block and adapt it to the existing alias structure if needed.
- Keep navigation intentionally minimal:
  - brand/header area
  - a single `Chat` navigation item
- Do not add placeholder task-management entries yet.

### Chat Screen

- Replace the current starter `HomeScreen` usage with a `ChatScreen`.
- The initial chat screen can stay intentionally lightweight, but it should look like a real destination inside the shell rather than template filler text.

## File-Level Plan

- `src/app/router/routes.tsx`: introduce nested protected routes and `/` redirect.
- `src/app/...`: add the reusable shell and any sidebar wrapper needed.
- `src/features/chat/...`: add the chat route screen and public export.
- Remove or stop routing to the current `home` starter screen.

## Error Handling

- Preserve current auth gating behavior by keeping `ProtectedRoute` as the outer guard.
- Keep wildcard navigation redirect behavior intact.

## Verification

- Run `pnpm build`.
- Run `pnpm lint`.
- Run `pnpm typecheck`.

## Non-Goals

- No real chat feature implementation yet.
- No task-management routes yet.
- No new data fetching or backend integration changes.
