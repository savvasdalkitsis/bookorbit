<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, BookCheck, BookOpen } from '@lucide/vue'

import BookCoverImage from '@/features/book/components/BookCoverImage.vue'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import ChartCard from '../ChartCard.vue'
import { useUserReadingCalendar } from '../../composables/useUserReadingCalendar'

const router = useRouter()
const { t } = useI18n()

const now = new Date()
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1) // 1-based (1-12)

const { data, loading, error } = useUserReadingCalendar(year, month)

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const booksByDay = computed(() => {
  const map = new Map()
  if (Array.isArray(data.value)) {
    for (const item of data.value) {
      map.set(item.day, item.books)
    }
  }
  return map
})

const currentMonthLabel = computed(() => {
  const date = new Date(year.value, month.value - 1, 1)
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
})

const calendarCells = computed(() => {
  const cells = []

  // Previous month filler days
  const prevMonthYear = month.value === 1 ? year.value - 1 : year.value
  const prevMonthVal = month.value === 1 ? 12 : month.value - 1
  const daysInPrevMonth = new Date(prevMonthYear, prevMonthVal, 0).getDate()

  const firstDayIndex = new Date(year.value, month.value - 1, 1).getDay()
  // getDay returns 0 for Sunday, 1 for Monday... we want Mon=0 ... Sun=6
  const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1

  for (let i = startOffset - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const dayKey = `${prevMonthYear}-${String(prevMonthVal).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({
      day: d,
      key: dayKey,
      isCurrentMonth: false,
      books: booksByDay.value.get(dayKey) ?? [],
      isToday: false,
    })
  }

  // Current month days
  const daysInCurrentMonth = new Date(year.value, month.value, 0).getDate()
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const dayKey = `${year.value}-${String(month.value).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({
      day: d,
      key: dayKey,
      isCurrentMonth: true,
      books: booksByDay.value.get(dayKey) ?? [],
      isToday: dayKey === todayKey,
    })
  }

  // Next month filler days to complete standard grid (35 or 42 cells)
  const nextMonthYear = month.value === 12 ? year.value + 1 : year.value
  const nextMonthVal = month.value === 12 ? 1 : month.value + 1
  const totalCells = cells.length <= 35 ? 35 : 42
  const nextDaysCount = totalCells - cells.length
  for (let d = 1; d <= nextDaysCount; d++) {
    const dayKey = `${nextMonthYear}-${String(nextMonthVal).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({
      day: d,
      key: dayKey,
      isCurrentMonth: false,
      books: booksByDay.value.get(dayKey) ?? [],
      isToday: false,
    })
  }

  return cells
})

function formatCellDate(dateStr: string) {
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function handlePrevMonth() {
  if (month.value === 1) {
    month.value = 12
    year.value -= 1
  } else {
    month.value -= 1
  }
}

function handleNextMonth() {
  if (month.value === 12) {
    month.value = 1
    year.value += 1
  } else {
    month.value += 1
  }
}

function handleCurrentMonth() {
  const current = new Date()
  year.value = current.getFullYear()
  month.value = current.getMonth() + 1
}

function handleNavigateToBook(bookId: number) {
  void router.push({ name: 'book-detail', params: { bookId } })
}
</script>

<template>
  <ChartCard
    :title="t('statistics.charts.readingCalendar.title')"
    :icon="CalendarIcon"
    :color-index="1"
    :loading="loading"
    :error="error"
    :empty="false"
  >
    <div class="flex h-full flex-col">
      <!-- Month navigation header -->
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-foreground select-none">
          {{ currentMonthLabel }}
        </h3>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="hover:bg-accent rounded p-1 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
            @click="handlePrevMonth"
          >
            <ChevronLeft class="size-4" />
          </button>
          <button
            type="button"
            class="hover:bg-accent border border-border rounded px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
            @click="handleCurrentMonth"
          >
            Current
          </button>
          <button
            type="button"
            class="hover:bg-accent rounded p-1 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
            @click="handleNextMonth"
          >
            <ChevronRight class="size-4" />
          </button>
        </div>
      </div>

      <!-- Calendar grid -->
      <div class="flex min-h-0 flex-1 flex-col select-none">
        <!-- Week day labels -->
        <div class="mb-1.5 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <div v-for="dayName in dayNames" :key="dayName" class="py-1">
            {{ dayName }}
          </div>
        </div>

        <!-- Cells grid -->
        <div class="grid flex-1 min-h-0 grid-cols-7 gap-1">
          <div
            v-for="cell in calendarCells"
            :key="cell.key"
            :class="[
              'relative flex flex-col items-center justify-center overflow-hidden rounded-md border border-border/40 bg-muted/5 transition-colors',
              cell.isCurrentMonth ? 'text-foreground' : 'bg-muted/2 text-muted-foreground opacity-30',
              cell.isToday ? 'ring-primary ring-offset-background z-20 ring-2 ring-offset-2' : '',
            ]"
          >
            <!-- Day number overlay badge -->
            <span
              :class="[
                'absolute top-1 left-1 z-10 flex size-5 items-center justify-center rounded-full text-[9px] font-bold shadow-sm',
                cell.isToday ? 'bg-primary text-primary-foreground' : 'bg-background/85 text-foreground backdrop-blur-[2px]',
              ]"
            >
              {{ cell.day }}
            </span>

            <!-- Books read content -->
            <div class="size-full">
              <template v-if="cell.books.length === 1">
                <div class="relative size-full">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <button
                        type="button"
                        class="size-full hover:scale-105 active:scale-95 cursor-pointer overflow-hidden transition-all duration-200"
                        @click="handleNavigateToBook(cell.books[0].id)"
                      >
                        <BookCoverImage
                          :book-id="cell.books[0].id"
                          :version="cell.books[0].updatedAt"
                          class="size-full object-cover"
                          :alt="cell.books[0].title || ''"
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent class="bg-popover text-popover-foreground border border-border shadow-md">
                      <div class="text-xs space-y-1 p-1">
                        <p class="font-semibold">{{ cell.books[0].title || 'Untitled' }}</p>
                        <p class="text-muted-foreground flex items-center gap-1.5">
                          <component
                            :is="cell.books[0].isCompleted ? BookCheck : BookOpen"
                            class="size-3.5"
                            :class="cell.books[0].isCompleted ? 'text-emerald-500' : 'text-blue-500'"
                          />
                          <span>
                            {{
                              cell.books[0].isCompleted
                                ? t('statistics.charts.readingCalendar.completed')
                                : t('statistics.charts.readingCalendar.inProgress')
                            }}
                            on {{ formatCellDate(cell.key) }}
                          </span>
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <!-- Read Status Overlay Badge -->
                  <div class="absolute top-1.5 right-1.5 z-10 flex items-center justify-center rounded-full bg-black/60 p-1 pointer-events-none">
                    <component
                      :is="cell.books[0].isCompleted ? BookCheck : BookOpen"
                      class="size-3"
                      :class="cell.books[0].isCompleted ? 'text-emerald-500' : 'text-blue-500'"
                    />
                  </div>
                </div>
              </template>
              <template v-else-if="cell.books.length > 1">
                <div class="grid size-full grid-cols-2 grid-rows-2 gap-0.5">
                  <Tooltip v-for="(book, index) in cell.books.slice(0, 4)" :key="book.id">
                    <TooltipTrigger as-child>
                      <div class="relative size-full overflow-hidden bg-muted/10">
                        <button
                          type="button"
                          class="size-full hover:scale-105 active:scale-95 cursor-pointer transition-all duration-200"
                          @click="handleNavigateToBook(book.id)"
                        >
                          <BookCoverImage :book-id="book.id" :version="book.updatedAt" class="size-full object-cover" :alt="book.title || ''" />
                        </button>
                        <!-- Read Status Overlay Badge -->
                        <div
                          class="absolute top-0.5 right-0.5 z-10 flex items-center justify-center rounded-full bg-black/60 p-0.5 pointer-events-none"
                        >
                          <component
                            :is="book.isCompleted ? BookCheck : BookOpen"
                            class="size-2"
                            :class="book.isCompleted ? 'text-emerald-500' : 'text-blue-500'"
                          />
                        </div>
                        <!-- Overlay "+N" on the 4th item if books > 4 -->
                        <button
                          v-if="index === 3 && cell.books.length > 4"
                          type="button"
                          class="absolute inset-0 flex cursor-pointer select-none items-center justify-center bg-black/70 text-[10px] font-bold text-white transition-colors hover:bg-black/60"
                          @click="handleNavigateToBook(book.id)"
                        >
                          +{{ cell.books.length - 4 }}
                        </button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent class="bg-popover text-popover-foreground border border-border shadow-md">
                      <div class="text-xs space-y-1 p-1">
                        <p class="font-semibold">{{ book.title || 'Untitled' }}</p>
                        <p class="text-muted-foreground flex items-center gap-1.5">
                          <component
                            :is="book.isCompleted ? BookCheck : BookOpen"
                            class="size-3.5"
                            :class="book.isCompleted ? 'text-emerald-500' : 'text-blue-500'"
                          />
                          <span>
                            {{
                              book.isCompleted ? t('statistics.charts.readingCalendar.completed') : t('statistics.charts.readingCalendar.inProgress')
                            }}
                            on {{ formatCellDate(cell.key) }}
                          </span>
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <!-- If less than 4 books, fill empty slots -->
                  <div
                    v-for="i in Math.max(0, 4 - cell.books.length)"
                    :key="'empty-' + i"
                    class="size-full rounded-sm border border-dashed border-border/10 bg-muted/5"
                  />
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ChartCard>
</template>
