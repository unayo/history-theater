export interface Topic {
  id: string
  label: string
  prompt: string  // 對話引子，也用作聊天室開頭描述並餵進 AI prompt
}

// 進聊天室隨機抽一個，讓每場對話焦點不同
export const topics: Topic[] = [
  { id: 'light', label: '光影', prompt: '聊聊你們如何看待畫中的光與影' },
  { id: 'lightemotion', label: '光與情感', prompt: '討論光該為戲劇與情感服務，還是忠於自然的真實' },
  { id: 'darkness', label: '黑暗', prompt: '聊聊黑暗與陰影在畫面中扮演什麼角色' },
  { id: 'music', label: '音樂', prompt: '聊聊各自時代的音樂與聲音之美' },
  { id: 'art', label: '藝術', prompt: '談談什麼是好的藝術、美從何來' },
  { id: 'science', label: '科學', prompt: '聊聊你們眼中世界如何運作、如何求知' },
  { id: 'life', label: '生活', prompt: '分享各自日常的喜好與煩惱' },
  { id: 'festival', label: '節日', prompt: '聊聊你們時代怎麼慶祝重要的日子' },
  { id: 'disaster', label: '災難', prompt: '談談經歷過的動盪與面對苦難的態度' },
  { id: 'dream', label: '夢想', prompt: '聊聊一生最想完成、最掛念的事' },
  { id: 'death', label: '生死', prompt: '談談你們如何看待死亡與身後之事' },
]

export const randomTopic = (): Topic => topics[Math.floor(Math.random() * topics.length)]!
