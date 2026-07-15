import { type Ref } from 'vue'
import type { UserCalendarDay } from '@bookorbit/types'

import { fetchUserReadingCalendar } from '../api/statistics.api'
import { useStatisticsQuery } from './useStatisticsQuery'

const EMPTY: UserCalendarDay[] = []

export function useUserReadingCalendar(year: Ref<number>, month: Ref<number>) {
  return useStatisticsQuery({
    initialData: EMPTY,
    fetcher: (filters) => fetchUserReadingCalendar(filters, year.value, month.value),
    extraWatchSources: [() => year.value, () => month.value],
  })
}
