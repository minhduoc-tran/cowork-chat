import type { ConversationMessage } from "@/shared/api"

type Translate = (key: string, opts?: Record<string, unknown>) => string

type ConversationPreviewMessage = Pick<
  ConversationMessage,
  "content" | "isDeleted"
>

export function getConversationPreviewText(
  lastMessage: ConversationPreviewMessage | null,
  t: Translate
) {
  if (!lastMessage) {
    return t("sidebar.noMessages")
  }

  if (lastMessage.isDeleted) {
    return t("chat.recalledMessage")
  }

  return lastMessage.content?.trim() || t("sidebar.systemMessage")
}
