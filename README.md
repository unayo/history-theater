# 歷史人物對話劇場 · History Theater

> 選兩位名人（如畫家林布蘭與維梅爾），看兩個 AI 各自扮演他們、用白話展開一場有立場、有交鋒的對話；並以 **RAG 檢索史料 grounding**，讓你邊看邊學到歷史與藝術知識。使用者可隨時插話或純觀看。

把 LLM 真正接進 Nuxt 前端：**RAG 史料 grounding、multi-agent 編排、SSE 串流 UI、多供應商容錯、成本權衡**

> ⚠️ **誠實免責**：對話由 LLM 生成。本專案以 RAG 檢索史料 grounding、收緊準確度，但 LLM 仍不可能 100% 正確，內容僅供娛樂與學習輔助，**非權威教材**。

## Demo

- 🔗 Live：https://history-theater.vercel.app/

<!-- TODO: 補一張操作 GIF（選人 → 對話串流 → 展開「📚 依據」） -->

## 功能

- **RAG 史料 grounding**：發言前檢索該人物的相關史料注入 prompt，壓制幻覺；每句附「📚 依據」出處可查證（白話學習導向）
- 兩個 AI 各演一人、依主題輪流自動對話，有立場、有交鋒
- 逐字串流輸出，依人物「手速」呈現自然打字節奏
- 金鑰只在後端 server route，不進前端 bundle
- Gemini 主 / Groq 備，額度用盡自動切換並於 UI 標示
- 使用者可隨時插話暫停、純觀看，對話 8–14 句自然收尾，可中止
- 依生卒年重疊篩選同代人物，非同代則進跨時空模式

## 技術棧

- **前端**：Nuxt 4（Vue 3 + TypeScript）、Tailwind CSS v4（Vite plugin）
- **後端**：Nuxt Nitro server route（`server/api/*`）當代理層
- **LLM**：Google Gemini（`gemini-2.5-flash`）主、Groq（`llama-3.3-70b-versatile`）備
- **RAG**：Google `gemini-embedding-001`（768 維、離線預算成 JSON）＋ cosine 相似度檢索
- **其他**：`opencc-js`（簡→繁字形正規化）
- **套件管理**：pnpm

## 架構與關鍵技術決策

```text
① 瀏覽器 chat.vue
      │  POST /api/chat（人設＋歷史＋主題＋收尾階段）
      ▼
② Nitro server route（代理層，金鑰只在這裡）
      │  RAG：embedQuery 算 query 向量 → 知識庫 cosine top-k → 注入【史料根據】
      │  斷路器檢查 → 選供應商（Gemini 主／Groq 備）
      ▼
③ Gemini / Groq
      │  SSE 文字增量
      ▼
④ Nitro server route
      │  sseToText：轉成統一純文字流（＋ X-Provider／X-Sources 標頭）
      ▼
⑤ 瀏覽器 chat.vue
         OpenCC 簡→繁 → 打字機逐字浮現；X-Sources → 顯示「📚 依據」出處
```

- **RAG 史料 grounding**：每次發言前用「主題＋最近對話」算 query 向量（`gemini-embedding-001`，taskType `RETRIEVAL_QUERY`），與離線預算好的知識庫向量做 cosine top-k，撈出該人物最相關的史料注入 prompt 的【史料根據】，要求據此用白話講、不可捏造；出處經 `X-Sources` 回傳前端顯示。embedding 與對話額度分開，**檢索失敗則跳過 RAG、對話照常（不單點故障）**。知識庫向量離線算好存 JSON（規模小、線性 cosine，不需向量資料庫）。
- **server route 代理層**：金鑰只在後端（`runtimeConfig`），前端永遠打自己的 `/api/chat`，避免金鑰進前端 bundle 被盜用。
- **多代理人編排與上下文管理**：前端 `runConversation()` 控制輪替與收尾，每輪只帶最近數句歷史（滑動視窗，控 token 成本）＋對手人設讓對話接得上；人物的 `thesis`／`tensions` 組成結構化 prompt，對話才有立場、有交鋒。
- **SSE 串流與打字機解耦**：後端把兩家 SSE 統一成純文字流，前端邊收邊放緩衝、打字機逐字吐出——下載與顯示解耦，第一個字快速出現以降低感知延遲。
- **多供應商 fallback + circuit breaker**：先 Gemini、失敗改 Groq（都掛拋 502、不吞錯）；Gemini 連續失敗開 10 分鐘斷路避免白敲，期滿再探測，用哪家由 `X-Provider` 標頭回傳給前端顯示。
- **免費層成本權衡**：選每日重置額度的免費層（非試用金），避免額度燒光、demo 沒得用；以每句控短、節奏延遲、8–14 句自動收尾控制用量。
- **語言處理**：串流入緩衝前用 OpenCC 簡→繁保證字形，外語雜訊交給 prompt 約束；不硬刪拉丁字母以免誤刪正當英文。

## 本機執行

需 Node 22+ 與 pnpm。

```bash
pnpm install

# 設定金鑰（兩者擇一即可運作，建議都設以啟用 fallback）
cp .env.example .env
# 編輯 .env：
#   NUXT_GEMINI_API_KEY=...   # https://aistudio.google.com/apikey
#   NUXT_GROQ_API_KEY=...     # https://console.groq.com/keys

pnpm dev          # http://localhost:3000
```

改了 RAG 知識庫（`app/data/knowledge.ts`）才需重建向量（一次性、需 Gemini key）：

```bash
node --env-file=.env scripts/build-embeddings.ts
```

其他指令：`pnpm build`（production build）、`pnpm preview`（本機預覽 build 結果）。

## 專案結構

```
app/
  pages/index.vue      選人卡片牆（同代排序、最多選 2）
  pages/chat.vue       聊天室：編排、串流接收、打字機、插話/收尾/中止、「📚 依據」出處
  data/figures.ts      人物資料（bio / thesis / tensions / pace）
  data/knowledge.ts    RAG 知識庫（史料 chunk：figureId / text / source）
  data/topics.ts       對話主題
  utils/era.ts         生卒年區間重疊判斷
server/
  api/chat.post.ts     LLM 代理層：RAG 檢索 → prompt 組裝、SSE 轉接、供應商 fallback
  utils/rag.ts         RAG 檢索：embedQuery、cosine 相似度、top-k
  data/knowledge-embeddings.json   離線預算好的知識庫向量
scripts/
  build-embeddings.ts  離線把知識庫算成向量（一次性，改 knowledge.ts 後重跑）
```

## Roadmap

- **更多藝術家對與題材**：目前已有「光影」（林布蘭↔維梅爾）、「寫實 vs 想像」（梵谷↔高更），可續擴。
- **跨時空模式深化**：不同時代人物相遇的語氣與情境彩蛋。
- **UI 顯示畫作**：對話搭配人物代表作，強化視覺與學習。

## 授權

僅供學習與作品集展示用途。歷史人物為公共領域人物；對話內容為 AI 生成，不代表其真實言論。
