import { CameraIcon, PenLineIcon, XIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useAuthStore } from "@/features/auth"

import {
  AlertDialogAction,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"

export function ProfileViewMode({
  onEdit,
  onClose,
}: {
  onEdit: () => void
  onClose: () => void
}) {
  const user = useAuthStore((state) => state.user)
  const { t } = useTranslation()

  if (!user) return null

  const initials = user.displayName
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")

  const genderLabel =
    user.gender === "male"
      ? t("profile.genderMale")
      : user.gender === "female"
        ? t("profile.genderFemale")
        : user.gender
          ? user.gender
          : null

  const formattedDob = user.dateOfBirth
    ? new Date(user.dateOfBirth).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null

  return (
    <>
      <AlertDialogHeader className="flex flex-row items-center justify-between px-4 py-3">
        <AlertDialogTitle className="text-base">
          {t("profile.title")}
        </AlertDialogTitle>
        <AlertDialogDescription className="sr-only">
          {t("profile.description")}
        </AlertDialogDescription>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
          aria-label={t("profile.close")}
        >
          <XIcon className="size-4" />
        </button>
      </AlertDialogHeader>

      {/* Cover photo */}
      <div className="relative h-36 w-full bg-linear-to-br from-primary/20 to-primary/5">
        {user.coverPhoto && (
          <img
            src={user.coverPhoto}
            alt="Cover"
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* Avatar + Name */}
      <div className="relative px-4 pb-4">
        <div className="-mt-10 flex items-end gap-3">
          <div className="relative">
            <Avatar className="h-16 w-16 rounded-full border-4 border-background">
              <AvatarImage
                src={user.avatar ?? undefined}
                alt={user.displayName}
              />
              <AvatarFallback className="rounded-full text-lg">
                {initials || user.email.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              className="absolute -right-0.5 -bottom-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-muted-foreground hover:bg-accent"
              aria-label={t("profile.changeAvatar")}
            >
              <CameraIcon className="size-3" />
            </button>
          </div>
          <h3 className="pb-1 text-lg font-semibold">{user.displayName}</h3>
        </div>
      </div>

      {/* Thông tin cá nhân */}
      <div className="space-y-1 border-t px-4 py-4">
        <h4 className="mb-3 text-sm font-semibold">
          {t("profile.personalInfo")}
        </h4>
        <div className="grid grid-cols-[5.5rem_1fr] gap-y-3 text-sm">
          <span className="text-muted-foreground">{t("profile.bio")}</span>
          <span>{user.bio || t("profile.notSet")}</span>
          <span className="text-muted-foreground">{t("profile.gender")}</span>
          <span>{genderLabel || t("profile.notSet")}</span>
          <span className="text-muted-foreground">
            {t("profile.dateOfBirth")}
          </span>
          <span>{formattedDob || t("profile.notSet")}</span>
          <span className="text-muted-foreground">{t("profile.phone")}</span>
          <span>{user.phone || t("profile.notSet")}</span>
          <span className="text-muted-foreground">{t("profile.email")}</span>
          <span>{user.email}</span>
        </div>
      </div>

      <AlertDialogFooter className="border-t px-4 py-3">
        <AlertDialogAction
          variant={"outline"}
          className="mx-auto w-full gap-2"
          onClick={(e) => {
            e.preventDefault()
            onEdit()
          }}
        >
          <PenLineIcon className="size-4" />
          {t("profile.update")}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  )
}
