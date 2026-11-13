import { expect, test } from '@playwright/test'

// @live: real Google Geocoding + Places (1 Nearby Search) and Gemini calls,
// using the keys in .env. Counted in the app's own usage meter.
test.describe('live Google + Gemini @live', () => {
  test('an unknown address is reported clearly', async ({ page }) => {
    await page.goto('/discover')
    await page.getByTestId('discover-address').fill('qxzvbnmw plkjh 99999')
    await page.getByTestId('discover-submit').click()
    await expect(page.getByTestId('discover-message')).toHaveText('Adres bulunamadı: qxzvbnmw plkjh 99999')
  })

  test('discover by address, then prepare a pitch with Gemini', async ({ page }) => {
    test.setTimeout(300_000)
    await page.goto('/discover')
    await page.getByTestId('discover-address').fill('Kızılay Meydanı, Çankaya, Ankara')
    await page.getByTestId('discover-radius').selectOption('500')
    await page.getByTestId('discover-submit').click()

    await expect(page).toHaveURL(/\/businesses\?found=\d+&new=\d+/, { timeout: 60_000 })
    await expect(page.getByTestId('discovery-result')).toContainText('bulundu')
    const rows = page.getByTestId('leads-list').getByRole('listitem')
    expect(await rows.count()).toBeGreaterThan(5)

    // The usage meter counted the search and the geocode.
    const usage = await (await page.request.get('/api/usage')).json()
    expect(usage.today.discover_count).toBeGreaterThanOrEqual(1)
    expect(usage.today.geocode_count).toBeGreaterThanOrEqual(1)

    // Open the hottest lead that is still "new" and generate.
    await page.getByTestId('leads-stage').selectOption('discovered')
    await page.getByTestId('leads-sort').selectOption('score')
    await rows.first().getByTestId('lead-name').click()
    await expect(page.getByTestId('google-facts')).toBeVisible()
    await page.getByTestId('generate').click()
    // Gemini (with retry + fallback model) can take a while on the free tier.
    await expect(page.getByTestId('pitch').or(page.getByTestId('detail-error'))).toBeVisible({ timeout: 240_000 })
    await expect(page.getByTestId('detail-error')).toBeHidden()
    await expect(page.getByTestId('pitch')).toContainText('Türkçe yazıldı')
    expect(await page.getByTestId('ideas').locator('article').count()).toBeGreaterThanOrEqual(2)
    await expect(page.getByTestId('detail-status')).toHaveText('Hazırlandı')
    await expect(page.getByTestId('history')).toContainText('Pitch hazırlandı')
  })
})
