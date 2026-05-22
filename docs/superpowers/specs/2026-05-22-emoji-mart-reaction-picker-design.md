# Emoji Mart Reaction Picker Design

## Goal

Replace the custom emoji grid picker in the chat reaction flow with an `emoji-mart` picker that opens when the user clicks the `+` button in the quick reaction bar or context menu reaction row.

## Current Context

- The frontend lives under `frontend/` and uses React 19 with Vite.
- Message reactions are rendered in `frontend/src/features/chat/ui/chat-messages.tsx`.
- The current quick reaction experience has two layers:
  - a fixed quick reaction row with six common emoji
  - a custom `EmojiPicker` component that renders a hardcoded emoji grid
- The backend reaction API accepts a plain emoji string and stores it as `emoji`.
- Quick reactions and reaction badges already work and should remain visually unchanged.

## User-Approved Scope

- Keep the existing quick reaction row as-is.
- Only replace the expanded picker shown after clicking `+`.
- Use `emoji-mart` as the picker library.
- Keep the picker anchored to the current message via the existing popover interaction.
- Do not introduce animated emoji or change backend payloads.

## Proposed Approach

### Library Choice

- Add `@emoji-mart/react` and `@emoji-mart/data` to the frontend.
- Use bundled local data from `@emoji-mart/data` so the picker does not depend on runtime network requests.

### Component Integration

- Replace the current `EmojiPicker` implementation inside `chat-messages.tsx` with a small wrapper around `emoji-mart`.
- The wrapper will:
  - receive `onSelect` and `onClose`
  - extract `emoji.native` from the `emoji-mart` selection payload
  - guard against invalid selections by ignoring payloads without a string `native` field
  - call `onSelect(emoji.native)` and immediately close the picker

### UI Behavior

- Keep the existing `Popover` and `PopoverContent` positioning logic.
- Open the `emoji-mart` panel from the existing `+` button in:
  - the hover quick reaction bar
  - the custom context menu reaction row
- Style the panel to stay visually close to the current chat UI:
  - rounded panel
  - light surface
  - soft shadow
  - compact size suitable for message-level interaction
- Keep search and category navigation enabled because they are the main value of adopting `emoji-mart`.
- Disable or reduce extra chrome if needed so the picker does not feel oversized for chat.

## Data Flow

1. User clicks the `+` button near a message.
2. Existing local state opens the message-anchored popover.
3. `emoji-mart` renders inside that popover.
4. User selects an emoji.
5. The picker wrapper reads `emoji.native`.
6. The existing `handleToggleReaction(messageId, emoji, conversationId)` callback runs unchanged.
7. The picker closes immediately after selection.

## File-Level Plan

- `frontend/package.json`
  - add `@emoji-mart/react`
  - add `@emoji-mart/data`
- `frontend/src/features/chat/ui/chat-messages.tsx`
  - remove the hardcoded grid-based picker UI
  - integrate an `emoji-mart`-backed picker wrapper
  - adjust popover sizing and classes to fit the new panel

## Error Handling

- Ignore picker payloads that do not contain a valid `native` emoji string.
- Preserve current reaction mutation behavior and error handling.
- Keep popover close behavior unchanged on outside click, scroll, or selection.

## Verification

- Confirm clicking `+` opens the `emoji-mart` picker next to the message bubble.
- Confirm selecting an emoji creates or toggles a reaction successfully.
- Confirm the six quick reactions still behave exactly as before.
- Confirm existing reaction badges and counts render unchanged.
- Run `pnpm --dir frontend typecheck`.
- Run `pnpm --dir frontend build`.

## Non-Goals

- No backend schema or API changes.
- No changes to quick reaction defaults.
- No replacement of reaction badges with library-rendered emoji.
- No animation or Lottie integration.
