import { createRootRoute, HeadContent, Outlet } from "@tanstack/react-router"
import { lazy, Suspense } from "react"

import ErrorComponent from "@/components/Common/ErrorComponent"
import NotFound from "@/components/Common/NotFound"

// Built only in development. The `lazy()` call itself sits inside the branch
// Vite folds away, so a production bundle holds neither the devtools components
// nor the dynamic imports that would pull them in.
const Devtools = import.meta.env.DEV
  ? lazy(() =>
      Promise.all([
        import("@tanstack/react-query-devtools"),
        import("@tanstack/react-router-devtools"),
      ]).then(([query, router]) => ({
        default: () => (
          <>
            <router.TanStackRouterDevtools position="bottom-right" />
            <query.ReactQueryDevtools initialIsOpen={false} />
          </>
        ),
      })),
    )
  : null

function RootComponent() {
  return (
    <>
      <HeadContent />
      <Outlet />
      {Devtools ? (
        <Suspense fallback={null}>
          <Devtools />
        </Suspense>
      ) : null}
    </>
  )
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => <NotFound />,
  errorComponent: () => <ErrorComponent />,
})
