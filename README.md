# 歷史人物對話劇場 · History Theater

> 選兩位世界史名人，看兩個 AI 各自扮演他們、依隨機主題自動展開一場有立場、有交鋒的對話小劇場；使用者可隨時插話或純觀看。

把 LLM 真正接進 Nuxt 前端：**multi-agent 編排、SSE 串流 UI、多供應商容錯、成本權衡**

> ⚠️ **誠實免責**：對話由 LLM 生成，內容為 AI 想像、可能與史實不符，僅供娛樂與學習。準確度的收斂方案見 [Roadmap](#roadmap)。

## Demo

- 🔗 Live：https://history-theater.vercel.app/

## 功能

- 兩個 AI 各演一人、依隨機主題輪流自動對話
- 逐字串流輸出，依人物「手速」呈現自然打字節奏
- 金鑰只在後端 server route，不進前端 bundle
- Gemini 主 / Groq 備，額度用盡自動切換並於 UI 標示
- 使用者可隨時插話暫停、純觀看，對話 8–14 句自然收尾，可中止
- 依生卒年重疊篩選同代人物，非同代則進跨時空模式

## 技術棧

- **前端**：Nuxt 4（Vue 3 + TypeScript）、Tailwind CSS v4（Vite plugin）
- **後端**：Nuxt Nitro server route（`server/api/*`）當代理層
- **LLM**：Google Gemini（`gemini-2.5-flash`）主、Groq（`llama-3.3-70b-versatile`）備
- **其他**：`opencc-js`（簡→繁字形正規化）
- **套件管理**：pnpm

## 架構與關鍵技術決策

```text
① 瀏覽器 chat.vue
      │  POST /api/chat（人設＋歷史＋主題＋收尾階段）
      ▼
② Nitro server route（代理層，金鑰只在這裡）
      │  斷路器檢查 → 選供應商（Gemini 主／Groq 備）
      ▼
③ Gemini / Groq
      │  SSE 文字增量
      ▼
④ Nitro server route
      │  sseToText：轉成統一純文字流（＋ X-Provider 標頭）
      ▼
⑤ 瀏覽器 chat.vue
         OpenCC 簡→繁 → 打字機逐字浮現
```

- **server route 代理層**：金鑰只在後端（`runtimeConfig`），前端永遠打自己的 `/api/chat`，避免金鑰進前端 bundle 被盜用。
- **多代理人編排與上下文管理**：前端 `runConversation()` 控制輪替與收尾，每輪只帶最近數句歷史（滑動視窗，控 token 成本）＋對手人設讓對話接得上；人物的 `thesis`／`tensions` 組成結構化 prompt，對話才有立場、有交鋒。
- **SSE 串流與打字機解耦**：後端把兩家 SSE 統一成純文字流，前端邊收邊放緩衝、打字機逐字吐出——下載與顯示解耦，第一個字快速出現以降低感知延遲。
- **多供應商 fallback + circuit breaker**：先 Gemini、失敗改 Groq（都掛拋 502、不吞錯）；Gemini 連續失敗開 10 分鐘斷路避免白敲，期滿再探測，用哪家由 `X-Provider` 標頭回傳給前端顯示。
- **免費層成本權衡**：選每日重置額度的免費層（非試用金），避免額度燒光、demo 沒得用；以每句控短、節奏延遲、8–14 句自動收尾控制用量。
- **語言處理**：串流入緩衝前用 OpenCC 簡→繁保證字形，外語雜訊交給 prompt 約束；不硬刪拉丁字母以免誤刪正當英文。

## 本機執行

需 Node 20+ 與 pnpm。

```bash
pnpm install

# 設定金鑰（兩者擇一即可運作，建議都設以啟用 fallback）
cp .env.example .env
# 編輯 .env：
#   NUXT_GEMINI_API_KEY=...   # https://aistudio.google.com/apikey
#   NUXT_GROQ_API_KEY=...     # https://console.groq.com/keys

pnpm dev          # http://localhost:3000
```

其他指令：`pnpm build`（production build）、`pnpm preview`（本機預覽 build 結果）。

## 專案結構

```
app/
  pages/index.vue      選人卡片牆（同代排序、最多選 2）
  pages/chat.vue       聊天室：編排、串流接收、打字機、插話/收尾/中止
  data/figures.ts      人物資料（bio / thesis / tensions / pace）
  data/topics.ts       對話主題
  utils/era.ts         生卒年區間重疊判斷
server/
  api/chat.post.ts     LLM 代理層：prompt 組裝、SSE 轉接、供應商 fallback
```

## Roadmap

- **RAG grounding**：以檢索到的史料約束生成，收緊史實準確度（LLM 不可能 100% 正確，故先以誠實免責管理預期、再以 RAG 收斂）。
- **跨時空模式深化**：不同時代人物相遇的語氣與情境彩蛋。

## 授權

僅供學習與作品集展示用途。歷史人物為公共領域人物；對話內容為 AI 生成，不代表其真實言論。
