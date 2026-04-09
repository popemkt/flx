import { test, expect } from '@playwright/test'

test('adds a node from the command palette and reloads persisted state', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('workflow builder')).toBeVisible()

  await page.getByLabel('Open command palette').click()
  await page.getByTestId('command-palette-input').fill('Text Input')
  await page.getByRole('option', { name: /Text Input/i }).click()

  await expect(page.locator('[data-node-type="text-input"]')).toHaveCount(1)

  await page.waitForResponse((response) =>
    response.request().method() === 'PUT' && /\/api\/v1\/canvases\/.+\/state$/.test(response.url()),
  )

  await page.reload()
  await expect(page.locator('[data-node-type="text-input"]')).toHaveCount(1)
})
