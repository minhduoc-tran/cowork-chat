import * as React from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Placeholder from "@tiptap/extension-placeholder"
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading1, Heading2, RemoveFormatting, Quote } from "lucide-react"

import { cn } from "@/shared/lib/utils"

interface RichTextEditorProps {
  value: string // HTML string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  onBlur?: () => void
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  onBlur
}: RichTextEditorProps) {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder: placeholder || "Thêm mô tả...",
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    onTransaction: () => {
      forceUpdate()
    },
    editorProps: {
      attributes: {
        class: cn(
          "min-h-[120px] w-full p-3 rounded-md border border-[var(--notion-border)] bg-[var(--notion-card)] text-[var(--notion-text)] text-sm outline-none focus:border-[var(--notion-accent)] focus:ring-1 focus:ring-[var(--notion-accent)] overflow-y-auto leading-relaxed focus:prose-headings:text-[var(--notion-text)] tiptap notion-editor-content",
          disabled && "cursor-not-allowed opacity-60",
          className
        ),
      },
      handleDOMEvents: {
        blur: () => {
          if (onBlur) onBlur()
          return false
        }
      }
    }
  })

  // Synchronize dynamic updates to value from outside (e.g. when task changes)
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  // Synchronize disabled state
  React.useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [disabled, editor])

  if (!editor) {
    return null
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {!disabled && (
        <div className="flex items-center gap-0.5 p-1 bg-[var(--notion-muted)] border border-[var(--notion-border)] rounded-md select-none flex-wrap w-full">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              editor.chain().focus().toggleBold().run()
            }}
            className={cn(
              "p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--notion-text)] cursor-pointer transition-colors",
              editor.isActive("bold") && "bg-black/10 dark:bg-white/10"
            )}
            title="In đậm (Ctrl+B)"
          >
            <Bold className="size-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              editor.chain().focus().toggleItalic().run()
            }}
            className={cn(
              "p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--notion-text)] cursor-pointer transition-colors",
              editor.isActive("italic") && "bg-black/10 dark:bg-white/10"
            )}
            title="In nghiêng (Ctrl+I)"
          >
            <Italic className="size-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              editor.chain().focus().toggleUnderline().run()
            }}
            className={cn(
              "p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--notion-text)] cursor-pointer transition-colors",
              editor.isActive("underline") && "bg-black/10 dark:bg-white/10"
            )}
            title="Gạch chân (Ctrl+U)"
          >
            <UnderlineIcon className="size-3.5" />
          </button>
          <span className="w-[1px] h-4 bg-[var(--notion-border)] mx-1" />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              editor.chain().focus().toggleBulletList().run()
            }}
            className={cn(
              "p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--notion-text)] cursor-pointer transition-colors",
              editor.isActive("bulletList") && "bg-black/10 dark:bg-white/10"
            )}
            title="Danh sách dấu chấm"
          >
            <List className="size-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              editor.chain().focus().toggleOrderedList().run()
            }}
            className={cn(
              "p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--notion-text)] cursor-pointer transition-colors",
              editor.isActive("orderedList") && "bg-black/10 dark:bg-white/10"
            )}
            title="Danh sách số"
          >
            <ListOrdered className="size-3.5" />
          </button>
          <span className="w-[1px] h-4 bg-[var(--notion-border)] mx-1" />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }}
            className={cn(
              "p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--notion-text)] cursor-pointer transition-colors",
              editor.isActive("heading", { level: 1 }) && "bg-black/10 dark:bg-white/10"
            )}
            title="Tiêu đề 1"
          >
            <Heading1 className="size-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }}
            className={cn(
              "p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--notion-text)] cursor-pointer transition-colors",
              editor.isActive("heading", { level: 2 }) && "bg-black/10 dark:bg-white/10"
            )}
            title="Tiêu đề 2"
          >
            <Heading2 className="size-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              editor.chain().focus().toggleBlockquote().run()
            }}
            className={cn(
              "p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--notion-text)] cursor-pointer transition-colors",
              editor.isActive("blockquote") && "bg-black/10 dark:bg-white/10"
            )}
            title="Trích dẫn"
          >
            <Quote className="size-3.5" />
          </button>
          <span className="w-[1px] h-4 bg-[var(--notion-border)] mx-1" />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              editor.chain().focus().unsetAllMarks().clearNodes().run()
            }}
            className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-[var(--notion-text)] cursor-pointer transition-colors"
            title="Xóa định dạng"
          >
            <RemoveFormatting className="size-3.5" />
          </button>
        </div>
      )}
      <EditorContent editor={editor} className="w-full" />
    </div>
  )
}
