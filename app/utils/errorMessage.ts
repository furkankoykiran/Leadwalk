/**
 * Pulls the human-readable reason out of a failed $fetch call so the UI can
 * say *why* something failed (missing key, quota exceeded, address not
 * found…) instead of a generic "try again". Server routes put the Turkish
 * explanation in `message` (statusMessage is header-safe ASCII only).
 */
export function errorMessage(error: unknown, fallback: string): string {
  const data = (error as { data?: { message?: unknown } } | null)?.data
  const message = typeof data?.message === 'string' ? data.message.trim() : ''
  return message || fallback
}
