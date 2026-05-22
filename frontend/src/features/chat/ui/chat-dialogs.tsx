import { useTranslation } from "react-i18next"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog"

import type { ChatMessage } from "../lib/chat-utils"

interface ChatDialogsProps {
  pinConfirmOpen: boolean
  setPinConfirmOpen: (open: boolean) => void
  unpinConfirmOpen: boolean
  setUnpinConfirmOpen: (open: boolean) => void
  recallConfirmOpen: boolean
  setRecallConfirmOpen: (open: boolean) => void
  deleteConfirmOpen: boolean
  setDeleteConfirmOpen: (open: boolean) => void
  handlePinConfirm: () => void
  handleUnpinConfirm: () => void
  handleRecallConfirm: () => void
  handleDeleteConfirm: () => void
  setSelectedMessage: (message: ChatMessage | null) => void
}

export function ChatDialogs({
  pinConfirmOpen,
  setPinConfirmOpen,
  unpinConfirmOpen,
  setUnpinConfirmOpen,
  recallConfirmOpen,
  setRecallConfirmOpen,
  deleteConfirmOpen,
  setDeleteConfirmOpen,
  handlePinConfirm,
  handleUnpinConfirm,
  handleRecallConfirm,
  handleDeleteConfirm,
  setSelectedMessage,
}: ChatDialogsProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* Pin confirmation dialog — notify vs silent */}
      <AlertDialog open={pinConfirmOpen} onOpenChange={setPinConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chat.pinDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("chat.pinDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2">
            <AlertDialogCancel
              onClick={() => {
                setPinConfirmOpen(false)
                setSelectedMessage(null)
              }}
            >
              {t("profileEdit.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handlePinConfirm}>
              {t("chat.pinAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unpin confirmation dialog */}
      <AlertDialog open={unpinConfirmOpen} onOpenChange={setUnpinConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chat.unpinDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("chat.unpinDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2">
            <AlertDialogCancel
              onClick={() => {
                setUnpinConfirmOpen(false)
                setSelectedMessage(null)
              }}
            >
              {t("profileEdit.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleUnpinConfirm}
            >
              {t("chat.unpinAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recall confirmation dialog */}
      <AlertDialog open={recallConfirmOpen} onOpenChange={setRecallConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chat.recallDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("chat.recallDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2">
            <AlertDialogCancel
              onClick={() => {
                setRecallConfirmOpen(false)
                setSelectedMessage(null)
              }}
            >
              {t("profileEdit.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleRecallConfirm}
            >
              {t("chat.recallAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chat.deleteDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("chat.deleteDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2">
            <AlertDialogCancel
              onClick={() => {
                setDeleteConfirmOpen(false)
                setSelectedMessage(null)
              }}
            >
              {t("profileEdit.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              {t("chat.deleteAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
