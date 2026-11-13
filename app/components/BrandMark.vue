<script setup lang="ts">
// The Leadwalk mark, from the same geometry the brand kit is built from
// (shared/brand.ts). `tone="brand"` = accent tile with a light glyph;
// `tone="current"` = monochrome in the surrounding text colour, glyph
// knocked out. Below 48 px the target ring is dropped (as in the favicon).
import { MARK } from '#shared/brand'

const props = withDefaults(defineProps<{ size?: number; tone?: 'brand' | 'current' }>(), { size: 32, tone: 'brand' })
const full = computed(() => props.size >= 48)
const dotR = computed(() => (full.value ? MARK.target.dot : MARK.target.dotSmall))
const maskId = `lw-mark-${useId()}`
</script>

<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${MARK.size} ${MARK.size}`" fill="none" aria-hidden="true" focusable="false" class="shrink-0">
    <template v-if="tone === 'brand'">
      <rect :width="MARK.size" :height="MARK.size" :rx="MARK.radius" fill="var(--accent)" />
      <path :d="MARK.route" :stroke-width="MARK.routeWidth" stroke="var(--on-accent)" stroke-linecap="round" stroke-linejoin="round" />
      <circle v-if="full" :cx="MARK.target.cx" :cy="MARK.target.cy" :r="MARK.target.ring" :stroke-width="MARK.target.ringWidth" stroke="var(--on-accent)" />
      <circle :cx="MARK.target.cx" :cy="MARK.target.cy" :r="dotR" fill="var(--on-accent)" />
    </template>
    <template v-else>
      <mask :id="maskId">
        <rect :width="MARK.size" :height="MARK.size" fill="#fff" />
        <path :d="MARK.route" :stroke-width="MARK.routeWidth" stroke="#000" stroke-linecap="round" stroke-linejoin="round" />
        <circle v-if="full" :cx="MARK.target.cx" :cy="MARK.target.cy" :r="MARK.target.ring" :stroke-width="MARK.target.ringWidth" stroke="#000" />
        <circle :cx="MARK.target.cx" :cy="MARK.target.cy" :r="dotR" fill="#000" />
      </mask>
      <rect :width="MARK.size" :height="MARK.size" :rx="MARK.radius" fill="currentColor" :mask="`url(#${maskId})`" />
    </template>
  </svg>
</template>
