import { expect, test } from '@playwright/test'

test.describe('Today dashboard', () => {
  test('shows KPIs, the pipeline and the hottest unvisited leads', async ({ page }) => {
    await page.goto('/')
    const kpis = page.getByTestId('dashboard-kpis')
    await expect(kpis).toContainText('İşletme')
    await expect(kpis).toContainText('6')
    // 5 of the 6 seed leads have no website.
    await expect(kpis).toContainText('Websitesi olmayan')
    await expect(kpis).toContainText('5')
    await expect(kpis).toContainText('Kazanılan')
    await expect(kpis).toContainText('4.500')

    await expect(page.getByText('Ziyaret → kazanç: %50')).toBeVisible()

    const hottest = page.getByTestId('dashboard-hottest')
    // The barber: no website + booking fit + well rated + few reviews = 80.
    await expect(hottest.getByRole('listitem').first()).toContainText('Usta Berber Salonu')
    await expect(hottest.getByRole('listitem').first()).toContainText('80')
    // Temporarily closed places are left out of today's list.
    await expect(hottest).not.toContainText('Eski Kırtasiye')
  })

  test('walking route opens Google Maps with walking directions', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('dashboard-route').click()
    const planner = page.getByTestId('route-planner')
    await expect(planner).toBeVisible()
    const href = await planner.getByTestId('route-open').getAttribute('href')
    expect(href).toContain('https://www.google.com/maps/dir/?')
    expect(href).toContain('travelmode=walking')
    expect(href).toContain('waypoints=')
    await planner.getByRole('button', { name: 'Kapat' }).click()
    await expect(planner).toBeHidden()
  })
})
