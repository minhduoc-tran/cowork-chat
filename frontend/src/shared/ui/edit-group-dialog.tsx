import * as React from "react"
import { LoaderIcon, SettingsIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import type { ConversationListItem } from "@/shared/api"
import { useUpdateGroup } from "@/shared/api/features/conversation/hooks"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog"
import { Button } from "@/shared/ui/button"

interface EditGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeConversation: ConversationListItem | null
  currentUserId: number
}

export function EditGroupDialog({
  open,
  onOpenChange,
  activeConversation,
}: EditGroupDialogProps) {
  const { t } = useTranslation()
  const [groupName, setGroupName] = React.useState(
    () => activeConversation?.conversation.name ?? ""
  )

  const updateGroupMutation = useUpdateGroup()

  // Reset state when dialog closes
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setGroupName("")
    }
    onOpenChange(nextOpen)
  }

  const handleUpdateGroup = async () => {
    if (!activeConversation) return

    const trimmedName = groupName.trim()
    if (!trimmedName) {
      toast.error(t("editGroup.nameRequired"))
      return
    }

    try {
      await updateGroupMutation.mutateAsync({
        conversationId: activeConversation.conversation.id,
        name: trimmedName,
      })

      toast.success(t("editGroup.success"))
      handleOpenChange(false)
    } catch (err: unknown) {
      console.error(err)
      const errorMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : null
      toast.error(errorMsg || t("editGroup.error"))
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md gap-5">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <SettingsIcon className="size-4 text-primary" />
            {t("editGroup.title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            {t("editGroup.title")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4">
          {/* Group Name input */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="edit-group-name"
              className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            >
              {t("editGroup.groupName")}
            </label>
            <input
              id="edit-group-name"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t("editGroup.groupNamePlaceholder")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-all duration-200 outline-none focus:border-ring focus:ring-2 focus:ring-ring"
              disabled={updateGroupMutation.isPending}
              autoFocus
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2.5">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={updateGroupMutation.isPending}
            className="px-4"
          >
            {t("editGroup.cancel")}
          </Button>
          <Button
            onClick={handleUpdateGroup}
            disabled={updateGroupMutation.isPending || !groupName.trim()}
            className="min-w-[100px] gap-1.5 px-4 shadow-sm"
          >
            {updateGroupMutation.isPending && (
              <LoaderIcon className="size-4 animate-spin" />
            )}
            {updateGroupMutation.isPending
              ? t("editGroup.saving")
              : t("editGroup.save")}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
