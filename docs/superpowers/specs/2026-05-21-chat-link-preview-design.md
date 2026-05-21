# Chat Link Preview Design

## Goal

When a user sends a text message containing one or more URLs, the chat should unfurl only the first URL into a preview card that appears below the message text for both sender and recipient.

## Scope

- Direct chat only.
- Text messages only.
- One preview per message, based on the first detected URL.
- Preview is optional. If metadata fetch fails, the original message still sends and renders as plain text.

## User Experience

When the sender submits a message with at least one URL:

1. The message sends immediately with the raw text content unchanged.
2. The backend detects the first URL in the text.
3. The backend fetches metadata asynchronously so sending is not blocked.
4. When metadata is available, both chat participants receive a message update.
5. The message renders with:
   - the original text content at the top
   - a preview card below it for the first URL only

If a message contains multiple URLs, the extra URLs remain plain text in the message body and do not produce additional cards.

## Preview Card Content

The preview card should include:

- canonical preview URL
- site name
- title
- description
- image URL

The card is clickable and opens the preview URL in a new tab.

The text section of the message still shows the original URL text exactly as sent.

## Data Model

Store preview metadata on the `messages` row so the message history API and realtime updates return a single enriched message shape.

Add one nullable field to `messages`:

- `linkPreview`: serialized JSON payload containing:
  - `url`
  - `siteName`
  - `title`
  - `description`
  - `imageUrl`

This avoids a separate table for the first implementation because:

- only one preview is needed per message
- the preview is tightly coupled to the message
- history reads stay simple

## Backend Flow

### Message Send

`message.send` keeps its current behavior for persistence and delivery:

1. create the message immediately
2. emit the new message immediately
3. if message content contains a URL, trigger background unfurl for the first URL

### Metadata Fetch

The backend unfurl worker flow should:

1. extract the first URL from message text
2. fetch the target HTML
3. parse Open Graph / Twitter / fallback metadata
4. normalize the preview payload
5. update the `messages` row with `linkPreview`
6. emit a realtime `message.updated` event to both participants

If fetch or parse fails:

- do not retry in this first version
- do not surface an error toast to users
- leave `linkPreview` as `null`

## API and Socket Changes

### REST

`listMessages` must return `linkPreview` on every message so refresh and reload preserve the preview.

### Realtime

Keep `message.received` for initial send.

Add `message.updated` for post-send enrichment. Payload should include the updated message row so clients can replace the existing message in-place by `id`.

## Frontend Flow

### Message State

Extend frontend conversation message types to include nullable `linkPreview`.

When `message.updated` arrives:

- find the existing message by `id`
- replace it with the updated payload
- preserve current ordering

### Rendering

If `message.linkPreview` exists, render a preview card below the message text bubble content.

Rendering rules:

- original text stays visible above the card
- card shows image, site name, title, and description
- title and description are clamped for compact layout
- image keeps a stable aspect ratio
- card respects sender/recipient bubble styling without becoming a nested bubble

### Multiple URLs

Only the first URL is previewed.

The message body itself remains untouched and can still contain several visible links.

## Parsing and Fallback Rules

Metadata priority:

1. `og:title`, `og:description`, `og:image`, `og:site_name`
2. Twitter card tags
3. document `<title>`
4. empty preview fields when unavailable

Preview should be discarded if there is no meaningful title and no image and no description.

## Error Handling

- Invalid URL: ignore preview generation.
- Request timeout: ignore preview generation.
- Non-HTML response: ignore preview generation.
- Large or malformed HTML: ignore preview generation.

In all failure cases, the message remains usable as plain text.

## Testing Strategy

Backend tests should cover:

- extract first URL from a message with multiple URLs
- skip preview when no URL exists
- persist preview metadata after successful unfurl
- emit `message.updated` when preview is stored
- preserve plain text behavior when unfurl fails

Frontend checks should cover:

- render card when `linkPreview` exists
- keep plain text rendering when `linkPreview` is null
- update existing message in-place when `message.updated` arrives
- preview only the first URL even if multiple URLs exist in text

## Out of Scope

- Group chats
- Manual refresh/regenerate preview
- Multiple preview cards per message
- Rich inline linkification for every URL in message body
- Retry jobs, queues, or persistence beyond the message row
- Caching preview data across different messages that share the same URL
