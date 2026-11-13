import { expect, test } from '@playwright/test'

test.describe('Lead detail', () => {
  test('score explanation, Google facts and contact actions', async ({ page }) => {
    await page.goto('/businesses')
    await page.getByTestId('leads-list').getByRole('link', { name: 'Usta Berber Salonu' }).click()
    await expect(page.getByTestId('detail-name')).toHaveText('Usta Berber Salonu')
    await expect(page.getByTestId('detail-score')).toHaveText('80')
    await expect(page.getByText('+35 Websitesi yok')).toBeVisible()
    await expect(page.getByText('+15 Randevu sistemine uygun')).toBeVisible()

    const facts = page.getByTestId('google-facts')
    await expect(facts).toContainText('Kart geçerli')
    await expect(facts).toContainText('Rezervasyon alıyor: hayır')
    await expect(facts).toContainText('Pazartesi: 09:00–21:00')
    await expect(facts).toContainText('Randevu almak zor ama çok iyi.')

    await expect(page.getByRole('link', { name: 'Ara' })).toHaveAttribute('href', 'tel:+90 312 000 00 00')
    await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', 'https://wa.me/903120000000')
    await expect(page.getByRole('link', { name: 'Yol tarifi' })).toHaveAttribute('href', /travelmode=walking/)
  })

  test('pipeline, follow-up, deal value, notes and history', async ({ page }) => {
    await page.goto('/businesses')
    await page.getByTestId('leads-list').getByRole('link', { name: 'Usta Berber Salonu' }).click()
    const status = page.getByTestId('detail-status')
    await expect(status).toHaveText('Yeni')

    await page.getByTestId('mark-visited').click()
    await expect(status).toHaveText('Ziyaret edildi')
    await page.getByTestId('mark-won').click()
    await expect(status).toHaveText('Kazanıldı')
    await expect(page.getByTestId('next-step')).toContainText('Kazanıldı. Tebrikler.')

    await page.getByTestId('deal-value').fill('3500')
    await page.getByTestId('deal-value').blur()
    await page.getByTestId('follow-up').fill('2026-12-01T14:30')
    await page.getByTestId('follow-up').blur()

    await page.getByTestId('note-input').fill('Sahibi Pazartesi öğleden sonra burada.')
    await page.getByTestId('note-save').click()
    const history = page.getByTestId('history')
    await expect(history).toContainText('Sahibi Pazartesi öğleden sonra burada.')
    await expect(history).toContainText('Kazanıldı aşamasına geçti')
    await expect(history).toContainText('Takip tarihi: 1 Ara 2026 14:30')

    // Everything above was persisted, not just shown.
    await page.reload()
    await expect(status).toHaveText('Kazanıldı')
    await expect(page.getByTestId('deal-value')).toHaveValue('3500')
    await expect(page.getByTestId('follow-up')).toHaveValue('2026-12-01T14:30')

    await history.getByRole('button', { name: 'Notu sil' }).click()
    await expect(history).not.toContainText('Sahibi Pazartesi öğleden sonra burada.')

    await page.getByTestId('reopen').click()
    await expect(status).toHaveText('Ziyaret edildi')
  })

  test('unknown lead shows a not-found message', async ({ page }) => {
    await page.goto('/businesses/999999')
    await expect(page.getByText('Bu işletme artık yok.')).toBeVisible()
  })
})
