// 離線預算知識庫向量：一次跑完、輸出 JSON、commit 進 repo，執行期不重算。
// 跑法：node --env-file=.env scripts/build-embeddings.ts
import { mkdir, writeFile } from 'node:fs/promises'
import { knowledge } from '../app/data/knowledge.ts'

const API_KEY = process.env.NUXT_GEMINI_API_KEY
if (!API_KEY) throw new Error('缺 NUXT_GEMINI_API_KEY（請確認 .env）')

const MODEL = 'gemini-embedding-001'
const DIM = 768 // MRL 截斷維度，省空間、夠用

// 截斷維度後 Gemini 不保證正規化，手動做 L2 正規化，cosine 才正確
function normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
  return v.map((x) => x / norm)
}

async function embedDocument(text: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': API_KEY!, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskType: 'RETRIEVAL_DOCUMENT', // 建庫用 DOCUMENT，查詢時才用 QUERY
        outputDimensionality: DIM,
        content: { parts: [{ text }] },
      }),
    },
  )
  if (!res.ok) throw new Error(`embed 失敗 HTTP ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as { embedding: { values: number[] } }
  return normalize(json.embedding.values)
}

const out: Array<{ figureId: string; text: string; source: string; vector: number[] }> = []
for (const [i, chunk] of knowledge.entries()) {
  const vector = await embedDocument(chunk.text)
  out.push({ ...chunk, vector })
  console.log(`[${i + 1}/${knowledge.length}] ${chunk.source} → ${vector.length} 維`)
}

const outUrl = new URL('../server/data/knowledge-embeddings.json', import.meta.url)
await mkdir(new URL('../server/data/', import.meta.url), { recursive: true })
await writeFile(outUrl, JSON.stringify(out, null, 2))
console.log(`✅ 已寫入 ${out.length} 筆 → server/data/knowledge-embeddings.json`)
