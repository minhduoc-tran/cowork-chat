import "@/index.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { hydrateAuthSession } from "@/features/auth"

import { QueryProvider } from "./providers/query-provider.tsx"
import { ThemeProvider } from "./providers/theme-provider.tsx"
import App from "./app.tsx"

hydrateAuthSession()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <QueryProvider>
        <App />
      </QueryProvider>
    </ThemeProvider>
  </StrictMode>
)
