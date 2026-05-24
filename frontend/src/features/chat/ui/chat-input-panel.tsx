import * as React from "react"
import data from "@emoji-mart/data"
import Picker from "@emoji-mart/react"
import { ReplyIcon, SendIcon, SmileIcon, XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { ConversationListItem, ConversationMember } from "@/shared/api"
import { cn } from "@/shared/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Button } from "@/shared/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"

import type { ChatMessage } from "../lib/chat-utils"
import { getMessagePreview } from "../lib/chat-utils"

interface ChatInputPanelProps {
  input: string
  setInput: React.Dispatch<React.SetStateAction<string>>
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleKeyDown: (e: React.KeyboardEvent) => void
  handleSend: () => void
  isOtherUserTyping: boolean | string
  friend?: {
    displayName?: string
  }
  replyDraft: ChatMessage | null
  setReplyDraft: (message: ChatMessage | null) => void
  scrollToMessage: (messageId: number) => void
  getSenderName: (message: ChatMessage) => string
  activeConversation?: ConversationListItem | null
  currentUserId?: number
}

export function ChatInputPanel({
  input,
  setInput,
  handleInputChange,
  handleKeyDown,
  handleSend,
  isOtherUserTyping,
  friend,
  replyDraft,
  setReplyDraft,
  scrollToMessage,
  getSenderName,
  activeConversation,
  currentUserId,
}: ChatInputPanelProps) {
  const { t } = useTranslation()
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  // Mentions / tagging state
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [suggestions, setSuggestions] = React.useState<ConversationMember[]>([])
  const [activeSuggestionIndex, setActiveSuggestionIndex] = React.useState(0)
  const [tagTriggerIndex, setTagTriggerIndex] = React.useState(-1)

  const isGroup = activeConversation?.conversation?.type === "group"

  const getTagSearch = React.useCallback(
    (text: string, selectionStart: number | null) => {
      if (selectionStart === null)
        return { active: false, search: "", index: -1 }
      const textBeforeCursor = text.slice(0, selectionStart)
      const lastAtIndex = textBeforeCursor.lastIndexOf("@")
      if (lastAtIndex === -1) return { active: false, search: "", index: -1 }

      // Check if @ is preceded by a space or is at the start of the string
      const charBeforeAt =
        lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ""
      if (charBeforeAt !== "" && charBeforeAt !== " ") {
        return { active: false, search: "", index: -1 }
      }

      // Check if there is any space between @ and cursor. If yes, tag search is inactive
      const textBetweenAtAndCursor = textBeforeCursor.slice(lastAtIndex + 1)
      if (textBetweenAtAndCursor.includes(" ")) {
        return { active: false, search: "", index: -1 }
      }

      return {
        active: true,
        search: textBetweenAtAndCursor,
        index: lastAtIndex,
      }
    },
    []
  )

  const selectSuggestion = React.useCallback(
    (member: ConversationMember) => {
      const text = input
      const triggerIndex = tagTriggerIndex
      const caret = inputRef.current?.selectionStart ?? text.length

      const before = text.slice(0, triggerIndex)
      const after = text.slice(caret)
      const newText = before + `@${member.displayName} ` + after

      setInput(newText)
      setShowSuggestions(false)
      setSuggestions([])
      setTagTriggerIndex(-1)

      // Restore focus and cursor position
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          const newCursorPos = triggerIndex + member.displayName.length + 2 // @ + space
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos)
        }
      }, 0)
    },
    [input, setInput, tagTriggerIndex]
  )

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange(e)

    const value = e.target.value
    const caret = e.target.selectionStart ?? 0

    const searchResult = getTagSearch(value, caret)
    if (searchResult.active && isGroup && activeConversation?.members) {
      const search = searchResult.search
      const index = searchResult.index

      const otherMembers = activeConversation.members.filter(
        (m) => m.userId !== currentUserId
      )
      const filtered = otherMembers.filter((m) =>
        m.displayName.toLowerCase().includes(search.toLowerCase())
      )

      setSuggestions(filtered)
      setTagTriggerIndex(index)
      setActiveSuggestionIndex(0)
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
      setSuggestions([])
      setTagTriggerIndex(-1)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveSuggestionIndex((prev) => (prev + 1) % suggestions.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveSuggestionIndex(
          (prev) => (prev - 1 + suggestions.length) % suggestions.length
        )
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        selectSuggestion(suggestions[activeSuggestionIndex])
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        setShowSuggestions(false)
        return
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      setShowSuggestions(false)
      setSuggestions([])
      setTagTriggerIndex(-1)
    }

    handleKeyDown(e)
  }

  const onSendClick = () => {
    handleSend()
    setShowSuggestions(false)
    setSuggestions([])
    setTagTriggerIndex(-1)
  }

  // Reset suggestions when switching conversations
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowSuggestions(false)
    setSuggestions([])
    setTagTriggerIndex(-1)
  }, [activeConversation?.conversation?.id])

  // Handle clicking outside to hide suggestions
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div className={cn("relative shrink-0", !isOtherUserTyping && "border-t")}>
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full left-4 z-50 mb-2 max-h-48 w-64 overflow-y-auto rounded-xl border border-border/40 bg-popover/85 p-1 text-popover-foreground shadow-xl backdrop-blur-md dark:bg-muted/80">
          <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            {t("chat.tagMembers", "Tag members")}
          </div>
          {suggestions.map((member, i) => (
            <button
              key={member.id}
              type="button"
              onClick={() => selectSuggestion(member)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                i === activeSuggestionIndex
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Avatar className="h-6 w-6 shrink-0 rounded-full">
                <AvatarImage
                  src={member.avatar ?? undefined}
                  alt={member.displayName}
                />
                <AvatarFallback
                  className={cn(
                    "shrink-0 rounded-full text-[10px] font-medium",
                    i === activeSuggestionIndex
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {member.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate font-medium">{member.displayName}</span>
            </button>
          ))}
        </div>
      )}

      {isOtherUserTyping && (
        <div className="animate-in animate-pulse px-4 pt-2.5 pb-0.5 text-xs font-semibold text-primary duration-200 fade-in">
          {typeof isOtherUserTyping === "string"
            ? t("chat.typing", { name: isOtherUserTyping })
            : t("chat.typing", { name: friend?.displayName })}
        </div>
      )}
      {replyDraft && (
        <div
          className={cn(
            "flex items-start gap-3 border-b bg-muted/35 px-3 py-2",
            isOtherUserTyping && "border-t"
          )}
        >
          <button
            type="button"
            onClick={() => scrollToMessage(replyDraft.id)}
            className="min-w-0 flex-1 rounded-md border-l-2 border-primary/60 px-3 py-1.5 text-left transition-colors hover:bg-background/80"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <ReplyIcon className="size-3.5" />
              {t("chat.replyingTo", { name: getSenderName(replyDraft) })}
            </div>
            <div className="truncate pt-0.5 text-sm text-foreground">
              {getMessagePreview(
                replyDraft.content,
                t("chat.messageUnavailable")
              )}
            </div>
          </button>
          <button
            type="button"
            onClick={() => setReplyDraft(null)}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            aria-label="Cancel reply"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      )}
      {/* Message input */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2.5",
          isOtherUserTyping && !replyDraft && "border-t"
        )}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={onInputChange}
          onKeyDown={onKeyDown}
          placeholder={t("chat.inputPlaceholder")}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded text-muted-foreground transition-all outline-none hover:text-foreground active:scale-95"
              aria-label="Emoji"
            >
              <SmileIcon className="size-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            sideOffset={8}
            className="w-auto border-none bg-transparent p-0 shadow-none ring-0 focus:outline-none"
          >
            <div className="overflow-hidden rounded-[28px] border border-border/50 bg-background shadow-2xl ring-1 ring-black/5">
              <Picker
                data={data}
                skinTonePosition="preview"
                previewPosition="none"
                perLine={9}
                maxFrequentRows={1}
                onEmojiSelect={(emoji: { native?: string }) => {
                  if (typeof emoji?.native === "string") {
                    setInput((prev) => prev + emoji.native)
                  }
                }}
              />
            </div>
          </PopoverContent>
        </Popover>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
          onClick={onSendClick}
          disabled={!input.trim()}
        >
          <SendIcon className="size-5 text-primary" />
        </Button>
      </div>
    </div>
  )
}
