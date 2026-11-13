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
 * whose `message` tells the user what actually went wrong. statusMessage is
 * kept ASCII because it travels in the HTTP status line; the Turkish text
 * goes in `message`, which reaches the client in the JSON body.
 */
export function upstreamError(service: string, error: unknown): Error {
  const fetchError = asFetchError(error)
  const status = fetchError?.statusCode

  let message: string
  if (fetchError && status === undefined) {
    message = `${service} yanıt vermedi (zaman aşımı). Biraz sonra tekrar dene.`
  } else if (status === 429) {
    message = `${service} kotası/istek sınırı doldu. Biraz bekleyip tekrar dene.`
  } else if (status === 400 || status === 401 || status === 403) {
    message = `${service} isteği reddetti (${status}). API anahtarını ve etkin API'leri kontrol et.`
  } else if (status !== undefined && status >= 500) {
    message = `${service} şu an yoğun ya da erişilemiyor (${status}). Biraz sonra tekrar dene.`
  } else {
    message = `${service} isteği başarısız oldu.`
  }

  return createError({
    statusCode: 502,
    statusMessage: 'Upstream request failed',
    message,
    cause: error,
  })
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
