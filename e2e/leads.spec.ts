import { expect, test } from '@playwright/test'

test.describe('Leads list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/businesses')
    await expect(page.getByTestId('leads-list')).toBeVisible()
  })

  test('Turkish-aware search finds "İstiklal" from "istiklal"', async ({ page }) => {
    await page.getByTestId('leads-search').fill('istiklal')
    const rows = page.getByTestId('leads-list').getByRole('listitem')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('İstiklal Kafe')
  })

  test('quick filters, stage filter and sorting', async ({ page }) => {
    const rows = page.getByTestId('leads-list').getByRole('listitem')
    await expect(rows).toHaveCount(6)
    // Default sort is by opportunity: the barber first.
    await expect(rows.first()).toContainText('Usta Berber Salonu')

    await page.getByTestId('quick-noWebsite').click()
    await expect(rows).toHaveCount(5)
    await expect(page.getByTestId('leads-list')).not.toContainText('Kurumsal Hukuk Bürosu')
    await page.getByTestId('quick-noWebsite').click()

    await page.getByTestId('leads-stage').selectOption('won')
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('Gülüş Diş Kliniği')
    await page.getByTestId('leads-stage').selectOption('all')

    await page.getByTestId('leads-sort').selectOption('name')
    await expect(rows.first()).toContainText('Eski Kırtasiye')
  })

  test('bulk stage change, route planning and delete', async ({ page }) => {
    const list = page.getByTestId('leads-list')
    await list.getByRole('checkbox', { name: 'Sabah Fırını seç' }).check()
    await list.getByRole('checkbox', { name: 'Eski Kırtasiye seç' }).check()
    await expect(page.getByTestId('bulk-bar')).toContainText('2 seçili')

    await page.getByTestId('bulk-route').click()
    await expect(page.getByTestId('route-planner')).toContainText('2 durak')
    await page.getByTestId('route-planner').getByRole('button', { name: 'Kapat' }).click()

    await page.getByTestId('bulk-status').selectOption('visited')
    await expect(list.getByRole('listitem').filter({ hasText: 'Sabah Fırını' })).toContainText('Ziyaret edildi')

    await list.getByRole('checkbox', { name: 'Sabah Fırını seç' }).uncheck()
    await page.getByTestId('bulk-delete').click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText('1 işletme ve notları silinsin mi?')
    await dialog.getByRole('button', { name: 'Sil' }).click()
    await expect(list).not.toContainText('Eski Kırtasiye')
    await expect(page.getByTestId('leads-count')).toHaveText('5 işletme')
  })

  test('CSV export has a BOM, localised headers and every lead', async ({ request }) => {
    const res = await request.get('/api/businesses/export?locale=tr&tz=Europe/Istanbul')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('text/csv')
    expect(res.headers()['content-disposition']).toMatch(/attachment; filename="leads-\d{4}-\d{2}-\d{2}\.csv"/)
    const body = await res.text()
    expect(body.charCodeAt(0)).toBe(0xFEFF)
    const lines = body.trim().split('\r\n')
    expect(lines[0]).toContain('İsim,Kategori,Aşama,Fırsat skoru')
    expect(lines.length).toBe(1 + 5)
  })
})
