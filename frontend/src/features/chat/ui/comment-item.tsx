import * as React from "react"
import { MoreHorizontalIcon, PencilIcon, Trash2Icon, CornerDownRightIcon } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Button } from "@/shared/ui/button"
import type { TaskComment, UpdateCommentPayload, CreateCommentPayload } from "@/shared/api"
import type { UseMutationResult } from "@tanstack/react-query"
import { MentionInput, renderCommentWithMentions } from "@/shared/ui/mention-input"

interface Member {
  userId: number
  displayName: string
  avatar: string | null
}

interface CommentItemProps {
  comment: TaskComment
  currentUserId: number
  editingCommentId: number | null
  editingCommentContent: string
  onStartEdit: (id: number, content: string) => void
  onCancelEdit: () => void
  onSaveEdit: (commentId: number) => Promise<void>
  onDelete: (commentId: number) => Promise<void>
  onSubmitReply: (parentId: number, content: string) => Promise<void>
  onContentChange: (content: string) => void
  updateCommentMutation: UseMutationResult<TaskComment, unknown, { taskId: number; commentId: number; payload: UpdateCommentPayload }, unknown>
  createCommentMutation: UseMutationResult<TaskComment, unknown, { taskId: number; payload: CreateCommentPayload }, unknown>
  t: (key: string, options?: Record<string, unknown>) => string
  members?: Member[]
}

