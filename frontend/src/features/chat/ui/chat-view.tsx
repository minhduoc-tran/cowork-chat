import * as React from "react"
import { LoaderIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { useTasks } from "@/shared/api"
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/ui/sheet"
import { UserProfileDialog } from "@/shared/ui/user-profile-dialog"

import { useChat } from "../lib/use-chat"

import { ChatDialogs } from "./chat-dialogs"
import { ChatHeader } from "./chat-header"
import { ChatInputPanel } from "./chat-input-panel"
import { ChatMessages } from "./chat-messages"
import { ChatPinBanner } from "./chat-pin-banner"
import { ChatRightSidebar } from "./chat-right-sidebar"
import { TaskBoardView } from "./task-board-view"

export function ChatView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
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
    taskMentions,
    setTaskMentions,
  } = useChat()

  const [tasksOpen, setTasksOpen] = React.useState(false)
  const [pendingOpenTaskId, setPendingOpenTaskId] = React.useState<
    number | null
  >(null)

  const activeConversationId = activeConversation?.conversation?.id ?? null
  const isGroup = activeConversation?.conversation?.type === "group"
  const { data: tasks = [] } = useTasks(isGroup ? activeConversationId : null)

  const handleTaskClick = React.useCallback((taskId: number) => {
    setPendingOpenTaskId(taskId)
    setTasksOpen(true)
  }, [])

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

  // Close tasks sheet when switching conversation
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTasksOpen(false)
  }, [targetUserId])

  // Open the task sheet when navigated here with a ?task=<id> param
  // (e.g. from a notification). Clear the param after consuming it.
  React.useEffect(() => {
    const taskParam = searchParams.get("task")
    if (!taskParam) return

    const taskId = Number(taskParam)
    if (!Number.isNaN(taskId)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingOpenTaskId(taskId)
       
      setTasksOpen(true)
    }

    const next = new URLSearchParams(searchParams)
    next.delete("task")
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

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
          onOpenTasks={() => setTasksOpen(true)}
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
          onTaskClick={handleTaskClick}
          tasks={tasks}
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
          taskMentions={taskMentions}
          setTaskMentions={setTaskMentions}
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

      <Sheet open={tasksOpen} onOpenChange={setTasksOpen}>
        <SheetContent
          side="right"
          className="flex h-full !w-full flex-col border-l bg-background p-0 sm:!max-w-full"
          showCloseButton={true}
        >
          <SheetHeader className="flex shrink-0 flex-row items-center justify-between border-b px-6 py-4">
            <SheetTitle className="text-base font-semibold">
              {t("tasks.management", "Quản lý công việc")}
            </SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-hidden">
            <TaskBoardView
              conversationId={activeConversation?.conversation?.id ?? null}
              isGroup={activeConversation?.conversation?.type === "group"}
              conversationMembers={activeConversation?.members ?? []}
              currentUserId={currentUserId}
              requestedTaskId={pendingOpenTaskId}
              onClearRequestedTaskId={() => setPendingOpenTaskId(null)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default ChatView
