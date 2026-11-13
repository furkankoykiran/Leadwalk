/**
 * Single source of truth for the Leadwalk brand: name, voice, colours and
 * the mark's geometry. The app (BrandMark.vue, nuxt.config) and the brand-kit
 * build (brand/tools/build-brand-kit.mjs) both read this file, so the logo
 * in the UI and every exported asset can never drift apart.
 * Guidelines: brand/BRAND.md.
 */
export const BRAND = {
  name: 'Leadwalk',
  slug: 'leadwalk',
  description: 'Open-source field-sales workspace: find local businesses, rank who needs you most, walk in with a tailored pitch.',
  tagline: { en: 'Walk in prepared.', tr: 'Kapıdan hazırlıklı gir.' },
  taglineAlt: { en: 'Every storefront is a lead.', tr: 'Her vitrin bir müşteri adayı.' },
  colors: {
    accent: '#C2410C', // "Route orange": warm, energetic, high-contrast on paper
    accentDark: '#FB923C', // accent on dark grounds
    ink: '#1C1917',
    paper: '#FBF8F4',
    night: '#141210',
    teal: '#0F766E', // "won" / trust
    line: '#ECE6DE',
    muted: '#6B635B',
  },
} as const

/**
 * The mark ("L-Route to target"), drawn on a 64×64 grid: a capital L traced
 * as a walked route that turns one street corner and arrives at a target —
 * the lead inside its search radius, which is exactly what the product finds
 * and walks you to. Optically centred in a rounded-square container.
 * The mark is the same at every size: route + ring + dot. Only the 16 px
 * raster favicon is weight-hinted (`hint16`: heavier ring, slightly smaller
 * dot) so the ring and dot stay apart on the pixel grid.
 */
export const MARK = {
  size: 64,
  radius: 14,
  route: 'M15 15.5V36.5a6 6 0 0 0 6 6H26',
  routeWidth: 7.5,
  target: { cx: 43, cy: 42.5, ring: 8.5, ringWidth: 3.25, dot: 3.75 },
  hint16: { ring: 9, ringWidth: 4, dot: 3.5 },
} as const
