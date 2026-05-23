import type { ConversationMessage } from "@/shared/api"

type Translate = (key: string, opts?: Record<string, unknown>) => string

type ConversationPreviewMessage = Pick<
  ConversationMessage,
  "content" | "isDeleted" | "type"
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

  if (lastMessage.type === "system") {
    try {
      const payload = JSON.parse(lastMessage.content || "")
      if (payload.eventType === "group_created") {
        return (
          t("sidebar.groupCreated", {
            groupName: payload.groupName,
          }) || `Nhóm "${payload.groupName}" đã được tạo`
        )
      }
    } catch {
      return t("sidebar.systemMessage")
    }
  }

  return lastMessage.content?.trim() || t("sidebar.systemMessage")
}
