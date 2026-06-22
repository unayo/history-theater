export interface Topic {
  id: string
  label: string
  prompt: string  // 對話引子，也用作聊天室開頭描述並餵進 AI prompt
}

// 聚焦藝術主題，搭配藝術家陣容；進聊天室隨機抽一個，讓每場對話切入點不同。
export const topics: Topic[] = [
  { id: 'light', label: '光影', prompt: '聊聊你們如何看待畫中的光與影' },
  { id: 'lightemotion', label: '光與情感', prompt: '討論光該為戲劇與情感服務，還是忠於自然的真實' },
  { id: 'darkness', label: '黑暗', prompt: '聊聊黑暗與陰影在畫面中扮演什麼角色' },
  { id: 'color', label: '色彩', prompt: '聊聊色彩該忠於眼見，還是為情感與象徵服務' },
  { id: 'realimagine', label: '寫實或想像', prompt: '討論畫家該對著實物畫，還是憑記憶與想像作畫' },
  { id: 'art', label: '什麼是好畫', prompt: '談談什麼是好的畫、美從何而來' },
  { id: 'dream', label: '創作初心', prompt: '聊聊各自一生最想透過畫筆完成、最掛念的事' },
]

export const randomTopic = (): Topic => topics[Math.floor(Math.random() * topics.length)]!
