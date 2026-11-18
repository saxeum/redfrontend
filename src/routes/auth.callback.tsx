import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"

import { AuthLayout } from "@/components/Common/AuthLayout"

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
  head: () => ({
    meta: [
      {
        title: "Signing in - FastAPI Template",
      },
    ],
  }),
})

function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""))
    const token = params.get("access_token")

    if (!token) {
      navigate({
        to: "/login",
        search: { google_error: "failed" },
        replace: true,
      })
      return
    }

    localStorage.setItem("access_token", token)
    window.history.replaceState(null, "", window.location.pathname)
    navigate({ to: "/", replace: true })
  }, [navigate])

  return (
    <AuthLayout>
      <p className="text-center text-sm text-muted-foreground">
        Signing you in…
      </p>
    </AuthLayout>
  )
}
