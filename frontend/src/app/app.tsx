import { RouterProvider } from "react-router-dom"

import { Toaster } from "@/shared/ui/sonner"

import { router } from "./router/routes"

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  )
}

export default App
