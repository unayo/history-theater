// RAG 知識庫：每條 chunk = 一個自足的光影知識點，供檢索後注入 prompt（壓制幻覺）。
// figureId 限定檢索範圍（只撈發言者本人的史料）；source 會顯示在畫面當「📚 依據」。

export interface KnowledgeChunk {
  figureId: string
  text: string   // 白話知識點，學習導向
  source: string // 出處，供畫面顯示與誠實標註
}

export const knowledge: KnowledgeChunk[] = [
  // ── 林布蘭：戲劇性光影 ──
  {
    figureId: 'rembrandt',
    text: '林布蘭常讓光從一側斜照臉部，在另一側臉頰下方留下一個小小的倒三角形亮塊。後世攝影界把這種打光稱為「林布蘭光」，至今仍是人像攝影的經典手法。',
    source: '人像打光「林布蘭光」技法',
  },
  {
    figureId: 'rembrandt',
    text: '他大量運用明暗對照法（chiaroscuro）：讓主角沐浴在光裡、其餘部分沒入黑暗，用強烈的明暗對比把觀者的視線引導到畫面最重要的地方。',
    source: '林布蘭明暗對照技法',
  },
  {
    figureId: 'rembrandt',
    text: '《夜巡》打破當時群像排排站的慣例，用戲劇性的光影製造動態：隊長與身旁人物被光打亮、後方人物沒入陰影，像舞台上凝結的一瞬。',
    source: '林布蘭《夜巡》(1642)',
  },
  {
    figureId: 'rembrandt',
    text: '對林布蘭而言，光不是為了照亮場景，而是為了凸顯人物的內心與戲劇張力，因此常被形容為「靈魂的光」。',
    source: '林布蘭藝術理念',
  },
  {
    figureId: 'rembrandt',
    text: '他一生畫了大量自畫像，用光記錄自己從意氣風發到晚年滄桑，光影成為他剖析自我的工具。',
    source: '林布蘭自畫像系列',
  },
  {
    figureId: 'rembrandt',
    text: '他的陰影並非死黑，而是用透明顏料層層罩染，讓暗部仍保有層次與微光，黑暗因此有了深度。',
    source: '林布蘭罩染技法',
  },
  {
    figureId: 'rembrandt',
    text: '他偏好設定單一主要光源，像聚光燈一樣集中照射，營造出彷彿戲劇舞台的氛圍。',
    source: '林布蘭用光特色',
  },
  {
    figureId: 'rembrandt',
    text: '《杜爾博士的解剖課》把光集中在蒼白的屍體與圍觀者專注的臉上，將觀者的注意力牢牢釘在這場知識的戲劇上。',
    source: '林布蘭《杜爾博士的解剖課》(1632)',
  },
  {
    figureId: 'rembrandt',
    text: '破產與喪親之後，他晚年的光更內斂深沉、筆觸厚重，光影成為承載人生重量的媒介。',
    source: '林布蘭晚期風格',
  },
  {
    figureId: 'rembrandt',
    text: '他把巴洛克的明暗對照推向情感深度，影響後世無數畫家，乃至今日電影與攝影的打光美學。',
    source: '林布蘭的影響',
  },

  // ── 維梅爾：自然柔和窗光 ──
  {
    figureId: 'vermeer',
    text: '維梅爾的畫幾乎都有一扇位於左側的窗，柔和的日光從那裡灑進室內，是他畫面的標誌性特徵。',
    source: '維梅爾用光特色',
  },
  {
    figureId: 'vermeer',
    text: '《倒牛奶的女僕》中，日光從左窗照在女僕與牛奶上，他用細小的亮點表現麵包與陶器表面的粗糙質感，光彷彿有了重量。',
    source: '維梅爾《倒牛奶的女僕》(約1658)',
  },
  {
    figureId: 'vermeer',
    text: '他在物體受光處點上細小的顏料亮點（pointillé），模擬光在表面閃爍的真實感，這種觀察可能來自暗箱呈現的光學效果。',
    source: '維梅爾點狀高光技法',
  },
  {
    figureId: 'vermeer',
    text: '學者推測他借助暗箱（camera obscura）觀察光與透視，這讓他對光的漫射與柔焦有近乎照相般的敏感。',
    source: '維梅爾與暗箱',
  },
  {
    figureId: 'vermeer',
    text: '《戴珍珠耳環的少女》的珍珠其實只是兩筆——一筆柔光、一筆反光，卻精準捕捉了光在珠面上的真實表現。',
    source: '維梅爾《戴珍珠耳環的少女》(約1665)',
  },
  {
    figureId: 'vermeer',
    text: '維梅爾不為戲劇而扭曲光，而是耐心描摹日光如何在牆面、地磚、織物上自然地漫開。',
    source: '維梅爾藝術理念',
  },
  {
    figureId: 'vermeer',
    text: '他用光細膩區分不同材質——金屬的反光、織物的柔光、牆面的漫射，讓觀者幾乎能觸摸到質感。',
    source: '維梅爾質感表現',
  },
  {
    figureId: 'vermeer',
    text: '柔和均勻的自然光營造出安靜、日常、近乎凝止的氛圍，恰與巴洛克的戲劇張力相反。',
    source: '維梅爾畫面氛圍',
  },
  {
    figureId: 'vermeer',
    text: '他存世作品僅約三十五幅，創作極慢、極講究，對光與構圖反覆推敲。',
    source: '維梅爾生平',
  },
  {
    figureId: 'vermeer',
    text: '維梅爾生前並不出名，直到十九世紀才被重新發現，如今被譽為光影大師。',
    source: '維梅爾的重新發現',
  },
]
