// 多供應商串流對話端點：持續吐文字增量供前端逐字浮現（降低感知延遲）。
// 策略：先 Gemini（斷路冷卻中則跳過），失敗 fallback Groq；用哪家放 X-Provider 標頭。

import { embedQuery, retrieve, type RetrievedSource } from '../utils/rag'

interface ReqBody {
  speaker?: { id?: string; name?: string; bio?: string; speakingStyle?: string; region?: string; thesis?: string }
  opponent?: { name?: string; tension?: string } // 對手名字＋這位 speaker 對他的衝突焦點
  history?: Array<{ name: string; text: string }>
  crosstime?: boolean
  topic?: string // 本場聊天主題（前端隨機抽好傳來），作為對話的共同方向
  closing?: 'winding' | 'summary' | 'farewell' // 收尾階段（前端依進度給），語氣由弱到強
}

// 兩家串流回傳的 JSON 片段結構（只取得到文字的路徑，欄位全選擇性）
interface GeminiChunk {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
}
interface GroqChunk {
  choices?: Array<{ delta?: { content?: string } }>
}

const GEMINI_MODEL = 'gemini-2.5-flash'
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const HISTORY_LIMIT = 8

// 簡易 circuit breaker：Gemini 失敗就開斷路，冷卻期內直接走 Groq，期滿自動再探測
const GEMINI_COOLDOWN_MS = 10 * 60 * 1000
let geminiCooldownUntil = 0

function buildSystemInstruction(
  s: NonNullable<ReqBody['speaker']>,
  crosstime: boolean,
  opponent: NonNullable<ReqBody['opponent']> = {},
  sources: RetrievedSource[] = [],
): string {
  // 沒寫該配對的衝突焦點時給通用 fallback，避免「分歧」一段開天窗
  const tension = opponent.tension ?? '請自行找出你與對方在立場或價值上的根本分歧，並據此交鋒。'
  const conflictBlock = opponent.name ? `【你與${opponent.name}的分歧】${tension}\n` : ''
  // 5b 把 RAG 檢索到的史料貼成【史料根據】，要求據此發言、別超範圍亂編（壓制幻覺）
  const groundingBlock = sources.length
    ? '【史料根據】以下是與本題相關的史實，請「根據這些」用白話講清楚，不要捏造超出範圍的細節：\n' +
      sources.map((src) => `- ${src.text}（${src.source}）`).join('\n') +
      '\n'
    : ''
  const crosstimeRule = crosstime ? '\n- 你和對方其實來自不同時代，可帶點跨越時空相遇的驚奇。' : ''
  return (
    `你正在扮演藝術家「${s.name}」（${s.region}）。\n\n` +
    `【背景】${s.bio}\n` +
    `【你的核心立場】${s.thesis}\n` +
    conflictBlock +
    groundingBlock +
    `【你的說話風格】${s.speakingStyle}\n\n` +
    `【對話規則】\n` +
    `- 第一人稱，完全以這個人物的身分、知識與時代語氣發言。\n` +
    `- 像在向好奇的學習者解說：用淺白的現代白話把道理講明白，但仍保持你的身分與個性。\n` +
    `- 引用你具體的經歷、作品或主張來支撐論點，不要空泛抒情、不要講大道理。\n` +
    `- 每次回應要推進討論：提出新觀點、反問對方、或帶入新視角，別只附和。\n` +
    `- 立場與對方不同時就直說、不假意附和；可以承認對方有理之處，但最後仍堅守你的核心立場。\n` +
    `- 保持你的說話風格與口頭禪，別越聊越中性。\n` +
    `- 每次只回一到兩句、約 60 字內，口語自然，像在群組聊天。\n` +
    `- 一律以繁體中文發言；僅在必要時可用公認的英文專有名詞或科學符號，但絕不可夾雜越南文、拼音或其他外語，也不可使用簡體字。\n` +
    `- 只輸出這句話本身，不要寫出你的名字、不要旁白、不要加引號。` +
    crosstimeRule
  )
}

// 把 provider 回傳的 SSE 位元流，轉成「只含純文字增量」的位元流給前端。
// extract：從每筆 SSE JSON 取出這次新增的文字（兩家結構不同，用 callback 區分）。
function sseToText(
  body: ReadableStream<Uint8Array>,
  extract: (json: unknown) => string,
): ReadableStream<Uint8Array> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read()
      if (done) {
        controller.close()
        return
      }
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? '' // 最後一段可能不完整，留到下次
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue // 跳過 SSE 註解/keep-alive 行
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') {
          controller.close()
          return
        }
        try {
          const piece = extract(JSON.parse(data))
          if (piece) controller.enqueue(encoder.encode(piece))
        } catch {
          // data 非完整 JSON（極少數 keep-alive）→ 略過，不是真錯誤
        }
      }
    },
    cancel() {
      reader.cancel()
    },
  })
}

