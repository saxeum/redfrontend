import { expect, test } from "@playwright/test"

const api = process.env.VITE_API_URL

const googleUser = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "google@example.com",
  full_name: "Google User",
  is_active: true,
  is_superuser: false,
  has_password: false,
  created_at: new Date().toISOString(),
}

const stubConfig = (config: {
  password_login: boolean
  google_login: boolean
  google_client_id?: string | null
}) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify({
    google_client_id: config.google_login ? "test-client" : null,
    ...config,
  }),
})

test.describe("Google sign-in", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("renders Google only when it is the configured method", async ({
    page,
  }) => {
    await page.route("**/api/v1/utils/config", (route) =>
      route.fulfill(stubConfig({ password_login: false, google_login: true })),
    )

    await page.goto("/login")

    await expect(page.getByTestId("google-signin")).toBeVisible()
    await expect(page.getByTestId("email-input")).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Sign up" })).toHaveCount(0)
  })

  test("renders the password form when Google is not configured", async ({
    page,
  }) => {
    await page.route("**/api/v1/utils/config", (route) =>
      route.fulfill(stubConfig({ password_login: true, google_login: false })),
    )

    await page.goto("/login")

    await expect(page.getByTestId("email-input")).toBeVisible()
    await expect(page.getByTestId("password-input")).toBeVisible()
    await expect(page.getByTestId("google-signin")).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible()
  })

  test("explains when no sign-in methods are configured", async ({ page }) => {
    await page.route("**/api/v1/utils/config", (route) =>
      route.fulfill(stubConfig({ password_login: false, google_login: false })),
    )

    await page.goto("/login")

    await expect(
      page.getByText("No sign-in methods are configured for this deployment."),
    ).toBeVisible()
  })

  test("starts the redirect flow and completes the callback", async ({
    page,
  }) => {
    await page.route("**/api/v1/utils/config", (route) =>
      route.fulfill(stubConfig({ password_login: false, google_login: true })),
    )
    await page.route("**/api/v1/auth/google/start", (route) =>
      route.fulfill({
        status: 302,
        headers: {
          location: new URL(
            "/auth/callback#access_token=stub-id-token",
            page.url(),
          ).toString(),
        },
      }),
    )
    await page.route("**/api/v1/users/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(googleUser),
      }),
    )

    await page.goto("/login")
    await page.getByTestId("google-signin").click()

    await expect(page).toHaveURL("/")
    await expect(
      page.getByText("Welcome back, nice to see you again!"),
    ).toBeVisible()
    expect(
      await page.evaluate(() => localStorage.getItem("access_token")),
    ).toBe("stub-id-token")
  })

  test("rejects a callback without a token", async ({ page }) => {
    await page.route("**/api/v1/utils/config", (route) =>
      route.fulfill(stubConfig({ password_login: false, google_login: true })),
    )

    await page.goto("/auth/callback")

    await expect(page).toHaveURL(/\/login\?google_error=failed/)
    await expect(
      page.getByText("Google sign-in failed. Please try again."),
    ).toBeVisible()
  })

  test("shows the backend's Google error reason", async ({ page }) => {
    await page.route("**/api/v1/utils/config", (route) =>
      route.fulfill(stubConfig({ password_login: false, google_login: true })),
    )

    await page.goto("/login?google_error=not_allowed")

    await expect(
      page.getByText("This Google account is not allowed to sign in."),
    ).toBeVisible()
  })

  test("password-less accounts do not see the password tab", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "stub-id-token")
    })
    await page.route("**/api/v1/users/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(googleUser),
      }),
    )

    await page.goto("/settings")

    await expect(page.getByRole("tab", { name: "My profile" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Danger zone" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Password" })).toHaveCount(0)
  })

  test("the signup page explains disabled password sign-up", async ({
    page,
  }) => {
    await page.route("**/api/v1/utils/config", (route) =>
      route.fulfill(stubConfig({ password_login: false, google_login: true })),
    )

    await page.goto("/signup")

    await expect(
      page.getByText(
        "Password sign-up is disabled. Please use Google sign-in.",
      ),
    ).toBeVisible()
    await expect(page.getByTestId("email-input")).toHaveCount(0)
  })

  test("the API still rejects an invalid Google ID token", async ({
    request,
  }) => {
    const response = await request.post(`${api}/api/v1/auth/google`, {
      data: { id_token: "not-a-google-token" },
    })

    expect(response.status()).toBe(401)
    expect(await response.json()).toEqual({
      detail: "Could not validate credentials",
    })
  })
})
