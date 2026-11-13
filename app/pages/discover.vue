<script setup lang="ts">
import type { DiscoverResponse } from '#shared/types/business'

const { t, locale } = useI18n()
const { refreshUsage } = useUsage()
useHead({ title: () => t('nav.discover') })

const pinnedCoords = ref<{ lat: number; lng: number } | null>(null)
const address = ref('')
const radiusMeters = ref(1000)
const category = ref('')
const discovering = ref(false)
const message = ref<string | null>(null)

const categoryOptions = computed(() => categoryOptionsList(locale.value))

// A typed address wins over the pin: typing is a deliberate action, and the
// server geocodes it. Either one is enough to search.
const trimmedAddress = computed(() => address.value.trim())
const canDiscover = computed(() => !discovering.value && (!!trimmedAddress.value || !!pinnedCoords.value))

async function discover() {
  if (!canDiscover.value) return
  discovering.value = true
  message.value = null
  const shared = { radiusMeters: radiusMeters.value, category: category.value || undefined }
  try {
    const result = await $fetch<DiscoverResponse>('/api/discover', {
      method: 'POST',
      body: trimmedAddress.value
        ? { location: trimmedAddress.value, ...shared }
        : { lat: pinnedCoords.value?.lat, lng: pinnedCoords.value?.lng, ...shared },
    })
    if (result.count > 0) {
      await navigateTo({ path: '/businesses', query: { found: result.count, new: result.new_count } })
    } else {
      message.value = result.message ?? null
    }
  } catch (error) {
    message.value = errorMessage(error, t('discover.failed'))
  } finally {
    discovering.value = false
    refreshUsage()
  }
}
</script>

<template>
  <div class="h-full flex flex-col gap-4">
    <div>
      <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">{{ t('discover.title') }}</h1>
      <p class="text-muted text-sm mt-1">{{ t('discover.subtitle') }}</p>
    </div>

    <div class="bg-surface border border-line rounded-3xl p-4 sm:p-5 flex flex-col flex-1 min-h-0 gap-4">
      <LocationPicker v-model:coords="pinnedCoords" :radius-meters="radiusMeters" class="flex-1 min-h-0" />

      <form class="flex flex-wrap items-end gap-3" @submit.prevent="discover">
        <label class="flex-1 min-w-[220px] flex flex-col gap-1 text-xs font-semibold text-muted">
          {{ t('discover.addressLabel') }}
          <input v-model="address" type="text" :placeholder="t('discover.addressPlaceholder')" class="px-3.5 py-2.5 rounded-xl border border-line-strong bg-surface text-sm text-ink placeholder:text-muted" data-testid="discover-address">
        </label>
        <label class="flex flex-col gap-1 text-xs font-semibold text-muted">
          {{ t('discover.radius') }}
          <select v-model.number="radiusMeters" class="px-3 py-2.5 rounded-xl border border-line-strong bg-surface text-sm text-ink cursor-pointer" data-testid="discover-radius">
            <option :value="500">500 m</option>
            <option :value="1000">1 km</option>
            <option :value="3000">3 km</option>
            <option :value="5000">5 km</option>
          </select>
        </label>
        <label class="flex flex-col gap-1 text-xs font-semibold text-muted">
          {{ t('discover.category') }}
          <select v-model="category" class="w-56 px-3 py-2.5 rounded-xl border border-line-strong bg-surface text-sm text-ink cursor-pointer" data-testid="discover-category">
            <option value="">{{ t('discover.allCategories') }}</option>
            <option v-for="opt in categoryOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </label>
        <button
          type="submit"
          class="px-7 py-2.5 rounded-xl bg-accent text-on-accent font-bold hover:bg-accent-hover disabled:opacity-50 transition cursor-pointer disabled:cursor-not-allowed"
          :disabled="!canDiscover"
          data-testid="discover-submit"
        >
          {{ discovering ? t('discover.searching') : t('discover.submit') }}
        </button>
      </form>
      <p v-if="message" class="text-sm font-semibold text-ink-2" role="status" data-testid="discover-message">{{ message }}</p>
      <p class="text-xs text-muted">{{ t('discover.costHint') }}</p>
    </div>
  </div>
</template>
