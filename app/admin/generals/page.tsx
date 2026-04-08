'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import NavBar from '@/components/NavBar'
import { General } from '@/lib/types'
import { factionColor, aptColor, FACTIONS } from '@/lib/utils'

const APT = ['S', 'A', 'B', 'C']
const TAGS = [
  { key: 'tag_bu', label: '武' }, { key: 'tag_tate', label: '盾' },
  { key: 'tag_sen', label: '戦' }, { key: 'tag_bou', label: '謀' },
  { key: 'tag_ho', label: '補' }, { key: 'tag_hiku', label: '控' },
  { key: 'tag_i', label: '医' }, { key: 'tag_ken', label: '兼' },
  { key: 'tag_sei', label: '政' }, { key: 'tag_mi', label: '魅' },
  { key: 'tag_ko', label: '黄' }, { key: 'tag_ban', label: '蛮' },
  { key: 'tag_sen2', label: '仙' }, { key: 'tag_musou', label: '無双' },
  { key: 'tag_hizo', label: '秘蔵' }, { key: 'tag_anime', label: 'アニメ' },
]

const emptyGeneral = (): Partial<General> => ({
  name: '', faction: '魏', cost: 7,
  cavalry: 'S', shield: 'A', bow: 'B', spear: 'A', weapon: 'C',
  attack: 0, attack_growth: 0, defense: 0, defense_growth: 0,
  intel: 0, intel_growth: 0, speed: 0, speed_growth: 0,
  politics: 0, politics_growth: 0, charm: 0, charm_growth: 0,
  unique_skill: '',
  tag_bu: false, tag_tate: false, tag_sen: false, tag_bou: false,
  tag_ho: false, tag_hiku: false, tag_i: false, tag_ken: false,
  tag_sei: false, tag_mi: false, tag_ko: false, tag_ban: false,
  tag_sen2: false, tag_musou: false, tag_hizo: false, tag_anime: false,
})

