# Leadwalk brand kit

Everything the brand needs, in one folder, rebuilt from source with one
command. Guidelines (story, rules, colour, type, voice): **[BRAND.md](BRAND.md)**.

## Directory map

```
brand/
├── BRAND.md                    Brand guidelines (hand-written)
├── README.md                   This file (hand-written)
├── tokens.json                 Design tokens, W3C DTCG format
├── leadwalk-brand-assets.zip   Every asset below in one download
│
├── assets-site/index.html      Static, CDN-free asset download page (light/dark)
├── concepts/                   The three logo directions + 16/32/64/512 px test renders
├── svg/                        20 master vectors
│   ├── symbol{,-dark,-mono-black,-mono-white,-currentcolor}.svg
│   ├── wordmark{…}.svg              (text converted to outlines)
│   ├── logo-horizontal{…}.svg
│   └── logo-stacked{…}.svg
├── png/                        Rasters for every common aspect ratio
│   ├── 1-1/                    512 / 1024 / 2048 — transparent symbol, light, dark
│   ├── 4-5/ 3-4/ 4-3/          1080×1350 · 1200×1600 · 1600×1200
│   ├── 16-9/                   1920×1080 and 3840×2160
│   ├── 9-16/                   1080×1920 — Reels / Stories / Shorts
│   ├── 2-1/ 3-1/ 1.91-1/       Banner · X header · Open Graph
│   ├── avatar/                 400×400, circle-crop safe
│   └── logo-{horizontal,stacked}-transparent.png
├── favicon/                    favicon.ico (16–256, 6 layers), favicon.svg, 16/32 PNG,
│                               apple-touch-icon, android-chrome 192/512, maskable 512,
│                               site.webmanifest
├── webp/                       Lightweight web versions of the key assets
├── social/                     og-preview 1200×630 · twitter-header 1500×500 · avatar 400×400
└── tools/
    ├── build-brand-kit.mjs     The whole pipeline (Node, no system dependencies)
    └── fonts/                  Plus Jakarta Sans WOFF subsets + OFL licence
```

## Rebuild

```bash
node brand/tools/build-brand-kit.mjs
```

```bash
node brand/tools/build-brand-kit.mjs --output-dir /some/other/folder
```

Requirements: Node 22.6+ (it imports `shared/brand.ts` directly; type
stripping is on by default in Node 24) and the repo's dev dependencies
(`npm install`): `sharp` renders the rasters, `opentype.js` converts the
wordmark to outlines from `@fontsource/plus-jakarta-sans`.

The default run also refreshes the app's favicon set and `og-image.png` in
`public/`. The build is deterministic — the same inputs give byte-identical
SVGs and the same ZIP.

## Changing the brand

Edit `shared/brand.ts` (name, taglines, colours, mark geometry), run the
build, and update `BRAND.md` if the rules changed. The in-app logo
(`app/components/BrandMark.vue`) reads the same geometry, so it updates with
no extra step.

## Viewing the asset page

Open `brand/assets-site/index.html` in a browser, or:

```bash
npx serve brand
```
