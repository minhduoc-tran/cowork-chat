import { createBrowserRouter, Navigate } from "react-router-dom"

import { LoginPage, RegisterPage } from "@/features/auth"
import { HomeScreen } from "@/features/home"

import { AppLayout } from "../layouts/app-layout"
import { ProtectedRoute } from "./protected-route"
import { PublicRoute } from "./public-route"

const menuRoutes = [
  { path: "/conversations", title: "Conversations" },
  { path: "/friends", title: "Friends" },
  { path: "/drafts", title: "Drafts" },
  { path: "/sent", title: "Sent" },
  { path: "/junk", title: "Junk" },
  { path: "/trash", title: "Trash" },
]

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/conversations" replace /> },
  ...menuRoutes.map(({ path }) => ({
    path,
    element: (
      <ProtectedRoute>
        <AppLayout>
          <HomeScreen />
        </AppLayout>
      </ProtectedRoute>
    ),
  })),
  {
    path: "/login",
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: "/register",
    element: (
      <PublicRoute>
        <RegisterPage />
      </PublicRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/conversations" replace />,
  },
])
