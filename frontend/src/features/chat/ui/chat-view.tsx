import * as React from "react"
import { LoaderIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import {
  useDisbandGroup,
  useLeaveGroup,
} from "@/shared/api/features/conversation/hooks"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog"
import { Button } from "@/shared/ui/button"
import { EditGroupDialog } from "@/shared/ui/edit-group-dialog"
import { UserProfileDialog } from "@/shared/ui/user-profile-dialog"

import { useChat } from "../lib/use-chat"

import { ChatDialogs } from "./chat-dialogs"
import { ChatHeader } from "./chat-header"
import { ChatInputPanel } from "./chat-input-panel"
import { ChatMessages } from "./chat-messages"
import { ChatPinBanner } from "./chat-pin-banner"
import { ChatRightSidebar } from "./chat-right-sidebar"

export function ChatView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    friend,
    isLoading,
    targetUserId,
    messages,
    pins,
    currentPin,
    activePinIndex,
    setActivePinIndex,
    input,
    setInput,
    handleInputChange,
    handleKeyDown,
    handleSend,
    replyDraft,
    setReplyDraft,
    isOtherUserTyping,
    scrollRef,
    messageRefs,
    highlightedMessageId,
    scrollToMessage,
    handleScrollToBottom,
    scrollHintMode,
    pinConfirmOpen,
    setPinConfirmOpen,
    unpinConfirmOpen,
    setUnpinConfirmOpen,
    recallConfirmOpen,
    setRecallConfirmOpen,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    setSelectedMessage,
    handlePinConfirm,
    handleUnpinConfirm,
    handleRecallConfirm,
    handleDeleteConfirm,
    otherMemberLastReadId,
    getSenderName,
    currentUserId,
    isFetchingNextPage,
    activeConversation,
  } = useChat()

  const [sidebarOpen, setSidebarOpen] = React.useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("chat-sidebar-open") === "true"
    }
    return false
  })

  const [selectedUserProfile, setSelectedUserProfile] = React.useState<{
    userId: number
    displayName: string
    avatar: string | null
    role?: string
    joinedAt?: string
  } | null>(null)

  const [leaveConfirmOpen, setLeaveConfirmOpen] = React.useState(false)
  const [editGroupOpen, setEditGroupOpen] = React.useState(false)
  const [disbandConfirmOpen, setDisbandConfirmOpen] = React.useState(false)
  const leaveGroupMutation = useLeaveGroup()
  const disbandGroupMutation = useDisbandGroup()

  const handleToggleSidebar = React.useCallback(() => {
    setSidebarOpen((prev) => {
      const newVal = !prev
      localStorage.setItem("chat-sidebar-open", String(newVal))
      return newVal
    })
  }, [])

  const handleLeaveGroup = async () => {
    if (!activeConversation) return
    try {
      await leaveGroupMutation.mutateAsync(activeConversation.conversation.id)
      toast.success(t("leaveGroup.success"))
      setLeaveConfirmOpen(false)
      setSidebarOpen(false)
      navigate("/")
    } catch (err: unknown) {
      console.error(err)
      toast.error(t("leaveGroup.error"))
    }
  }

  const handleDisbandGroup = async () => {
    if (!activeConversation) return
    try {
      await disbandGroupMutation.mutateAsync(activeConversation.conversation.id)
      toast.success(t("disbandGroup.success"))
      setDisbandConfirmOpen(false)
      setSidebarOpen(false)
      navigate("/")
    } catch (err: unknown) {
      console.error(err)
      toast.error(t("disbandGroup.error"))
    }
  }

  if (!targetUserId) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white dark:bg-zinc-950">
        <span className="rounded-full bg-muted/65 px-4 py-1.5 text-center text-[11px] font-medium text-muted-foreground shadow-xs select-none">
          {t("chat.selectChat", "Select a chat to start messaging")}
        </span>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-row bg-background">
      <div className="flex min-w-0 flex-1 flex-col border-r">
        <ChatHeader
          friend={friend}
          targetUserId={targetUserId}
          isOtherUserTyping={isOtherUserTyping}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={handleToggleSidebar}
        />

        <ChatPinBanner
          pins={pins}
          currentPin={currentPin}
          activePinIndex={activePinIndex}
          setActivePinIndex={setActivePinIndex}
          scrollToMessage={scrollToMessage}
          setUnpinConfirmOpen={setUnpinConfirmOpen}
          messages={messages}
        />

        <ChatMessages
          isLoading={isLoading}
          messages={messages}
          currentUserId={currentUserId}
          otherMemberLastReadId={otherMemberLastReadId}
          scrollRef={scrollRef}
          activeConversation={activeConversation}
          messageRefs={messageRefs}
          scrollToMessage={scrollToMessage}
          setReplyDraft={setReplyDraft}
          setSelectedMessage={setSelectedMessage}
          setPinConfirmOpen={setPinConfirmOpen}
          setUnpinConfirmOpen={setUnpinConfirmOpen}
          setRecallConfirmOpen={setRecallConfirmOpen}
          setDeleteConfirmOpen={setDeleteConfirmOpen}
          pins={pins}
          highlightedMessageId={highlightedMessageId}
          scrollHintMode={scrollHintMode}
          handleScrollToBottom={handleScrollToBottom}
          isFetchingNextPage={isFetchingNextPage}
        />

        <ChatInputPanel
          input={input}
          setInput={setInput}
          handleInputChange={handleInputChange}
          handleKeyDown={handleKeyDown}
          handleSend={handleSend}
          isOtherUserTyping={isOtherUserTyping}
          friend={friend}
          replyDraft={replyDraft}
          setReplyDraft={setReplyDraft}
          scrollToMessage={scrollToMessage}
          getSenderName={getSenderName}
          activeConversation={activeConversation}
          currentUserId={currentUserId}
        />
      </div>

      {sidebarOpen && (
        <ChatRightSidebar
          friend={friend}
          activeConversation={activeConversation}
          currentUserId={currentUserId}
          onClose={handleToggleSidebar}
          onViewProfile={setSelectedUserProfile}
          onLeaveGroup={() => setLeaveConfirmOpen(true)}
          onEditGroup={() => setEditGroupOpen(true)}
          onDisbandGroup={() => setDisbandConfirmOpen(true)}
        />
      )}

      <ChatDialogs
        pinConfirmOpen={pinConfirmOpen}
        setPinConfirmOpen={setPinConfirmOpen}
        unpinConfirmOpen={unpinConfirmOpen}
        setUnpinConfirmOpen={setUnpinConfirmOpen}
        recallConfirmOpen={recallConfirmOpen}
        setRecallConfirmOpen={setRecallConfirmOpen}
        deleteConfirmOpen={deleteConfirmOpen}
        setDeleteConfirmOpen={setDeleteConfirmOpen}
        handlePinConfirm={handlePinConfirm}
        handleUnpinConfirm={handleUnpinConfirm}
        handleRecallConfirm={handleRecallConfirm}
        handleDeleteConfirm={handleDeleteConfirm}
        setSelectedMessage={setSelectedMessage}
      />

      <UserProfileDialog
        key={selectedUserProfile?.userId ?? "none"}
        user={selectedUserProfile}
        onClose={() => setSelectedUserProfile(null)}
      />

      <EditGroupDialog
        key={
          editGroupOpen
            ? `open-${activeConversation?.conversation?.id}`
            : "closed"
        }
        open={editGroupOpen}
        onOpenChange={setEditGroupOpen}
        activeConversation={activeConversation}
        currentUserId={currentUserId}
      />

      <AlertDialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <AlertDialogContent className="max-w-md gap-5">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("leaveGroup.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("leaveGroup.confirmText")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              onClick={() => setLeaveConfirmOpen(false)}
              disabled={leaveGroupMutation.isPending}
            >
              {t("leaveGroup.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleLeaveGroup}
              disabled={leaveGroupMutation.isPending}
              className="min-w-[100px] gap-1.5"
            >
              {leaveGroupMutation.isPending && (
                <LoaderIcon className="size-4 animate-spin" />
              )}
              {leaveGroupMutation.isPending
                ? t("leaveGroup.leaving")
                : t("leaveGroup.leave")}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={disbandConfirmOpen}
        onOpenChange={setDisbandConfirmOpen}
      >
        <AlertDialogContent className="max-w-md gap-5">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("disbandGroup.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("disbandGroup.confirmText")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              onClick={() => setDisbandConfirmOpen(false)}
              disabled={disbandGroupMutation.isPending}
            >
              {t("disbandGroup.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisbandGroup}
              disabled={disbandGroupMutation.isPending}
              className="min-w-[100px] gap-1.5"
            >
              {disbandGroupMutation.isPending && (
                <LoaderIcon className="size-4 animate-spin" />
              )}
              {disbandGroupMutation.isPending
                ? t("disbandGroup.disbanding")
                : t("disbandGroup.disband")}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default ChatView
