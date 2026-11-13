interface ConfirmOptions {
  title?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

// Empty strings fall back to the localised defaults in ConfirmDialog.vue.
const state = reactive({
  visible: false,
  message: '',
  title: '',
  confirmText: '',
  cancelText: '',
  danger: false,
})

let resolver: ((value: boolean) => void) | null = null

// Singleton state (module scope) so every caller shares one dialog instance,
// mounted once in app.vue, instead of native window.confirm().
export function useConfirm() {
  function confirmDialog(message: string, options: ConfirmOptions = {}): Promise<boolean> {
    resolver?.(false)
    state.message = message
    state.title = options.title ?? ''
    state.confirmText = options.confirmText ?? ''
    state.cancelText = options.cancelText ?? ''
    state.danger = options.danger ?? false
    state.visible = true
    return new Promise((resolve) => {
      resolver = resolve
    })
  }

  function respond(value: boolean) {
    state.visible = false
    resolver?.(value)
    resolver = null
  }

  return { state, confirmDialog, respond }
}
