<script setup lang="ts">
const { state, respond } = useConfirm()
const { t } = useI18n()
const confirmButton = ref<HTMLButtonElement | null>(null)

watch(() => state.visible, async (visible) => {
  if (visible) {
    await nextTick()
    confirmButton.value?.focus()
  }
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') respond(false)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="state.visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @keydown="onKeydown"
      @click.self="respond(false)"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        class="bg-surface border border-line rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-5"
      >
        <div>
          <h3 id="confirm-title" class="font-bold text-ink text-lg">{{ state.title || t('common.areYouSure') }}</h3>
          <p id="confirm-message" class="text-sm text-ink-2 mt-1.5 leading-relaxed">{{ state.message }}</p>
        </div>
        <div class="flex gap-2 justify-end">
          <button
            type="button"
            class="px-4 py-2.5 rounded-xl border border-line-strong text-ink-2 text-sm font-semibold hover:bg-subtle transition cursor-pointer"
            @click="respond(false)"
          >
            {{ state.cancelText || t('common.cancel') }}
          </button>
          <button
            ref="confirmButton"
            type="button"
            class="px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer"
            :class="state.danger ? 'bg-danger text-white hover:opacity-90' : 'bg-accent text-on-accent hover:bg-accent-hover'"
            @click="respond(true)"
          >
            {{ state.confirmText || t('common.confirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
