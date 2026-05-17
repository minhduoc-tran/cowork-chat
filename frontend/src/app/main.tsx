import "@/index.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./app.tsx"
import { ThemeProvider } from "./providers/theme-provider.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
)