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
export function renderMessageContent(
  content: string | null,
  isMine: boolean
): React.ReactNode {
  if (!content) return null
  const urlRegex = /https?:\/\/[^\s]+/gi
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = urlRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }
    const url = match[0]
    parts.push(
      React.createElement(
        "a",
        {
          key: key++,
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
    parts.push(content.slice(lastIndex))
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
