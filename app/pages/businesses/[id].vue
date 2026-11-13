<script setup lang="ts">
import type { Activity, Business } from '#shared/types/business'

const route = useRoute()
const { t } = useI18n()
const id = Number(route.params.id)

const business = ref<Business | null>(null)
const activities = ref<Activity[]>([])
const notFound = ref(false)

useHead({ title: () => business.value?.name ?? t('nav.leads') })

async function load() {
  try {
    const [b, a] = await Promise.all([
      $fetch<Business>(`/api/businesses/${id}`),
      $fetch<Activity[]>(`/api/businesses/${id}/activities`),
    ])
    business.value = b
    activities.value = a
  } catch {
    notFound.value = true
  }
}

async function refreshActivities() {
  activities.value = await $fetch<Activity[]>(`/api/businesses/${id}/activities`)
}

function handleUpdated(updated: Business) {
  business.value = updated
  refreshActivities()
}

onMounted(load)
</script>

<template>
  <div class="space-y-5">
    <NuxtLink to="/businesses" class="inline-flex items-center gap-2 -ml-2 px-3 py-2 rounded-lg text-sm font-bold text-ink-2 hover:text-accent hover:bg-subtle transition">
      <AppIcon name="arrow-left" class="w-4 h-4" />
      {{ t('detail.back') }}
    </NuxtLink>

    <p v-if="notFound" class="text-muted">{{ t('detail.notFound') }}</p>
    <div v-else-if="!business" class="h-48 rounded-2xl bg-surface border border-line animate-pulse" aria-busy="true" />
    <BusinessDetail
      v-else
      :business="business"
      :activities="activities"
      @updated="handleUpdated"
      @activities="activities = $event"
    />
  </div>
</template>
