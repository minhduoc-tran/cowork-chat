import { useState } from "react"
import { Mail } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { useLogin } from "@/shared/api"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Separator } from "@/shared/ui/separator"

import { GoogleIcon } from "./google-icon"

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const loginMutation = useLogin()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    await loginMutation.mutateAsync({ email, password })
    navigate("/")
  }

  return (
    <div className="grid min-h-dvh w-full grid-cols-1 overflow-x-hidden lg:h-dvh lg:grid-cols-2 lg:overflow-hidden">
      {/* Left side - Slogan */}
      <div className="relative hidden min-w-0 overflow-hidden bg-[#0f172a] lg:flex lg:flex-col lg:justify-center lg:p-12">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Cộng tác làm việc nhóm dễ dàng
          </div>
          <h1 className="text-5xl leading-tight font-bold text-white">
            Kết nối với
            <br />
            <span className="text-cyan-400">đồng nghiệp mọi nơi</span>
          </h1>
          <p className="max-w-md text-lg text-slate-400">
            CoworkChat quy tụ đội ngũ của bạn với tin nhắn thời gian thực, cuộc
            gọi video và chia sẻ tệp liền mạch. Được xây dựng cho các đội nhóm
            hiện đại.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            {[
              { label: "Thời gian thực", icon: "⚡" },
              { label: "Bảo mật", icon: "🔒" },
              { label: "Nhanh chóng", icon: "🚀" },
            ].map(({ label, icon }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white backdrop-blur-sm"
              >
                <span>{icon}</span>
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Decorative elements */}
        <div className="pointer-events-none absolute right-0 bottom-0 left-0 h-1/2 bg-linear-to-t from-indigo-600/20 to-transparent" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full border border-white/5" />
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full border border-white/5" />
      </div>

      {/* Right side - Form */}
      <div className="flex min-w-0 flex-col justify-start px-6 py-8 sm:px-8 sm:py-10 lg:min-h-0 lg:justify-center lg:overflow-y-auto lg:px-16 lg:py-12">
        <div className="mx-auto w-full max-w-sm space-y-6 sm:space-y-8">
          {/* Mobile logo */}
          <div className="flex flex-col items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f172a] text-cyan-400">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.956 3 15.026 3 14c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <span className="text-xl font-semibold text-foreground">
              CoworkChat
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Chào mừng trở lại
            </h2>
            <p className="text-sm text-muted-foreground">
              Nhập thông tin đăng nhập để truy cập tài khoản
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@cong-ty.com"
                  className="pl-10"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Mật khẩu
                </Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pr-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.255.949m-3.592 2.223A9.953 9.953 0 013 12c0-4.478 4.03-8 9-8s9 3.582 9 8a9.953 9.953 0 01-2.235 5.314m-4.243-2.223a3 3 0 00-4.243 4.243"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full">
              Đăng nhập
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Hoặc tiếp tục với
              </span>
            </div>
          </div>

          <Button variant="outline" className="w-full gap-2">
            <GoogleIcon className="h-4 w-4" />
            Đăng nhập với Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{" "}
            <Link
              to="/register"
              className="font-medium text-primary hover:underline"
            >
              Đăng ký
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
