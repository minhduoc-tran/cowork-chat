# Task Mention Design

## Goal

Add task mentions to group chat messages so users can type `@task `, pick a task from the current group, send a readable inline mention, and click that mention later to open the task sheet and the referenced task detail from chat.

## Current Context

- Group chat input already supports `@member` suggestions in `frontend/src/features/chat/ui/chat-input-panel.tsx`.
- Chat message rendering currently treats mentions as plain text and highlights member mentions by matching display names in `frontend/src/features/chat/lib/chat-utils.ts`.
- Task details can already be opened from the task board through `selectedTask` state in `frontend/src/features/chat/ui/task-board-view.tsx`.
- Message persistence in `backend/src/drizzle/schemas/message.schema.ts` stores `content` only; there is no structured mention metadata yet.
- Group task queries already exist through `useTasks(conversationId)` and `taskService.listTasks`, but there is no dedicated single-task lookup route.

## User-Approved Behavior

- Task mention is supported in group chat only.
- Trigger syntax is `@task ` followed by a search term.
- Suggestion results must come from tasks that belong to the current group conversation only.
- Clicking a task mention must open the task sheet first, then focus and open the referenced task detail.
- Historical chat messages must resolve the current task title after rename rather than freezing the original title forever.
- If the task no longer exists or the user no longer has access, clicking the mention must show an error notification.

## Proposed Approach

### Mention Model

- Keep the visible chat text readable, for example `@task Hoan thanh landing page`.
- Store structured task mention metadata alongside the message instead of relying on title parsing.
- Each task mention record should include:
  - `type: "task"`
  - `taskId: number`
  - `conversationId: number`
  - `fallbackTitle: string`
  - `start: number`
  - `end: number`
- `taskId` is the durable reference. `fallbackTitle` exists only to cover the short period before task data is resolved on the client.

### Input and Composer Behavior

- Extend the chat input suggestion logic to support two independent flows:
  - existing `@member` lookup
  - new `@task ` lookup
- `@task ` must be an explicit prefix, not a mixed dropdown that combines members and tasks.
- After the user selects a task:
  - insert a readable inline token into the input
  - register a draft mention entry in local state
- If the user edits the text and removes or breaks the inserted token, the related draft mention entry must be removed so stale offsets are not sent.
- Multiple task mentions in one message are allowed.

### Message Send and Validation

- Extend the socket `message.send` payload to include `mentions`.
- On group message send, the backend must validate that:
  - the conversation is a real group conversation
  - each referenced task exists
  - each referenced task belongs to the same `conversationId`
  - the sender is allowed to view that task through existing group membership and task visibility rules
- Invalid task mention payloads should reject the send request with a normal error response rather than silently stripping the mention.

### Message Rendering

- Render task mentions from structured metadata, not by matching task titles in free text.
- Member mentions can continue to use the current text parsing path for now.
- Task mention labels should resolve in this order:
  - current task title from client task data
  - `fallbackTitle` from the message metadata
- The rendered task mention should look clickable and distinct from member mentions.

### Open-from-Chat Flow

- The chat view owns the "open task from mention" request.
- Clicking a task mention should:
  - open the task sheet
  - pass the requested `taskId` into `TaskBoardView`
  - wait until task data is available
  - set the matching task as `selectedTask`
  - open `TaskDetailModal`
- If the requested task cannot be resolved, show a toast such as "Task no longer exists or you do not have access" and clear the pending open request.

## File-Level Design

### Backend

- `backend/src/drizzle/schemas/message.schema.ts`
  - add a JSONB `mentions` column and exported TypeScript types for task mentions
- `backend/src/services/message.service.ts`
  - accept `mentions` on send
  - validate task mention references
  - return `mentions` in history and socket payloads
- `backend/src/socket/socket.server.ts`
  - extend `message.send` payload parsing and validation
- `backend/src/types/socket.types.ts`
  - align socket payload types with the new `mentions` field

### Frontend

- `frontend/src/features/chat/ui/chat-input-panel.tsx`
  - add `@task ` detection and task dropdown behavior
  - maintain local draft mention metadata in sync with the text input
- `frontend/src/features/chat/lib/use-chat.ts`
  - include `mentions` in `handleSend`
  - include `mentions` in optimistic messages
  - clear mention draft state after send
- `frontend/src/features/chat/lib/chat-utils.ts`
  - add metadata-driven rendering for task mentions
  - preserve existing member mention rendering path
- `frontend/src/features/chat/ui/chat-messages.tsx`
  - wire click handlers from rendered task mentions back to chat view state
- `frontend/src/features/chat/ui/chat-view.tsx`
  - own pending task-open state from message clicks
  - open the task sheet and forward the requested task id
- `frontend/src/features/chat/ui/task-board-view.tsx`
  - accept a requested task id from the parent
  - resolve it to `selectedTask` once task data is ready
  - surface failure back to the parent for toast handling
- `frontend/src/shared/api/features/conversation/types.ts`
  - add message mention types
- `frontend/src/shared/api/features/task/api.ts`
  - add a single-task fetch endpoint if list-based resolution proves too brittle during implementation

## Data Flow

1. User types `@task ` in a group chat input.
2. The composer switches into task suggestion mode and filters tasks from the active group conversation.
3. User selects one or more tasks; the input inserts readable text and the composer records structured draft mention metadata.
4. On send, the socket payload includes `content`, optional `replyToId`, and `mentions`.
5. Backend validates the task references and stores the message plus mention metadata.
6. Chat history and realtime socket events return the message with `mentions`.
7. The renderer turns the referenced spans into clickable task mention pills.
8. Clicking a pill opens the task sheet and then the matching task detail.

## Error Handling

- Unsupported context:
  - direct chat should not expose `@task ` suggestions
- Invalid mention payload:
  - backend rejects the send and client surfaces the send failure
- Task deleted or access revoked after message creation:
  - mention still renders
  - click shows an error toast
- Task title changed:
  - client resolves and displays the latest title when task data is available

## Testing Strategy

### Backend

- Add service-level tests for task mention validation:
  - valid same-conversation task mention passes
  - missing task fails
  - task from another conversation fails
  - direct conversation payload fails
- Add route or socket integration coverage for message send payloads that include `mentions`.

### Frontend

- Add component coverage for the input parser and draft mention synchronization:
  - selecting a task creates a draft mention
  - editing away the token removes the draft mention
  - multiple task mentions produce multiple metadata entries
- Add rendering coverage for task mention spans:
  - latest task title wins over fallback title
  - click invokes the open-task callback
- Add view-level coverage for pending task open:
  - task sheet opens first
  - matching task detail opens once tasks are loaded
  - unresolved task shows an error toast

### Verification

- Run frontend lint.
- Run backend lint.
- Run frontend build or typecheck.
- Run backend test or typecheck for the touched message and task flows.

## Non-Goals

- No task mention support in direct messages in this iteration.
- No global cross-workspace or cross-group task mention search.
- No conversion of member mentions to structured metadata in this change.
- No rich task preview card in chat; this iteration is inline mention plus click-through only.
