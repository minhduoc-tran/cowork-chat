import * as React from "react"

import { useAuthStore } from "@/features/auth"

import { AlertDialog, AlertDialogContent } from "@/shared/ui/alert-dialog"
import { ProfileEditView } from "@/shared/ui/profile-edit-view"
import { ProfileViewMode } from "@/shared/ui/profile-view-mode"

export function ProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const user = useAuthStore((state) => state.user)
  const [isEditing, setIsEditing] = React.useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setIsEditing(false)
    onOpenChange(nextOpen)
  }

  if (!user) return null

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-sm gap-0 overflow-hidden p-0">
        {isEditing ? (
          <ProfileEditView
            onBack={() => setIsEditing(false)}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <ProfileViewMode
            onEdit={() => setIsEditing(true)}
            onClose={() => onOpenChange(false)}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  )
}
