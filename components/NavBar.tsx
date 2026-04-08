'use client'

import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'

type Props = {
  profile: Profile | null
}

export default function NavBar({ profile }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { label: 'シーズン選択', href: '/seasons' },
    { label: 'マイページ', href: '/mypage' },
  ]

  const adminItems = [
    { label: '武将DB', href: '/admin/generals' },
    { label: '戦法DB', href: '/admin/skills' },
    { label: 'シーズン管理', href: '/admin/seasons' },
    { label: 'テンプレート', href: '/admin/templates' },
    { label: 'ユーザー管理', href: '/admin/users' },
  ]

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-4 flex-wrap">
        <span
          className="font-medium text-gray-800 cursor-pointer"
          onClick={() => router.push('/seasons')}
        >
          三国志真戦
        </span>
        {navItems.map(item => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={`text-sm px-3 py-1 rounded ${
              pathname === item.href
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {item.label}
          </button>
        ))}
        {profile?.is_admin && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-gray-400 mr-1">管理者:</span>
            {adminItems.map(item => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`text-sm px-3 py-1 rounded ${
                  pathname.startsWith(item.href)
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">{profile?.username}</span>
        {profile?.is_admin && (
          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">管理者</span>
        )}
        <button
          onClick={handleLogout}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ログアウト
        </button>
      </div>
    </nav>
  )
}
