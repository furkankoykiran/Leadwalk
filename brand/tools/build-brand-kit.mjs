#!/usr/bin/env node
/**
 * Leadwalk brand-kit build. Regenerates every file under brand/ (except the
 * hand-written BRAND.md / README.md) plus the app's favicon set in public/,
 * deterministically, from:
 *   - shared/brand.ts          name, taglines, colours, mark geometry
 *   - @fontsource/plus-jakarta-sans   wordmark glyph outlines (SIL OFL 1.1)
 *
 *   node brand/tools/build-brand-kit.mjs                 # writes brand/ and public/
 *   node brand/tools/build-brand-kit.mjs --output-dir X  # writes the kit to X only
 *
 * Needs Node ≥ 22.6 (TypeScript type stripping; on by default in Node 24).
 */
import { mkdir, readFile, rm, writeFile, copyFile, readdir, stat } from 'node:fs/promises'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateRawSync } from 'node:zlib'
import sharp from 'sharp'
import opentype from 'opentype.js'
import { BRAND, MARK } from '../../shared/brand.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const argIndex = process.argv.indexOf('--output-dir')
const OUT = argIndex > -1 ? resolve(process.argv[argIndex + 1]) : join(ROOT, 'brand')
const WRITE_PUBLIC = argIndex === -1
const C = BRAND.colors
const FONT_DIR = join(ROOT, 'node_modules/@fontsource/plus-jakarta-sans/files')

// ---------------------------------------------------------------------------
// Fonts → outlines
// ---------------------------------------------------------------------------

async function loadFont(weight, subset) {
  const buf = await readFile(join(FONT_DIR, `plus-jakarta-sans-${subset}-${weight}-normal.woff`))
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
}

const fonts = {
  700: [await loadFont(700, 'latin'), await loadFont(700, 'latin-ext')],
  500: [await loadFont(500, 'latin'), await loadFont(500, 'latin-ext')],
}

/** Lays out `text` as SVG path data at `size` px with tracking (em), using
 * the latin-ext subset for characters (ı, ş, ğ…) the latin one lacks. */
