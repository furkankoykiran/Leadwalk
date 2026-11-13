import type { UsageSummary } from '#shared/types/usage'

// Shared so that any page can refresh the sidebar meter right after a
// billable action (discovery, generation) without navigating.
export function useUsage() {
  const usage = useState<UsageSummary | null>('usage-summary', () => null)

  async function refreshUsage() {
    try {
      usage.value = await $fetch<UsageSummary>('/api/usage')
    } catch {
      // The meter is informational; a failed refresh must not break the page.
    }
  }

  return { usage, refreshUsage }
}
