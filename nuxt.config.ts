import tailwindcss from '@tailwindcss/vite'
import { BRAND } from './shared/brand'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  // NUXT_DEVTOOLS=false hides the DevTools badge (E2E runs, README screenshots).
  devtools: { enabled: process.env.NUXT_DEVTOOLS !== 'false' },

  // A local, single-user tool: rendering in the browser means the UI
  // language and every date follow the *browser* (navigator.languages and
  // its time zone) with no server/client mismatch. SSR would add nothing here.
  ssr: false,

  modules: [
    '@nuxt/image',
    '@nuxt/eslint',
  ],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: BRAND.name,
      meta: [
        { name: 'theme-color', content: '#fbf8f4', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#141210', media: '(prefers-color-scheme: dark)' },
        { name: 'description', content: BRAND.description },
        { property: 'og:title', content: `${BRAND.name} — ${BRAND.tagline.en}` },
        { property: 'og:description', content: BRAND.description },
        { property: 'og:image', content: '/og-image.png' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
    },
  },

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    public: {
      googleMapsBrowserKey: process.env.NUXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || '',
    },
  },

  image: {
    quality: 80,
    format: ['webp'],
  },
})
