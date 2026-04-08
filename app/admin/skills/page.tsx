'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import NavBar from '@/components/NavBar'
import { Skill } from '@/lib/types'
import { qualityColor } from '@/lib/utils'

const SKILL_TYPES = ['指揮', 'アクティブ', 'パッシブ', '突撃', '陣法']
const QUALITIES = ['S', 'A', 'B', 'C']
const TROOP_KEYS = [
  { key: 'cavalry', label: '騎兵' },
  { key: 'shield', label: '盾兵' },
  { key: 'bow', label: '弓兵' },
  { key: 'spear', label: '槍兵' },
  { key: 'weapon', label: '兵器' },
]

const empty = (): Partial<Skill> => ({
  name: '', type: '指揮', quality: 'S',
  cavalry: false, shield: false, bow: false, spear: false, weapon: false,
  main_effect: '', sub_effect: '', prepare: 0, cooltime: 0,
  description_short: '', description_full: '',
})

export default function AdminSkillsPage() {
  const { profile, loading } = useAuth(true)
  const [skills, setSkills] = useState<Skill[]>([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterQuality, setFilterQuality] = useState('')
  const [filterTroop, setFilterTroop] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Partial<Skill>>(empty())
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => { if (!loading) load() }, [loading])

  const load = async () => {
    const { data } = await supabase.from('skills').select('*')
    const sorted = (data || []).sort((a, b) => {
      const q = ['S', 'A', 'B', 'C']
      return q.indexOf(a.quality) - q.indexOf(b.quality) || a.name.localeCompare(b.name, 'ja')
    })
    setSkills(sorted)
  }

  const handleSave = async () => {
    if (!editing.name?.trim()) { alert('戦法名を入力してください'); return }
    setSaving(true)
    if (editing.id) {
      await supabase.from('skills').update(editing).eq('id', editing.id)
    } else {
      await supabase.from('skills').insert(editing)
    }
    setSaving(false)
    setShowModal(false)
    await load()
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    await supabase.from('skills').delete().eq('id', id)
    await load()
  }

  const filtered = skills.filter(s => {
    if (search && !s.name.includes(search)) return false
    if (filterType && s.type !== filterType) return false
    if (filterQuality && s.quality !== filterQuality) return false
    if (filterTroop && !(s as Record<string, unknown>)[filterTroop]) return false
    return true
  })

  const set = (key: string, val: unknown) => setEditing(prev => ({ ...prev, [key]: val }))

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">読み込み中...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar profile={profile} />
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h1 className="text-xl font-medium">戦法DB管理 ({skills.length}件)</h1>
          <button onClick={() => { setEditing(empty()); setShowModal(true) }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            + 戦法を追加
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
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
            <option value="">タイプ</option>
            {SKILL_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <select value={filterQuality} onChange={e => setFilterQuality(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
            <option value="">品質</option>
            {QUALITIES.map(q => <option key={q}>{q}</option>)}
          </select>
          <select value={filterTroop} onChange={e => setFilterTroop(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
            <option value="">兵種</option>
            {TROOP_KEYS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <button
            onClick={() => { setSearch(''); setFilterType(''); setFilterQuality(''); setFilterTroop('') }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2"
          >
            リセット
          </button>
        </div>

        <p className="text-xs text-gray-500 mb-2 px-1">{filtered.length}件表示</p>

        {/* 戦法リスト */}
        <div className="space-y-2">
          {filtered.map(s => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-lg">
              <div
                className="p-3 cursor-pointer"
                onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded font-bold ${qualityColor(s.quality)}`}>{s.quality}</span>
                      <span className="font-semibold text-gray-900">{s.name}</span>
                      <span className="text-xs text-gray-600">{s.type}</span>
                      <div className="flex gap-1">
                        {TROOP_KEYS.filter(t => (s as Record<string, unknown>)[t.key]).map(t => (
                          <span key={t.key} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{t.label.slice(0, 1)}</span>
                        ))}
                      </div>
                    </div>
                    {/* 効果概要を濃く表示 */}
                    {s.description_short && (
                      <div className="text-sm text-gray-800 mt-1">{s.description_short}</div>
                    )}
                  </div>
                  <div className="flex gap-3 flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); setEditing({ ...s }); setShowModal(true) }} className="text-blue-600 text-sm font-medium">編集</button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(s.id, s.name) }} className="text-red-500 text-sm">削除</button>
                  </div>
                </div>

                {/* 展開時の詳細 */}
                {expandedId === s.id && s.description_full && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-sm text-gray-800 leading-relaxed">{s.description_full}</div>
                    {(s.main_effect || s.sub_effect) && (
                      <div className="flex gap-3 mt-2">
                        {s.main_effect && <span className="text-xs text-gray-600">主将: {s.main_effect}</span>}
                        {s.sub_effect && <span className="text-xs text-gray-600">副将: {s.sub_effect}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
              条件に一致する戦法がありません
            </div>
          )}
        </div>
      </div>

      {/* 編集モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto py-4">
          <div className="bg-white rounded-lg p-5 w-full max-w-xl mx-4 my-auto">
            <h2 className="font-medium text-lg mb-4">{editing.id ? '戦法を編集' : '戦法を追加'}</h2>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1 font-medium">戦法名 *</label>
                <input value={editing.name || ''} onChange={e => set('name', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1 font-medium">タイプ</label>
                <select value={editing.type || '指揮'} onChange={e => set('type', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {SKILL_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1 font-medium">品質</label>
                <select value={editing.quality || 'S'} onChange={e => set('quality', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  {QUALITIES.map(q => <option key={q}>{q}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1 font-medium">準備 / CT</label>
                <div className="flex gap-1">
                  <input type="number" value={editing.prepare || 0} onChange={e => set('prepare', Number(e.target.value))} className="w-full border rounded-lg px-2 py-2 text-sm" placeholder="準備" />
                  <input type="number" value={editing.cooltime || 0} onChange={e => set('cooltime', Number(e.target.value))} className="w-full border rounded-lg px-2 py-2 text-sm" placeholder="CT" />
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="text-xs text-gray-600 block mb-1 font-medium">兵種対応</label>
              <div className="flex gap-3 flex-wrap">
                {TROOP_KEYS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={(editing as Record<string, boolean>)[key] || false}
                      onChange={e => set(key, e.target.checked)}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1 font-medium">主将効果</label>
                <input value={editing.main_effect || ''} onChange={e => set('main_effect', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1 font-medium">副将効果</label>
                <input value={editing.sub_effect || ''} onChange={e => set('sub_effect', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="mb-3">
              <label className="text-xs text-gray-600 block mb-1 font-medium">効果概要</label>
              <input value={editing.description_short || ''} onChange={e => set('description_short', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="mb-4">
              <label className="text-xs text-gray-600 block mb-1 font-medium">詳細説明</label>
              <textarea value={editing.description_full || ''} onChange={e => set('description_full', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm h-24 resize-none" />
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
