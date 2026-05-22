export function shouldMarkUnreadBelow(input: {
  wasNewMessageAdded: boolean
  isMyMessage: boolean
  wasAtBottom: boolean
}) {
  return input.wasNewMessageAdded && !input.isMyMessage && !input.wasAtBottom
}

export function getScrollHintMode(input: {
  showScrollHint: boolean
  hasUnreadBelow: boolean
}) {
  if (!input.showScrollHint) {
    return "hidden" as const
  }

  return input.hasUnreadBelow ? ("unread" as const) : ("scroll" as const)
}
