<script setup lang="ts">
import { figures, type Figure } from '~/data/figures'
import { randomTopic, type Topic } from '~/data/topics'
import * as OpenCC from 'opencc-js'

// 強制簡→繁（台灣字形）：壓掉 llama 偶爾漏出的簡體字。
// 其他語言（如越南文雜訊）交給後端 prompt 約束，不在前端硬刪——以免誤刪正當英文（公式/符號/專名）。
const toTraditional = OpenCC.Converter({ from: 'cn', to: 'tw' })

const route = useRoute()

// query.ids 型別是 string | string[] | undefined，先正規化成乾淨 id 陣列
const ids = computed<string[]>(() => {
  const raw = route.query.ids
  return typeof raw === 'string' ? raw.split(',').filter(Boolean) : []
})

// id 對回人物；查不到的（幽靈 id）用型別守衛濾掉，確保陣列裡都是真 Figure
const participants = computed(() =>
  ids.value
    .map((id) => figures.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => f != null),
)

// 守衛：有效人物不是剛好 2 位（單人/空/全是幽靈 id）→ 導回選人頁，壞網址不留歷史
watchEffect(() => {
  if (participants.value.length !== 2) navigateTo('/', { replace: true })
})

// 兩人生卒年重疊＝正常同代；否則＝跨時空模式，供後端切換語氣
const mode = computed<'normal' | 'crosstime'>(() => {
  const [a, b] = participants.value
  return a && b && overlaps(a, b) ? 'normal' : 'crosstime'
})

interface Message {
  speakerId: string // 人物 id，或 'me' 代表使用者
  text: string
}
// 收尾三階段：愈接近結束語氣愈強（降溫→總結→道別），讓結束有鋪陳而非突兀切斷
type ClosingStage = 'winding' | 'summary' | 'farewell'
const messages = ref<Message[]>([])
const loading = ref(false)
// 本場隨機主題：在 onMounted（client）抽，避免 SSR 與 client 抽到不同值造成 hydration 不一致
const topic = ref<Topic | null>(null)
const ended = ref(false) // 對話正常聊完→顯示結束標記（出錯/中止不算）
const stopped = ref(false) // 使用者主動中止對話
let controller: AbortController | null = null // 當前請求的中止控制器

// 本場最近一句的供應商（後端 X-Provider 標頭）；header 徽章用，讓主備 fallback 在 UI 看得見
type Provider = 'gemini' | 'groq'
const provider = ref<Provider | ''>('')
const PROVIDER_META: Record<Provider, { label: string; cls: string }> = {
  gemini: { label: 'Gemini', cls: 'bg-blue-50 text-blue-600 ring-blue-100' },
  groq: { label: 'Groq', cls: 'bg-orange-50 text-orange-600 ring-orange-100' },
}
// 空字串時回 null，讓模板能用 v-if 收掉、索引對照表時型別也安全
const providerMeta = computed(() => (provider.value ? PROVIDER_META[provider.value] : null))

// 自動收尾：每場對話長度落在 [MIN, MAX] 隨機一個結束點，到了就停（也防失控狂打額度）
const MIN_MESSAGES = 8
const MAX_MESSAGES = 14
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// 動態打字節奏（純前端、不碰 API）
// ① 人物手速：依 pace 取基礎間隔；pace 沒填則當 normal（?? 補預設）
const PACE_DELAY: Record<NonNullable<Figure['pace']>, number> = { slow: 105, normal: 70, fast: 45 }
// ③ 隨機抖動：每字實際間隔在基礎值上下浮動(×0.75~1.25)，破除節拍器般的機械感
const charDelay = (base: number) => base * (0.75 + Math.random() * 0.5)
// ④ 句間停頓依「剛說完那句」長度：越長越久(讀者要時間消化)，夾在 1.2~4 秒
const pausePerMessage = (len: number) => Math.min(4000, 1200 + len * 45)
const figureName = (id: string) => figures.find((f) => f.id === id)?.name ?? '使用者'

// 插話暫停：真人聚焦輸入框→暫停自動對話並顯示「…」；離開後再緩衝 RESUME_DELAY 才恢復
const RESUME_DELAY = 3000
const inputFocused = ref(false)
const lastTypingAt = ref(0)
// 閘門：在輸入中（聚焦）或剛離開未滿緩衝時間 → 卡住，不發下一句
async function waitForUserIdle(): Promise<void> {
  while (inputFocused.value || Date.now() - lastTypingAt.value < RESUME_DELAY) {
    await delay(150)
  }
}

