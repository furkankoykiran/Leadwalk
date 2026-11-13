<script setup lang="ts">
// The brand symbol drawn inline so it inherits the theme: `tone="brand"`
// uses the accent tile, `tone="current"` follows the surrounding text colour
// (monochrome). Source of truth for the artwork: brand/svg/symbol*.svg.
import { BRAND } from '#shared/brand'

withDefaults(defineProps<{ size?: number; wordmark?: boolean; tone?: 'brand' | 'current' }>(), {
  size: 32,
  wordmark: true,
  tone: 'brand',
})
</script>

<template>
  <span class="inline-flex items-center gap-2.5">
    <BrandMark :size="size" :tone="tone" />
    <span v-if="wordmark" class="font-extrabold tracking-tight text-ink" :style="{ fontSize: `${Math.round(size * 0.62)}px` }">{{ BRAND.name }}</span>
  </span>
</template>
