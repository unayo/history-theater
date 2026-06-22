// RAG 檢索：把 query 算成向量，跟知識庫做 cosine，取發言者本人最相關的前 k 條。
import knowledgeEmbeddings from '../data/knowledge-embeddings.json' with { type: 'json' }

interface EmbeddedChunk { figureId: string; text: string; source: string; vector: number[] }
const chunks = knowledgeEmbeddings as EmbeddedChunk[]

const MODEL = 'gemini-embedding-001'
const DIM = 768

function normalize(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
  return v.map((x) => x / norm)
}

// 兩向量皆已 L2 正規化 → cosine 相似度 = 內積
function cosine(a: number[], b: number[]): number {
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!
  return dot
}

export async function embedQuery(apiKey: string, text: string): Promise<number[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskType: 'RETRIEVAL_QUERY', // 查詢用 QUERY，與建庫的 DOCUMENT 配對
        outputDimensionality: DIM,
        content: { parts: [{ text }] },
      }),
    },
  )
  if (!res.ok) throw new Error(`embedQuery 失敗 HTTP ${res.status}`)
  const json = (await res.json()) as { embedding: { values: number[] } }
  return normalize(json.embedding.values)
}

export interface RetrievedSource { text: string; source: string }

export function retrieve(queryVec: number[], figureId: string, k = 3): RetrievedSource[] {
  return chunks
    .filter((c) => c.figureId === figureId) // 只撈發言者本人的史料，避免串味
    .map((c) => ({ chunk: c, score: cosine(queryVec, c.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ chunk }) => ({ text: chunk.text, source: chunk.source }))
}
