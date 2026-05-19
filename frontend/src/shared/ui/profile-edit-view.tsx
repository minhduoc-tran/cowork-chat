import { ChevronLeftIcon, XIcon } from "lucide-react"
import { Controller, useForm } from "react-hook-form"

import { useAuthStore } from "@/features/auth"

import { useUpdateProfile } from "@/shared/api/features/user/hooks"
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog"

type ProfileFormData = {
  displayName: string
  bio: string
  gender: string
  day: string
  month: string
  year: string
  phone: string
}

export function ProfileEditView({
  onBack,
  onClose,
}: {
  onBack: () => void
  onClose: () => void
}) {
  const user = useAuthStore((state) => state.user)
  const updateProfile = useUpdateProfile()

  const { control, handleSubmit } = useForm<ProfileFormData>({
    defaultValues: {
      displayName: user?.displayName ?? "",
      bio: user?.bio ?? "",
      gender: user?.gender ?? "",
      day: user?.dateOfBirth
        ? String(new Date(user.dateOfBirth).getDate())
        : "",
      month: user?.dateOfBirth
        ? String(new Date(user.dateOfBirth).getMonth() + 1)
        : "",
      year: user?.dateOfBirth
        ? String(new Date(user.dateOfBirth).getFullYear())
        : "",
      phone: user?.phone ?? "",
    },
  })

  if (!user) return null

  const onSubmit = async (data: ProfileFormData) => {
    const dateOfBirth =
      data.day && data.month && data.year
        ? `${data.year}-${data.month.padStart(2, "0")}-${data.day.padStart(2, "0")}`
        : null

    await updateProfile.mutateAsync({
      displayName: data.displayName.trim() || user.displayName,
      bio: data.bio || null,
      gender: data.gender || null,
      dateOfBirth,
      phone: data.phone || null,
    })

    onBack()
  }

  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i)

  return (
    <>
      <AlertDialogHeader className="flex flex-row items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
          aria-label="Quay lại"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <AlertDialogTitle className="flex-1 text-base">
          Cập nhật thông tin cá nhân
        </AlertDialogTitle>
        <AlertDialogDescription className="sr-only">
          Cập nhật thông tin cá nhân
        </AlertDialogDescription>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
          aria-label="Đóng"
        >
          <XIcon className="size-4" />
        </button>
      </AlertDialogHeader>

      <form
        className="max-h-[60vh] space-y-5 overflow-y-auto px-4 py-4"
        onSubmit={handleSubmit(onSubmit)}
        id="profile-edit-form"
      >
        {/* Tên hiển thị */}
        <Controller
          name="displayName"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <label className="text-sm font-medium">Tên hiển thị</label>
              <input
                {...field}
                type="text"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        />

        {/* Bio */}
        <Controller
          name="bio"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <label className="text-sm font-medium">Bio</label>
              <input
                {...field}
                type="text"
                placeholder="Giới thiệu về bạn"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
        />

        {/* Thông tin cá nhân */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Thông tin cá nhân</h4>

          {/* Giới tính */}
          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Giới tính
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      value="male"
                      checked={field.value === "male"}
                      onChange={field.onChange}
                      className="h-4 w-4 accent-primary"
                    />
                    Nam
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      value="female"
                      checked={field.value === "female"}
                      onChange={field.onChange}
                      className="h-4 w-4 accent-primary"
                    />
                    Nữ
                  </label>
                </div>
              </div>
            )}
          />

          {/* Ngày sinh */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Ngày sinh</label>
            <div className="grid grid-cols-3 gap-2">
              <Controller
                name="day"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="rounded-md border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Ngày</option>
                    {days.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                )}
              />
              <Controller
                name="month"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="rounded-md border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Tháng</option>
                    {months.map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                )}
              />
              <Controller
                name="year"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="rounded-md border border-input bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Năm</option>
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          </div>

          {/* Điện thoại */}
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">
                  Điện thoại
                </label>
                <input
                  {...field}
                  type="tel"
                  placeholder="+84 xxx xxx xxx"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
          />
        </div>
      </form>

      <AlertDialogFooter className="flex flex-row justify-end gap-2 border-t px-4 py-3">
        <AlertDialogCancel onClick={onBack}>Hủy</AlertDialogCancel>
        <AlertDialogAction
          disabled={updateProfile.isPending}
          type="submit"
          form="profile-edit-form"
          onClick={(e) => {
            e.preventDefault()
            void handleSubmit(onSubmit)()
          }}
        >
          {updateProfile.isPending ? "Đang lưu..." : "Cập nhật"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  )
}
