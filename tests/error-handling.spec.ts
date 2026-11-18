import { type APIRequestContext, expect, test } from "@playwright/test"
import { firstSuperuser, firstSuperuserPassword } from "./config.ts"
import { randomEmail, randomPassword } from "./utils/random"
import { createUser, logInUser } from "./utils/user"

const api = process.env.VITE_API_URL

const login = (request: APIRequestContext, email: string, password: string) =>
  request.post(`${api}/api/v1/login/access-token`, {
    form: { username: email, password },
  })

async function tokenFor(
  request: APIRequestContext,
  email: string,
  password: string,
) {
  const response = await login(request, email, password)
  expect(response.ok()).toBeTruthy()
  return (await response.json()).access_token as string
}

async function adminToken(request: APIRequestContext) {
  return tokenFor(request, firstSuperuser, firstSuperuserPassword)
}

test.describe("API error contract", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("invalid credentials return 400 with the documented detail", async ({
    request,
  }) => {
    const response = await login(request, firstSuperuser, "wrong-password")

    expect(response.status()).toBe(400)
    expect(await response.json()).toEqual({
      detail: "Incorrect email or password",
    })
  })

  test("missing credentials return 401", async ({ request }) => {
    const response = await request.get(`${api}/api/v1/users/me`)

    expect(response.status()).toBe(401)
  })

  test("invalid token returns 401 Could not validate credentials", async ({
    request,
  }) => {
    const response = await request.get(`${api}/api/v1/users/me`, {
      headers: { Authorization: "Bearer invalid_token" },
    })

    expect(response.status()).toBe(401)
    expect(response.headers()["www-authenticate"]).toBe("Bearer")
    expect(await response.json()).toEqual({
      detail: "Could not validate credentials",
    })
  })

  test("non-superusers cannot list users", async ({ request }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password })
    const token = await tokenFor(request, email, password)

    const response = await request.get(`${api}/api/v1/users/`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(response.status()).toBe(403)
    expect(await response.json()).toEqual({
      detail: "The user doesn't have enough privileges",
    })
  })

  test("accessing another user's item returns 403", async ({ request }) => {
    const ownerEmail = randomEmail()
    const ownerPassword = randomPassword()
    await createUser({ email: ownerEmail, password: ownerPassword })
    const ownerToken = await tokenFor(request, ownerEmail, ownerPassword)

    const otherEmail = randomEmail()
    const otherPassword = randomPassword()
    await createUser({ email: otherEmail, password: otherPassword })
    const otherToken = await tokenFor(request, otherEmail, otherPassword)

    const createResponse = await request.post(`${api}/api/v1/items/`, {
      headers: { Authorization: `Bearer ${ownerToken}` },
      data: { title: "Owned item" },
    })
    expect(createResponse.ok()).toBeTruthy()
    const item = await createResponse.json()

    const response = await request.get(`${api}/api/v1/items/${item.id}`, {
      headers: { Authorization: `Bearer ${otherToken}` },
    })

    expect(response.status()).toBe(403)
    expect(await response.json()).toEqual({
      detail: "Not enough permissions",
    })
  })

  test("a missing item returns 404", async ({ request }) => {
    const token = await adminToken(request)

    const response = await request.get(
      `${api}/api/v1/items/00000000-0000-0000-0000-000000000000`,
      { headers: { Authorization: `Bearer ${token}` } },
    )

    expect(response.status()).toBe(404)
    expect(await response.json()).toEqual({ detail: "Item not found" })
  })

  test("signing up with an existing email returns 400", async ({ request }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password })

    const response = await request.post(`${api}/api/v1/users/signup`, {
      data: { email, password, full_name: "Test User" },
    })

    expect(response.status()).toBe(400)
    expect(await response.json()).toEqual({
      detail: "The user with this email already exists in the system",
    })
  })

  test("updating a user to an existing email returns 409", async ({
    request,
  }) => {
    const token = await adminToken(request)
    const first = await createUser({
      email: randomEmail(),
      password: randomPassword(),
    })
    const second = await createUser({
      email: randomEmail(),
      password: randomPassword(),
    })

    const response = await request.patch(`${api}/api/v1/users/${second.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { email: first.email },
    })

    expect(response.status()).toBe(409)
    expect(await response.json()).toEqual({
      detail: "User with this email already exists",
    })
  })

  test("reusing the current password returns 400", async ({ request }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password })
    const token = await tokenFor(request, email, password)

    const response = await request.patch(`${api}/api/v1/users/me/password`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { current_password: password, new_password: password },
    })

    expect(response.status()).toBe(400)
    expect(await response.json()).toEqual({
      detail: "New password cannot be the same as the current one",
    })
  })

  test("validation errors keep the 422 detail array", async ({ request }) => {
    const response = await request.post(`${api}/api/v1/users/signup`, {
      data: { email: randomEmail(), password: "short" },
    })

    expect(response.status()).toBe(422)
    const body = await response.json()
    expect(Array.isArray(body.detail)).toBe(true)
    expect(body.detail[0].msg).toContain("at least 8 characters")
  })
})

test.describe("error handling UI", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("a permission-denied 403 shows the detail and keeps the session", async ({
    page,
  }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password })
    await logInUser(page, email, password)

    await page.route(/\/api\/v1\/items\/.*/, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Not enough permissions" }),
        })
        return
      }
      await route.continue()
    })

    await page.goto("/items")
    await page.getByRole("button", { name: "Add Item" }).click()
    await page.getByLabel("Title").fill("Denied item")
    await page.getByRole("button", { name: "Save" }).click()

    await expect(page.getByText("Not enough permissions")).toBeVisible()
    await expect(page).toHaveURL(/\/items/)
    expect(
      await page.evaluate(() => localStorage.getItem("access_token")),
    ).not.toBeNull()
  })

  test("a 409 conflict shows the detail and keeps the session", async ({
    page,
  }) => {
    const email = randomEmail()
    const password = randomPassword()
    const otherEmail = randomEmail()
    await createUser({ email, password })
    await createUser({ email: otherEmail, password: randomPassword() })
    await logInUser(page, email, password)

    await page.goto("/settings")
    await page.getByRole("tab", { name: "My profile" }).click()
    await page.getByRole("button", { name: "Edit" }).click()
    await page.getByLabel("Email").fill(otherEmail)
    await page.getByRole("button", { name: "Save" }).click()

    await expect(
      page.getByText("User with this email already exists"),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/settings/)
    expect(
      await page.evaluate(() => localStorage.getItem("access_token")),
    ).not.toBeNull()
  })

  test("a wrong current password shows the detail and keeps the session", async ({
    page,
  }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password })
    await logInUser(page, email, password)

    await page.goto("/settings")
    await page.getByRole("tab", { name: "Password" }).click()
    await page.getByTestId("current-password-input").fill("wrong-password")
    await page.getByTestId("new-password-input").fill("new-password-123")
    await page.getByTestId("confirm-password-input").fill("new-password-123")
    await page.getByRole("button", { name: "Update Password" }).click()

    await expect(page.getByText("Incorrect password")).toBeVisible()
    await expect(page).toHaveURL(/\/settings/)
    expect(
      await page.evaluate(() => localStorage.getItem("access_token")),
    ).not.toBeNull()
  })

  test("a 422 validation response shows the first detail message", async ({
    page,
  }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password })
    await logInUser(page, email, password)

    await page.route(/\/api\/v1\/users\/me$/, async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 422,
          contentType: "application/json",
          body: JSON.stringify({
            detail: [
              {
                loc: ["body", "email"],
                msg: "value is not a valid email address",
                type: "value_error",
              },
            ],
          }),
        })
        return
      }
      await route.continue()
    })

    await page.goto("/settings")
    await page.getByRole("tab", { name: "My profile" }).click()
    await page.getByRole("button", { name: "Edit" }).click()
    await page.getByLabel("Email").fill(randomEmail())
    await page.getByRole("button", { name: "Save" }).click()

    await expect(
      page.getByText("value is not a valid email address"),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/settings/)
  })

  test("a 503 availability error shows the detail and keeps the session", async ({
    page,
  }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password })
    await logInUser(page, email, password)

    await page.route(/\/api\/v1\/items\/.*/, async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Service temporarily unavailable" }),
        })
        return
      }
      await route.continue()
    })

    await page.goto("/items")
    await page.getByRole("button", { name: "Add Item" }).click()
    await page.getByLabel("Title").fill("Unavailable item")
    await page.getByRole("button", { name: "Save" }).click()

    await expect(
      page.getByText("Service temporarily unavailable"),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/items/)
    expect(
      await page.evaluate(() => localStorage.getItem("access_token")),
    ).not.toBeNull()
  })

  test("an inactive login shows the error and stays on the login page", async ({
    page,
    request,
  }) => {
    const email = randomEmail()
    const password = randomPassword()
    const user = await createUser({ email, password })
    const token = await adminToken(request)

    const deactivate = await request.patch(`${api}/api/v1/users/${user.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { is_active: false },
    })
    expect(deactivate.ok()).toBeTruthy()

    await page.goto("/login")
    await page.getByTestId("email-input").fill(email)
    await page.getByTestId("password-input").fill(password)
    await page.getByRole("button", { name: "Log In" }).click()

    await expect(page.getByText("Inactive user")).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
    expect(
      await page.evaluate(() => localStorage.getItem("access_token")),
    ).toBeNull()
  })
})

test.describe("admin error handling", () => {
  test("a duplicate email shows the backend detail and keeps the session", async ({
    page,
  }) => {
    await page.goto("/admin")

    const password = randomPassword()
    await page.getByRole("button", { name: "Add User" }).click()
    await page.getByPlaceholder("Email").fill(firstSuperuser)
    await page.getByPlaceholder("Password").first().fill(password)
    await page.getByPlaceholder("Password").last().fill(password)
    await page.getByRole("button", { name: "Save" }).click()

    await expect(
      page.getByText("The user with this email already exists in the system"),
    ).toBeVisible()
    await expect(page).toHaveURL(/\/admin/)
    expect(
      await page.evaluate(() => localStorage.getItem("access_token")),
    ).not.toBeNull()
  })
})
