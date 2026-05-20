import "@/index.css"
import "@/shared/lib/i18n"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { hydrateAuthSession } from "@/features/auth"

import { TooltipProvider } from "@/shared/ui/tooltip.tsx"

import { QueryProvider } from "./providers/query-provider.tsx"
import { SocketProvider } from "./providers/socket-provider.tsx"
import { ThemeProvider } from "./providers/theme-provider.tsx"
import App from "./app.tsx"

hydrateAuthSession()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryProvider>
        <SocketProvider>
          <TooltipProvider>
            <App />
          </TooltipProvider>
        </SocketProvider>
      </QueryProvider>
    </ThemeProvider>
  </StrictMode>
)
