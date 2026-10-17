'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiBaseUrl } from '@/lib/api'

const destinations = { super_admin: '/superadmin/dashboard', admin: '/admin/dashboard', faculty: '/faculty/dashboard', member: '/member/dashboard' } as const

type User = { name: string; email: string; role: keyof typeof destinations; status: string }

export default function PortalPage() {
  const router = useRouter(); const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true)
  useEffect(() => { fetch(`${apiBaseUrl}/api/auth/me`, { credentials: 'include' }).then(async response => { if (!response.ok) throw new Error(); return response.json() }).then(data => { setUser(data.user); router.replace(destinations[data.user.role as keyof typeof destinations]) }).catch(() => router.replace('/#login')).finally(() => setLoading(false)) }, [router])
  if (loading || !user) return <main className="auth-page"><div className="auth-card"><p className="eyebrow">CENTRE PORTAL</p><h1>Checking your session…</h1><p className="muted">Please wait while we verify your access.</p></div></main>
  return null
}
