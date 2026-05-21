# Message Pin Design

## Goal

Allow each conversation to have exactly one active pinned message that is visible to all current members and can be replaced or removed in realtime.

## Scope

- Applies to both direct and group conversations.
- Any active conversation member can pin or unpin.
- Only one message can be pinned per conversation at a time.
- Pinning a new message replaces the existing pinned message.
- Both pin and unpin actions require a confirmation dialog in the client.

## User Experience

When a member opens a conversation:

1. If the conversation has no pinned message, the chat header renders normally.
2. If the conversation has a pinned message, a pinned banner appears under the header and above the message list.
3. The banner shows:
   - a pinned label
   - a short preview of the pinned message content
   - who pinned it
   - when it was pinned
4. Clicking the banner scrolls to the pinned message if that message is loaded in the current message list.

When a member opens the context menu on a message:

1. If that message is not currently pinned, the menu shows `Pin message`.
2. If that message is the currently pinned message, the menu shows `Unpin message`.
3. Selecting either action opens a confirmation dialog.
4. Confirming the action updates the pinned state for every active member in realtime.

## Data Model

Store pinned state in a dedicated `conversation_pins` table.

Fields:

- `id`
- `conversationId`
- `messageId`
- `pinnedById`
- `pinnedAt`

Constraints:

- unique index on `conversationId` so each conversation has at most one active pin
- foreign key from `conversationId` to `conversations`
- foreign key from `messageId` to `messages`
- foreign key from `pinnedById` to `users`

This keeps the pinned state separate from the `conversations` row while preserving a simple current-state model.

## Backend Rules

### Pin Message

Pinning a message must:

1. verify the caller is an active member of the conversation
2. verify the target message exists
3. verify the target message belongs to the same conversation
4. reject soft-deleted messages
5. upsert the `conversation_pins` row for that conversation

If a different message was already pinned, the new pin replaces it atomically.

### Unpin Message

Unpinning must:

1. verify the caller is an active member of the conversation
2. delete the existing pin row for that conversation if present

Unpin should be idempotent. Deleting a missing pin should still return success.

## API Changes

Add conversation-scoped pin endpoints:

- `PUT /conversations/:conversationId/pin`
  - body: `{ "messageId": number }`
- `DELETE /conversations/:conversationId/pin`

Response shape for both actions should return the current pin state:

- `pin: null` when no pinned message exists
- `pin: { conversationId, messageId, pinnedById, pinnedAt, messagePreview }` when pinned

`messagePreview` should include enough data for the banner without requiring a second lookup:

- `id`
- `content`
- `senderId`
- `createdAt`

## Conversation Read Models

The following reads should include the current pin:

- `list conversations`
- `list conversation messages`

This ensures the client can rebuild pinned state after refresh and when entering a conversation from cold state.

Returned pin payload should include:

- pin metadata from `conversation_pins`
- preview of the pinned message
- display name of the user who pinned it

## Realtime Changes

Add a socket event dedicated to pinned state changes:

- `conversation.pin.updated`

Payload:

- `conversationId`
- `pin`

`pin` uses the same shape as the REST responses. If the conversation becomes unpinned, the payload sends `pin: null`.

This event should be emitted to the conversation room and each active member user room so open chats and sidebars stay in sync.

## Frontend Changes

### State

Extend frontend conversation types to include nullable pin data at the conversation level.

The active chat view should derive:

- currently pinned message metadata
- whether a message row is the pinned one

### Header Banner

Render a compact pinned banner below the chat header when `pin` exists.

Behavior:

- click scrolls to the pinned message
- if the pinned message is not in the loaded 50-message window, keep the banner visible but do not force a failed scroll
- keep the preview compact and truncate long text
- if content is empty, fall back to a localized unavailable label

### Message Context Menu

Add:

- `Pin message`
- `Unpin message`

The menu item depends on whether `msg.id === pin.messageId`.

### Confirmation Dialog

Use the existing dialog primitives to confirm both actions.

Dialog copy should make the replacement behavior explicit when another message is already pinned.

Examples:

- pin: `Pin this message? This will replace the current pinned message.`
- unpin: `Remove the pinned message?`

### Realtime Sync

When `conversation.pin.updated` arrives:

- update the active conversation banner immediately
- update cached conversation list data for the matching conversation
- update message row state so the correct context-menu action is shown without reload

## Error Handling

- Non-member attempts return `403`.
- Invalid conversation or message ID returns `400` or `404` based on existing controller conventions.
- Pinning a message from another conversation returns `400`.
- Pinning a soft-deleted message returns `400`.
- Client should surface a toast or inline error for failed pin and unpin actions.

## Testing Strategy

Backend tests should cover:

- pin a valid message into an unpinned conversation
- replace an existing pin with a new message
- unpin an existing pin
- unpin when no pin exists
- reject pin when caller is not an active member
- reject pin when message belongs to another conversation
- reject pin when message is soft-deleted
- include pin data in conversation and message read responses
- emit `conversation.pin.updated` with `pin` and with `null`

Frontend checks should cover:

- render pinned banner when pin data exists
- hide banner when pin data is null
- show `Pin message` for non-pinned rows
- show `Unpin message` for the pinned row
- require dialog confirmation before mutating
- replace banner state when realtime pin updates arrive

## Out of Scope

- Multiple pinned messages per conversation
- Pin history or audit timeline
- Permission differences by member role
- Loading older messages automatically when the pinned message is outside the current window
