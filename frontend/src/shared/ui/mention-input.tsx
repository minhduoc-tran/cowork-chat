import * as React from "react"

import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { cn } from "@/shared/lib/utils"

interface Member {
  userId: number
  displayName: string
  avatar: string | null
}

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  members: Member[]
  placeholder?: string
  disabled?: boolean
  isSubmitting?: boolean
  minRows?: number
  className?: string
  autoFocus?: boolean
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>
  onFocus?: () => void
  onBlur?: () => void
}

export function MentionInput({
  value,
  onChange,
  onSubmit,
  members,
  placeholder,
  disabled,
  isSubmitting,
  minRows = 2,
  className,
  autoFocus = true,
  textareaRef,
  onFocus,
  onBlur,
}: MentionInputProps) {
  const [showMentionDropdown, setShowMentionDropdown] = React.useState(false)
  const [mentionSearch, setMentionSearch] = React.useState("")
  const [mentionStartIndex, setMentionStartIndex] = React.useState(-1)
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const localRef = React.useRef<HTMLTextAreaElement>(null)
  const activeRef = textareaRef || localRef

  React.useEffect(() => {
    if (autoFocus && activeRef.current) {
      const timer = setTimeout(() => {
        if (activeRef.current) {
          activeRef.current.focus()
          const length = activeRef.current.value.length
          activeRef.current.setSelectionRange(length, length)
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [autoFocus])

  const filteredMembers = React.useMemo(() => {
    if (!mentionSearch) return members.slice(0, 5)
    const search = mentionSearch.toLowerCase()
    return members
      .filter((m) => m.displayName.toLowerCase().includes(search))
      .slice(0, 5)
  }, [members, mentionSearch])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    // Detect @ mentions
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = newValue.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
      // If no space after @, we're in a mention
      if (!textAfterAt.includes(" ") && lastAtIndex === cursorPos - textAfterAt.length - 1) {
        setMentionSearch(textAfterAt)
        setMentionStartIndex(lastAtIndex)
        setShowMentionDropdown(true)
        setSelectedIndex(0)
        return
      }
      // Check if we're typing a mention (text after @ but not complete yet)
      const textFromAt = textBeforeCursor.slice(lastAtIndex + 1)
      if (!textFromAt.includes(" ") && !textFromAt.includes("\n")) {
        setMentionSearch(textFromAt)
        setMentionStartIndex(lastAtIndex)
        setShowMentionDropdown(true)
        setSelectedIndex(0)
        return
      }
    }
    setShowMentionDropdown(false)
    setMentionSearch("")
    setMentionStartIndex(-1)
  }

  const insertMention = (member: Member) => {
    if (mentionStartIndex === -1) return

    const beforeMention = value.slice(0, mentionStartIndex)
    const afterCursor = value.slice(activeRef.current?.selectionStart ?? mentionStartIndex)
    const newValue = `${beforeMention}@${member.displayName} ${afterCursor}`

    onChange(newValue)
    setShowMentionDropdown(false)
    setMentionSearch("")
    setMentionStartIndex(-1)

    // Focus back to textarea
    setTimeout(() => {
      activeRef.current?.focus()
      const newCursorPos = beforeMention.length + member.displayName.length + 2
      activeRef.current?.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionDropdown && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredMembers.length)
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length)
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        insertMention(filteredMembers[selectedIndex])
        return
      }
      if (e.key === "Escape") {
        setShowMentionDropdown(false)
        return
      }
    }

    // Submit on Enter (without shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !isSubmitting) {
        onSubmit()
      }
    }
  }

  return (
    <div className={cn("relative", className)}>
      <textarea
        ref={activeRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        rows={minRows}
        className="notion-input resize-none text-[13px] min-h-[60px] w-full pr-10"
        autoFocus={autoFocus}
      />
      
      {showMentionDropdown && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-0 z-50 mb-2 max-h-48 w-64 overflow-y-auto rounded-xl border border-border/40 bg-popover/95 p-1 text-popover-foreground shadow-xl backdrop-blur-md dark:bg-muted/90">
          <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            Tag members
          </div>
          {filteredMembers.map((member, i) => (
            <button
              key={member.userId}
              type="button"
              onClick={() => insertMention(member)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                i === selectedIndex
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Avatar className="h-6 w-6 shrink-0 rounded-full">
                <AvatarImage src={member.avatar ?? undefined} alt={member.displayName} />
                <AvatarFallback
                  className={cn(
                    "shrink-0 rounded-full text-[10px] font-medium",
                    i === selectedIndex
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
    </div>
  )
}

/**
 * Parse comment content and return JSX with @mentions highlighted
 */
export function renderCommentWithMentions(
  content: string,
  members: Member[],
  currentUserId?: number
): React.ReactNode {
  if (!content) return content
  if (!members || members.length === 0) return content

  // Build regex to match exactly the members' display names (longest first to avoid partial matches)
  const sortedMembers = [...members].sort((a, b) => b.displayName.length - a.displayName.length)
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const namesPattern = sortedMembers.map(m => escapeRegex(m.displayName)).join("|")
  
  if (!namesPattern) return content

  // Match @ followed by one of the member names
  const mentionRegex = new RegExp(`@(${namesPattern})`, "gi")
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }

    const mentionedName = match[1]
    const member = members.find(
      (m) => m.displayName.toLowerCase() === mentionedName.toLowerCase()
    )

    if (member) {
      // Check if it's current user
      const isCurrentUser = currentUserId === member.userId
      parts.push(
        <span
          key={match.index}
          className={cn(
            "inline font-medium px-0.5",
            isCurrentUser
              ? "text-[var(--notion-blue)]"
              : "text-[var(--notion-accent)]"
          )}
        >
          @{member.displayName}
        </span>
      )
    } else {
      // Fallback
      parts.push(`@${mentionedName}`)
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  return parts.length > 0 ? parts : content
}