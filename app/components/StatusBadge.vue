<script setup lang="ts">
import type { BusinessStatus } from '#shared/types/business'

defineProps<{ status: BusinessStatus }>()
const { t } = useI18n()
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap"
    :style="{ background: `var(--st-${status}-bg)`, color: `var(--st-${status}-fg)` }"
  >
    <span class="w-1.5 h-1.5 rounded-full" :style="{ background: `var(--st-${status}-dot)` }" />
    {{ t(`status.${status}`) }}
  </span>
</template>
