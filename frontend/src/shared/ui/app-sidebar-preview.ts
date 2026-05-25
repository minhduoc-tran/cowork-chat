import type { ConversationListItem } from "@/shared/api"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Translate = any

export function getConversationPreviewText(
  item: ConversationListItem | null,
  currentUserId: number | undefined,
  t: Translate
) {
  if (!item || !item.lastMessage) {
    return t("sidebar.noMessages")
  }

  const { lastMessage, conversation, members } = item

  if (lastMessage.isDeleted) {
    return t("chat.recalledMessage")
  }

  if (lastMessage.type === "system") {
    try {
      const payload = JSON.parse(lastMessage.content || "")
      const eventType = payload.eventType

      const getActorName = (actorId: number, defaultName?: string) => {
        if (Number(actorId) === Number(currentUserId)) {
          return t("chat.tooltipYou", "Bạn")
        }
        if (members) {
          const member = members.find((m) => m.userId === actorId)
          if (member) return member.displayName
        }
        return defaultName || `User #${actorId}`
      }

      if (eventType === "group_created") {
        const actorName = getActorName(payload.actorId, payload.actorName)
        return (
          t("chat.systemGroupCreated", {
            actor: actorName,
            groupName: payload.groupName,
          }) || `${actorName} đã tạo nhóm "${payload.groupName}"`
        )
      }

      if (eventType === "group_renamed") {
        const actorName = getActorName(payload.actorId, payload.actorName)
        return (
          t("chat.systemGroupRenamed", {
            actor: actorName,
            newName: payload.newName,
          }) || `${actorName} đã đổi tên nhóm thành "${payload.newName}"`
        )
      }

      if (eventType === "member_joined") {
        const actorName = getActorName(payload.actorId, payload.actorName)
        const targetName = getActorName(payload.targetId, payload.targetName)
        if (Number(payload.actorId) === Number(payload.targetId)) {
          return (
            t("chat.systemMemberJoinedSelf", {
              actor: actorName,
            }) || `${actorName} đã tham gia nhóm`
          )
        } else {
          return (
            t("chat.systemMemberJoined", {
              actor: actorName,
              target: targetName,
            }) || `${actorName} đã thêm ${targetName} vào nhóm`
          )
        }
      }

      if (eventType === "member_kicked") {
        const actorName = getActorName(payload.actorId, payload.actorName)
        const targetName = getActorName(payload.targetId, payload.targetName)
        return (
          t("chat.systemMemberKicked", {
            actor: actorName,
            target: targetName,
          }) || `${actorName} đã xóa ${targetName} khỏi nhóm`
        )
      }

      if (eventType === "member_left") {
        const actorName = getActorName(
          payload.actorId,
          payload.displayName || payload.actorName
        )
        return (
          t("chat.systemMemberLeft", {
            actor: actorName,
          }) || `${actorName} đã rời khỏi nhóm`
        )
      }
    } catch {
      return t("sidebar.systemMessage")
    }
  }

  const rawContent = lastMessage.content?.trim() || t("sidebar.systemMessage")

  // For group chats, prefix with the sender's name
  if (conversation.type === "group" && lastMessage.type !== "system") {
    if (lastMessage.senderId === currentUserId) {
      const youLabel = t("chat.you", "Bạn")
      return `${youLabel}: ${rawContent}`
    }
    const sender = members.find((m) => m.userId === lastMessage.senderId)
    const senderName = sender
      ? sender.displayName
      : `User #${lastMessage.senderId}`
    return `${senderName}: ${rawContent}`
  }

  return rawContent
}
