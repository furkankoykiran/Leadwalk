import { existsSync, readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// Google Maps needs the browser key (not available in CI): skip, don't fail.
function hasBrowserKey(): boolean {
  if (process.env.NUXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY) return true
  return existsSync('.env') && /^NUXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY=\S+/m.test(readFileSync('.env', 'utf8'))
}

test.describe('Map', () => {
  test.skip(!hasBrowserKey(), 'NUXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY is not set')

  test('loads Google Maps and switches the colour mode', async ({ page }) => {
    await page.goto('/map')
    const map = page.getByTestId('leads-map')
    // .gm-style is the root Google Maps renders once the API has loaded.
    await expect(map.locator('.gm-style')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('map-legend')).toContainText('Ziyaret edildi')
    await page.getByTestId('color-score').click()
    await expect(page.getByTestId('map-legend')).toContainText('Sıcak')
    await expect(page.getByTestId('color-score')).toHaveAttribute('aria-pressed', 'true')
  })

  test('discover page loads the pin picker', async ({ page }) => {
    await page.goto('/discover')
    await expect(page.getByTestId('location-map').locator('.gm-style')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('discover-submit')).toBeDisabled()
    await page.getByTestId('discover-address').fill('Kızılay')
    await expect(page.getByTestId('discover-submit')).toBeEnabled()
  })
})
