import { useTranslation } from "react-i18next"

import { useChat } from "../lib/use-chat"

import { ChatDialogs } from "./chat-dialogs"
import { ChatHeader } from "./chat-header"
import { ChatInputPanel } from "./chat-input-panel"
import { ChatMessages } from "./chat-messages"
import { ChatPinBanner } from "./chat-pin-banner"

export function ChatView() {
  const { t } = useTranslation()
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
  } = useChat()

  if (!targetUserId) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground">
        {t("chat.selectFriend")}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader
        friend={friend}
        targetUserId={targetUserId}
        isOtherUserTyping={isOtherUserTyping}
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
        handleInputChange={handleInputChange}
        handleKeyDown={handleKeyDown}
        handleSend={handleSend}
        isOtherUserTyping={isOtherUserTyping}
        friend={friend}
        replyDraft={replyDraft}
        setReplyDraft={setReplyDraft}
        scrollToMessage={scrollToMessage}
        getSenderName={getSenderName}
      />

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
    </div>
  )
}

export default ChatView
