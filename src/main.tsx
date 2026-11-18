import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { AxiosError } from "axios"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { client } from "./client/client.gen"
import { ThemeProvider } from "./components/theme-provider"
import { Toaster } from "./components/ui/sonner"
import "./index.css"
import { routeTree } from "./routeTree.gen"

client.setConfig({
  baseURL: import.meta.env.VITE_API_URL ?? "",
  auth: () => localStorage.getItem("access_token") || "",
})

const isSessionError = (error: Error) => {
  if (!(error instanceof AxiosError)) return false

  const status = error.response?.status ?? 0
  const detail = (error.response?.data as { detail?: string } | undefined)
    ?.detail
  const url = error.config?.url ?? ""

  if (status === 401) return true

  // A validly-signed token can outlive its user (e.g. after a database reset).
  // The API answers `/users/me` with 404 "User not found" in that case.
  if (status === 404) return url.includes("/users/me")

  // 403 also covers legitimate authorization failures (item/user permissions).
  // Only an invalid token means the whole session is dead.
  if (status === 403) return detail === "Could not validate credentials"

  // An inactive user can still hold a valid token. Keep the login failure toast
  // intact by excluding the access-token request.
  if (status === 400 && detail === "Inactive user") {
    return !url.includes("/login/access-token")
  }

  return false
}

const handleApiError = (error: Error) => {
  if (!isSessionError(error)) return

  localStorage.removeItem("access_token")
  window.location.href = "/login"
}

// Client errors are deterministic; retrying them only delays the error toast.
const shouldRetry = (failureCount: number, error: Error) => {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 0
    if (status >= 400 && status < 500) return false
  }
  return failureCount < 3
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
    },
  },
  queryCache: new QueryCache({
    onError: handleApiError,
  }),
  mutationCache: new MutationCache({
    onError: handleApiError,
  }),
})

const router = createRouter({ routeTree })
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster richColors closeButton />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