async function streamGemini(key: string, system: string, userText: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }],
      }),
    },
  )
  if (!res.ok || !res.body) throw new Error(`Gemini HTTP ${res.status}`)
  return sseToText(res.body, (j) => (j as GeminiChunk).candidates?.[0]?.content?.parts?.[0]?.text ?? '')
}

async function streamGroq(key: string, system: string, userText: string) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_MODEL,
      stream: true,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userText },
      ],
    }),
  })
  if (!res.ok || !res.body) throw new Error(`Groq HTTP ${res.status}`)
  return sseToText(res.body, (j) => (j as GroqChunk).choices?.[0]?.delta?.content ?? '')
}

export default defineEventHandler(async (event) => {
  const { geminiApiKey, groqApiKey } = useRuntimeConfig()
  const { speaker, opponent, history = [], crosstime = false, topic, closing } = await readBody<ReqBody>(event)
  if (!speaker?.name) {
    throw createError({ statusCode: 400, statusMessage: '缺少 speaker' })
  }

  const recent = history.slice(-HISTORY_LIMIT)

  // 5a 發言前先用「主題＋最近對話」檢索此人物的相關史料；5e 失敗就跳過、照常聊（不讓 RAG 變單點故障）
  let sources: RetrievedSource[] = []
  if (geminiApiKey && speaker.id) {
    try {
      const recentText = recent.map((m) => m.text).join(' ')
      const query = `${topic ?? ''} ${recentText}`.trim() || speaker.name!
      const queryVec = await embedQuery(geminiApiKey, query)
      sources = retrieve(queryVec, speaker.id, 3)
    } catch (err) {
      console.warn(`[chat] RAG 檢索失敗，跳過 grounding：${(err as Error).message}`)
    }
  }

  const system = buildSystemInstruction(speaker, crosstime, opponent, sources)
  const transcript = recent.map((m) => `${m.name}：${m.text}`).join('\n')
  const topicLine = topic ? `這場對話的主題是「${topic}」，請圍繞它發展。\n` : ''
  // 收尾三階段：愈接近結束指示愈強，讓對話逐步降溫、最後一句明確只道別
  const CLOSING_LINE: Record<NonNullable<ReqBody['closing']>, string> = {
    winding: '\n話題接近尾聲了，請放慢節奏、別再展開大的新論點。',
    summary: '\n對話快結束了，請為這段聊天做個簡短的總結或回應，準備收束。',
    farewell:
      '\n這是這段對話的最後一句。請「只」說一句簡短自然的告別語作結（如道珍重、後會有期），絕不要再提問、不要開啟新話題、不要長篇總結。',
  }
  const closingLine = closing ? CLOSING_LINE[closing] : ''
  const userText =
    (recent.length === 0
      ? `${topicLine}請以你的身分說一句開場白，自然地開啟這段對話。`
      : `${topicLine}這是目前的對話：\n${transcript}\n\n現在輪到你（${speaker.name}）回應，接著說下一句。`) +
    closingLine

  let stream: ReadableStream<Uint8Array> | null = null
  let provider = ''

  // 主 provider：Gemini（斷路關閉時才試）
  if (geminiApiKey && Date.now() >= geminiCooldownUntil) {
    try {
      stream = await streamGemini(geminiApiKey, system, userText)
      provider = 'gemini'
    } catch (geminiErr) {
      geminiCooldownUntil = Date.now() + GEMINI_COOLDOWN_MS
      console.warn(
        `[chat] Gemini 失敗，開啟 ${GEMINI_COOLDOWN_MS / 60000} 分鐘斷路、改走 Groq：${(geminiErr as Error).message}`,
      )
    }
  }

  // 備援 provider：Groq
  if (!stream) {
    if (!groqApiKey) throw createError({ statusCode: 502, statusMessage: '無可用 provider（缺 Groq key）' })
    try {
      stream = await streamGroq(groqApiKey, system, userText)
      provider = 'groq'
    } catch (groqErr) {
      throw createError({ statusCode: 502, statusMessage: `Groq 失敗：${(groqErr as Error).message}` })
    }
  }

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'X-Provider', provider) // 前端可讀，得知這句由誰生成
  // 5d 把 RAG 出處夾在標頭傳回前端（中文需 encode 才能放 header），下一步畫面顯示「📚 依據」
  setHeader(event, 'X-Sources', encodeURIComponent(JSON.stringify(sources)))
  return stream
})
