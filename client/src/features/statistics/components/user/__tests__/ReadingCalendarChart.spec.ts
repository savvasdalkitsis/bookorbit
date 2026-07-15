import { mount, flushPromises } from '@vue/test-utils'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import type { UserCalendarDay } from '@bookorbit/types'

const mockRouterPush = vi.fn<(...args: unknown[]) => unknown>()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

const mockData = ref<UserCalendarDay[]>([])
const mockLoading = ref(false)
const mockError = ref(false)

vi.mock('@/features/statistics/composables/useUserReadingCalendar', () => ({
  useUserReadingCalendar: () => ({
    data: mockData,
    loading: mockLoading,
    error: mockError,
  }),
}))

vi.mock('@/features/statistics/composables/useStatisticsConfig', () => ({
  useStatisticsConfig: () => ({
    filters: ref({ libraryIds: [] }),
  }),
}))

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: { name: 'Tooltip', template: '<div><slot /></div>' },
  TooltipContent: { name: 'TooltipContent', template: '<div><slot /></div>' },
  TooltipTrigger: { name: 'TooltipTrigger', template: '<div><slot /></div>' },
}))

vi.mock('@/features/book/components/BookCoverImage.vue', () => ({
  default: {
    name: 'BookCoverImage',
    props: ['bookId', 'version', 'alt'],
    template: '<div class="book-cover-mock" :data-id="bookId" />',
  },
}))

import ReadingCalendarChart from '../ReadingCalendarChart.vue'

describe('ReadingCalendarChart', () => {
  beforeEach(() => {
    mockRouterPush.mockReset()
    mockData.value = []
    mockLoading.value = false
    mockError.value = false

    // Set a stable system date
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T12:00:00.000Z'))
  })

  it('renders the header and month navigation controls', () => {
    const wrapper = mount(ReadingCalendarChart)

    // Header should contain the localized current month name
    expect(wrapper.text()).toContain('July 2026')

    // Controls should have previous, current/today, and next buttons
    expect(wrapper.find('button[type="button"]').exists()).toBe(true)
  })

  it('generates the correct calendar grid matching Mon-Sun layout', () => {
    const wrapper = mount(ReadingCalendarChart)

    const dayLabels = wrapper.findAll('.grid-cols-7 > div')
    const dayNames = dayLabels.map((lbl) => lbl.text().trim())
    expect(dayNames.slice(0, 7)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
  })

  it('displays book covers for days with read books', async () => {
    mockData.value = [
      {
        day: '2026-07-15',
        books: [{ id: 101, title: 'Test Book 101', updatedAt: '2026-07-15T10:00:00.000Z', isCompleted: false }],
      },
    ]

    const wrapper = mount(ReadingCalendarChart)
    await flushPromises()

    const cover = wrapper.find('.book-cover-mock')
    expect(cover.exists()).toBe(true)
    expect(cover.attributes('data-id')).toBe('101')
  })

  it('displays a grid when multiple books are read on a day', async () => {
    mockData.value = [
      {
        day: '2026-07-15',
        books: [
          { id: 101, title: 'Book 101', updatedAt: '2026-07-15T12:00:00.000Z', isCompleted: false },
          { id: 102, title: 'Book 102', updatedAt: '2026-07-15T12:00:00.000Z', isCompleted: false },
          { id: 103, title: 'Book 103', updatedAt: '2026-07-15T12:00:00.000Z', isCompleted: false },
          { id: 104, title: 'Book 104', updatedAt: '2026-07-15T12:00:00.000Z', isCompleted: false },
          { id: 105, title: 'Book 105', updatedAt: '2026-07-15T12:00:00.000Z', isCompleted: false },
        ],
      },
    ]

    const wrapper = mount(ReadingCalendarChart)
    await flushPromises()

    const covers = wrapper.findAll('.book-cover-mock')
    // Should show up to 4 covers in the grid
    expect(covers.length).toBe(4)

    // Should render a +N badge overlay (5 books total - 4 shown = +1 badge)
    expect(wrapper.text()).toContain('+1')
  })

  it('navigates to book details when a cover or the +N overlay is clicked', async () => {
    mockData.value = [
      {
        day: '2026-07-15',
        books: [
          { id: 101, title: 'Book 101', updatedAt: '2026-07-15T12:00:00.000Z', isCompleted: false },
          { id: 102, title: 'Book 102', updatedAt: '2026-07-15T12:00:00.000Z', isCompleted: false },
          { id: 103, title: 'Book 103', updatedAt: '2026-07-15T12:00:00.000Z', isCompleted: false },
          { id: 104, title: 'Book 104', updatedAt: '2026-07-15T12:00:00.000Z', isCompleted: false },
          { id: 105, title: 'Book 105', updatedAt: '2026-07-15T12:00:00.000Z', isCompleted: false },
        ],
      },
    ]

    const wrapper = mount(ReadingCalendarChart)
    await flushPromises()

    // Click first book cover button
    const coverBtn = wrapper.find('button[type="button"] .book-cover-mock')
    await coverBtn.trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'book-detail', params: { bookId: 101 } })

    // Click the +N overlay button which should navigate to the 4th book
    const plusBtn = wrapper.findAll('button').find((btn) => btn.text().includes('+1'))
    expect(plusBtn).toBeDefined()
    await plusBtn!.trigger('click')
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'book-detail', params: { bookId: 104 } })
  })

  it('allows moving between months', async () => {
    const wrapper = mount(ReadingCalendarChart)

    // Find prev button (first icon button in header)
    const buttons = wrapper.findAll('button')

    // Prev button is the first button in the markup
    await buttons[0].trigger('click')
    expect(wrapper.text()).toContain('June 2026')

    // Next button is the third button (prev is 0, current is 1, next is 2)
    await buttons[2].trigger('click') // back to July
    await buttons[2].trigger('click') // to August
    expect(wrapper.text()).toContain('August 2026')

    // Current button is the second button
    await buttons[1].trigger('click')
    expect(wrapper.text()).toContain('July 2026')
  })
})
