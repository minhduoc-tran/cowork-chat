# Multi Pin Message Design

## Goal

Upgrade pinned messages from a single active pin per conversation to a Telegram-style multi-pin list with ordered navigation, realtime sync, and banner rotation inside the existing chat UI.

## Scope

- Applies to direct and group conversations.
- Any active member of a conversation can pin and unpin messages.
- A conversation can hold multiple pinned messages.
- Pins are ordered with a stable `pinOrder` sequence starting at `1`.
- The chat screen continues to receive `pins[]` in the message-list response and also gets a dedicated pin-list endpoint for cache sync and mutation flows.

## User Experience

### Banner

When a conversation has pinned messages:

1. A pinned banner remains fixed below the chat header.
2. The banner shows:
   - `Pinned message {current}/{total}`
   - one-line truncated message content
   - sender name
3. Clicking the banner scrolls to the currently active pinned message, then advances the banner to the next pin in the ordered list.
4. If the pinned message is outside the loaded message window, the client shows the existing lightweight notice instead of failing silently.
5. A vertical rail appears on the left side of the banner area with one segment per pin, and the active segment is highlighted.

### Context Menu

When a member opens a message context menu:

1. The menu includes `Pin message`.
2. If that message is already pinned, the menu includes `Unpin message`.
3. Choosing `Pin message` opens a compact confirmation with two actions:
   - `Yes, notify`
   - `Pin silently`

### Notify Behavior

If the member chooses notify:

1. The pin is created as normal.
2. A system message is added to the conversation with content equivalent to `[Name] pinned a message`.

If the member chooses silent:

1. The pin is created without a system message.

## Data Model

Modify `conversation_pins` to support multiple rows per conversation.

### Table changes

- remove the unique constraint on `conversationId`
- add `pinOrder integer not null`
- add a unique constraint on `(conversationId, messageId)`
- keep indexes on `conversationId` and `messageId`
- add an index on `(conversationId, pinOrder)` for ordered reads

### Relations

- change conversation relation from `pin: one(...)` to `pins: many(...)`

## Backend Rules

### Pin Message

Pinning a message must:

1. verify the caller is an active member of the conversation
2. verify the target message exists in the same conversation
3. reject soft-deleted messages
4. reject duplicate pins for the same `(conversationId, messageId)`
5. insert a new row with the next available `pinOrder`
6. optionally create a system message if `notify = true`
7. emit the full ordered `pins[]` list after mutation

### Unpin Message

Unpinning must:

1. verify the caller is an active member of the conversation
2. remove the row matching `(conversationId, messageId)`
3. reindex remaining rows in that conversation so `pinOrder` is contiguous `1..n`
4. emit the full ordered `pins[]` list after mutation

### Message Deletion Interaction

If a deleted or recalled message is pinned:

1. remove only the affected pin row
2. reindex remaining pins
3. emit the updated `pins[]`

## API Changes

### Existing message list

`GET /conversations/:conversationId/messages` should continue returning:

- `messages`
- `pins`

`pins` is now an ordered array, not a single nullable object.

### New pin endpoints

- `GET /conversations/:conversationId/pins`
  - returns `{ pins: ConversationPin[] }`
- `PUT /conversations/:conversationId/pin`
  - body: `{ messageId: number, notify: boolean }`
  - returns `{ pins: ConversationPin[] }`
- `DELETE /conversations/:conversationId/pins/:messageId`
  - returns `{ pins: ConversationPin[] }`

### Pin payload

Each pin item should include:

- `conversationId`
- `messageId`
- `pinnedById`
- `pinnedByName`
- `pinnedAt`
- `pinOrder`
- `messagePreview: { id, content, senderId, senderName, createdAt }`

## Realtime Changes

Replace the single-pin event contract with:

- event name: `pin:updated`
- payload: `{ conversationId, pins }`

`pins` is always the full ordered list after a pin or unpin operation.

This event should be emitted to:

- the conversation room
- each participant user room

## Frontend Data Flow

### Query Layer

Add a dedicated pin query:

- query key: `["pins", conversationId]`

The chat screen may still derive initial pins from `listMessages`, but the dedicated pin query becomes the source of truth for mutation and socket updates.

### Socket Sync

When `pin:updated` arrives:

1. update `["pins", conversationId]` via `setQueryData`
2. update any active chat-local state derived from pins
3. update conversation-list cache if it still exposes pin summary data
4. avoid refetch-only behavior for pin list synchronization

## UI Refactor

Refactor the existing pin banner inside `ChatView`; do not replace it with a new top-level component hierarchy.

### ChatView state changes

Replace single-pin assumptions with:

- `pins`
- `activePinIndex`
- `currentPin`

### Banner behavior

- click banner scrolls to `currentPin.messageId`
- after click, advance `activePinIndex = (index + 1) % pins.length`
- left rail segments reflect `pins.length`
- the currently active segment is visually highlighted

### Unpin button

- render the existing top-right unpin button against the current active pin
- clicking it unpins the currently active pin only

## Error Handling

- Duplicate pin requests should fail with a stable `400` or idempotent success; pick one and keep it consistent
- Invalid ids follow current `400/404` conventions
- Socket payloads must stay ordered by `pinOrder ASC`
- Unpinning a missing message pin should not corrupt pin ordering

## Testing Strategy

Backend tests should cover:

- create multiple pins in one conversation
- preserve ascending `pinOrder`
- reject duplicate pin for the same message
- unpin one message without affecting the others
- reindex `pinOrder` after unpin
- include `pins[]` in message-list responses
- return ordered `pins[]` from `GET /pins`
- emit `pin:updated` with the full ordered list
- create a system message only when `notify = true`

Frontend checks should cover:

- render banner only when `pins.length > 0`
- show `current/total`
- rotate active pin after banner click
- highlight the correct left-rail segment
- unpin only the current active pin
- keep `["pins", conversationId]` updated from socket payloads without refetch
- open notify vs silent confirm actions from the message menu

## Out of Scope

- Pin permissions by role
- Pin search/filter UI
- Manual drag-and-drop reorder of pins
- Per-user read state for pinned items
