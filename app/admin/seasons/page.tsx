'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import NavBar from '@/components/NavBar'
import { Season } from '@/lib/types'

export default function AdminSeasonsPage() {
  const { profile, loading } = useAuth(true)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!loading) loadSeasons()
  }, [loading])

  const loadSeasons = async () => {
    const { data } = await supabase.from('seasons').select('*').order('id', { ascending: false })
    setSeasons(data || [])
  }

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    await supabase.from('seasons').insert({ name: newName.trim() })
    setNewName('')
    setAdding(false)
    await loadSeasons()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('このシーズンを削除しますか？\n（関連する編成データも全て削除されます）')) return
    await supabase.from('seasons').delete().eq('id', id)
    await loadSeasons()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">読み込み中...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar profile={profile} />
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-xl font-medium mb-6">シーズン管理</h1>

        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="text-sm font-medium text-gray-700 mb-3">新規シーズンを追加</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="例：S24"
              className="flex-1 border rounded px-3 py-2 text-sm"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              追加
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {seasons.map(s => (
            <div key={s.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString('ja-JP')}</div>
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                className="text-sm text-red-500 hover:text-red-700"
              >
                削除
              </button>
            </div>
          ))}
          {seasons.length === 0 && (
            <div className="text-center text-gray-400 py-8 text-sm">シーズンがありません</div>
          )}
        </div>
      </div>
    </div>
  )
}
