export interface NavUserProfileInput {
  email: string
  displayName: string
  avatar: string | null
}

export interface NavUserProfile {
  name: string
  email: string
  avatar: string | null
  initials: string
}

export interface LogoutDialogModel {
  title: string
  description: string
  cancelLabel: string
  confirmLabel: string
  isBusy: boolean
}

export function buildNavUserProfile(
  user: NavUserProfileInput
): NavUserProfile {
  const trimmedName = user.displayName.trim()
  const name = trimmedName || user.email.split("@")[0] || user.email
  const initials = trimmedName
    ? name
        .split(/[\s._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("")
    : name.replace(/[\s._-]+/g, "").slice(0, 2).toUpperCase()

  return {
    name,
    email: user.email,
    avatar: user.avatar,
    initials: initials || user.email.slice(0, 2).toUpperCase(),
  }
}

export function getLogoutDialogModel(isBusy: boolean): LogoutDialogModel {
  return {
    title: "Đăng xuất khỏi tài khoản?",
    description: "Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng Cowork Chat.",
    cancelLabel: "Ở lại",
    confirmLabel: isBusy ? "Đang đăng xuất..." : "Đăng xuất",
    isBusy,
  }
}
