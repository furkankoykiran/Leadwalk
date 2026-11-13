import { expect, test } from '@playwright/test'

// Runs last (files run in name order): wipes the E2E database through the UI.
test('delete all data asks first, then empties every view', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Tüm verileri sil' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('kalıcı olarak silinsin mi?')

  await dialog.getByRole('button', { name: 'Vazgeç' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByTestId('dashboard-kpis')).toBeVisible()

  await page.getByRole('button', { name: 'Tüm verileri sil' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Hepsini sil' }).click()
  await expect(page.getByTestId('dashboard-empty')).toBeVisible()
  await page.goto('/businesses')
  await expect(page.getByText('Henüz işletme yok.')).toBeVisible()
})
