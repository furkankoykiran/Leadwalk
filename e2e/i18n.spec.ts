import { expect, test } from '@playwright/test'

// Runs in both projects: tr-TR / Europe/Istanbul and en-US / America/New_York.
const isTr = (locale: string | undefined) => (locale ?? '').startsWith('tr')

test.describe('language and time zone follow the browser @i18n', () => {
  test('UI language is picked from the browser automatically', async ({ page }, info) => {
    const tr = isTr(info.project.use.locale)
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', tr ? 'tr' : 'en')
    const nav = page.getByRole('navigation', { name: tr ? 'Ana menü' : 'Main navigation' })
    await expect(nav.getByRole('link', { name: tr ? 'Bugün' : 'Today' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(tr ? 'Bugün kimi ziyaret etmeli' : 'Who to visit today')
    await expect(page.getByTestId('language-select')).toHaveValue('auto')
  })

  test('times render in the browser time zone', async ({ page }, info) => {
    // The seed stores the follow-up as 2026-11-20T09:00Z.
    const tr = isTr(info.project.use.locale)
    await page.goto('/')
    const followUps = page.getByTestId('dashboard-followups')
    await expect(followUps).toContainText('İstiklal Kafe')
    if (tr) {
      await expect(followUps).toContainText('20 Kas 2026')
      await expect(followUps).toContainText('12:00')
    } else {
      await expect(followUps).toContainText('Nov 20, 2026')
      await expect(followUps).toContainText('4:00 AM')
    }
  })

  test('a manual language choice overrides the browser and survives a reload', async ({ page }, info) => {
    const tr = isTr(info.project.use.locale)
    await page.goto('/')
    await page.getByTestId('language-select').selectOption(tr ? 'en' : 'tr')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(tr ? 'Who to visit today' : 'Bugün kimi ziyaret etmeli')
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(tr ? 'Who to visit today' : 'Bugün kimi ziyaret etmeli')
    await page.getByTestId('language-select').selectOption('auto')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(tr ? 'Bugün kimi ziyaret etmeli' : 'Who to visit today')
  })

  test('API errors come back in the UI language', async ({ request }, info) => {
    const tr = isTr(info.project.use.locale)
    const res = await request.post('/api/discover', { data: { radiusMeters: 1000 }, headers: { 'x-locale': tr ? 'tr' : 'en' } })
    expect(res.status()).toBe(400)
    expect((await res.json()).message).toBe(tr ? 'Bir adres yaz ya da haritada bir nokta seç.' : 'Type an address or pick a point on the map.')
  })
})
