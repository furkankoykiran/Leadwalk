<script setup lang="ts">
import type { Business } from '#shared/types/business'

const route = useRoute()

const NAV_ITEMS = [
  { to: '/discover', label: 'Keşfet', icon: 'search' },
  { to: '/businesses', label: 'İşletmeler', icon: 'list' },
  { to: '/map', label: 'Harita', icon: 'map' },
]

// /map and /discover are both map-first pages that want the full available
// width and height; every other page stays readable at a fixed max width.
const needsFullHeight = computed(() => route.path === '/map' || route.path === '/discover')
const isFullWidthPage = needsFullHeight

const { usage, refreshUsage: loadUsage } = useUsage()
const clearing = ref(false)
const { confirmDialog } = useConfirm()

async function clearAll() {
  const list = await $fetch<Business[]>('/api/businesses')
  if (list.length === 0) return
  const ok = await confirmDialog(
    `${list.length} işletmeyi kalıcı olarak silmek istediğine emin misin? Bu işlem geri alınamaz.`,
    { confirmText: 'Hepsini Sil', danger: true },
  )
  if (!ok) return

  clearing.value = true
  try {
    await $fetch('/api/businesses', { method: 'DELETE' })
    window.location.reload()
  } finally {
    clearing.value = false
  }
}

onMounted(loadUsage)
watch(() => route.fullPath, loadUsage)
</script>

<template>
  <div class="h-screen flex bg-zinc-950">
    <aside class="w-64 shrink-0 border-r border-zinc-800 bg-zinc-900/50 flex flex-col overflow-y-auto">
      <div class="p-6 flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-zinc-950 font-bold text-sm">
          P
        </div>
        <p class="text-lg font-bold text-zinc-100 tracking-tight">ProspectForge</p>
      </div>

      <nav class="flex-1 px-3 space-y-1">
        <NuxtLink
          v-for="item in NAV_ITEMS"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition"
          :class="route.path.startsWith(item.to) ? 'bg-amber-500/10 text-amber-400' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'"
        >
          <AppIcon :name="item.icon" class="w-4.5 h-4.5" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <div v-if="usage" class="mx-3 mb-3 p-3.5 rounded-xl bg-zinc-800/50 text-xs text-zinc-400 space-y-2">
        <p class="font-medium text-zinc-300">Bugün kullanım</p>
        <p class="flex items-center gap-1.5"><AppIcon name="search" class="w-3.5 h-3.5" /> {{ usage.discover_count }} arama</p>
        <p class="flex items-center gap-1.5"><AppIcon name="sparkles" class="w-3.5 h-3.5" /> {{ usage.process_count }} üretim</p>
      </div>

      <button
        type="button"
        class="mx-3 mb-3 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 transition text-left disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        :disabled="clearing"
        @click="clearAll"
      >
        <AppIcon name="trash" class="w-3.5 h-3.5" />
        {{ clearing ? 'Siliniyor…' : 'Tümünü Temizle' }}
      </button>

      <div class="p-4 text-xs text-zinc-600">ProspectForge</div>
    </aside>

    <main class="flex-1" :class="needsFullHeight ? 'p-6 overflow-hidden' : 'p-10 overflow-y-auto'">
      <div
        :class="[
          needsFullHeight ? 'h-full' : '',
          isFullWidthPage ? 'w-full' : 'max-w-6xl mx-auto',
        ]"
      >
        <slot />
      </div>
    </main>
  </div>
</template>
