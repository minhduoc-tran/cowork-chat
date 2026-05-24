import * as React from "react"

import type {
  ConversationMessageRecord,
  ConversationMessageReplyPreview,
} from "@/shared/api"
import { cn } from "@/shared/lib/utils"

export type ChatMessage = ConversationMessageRecord

export function formatTime(dateValue: string | Date | unknown): string {
  if (!dateValue) return ""
  const date = new Date(dateValue as string | number | Date)
  if (isNaN(date.getTime())) return ""
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Split message text into plain-text and URL segments,
 * rendering URLs as clickable <a> tags with an underline hover effect.
 */
export function parseMentions(
  text: string,
  isMine: boolean,
  members?: { displayName: string }[],
  currentDisplayName?: string
): React.ReactNode[] {
  if (!text) return []
  if (!members || members.length === 0) return [text]

  const escapedNames = members
    .map((m) => m.displayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter(Boolean)

  if (escapedNames.length === 0) return [text]

  const mentionRegex = new RegExp(`@(${escapedNames.join("|")})`, "g")
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = mentionRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    const matchedName = match[1]
    const isCurrentUserMentioned =
      currentDisplayName &&
      matchedName.toLowerCase() === currentDisplayName.toLowerCase()

    parts.push(
      React.createElement(
        "span",
        {
          key: `mention-${key++}`,
          className: cn(
            "mx-0.5 inline-block rounded-md px-1 py-0.5 text-xs font-semibold select-none",
            isCurrentUserMentioned
              ? "border border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
              : isMine
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-primary/10 text-primary"
          ),
        },
        `@${matchedName}`
      )
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

/**
 * Split message text into plain-text and URL segments,
 * rendering URLs as clickable <a> tags with an underline hover effect.
 * Also parses and highlights member @mentions.
 */
export function renderMessageContent(
  content: string | null,
  isMine: boolean,
  members?: { displayName: string }[],
  currentDisplayName?: string
): React.ReactNode {
  if (!content) return null
  const urlRegex = /https?:\/\/[^\s]+/gi
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = urlRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textSegment = content.slice(lastIndex, match.index)
      parts.push(
        ...parseMentions(textSegment, isMine, members, currentDisplayName)
      )
    }
    const url = match[0]
    parts.push(
      React.createElement(
        "a",
        {
          key: `url-${key++}`,
          href: url,
          target: "_blank",
          rel: "noopener noreferrer",
          onClick: (e) => e.stopPropagation(),
          className: cn(
            "cursor-pointer break-all underline underline-offset-2",
            isMine ? "text-primary-foreground/90" : "text-primary"
          ),
        },
        url
      )
    )
    lastIndex = match.index + url.length
  }
  if (lastIndex < content.length) {
    const trailingSegment = content.slice(lastIndex)
    parts.push(
      ...parseMentions(trailingSegment, isMine, members, currentDisplayName)
    )
  }
  return parts
}

export function getScrollViewport(scrollRoot: HTMLDivElement | null) {
  return scrollRoot?.querySelector(
    '[data-slot="scroll-area-viewport"]'
  ) as HTMLDivElement | null
}

export function mergeMessages(
  baseMessages: ChatMessage[],
  extraMessages: ChatMessage[]
): ChatMessage[] {
  const merged = new Map<number, ChatMessage>()

  for (const message of baseMessages) {
    merged.set(message.id, message)
  }

  for (const message of extraMessages) {
    // Skip optimistic messages that already exist in base (matched by content + sender)
    if (message.id > 1_000_000_000) {
      const alreadyFetched = baseMessages.some(
        (base) =>
          base.content === message.content &&
          base.senderId === message.senderId &&
          base.replyToId === message.replyToId &&
          Math.abs(
            new Date(base.createdAt).getTime() -
              new Date(message.createdAt).getTime()
          ) < 5000
      )
      if (alreadyFetched) continue
    }
    merged.set(message.id, message)
  }

  return Array.from(merged.values()).sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  )
}

export function hydrateReplyPreviews(
  messages: ChatMessage[],
  buildReplyPreview: (message: ChatMessage) => ConversationMessageReplyPreview
): ChatMessage[] {
  const messagesById = new Map(messages.map((message) => [message.id, message]))

  return messages.map((message) => {
    if (message.replyTo || !message.replyToId) {
      return message
    }

    const repliedMessage = messagesById.get(message.replyToId)

    if (!repliedMessage) {
      return message
    }

    return {
      ...message,
      replyTo: buildReplyPreview(repliedMessage),
    }
  })
}

export function getMessagePreview(
  content: string | null,
  fallback: string,
  maxLength = 90
) {
  const normalized = content?.trim()

  if (!normalized) return fallback
  if (normalized.length <= maxLength) return normalized

  return `${normalized.slice(0, maxLength).trimEnd()}...`
}
