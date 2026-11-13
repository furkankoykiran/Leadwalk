import { expect, test } from '@playwright/test'

// Regenerates the README screenshots from the fictional seed data:
//   npm run docs:screenshots
// Excluded from the normal E2E runs (@docs). Runs first, on untouched seed data.
const PAGES = [
  { name: 'dashboard', path: '/', ready: 'dashboard-kpis' },
  { name: 'leads', path: '/businesses', ready: 'leads-list' },
  { name: 'detail', path: '/businesses?open=e2e-barber', ready: 'google-facts' },
] as const

test.describe('README screenshots @docs', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  for (const scheme of ['light', 'dark'] as const) {
    test(`capture (${scheme})`, async ({ page }) => {
      await page.addInitScript(() => localStorage.setItem('locale-override', 'en'))
      await page.emulateMedia({ colorScheme: scheme })
      for (const p of PAGES) {
        if (p.name === 'detail') {
          await page.goto('/businesses')
          await page.getByTestId('leads-list').getByRole('link', { name: 'Usta Berber Salonu' }).click()
        } else {
          await page.goto(p.path)
        }
        await expect(page.getByTestId(p.ready)).toBeVisible()
        await page.waitForTimeout(400)
        await page.screenshot({ path: `docs/screenshots/${p.name}-${scheme}.png` })
      }
    })
  }
})