function textOutline(text, weight, size, tracking = 0) {
  const [primary, extended] = fonts[weight]
  let x = 0
  let prev = null
  let d = ''
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const ch of text) {
    const font = primary.charToGlyphIndex(ch) ? primary : extended
    const glyph = font.charToGlyph(ch)
    const scale = size / font.unitsPerEm
    if (prev && prev.font === font) x += font.getKerningValue(prev.glyph, glyph) * scale
    const path = glyph.getPath(x, 0, size)
    d += path.toPathData(2)
    const box = path.getBoundingBox()
    if (box.x1 !== box.x2) {
      minX = Math.min(minX, box.x1)
      minY = Math.min(minY, box.y1)
      maxX = Math.max(maxX, box.x2)
      maxY = Math.max(maxY, box.y2)
    }
    x += glyph.advanceWidth * scale + tracking * size
    prev = { font, glyph }
  }
  return { d, minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

// ---------------------------------------------------------------------------
// Vector building blocks. Each returns { w, h, inner } where `inner` is
// markup in a 0 0 w h coordinate space, so pieces can be nested and scaled.
// ---------------------------------------------------------------------------

let idCounter = 0
const uid = prefix => `${prefix}${++idCounter}`

/** The glyph (route + target) in one colour. `full` = with the target ring;
 * small sizes drop it and enlarge the dot instead. */
function glyph(color, full = true) {
  const t = MARK.target
  return `<path d="${MARK.route}" stroke="${color}" stroke-width="${MARK.routeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
    + (full ? `<circle cx="${t.cx}" cy="${t.cy}" r="${t.ring}" stroke="${color}" stroke-width="${t.ringWidth}" fill="none"/>` : '')
    + `<circle cx="${t.cx}" cy="${t.cy}" r="${full ? t.dot : t.dotSmall}" fill="${color}"/>`
}

function symbolInner({ container, glyph: glyphColor, knockout = false, signal = true }) {
  if (!knockout) {
    return `<rect width="${MARK.size}" height="${MARK.size}" rx="${MARK.radius}" fill="${container}"/>${glyph(glyphColor, signal)}`
  }
  const id = uid('k')
  return `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${MARK.size}" height="${MARK.size}"><rect width="${MARK.size}" height="${MARK.size}" fill="#fff"/>${glyph('#000', signal)}</mask><rect width="${MARK.size}" height="${MARK.size}" rx="${MARK.radius}" fill="${container}" mask="url(#${id})"/>`
}

function symbol(variant, signal = true) {
  const v = {
    color: { container: C.accent, glyph: '#FFFFFF' },
    dark: { container: C.accentDark, glyph: C.night },
    'mono-black': { container: '#000000', knockout: true },
    'mono-white': { container: '#FFFFFF', knockout: true },
    currentcolor: { container: 'currentColor', knockout: true },
  }[variant]
  return { w: MARK.size, h: MARK.size, inner: symbolInner({ ...v, signal }) }
}

const WORDMARK = textOutline(BRAND.name, 700, 100, -0.015)

function wordmark(variant) {
  const fill = { color: C.ink, dark: '#F5F1EC', 'mono-black': '#000000', 'mono-white': '#FFFFFF', currentcolor: 'currentColor' }[variant]
  return {
    w: round(WORDMARK.width),
    h: round(WORDMARK.height),
    inner: `<path transform="translate(${round(-WORDMARK.minX)} ${round(-WORDMARK.minY)})" d="${WORDMARK.d}" fill="${fill}"/>`,
  }
}

function nest(piece, x, y, scale = 1) {
  return `<svg x="${round(x)}" y="${round(y)}" width="${round(piece.w * scale)}" height="${round(piece.h * scale)}" viewBox="0 0 ${piece.w} ${piece.h}" overflow="visible">${piece.inner}</svg>`
}

/** Symbol + wordmark side by side; the symbol is 1.5× the wordmark's ink
 * height and vertically centred on it. */
function logoHorizontal(variant) {
  const word = wordmark(variant)
  const sym = symbol(variant)
  const s = (word.h * 1.5) / sym.h
  const symSize = sym.h * s
  const gap = symSize * 0.3
  const w = symSize + gap + word.w
  const h = symSize
  return { w: round(w), h: round(h), inner: nest(sym, 0, 0, s) + nest(word, symSize + gap, (h - word.h) / 2) }
}

function logoStacked(variant) {
  const word = wordmark(variant)
  const sym = symbol(variant)
  const s = (word.h * 2.6) / sym.h
  const symSize = sym.h * s
  const gap = symSize * 0.26
  const w = Math.max(symSize, word.w)
  const h = symSize + gap + word.h
  return { w: round(w), h: round(h), inner: nest(sym, (w - symSize) / 2, 0, s) + nest(word, (w - word.w) / 2, symSize + gap) }
}

function textPiece(text, weight, size, fill, tracking = 0) {
  const o = textOutline(text, weight, size, tracking)
  return { w: round(o.width), h: round(o.height), inner: `<path transform="translate(${round(-o.minX)} ${round(-o.minY)})" d="${o.d}" fill="${fill}"/>` }
}

function svgDocument(piece, extra = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${piece.w}" height="${piece.h}" viewBox="0 0 ${piece.w} ${piece.h}" fill="none"${extra}><title>${BRAND.name}</title>${piece.inner}</svg>\n`
}

function round(n) {
  return Math.round(n * 100) / 100
}

// ---------------------------------------------------------------------------
// Concepts explored before picking direction A
// ---------------------------------------------------------------------------

const CONCEPTS = {
  'concept-a': symbol('color'),
  'concept-b': {
    w: 64,
    h: 64,
    // "Pin with path": a map pin carrying a short walked route to a lead.
    inner: `<path d="M32 59S13 40.5 13 26a19 19 0 0 1 38 0C51 40.5 32 59 32 59z" fill="${C.ink}"/><path d="M22.5 31l6-6.5 6 4.5 5.5-6.5" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="43" cy="20.5" r="3.2" fill="${C.accentDark}"/>`,
  },
  'concept-c': {
    w: 64,
    h: 64,
    // "Storefront grid": scan the block, pick the best opportunity, walk to it.
    inner: [10, 26, 42].flatMap(y => [10, 26, 42].map((x) => {
      const target = x === 42 && y === 10
      return `<rect x="${x + 1.25}" y="${y + 1.25}" width="9.5" height="9.5" rx="2" ${target ? `fill="${C.accent}"` : `stroke="${C.ink}" stroke-width="2.5"`}/>`
    })).join('') + `<path d="M24 56V40H40V24" stroke="${C.accent}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
  },
}

// ---------------------------------------------------------------------------
// Raster compositions
// ---------------------------------------------------------------------------

const THEMES = {
  light: { bg: C.paper, variant: 'color', text: C.ink, muted: C.muted },
  dark: { bg: C.night, variant: 'dark', text: '#F5F1EC', muted: '#A8A29E' },
}

/** A canvas with the stacked (portrait/square) or horizontal (landscape)
 * logo centred, plus the tagline when there is room. */
function canvas(w, h, themeName, { safeLeft = 0, tagline = true } = {}) {
  const theme = THEMES[themeName]
  const landscape = w / h >= 1.6
  const logo = landscape ? logoHorizontal(theme.variant) : logoStacked(theme.variant)
  const usableW = w - safeLeft
  const scale = Math.min((usableW * (landscape ? 0.5 : 0.56)) / logo.w, (h * (landscape ? 0.26 : 0.34)) / logo.h)
  const lw = logo.w * scale
  const lh = logo.h * scale
  let content = ''
  const tag = tagline ? textPiece(BRAND.tagline.en, 500, 100, theme.muted) : null
  const tagScale = tag ? Math.min((lh * (landscape ? 0.34 : 0.16)) / tag.h, (usableW * 0.7) / tag.w) : 0
  const tagH = tag ? tag.h * tagScale : 0
  const gap = tag ? lh * (landscape ? 0.42 : 0.14) : 0
  const blockH = lh + gap + tagH
  const top = (h - blockH) / 2
  content += nest(logo, safeLeft + (usableW - lw) / 2, top, scale)
  if (tag) content += nest(tag, safeLeft + (usableW - tag.w * tagScale) / 2, top + lh + gap, tagScale)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${theme.bg}"/>${content}</svg>`
}

/** Open Graph / link-preview card: logo, headline and promise, with the
 * route motif bleeding off the right edge. */
function ogCard(w, h) {
  const logo = logoHorizontal('color')
  const lScale = (h * 0.11) / logo.h
  const headline = textPiece(BRAND.tagline.en, 700, 100, C.ink, -0.02)
  const hScale = (w * 0.5) / headline.w
  const sub = textPiece('Find local businesses. Rank who needs you. Walk in with a pitch.', 500, 100, C.muted)
  const sScale = Math.min((w * 0.56) / sub.w, (h * 0.045) / sub.h)
  const pad = w * 0.075
  const motif = `<g transform="translate(${round(w * 0.6)} ${round(h * 0.1)}) scale(${round((h * 0.95) / 64)})" opacity="0.12">${glyph(C.accent)}</g>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${C.paper}"/>${motif}${nest(logo, pad, pad, lScale)}${nest(headline, pad, h * 0.45, hScale)}${nest(sub, pad, h * 0.45 + headline.h * hScale + h * 0.06, sScale)}<rect x="0" y="${h - 10}" width="${w}" height="10" fill="${C.accent}"/></svg>`
}

/** Square app/avatar tile: full-bleed accent with the glyph scaled into the
 * centre `safe` fraction (0.8 for Android maskable icons). */
function appTile(size, safe = 0.62, signal = true) {
  const glyphScale = (size * safe) / 41 // the glyph's ink spans ~41 grid units
  const offset = size / 2 - 32 * glyphScale
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${C.accent}"/><g transform="translate(${round(offset)} ${round(offset)}) scale(${round(glyphScale)})">${glyph('#FFFFFF', signal)}</g></svg>`
}

async function png(svg, file, width, height) {
  const img = sharp(Buffer.from(svg), { density: 384 }).resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  await write(file, await img.png({ compressionLevel: 9 }).toBuffer())
}

async function webp(svg, file, width, height) {
  const img = sharp(Buffer.from(svg), { density: 384 }).resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  await write(file, await img.webp({ quality: 88 }).toBuffer())
}

function sized(piece, width) {
  return { width, height: Math.round((width * piece.h) / piece.w) }
}

// ---------------------------------------------------------------------------
// Packaging helpers: multi-size ICO and a deterministic ZIP (no extra deps)
// ---------------------------------------------------------------------------

function ico(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  const dir = Buffer.alloc(16 * pngs.length)
  let offset = 6 + dir.length
  pngs.forEach(({ size, data }, i) => {
    const o = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, o)
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1)
    dir.writeUInt16LE(1, o + 4)
    dir.writeUInt16LE(32, o + 6)
    dir.writeUInt32LE(data.length, o + 8)
    dir.writeUInt32LE(offset, o + 12)
    offset += data.length
  })
  return Buffer.concat([header, dir, ...pngs.map(p => p.data)])
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xFFFFFFFF
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

function zip(entries) {
  // Fixed timestamp (2026-01-01 00:00) so identical inputs give an identical archive.
  const dosTime = 0
  const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1
  const locals = []
  const centrals = []
  let offset = 0
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8')
    const deflated = deflateRawSync(data, { level: 9 })
    const useDeflate = deflated.length < data.length
    const body = useDeflate ? deflated : data
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034B50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(useDeflate ? 8 : 0, 8)
    local.writeUInt16LE(dosTime, 10)
    local.writeUInt16LE(dosDate, 12)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(body.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    locals.push(local, nameBuf, body)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014B50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(useDeflate ? 8 : 0, 10)
    central.writeUInt16LE(dosTime, 12)
    central.writeUInt16LE(dosDate, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(body.length, 20)
    central.writeUInt32LE(data.length, 24)
    central.writeUInt16LE(nameBuf.length, 28)
    central.writeUInt32LE(offset, 42)
    centrals.push(central, nameBuf)
    offset += 30 + nameBuf.length + body.length
  }
  const centralBuf = Buffer.concat(centrals)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054B50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralBuf.length, 12)
  end.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, centralBuf, end])
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const written = []
async function write(file, data) {
  const path = join(OUT, file)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, data)
  written.push(file)
}

