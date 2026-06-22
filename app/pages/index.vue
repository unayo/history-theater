<script setup lang="ts">
import { figures } from '~/data/figures'

const MAX_PICKS = 2

// 唯一資料源：目前選取的人物 id；其餘狀態都從這裡算出來
const selectedIds = ref<string[]>([])

function isSelected(id: string): boolean {
  return selectedIds.value.includes(id)
}

// 滿員時點未選的卡片不該有反應
function isDisabled(id: string): boolean {
  return !isSelected(id) && selectedIds.value.length >= MAX_PICKS
}

function toggle(id: string): void {
  if (isSelected(id)) {
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
  } else if (selectedIds.value.length < MAX_PICKS) {
    selectedIds.value.push(id)
  }
}

const canStart = computed(() => selectedIds.value.length === MAX_PICKS)
// 排序基準
const firstPick = computed(() => figures.find((f) => f.id === selectedIds.value[0]))

// 顯示用清單：尚未選人維持原序；選了第一人後，同代浮到最前
const sortedFigures = computed(() => {
  const anchor = firstPick.value
  if (!anchor) return figures
  return [...figures].sort(
    (a, b) => Number(overlaps(anchor, b)) - Number(overlaps(anchor, a)),
  )
})
// 聊天室路由
function start(): void {
  if (!canStart.value) return
  navigateTo(`/chat?ids=${selectedIds.value.join(',')}`)
}

// 西元前以負數存，顯示時轉成「前 N」
function formatYear(year: number): string {
  return year < 0 ? `前${-year}` : `${year}`
}
</script>

<template>
  <div class="min-h-screen bg-neutral-100 py-10 px-4 pb-28">
    <header class="mx-auto max-w-4xl text-center mb-8">
      <h1 class="text-3xl font-bold text-neutral-800">藝術家對話劇場</h1>
      <p class="mt-2 text-neutral-500">挑兩位藝術家，旁聽他們為各自的藝術主張交鋒</p>
    </header>

    <ul class="mx-auto max-w-4xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <li
        v-for="figure in sortedFigures"
        :key="figure.id"
        @click="toggle(figure.id)"
        :aria-pressed="isSelected(figure.id)"
        :class="[
          'flex gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 transition select-none',
          isSelected(figure.id)
            ? 'ring-2 ring-emerald-500'
            : 'ring-neutral-200',
          isDisabled(figure.id)
            ? 'opacity-40 cursor-not-allowed'
            : 'cursor-pointer hover:shadow-md',
        ]"
      >
        <!-- 還沒有肖像圖，先用名字首字當頭像 -->
        <div
          class="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xl font-semibold text-white"
        >
          {{ figure.name.slice(0, 1) }}
          <span
            v-if="isSelected(figure.id)"
            class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs text-emerald-600 ring-1 ring-emerald-500"
          >✓</span>
        </div>

        <div class="min-w-0">
          <h2 class="font-semibold text-neutral-800">{{ figure.name }}</h2>
          <p class="text-sm text-neutral-500">{{ figure.region }} ・ {{ figure.field }}</p>
          <p class="text-xs text-neutral-400">
            {{ formatYear(figure.birth) }} – {{ formatYear(figure.death) }}
          </p>
          <p class="mt-1 line-clamp-2 text-sm text-neutral-600">{{ figure.bio }}</p>
        </div>
      </li>
    </ul>

    <!-- 底部固定操作列 -->
    <div class="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white/90 backdrop-blur">
      <div class="mx-auto max-w-4xl flex items-center justify-between gap-4 px-4 py-3">
        <span class="text-sm text-neutral-500">
          已選 {{ selectedIds.length }} / {{ MAX_PICKS }}
        </span>
        <button
          @click="start"
          :disabled="!canStart"
          class="rounded-full px-6 py-2 font-semibold text-white transition enabled:bg-emerald-500 enabled:hover:bg-emerald-600 disabled:bg-neutral-300 disabled:cursor-not-allowed"
        >
          進聊天室
        </button>
      </div>
    </div>
  </div>
</template>
