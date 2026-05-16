# Chat Foundation Design

**Date:** 2026-05-16

**Status:** Draft for review

## Goal

Build the phase 1 chat foundation for the backend:

- direct conversation creation
- conversation listing
- message history listing
- realtime conversation room join
- realtime text messaging for direct and group chat

This phase explicitly excludes read-time, typing indicators, edit/delete message flows, replies, and attachments.

## Scope

### In scope

- `POST /api/v1/conversations/direct`
- `GET /api/v1/conversations`
- `GET /api/v1/conversations/:conversationId/messages`
- Socket event `conversation.join`
- Socket event `message.send`
- Socket event `conversation.joined`
- Socket event `message.received`
- Group chat support using the existing conversation and membership model

### Out of scope

- Read receipts and unread counts
- Typing indicators
- Message edit or delete
- Reply threads
- Attachments
- Presence and online status
- Delivery guarantees beyond normal Socket.IO behavior

## Current Codebase Context

The existing backend already has:

- authenticated REST routes with Express
- PostgreSQL with Drizzle ORM
- `conversations`, `conversation_members`, and `messages` tables
- group conversation creation via `POST /api/v1/conversations/groups`
- Socket.IO authentication and user-scoped rooms in the form `user:<userId>`

The backend does not yet have:

- direct conversation creation
- conversation listing
- message history listing
- conversation-scoped socket rooms
- realtime message send and broadcast flow

This design should preserve the current structure:

- routes -> controllers -> services
- database access inside services
- socket emission logic centralized behind `socketEmitter`

## Recommended Architecture

Use a hybrid model:

- REST provides bootstrap data and durable resource access
- Socket.IO handles realtime room join and message delivery

### Why this approach

- It fits the current codebase, which already separates HTTP and socket responsibilities.
- It keeps data-fetching concerns out of the socket command layer.
- It gives the frontend a stable way to fetch initial state before subscribing to realtime updates.
- It keeps the first implementation small enough to ship before adding read receipts and more advanced chat behavior.

## Conversation Model

### Direct conversation

Direct conversations are created or reused through a dedicated REST endpoint:

- `POST /api/v1/conversations/direct`

Request body:

```json
{
  "participantId": 12
}
```

Behavior:

- requester must be authenticated
- `participantId` must exist
- requester cannot create a direct conversation with themself
- requester and participant must already be friends
- if a direct conversation already exists for exactly these two active members, return it
- otherwise create a new direct conversation and two membership rows

This endpoint must be idempotent from the product perspective. Calling it multiple times for the same pair must not create duplicate direct conversations.

### Group conversation

The existing group creation endpoint remains:

- `POST /api/v1/conversations/groups`

No group behavior changes are required for phase 1 beyond making group conversations participate in the new list, message history, and realtime message flows.

## Room Model

Keep the existing user room:

- `user:<userId>`

Add a conversation-scoped room:

- `conversation:<conversationId>`

### User room purpose

This remains useful for user-specific broadcasts such as:

- friend request events
- conversation created events
- future per-user chat notifications

### Conversation room purpose

This becomes the primary channel for active chat sessions:

- users join it after opening a conversation
- new messages are broadcast to it

Joining a room is a socket concern, not a REST resource concern. Because of that, phase 1 should not add a separate REST API just to join a conversation room.

## REST API Design

### `POST /api/v1/conversations/direct`

Creates or returns an existing direct conversation.

Successful response payload should include:

- `conversation`
- `members`
- optional `created` boolean to distinguish reused vs newly created

### `GET /api/v1/conversations`

Returns the conversations visible to the authenticated user.

The response should include enough data for a chat sidebar:

- conversation metadata
- active members
- last message if any

Phase 1 does not need:

- unread counts
- participant presence
- per-message read status

Suggested response shape:

```json
{
  "conversations": [
    {
      "conversation": {
        "id": 1,
        "type": "direct",
        "name": null,
        "createdAt": "2026-05-16T08:00:00.000Z",
        "updatedAt": "2026-05-16T08:00:00.000Z"
      },
      "members": [],
      "lastMessage": null
    }
  ]
}
```

### `GET /api/v1/conversations/:conversationId/messages`

Returns recent message history for one conversation.

Rules:

- requester must be an active member of the conversation
- non-members must receive a forbidden or not-found style error consistent with the rest of the API

Phase 1 pagination can stay simple:

- accept `limit`
- optionally accept `beforeMessageId` later if needed

