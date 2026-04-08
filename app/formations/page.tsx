'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import NavBar from '@/components/NavBar'
import { Formation, General, Skill, Bond, UserGeneral } from '@/lib/types'
import { factionColor, aptColor, qualityColor, getGeneralTags, TROOP_TYPES } from '@/lib/utils'

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'

// ─── 型 ─────────────────────────────────────────────────────────────────────
type SlotKey = 1 | 2 | 3
type SlotDef = { type: 'main' | 'sub'; index: number }

const SLOT_DEFS: SlotDef[] = [
  { type: 'main', index: 1 }, { type: 'main', index: 2 }, { type: 'main', index: 3 },
  { type: 'main', index: 4 }, { type: 'main', index: 5 },
  { type: 'sub',  index: 1 }, { type: 'sub',  index: 2 }, { type: 'sub',  index: 3 },
  { type: 'sub',  index: 4 }, { type: 'sub',  index: 5 },
]

const FACTIONS = ['魏', '蜀', '呉', '群', '晋', '漢']
const SKILL_TYPES = ['指揮', 'アクティブ', 'パッシブ', '突撃', '陣法']
const QUALITIES = ['S', 'A', 'B', 'C']
const STARS = [5, 4, 3, 2]

function troopAptKey(troop: string): keyof General {
  switch (troop) {
    case '騎兵': return 'cavalry'
    case '盾兵': return 'shield'
    case '弓兵': return 'bow'
    case '槍兵': return 'spear'
    case '兵器': return 'weapon'
    default: return 'cavalry'
  }
}

function generalKey(slot: SlotKey): keyof Formation {
  return `general${slot}_id` as keyof Formation
}
function skillKey(slot: SlotKey, pos: 2 | 3): keyof Formation {
  return `skill${pos}_g${slot}` as keyof Formation
}

// ─── コスト合計 ─────────────────────────────────────────────────────────────
function totalCost(f: Formation, allGenerals: General[]): number {
  return [f.general1_id, f.general2_id, f.general3_id]
    .filter(Boolean)
    .reduce((sum, id) => sum + (allGenerals.find(g => g.id === id)?.cost ?? 0), 0)
}

// ─── DraggableGeneralCard（左パネル用） ────────────────────────────────────
function DraggableCard({ general, troopType }: { general: General; troopType: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `general-${general.id}`,
    data: { type: 'general', general },
  })
  const apt = general[troopAptKey(troopType)] as string
  return (
    <div
      ref={setNodeRef} {...listeners} {...attributes}
      className={`border rounded-lg p-2 cursor-grab active:cursor-grabbing select-none transition-all ${
        isDragging ? 'opacity-40' : 'bg-white hover:border-blue-300 hover:shadow-sm'
      }`}
    >
      <div className="font-semibold text-xs leading-tight text-gray-900">{general.name}</div>
      <div className="flex gap-1 mt-0.5 flex-wrap">
        <span className={`text-xs px-1 py-0 rounded-full font-medium ${factionColor(general.faction)}`}>{general.faction}</span>
        <span className="text-xs text-gray-500">C{general.cost}</span>
        {troopType && apt && (
          <span className={`text-xs px-1 rounded font-medium ${aptColor(apt)}`}>
            {troopType.slice(0, 1)}:{apt}
          </span>
        )}
        <span className="text-xs text-yellow-600">★{general.stars}</span>
      </div>
    </div>
  )
}

