import { useTranslation } from "react-i18next"

export function HomeScreen() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center justify-center bg-white dark:bg-zinc-950">
      <span className="rounded-full bg-muted/65 px-4 py-1.5 text-center text-[11px] font-medium text-muted-foreground shadow-xs select-none">
        {t("chat.selectChat", "Select a chat to start messaging")}
      </span>
    </div>
  )
}

export default HomeScreen
