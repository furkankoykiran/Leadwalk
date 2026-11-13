import type { Activity } from '#shared/types/business'

/** Human sentence for one activity entry, in the UI language. */
export function useActivityText() {
  const { t } = useI18n()
  const { dateTime } = useFormat()

  function activityText(activity: Activity): string {
    switch (activity.type) {
      case 'status':
        return t('activity.status', { status: activity.to_status ? t(`status.${activity.to_status}`) : '' })
      case 'follow_up':
        return t('activity.follow_up', { date: dateTime(activity.body) })
      case 'note':
        return activity.body ?? ''
      default:
        return t(`activity.${activity.type}`)
    }
  }

  return { activityText }
}
