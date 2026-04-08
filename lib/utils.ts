import { General } from './types'

// 兵種適性の係数
export const aptitudeMultiplier = (apt: string): number => {
  switch (apt) {
    case 'S': return 1.2
    case 'A': return 1.0
    case 'B': return 0.85
    case 'C': return 0.7
    default: return 1.0
  }
}

// 能力値計算（Lv補正込み）
export const calcStat = (base: number, growth: number, lv: number): number => {
  return Math.round(base + growth * (lv - 1))
}

// 兵種適性の色
export const aptColor = (apt: string): string => {
  switch (apt) {
    case 'S': return 'bg-blue-100 text-blue-800'
    case 'A': return 'bg-green-100 text-green-800'
    case 'B': return 'bg-yellow-100 text-yellow-800'
    case 'C': return 'bg-gray-100 text-gray-600'
    default: return 'bg-gray-100 text-gray-600'
  }
}

// 品質の色
export const qualityColor = (q: string): string => {
  switch (q) {
    case 'S': return 'bg-blue-100 text-blue-800'
    case 'A': return 'bg-green-100 text-green-800'
    case 'B': return 'bg-yellow-100 text-yellow-800'
    case 'C': return 'bg-gray-100 text-gray-600'
    default: return 'bg-gray-100 text-gray-600'
  }
}

// 陣営の色
export const factionColor = (faction: string): string => {
  switch (faction) {
    case '魏': return 'bg-blue-100 text-blue-800'
    case '蜀': return 'bg-green-100 text-green-800'
    case '呉': return 'bg-red-100 text-red-800'
    case '群': return 'bg-gray-100 text-gray-600'
    case '晋': return 'bg-purple-100 text-purple-800'
    case '漢': return 'bg-orange-100 text-orange-800'
    default: return 'bg-gray-100 text-gray-600'
  }
}

// 武将のタグ一覧を取得
export const getGeneralTags = (g: General): string[] => {
  const tags: string[] = []
  if (g.tag_bu) tags.push('武')
  if (g.tag_tate) tags.push('盾')
  if (g.tag_sen) tags.push('戦')
  if (g.tag_bou) tags.push('謀')
  if (g.tag_ho) tags.push('補')
  if (g.tag_hiku) tags.push('控')
  if (g.tag_i) tags.push('医')
  if (g.tag_ken) tags.push('兼')
  if (g.tag_sei) tags.push('政')
  if (g.tag_mi) tags.push('魅')
  if (g.tag_ko) tags.push('黄')
  if (g.tag_ban) tags.push('蛮')
  if (g.tag_sen2) tags.push('仙')
  if (g.tag_musou) tags.push('無双')
  if (g.tag_hizo) tags.push('秘蔵')
  if (g.tag_anime) tags.push('アニメ')
  return tags
}

// 兵種名一覧
export const TROOP_TYPES = ['騎兵', '盾兵', '弓兵', '槍兵', '兵器']

// 陣営一覧
export const FACTIONS = ['魏', '蜀', '呉', '群', '晋', '漢']
