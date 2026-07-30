import { test, expect } from '@playwright/test'

test('demo asks hardware budget and highlights citation', async ({ page }) => {
  await page.goto('/demo?motion=off')
  await expect(page.getByTestId('chat-answer')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('citation-chip').first()).toBeVisible()
  await page.getByTestId('citation-chip').first().click()
  await expect(page.getByTestId('citation-highlight')).toBeVisible()
  await expect(page.getByTestId('citation-highlight')).toContainText('$1,500')
  await expect(page.getByTestId('citation-link')).toBeVisible()
})

test('upload markdown then ask', async ({ page }) => {
  await page.goto('/library?motion=off')
  const content = '# Extra Policy\n\nThe coffee stipend is $40 per month.\n'
  await page.getByTestId('upload-input').setInputFiles({
    name: 'coffee.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(content),
  })
  await page.locator('form.panel button[type="submit"]').click()
  await expect(page.getByTestId('upload-status')).toHaveText('ready', { timeout: 15_000 })
  await expect(page.getByRole('link', { name: /coffee/i })).toBeVisible()
  await page.goto('/chat?motion=off')
  await page.getByTestId('chat-input').fill('What is the coffee stipend?')
  await page.getByTestId('chat-ask').click()
  await expect(page.getByTestId('chat-answer')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByTestId('citation-chip').first()).toBeVisible()
  await expect(page.getByTestId('chat-answer')).toContainText('40')
})
