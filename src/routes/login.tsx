import { zodResolver } from "@hookform/resolvers/zod"
import {
  createFileRoute,
  Link as RouterLink,
  redirect,
} from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type { Body_login_login_access_token as AccessToken } from "@/client"
import { AuthLayout } from "@/components/Common/AuthLayout"
import GoogleSignInButton from "@/components/Common/GoogleSignInButton"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import useAuthConfig from "@/hooks/useAuthConfig"

const formSchema = z.object({
  username: z.email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .min(8, { message: "Password must be at least 8 characters" }),
}) satisfies z.ZodType<AccessToken>

type FormData = z.infer<typeof formSchema>

const searchSchema = z.object({
  google_error: z.string().optional(),
})

const googleErrorMessage = (reason: string) => {
  switch (reason) {
    case "denied":
      return "Google sign-in was cancelled."
    case "not_allowed":
      return "This Google account is not allowed to sign in."
    case "inactive":
      return "This account is inactive."
    case "conflict":
      return "This Google account is already linked to another user."
    default:
      return "Google sign-in failed. Please try again."
  }
}

export const Route = createFileRoute("/login")({
  component: Login,
  validateSearch: searchSchema,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
  head: () => ({
    meta: [
      {
        title: "Log In - FastAPI Template",
      },
    ],
  }),
})

function Login() {
  const { loginMutation } = useAuth()
  const authConfig = useAuthConfig()
  const { google_error: googleError } = Route.useSearch()
  const passwordLogin = authConfig.data?.password_login ?? false
  const googleLogin = authConfig.data?.google_login ?? false

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      username: "",
      password: "",
    },
  })

  const onSubmit = (data: FormData) => {
    if (loginMutation.isPending) return
    loginMutation.mutate(data)
  }

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
        </div>

        {authConfig.isPending ? (
          <p className="text-center text-sm text-muted-foreground">
            Loading sign-in options…
          </p>
        ) : authConfig.isError ? (
          <p className="text-center text-sm text-destructive">
            Could not load sign-in options. Please refresh.
          </p>
        ) : (
          <>
            {googleError ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
                {googleErrorMessage(googleError)}
              </p>
            ) : null}

            {googleLogin ? <GoogleSignInButton /> : null}

            {googleLogin && passwordLogin ? (
              <div className="relative text-center text-xs uppercase text-muted-foreground">
                <span className="relative bg-background px-2">or</span>
              </div>
            ) : null}

            {passwordLogin ? (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="flex flex-col gap-6"
                >
                  <div className="grid gap-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              data-testid="email-input"
                              placeholder="user@example.com"
                              type="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <PasswordInput
                              data-testid="password-input"
                              placeholder="Password"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <LoadingButton
                      type="submit"
                      loading={loginMutation.isPending}
                    >
                      Log In
                    </LoadingButton>
                  </div>

                  <div className="text-center text-sm">
                    Don't have an account yet?{" "}
                    <RouterLink
                      to="/signup"
                      className="underline underline-offset-4"
                    >
                      Sign up
                    </RouterLink>
                  </div>
                </form>
              </Form>
            ) : null}

            {!googleLogin && !passwordLogin ? (
              <p className="text-center text-sm text-muted-foreground">
                No sign-in methods are configured for this deployment.
              </p>
            ) : null}
          </>
        )}
      </div>
    </AuthLayout>
  )
}
