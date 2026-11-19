import { expect, test } from "@playwright/test"
import { randomEmail, randomPassword } from "./utils/random"
import { createUser, logInUser } from "./utils/user"

const listPattern = /\/api\/v1\/mail\/messages(\?.*)?$/
const detailPattern = /\/api\/v1\/mail\/messages\/[^/?]+(\?.*)?$/
const pollPattern = /\/api\/v1\/mail\/poll(\?.*)?$/

const messages = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    mailbox: "support@example.com",
    remote_id: "remote-1",
    thread_id: "thread-1",
    from_address: "alice@example.com",
    subject: "Need help with my order",
    snippet: "My order has not arrived yet.",
    received_at: "2026-11-18T10:00:00Z",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    mailbox: "support@example.com",
    remote_id: "remote-2",
    thread_id: "thread-2",
    from_address: "bob@example.com",
    subject: null,
    snippet: "Following up on the invoice.",
    received_at: "2026-11-17T09:30:00Z",
  },
]

test.describe("Mailbox", () => {
  test("lists messages and opens the full body", async ({ page }) => {
    await page.route(listPattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: messages, count: messages.length }),
      }),
    )
    await page.route(detailPattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...messages[0],
          body: "Full message body.\nSecond line.",
        }),
      }),
    )

    await page.goto("/mail")

    await expect(page.getByRole("heading", { name: "Mailbox" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Mailbox" })).toBeVisible()
    await expect(page.getByText("alice@example.com")).toBeVisible()
    await expect(page.getByText("Need help with my order")).toBeVisible()
    await expect(page.getByText("(no subject)")).toBeVisible()

    await page.getByRole("button", { name: "View" }).first().click()

    await expect(page.getByText("Full message body.")).toBeVisible()
    await expect(page.getByText("Second line.")).toBeVisible()
  })

  test("refreshes the mailbox and reloads the list", async ({ page }) => {
    let listCalls = 0
    await page.route(listPattern, async (route) => {
      listCalls += 1
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: messages, count: messages.length }),
      })
    })
    await page.route(pollPattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          mailbox: "support@example.com",
          mode: "incremental",
          listed: 1,
          stored: 1,
          skipped: 0,
          cursor: "cursor-2",
        }),
      }),
    )

    await page.goto("/mail")
    await expect(page.getByText("alice@example.com")).toBeVisible()
    expect(listCalls).toBe(1)

    await page.getByRole("button", { name: "Refresh" }).click()

    await expect(
      page.getByText("Mailbox refreshed (incremental): 1 stored, 0 skipped"),
    ).toBeVisible()
    await expect.poll(() => listCalls).toBeGreaterThanOrEqual(2)
  })

  test("shows the empty state", async ({ page }) => {
    await page.route(listPattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], count: 0 }),
      }),
    )

    await page.goto("/mail")

    await expect(page.getByText("No messages yet")).toBeVisible()
    await expect(
      page.getByText("Use Refresh to poll the customer service inbox."),
    ).toBeVisible()
  })

  test("surfaces a mailbox configuration error", async ({ page }) => {
    await page.route(listPattern, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], count: 0 }),
      }),
    )
    await page.route(pollPattern, (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Mail is not configured" }),
      }),
    )

    await page.goto("/mail")
    await page.getByRole("button", { name: "Refresh" }).click()

    await expect(page.getByText("Mail is not configured")).toBeVisible()
    await expect(page).toHaveURL(/\/mail/)
  })
})

test.describe("Mailbox access control", () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test("non-superusers cannot open the mailbox", async ({ page }) => {
    const email = randomEmail()
    const password = randomPassword()
    await createUser({ email, password })
    await logInUser(page, email, password)

    await page.goto("/mail")

    await expect(page).toHaveURL("/")
    await expect(page.getByRole("heading", { name: "Mailbox" })).toHaveCount(0)
    await expect(page.getByRole("link", { name: "Mailbox" })).toHaveCount(0)
  })
})
