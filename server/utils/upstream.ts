import type { ServerLocale } from './locale'
import { appError } from './locale'

/** HTTP statuses worth retrying: rate limiting and transient server trouble. */
const RETRYABLE_STATUSES = [408, 429, 500, 502, 503, 504]

interface FetchLikeError {
  name: string
  statusCode?: number
}

// $fetch rejects with ofetch's FetchError. ofetch is only a transitive
// dependency, so it is recognised by shape instead of imported.
function asFetchError(error: unknown): FetchLikeError | null {
  if (error instanceof Error && error.name === 'FetchError') return error as FetchLikeError
  return null
}

export function isRetryable(error: unknown): boolean {
  const fetchError = asFetchError(error)
  if (!fetchError) return false
  // No status means the request never got an answer (timeout, reset).
  return fetchError.statusCode === undefined || RETRYABLE_STATUSES.includes(fetchError.statusCode)
}

/**
 * Turns a failed call to Google (Places, Geocoding, Gemini) into an H3 error
 * whose localised `message` tells the user what actually went wrong.
 */
export function upstreamError(service: string, error: unknown, locale: ServerLocale): Error {
  const fetchError = asFetchError(error)
  const status = fetchError?.statusCode

  if (fetchError && status === undefined) return appError(502, locale, 'upstreamTimeout', { service }, error)
  if (status === 429) return appError(502, locale, 'upstreamQuota', { service }, error)
  if (status === 400 || status === 401 || status === 403) return appError(502, locale, 'upstreamRejected', { service, status }, error)
  if (status !== undefined && status >= 500) return appError(502, locale, 'upstreamDown', { service, status }, error)
  return appError(502, locale, 'upstreamFailed', { service }, error)
}

/** Runs `fn`, retrying transient upstream failures with a growing delay. */
export async function withRetry<T>(fn: () => Promise<T>, delaysMs: readonly number[] = [2000, 5000]): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const delay = delaysMs[attempt]
      if (delay === undefined || !isRetryable(error)) throw error
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