export function CommentItem({
  comment,
  currentUserId,
  editingCommentId,
  editingCommentContent,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onSubmitReply,
  onContentChange,
  updateCommentMutation,
  createCommentMutation,
  t,
  members = [],
}: CommentItemProps) {
  const [showActions, setShowActions] = React.useState(false)
  const [replyContent, setReplyContent] = React.useState("")
  const [isReplyFocused, setIsReplyFocused] = React.useState(false)
  const replyInputRef = React.useRef<HTMLTextAreaElement>(null)

  const isEditing = editingCommentId === comment.id
  const isAuthor = comment.authorId === currentUserId
  const canModify = isAuthor
  const isDeleted = !!comment.deletedAt

  const handleStartReply = (mentionName: string) => {
    const tag = `@${mentionName} `
    setReplyContent((prev) => {
      if (prev.includes(tag)) return prev
      return prev ? `${prev} ${tag}` : tag
    })
    setTimeout(() => {
      replyInputRef.current?.focus()
    }, 50)
  }

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return
    await onSubmitReply(comment.id, replyContent)
    setReplyContent("")
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return t("tasks.justNow", "Vừa xong")
    if (diffMins < 60) return t("tasks.minutesAgo", "{{count}} phút trước", { count: diffMins })
    if (diffHours < 24) return t("tasks.hoursAgo", "{{count}} giờ trước", { count: diffHours })
    if (diffDays < 7) return t("tasks.daysAgo", "{{count}} ngày trước", { count: diffDays })
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "02-digit", year: "numeric" })
  }

  return (
    <div
      className="notion-comment-item group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar className="h-8 w-8 shrink-0 mt-0.5">
          <AvatarImage src={comment.author.avatar ?? undefined} />
          <AvatarFallback className="text-[10px] bg-[var(--notion-muted)] text-[var(--notion-text-secondary)] font-medium">
            {comment.author.displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] font-semibold text-[var(--notion-text)]">
              {comment.author.displayName}
            </span>
            <span className="text-[11px] text-[var(--notion-text-tertiary)]">
              {formatTime(comment.createdAt)}
            </span>
            {comment.updatedAt !== comment.createdAt && !isDeleted && (
              <span className="text-[10px] text-[var(--notion-text-tertiary)] italic">
                ({t("tasks.edited", "đã chỉnh sửa")})
              </span>
            )}
          </div>

          {/* Body */}
          {isEditing ? (
            <EditMode
              content={editingCommentContent}
              onChange={onContentChange}
              onSave={() => onSaveEdit(comment.id)}
              onCancel={onCancelEdit}
              isSaving={updateCommentMutation.isPending}
              t={t}
            />
          ) : isDeleted ? (
            <p className="text-[13px] text-[var(--notion-text-tertiary)] italic">
              {t("tasks.commentDeleted", "Bình luận đã bị xóa")}
            </p>
          ) : (
            <p className="text-[14px] text-[var(--notion-text)] leading-[1.5] whitespace-pre-wrap wrap-break-word">
              {renderCommentWithMentions(comment.content, members, currentUserId)}
            </p>
          )}

          {/* Actions */}
          {!isDeleted && !isEditing && (
            <div className="flex items-center gap-3 mt-2">
              {/* Reply focuses the persistent thread reply input */}
              <button
                type="button"
                onClick={() => replyInputRef.current?.focus()}
                className="notion-comment-action text-[12px]"
              >
                <CornerDownRightIcon className="size-3" />
                {t("tasks.reply", "Trả lời")}
              </button>
              {canModify && (
                <>
                  <button
                    type="button"
                    onClick={() => onStartEdit(comment.id, comment.content)}
                    className="notion-comment-action text-[12px]"
                  >
                    <PencilIcon className="size-3" />
                    {t("tasks.edit", "Sửa")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(comment.id)}
                    className="notion-comment-action text-[12px] text-[var(--notion-red)]"
                  >
                    <Trash2Icon className="size-3" />
                    {t("tasks.delete", "Xóa")}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="notion-comment-replies mt-3">
              {comment.replies.map((reply) => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  currentUserId={currentUserId}
                  editingCommentId={editingCommentId}
                  editingCommentContent={editingCommentContent}
                  onStartEdit={onStartEdit}
                  onCancelEdit={onCancelEdit}
                  onSaveEdit={onSaveEdit}
                  onDelete={onDelete}
                  onContentChange={onContentChange}
                  updateCommentMutation={updateCommentMutation}
                  t={t}
                  members={members}
                  parentId={comment.id}
                  onStartReply={handleStartReply}
                />
              ))}
            </div>
          )}

          {/* Persistent reply input at the bottom of the thread card - Notion style */}
          {!isDeleted && !isEditing && (
            <ReplyMode
              content={replyContent}
              onChange={setReplyContent}
              onSubmit={handleSubmitReply}
              isSending={createCommentMutation.isPending}
              t={t}
              members={members}
              textareaRef={replyInputRef}
              isFocused={isReplyFocused}
              onFocus={() => setIsReplyFocused(true)}
              onBlur={() => {
                setTimeout(() => setIsReplyFocused(false), 200)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

interface ReplyItemProps {
  reply: TaskComment
  currentUserId: number
  editingCommentId: number | null
  editingCommentContent: string
  onStartEdit: (id: number, content: string) => void
  onCancelEdit: () => void
  onSaveEdit: (commentId: number) => Promise<void>
  onDelete: (commentId: number) => Promise<void>
  onContentChange: (content: string) => void
  updateCommentMutation: UseMutationResult<TaskComment, unknown, { taskId: number; commentId: number; payload: UpdateCommentPayload }, unknown>
  t: (key: string, options?: Record<string, unknown>) => string
  members?: Member[]
  parentId: number
  onStartReply: (parentId: number, mentionName?: string) => void
}

function ReplyItem({
  reply,
  currentUserId,
  editingCommentId,
  editingCommentContent,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onContentChange,
  updateCommentMutation,
  t,
  members = [],
  parentId,
  onStartReply,
}: ReplyItemProps) {
  const isEditing = editingCommentId === reply.id
  const canModify = reply.authorId === currentUserId
  const isDeleted = !!reply.deletedAt

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return t("tasks.justNow", "Vừa xong")
    if (diffMins < 60) return t("tasks.minutesAgo", "{{count}} phút trước", { count: diffMins })
    if (diffHours < 24) return t("tasks.hoursAgo", "{{count}} giờ trước", { count: diffHours })
    if (diffDays < 7) return t("tasks.daysAgo", "{{count}} ngày trước", { count: diffDays })
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "02-digit", year: "numeric" })
  }

  return (
    <div className="notion-reply-item flex gap-3 py-1.5">
      <Avatar className="h-6 w-6 shrink-0 mt-0.5">
        <AvatarImage src={reply.author.avatar ?? undefined} />
        <AvatarFallback className="text-[9px] bg-[var(--notion-muted)] text-[var(--notion-text-secondary)] font-medium">
          {reply.author.displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[12px] font-semibold text-[var(--notion-text)]">
            {reply.author.displayName}
          </span>
          <span className="text-[10px] text-[var(--notion-text-tertiary)]">
            {formatTime(reply.createdAt)}
          </span>
        </div>
        {isEditing ? (
          <EditMode
            content={editingCommentContent}
            onChange={onContentChange}
            onSave={() => onSaveEdit(reply.id)}
            onCancel={onCancelEdit}
            isSaving={updateCommentMutation.isPending}
            t={t}
            compact
          />
        ) : isDeleted ? (
          <p className="text-[12px] text-[var(--notion-text-tertiary)] italic">
            {t("tasks.commentDeleted", "Bình luận đã bị xóa")}
          </p>
        ) : (
          <p className="text-[13px] text-[var(--notion-text)] leading-[1.5] whitespace-pre-wrap wrap-break-word">
            {renderCommentWithMentions(reply.content, members, currentUserId)}
          </p>
        )}
        {!isDeleted && !isEditing && (
          <div className="flex items-center gap-2.5 mt-1.5">
            <button
              type="button"
              onClick={() => onStartReply(parentId, reply.author.displayName)}
              className="notion-comment-action text-[11px]"
            >
              <CornerDownRightIcon className="size-2.5" />
              {t("tasks.reply", "Trả lời")}
            </button>
            {canModify && (
              <>
                <button
                  type="button"
                  onClick={() => onStartEdit(reply.id, reply.content)}
                  className="notion-comment-action text-[11px]"
                >
                  <PencilIcon className="size-2.5" />
                  {t("tasks.edit", "Sửa")}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(reply.id)}
                  className="notion-comment-action text-[11px] text-[var(--notion-red)]"
                >
                  <Trash2Icon className="size-2.5" />
                  {t("tasks.delete", "Xóa")}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface EditModeProps {
  content: string
  onChange: (content: string) => void
  onSave: () => void
  onCancel: () => void
  isSaving: boolean
  t: (key: string, options?: Record<string, unknown>) => string
  compact?: boolean
}

function EditMode({ content, onChange, onSave, onCancel, isSaving, t, compact }: EditModeProps) {
  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className="notion-input resize-none text-[13px] min-h-[60px]"
        autoFocus
        rows={compact ? 2 : 3}
      />
      <div className="flex items-center gap-2 justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="notion-btn-secondary h-7 text-[11px] px-3"
        >
          {t("tasks.cancel", "Hủy")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={!content.trim() || isSaving}
          className="notion-btn-primary h-7 text-[11px] px-3"
        >
          {isSaving ? t("tasks.saving", "Đang lưu...") : t("tasks.save", "Lưu")}
        </Button>
      </div>
    </div>
  )
}

interface ReplyModeProps {
  content: string
  onChange: (content: string) => void
  onSubmit: () => void
  isSending: boolean
  t: (key: string, options?: Record<string, unknown>) => string
  members: Member[]
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  isFocused: boolean
  onFocus: () => void
  onBlur: () => void
}

function ReplyMode({
  content,
  onChange,
  onSubmit,
  isSending,
  t,
  members,
  textareaRef,
  isFocused,
  onFocus,
  onBlur,
}: ReplyModeProps) {
  const showActions = isFocused || content.trim() !== ""

  return (
    <div className="notion-reply-input mt-2 flex flex-col gap-2 rounded-md border border-[var(--notion-border)] p-3 bg-[var(--notion-muted)]/30 transition-colors focus-within:bg-[var(--notion-muted)]/50 focus-within:border-[var(--notion-accent)]">
      <MentionInput
        value={content}
        onChange={onChange}
        onSubmit={onSubmit}
        members={members}
        placeholder={t("tasks.replyPlaceholder", "Viết câu trả lời...")}
        disabled={isSending}
        isSubmitting={isSending}
        minRows={1}
        className="w-full"
        textareaRef={textareaRef}
        autoFocus={false}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {showActions && (
        <div className="flex items-center gap-2 justify-end mt-1 animate-in fade-in duration-200">
          {content.trim() !== "" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange("")}
              className="notion-btn-secondary h-6 text-[11px] px-2.5"
            >
              {t("tasks.clear", "Xóa")}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={onSubmit}
            disabled={!content.trim() || isSending}
            className="notion-btn-primary h-6 text-[11px] px-2.5"
          >
            {isSending ? t("tasks.sending", "Đang gửi...") : t("tasks.reply", "Trả lời")}
          </Button>
        </div>
      )}
    </div>
  )
}