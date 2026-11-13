import { describe, expect, it } from 'vitest'
import { errorMessage } from '../app/utils/errorMessage'

describe('errorMessage', () => {
  it('returns the server-provided message from a $fetch error', () => {
    const error = { data: { statusCode: 502, message: 'Gemini şu an yoğun, biraz sonra tekrar dene.' } }
    expect(errorMessage(error, 'fallback')).toBe('Gemini şu an yoğun, biraz sonra tekrar dene.')
  })

  it('falls back when there is no usable message', () => {
    expect(errorMessage(new Error('network'), 'fallback')).toBe('fallback')
    expect(errorMessage({ data: { message: '   ' } }, 'fallback')).toBe('fallback')
    expect(errorMessage(null, 'fallback')).toBe('fallback')
  })
})
