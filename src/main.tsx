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
  if (status === 401 || status === 403) return true

  // A validly-signed token can outlive its user (e.g. after a database reset).
  // The API answers `/users/me` with 404 "User not found" in that case.
  return status === 404 && (error.config?.url ?? "").includes("/users/me")
}

const handleApiError = (error: Error) => {
  if (!isSessionError(error)) return

  localStorage.removeItem("access_token")
  window.location.href = "/login"
}

const shouldRetry = (failureCount: number, error: Error) =>
  !isSessionError(error) && failureCount < 3

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
