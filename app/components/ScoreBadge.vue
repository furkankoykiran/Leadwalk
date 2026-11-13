<script setup lang="ts">
import type { ScoreBand } from '#shared/utils/opportunity'

const props = withDefaults(defineProps<{ score: number; band: ScoreBand; size?: 'sm' | 'md' }>(), { size: 'md' })
const { t } = useI18n()

const classes = computed(() => ({
  hot: 'bg-accent-soft text-accent-ink',
  warm: 'bg-warm-soft text-warm-ink',
  cold: 'bg-subtle text-muted',
}[props.band]))
</script>

<template>
  <span
    class="shrink-0 inline-flex items-center justify-center rounded-xl font-extrabold tabular"
    :class="[classes, size === 'sm' ? 'w-9 h-9 text-[13px]' : 'w-11 h-11 text-[15px]']"
    :title="`${t('score.label')}: ${score} · ${t(`score.${band}`)}`"
    :aria-label="`${t('score.label')} ${score}, ${t(`score.${band}`)}`"
  >
    {{ score }}
  </span>
</template>
