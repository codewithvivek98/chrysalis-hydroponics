'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { apiBaseUrl } from '@/lib/api'

const destinations = { super_admin: '/superadmin/dashboard', admin: '/admin/dashboard', faculty: '/faculty/dashboard', member: '/member/dashboard' } as const

type User = { name: string; email: string; role: keyof typeof destinations; status: string }

export default function PortalPage() {
  const router = useRouter(); const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true)
  useEffect(() => { fetch(`${apiBaseUrl}/api/auth/me`, { credentials: 'include' }).then(async response => { if (!response.ok) throw new Error(); return response.json() }).then(data => { setUser(data.user); router.replace(destinations[data.user.role as keyof typeof destinations]) }).catch(() => router.replace('/#login')).finally(() => setLoading(false)) }, [router])
  if (loading || !user) return <main className="auth-page"><div className="auth-card"><div className="loading-panel"><Loader2 className="spinner" size={36} /><p className="eyebrow" style={{ margin: 0 }}>CENTRE PORTAL</p><h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', margin: '6px 0 12px' }}>Checking your session…</h1><p className="muted" style={{ margin: 0 }}>Please wait while we verify your access.</p></div></div></main>
  return null
}
