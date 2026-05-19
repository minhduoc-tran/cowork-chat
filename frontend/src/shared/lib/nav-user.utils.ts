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

export function buildNavUserProfile(user: NavUserProfileInput): NavUserProfile {
  const trimmedName = user.displayName.trim()
  const name = trimmedName || user.email.split("@")[0] || user.email
  const initials = trimmedName
    ? name
        .split(/[\s._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("")
    : name
        .replace(/[\s._-]+/g, "")
        .slice(0, 2)
        .toUpperCase()

  return {
    name,
    email: user.email,
    avatar: user.avatar,
    initials: initials || user.email.slice(0, 2).toUpperCase(),
  }
}
