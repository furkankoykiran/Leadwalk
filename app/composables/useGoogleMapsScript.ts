let scriptLoadingPromise: Promise<void> | null = null

declare global {
  interface Window {
    __mapsReady?: () => void
  }
}

export function useGoogleMapsScript() {
  const config = useRuntimeConfig()
  const { locale } = useI18n()
  const available = computed(() => !!config.public.googleMapsBrowserKey)

  /** Loads the Maps JavaScript API once, with map labels in the UI language.
   * Uses Google's recommended `loading=async` + callback pattern. */
  function load(): Promise<void> {
    if (window.google?.maps?.Map) return Promise.resolve()
    if (scriptLoadingPromise) return scriptLoadingPromise
    scriptLoadingPromise = new Promise((resolve, reject) => {
      window.__mapsReady = () => resolve()
      const params = new URLSearchParams({
        key: String(config.public.googleMapsBrowserKey),
        language: locale.value,
        loading: 'async',
        callback: '__mapsReady',
      })
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`
      script.async = true
      script.onerror = () => {
        scriptLoadingPromise = null
        reject(new Error('Google Maps failed to load'))
      }
      document.head.appendChild(script)
    })
    return scriptLoadingPromise
  }

  return { load, available }
}
