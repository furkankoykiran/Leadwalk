import { expect, test } from '@playwright/test'
import { LOCALES } from '../shared/locales'

// Regenerates the README screenshots from the fictional seed data, once per
// UI language, into docs/screenshots/<locale>/:
//   npm run docs:screenshots
// README.md uses docs/screenshots/en/, README.<locale>.md its own folder, so
// adding a language to shared/locales.ts gets it screenshots for free.
// Excluded from the normal E2E runs (@docs). Runs first, on untouched seed data.
// Note: native date inputs follow the OS region format (Chromium on Windows
// ignores the page and --lang), so they show the capturing machine's format.
const PAGES = ['dashboard', 'leads', 'detail'] as const

test.describe('README screenshots @docs', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  for (const locale of LOCALES) {
    for (const scheme of ['light', 'dark'] as const) {
      test(`capture ${locale} (${scheme})`, async ({ page }) => {
        await page.addInitScript(code => localStorage.setItem('locale-override', code), locale)
        await page.emulateMedia({ colorScheme: scheme })
        for (const name of PAGES) {
          if (name === 'detail') {
            await page.goto('/businesses')
            await page.getByTestId('leads-list').getByRole('link', { name: 'Usta Berber Salonu' }).click()
            await expect(page.getByTestId('google-facts')).toBeVisible()
          } else {
            await page.goto(name === 'dashboard' ? '/' : '/businesses')
            await expect(page.getByTestId(name === 'dashboard' ? 'dashboard-kpis' : 'leads-list')).toBeVisible()
          }
          await expect(page.locator('html')).toHaveAttribute('lang', locale)
          await page.waitForTimeout(400)
          await page.screenshot({ path: `docs/screenshots/${locale}/${name}-${scheme}.png` })
        }
      })
    }
  }
})
