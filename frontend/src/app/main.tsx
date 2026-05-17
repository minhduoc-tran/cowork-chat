import "@/index.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { ThemeProvider } from "./providers/theme-provider.tsx"
import App from "./app.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
)
