import { expect, test } from "@playwright/test"
import { firstSuperuser, firstSuperuserPassword } from "./config.ts"
import { randomEmail, randomPassword } from "./utils/random"
import { createUser } from "./utils/user"

test.use({ storageState: { cookies: [], origins: [] } })

test("Redirects to /login when the token's user no longer exists", async ({
  page,
  request,
}) => {
  const email = randomEmail()
  const password = randomPassword()
  const user = await createUser({ email, password })

  const loginResponse = await request.post(
    `${process.env.VITE_API_URL}/api/v1/login/access-token`,
    { form: { username: email, password } },
  )
  const { access_token: staleToken } = await loginResponse.json()

  const adminLoginResponse = await request.post(
    `${process.env.VITE_API_URL}/api/v1/login/access-token`,
    { form: { username: firstSuperuser, password: firstSuperuserPassword } },
  )
  const { access_token: adminToken } = await adminLoginResponse.json()

  await request.delete(`${process.env.VITE_API_URL}/api/v1/users/${user.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  })

  await page.goto("/login")
  await page.evaluate((token) => {
    localStorage.setItem("access_token", token)
  }, staleToken)

  await page.goto("/items")

  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByTestId("email-input")).toBeVisible()
})
