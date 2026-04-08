'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import NavBar from '@/components/NavBar'
import { Season } from '@/lib/types'

export default function SeasonsPage() {
  const { profile, loading } = useAuth()
  const [seasons, setSeasons] = useState<Season[]>([])
  const router = useRouter()

  useEffect(() => {
    if (!loading) loadSeasons()
  }, [loading])

  const loadSeasons = async () => {
    const { data } = await supabase
      .from('seasons')
      .select('*')
      .order('id', { ascending: false })
    setSeasons(data || [])
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
        <h1 className="text-xl font-medium mb-6">シーズンを選択</h1>
        {seasons.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            <p>シーズンがまだありません</p>
            {profile?.is_admin && (
              <button
                onClick={() => router.push('/admin/seasons')}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                シーズンを作成する →
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {seasons.map(season => (
              <button
                key={season.id}
                onClick={() => router.push(`/formations?season=${season.id}&name=${encodeURIComponent(season.name)}`)}
                className="bg-white border border-gray-200 rounded-lg p-5 text-left hover:border-blue-400 hover:shadow-sm transition-all"
              >
                <div className="font-medium text-lg">{season.name}</div>
                <div className="text-sm text-gray-400 mt-1">
                  作成日: {new Date(season.created_at).toLocaleDateString('ja-JP')}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
