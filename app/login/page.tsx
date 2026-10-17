'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { apiBaseUrl } from '@/lib/api'

const destinations = { super_admin: '/superadmin/dashboard', admin: '/admin/dashboard', faculty: '/faculty/dashboard', member: '/member/dashboard' } as const

export default function LoginPage() {
  const router = useRouter(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent) { event.preventDefault(); if (loading) return; setLoading(true); setError(''); try { const response = await fetch(`${apiBaseUrl}/api/auth/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? 'Unable to sign in'); router.replace(destinations[data.user.role as keyof typeof destinations]) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to sign in') } finally { setLoading(false) } }
  return <main className="auth-page"><div className="auth-card"><Link href="/#top" className="back-link"><ArrowLeft size={16} /> Back to Hydroce</Link><p className="eyebrow">CENTRE PORTAL</p><h1>Welcome back.</h1><p className="muted">Sign in with your centre account to continue.</p><form onSubmit={submit} className="auth-form"><label>Email<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label><label>Password<input required minLength={8} type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'} <ArrowRight size={17} /></button></form><p className="auth-note">Need access? <Link href="/signup" className="text-link">Create an account</Link></p></div></main>
}