const GENERATED_DIRS = ['svg', 'png', 'webp', 'favicon', 'social', 'concepts', 'assets-site']
for (const dir of GENERATED_DIRS) await rm(join(OUT, dir), { recursive: true, force: true })

const VARIANTS = ['color', 'dark', 'mono-black', 'mono-white', 'currentcolor']
const SUFFIX = v => (v === 'color' ? '' : `-${v}`)

// 1. Master vectors
for (const v of VARIANTS) {
  await write(`svg/symbol${SUFFIX(v)}.svg`, svgDocument(symbol(v)))
  await write(`svg/wordmark${SUFFIX(v)}.svg`, svgDocument(wordmark(v)))
  await write(`svg/logo-horizontal${SUFFIX(v)}.svg`, svgDocument(logoHorizontal(v)))
  await write(`svg/logo-stacked${SUFFIX(v)}.svg`, svgDocument(logoStacked(v)))
}

// 2. Concepts, with the favicon-size test renders used to judge them
for (const [name, piece] of Object.entries(CONCEPTS)) {
  const doc = svgDocument(piece)
  await write(`concepts/${name}.svg`, doc)
  for (const size of [16, 32, 64, 512]) await png(doc, `concepts/${name}-${size}.png`, size, size)
}

// 3. Rasters, every common aspect ratio
const symbolDoc = svgDocument(symbol('color'))
for (const size of [512, 1024, 2048]) {
  await png(symbolDoc, `png/1-1/symbol-${size}-transparent.png`, size, size)
  await png(canvas(size, size, 'light', { tagline: false }), `png/1-1/logo-${size}-light.png`, size, size)
  await png(canvas(size, size, 'dark', { tagline: false }), `png/1-1/logo-${size}-dark.png`, size, size)
}
const RATIOS = [
  ['4-5', 1080, 1350], ['3-4', 1200, 1600], ['4-3', 1600, 1200], ['16-9', 1920, 1080], ['16-9', 3840, 2160],
  ['9-16', 1080, 1920], ['2-1', 1600, 800], ['3-1', 1500, 500], ['1.91-1', 1200, 630],
]
for (const [dir, w, h] of RATIOS) {
  for (const theme of ['light', 'dark']) await png(canvas(w, h, theme), `png/${dir}/${BRAND.slug}-${w}x${h}-${theme}.png`, w, h)
}
for (const theme of ['light', 'dark']) {
  await png(canvas(400, 400, theme, { tagline: false }), `png/avatar/avatar-400-${theme}.png`, 400, 400)
}
await png(appTile(400, 0.6), 'png/avatar/avatar-400-tile.png', 400, 400)
const horizontal = svgDocument(logoHorizontal('color'))
const stacked = svgDocument(logoStacked('color'))
const hSize = sized(logoHorizontal('color'), 1600)
const sSize = sized(logoStacked('color'), 1200)
await png(horizontal, 'png/logo-horizontal-transparent.png', hSize.width, hSize.height)
await png(stacked, 'png/logo-stacked-transparent.png', sSize.width, sSize.height)

