'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { apiBaseUrl } from '@/lib/api'
import { PortalShell } from '@/components/portal/portal-shell'

type Applicant = { id: string; name: string; email: string; department?: string; role: string; status: string; createdAt: string }
type User = { name: string; email: string; role: 'admin' | 'super_admin' }

export default function RegistrationsPage() {
  const params = useParams<{ role: string }>()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [items, setItems] = useState<Applicant[]>([])
  const [error, setError] = useState('')
  const [loadingItems, setLoadingItems] = useState(true)
  const [working, setWorking] = useState<string | null>(null)

  async function load() {
    setLoadingItems(true)
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/registrations`, { credentials: 'include' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error ?? 'Unable to load registrations')
      setItems(data.items ?? [])
    } finally {
      setLoadingItems(false)
    }
  }

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/auth/me`, { credentials: 'include' })
      .then(async response => {
        if (!response.ok) throw new Error()
        return response.json()
      })
      .then(data => {
        if (!['admin', 'super_admin'].includes(data.user.role)) throw new Error('Access denied')
        setUser(data.user)
        return load()
      })
      .catch(cause => {
        setError(cause instanceof Error ? cause.message : 'Unable to load registrations')
      })
  }, [])

  async function decide(id: string, action: 'approve' | 'reject') {
    setError('')
    setWorking(id)
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/registrations/${id}/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? 'Unable to update registration')
        return
      }
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update registration')
    } finally {
      setWorking(null)
    }
  }

  if (!user) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          {error ? (
            <>
              <p className="eyebrow">REGISTRATIONS</p>
              <h1>{error}</h1>
              <p className="muted">Return to your portal and try again.</p>
            </>
          ) : (
            <div className="loading-panel">
              <Loader2 className="spinner" size={36} />
              <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', margin: '6px 0 12px' }}>Loading applications…</h1>
              <p className="muted" style={{ margin: 0 }}>Verifying administrator access.</p>
            </div>
          )}
        </div>
      </main>
    )
  }

  return (
    <PortalShell
      role={user.role === 'super_admin' ? 'superadmin' : 'admin'}
      user={user}
      onLogout={async () => {
        await fetch(`${apiBaseUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' })
        router.replace('/')
      }}
    >
      <div className="portal-page-heading">
        <div>
          <p className="eyebrow">ACCESS MANAGEMENT</p>
          <h1>Faculty registrations.</h1>
          <p>Review requests waiting for administrative approval.</p>
        </div>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <section className="module-panel registration-list">
        {loadingItems ? (
          <div className="loading-panel">
            <Loader2 className="spinner" size={24} />
            <p>Loading applications…</p>
          </div>
        ) : items.length === 0 ? (
          <p className="muted">No pending faculty applications.</p>
        ) : (
          items.map(item => (
            <article className="registration-row" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <p>{item.email}{item.department ? ` · ${item.department}` : ''}</p>
                <small>{new Date(item.createdAt).toLocaleDateString()} · {item.role} · {item.status}</small>
              </div>
              <div className="registration-actions">
                <button
                  className="button button-dark"
                  disabled={working === item.id}
                  onClick={() => decide(item.id, 'approve')}
                >
                  {working === item.id ? <><Loader2 className="spinner" size={13} /> Processing…</> : 'Approve'}
                </button>
                <button
                  className="button button-light"
                  disabled={working === item.id}
                  onClick={() => decide(item.id, 'reject')}
                >
                  {working === item.id ? <><Loader2 className="spinner" size={13} /> Processing…</> : 'Reject'}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </PortalShell>
  )
}

