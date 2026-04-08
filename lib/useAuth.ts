'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'

export function useAuth(requireAdmin = false) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (!data) {
        router.push('/login')
        return
      }

      if (requireAdmin && !data.is_admin) {
        router.push('/seasons')
        return
      }

      setProfile(data)
      setLoading(false)
    }
    init()
  }, [router, requireAdmin])

  return { profile, loading }
}