// ─── FormationSlotCard（各編成カード） ──────────────────────────────────────
function FormationSlotCard({
  slotDef,
  formation,
  allGenerals,
  skills,
  bonds,
  isPC,
  isDragging,
  onTroopChange,
  onNameChange,
  onClearGeneral,
  onPickerOpen,
  onSkillPickerOpen,
  onClearSkill,
  onDelete,
}: {
  slotDef: SlotDef
  formation: Formation | null
  allGenerals: General[]
  skills: Skill[]
  bonds: Bond[]
  isPC: boolean
  isDragging: boolean
  onTroopChange: (f: Formation, troop: string) => void
  onNameChange: (f: Formation, name: string) => void
  onClearGeneral: (f: Formation, slot: SlotKey) => void
  onPickerOpen: (f: Formation, slot: SlotKey) => void
  onSkillPickerOpen: (f: Formation, slot: SlotKey, pos: 2 | 3) => void
  onClearSkill: (f: Formation, slot: SlotKey, pos: 2 | 3) => void
  onDelete: (f: Formation) => void
}) {
  const droppableId = formation
    ? `formation-${formation.id}`
    : `empty-${slotDef.type}-${slotDef.index}`

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { type: 'formation', formation, slotDef },
  })

  const label = slotDef.type === 'main'
    ? `主城${slotDef.index}`
    : `支城${slotDef.index}`

  if (!formation) {
    // 空スロット（編成なし）
    return (
      <div
        ref={isPC ? setNodeRef : undefined}
        className={`border-2 border-dashed rounded-lg p-3 min-h-[120px] flex flex-col items-center justify-center transition-all ${
          isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
        }`}
      >
        <div className="text-xs text-gray-400 font-medium mb-1">{label}</div>
        <div className="text-xs text-gray-300">空き</div>
      </div>
    )
  }

  const gs = ([1, 2, 3] as SlotKey[]).map(s => allGenerals.find(g => g.id === (formation[generalKey(s)] as number)))
  const cost = totalCost(formation, allGenerals)
  const overCost = cost > 20

  // 絆チェック
  const names = gs.filter(Boolean).map(g => g!.name)
  const activeBonds = bonds.filter(b => b.general_names.filter(n => names.includes(n)).length >= 2)

  return (
    <div
      ref={isPC ? setNodeRef : undefined}
      className={`border-2 rounded-lg transition-all ${
        isOver ? 'border-blue-400 shadow-md' : isDragging ? 'border-dashed border-blue-200' : 'border-gray-200'
      } bg-white`}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500">{label}</span>
          <input
            type="text"
            value={formation.name}
            onChange={e => onNameChange(formation, e.target.value)}
            className="text-xs font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none px-0.5 w-28"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold ${overCost ? 'text-red-600' : 'text-gray-600'}`}>
            コスト {cost}/20{overCost ? ' ⚠' : ''}
          </span>
          {activeBonds.map(b => (
            <span key={b.id} className="text-xs bg-yellow-100 text-yellow-800 px-1.5 rounded" title={b.effect}>
              絆:{b.name}
            </span>
          ))}
          <button onClick={() => onDelete(formation)} className="text-xs text-red-400 hover:text-red-600">✕</button>
        </div>
      </div>

      {/* 兵種 */}
      <div className="px-3 pt-2 pb-1 flex gap-1 flex-wrap">
        {TROOP_TYPES.map(t => (
          <button
            key={t}
            onClick={() => onTroopChange(formation, t)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
              formation.troop_type === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 武将3スロット */}
      <div className="grid grid-cols-3 gap-1.5 px-3 pb-3">
        {([1, 2, 3] as SlotKey[]).map(slot => {
          const g = gs[slot - 1]
          const sk2 = skills.find(s => s.id === (formation[skillKey(slot, 2)] as number))
          const sk3 = skills.find(s => s.id === (formation[skillKey(slot, 3)] as number))
          const apt = g?.[troopAptKey(formation.troop_type || '')] as string

          return (
            <div key={slot} className="border border-gray-100 rounded-lg p-2 bg-gray-50">
              <div className="text-xs text-gray-400 font-medium mb-1">
                {slot === 1 ? '主将' : `副将${slot - 1}`}
              </div>

              {g ? (
                <>
                  <div className="flex items-start justify-between mb-1">
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-gray-900 truncate">{g.name}</div>
                      <div className="flex gap-0.5 mt-0.5 flex-wrap">
                        <span className={`text-xs px-1 rounded-full font-medium ${factionColor(g.faction)}`}>{g.faction}</span>
                        {apt && <span className={`text-xs px-1 rounded font-medium ${aptColor(apt)}`}>{formation.troop_type?.slice(0,1)}:{apt}</span>}
                        <span className="text-xs text-yellow-600">★{g.stars}</span>
                      </div>
                    </div>
                    <button onClick={() => onClearGeneral(formation, slot)} className="text-xs text-red-400 hover:text-red-600 ml-1 flex-shrink-0">×</button>
                  </div>

                  {/* 固有戦法 */}
                  <div className="bg-blue-50 rounded px-1.5 py-1 mb-1">
                    <div className="text-xs text-blue-700 truncate">{g.unique_skill || '—'}</div>
                  </div>

                  {/* 第2・第3戦法 */}
                  {([2, 3] as const).map(pos => {
                    const sk = pos === 2 ? sk2 : sk3
                    return (
                      <div key={pos} className="mb-1">
                        {sk ? (
                          <div
                            className="flex items-center gap-1 bg-white border border-gray-200 rounded px-1.5 py-1 cursor-pointer hover:border-blue-300 transition-all"
                            onClick={() => onSkillPickerOpen(formation, slot, pos)}
                          >
                            <span className={`text-xs px-1 rounded font-bold flex-shrink-0 ${qualityColor(sk.quality)}`}>{sk.quality}</span>
                            <span className="text-xs truncate text-gray-800">{sk.name}</span>
                            <button
                              onClick={e => { e.stopPropagation(); onClearSkill(formation, slot, pos) }}
                              className="text-xs text-red-400 hover:text-red-600 ml-auto flex-shrink-0"
                            >×</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => onSkillPickerOpen(formation, slot, pos)}
                            className="w-full border border-dashed border-gray-200 rounded px-1.5 py-1 text-xs text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-all text-left"
                          >
                            第{pos}戦法+
                          </button>
                        )}
                      </div>
                    )
                  })}

                  <button
                    onClick={() => onPickerOpen(formation, slot)}
                    className="w-full mt-0.5 text-xs text-gray-400 hover:text-blue-500 border border-gray-200 rounded py-0.5 hover:border-blue-300 transition-all"
                  >
                    変更
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onPickerOpen(formation, slot)}
                  className="w-full h-20 border-2 border-dashed border-gray-200 rounded text-gray-300 hover:border-blue-400 hover:text-blue-400 transition-all flex flex-col items-center justify-center gap-1"
                >
                  <span className="text-lg">+</span>
                  <span className="text-xs">{isPC ? 'DnD or タップ' : '武将を選択'}</span>
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── メインコンポーネント ────────────────────────────────────────────────────
function FormationsContent() {
  const { profile, loading } = useAuth()
  const searchParams = useSearchParams()
  const seasonId = searchParams.get('season')
  const seasonName = searchParams.get('name') || ''
  const router = useRouter()

  const [formations, setFormations] = useState<Formation[]>([])
  const [allGenerals, setAllGenerals] = useState<General[]>([])
  const [ownedGenerals, setOwnedGenerals] = useState<General[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [bonds, setBonds] = useState<Bond[]>([])
  const [userId, setUserId] = useState('')
  const [saving, setSaving] = useState(false)

  // PC判定
  const [isPC, setIsPC] = useState(false)
  useEffect(() => { setIsPC(window.matchMedia('(pointer: fine)').matches) }, [])

  // 武将ピッカー
  const [pickerTarget, setPickerTarget] = useState<{ f: Formation; slot: SlotKey } | null>(null)
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerFaction, setPickerFaction] = useState('')
  const [pickerCost, setPickerCost] = useState('')
  const [pickerStar, setPickerStar] = useState('')

  // 戦法ピッカー
  const [skillPickerTarget, setSkillPickerTarget] = useState<{ f: Formation; slot: SlotKey; pos: 2 | 3 } | null>(null)
  const [skillSearch, setSkillSearch] = useState('')
  const [skillType, setSkillType] = useState('')
  const [skillQuality, setSkillQuality] = useState('')

  // 左パネル検索（PC DnD用）
  const [dndSearch, setDndSearch] = useState('')
  const [dndFaction, setDndFaction] = useState('')
  const [dndStar, setDndStar] = useState('')

  // DnD
  const [activeDragGeneral, setActiveDragGeneral] = useState<General | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    if (!loading && seasonId) loadAll()
  }, [loading, seasonId])

  const loadAll = async () => {
    const session = await supabase.auth.getSession()
    const uid = session.data.session?.user.id!
    setUserId(uid)

    const [fRes, gRes, sRes, ugRes, bRes] = await Promise.all([
      supabase.from('formations').select('*').eq('user_id', uid).eq('season_id', seasonId!).order('slot_type').order('slot_index'),
      supabase.from('generals').select('*'),
      supabase.from('skills').select('*').eq('is_unique', false),
      supabase.from('user_generals').select('*').eq('user_id', uid).eq('owned', true),
      supabase.from('bonds').select('*'),
    ])

    const allG = gRes.data || []
    setAllGenerals(allG)
    const ownedIds = new Set((ugRes.data || []).map((ug: UserGeneral) => ug.general_id))
    setOwnedGenerals(allG.filter(g => ownedIds.has(g.id)))
    setFormations(fRes.data || [])
    setSkills((sRes.data || []).sort((a: Skill, b: Skill) => {
      const q = ['S', 'A', 'B', 'C']
      return q.indexOf(a.quality) - q.indexOf(b.quality) || a.name.localeCompare(b.name, 'ja')
    }))
    setBonds(bRes.data || [])
  }

  const getFormation = (slotDef: SlotDef) =>
    formations.find(f => f.slot_type === slotDef.type && f.slot_index === slotDef.index) ?? null

  const save = useCallback(async (data: Formation) => {
    setSaving(true)
    await supabase.from('formations').update({
      name: data.name,
      troop_type: data.troop_type,
      general1_id: data.general1_id,
      general2_id: data.general2_id,
      general3_id: data.general3_id,
      skill2_g1: data.skill2_g1, skill3_g1: data.skill3_g1,
      skill2_g2: data.skill2_g2, skill3_g2: data.skill3_g2,
      skill2_g3: data.skill2_g3, skill3_g3: data.skill3_g3,
      updated_at: new Date().toISOString(),
    }).eq('id', data.id)
    setSaving(false)
  }, [])

  const updateFormation = useCallback(async (updated: Formation) => {
    setFormations(prev => prev.map(f => f.id === updated.id ? updated : f))
    await save(updated)
  }, [save])

  // 編成を空スロットに自動作成
  const ensureFormation = useCallback(async (slotDef: SlotDef): Promise<Formation | null> => {
    const existing = formations.find(f => f.slot_type === slotDef.type && f.slot_index === slotDef.index)
    if (existing) return existing
    if (formations.length >= 10) return null

    const label = slotDef.type === 'main' ? `主城${slotDef.index}` : `支城${slotDef.index}`
    const { data } = await supabase.from('formations').insert({
      user_id: userId,
      season_id: Number(seasonId),
      name: label,
      troop_type: '騎兵',
      slot_type: slotDef.type,
      slot_index: slotDef.index,
    }).select().single()
    if (data) {
      setFormations(prev => [...prev, data])
      return data
    }
    return null
  }, [formations, userId, seasonId])

  // ─── ハンドラ ─────────────────────────────────────────────────────────────

  const handleTroopChange = useCallback(async (f: Formation, troop: string) => {
    await updateFormation({ ...f, troop_type: troop })
  }, [updateFormation])

  const handleNameChange = useCallback(async (f: Formation, name: string) => {
    setFormations(prev => prev.map(x => x.id === f.id ? { ...x, name } : x))
    await supabase.from('formations').update({ name, updated_at: new Date().toISOString() }).eq('id', f.id)
  }, [])

  const handleClearGeneral = useCallback(async (f: Formation, slot: SlotKey) => {
    await updateFormation({
      ...f,
      [generalKey(slot)]: null,
      [skillKey(slot, 2)]: null,
      [skillKey(slot, 3)]: null,
    })
  }, [updateFormation])

  const handlePickerOpen = useCallback(async (f: Formation, slot: SlotKey) => {
    setPickerTarget({ f, slot })
    setPickerSearch(''); setPickerFaction(''); setPickerCost(''); setPickerStar('')
  }, [])

  const handleSelectGeneral = useCallback(async (general: General) => {
    if (!pickerTarget) return
    const { f, slot } = pickerTarget
    await updateFormation({ ...f, [generalKey(slot)]: general.id })
    setPickerTarget(null)
  }, [pickerTarget, updateFormation])

  const handleSkillPickerOpen = useCallback((f: Formation, slot: SlotKey, pos: 2 | 3) => {
    setSkillPickerTarget({ f, slot, pos })
    setSkillSearch(''); setSkillType(''); setSkillQuality('')
  }, [])

  const handleSelectSkill = useCallback(async (skill: Skill) => {
    if (!skillPickerTarget) return
    const { f, slot, pos } = skillPickerTarget
    await updateFormation({ ...f, [skillKey(slot, pos)]: skill.id })
    setSkillPickerTarget(null)
  }, [skillPickerTarget, updateFormation])

  const handleClearSkill = useCallback(async (f: Formation, slot: SlotKey, pos: 2 | 3) => {
    await updateFormation({ ...f, [skillKey(slot, pos)]: null })
  }, [updateFormation])

  const handleDelete = useCallback(async (f: Formation) => {
    if (!confirm(`「${f.name}」を削除しますか？`)) return
    await supabase.from('formations').delete().eq('id', f.id)
    setFormations(prev => prev.filter(x => x.id !== f.id))
  }, [])

  // ─── DnD ─────────────────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    const { data } = event.active
    if (data.current?.type === 'general') setActiveDragGeneral(data.current.general)
  }

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveDragGeneral(null)
    if (!event.over) return

    const activeData = event.active.data.current
    const overData = event.over.data.current

    if (activeData?.type !== 'general') return
    const draggedGeneral: General = activeData.general
    const targetSlotDef: SlotDef = overData?.slotDef

    if (!targetSlotDef) return

    // ターゲット編成を取得または作成
    let targetFormation = overData?.formation as Formation | null
    if (!targetFormation) {
      targetFormation = await ensureFormation(targetSlotDef)
      if (!targetFormation) return
    }

    // 既にこの武将を持つ編成のスロットを探す
    const currentFormation = formations.find(f =>
      [f.general1_id, f.general2_id, f.general3_id].includes(draggedGeneral.id)
    )
    const currentSlot = currentFormation
      ? ([1, 2, 3] as SlotKey[]).find(s => currentFormation[generalKey(s)] === draggedGeneral.id)
      : undefined

    if (currentFormation && currentSlot && currentFormation.id === targetFormation.id) {
      // 同じ編成内スロット間移動 → 入れ替え先を探す
      return
    }

    // ターゲット編成の空きスロットを探す（主将優先）
    const targetSlot = ([1, 2, 3] as SlotKey[]).find(s => !targetFormation![generalKey(s)])

    if (!targetSlot) {
      // 空きなし → 主将と入れ替え
      const displaced = targetFormation.general1_id
      let updated = { ...targetFormation, general1_id: draggedGeneral.id, skill2_g1: null, skill3_g1: null }
      await updateFormation(updated)

      if (currentFormation && currentSlot && displaced) {
        await updateFormation({
          ...currentFormation,
          [generalKey(currentSlot)]: displaced,
          [skillKey(currentSlot, 2)]: null,
          [skillKey(currentSlot, 3)]: null,
        })
      } else if (currentFormation && currentSlot) {
        await updateFormation({
          ...currentFormation,
          [generalKey(currentSlot)]: null,
          [skillKey(currentSlot, 2)]: null,
          [skillKey(currentSlot, 3)]: null,
        })
      }
    } else {
      // 空きスロットに配置
      await updateFormation({
        ...targetFormation,
        [generalKey(targetSlot)]: draggedGeneral.id,
        [skillKey(targetSlot, 2)]: null,
        [skillKey(targetSlot, 3)]: null,
      })
      if (currentFormation && currentSlot) {
        await updateFormation({
          ...currentFormation,
          [generalKey(currentSlot)]: null,
          [skillKey(currentSlot, 2)]: null,
          [skillKey(currentSlot, 3)]: null,
        })
      }
    }
  }, [formations, ensureFormation, updateFormation])

  // ─── フィルター ──────────────────────────────────────────────────────────

  // 全編成で使用中の武将ID（重複チェック用）
  const usedInOtherFormations = useCallback((targetFormationId: number | null) =>
    formations
      .filter(f => f.id !== targetFormationId)
      .flatMap(f => [f.general1_id, f.general2_id, f.general3_id].filter((id): id is number => id !== null))
  , [formations])

  // 左パネル（DnD用）
  const dndFilteredGenerals = ownedGenerals.filter(g => {
    if (dndSearch && !g.name.includes(dndSearch)) return false
    if (dndFaction && g.faction !== dndFaction) return false
    if (dndStar && String(g.stars) !== dndStar) return false
    return true
  })

  // モーダル用武将フィルター
  const filteredPickerGenerals = ownedGenerals.filter(g => {
    if (!pickerTarget) return false
    const { f, slot } = pickerTarget
    const curIds = [f.general1_id, f.general2_id, f.general3_id].filter((_, i) => (i + 1) !== slot)
    if (curIds.includes(g.id)) return false
    if (usedInOtherFormations(f.id).includes(g.id)) return false
    if (pickerSearch && !g.name.includes(pickerSearch)) return false
    if (pickerFaction && g.faction !== pickerFaction) return false
    if (pickerCost && String(g.cost) !== pickerCost) return false
    if (pickerStar && String(g.stars) !== pickerStar) return false
    return true
  })

  const filteredSkills = skills.filter(s => {
    if (skillSearch && !s.name.includes(skillSearch)) return false
    if (skillType && s.type !== skillType) return false
    if (skillQuality && s.quality !== skillQuality) return false
    return true
  })

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">読み込み中...</p>
    </div>
  )

  const isDraggingActive = !!activeDragGeneral

  const SlotGrid = () => (
    <div className="space-y-4">
      {/* 主城 */}
      <div>
        <div className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
          <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs">主城</span>
          <span className="text-xs text-gray-400">5枠</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {SLOT_DEFS.filter(s => s.type === 'main').map(slotDef => (
            <FormationSlotCard
              key={`main-${slotDef.index}`}
              slotDef={slotDef}
              formation={getFormation(slotDef)}
              allGenerals={allGenerals}
              skills={skills}
              bonds={bonds}
              isPC={isPC}
              isDragging={isDraggingActive}
              onTroopChange={handleTroopChange}
              onNameChange={handleNameChange}
              onClearGeneral={handleClearGeneral}
              onPickerOpen={handlePickerOpen}
              onSkillPickerOpen={handleSkillPickerOpen}
              onClearSkill={handleClearSkill}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>

      {/* 支城 */}
      <div>
        <div className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
          <span className="bg-gray-600 text-white px-2 py-0.5 rounded text-xs">支城</span>
          <span className="text-xs text-gray-400">5枠</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {SLOT_DEFS.filter(s => s.type === 'sub').map(slotDef => (
            <FormationSlotCard
              key={`sub-${slotDef.index}`}
              slotDef={slotDef}
              formation={getFormation(slotDef)}
              allGenerals={allGenerals}
              skills={skills}
              bonds={bonds}
              isPC={isPC}
              isDragging={isDraggingActive}
              onTroopChange={handleTroopChange}
              onNameChange={handleNameChange}
              onClearGeneral={handleClearGeneral}
              onPickerOpen={handlePickerOpen}
              onSkillPickerOpen={handleSkillPickerOpen}
              onClearSkill={handleClearSkill}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar profile={profile} />
      <div className="max-w-7xl mx-auto p-4">

        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <button onClick={() => router.push('/seasons')} className="text-sm text-gray-500 hover:text-gray-700">
            ← シーズン選択
          </button>
          <h1 className="text-lg font-medium">{decodeURIComponent(seasonName)} の編成</h1>
          <span className="text-xs text-gray-400">{formations.length} / 10 編成</span>
          {saving && <span className="text-xs text-gray-400">保存中...</span>}
        </div>

        {isPC ? (
          // PC: 左パネル + 右グリッド
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-4">
              {/* 左パネル */}
              <div className="w-56 flex-shrink-0">
                <div className="bg-white border border-gray-200 rounded-lg p-3 sticky top-4">
                  <div className="text-sm font-semibold text-gray-700 mb-2">所持武将</div>
                  <input
                    type="text" placeholder="名前で検索"
                    value={dndSearch} onChange={e => setDndSearch(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-xs mb-1.5"
                  />
                  <div className="flex gap-1 mb-1.5">
                    <select value={dndFaction} onChange={e => setDndFaction(e.target.value)} className="flex-1 border rounded px-1 py-1 text-xs">
                      <option value="">陣営</option>
                      {FACTIONS.map(f => <option key={f}>{f}</option>)}
                    </select>
                    <select value={dndStar} onChange={e => setDndStar(e.target.value)} className="flex-1 border rounded px-1 py-1 text-xs">
                      <option value="">星</option>
                      {STARS.map(s => <option key={s} value={s}>★{s}</option>)}
                    </select>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{dndFilteredGenerals.length}件</p>
                  <div className="overflow-y-auto max-h-[65vh] space-y-1.5">
                    {dndFilteredGenerals.map(g => (
                      <DraggableCard key={g.id} general={g} troopType="" />
                    ))}
                    {dndFilteredGenerals.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">
                        {ownedGenerals.length === 0 ? 'マイページで所持武将を設定してください' : '条件に一致しません'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 右: 編成グリッド */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-3">💡 左の武将をドラッグして編成枠に配置 · 空き枠に落とすと自動作成</p>
                <SlotGrid />
              </div>
            </div>

            <DragOverlay>
              {activeDragGeneral && (
                <div className="bg-white border-2 border-blue-400 rounded-lg p-2 shadow-xl w-40 rotate-2">
                  <div className="font-bold text-xs text-gray-900">{activeDragGeneral.name}</div>
                  <div className="text-xs text-gray-500">{activeDragGeneral.faction} C{activeDragGeneral.cost}</div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          // スマホ: グリッドのみ
          <SlotGrid />
        )}
      </div>

      {/* 武将選択モーダル */}
      {pickerTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto py-4">
          <div className="bg-white rounded-lg p-5 w-full max-w-2xl mx-4 my-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">武将を選択</h2>
              <span className="text-xs text-gray-500">所持武将のみ</span>
            </div>
            <div className="flex gap-2 mb-3 flex-wrap">
              <input
                type="text" placeholder="名前で検索" value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                className="flex-1 min-w-24 border rounded-lg px-3 py-2 text-sm" autoFocus
              />
              <select value={pickerFaction} onChange={e => setPickerFaction(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
                <option value="">陣営</option>
                {FACTIONS.map(f => <option key={f}>{f}</option>)}
              </select>
              <select value={pickerCost} onChange={e => setPickerCost(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
                <option value="">コスト</option>
                {[7, 6, 5, 4].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={pickerStar} onChange={e => setPickerStar(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
                <option value="">星</option>
                {STARS.map(s => <option key={s} value={s}>★{s}</option>)}
              </select>
            </div>
            <p className="text-xs text-gray-500 mb-2">{filteredPickerGenerals.length}件</p>
            <div className="overflow-y-auto max-h-96 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredPickerGenerals.map(g => (
                <button
                  key={g.id}
                  onClick={() => handleSelectGeneral(g)}
                  className="text-left border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  <div className="font-semibold text-sm text-gray-900">{g.name}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${factionColor(g.faction)}`}>{g.faction}</span>
                    <span className="text-xs text-gray-500">コスト{g.cost}</span>
                    <span className="text-xs text-yellow-600">★{g.stars}</span>
                  </div>
                  {g.unique_skill && <div className="text-xs text-gray-500 mt-1 truncate">{g.unique_skill}</div>}
                </button>
              ))}
              {filteredPickerGenerals.length === 0 && (
                <div className="col-span-2 text-center text-gray-400 py-8 text-sm">
                  {ownedGenerals.length === 0 ? 'マイページで所持武将を設定してください' : '条件に一致する武将がいません'}
                </div>
              )}
            </div>
            <button
              onClick={() => setPickerTarget(null)}
              className="mt-3 w-full border border-gray-300 py-2.5 rounded-lg text-sm"
            >閉じる</button>
          </div>
        </div>
      )}

      {/* 戦法選択モーダル */}
      {skillPickerTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto py-4">
          <div className="bg-white rounded-lg p-5 w-full max-w-2xl mx-4 my-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">第{skillPickerTarget.pos}戦法を選択</h2>
              <span className="text-xs text-gray-500">固有戦法を除く</span>
            </div>
            <div className="flex gap-2 mb-3 flex-wrap">
              <input
                type="text" placeholder="名前で検索" value={skillSearch}
                onChange={e => setSkillSearch(e.target.value)}
                className="flex-1 min-w-24 border rounded-lg px-3 py-2 text-sm" autoFocus
              />
              <select value={skillType} onChange={e => setSkillType(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
                <option value="">タイプ</option>
                {SKILL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <select value={skillQuality} onChange={e => setSkillQuality(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
                <option value="">品質</option>
                {QUALITIES.map(q => <option key={q}>{q}</option>)}
              </select>
            </div>
            <p className="text-xs text-gray-500 mb-2">{filteredSkills.length}件</p>
            <div className="overflow-y-auto max-h-96 space-y-1">
              {filteredSkills.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSkill(s)}
                  className="w-full text-left border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${qualityColor(s.quality)}`}>{s.quality}</span>
                    <span className="font-semibold text-sm text-gray-900">{s.name}</span>
                    <span className="text-xs text-gray-500">{s.type}</span>
                  </div>
                  {s.description_short && <div className="text-sm text-gray-600 mt-1">{s.description_short}</div>}
                </button>
              ))}
            </div>
            <button
              onClick={() => setSkillPickerTarget(null)}
              className="mt-3 w-full border border-gray-300 py-2.5 rounded-lg text-sm"
            >閉じる</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FormationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    }>
      <FormationsContent />
    </Suspense>
  )
}