The first implementation should prioritize correctness over advanced cursoring. Returning the latest `N` messages is sufficient for this phase.

## Socket Event Design

### Client -> server: `conversation.join`

Payload:

```json
{
  "conversationId": 1
}
```

Server behavior:

- validate `conversationId`
- verify the authenticated socket user is an active member of the conversation
- join socket room `conversation:<conversationId>`
- emit success acknowledgement event back to that socket

### Server -> client: `conversation.joined`

Payload:

```json
{
  "conversationId": 1
}
```

This event confirms that the client is now subscribed to realtime updates for that conversation.

### Client -> server: `message.send`

Payload:

```json
{
  "conversationId": 1,
  "type": "text",
  "content": "hello"
}
```

Phase 1 constraints:

- `type` should effectively support only `"text"` for client-created messages
- `content` must be a non-empty trimmed string

Server behavior:

- validate payload
- verify the authenticated socket user is an active member of the conversation
- insert the message into the database
- broadcast the saved message via `message.received` to room `conversation:<conversationId>`

The send flow should not require that the user previously joined the room. Membership is the source of truth. Joining is for receiving realtime updates efficiently, not for authorization.

### Server -> client: `message.received`

Payload:

- normalized saved message record
- enough fields for the frontend to append immediately without an additional fetch

At minimum:

- `id`
- `conversationId`
- `senderId`
- `type`
- `content`
- `isEdited`
- `isDeleted`
- `createdAt`
- `updatedAt`

## Authorization Rules

### Direct conversation creation

- only authenticated users can create or fetch direct conversations
- only accepted friends can open a direct conversation with each other

### Conversation listing

- only list conversations where the requester is an active member
- members with `leftAt` set should be treated as inactive unless the product later decides to keep historical access

### Message history

- only active members can read message history

### Socket join and send

- only active members can join a conversation room
- only active members can send messages to that conversation

## Data Access Rules

Membership checks should always rely on `conversation_members`.

For direct conversations, lookup logic must ensure:

- `conversation.type = "direct"`
- both users are members
- there are no extra active members in that conversation

This prevents a malformed query from incorrectly matching a group conversation that happens to contain both users.

## Error Handling

The API and socket layer should fail clearly for these cases:

- invalid conversation id
- invalid participant id
- direct conversation requested with self
- direct conversation requested with non-friend
- join attempted by non-member
- message send attempted by non-member
- empty text message content

Errors should follow the existing backend style:

- REST should use `ApiError`
- socket handlers should emit structured error events or acknowledgements consistent with the project style chosen during implementation

Phase 1 does not require a complex socket error protocol, but error responses should still be predictable for frontend handling.

## Service Decomposition

The implementation should be split around clear responsibilities.

### Conversation service

Owns:

- create or find direct conversations
- list conversations for a user
- verify active membership in a conversation

### Message service

Owns:

- list messages for a conversation
- validate and persist new text messages

### Socket server and emitter

Own:

- socket event registration
- room join behavior
- message broadcast behavior

This separation avoids overloading `conversation.service.ts` with all chat behavior as the feature grows.

## Testing Strategy

### Service-level coverage

Test the core business rules:

- direct conversation creation returns existing conversation instead of duplicating
- direct conversation creation rejects non-friends
- conversation listing only returns conversations for the requester
- message history rejects non-members
- message send rejects non-members

### Route-level coverage

Test HTTP behavior for:

- `POST /conversations/direct`
- `GET /conversations`
- `GET /conversations/:conversationId/messages`

### Socket-level coverage

Test realtime behavior for:

- authenticated user can join a valid conversation room
- non-member cannot join a conversation room
- valid `message.send` persists a message and broadcasts `message.received`

### Manual verification

Minimum manual verification for phase 1:

- user A opens direct chat with user B and both can exchange messages in realtime
- a group with three members receives realtime messages from one sender
- a non-member cannot join or send to another conversation

## Phase 1 Delivery Summary

Phase 1 should produce a working foundation with these characteristics:

- direct chat rooms can be created deterministically
- existing groups can participate in the same chat infrastructure
- frontend can fetch conversation lists and message history
- active members can join conversation rooms over Socket.IO
- active members can send and receive realtime text messages

## Deferred Work

These features are intentionally postponed to a later phase:

- read-time using `lastReadMessageId`
- unread counts
- typing indicators
- message edit and delete
- attachments
- replies
- notification fanout rules for users not currently inside the conversation room

The design intentionally keeps these out so the first delivery stays focused on the base chat transport and data model.
