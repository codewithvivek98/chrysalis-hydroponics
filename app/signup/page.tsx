'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { apiBaseUrl } from '@/lib/api'

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', accountType: 'member', department: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  function update(field: keyof typeof form, value: string) { setForm(current => ({ ...current, [field]: value })) }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (loading) return
    setError(''); setMessage('')
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/register`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, email: form.email, password: form.password, accountType: form.accountType, department: form.department }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to create account')
      setMessage(data.message)
      setForm(current => ({ ...current, password: '', confirmPassword: '' }))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create account') } finally { setLoading(false) }
  }
  return <main className="auth-page"><div className="auth-card auth-card-wide"><Link href="/#top" className="back-link"><ArrowLeft size={16} /> Back to HYDROPONICS</Link><p className="eyebrow">CENTRE PORTAL</p><h1>Join the centre.</h1><p className="muted">Create a member account or request faculty access.</p><form onSubmit={submit} className="auth-form"><label>Full name<input required minLength={2} maxLength={120} autoComplete="name" value={form.name} onChange={event => update('name', event.target.value)} /></label><label>Email<input required type="email" autoComplete="email" value={form.email} onChange={event => update('email', event.target.value)} /></label><div className="form-row"><label>Password<input required minLength={8} maxLength={200} type="password" autoComplete="new-password" value={form.password} onChange={event => update('password', event.target.value)} /></label><label>Confirm password<input required minLength={8} maxLength={200} type="password" autoComplete="new-password" value={form.confirmPassword} onChange={event => update('confirmPassword', event.target.value)} /></label></div><label>Account type<select value={form.accountType} onChange={event => update('accountType', event.target.value)}><option value="member">Student / Member</option><option value="faculty">Faculty</option></select></label><label>Department or research area <span className="optional">Optional</span><input maxLength={160} value={form.department} onChange={event => update('department', event.target.value)} /></label>{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}<button className="button button-dark" disabled={loading}>{loading ? 'Creating account…' : 'Create account'} <ArrowRight size={17} /></button></form><p className="auth-note">Already have an account? <Link href="/login" className="text-link">Sign in</Link></p></div></main>
}
