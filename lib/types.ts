export type Profile = {
  id: string
  username: string
  is_admin: boolean
  created_at: string
}

export type Season = {
  id: number
  name: string
  created_at: string
}

export type General = {
  id: number
  name: string
  faction: string
  cost: number
  stars: number
  cavalry: string
  shield: string
  bow: string
  spear: string
  weapon: string
  attack: number
  attack_growth: number
  defense: number
  defense_growth: number
  intel: number
  intel_growth: number
  speed: number
  speed_growth: number
  politics: number
  politics_growth: number
  charm: number
  charm_growth: number
  unique_skill: string
  tag_bu: boolean
  tag_tate: boolean
  tag_sen: boolean
  tag_bou: boolean
  tag_ho: boolean
  tag_hiku: boolean
  tag_i: boolean
  tag_ken: boolean
  tag_sei: boolean
  tag_mi: boolean
  tag_ko: boolean
  tag_ban: boolean
  tag_sen2: boolean
  tag_musou: boolean
  tag_hizo: boolean
  tag_anime: boolean
}

export type Skill = {
  id: number
  name: string
  type: string
  quality: string
  cavalry: boolean
  shield: boolean
  bow: boolean
  spear: boolean
  weapon: boolean
  main_effect: string
  sub_effect: string
  prepare: number
  cooltime: number
  description_short: string
  description_full: string
}

export type TacticsBook = {
  id: number
  category: string
  level: number
  name: string
  effect: string
}

export type Equipment = {
  id: number
  name: string
  type: string
  attack: number
  defense: number
  intel: number
  speed: number
  politics: number
  charm: number
  skill_name: string
}

export type Bond = {
  id: number
  name: string
  general_names: string[]
  effect: string
}

export type Formation = {
  id: number
  user_id: string
  season_id: number
  name: string
  troop_type: string
  slot_type: 'main' | 'sub'
  slot_index: number          // 1〜5
  general1_id: number | null
  general2_id: number | null
  general3_id: number | null
  skill2_g1: number | null
  skill3_g1: number | null
  skill2_g2: number | null
  skill3_g2: number | null
  skill2_g3: number | null
  skill3_g3: number | null
  created_at: string
  updated_at: string
}

export type UserGeneral = {
  id: number
  user_id: string
  general_id: number
  owned: boolean
  totsuki: number
  stars: number
}

export type UserSkill = {
  id: number
  user_id: string
  skill_id: number
  owned: boolean
}

export type Template = {
  id: number
  name: string
  description: string
  troop_type: string
  general1_id: number | null
  general2_id: number | null
  general3_id: number | null
  skill2_g1: number | null
  skill3_g1: number | null
  skill2_g2: number | null
  skill3_g2: number | null
  skill2_g3: number | null
  skill3_g3: number | null
}