'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import NavBar from '@/components/NavBar'
import { Template, General, Skill } from '@/lib/types'
import { TROOP_TYPES } from '@/lib/utils'

const empty = (): Partial<Template> => ({
  name: '', description: '', troop_type: '騎兵',
  general1_id: null, general2_id: null, general3_id: null,
  skill2_g1: null, skill3_g1: null,
  skill2_g2: null, skill3_g2: null,
  skill2_g3: null, skill3_g3: null,
})

export default function AdminTemplatesPage() {
  const { profile, loading } = useAuth(true)
  const [templates, setTemplates] = useState<Template[]>([])
  const [generals, setGenerals] = useState<General[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Partial<Template>>(empty())
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (!loading) loadAll() }, [loading])

  const loadAll = async () => {
    const [tRes, gRes, sRes] = await Promise.all([
      supabase.from('templates').select('*').order('name'),
      supabase.from('generals').select('*').order('name'),
      supabase.from('skills').select('*').order('quality').order('name'),
    ])
    setTemplates(tRes.data || [])
    setGenerals(gRes.data || [])
    setSkills(sRes.data || [])
  }

  const getGeneral = (id: number | null) => generals.find(g => g.id === id)
  const getSkill = (id: number | null) => skills.find(s => s.id === id)

  const handleSave = async () => {
    if (!editing.name?.trim()) { alert('テンプレート名を入力してください'); return }
    setSaving(true)
    if (editing.id) {
      await supabase.from('templates').update(editing).eq('id', editing.id)
    } else {
      await supabase.from('templates').insert(editing)
    }
    setSaving(false)
    setShowModal(false)
    await loadAll()
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return
    await supabase.from('templates').delete().eq('id', id)
    await loadAll()
  }

  const set = (key: string, val: unknown) => setEditing(prev => ({ ...prev, [key]: val }))

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">読み込み中...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar profile={profile} />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-medium">テンプレート編成管理</h1>
          <button onClick={() => { setEditing(empty()); setShowModal(true) }} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">+ テンプレートを追加</button>
        </div>

        <div className="grid gap-3">
          {templates.map(t => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{t.name}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t.troop_type}</span>
                  </div>
                  {t.description && <div className="text-xs text-gray-400 mb-2">{t.description}</div>}
                  <div className="flex gap-2 text-sm">
                    {[t.general1_id, t.general2_id, t.general3_id].map((id, i) => (
                      <span key={i} className={`px-2 py-0.5 rounded text-xs ${id ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-400'}`}>
                        {getGeneral(id)?.name || '空き'}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => { setEditing({ ...t }); setShowModal(true) }} className="text-blue-600 hover:underline text-xs">編集</button>
                  <button onClick={() => handleDelete(t.id, t.name)} className="text-red-500 hover:underline text-xs">削除</button>
                </div>
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400">テンプレートがありません</div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="font-medium mb-4">{editing.id ? 'テンプレートを編集' : 'テンプレートを追加'}</h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">テンプレート名 *</label>
                <input value={editing.name || ''} onChange={e => set('name', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">兵種</label>
                <select value={editing.troop_type || '騎兵'} onChange={e => set('troop_type', e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                  {TROOP_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">説明</label>
                <input value={editing.description || ''} onChange={e => set('description', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="編成の特徴や使い方など" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {([1, 2, 3] as const).map(slot => (
                <div key={slot} className="border border-gray-200 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-2">{slot === 1 ? '主将' : `副将${slot - 1}`}</div>
                  <div className="mb-2">
                    <label className="text-xs text-gray-500 block mb-1">武将</label>
                    <select
                      value={(editing as Record<string, number | null>)[`general${slot}_id`] || ''}
                      onChange={e => set(`general${slot}_id`, e.target.value ? Number(e.target.value) : null)}
                      className="w-full border rounded px-2 py-1 text-xs"
                    >
                      <option value="">未設定</option>
                      {generals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div className="mb-2">
                    <label className="text-xs text-gray-500 block mb-1">第2戦法</label>
                    <select
                      value={(editing as Record<string, number | null>)[`skill2_g${slot}`] || ''}
                      onChange={e => set(`skill2_g${slot}`, e.target.value ? Number(e.target.value) : null)}
                      className="w-full border rounded px-2 py-1 text-xs"
                    >
                      <option value="">未設定</option>
                      {skills.map(s => <option key={s.id} value={s.id}>[{s.quality}]{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">第3戦法</label>
                    <select
                      value={(editing as Record<string, number | null>)[`skill3_g${slot}`] || ''}
                      onChange={e => set(`skill3_g${slot}`, e.target.value ? Number(e.target.value) : null)}
                      className="w-full border rounded px-2 py-1 text-xs"
                    >
                      <option value="">未設定</option>
                      {skills.map(s => <option key={s.id} value={s.id}>[{s.quality}]{s.name}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 py-2 rounded text-sm">キャンセル</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded text-sm disabled:opacity-50">{saving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
