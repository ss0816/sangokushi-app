'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/useAuth'
import NavBar from '@/components/NavBar'
import { Profile } from '@/lib/types'

export default function AdminUsersPage() {
  const { profile, loading } = useAuth(true)
  const [users, setUsers] = useState<Profile[]>([])
  const [showModal, setShowModal] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newIsAdmin, setNewIsAdmin] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (!loading) loadUsers() }, [loading])

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('username')
    setUsers(data || [])
  }

  const handleCreate = async () => {
    if (!newEmail.trim() || !newPassword.trim() || !newUsername.trim()) {
      setError('全項目を入力してください')
      return
    }
    setSaving(true)
    setError('')

    const { data: authData, error: authError } = await supabase.auth.admin
      ? // admin APIが使えない場合は通常のsignUpを使う
      { data: null, error: new Error('admin API not available') }
      : { data: null, error: new Error('admin API not available') }

    // 通常のsignUpで作成
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: newEmail.trim(),
      password: newPassword.trim(),
    })

    if (signUpError || !signUpData.user) {
      setError(signUpError?.message || 'ユーザー作成に失敗しました')
      setSaving(false)
      return
    }

    // profilesに追加
    const { error: profileError } = await supabase.from('profiles').insert({
      id: signUpData.user.id,
      username: newUsername.trim(),
      is_admin: newIsAdmin,
    })

    if (profileError) {
      setError('プロフィール作成に失敗しました: ' + profileError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    setShowModal(false)
    setNewEmail('')
    setNewPassword('')
    setNewUsername('')
    setNewIsAdmin(false)
    await loadUsers()
  }

  const toggleAdmin = async (user: Profile) => {
    if (user.id === profile?.id) { alert('自分の権限は変更できません'); return }
    await supabase.from('profiles').update({ is_admin: !user.is_admin }).eq('id', user.id)
    await loadUsers()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">読み込み中...</p></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar profile={profile} />
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-medium">ユーザー管理 ({users.length}人)</h1>
          <button onClick={() => { setShowModal(true); setError('') }} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">+ ユーザーを追加</button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">ユーザー名</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">権限</th>
                <th className="text-left px-4 py-2 text-xs text-gray-500 font-medium">作成日</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {u.username}
                    {u.id === profile?.id && <span className="text-xs text-gray-400 ml-2">（あなた）</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${u.is_admin ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.is_admin ? '管理者' : '一般'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString('ja-JP')}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAdmin(u)}
                      disabled={u.id === profile?.id}
                      className="text-xs text-blue-600 hover:underline disabled:text-gray-300 disabled:no-underline"
                    >
                      {u.is_admin ? '一般に変更' : '管理者に変更'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
          <p className="font-medium mb-1">ユーザー追加について</p>
          <p className="text-xs">新しいメンバーには、このページでアカウントを作成し、ログイン情報を別途共有してください。</p>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4">
            <h2 className="font-medium mb-4">新規ユーザーを追加</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">ユーザー名（表示名）</label>
                <input value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="例：田中" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">メールアドレス</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="例：tanaka@example.com" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">パスワード</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="6文字以上" />
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newIsAdmin} onChange={e => setNewIsAdmin(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm">管理者権限を付与</span>
                </label>
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 py-2 rounded text-sm">キャンセル</button>
              <button onClick={handleCreate} disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded text-sm disabled:opacity-50">
                {saving ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