// 讓指定人物說下一句：帶人設＋歷史呼叫後端，串流逐字補進泡泡。成功回 true，失敗/中止回 false 讓迴圈停下
async function speak(speaker: Figure, closing?: ClosingStage): Promise<boolean> {
  loading.value = true
  const opp = participants.value.find((p) => p.id !== speaker.id) // 對手，用來帶入衝突焦點
  // 先放一個空泡泡，串流到的字逐步填進去（i＝它的索引）
  const i = messages.value.push({ speakerId: speaker.id, text: '' }) - 1
  controller = new AbortController() // 供使用者中止這次請求
  let streamDone = false // 提到 try 外：錯誤/中止時也能讓打字迴圈收掉、不空轉
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        speaker: {
          name: speaker.name,
          bio: speaker.bio,
          speakingStyle: speaker.speakingStyle,
          region: speaker.region,
          thesis: speaker.thesis, // 核心立場，讓 AI 有立場可辯
        },
        // 對手：名字＋這位 speaker 對他的衝突焦點（沒寫的配對 tension 為 undefined，後端走 fallback）
        opponent: { name: opp?.name, tension: opp ? speaker.tensions?.[opp.id] : undefined },
        // 歷史只取空泡泡之前的訊息
        history: messages.value.slice(0, i).map((m) => ({ name: figureName(m.speakerId), text: m.text })),
        crosstime: mode.value === 'crosstime',
        topic: topic.value?.prompt, // 本場主題，讓兩人對話有共同焦點
        closing, // 收尾階段（沒傳＝還在聊），尾聲時請 AI 漸進收束
      }),
    })
    if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
    // 記錄本句實際供應商：徽章即時反映主備切換（標頭缺漏時沿用上一個值，不清空）
    provider.value = (res.headers.get('X-Provider') as Provider) || provider.value

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = '' // 已收到但還沒「打」出來的字

    // 打字機迴圈：與下載解耦，依人物手速一次吐一個字（被中止則立即停）
    const base = PACE_DELAY[speaker.pace ?? 'normal']
    const typing = (async () => {
      while ((!streamDone || buffer.length > 0) && !stopped.value) {
        const cur = messages.value[i]
        if (cur && buffer) {
          cur.text += buffer[0]
          buffer = buffer.slice(1)
        }
        await delay(charDelay(base))
      }
    })()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      // 進緩衝前先簡→繁，打字機吐出來的從頭就是繁體（不會先閃簡體再變）
      buffer += toTraditional(decoder.decode(value, { stream: true }))
    }
    streamDone = true
    await typing // 等緩衝區剩餘的字都打完

    const cur = messages.value[i]
    if (cur && !cur.text.trim()) cur.text = '（沒有回覆）'
    return true
  } catch (err) {
    streamDone = true // 讓打字迴圈收掉，避免中止/錯誤後空轉
    const cur = messages.value[i]
    if (stopped.value || (err as Error).name === 'AbortError') {
      // 使用者主動中止 → 不是錯誤：留下已打出的字，沒字就移除空泡泡
      if (cur && !cur.text.trim()) messages.value.splice(i, 1)
    } else if (cur) {
      // 真錯誤不吞：顯示成泡泡，回 false 中止迴圈，避免出錯後繼續狂打 API
      cur.text = `⚠️ 取得回覆失敗：${(err as Error).message}`
    }
    return false
  } finally {
    loading.value = false
    controller = null
  }
}

// 編排：A 開場後兩人輪流，由「不是上一句說話者」決定下一個發言人，直到達句數上限
async function runConversation(): Promise<void> {
  const [a] = participants.value
  if (!a) return
  // 本場結束點：區間內隨機，使每場長短不同
  const endAt = MIN_MESSAGES + Math.floor(Math.random() * (MAX_MESSAGES - MIN_MESSAGES + 1))
  while (messages.value.length < endAt) {
    if (stopped.value) return // 使用者已中止：停止編排，不標「對話結束」
    await waitForUserIdle() // 真人插話時暫停；等他離開輸入框且緩衝過後才發下一句
    const lastId = messages.value.at(-1)?.speakerId
    const next =
      messages.value.length === 0 ? a : participants.value.find((p) => p.id !== lastId) ?? a
    // 依「距結束還剩幾句（含這句）」決定收尾階段，讓結尾逐步降溫
    const remaining = endAt - messages.value.length
    const closing: ClosingStage | undefined =
      remaining <= 1 ? 'farewell' : remaining === 2 ? 'summary' : remaining === 3 ? 'winding' : undefined
    const ok = await speak(next, closing)
    if (!ok) return // 出錯：speak 已顯示錯誤泡泡，直接停且不標「對話結束」
    // 句間停頓依剛說完那句的長度：長句停久，像讓對方讀完再回（也給真人插話空檔）
    await delay(pausePerMessage(messages.value.at(-1)?.text.length ?? 0))
  }
  ended.value = true // 正常聊完才標結束
}