export default function AdminGeneralsPage() {
  const { profile, loading } = useAuth(true)
  const [generals, setGenerals] = useState<General[]>([])
  const [search, setSearch] = useState('')
  const [filterFaction, setFilterFaction] = useState('')
  const [filterCost, setFilterCost] = useState('')
  const [filterApt, setFilterApt] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Partial<General>>(emptyGeneral())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading) loadGenerals()
  }, [loading])

  const loadGenerals = async () => {
    const { data } = await supabase.from('generals').select('*')
    const sorted = (data || []).sort((a, b) => {
      if (b.cost !== a.cost) return b.cost - a.cost
      return a.name.localeCompare(b.name, 'ja')
    })
    setGenerals(sorted)
  }

  const openNew = () => { setEditing(emptyGeneral()); setShowModal(true) }
  const openEdit = (g: General) => { setEditing({ ...g }); setShowModal(true) }

  const handleSave = async () => {
    if (!editing.name?.trim()) { alert('武将名を入力してください'); return }
    setSaving(true)
    if (editing.id) {
      await supabase.from('generals').update(editing).eq('id', editing.id)
    } else {
      await supabase.from('generals').insert(editing)
    }
    setSaving(false)
    setShowModal(false)
    await loadGenerals()
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    await supabase.from('generals').delete().eq('id', id)
    await loadGenerals()
  }

  const filtered = generals.filter(g => {
    if (search && !g.name.includes(search)) return false
    if (filterFaction && g.faction !== filterFaction) return false
    if (filterCost && String(g.cost) !== filterCost) return false
    if (filterApt) {
      const hasApt = [g.cavalry, g.shield, g.bow, g.spear, g.weapon].includes(filterApt)
      if (!hasApt) return false
    }
    if (filterTag) {
      if (!(g as Record<string, unknown>)[filterTag]) return false
    }
    return true
  })

  const set = (key: string, val: unknown) => setEditing(prev => ({ ...prev, [key]: val }))

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">読み込み中...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar profile={profile} />
      <div className="max-w-5xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h1 className="text-xl font-medium">武将DB管理 ({generals.length}件)</h1>
          <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + 武将を追加
          </button>
        </div>

        {/* フィルター */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4 flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="名前で検索"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-32"
          />
          <select value={filterFaction} onChange={e => setFilterFaction(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
            <option value="">陣営</option>
            {FACTIONS.map(f => <option key={f}>{f}</option>)}
          </select>
          <select value={filterCost} onChange={e => setFilterCost(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
            <option value="">コスト</option>
            {[7, 6, 5, 4].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterApt} onChange={e => setFilterApt(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
            <option value="">適性S含む</option>
            {['S', 'A'].map(a => <option key={a} value={a}>{a}適性あり</option>)}
          </select>
          <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
            <option value="">タグ</option>
            {TAGS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <button
            onClick={() => { setSearch(''); setFilterFaction(''); setFilterCost(''); setFilterApt(''); setFilterTag('') }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2"
          >
            リセット
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-2 px-1">{filtered.length}件表示</p>

        {/* 武将リスト（スマホ対応カード形式） */}
        <div className="space-y-2">
          {filtered.map(g => (
            <div key={g.id} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{g.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${factionColor(g.faction)}`}>{g.faction}</span>
                    <span className="text-xs text-gray-600 font-medium">コスト{g.cost}</span>
                  </div>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {(['騎', '盾', '弓', '槍', '兵'] as const).map((label, i) => {
                      const keys = ['cavalry', 'shield', 'bow', 'spear', 'weapon'] as const
                      const val = g[keys[i]] as string
                      return (
                        <span key={label} className={`text-xs px-1.5 py-0.5 rounded font-medium ${aptColor(val)}`}>
                          {label}:{val}
                        </span>
                      )
                    })}
                  </div>
                  {g.unique_skill && (
                    <div className="text-sm text-gray-700 mt-1">{g.unique_skill}</div>
                  )}
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {TAGS.filter(t => (g as Record<string, unknown>)[t.key]).map(t => (
                      <span key={t.key} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{t.label}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 flex-shrink-0">
                  <button onClick={() => openEdit(g)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">編集</button>
                  <button onClick={() => handleDelete(g.id, g.name)} className="text-red-500 hover:text-red-700 text-sm">削除</button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
              条件に一致する武将がいません
            </div>
          )}
        </div>
      </div>

      {/* 編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto py-4">
          <div className="bg-white rounded-lg p-5 w-full max-w-2xl mx-4 my-auto">
            <h2 className="font-medium text-lg mb-4">{editing.id ? '武将を編集' : '武将を追加'}</h2>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1 font-medium">武将名 *</label>
                <input value={editing.name || ''} onChange={e => set('name', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1 font-medium">陣営</label>
                <select value={editing.faction || '魏'} onChange={e => set('faction', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {FACTIONS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1 font-medium">コスト</label>
                <select value={editing.cost || 7} onChange={e => set('cost', Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {[7, 6, 5, 4].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1 font-medium">固有戦法</label>
                <input value={editing.unique_skill || ''} onChange={e => set('unique_skill', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="mb-3">
              <label className="text-xs text-gray-600 block mb-1 font-medium">兵種適性</label>
              <div className="grid grid-cols-5 gap-2">
                {[['cavalry', '騎兵'], ['shield', '盾兵'], ['bow', '弓兵'], ['spear', '槍兵'], ['weapon', '兵器']].map(([key, label]) => (
                  <div key={key}>
                    <div className="text-xs text-gray-500 mb-1">{label}</div>
                    <select value={(editing as Record<string, string>)[key] || 'C'} onChange={e => set(key, e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm">
                      {APT.map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="text-xs text-gray-600 block mb-1 font-medium">能力値（基本値 / 成長値）</label>
              <div className="grid grid-cols-3 gap-2">
                {[['attack', '武力'], ['defense', '統率'], ['intel', '知力'], ['speed', '速度'], ['politics', '政治'], ['charm', '魅力']].map(([key, label]) => (
                  <div key={key}>
                    <div className="text-xs text-gray-500 mb-1">{label}</div>
                    <div className="flex gap-1">
                      <input type="number" value={(editing as Record<string, number>)[key] || 0} onChange={e => set(key, Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm" placeholder="基本" />
                      <input type="number" step="0.01" value={(editing as Record<string, number>)[`${key}_growth`] || 0} onChange={e => set(`${key}_growth`, Number(e.target.value))} className="w-full border rounded px-2 py-1 text-sm" placeholder="成長" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs text-gray-600 block mb-2 font-medium">タグ</label>
              <div className="flex gap-2 flex-wrap">
                {TAGS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => set(key, !(editing as Record<string, boolean>)[key])}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                      (editing as Record<string, boolean>)[key]
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 py-2.5 rounded-lg text-sm font-medium">キャンセル</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
