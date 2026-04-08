'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import NavBar from '@/components/NavBar'
import { General, Skill, UserGeneral, UserSkill } from '@/lib/types'
import { factionColor, aptColor } from '@/lib/utils'

const FACTIONS = ['魏', '蜀', '呉', '群', '晋', '漢']
const SKILL_TYPES = ['指揮', 'アクティブ', 'パッシブ', '突撃', '陣法']
const QUALITIES = ['S', 'A', 'B', 'C']
const APT_KEYS = ['cavalry', 'shield', 'bow', 'spear', 'weapon'] as const
const APT_LABELS = ['騎', '盾', '弓', '槍', '兵']

const qualityColor = (q: string) => {
  switch (q) {
    case 'S': return 'bg-blue-100 text-blue-800'
    case 'A': return 'bg-green-100 text-green-800'
    case 'B': return 'bg-yellow-100 text-yellow-800'
    default:  return 'bg-gray-100 text-gray-600'
  }
}

export default function MyPage() {
  const { profile, loading } = useAuth()
  const [tab, setTab] = useState<'generals' | 'skills'>('generals')
  const [generals, setGenerals] = useState<General[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [userGenerals, setUserGenerals] = useState<Record<number, UserGeneral>>({})
  const [userSkills, setUserSkills] = useState<Record<number, UserSkill>>({})
  const [userId, setUserId] = useState<string>('')

  // 武将フィルター
  const [gSearch, setGSearch] = useState('')
  const [gFaction, setGFaction] = useState('')
  const [gOwned, setGOwned] = useState('')

  // 戦法フィルター
  const [sSearch, setSSearch] = useState('')
  const [sType, setSType] = useState('')
  const [sQuality, setSQuality] = useState('')
  const [sOwned, setSOwned] = useState('')

  useEffect(() => {
    if (!loading) loadAll()
  }, [loading])

  const loadAll = async () => {
    const session = await supabase.auth.getSession()
    const uid = session.data.session?.user.id!
    setUserId(uid)

    const [gRes, sRes, ugRes, usRes] = await Promise.all([
      supabase.from('generals').select('*'),
      supabase.from('skills').select('*').eq('is_unique', false),
      supabase.from('user_generals').select('*').eq('user_id', uid),
      supabase.from('user_skills').select('*').eq('user_id', uid),
    ])

    const ugMap: Record<number, UserGeneral> = {}
    ;(ugRes.data || []).forEach((ug: UserGeneral) => { ugMap[ug.general_id] = ug })

    // コスト降順 → 名前順
    const sorted = (gRes.data || []).sort((a: General, b: General) => {
      if (b.cost !== a.cost) return b.cost - a.cost
      return a.name.localeCompare(b.name, 'ja')
    })
    setGenerals(sorted)

    setSkills((sRes.data || []).sort((a: Skill, b: Skill) => {
      const q = ['S', 'A', 'B', 'C']
      return q.indexOf(a.quality) - q.indexOf(b.quality) || a.name.localeCompare(b.name, 'ja')
    }))

    setUserGenerals(ugMap)

    const usMap: Record<number, UserSkill> = {}
    ;(usRes.data || []).forEach((us: UserSkill) => { usMap[us.skill_id] = us })
    setUserSkills(usMap)
  }

  // ─── 武将: 所持トグル ────────────────────────────────────────────────────
  const toggleOwned = useCallback(async (generalId: number) => {
    const cur = userGenerals[generalId]
    if (cur) {
      const next = !cur.owned
      setUserGenerals(prev => ({ ...prev, [generalId]: { ...cur, owned: next } }))
      await supabase.from('user_generals').update({ owned: next }).eq('id', cur.id)
    } else {
      // 楽観的更新
      const temp = { id: -generalId, user_id: userId, general_id: generalId, owned: true, totsuki: 0, stars: 0, created_at: '' } as UserGeneral
      setUserGenerals(prev => ({ ...prev, [generalId]: temp }))
      const { data } = await supabase.from('user_generals')
        .insert({ user_id: userId, general_id: generalId, owned: true, totsuki: 0, stars: 0 })
        .select().single()
      if (data) setUserGenerals(prev => ({ ...prev, [generalId]: data }))
    }
  }, [userGenerals, userId])

  // ─── 武将: 星・凸 更新 ──────────────────────────────────────────────────
  const updateField = useCallback(async (generalId: number, field: 'stars' | 'totsuki', value: number) => {
    const cur = userGenerals[generalId]
    if (cur) {
      setUserGenerals(prev => ({ ...prev, [generalId]: { ...cur, [field]: value } }))
      await supabase.from('user_generals').update({ [field]: value }).eq('id', cur.id)
    } else {
      const base = { user_id: userId, general_id: generalId, owned: true, totsuki: 0, stars: 0, [field]: value }
      const temp = { id: -generalId, ...base, created_at: '' } as UserGeneral
      setUserGenerals(prev => ({ ...prev, [generalId]: temp }))
      const { data } = await supabase.from('user_generals').insert(base).select().single()
      if (data) setUserGenerals(prev => ({ ...prev, [generalId]: data }))
    }
  }, [userGenerals, userId])

  // ─── 戦法: 所持トグル ────────────────────────────────────────────────────
  const toggleSkillOwned = useCallback(async (skillId: number) => {
    const cur = userSkills[skillId]
    if (cur) {
      const next = !cur.owned
      setUserSkills(prev => ({ ...prev, [skillId]: { ...cur, owned: next } }))
      await supabase.from('user_skills').update({ owned: next }).eq('id', cur.id)
    } else {
      const temp = { id: -skillId, user_id: userId, skill_id: skillId, owned: true } as UserSkill
      setUserSkills(prev => ({ ...prev, [skillId]: temp }))
      const { data } = await supabase.from('user_skills')
        .insert({ user_id: userId, skill_id: skillId, owned: true })
        .select().single()
      if (data) setUserSkills(prev => ({ ...prev, [skillId]: data }))
    }
  }, [userSkills, userId])

  // ─── フィルター ──────────────────────────────────────────────────────────
  const filteredGenerals = generals.filter(g => {
    if (gSearch && !g.name.includes(gSearch)) return false
    if (gFaction && g.faction !== gFaction) return false
    if (gOwned === '1' && !userGenerals[g.id]?.owned) return false
    if (gOwned === '0' && userGenerals[g.id]?.owned) return false
    return true
  })

  const filteredSkills = skills.filter(s => {
    if (sSearch && !s.name.includes(sSearch)) return false
    if (sType && s.type !== sType) return false
    if (sQuality && s.quality !== sQuality) return false
    if (sOwned === '1' && !userSkills[s.id]?.owned) return false
    if (sOwned === '0' && userSkills[s.id]?.owned) return false
    return true
  })

  const ownedGCount = generals.filter(g => userGenerals[g.id]?.owned).length
  const ownedSCount = skills.filter(s => userSkills[s.id]?.owned).length

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">読み込み中...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar profile={profile} />
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-xl font-medium mb-1">マイページ</h1>
        <p className="text-sm text-gray-500 mb-4">行をタップで所持ON/OFF、星・凸は所持時に設定</p>

        {/* タブ */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTab('generals')}
            className={`px-5 py-2 rounded-lg text-sm font-medium ${tab === 'generals' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}
          >
            武将 ({ownedGCount}/{generals.length})
          </button>
          <button
            onClick={() => setTab('skills')}
            className={`px-5 py-2 rounded-lg text-sm font-medium ${tab === 'skills' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700'}`}
          >
            戦法 ({ownedSCount}/{skills.length})
          </button>
        </div>

        {/* ═══ 武将タブ ═══ */}
        {tab === 'generals' && (
          <>
            {/* フィルター */}
            <div className="bg-white border border-gray-200 rounded-lg p-2.5 mb-2 flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="名前で検索"
                value={gSearch}
                onChange={e => setGSearch(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm flex-1 min-w-28"
              />
              <select value={gFaction} onChange={e => setGFaction(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                <option value="">陣営</option>
                {FACTIONS.map(f => <option key={f}>{f}</option>)}
              </select>
              <select value={gOwned} onChange={e => setGOwned(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                <option value="">全て</option>
                <option value="1">所持のみ</option>
                <option value="0">未所持のみ</option>
              </select>
              {(gSearch || gFaction || gOwned) && (
                <button onClick={() => { setGSearch(''); setGFaction(''); setGOwned('') }} className="text-xs text-gray-400 hover:text-gray-600 px-1">
                  ✕
                </button>
              )}
              <span className="text-xs text-gray-400 self-center ml-auto">{filteredGenerals.length}件</span>
            </div>

            {/* テーブル */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* ヘッダー */}
              <div className="grid grid-cols-[2rem_1fr_auto] md:grid-cols-[2rem_1fr_auto_auto] gap-x-2 px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-medium">
                <div></div>
                <div>武将</div>
                <div className="hidden md:block text-center">適性</div>
                <div>星 / 凸</div>
              </div>

              {/* 行 */}
              <div className="divide-y divide-gray-100">
                {filteredGenerals.map(g => {
                  const ug = userGenerals[g.id]
                  const owned = ug?.owned || false
                  return (
                    <div
                      key={g.id}
                      onClick={() => toggleOwned(g.id)}
                      className={`grid grid-cols-[2rem_1fr_auto] md:grid-cols-[2rem_1fr_auto_auto] gap-x-2 px-3 py-2 items-center cursor-pointer transition-colors select-none ${
                        owned ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* チェック */}
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        owned ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                      }`}>
                        {owned && <span className="text-white text-xs font-bold leading-none">✓</span>}
                      </div>

                      {/* 武将名・陣営・固有戦法 */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-semibold text-sm ${owned ? 'text-gray-900' : 'text-gray-400'}`}>
                            {g.name}
                          </span>
                          <span className={`text-xs px-1.5 py-0 rounded-full font-medium ${factionColor(g.faction)}`}>
                            {g.faction}
                          </span>
                          <span className="text-xs text-gray-500">C{g.cost}</span>
                        </div>
                        {g.unique_skill && (
                          <div className="text-xs text-gray-400 truncate mt-0.5">{g.unique_skill}</div>
                        )}
                      </div>

                      {/* 適性（PC only） */}
                      <div className="hidden md:flex gap-0.5 flex-wrap justify-end">
                        {APT_KEYS.map((key, i) => {
                          const val = g[key] as string
                          return (
                            <span key={key} className={`text-xs px-1 py-0 rounded font-medium ${aptColor(val)}`}>
                              {APT_LABELS[i]}:{val}
                            </span>
                          )
                        })}
                      </div>

                      {/* 星・凸（所持時のみ） */}
                      <div
                        className="flex gap-1 justify-end"
                        onClick={e => e.stopPropagation()}
                      >
                        {owned ? (
                          <>
                            <select
                              value={ug?.stars || 0}
                              onChange={e => updateField(g.id, 'stars', Number(e.target.value))}
                              className="border rounded px-1 py-0.5 text-xs w-12 bg-white"
                            >
                              {[0,1,2,3,4,5].map(n => <option key={n} value={n}>★{n}</option>)}
                            </select>
                            <select
                              value={ug?.totsuki || 0}
                              onChange={e => updateField(g.id, 'totsuki', Number(e.target.value))}
                              className="border rounded px-1 py-0.5 text-xs w-12 bg-white"
                            >
                              {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}凸</option>)}
                            </select>
                          </>
                        ) : (
                          <span className="text-xs text-gray-300 w-24 text-right">—</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {filteredGenerals.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">条件に一致する武将がいません</div>
              )}
            </div>
          </>
        )}

        {/* ═══ 戦法タブ ═══ */}
        {tab === 'skills' && (
          <>
            {/* フィルター */}
            <div className="bg-white border border-gray-200 rounded-lg p-2.5 mb-2 flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="名前で検索"
                value={sSearch}
                onChange={e => setSSearch(e.target.value)}
                className="border rounded px-2 py-1.5 text-sm flex-1 min-w-28"
              />
              <select value={sType} onChange={e => setSType(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                <option value="">タイプ</option>
                {SKILL_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
              <select value={sQuality} onChange={e => setSQuality(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                <option value="">品質</option>
                {QUALITIES.map(q => <option key={q}>{q}</option>)}
              </select>
              <select value={sOwned} onChange={e => setSOwned(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
                <option value="">全て</option>
                <option value="1">所持のみ</option>
                <option value="0">未所持のみ</option>
              </select>
              {(sSearch || sType || sQuality || sOwned) && (
                <button onClick={() => { setSSearch(''); setSType(''); setSQuality(''); setSOwned('') }} className="text-xs text-gray-400 hover:text-gray-600 px-1">
                  ✕
                </button>
              )}
              <span className="text-xs text-gray-400 self-center ml-auto">{filteredSkills.length}件</span>
            </div>

            {/* テーブル */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* ヘッダー */}
              <div className="grid grid-cols-[2rem_auto_1fr_auto] gap-x-2 px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-medium">
                <div></div>
                <div>品質</div>
                <div>戦法名 / 効果</div>
                <div>タイプ</div>
              </div>

              {/* 行 */}
              <div className="divide-y divide-gray-100">
                {filteredSkills.map(s => {
                  const us = userSkills[s.id]
                  const owned = us?.owned || false
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleSkillOwned(s.id)}
                      className={`grid grid-cols-[2rem_auto_1fr_auto] gap-x-2 px-3 py-2 items-start cursor-pointer transition-colors select-none ${
                        owned ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* チェック */}
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        owned ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                      }`}>
                        {owned && <span className="text-white text-xs font-bold leading-none">✓</span>}
                      </div>

                      {/* 品質バッジ */}
                      <span className={`text-xs px-1.5 py-0.5 rounded font-bold mt-0.5 ${qualityColor(s.quality)}`}>
                        {s.quality}
                      </span>

                      {/* 戦法名・効果 */}
                      <div className="min-w-0">
                        <span className={`font-semibold text-sm ${owned ? 'text-gray-900' : 'text-gray-400'}`}>
                          {s.name}
                        </span>
                        {s.description_short && (
                          <div className="text-xs text-gray-400 truncate mt-0.5">{s.description_short}</div>
                        )}
                      </div>

                      {/* タイプ */}
                      <span className="text-xs text-gray-500 mt-0.5 text-right">{s.type}</span>
                    </div>
                  )
                })}
              </div>

              {filteredSkills.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">条件に一致する戦法がありません</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}