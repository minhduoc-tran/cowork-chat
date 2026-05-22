import * as React from "react"

import { shouldMarkUnreadBelow } from "../model/new-message-hint"

import type { ChatMessage } from "./chat-utils"
import { getScrollViewport } from "./chat-utils"

interface UseChatScrollOptions {
  activeConversationId: number | null
  targetUserId: number | null
  currentUserId: number
  messages: ChatMessage[]
  isOtherUserTyping: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  setHasUnreadBelow: (val: boolean) => void
}

export function useChatScroll({
  activeConversationId,
  targetUserId,
  currentUserId,
  messages,
  isOtherUserTyping,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  setHasUnreadBelow,
}: UseChatScrollOptions) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const messageRefs = React.useRef<Record<number, HTMLDivElement | null>>({})
  const highlightTimeoutRef = React.useRef<number | null>(null)

  const lastScrollHeightRef = React.useRef(0)
  const lastScrollTopRef = React.useRef(0)
  const prevConversationIdRef = React.useRef<number | null>(null)
  const lastMessageIdRef = React.useRef<number | null>(null)
  const firstMessageIdRef = React.useRef<number | null>(null)

  const [showScrollToBottom, setShowScrollToBottom] = React.useState(false)
  const [highlightState, setHighlightState] = React.useState<{
    userId: number | null
    messageId: number | null
  }>({ userId: null, messageId: null })

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [])

  const scrollToMessage = React.useCallback(
    (messageId: number) => {
      const targetId = Number(messageId)
      const messageNode = messageRefs.current[targetId]

      if (!messageNode) {
        console.warn(`Message node not found for ID: ${targetId}`)
        return
      }

      requestAnimationFrame(() => {
        const viewport = getScrollViewport(scrollRef.current)
        if (viewport) {
          const viewportRect = viewport.getBoundingClientRect()
          const nodeRect = messageNode.getBoundingClientRect()
          const relativeTop = nodeRect.top - viewportRect.top + viewport.scrollTop
          const targetScrollTop = relativeTop - viewportRect.height / 2 + nodeRect.height / 2

          viewport.scrollTo({
            top: targetScrollTop,
            behavior: "smooth",
          })
        } else {
          messageNode.scrollIntoView({
            behavior: "smooth",
            block: "center",
          })
        }
      })

      setHighlightState({
        userId: targetUserId,
        messageId: targetId,
      })

      if (highlightTimeoutRef.current !== null) {
        window.clearTimeout(highlightTimeoutRef.current)
      }

      highlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightState((current) =>
          current.userId === targetUserId && current.messageId === targetId
            ? { userId: targetUserId, messageId: null }
            : current
        )
      }, 1800)
    },
    [targetUserId]
  )

  const handleScrollToBottom = React.useCallback(() => {
    const viewport = getScrollViewport(scrollRef.current)
    if (!viewport) return
    setHasUnreadBelow(false)
    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "smooth",
    })
  }, [setHasUnreadBelow])

  // Register scroll listener on the ScrollArea's viewport to trigger fetchNextPage() when scrolling near the top
  React.useEffect(() => {
    const viewport = getScrollViewport(scrollRef.current)
    if (!viewport) return

    const handleScroll = () => {
      // Record scroll metrics for anchoring
      lastScrollHeightRef.current = viewport.scrollHeight
      lastScrollTopRef.current = viewport.scrollTop

      // Show/hide scroll to bottom button
      const isNearBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 300
      setShowScrollToBottom(!isNearBottom)
      if (isNearBottom) {
        setHasUnreadBelow(false)
      }

      // Trigger fetchNextPage when scrolling near top (scrollTop < 100)
      if (
        viewport.scrollTop < 100 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        void fetchNextPage()
      }
    }

    // Initialize state
    const isNearBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 300
    setShowScrollToBottom(!isNearBottom)

    viewport.addEventListener("scroll", handleScroll)
    return () => {
      viewport.removeEventListener("scroll", handleScroll)
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, setHasUnreadBelow])

  // Auto-scroll or anchor scroll position after messages change
  React.useLayoutEffect(() => {
    const viewport = getScrollViewport(scrollRef.current)
    if (!viewport) return

    const prevConvId = prevConversationIdRef.current
    const prevLastMsgId = lastMessageIdRef.current
    const prevFirstMsgId = firstMessageIdRef.current

    // Update refs
    prevConversationIdRef.current = activeConversationId

    const lastMsg = messages[messages.length - 1]
    const lastMsgId = lastMsg?.id ?? null
    lastMessageIdRef.current = lastMsgId

    const firstMsg = messages[0]
    const firstMsgId = firstMsg?.id ?? null
    firstMessageIdRef.current = firstMsgId

    // 1. If conversation changed, scroll to bottom
    if (activeConversationId !== prevConvId) {
      viewport.scrollTop = viewport.scrollHeight
      lastScrollHeightRef.current = viewport.scrollHeight
      lastScrollTopRef.current = viewport.scrollTop
      return
    }

    // If there were no messages before, and now there are, scroll to bottom
    if (messages.length > 0 && prevLastMsgId === null) {
      viewport.scrollTop = viewport.scrollHeight
      lastScrollHeightRef.current = viewport.scrollHeight
      lastScrollTopRef.current = viewport.scrollTop
      return
    }

    // 2. Determine if a new message was added at the bottom
    const wasNewMessageAdded = lastMsgId !== null && lastMsgId !== prevLastMsgId
    const wasAtBottom =
      lastScrollHeightRef.current - lastScrollTopRef.current - viewport.clientHeight < 150

    if (wasNewMessageAdded) {
      const isMyMessage = lastMsg.senderId === currentUserId
      if (
        shouldMarkUnreadBelow({
          wasNewMessageAdded,
          isMyMessage,
          wasAtBottom,
        })
      ) {
        setHasUnreadBelow(true)
      }

      if (isMyMessage || wasAtBottom) {
        setHasUnreadBelow(false)
        viewport.scrollTop = viewport.scrollHeight
      }
    } else if (isOtherUserTyping && wasAtBottom) {
      viewport.scrollTop = viewport.scrollHeight
    } else {
      // 3. Prepend anchor: messages changed but last message ID didn't change (older messages prepended)
      const wasPrepended = prevFirstMsgId !== null && firstMsgId !== prevFirstMsgId
      if (wasPrepended) {
        const delta = viewport.scrollHeight - lastScrollHeightRef.current
        if (delta > 0) {
          viewport.scrollTop = lastScrollTopRef.current + delta
        }
      }
    }

    // Update tracking refs
    lastScrollHeightRef.current = viewport.scrollHeight
    lastScrollTopRef.current = viewport.scrollTop
  }, [messages, activeConversationId, currentUserId, isOtherUserTyping, setHasUnreadBelow])

  return {
    scrollRef,
    messageRefs,
    showScrollToBottom,
    setShowScrollToBottom,
    highlightState,
    setHighlightState,
    scrollToMessage,
    handleScrollToBottom,
    lastScrollHeightRef,
    lastScrollTopRef,
  }
}
