import { createBrowserRouter, Navigate } from "react-router-dom"

import { LoginPage, RegisterPage } from "@/features/auth"
import { HomeScreen } from "@/features/home"

import { ProtectedRoute } from "./protected-route"
import { PublicRoute } from "./public-route"

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <HomeScreen />
      </ProtectedRoute>
    ),
  },
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
    element: <Navigate to="/" replace />,
  },
])
