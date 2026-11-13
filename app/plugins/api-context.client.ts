// Every API call carries the UI language and the browser's time zone, so the
// server can answer in the same language (error messages, AI output) and
// bucket "today" usage on the user's calendar rather than the machine's.
export default defineNuxtPlugin(() => {
  const { locale } = useI18n()

  globalThis.$fetch = $fetch.create({
    onRequest({ options }) {
      const headers = new Headers(options.headers)
      headers.set('x-locale', locale.value)
      headers.set('x-timezone', browserTimeZone())
      options.headers = headers
    },
  })

  useHead({ htmlAttrs: { lang: locale } })
})
