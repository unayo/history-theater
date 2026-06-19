// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // 不放進 public → 只有 server route 讀得到，金鑰不進前端 bundle
  runtimeConfig: {
    geminiApiKey: '', // NUXT_GEMINI_API_KEY 覆寫（主 provider）
    groqApiKey: '', // NUXT_GROQ_API_KEY 覆寫（備援）
  },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
})
