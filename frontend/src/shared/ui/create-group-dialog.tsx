import * as React from "react"
import { CheckIcon,LoaderIcon, SearchIcon, UsersIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { useCreateGroup } from "@/shared/api/features/conversation/hooks"
import { useFriends } from "@/shared/api/features/friend/hooks"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar"
import { Button } from "@/shared/ui/button"

export function CreateGroupDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [groupName, setGroupName] = React.useState("")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedFriendIds, setSelectedFriendIds] = React.useState<number[]>([])

  const { data: friendsData, isLoading: isLoadingFriends } = useFriends()
  const createGroupMutation = useCreateGroup()

  // Reset state when dialog closes
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setGroupName("")
      setSearchQuery("")
      setSelectedFriendIds([])
    }
    onOpenChange(nextOpen)
  }

  // Filter friends list based on search query
  const filteredFriends = React.useMemo(() => {
    if (!friendsData?.friends) return []
    const query = searchQuery.trim().toLowerCase()
    if (!query) return friendsData.friends

    return friendsData.friends.filter((item) =>
      item.friend.displayName.toLowerCase().includes(query) ||
      item.friend.email.toLowerCase().includes(query)
    )
  }, [friendsData, searchQuery])

  const handleToggleFriend = (friendId: number) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    )
  }

  const handleCreateGroup = async () => {
    const trimmedName = groupName.trim()
    if (!trimmedName) {
      toast.error(t("createGroup.nameRequired"))
      return
    }
    if (selectedFriendIds.length < 1) {
      toast.error(t("createGroup.minMembersError"))
      return
    }

    try {
      const result = await createGroupMutation.mutateAsync({
        name: trimmedName,
        memberIds: selectedFriendIds,
      })

      toast.success(t("createGroup.success"))
      handleOpenChange(false)

      if (result?.conversation?.id) {
        navigate(`/chat/${result.conversation.id}`)
      }
    } catch (err: unknown) {
      console.error(err)
      const errorMsg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(errorMsg || t("createGroup.error"))
    }
  }

  const hasFriends = friendsData?.friends && friendsData.friends.length > 0

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md gap-5">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <UsersIcon className="size-4 text-primary" />
            {t("createGroup.title")}
          </AlertDialogTitle>
          <AlertDialogDescription className="sr-only">
            {t("createGroup.title")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4">
          {/* Group Name input */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="group-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("createGroup.groupName")}
            </label>
            <input
              id="group-name"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder={t("createGroup.groupNamePlaceholder")}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all duration-200"
              disabled={createGroupMutation.isPending}
              autoFocus
            />
          </div>

          {/* Members Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("createGroup.selectFriends")} ({selectedFriendIds.length})
            </label>

            {hasFriends && (
              <div className="relative">
                <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("createGroup.selectFriendsPlaceholder")}
                  className="w-full rounded-md border border-input bg-background py-2 pr-3 pl-10 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all duration-200"
                  disabled={createGroupMutation.isPending}
                />
              </div>
            )}

            {/* Friends list container */}
            <div className="mt-1 max-h-[220px] min-h-[100px] overflow-y-auto rounded-lg border bg-muted/20 p-1 flex flex-col gap-0.5 custom-scrollbar">
              {isLoadingFriends ? (
                <div className="flex flex-1 items-center justify-center py-6 text-sm text-muted-foreground gap-2">
                  <LoaderIcon className="size-4 animate-spin text-primary" />
                  <span>Loading...</span>
                </div>
              ) : !hasFriends ? (
                <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground px-4 gap-1">
                  <UsersIcon className="size-8 text-muted-foreground/40 mb-1" />
                  <span>{t("createGroup.noFriendsToGroup")}</span>
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="flex flex-1 items-center justify-center py-8 text-sm text-muted-foreground">
                  {t("addFriend.notFound")}
                </div>
              ) : (
                filteredFriends.map((item) => {
                  const isSelected = selectedFriendIds.includes(item.friend.id)
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleToggleFriend(item.friend.id)}
                      disabled={createGroupMutation.isPending}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-all duration-150 outline-none
                        ${isSelected 
                          ? "bg-primary/10 text-primary hover:bg-primary/15" 
                          : "hover:bg-muted"
                        }
                      `}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-8 w-8 rounded-full">
                          <AvatarImage
                            src={item.friend.avatar ?? undefined}
                            alt={item.friend.displayName}
                          />
                          <AvatarFallback className="rounded-full text-xs">
                            {item.friend.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <CheckIcon className="size-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-foreground">
                          {item.friend.displayName}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {item.friend.email}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2.5">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={createGroupMutation.isPending}
            className="px-4"
          >
            {t("createGroup.cancel")}
          </Button>
          <Button
            onClick={handleCreateGroup}
            disabled={createGroupMutation.isPending || !groupName.trim() || selectedFriendIds.length < 1}
            className="min-w-[100px] gap-1.5 px-4 shadow-sm"
          >
            {createGroupMutation.isPending && (
              <LoaderIcon className="size-4 animate-spin" />
            )}
            {createGroupMutation.isPending
              ? t("createGroup.creating")
              : t("createGroup.create")}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
