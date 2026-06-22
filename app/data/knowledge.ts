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

  // ── 梵谷：面對自然、色彩榨出情感 ──
  {
    figureId: 'vangogh',
    text: '梵谷相信色彩本身能傳達情緒，因此用高彩度的黃、藍對比表達情感，而非只還原物體真實的顏色。',
    source: '梵谷色彩理論',
  },
  {
    figureId: 'vangogh',
    text: '他用厚塗法（impasto）把顏料厚厚堆疊、留下明顯的筆觸方向，讓畫面有流動的能量與筆勢。',
    source: '梵谷厚塗技法',
  },
  {
    figureId: 'vangogh',
    text: '《向日葵》用層層黃色把平凡的花畫成燃燒的生命力，是他對陽光與生命熱情的象徵。',
    source: '梵谷《向日葵》(1888)',
  },
  {
    figureId: 'vangogh',
    text: '梵谷主張畫家應面對真實的自然——麥田、星空、人物，從眼前的景物中提煉情感，而非憑空想像。',
    source: '梵谷創作理念',
  },
  {
    figureId: 'vangogh',
    text: '《星夜》用漩渦狀的筆觸把夜空畫成翻騰流動的情緒，是眼見與情感交織、由情緒主導的代表作。',
    source: '梵谷《星夜》(1889)',
  },
  {
    figureId: 'vangogh',
    text: '他在數百封給弟弟 Theo 的書信裡剖白創作與情感，是理解他藝術最直接的一手材料。',
    source: '梵谷致 Theo 書信',
  },
  {
    figureId: 'vangogh',
    text: '他刻意把互補色並置（如黃與紫、紅與綠），用色彩的對比製造強烈的視覺張力與情緒。',
    source: '梵谷互補色運用',
  },
  {
    figureId: 'vangogh',
    text: '他偏愛黃色，視之為陽光、希望與生命的顏色，連在亞爾租下的住所都漆成「黃房子」。',
    source: '梵谷與黃色',
  },
  {
    figureId: 'vangogh',
    text: '他生前幾乎賣不出畫、靠弟弟接濟，作畫不為市場而為內在的真誠表達。',
    source: '梵谷生平',
  },
  {
    figureId: 'vangogh',
    text: '他承接印象派的明亮色彩，但更進一步用色彩與筆觸表達主觀情感，而非只記錄光影，被歸為後印象派。',
    source: '梵谷與後印象派',
  },

  // ── 高更：憑想像、象徵與大色塊 ──
  {
    figureId: 'gauguin',
    text: '高更主張「綜合主義」：把形體簡化成大色塊、用粗輪廓線框住，把眼見綜合成象徵，而非細描寫實。',
    source: '高更綜合主義',
  },
  {
    figureId: 'gauguin',
    text: '他認為畫家不必對著實物，該憑記憶與想像作畫——從腦中提煉畫面，而非複製眼前所見。',
    source: '高更創作理念',
  },
  {
    figureId: 'gauguin',
    text: '他用大片未經調和的鮮豔色塊、捨棄立體明暗，追求畫面的裝飾性與象徵性。',
    source: '高更用色',
  },
  {
    figureId: 'gauguin',
    text: '他厭倦歐洲文明，遠赴大溪地尋找更原始純粹的生命與題材，發展出原始主義風格。',
    source: '高更與大溪地',
  },
  {
    figureId: 'gauguin',
    text: '《我們從何處來？我們是誰？我們往何處去？》是他大溪地時期的大型哲思之作，用象徵手法探問生命的起源與歸宿。',
    source: '高更《我們從何處來？》(1897)',
  },
  {
    figureId: 'gauguin',
    text: '他認為藝術該表達內在觀念與情感的象徵，而非複製肉眼所見的表象。',
    source: '高更藝術主張',
  },
  {
    figureId: 'gauguin',
    text: '1888 年他與梵谷同住亞爾的「黃房子」，因「對實物畫 vs 憑想像畫」的理念衝突而激烈決裂。',
    source: '高更與梵谷亞爾時期',
  },
  {
    figureId: 'gauguin',
    text: '他用明顯的深色輪廓把色塊分隔開（景泰藍主義 cloisonnism），像彩繪玻璃般強化平面與裝飾感。',
    source: '高更輪廓線技法',
  },
  {
    figureId: 'gauguin',
    text: '他原是證券經紀人，中年才拋下穩定生活全心投入繪畫。',
    source: '高更生平',
  },
  {
    figureId: 'gauguin',
    text: '他大膽的色彩與象徵手法，啟發了後來的野獸派與表現主義。',
    source: '高更的影響',
  },
]
