import * as React from "react"
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
  handlePinConfirm: () => void
  handleUnpinConfirm: () => void
  setSelectedMessage: (message: ChatMessage | null) => void
}

export function ChatDialogs({
  pinConfirmOpen,
  setPinConfirmOpen,
  unpinConfirmOpen,
  setUnpinConfirmOpen,
  handlePinConfirm,
  handleUnpinConfirm,
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
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPinConfirmOpen(false)
              setSelectedMessage(null)
            }}>
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
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setUnpinConfirmOpen(false)
              setSelectedMessage(null)
            }}>
              {t("profileEdit.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleUnpinConfirm}>
              {t("chat.unpinAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
