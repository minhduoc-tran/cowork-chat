import "@/index.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { hydrateAuthSession } from "@/features/auth"

import { TooltipProvider } from "@/shared/ui/tooltip.tsx"

import { QueryProvider } from "./providers/query-provider.tsx"
import { ThemeProvider } from "./providers/theme-provider.tsx"
import App from "./app.tsx"

hydrateAuthSession()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryProvider>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </QueryProvider>
    </ThemeProvider>
  </StrictMode>
)