// 使用者主動中止：取消進行中的請求＋讓編排迴圈停下
function stop(): void {
  stopped.value = true
  controller?.abort()
}

// 結束/中止後換個主題重新開聊
function restart(): void {
  messages.value = []
  ended.value = false
  stopped.value = false
  topic.value = randomTopic()
  runConversation()
}

// 自動捲到底：新訊息/逐字增長時跟住最新對話。
// 分寸：只在「原本就貼底」時才捲——使用者主動往上滾看歷史時不硬拉回去。
const NEAR_BOTTOM_PX = 120
watch(
  messages,
  () => {
    // flush 預設 'pre'：此刻 DOM 還沒長高，先判斷使用者原本是否貼底
    const atBottom =
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - NEAR_BOTTOM_PX
    if (atBottom) nextTick(() => window.scrollTo({ top: document.documentElement.scrollHeight }))
  },
  { deep: true }, // 逐字增長改的是 messages[i].text，要深層偵測
)

// onMounted 只在瀏覽器執行一次：避免 SSR 期間也打 API（省額度、不重複計費），也不會重入
onMounted(() => {
  if (participants.value.length !== 2) return
  topic.value = randomTopic()
  runConversation()
})

const draft = ref('')
const inputEl = ref<HTMLInputElement | null>(null)
function send(): void {
  const text = draft.value.trim()
  if (!text) return
  messages.value.push({ speakerId: 'me', text })
  draft.value = ''
  lastTypingAt.value = Date.now() // 送出也算剛互動過，恢復前再緩衝一下
  inputEl.value?.blur() // 打完即移除聚焦 → 觸發 blur → 緩衝後恢復對話
}
// 中文 IME 組字中的 Enter 是「確認候選字」不是送出，用 isComposing 擋掉
function onEnter(e: KeyboardEvent): void {
  if (e.isComposing) return
  send()
}
function onInputFocus(): void {
  inputFocused.value = true
  lastTypingAt.value = Date.now()
}
function onInputBlur(): void {
  inputFocused.value = false
  lastTypingAt.value = Date.now()
}
function onInputType(): void {
  lastTypingAt.value = Date.now()
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-neutral-100">
    <!-- 頂部參與者列 -->
    <header class="sticky top-0 border-b border-neutral-200 bg-white/90 py-3 backdrop-blur">
      <div class="mx-auto flex w-full max-w-2xl flex-col gap-1 px-4">
        <div class="flex items-center gap-3">
          <NuxtLink to="/" class="shrink-0 text-neutral-400 hover:text-neutral-600">←</NuxtLink>
          <div class="flex shrink-0 items-center gap-2">
            <span
              v-for="p in participants"
              :key="p.id"
              class="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white"
            >{{ p.name.slice(0, 1) }}</span>
          </div>
          <!-- min-w-0 才能讓長人名觸發 truncate（flex 子項預設不收縮） -->
          <h1 class="min-w-0 truncate font-semibold text-neutral-800">
            {{ participants.map((p) => p.name).join(' × ') }}
          </h1>
          <button
            v-if="!ended && !stopped"
            @click="stop"
            class="ml-auto shrink-0 rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-500 transition hover:bg-neutral-100"
          >
            停止
          </button>
        </div>
        <p v-if="topic" class="pl-1 text-xs text-neutral-500">
          今天的話題：<span class="font-medium text-emerald-600">{{ topic.label }}</span> — {{ topic.prompt }}
        </p>
        <!-- 供應商徽章：成本透明化、展示主備 fallback -->
        <p v-if="providerMeta" class="flex flex-wrap items-center gap-1 pl-1 text-xs text-neutral-400">
          本場由
          <span :class="['inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ring-1', providerMeta.cls]">
            ⚡ {{ providerMeta.label }}
          </span>
          生成 · 全程免費層，主供應商額度用盡時自動切換備援
        </p>
      </div>
    </header>

  <!-- 對話區 -->
    <main class="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-6">
      <!-- 誠實免責：LLM 會幻覺、無法保證史實，先以產品手段管理預期 -->
      <p class="mx-auto max-w-md rounded-lg bg-amber-50 px-4 py-2 text-center text-xs leading-relaxed text-amber-700 ring-1 ring-amber-100">
        ⚠️ 以下是 AI 想像的對話，內容可能與史實不符，僅供娛樂與學習。
      </p>

      <div
        v-for="(msg, i) in messages"
        :key="i"
        :class="['flex items-end gap-2', msg.speakerId === 'me' ? 'flex-row-reverse' : '']"
      >
        <!-- 我自己的訊息不顯示頭像（LINE 慣例） -->
        <span
          v-if="msg.speakerId !== 'me'"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white"
        >
          {{ figures.find((f) => f.id === msg.speakerId)?.name.slice(0, 1) }}
        </span>

        <div :class="['max-w-[75%]', msg.speakerId === 'me' ? 'text-right' : '']">
          <!-- 群組裡別人的訊息要標名字，我自己的不用 -->
          <p v-if="msg.speakerId !== 'me'" class="mb-1 text-xs text-neutral-500">
            {{ figures.find((f) => f.id === msg.speakerId)?.name }}
          </p>
          <p
            :class="[
              'inline-block rounded-2xl px-4 py-2 shadow-sm',
              msg.speakerId === 'me'
                ? 'bg-emerald-500 text-white'
                : 'bg-white text-neutral-800',
            ]"
          >
            <!-- 還沒收到第一個字＝AI 思考中，顯示跳動點當 loading -->
            <template v-if="msg.text">{{ msg.text }}</template>
            <span v-else class="inline-flex gap-1 py-1">
              <span class="h-2 w-2 animate-bounce rounded-full bg-neutral-300 [animation-delay:-0.3s]"></span>
              <span class="h-2 w-2 animate-bounce rounded-full bg-neutral-300 [animation-delay:-0.15s]"></span>
              <span class="h-2 w-2 animate-bounce rounded-full bg-neutral-300"></span>
            </span>
          </p>
        </div>
      </div>
      <!-- 真人聚焦輸入框時：使用者側冒出「…」打字泡泡，同時自動對話已暫停 -->
      <div v-if="inputFocused" class="flex flex-row-reverse items-end gap-2">
        <p class="inline-flex gap-1 rounded-2xl bg-emerald-500 px-4 py-3 shadow-sm">
          <span class="h-2 w-2 animate-bounce rounded-full bg-white/80 [animation-delay:-0.3s]"></span>
          <span class="h-2 w-2 animate-bounce rounded-full bg-white/80 [animation-delay:-0.15s]"></span>
          <span class="h-2 w-2 animate-bounce rounded-full bg-white/80"></span>
        </p>
      </div>
      <!-- 對話正常聊完 / 使用者中止：標示狀態並可重新開始 -->
      <div v-if="ended || stopped" class="flex flex-col items-center gap-3 pt-4">
        <p class="text-xs text-neutral-400">{{ ended ? '—— 對話結束 ——' : '—— 已停止 ——' }}</p>
        <button
          @click="restart"
          class="rounded-full border border-emerald-500 px-5 py-1.5 text-sm font-medium text-emerald-600 transition hover:bg-emerald-50"
        >
          {{ ended ? '換個主題重聊' : '重新開始' }}
        </button>
      </div>
    </main>
    <!-- 輸入區 -->
    <footer class="sticky bottom-0 border-t border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur">
      <div class="mx-auto max-w-2xl flex gap-2">
        <input
          ref="inputEl"
          v-model="draft"
          @keydown.enter="onEnter"
          @focus="onInputFocus"
          @blur="onInputBlur"
          @input="onInputType"
          placeholder="輸入訊息..."
          class="flex-1 rounded-full border border-neutral-300 bg-white py-2 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <button
          @click="send"
          class="rounded-full bg-emerald-500 px-6 py-2 font-semibold text-white transition hover:bg-emerald-600"
        >
          送出
        </button>
      </div>
    </footer>
  </div>
</template>