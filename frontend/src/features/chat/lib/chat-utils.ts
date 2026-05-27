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

export function parseTaskMentions(
  text: string,
  isMine: boolean,
  tasks?: any[],
  onTaskClick?: (taskId: number) => void
): React.ReactNode[] {
  if (!text) return []

  const taskRegex = /\[\[task:(\d+)\|([\s\S]*?)\]\]/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = taskRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const taskId = Number(match[1])
    const fallbackTitle = match[2]

    const taskInCache = tasks?.find((t) => t.id === taskId)
    const displayTitle = taskInCache ? taskInCache.title : fallbackTitle
    const isDeletedOrInaccessible = tasks ? !taskInCache : false

    parts.push(
      React.createElement(
        "button",
        {
          key: `task-mention-${key++}`,
          type: "button",
          onClick: (e) => {
            e.stopPropagation()
            if (onTaskClick) {
              onTaskClick(taskId)
            }
          },
          className: cn(
            "mx-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold select-none border transition-colors cursor-pointer",
            isDeletedOrInaccessible
              ? "line-through bg-zinc-100 text-zinc-400 border-zinc-200 dark:bg-zinc-900/40 dark:text-zinc-500 dark:border-zinc-800"
              : isMine
                ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/35 hover:bg-primary-foreground/30"
                : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
          ),
        },
        `#${taskId} ${displayTitle}`
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
 * Parses task mentions.
 */
export function renderMessageContent(
  content: string | null,
  isMine: boolean,
  members?: { displayName: string }[],
  currentDisplayName?: string,
  tasks?: any[],
  onTaskClick?: (taskId: number) => void
): React.ReactNode {
  if (!content) return null

  // 1. First parse task mentions
  const taskParts = parseTaskMentions(content, isMine, tasks, onTaskClick)

  // 2. For each part, if it is a string, run URL and member mention parsing on it
  const finalParts: React.ReactNode[] = []
  let key = 0

  for (const part of taskParts) {
    if (typeof part === "string") {
      const urlRegex = /https?:\/\/[^\s]+/gi
      let lastIndex = 0
      let match: RegExpExecArray | null

      while ((match = urlRegex.exec(part)) !== null) {
        if (match.index > lastIndex) {
          const textSegment = part.slice(lastIndex, match.index)
          finalParts.push(
            ...parseMentions(textSegment, isMine, members, currentDisplayName)
          )
        }
        const url = match[0]
        finalParts.push(
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

      if (lastIndex < part.length) {
        const trailingSegment = part.slice(lastIndex)
        finalParts.push(
          ...parseMentions(trailingSegment, isMine, members, currentDisplayName)
        )
      }
    } else {
      // It is already a React task button element
      finalParts.push(part)
    }
  }

  return finalParts
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

export function filterTaskMentions(
  text: string,
  currentMentions: { id: number; title: string }[]
): { id: number; title: string }[] {
  const counts: Record<string, number> = {}
  const updated: { id: number; title: string }[] = []

  for (const mention of currentMentions) {
    const searchStr = `/task ${mention.title}`
    let idx = text.indexOf(searchStr)
    const occurrenceIndex = counts[searchStr] ?? 0
    let currentCount = 0

    while (idx !== -1) {
      if (currentCount === occurrenceIndex) {
        updated.push(mention)
        counts[searchStr] = occurrenceIndex + 1
        break
      }
      currentCount++
      idx = text.indexOf(searchStr, idx + 1)
    }
  }
  return updated
}

export function serializeTaskMentions(
  text: string,
  mentions: { id: number; title: string }[]
): string {
  let result = text
  for (const mention of mentions) {
    const target = `/task ${mention.title}`
    const idx = result.indexOf(target)
    if (idx !== -1) {
      result =
        result.substring(0, idx) +
        `[[task:${mention.id}|${mention.title}]]` +
        result.substring(idx + target.length)
    }
  }
  return result
}
