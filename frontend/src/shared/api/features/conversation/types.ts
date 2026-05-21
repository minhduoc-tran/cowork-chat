export interface Conversation {
  id: number
  type: "direct" | "group"
  name: string | null
  createdAt: string
  updatedAt: string
}

export interface ConversationMember {
  id: number
  conversationId: number
  userId: number
  role: "owner" | "admin" | "member"
  joinedAt: string
  leftAt: string | null
  lastReadMessageId: number | null
  displayName: string
  avatar: string | null
  isOnline: boolean
}

export interface ConversationMessage {
  id: number
  conversationId: number
  senderId: number
  type: "text" | "image" | "file" | "system"
  content: string | null
  replyToId: number | null
  isEdited: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface ConversationMessageReplyPreview {
  id: number
  content: string | null
  senderId: number
  senderName: string
  createdAt: string
}

export interface ConversationMessageWithReply {
  message: ConversationMessage
  replyTo: ConversationMessageReplyPreview | null
}

export interface ConversationMessageRecord extends ConversationMessage {
  replyTo: ConversationMessageReplyPreview | null
}

export interface ConversationListItem {
  conversation: Conversation
  members: ConversationMember[]
  lastMessage: ConversationMessage | null
}

export interface ConversationListResponse {
  conversations: ConversationListItem[]
}

export interface ConversationMessageListResponse {
  messages: Array<ConversationMessage | ConversationMessageWithReply>
}