// 4. Favicon + PWA kit
const smallSymbol = svgDocument(symbol('color', false))
await write('favicon/favicon.svg', smallSymbol)
const icoLayers = []
for (const size of [16, 32, 48, 64, 128, 256]) {
  const src = size >= 64 ? symbolDoc : smallSymbol
  const data = await sharp(Buffer.from(src), { density: 384 }).resize(size, size).png().toBuffer()
  icoLayers.push({ size, data })
  if (size === 16 || size === 32) await write(`favicon/favicon-${size}x${size}.png`, data)
}
await write('favicon/favicon.ico', ico(icoLayers))
await png(appTile(180, 0.58), 'favicon/apple-touch-icon.png', 180, 180)
await png(appTile(192, 0.62), 'favicon/android-chrome-192x192.png', 192, 192)
await png(appTile(512, 0.62), 'favicon/android-chrome-512x512.png', 512, 512)
await png(appTile(512, 0.5), 'favicon/maskable-icon-512x512.png', 512, 512)
const manifest = {
  name: BRAND.name,
  short_name: BRAND.name,
  description: BRAND.description,
  start_url: '/',
  display: 'standalone',
  background_color: C.paper,
  theme_color: C.accent,
  icons: [
    { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}
await write('favicon/site.webmanifest', `${JSON.stringify(manifest, null, 2)}\n`)

// 5. Social
const og = ogCard(1200, 630)
await png(og, 'social/og-preview-1200x630.png', 1200, 630)
// X/Twitter header: keep the lower-left avatar area clear.
await png(canvas(1500, 500, 'light', { safeLeft: 260 }), 'social/twitter-header-1500x500.png', 1500, 500)
await png(appTile(400, 0.6), 'social/social-avatar-400x400.png', 400, 400)

// 6. WebP
await webp(symbolDoc, 'webp/symbol.webp', 512, 512)
await webp(horizontal, 'webp/logo-horizontal.webp', hSize.width, hSize.height)
await webp(stacked, 'webp/logo-stacked.webp', sSize.width, sSize.height)
await webp(og, 'webp/og-card-1200x630.webp', 1200, 630)
await webp(canvas(1500, 500, 'light', { safeLeft: 260 }), 'webp/x-header-1500x500.webp', 1500, 500)

// 7. Design tokens (W3C Design Tokens Community Group format)
const color = (value, description) => ({ $type: 'color', $value: value, ...(description ? { $description: description } : {}) })
const tokens = {
  $description: `${BRAND.name} design tokens. Source: shared/brand.ts and app/assets/css/main.css.`,
  brand: {
    accent: color(C.accent, 'Route orange. Primary actions, the mark container.'),
    'accent-dark': color(C.accentDark, 'Accent on dark grounds.'),
    ink: color(C.ink, 'Primary text and the wordmark on light grounds.'),
    paper: color(C.paper, 'Light ground.'),
    night: color(C.night, 'Dark ground.'),
    teal: color(C.teal, 'Won / trust. Never used for primary actions.'),
    line: color(C.line, 'Hairlines and card borders.'),
    muted: color(C.muted, 'Secondary text (4.6:1 on paper).'),
  },
  stage: {
    new: color('#A8A29E'),
    prepared: color('#7C3AED'),
    visited: color('#0369A1'),
    won: color('#0F766E'),
    lost: color('#DC2626'),
  },
  font: {
    family: { $type: 'fontFamily', $value: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
    'weight-regular': { $type: 'fontWeight', $value: 400 },
    'weight-semibold': { $type: 'fontWeight', $value: 600 },
    'weight-bold': { $type: 'fontWeight', $value: 700 },
    'weight-extrabold': { $type: 'fontWeight', $value: 800 },
  },
  radius: {
    control: { $type: 'dimension', $value: { value: 12, unit: 'px' } },
    card: { $type: 'dimension', $value: { value: 16, unit: 'px' } },
    panel: { $type: 'dimension', $value: { value: 24, unit: 'px' } },
    'mark-ratio': { $type: 'number', $value: MARK.radius / MARK.size, $description: 'Mark container corner radius ÷ size.' },
  },
}
await write('tokens.json', `${JSON.stringify(tokens, null, 2)}\n`)

// 8. Static asset download page (no CDN: works offline)
const swatches = Object.entries(tokens.brand).map(([k, t]) => `<li><span style="background:${t.$value}"></span><b>${k}</b><code>${t.$value}</code></li>`).join('')
const svgLinks = VARIANTS.flatMap(v => ['symbol', 'wordmark', 'logo-horizontal', 'logo-stacked'].map(n => `svg/${n}${SUFFIX(v)}.svg`))
const site = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${BRAND.name} brand assets</title><link rel="icon" href="../favicon/favicon.svg">
<style>
:root{--bg:${C.paper};--fg:${C.ink};--muted:${C.muted};--card:#fff;--line:${C.line}}
@media (prefers-color-scheme:dark){:root{--bg:${C.night};--fg:#F5F1EC;--muted:#A8A29E;--card:#1C1917;--line:#2E2A26}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.6 system-ui,sans-serif}
main{max-width:960px;margin:0 auto;padding:48px 20px}h1{font-size:32px;margin:24px 0 4px}h2{margin-top:40px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;padding:0;list-style:none}
.grid li{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px}
.grid img{width:100%;height:96px;object-fit:contain}.sw li{display:flex;gap:10px;align-items:center}
.sw span{width:28px;height:28px;border-radius:8px;border:1px solid var(--line)}code{color:var(--muted);margin-left:auto}
a{color:${C.accent}}p{color:var(--muted)}
</style></head><body><main>
<img src="../svg/logo-horizontal.svg" alt="${BRAND.name}" height="48">
<h1>Brand assets</h1><p>${BRAND.tagline.en} · <a href="../${BRAND.slug}-brand-assets.zip">Download everything (.zip)</a> · Guidelines: BRAND.md</p>
<h2>Colours</h2><ul class="grid sw">${swatches}</ul>
<h2>Vectors</h2><ul class="grid">${svgLinks.map(f => `<li><img src="../${f}" alt="" style="${f.includes('white') ? 'background:#1C1917;border-radius:8px' : ''}"><a href="../${f}" download>${f.replace('svg/', '')}</a></li>`).join('')}</ul>
</main></body></html>
`
await write('assets-site/index.html', site)

// 9. Copy fonts + licence next to the tools, as PostSway does
for (const f of ['plus-jakarta-sans-latin-700-normal.woff', 'plus-jakarta-sans-latin-ext-700-normal.woff', 'plus-jakarta-sans-latin-500-normal.woff']) {
  await mkdir(join(OUT, 'tools/fonts'), { recursive: true })
  await copyFile(join(FONT_DIR, f), join(OUT, 'tools/fonts', f))
}
await copyFile(join(ROOT, 'node_modules/@fontsource/plus-jakarta-sans/LICENSE'), join(OUT, 'tools/fonts/OFL.txt'))

// 10. One-click archive of everything generated above + guidelines
async function listFiles(dir) {
  const out = []
  for (const entry of await readdir(dir)) {
    const full = join(dir, entry)
    if ((await stat(full)).isDirectory()) out.push(...await listFiles(full))
    else out.push(full)
  }
  return out
}
const zipName = `${BRAND.slug}-brand-assets.zip`
const archived = []
for (const dir of ['svg', 'png', 'webp', 'favicon', 'social', 'concepts']) {
  for (const file of await listFiles(join(OUT, dir))) archived.push(file)
}
for (const file of ['tokens.json', 'BRAND.md', 'README.md']) {
  try {
    await stat(join(OUT, file))
    archived.push(join(OUT, file))
  } catch { /* hand-written docs may not exist in a fresh --output-dir */ }
}
archived.sort()
const entries = await Promise.all(archived.map(async f => ({ name: `${BRAND.slug}-brand/${relative(OUT, f).split(sep).join('/')}`, data: await readFile(f) })))
await write(zipName, zip(entries))

// 11. App favicon set
if (WRITE_PUBLIC) {
  const pub = join(ROOT, 'public')
  for (const f of ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png', 'maskable-icon-512x512.png', 'site.webmanifest']) {
    await copyFile(join(OUT, 'favicon', f), join(pub, f))
  }
  await copyFile(join(OUT, 'social/og-preview-1200x630.png'), join(pub, 'og-image.png'))
}

console.log(`${BRAND.name} brand kit: ${written.length} files written to ${relative(ROOT, OUT) || '.'}${WRITE_PUBLIC ? ' (+ favicon set in public/)' : ''}`)
