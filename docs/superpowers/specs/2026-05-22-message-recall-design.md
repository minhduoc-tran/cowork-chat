# Message Recall Design

## Goal

Allow a sender to recall their own message so the original message remains in the timeline but is visibly replaced with a recalled placeholder for all participants.

## Scope

- Applies to direct and group conversations.
- Only the original sender can recall their own message.
- Recalling is a soft-delete style mutation on the existing message row.
- Recalled messages remain in place in the timeline with the same message id, sender id, timestamps, and read-receipt behavior.
- Recalled messages can no longer be pinned or replied to as normal content.

## User Experience

When a sender opens the context menu on their own non-recalled message:

1. The menu shows `Recall message`.
2. Selecting it opens a confirmation dialog.
3. Confirming the action updates the message for all members in realtime.

When any member views a recalled message:

1. The bubble stays in the same position in the conversation.
2. The content area no longer shows the original message text or link preview.
3. The bubble shows a localized placeholder such as `This message was recalled`.
4. The message should look disabled or muted compared with a normal bubble while still preserving sender alignment and timestamp.
5. Recalled messages do not show reply preview blocks, pin actions, or recall actions.

If another message previously replied to the recalled message:

1. The reply preview remains structurally present.
2. Its preview content falls back to the same recalled placeholder instead of the original content.

## Data Model

Use the existing `messages.isDeleted` field as the persistence source of truth for recall state.

No schema migration is required for this feature.

On recall, the backend should additionally clear content-specific fields that should no longer be visible:

- `content`
- `linkPreview`
- any other derived rich-content payload tied to the original body

This keeps recall semantics simple while preventing stale original content from being re-exposed through alternate client paths.

## Backend Rules

### Recall Message

Recalling a message must:

1. verify the target message exists
2. verify the caller is the original sender
3. treat already-recalled messages as idempotent success or reject with a stable `400`; pick one behavior and use it consistently
4. set `isDeleted = true`
5. clear message content fields that should no longer be visible
6. update `updatedAt`

### Pin Interaction

If the recalled message is currently pinned:

1. remove the active conversation pin
2. emit the same pin-cleared realtime event already used for deleted pinned messages

### Reply Interaction

New replies should not be allowed to target a recalled message.

Existing replies to an older message that is later recalled should remain valid, but their preview content should resolve to the recalled placeholder.

## API Changes

Add a message recall endpoint:

- `DELETE /conversations/:conversationId/messages/:messageId`

Response should return the updated message payload in the same shape used by existing message updates so the client can swap state without a second fetch.

Recommended payload:

- `message`
- `replyTo`

`replyTo` should be `null` for the recalled message itself.

## Realtime Changes

Use the existing `message.updated` socket event.

When a recall succeeds:

1. emit `message.updated` to the conversation room
2. emit `message.updated` to participant user rooms
3. ensure the payload contains the recalled message with `isDeleted = true` and cleared content fields

No new socket event type is required.

## Frontend Changes

### Message Menu

Add `Recall message` to the message context menu only when:

- the message belongs to the current user
- the message is not already recalled

### Confirmation

Use the existing dialog primitives for confirmation.

Suggested copy:

- title: `Recall this message?`
- description: `This message will be replaced with a recalled notice for everyone in the conversation.`

### Message Bubble Rendering

For recalled messages:

- skip normal rich text rendering
- skip link preview rendering
- skip reply-preview rendering inside the recalled bubble
- render a muted placeholder string instead
- keep timestamp and read receipts visible

Recommended visual treatment:

- preserve left/right alignment by sender
- use reduced contrast compared with active messages
- optionally italicize the placeholder to distinguish it from authored text

### Reply Preview Rendering

When rendering a reply preview that points to a recalled message:

- show sender name as usual
- replace preview body with the recalled placeholder

### Cached State

Existing active-chat handling for `message.updated` should be reused so recalled state replaces the matching message in both:

- realtime local message state
- invalidated fetched message pages

## Error Handling

- Non-senders attempting recall return `403`.
- Invalid ids return `400` or `404` following current controller conventions.
- Recalling a pinned message must not leave a stale pinned banner behind.
- Client should surface a toast on recall failure.

## Testing Strategy

Backend tests should cover:

- sender can recall their own message
- non-sender cannot recall the message
- recalled message clears original content fields
- recalled pinned message also clears the active pin
- recalled messages are emitted through `message.updated`
- new replies to recalled messages are rejected

Frontend checks should cover:

- context menu shows `Recall message` only on current-user non-recalled messages
- recalled message bubble shows placeholder instead of original content
- recalled message hides link preview and inline reply block
- reply preview to a recalled message shows placeholder text
- realtime `message.updated` replaces an existing rendered message with recalled state

## Out of Scope

- Recall time windows
- Admin or moderator recall permissions
- Undo recall
- Audit history of original recalled content
