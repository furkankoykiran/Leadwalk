import type { DailyUsage } from '#shared/types/usage'

// Shared so that any page can refresh the sidebar counter right after a
// billable action. Previously the layout only reloaded it on route changes,
// so a generation on the detail page (which never navigates) left the
// "üretim" count stale until the user clicked somewhere else.
export function useUsage() {
  const usage = useState<DailyUsage | null>('daily-usage', () => null)

  async function refreshUsage() {
    try {
      usage.value = await $fetch<DailyUsage>('/api/usage')
    } catch {
      // The counter is informational; a failed refresh must not break the page.
    }
  }

  return { usage, refreshUsage }
}
