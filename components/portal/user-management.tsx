'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { apiBaseUrl } from '@/lib/api'

type User = { id: string; name: string; email: string; department?: string; role: string; status: string; createdAt?: string }

const roleLabel: Record<string, string> = { super_admin: 'Super Admin', admin: 'Admin', faculty: 'Faculty', member: 'Member' }
const statusLabel: Record<string, string> = { active: 'Active', pending_approval: 'Pending approval', rejected: 'Rejected', disabled: 'Disabled' }

export function UserManagement({ actorRole }: { actorRole: 'admin' | 'superadmin' }) {
  const [users, setUsers] = useState<User[]>([])
  const [pending, setPending] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [working, setWorking] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (role) params.set('role', role)
      if (status) params.set('status', status)
      const [usersResponse, pendingResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/auth/users?${params}`, { credentials: 'include' }),
        fetch(`${apiBaseUrl}/api/auth/registrations`, { credentials: 'include' }),
      ])
      const usersBody = await usersResponse.json()
      const pendingBody = await pendingResponse.json()
      if (!usersResponse.ok) throw new Error(usersBody.error || 'Unable to load users')
      if (!pendingResponse.ok) throw new Error(pendingBody.error || 'Unable to load approvals')
      setUsers(usersBody.items ?? [])
      setPending(pendingBody.items ?? [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load users')
    } finally { setLoading(false) }
  }, [role, search, status])

  useEffect(() => { void load() }, [load])

  async function changeStatus(id: string, nextStatus: 'active' | 'disabled') {
    const label = nextStatus === 'disabled' ? 'disable' : 'enable'
    if (!window.confirm(`Are you sure you want to ${label} this account?`)) return
    setWorking(id)
    setError('')
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/users/${id}/status`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: nextStatus }), credentials: 'include' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || `Unable to ${label} account`)
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : `Unable to ${label} account`) }
    finally { setWorking(null) }
  }

  async function deletePermanently(id: string, name: string) {
    if (!window.confirm(`Permanently delete ${name}'s account? This is irreversible. Audit history is retained, but the user document will be removed.`)) return
    setWorking(id)
    setError('')
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/users/${id}`, { method: 'DELETE', credentials: 'include' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Unable to permanently delete account')
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to permanently delete account') }
    finally { setWorking(null) }
  }

  async function decide(id: string, decision: 'approve' | 'reject') {
    setWorking(id)
    setError('')
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/registrations/${id}/${decision}`, { method: 'POST', credentials: 'include' })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || `Unable to ${decision} application`)
      await load()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update application') }
    finally { setWorking(null) }
  }

  const pendingCount = useMemo(() => pending.length, [pending.length])
  return <section className="module-panel user-management-panel">
    <div className="module-heading"><div><p className="eyebrow">ACCESS ADMINISTRATION</p><h2>User Management</h2><p className="muted">Registered accounts and faculty applications from MongoDB.</p></div><span className="module-badge">{loading ? 'Loading' : `${users.length} users`}</span></div>
    {error && <div className="portal-note"><strong>Unable to complete request.</strong><p>{error}</p></div>}
    <div className="user-filters"><label className="user-search"><Search size={16} /><span className="sr-only">Search users</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name or email" /></label><label><span className="sr-only">Filter by role</span><select value={role} onChange={event => setRole(event.target.value)}><option value="">All roles</option><option value="super_admin">Super Admin</option><option value="admin">Admin</option><option value="faculty">Faculty</option><option value="member">Member</option></select></label><label><span className="sr-only">Filter by status</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="pending_approval">Pending approval</option><option value="rejected">Rejected</option><option value="disabled">Disabled</option></select></label></div>
    <div className="approval-block"><div className="module-heading"><div><p className="eyebrow">REVIEW QUEUE</p><h3>Pending Faculty Approvals</h3></div><span className="module-badge">{pendingCount} pending</span></div>{pendingCount === 0 ? <p className="muted">There are no pending Faculty applications.</p> : <div className="approval-list">{pending.map(item => <div className="approval-row" key={item.id}><div><strong>{item.name}</strong><span>{item.email}{item.department ? ` · ${item.department}` : ''}</span><small>Registered {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</small></div><div className="approval-actions"><button className="button button-dark" disabled={working === item.id} onClick={() => void decide(item.id, 'approve')}><Check size={15} /> Approve</button><button className="button button-light" disabled={working === item.id} onClick={() => void decide(item.id, 'reject')}><X size={15} /> Reject</button></div></div>)}</div>}</div>
    <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Registered</th><th>Actions</th></tr></thead><tbody>{users.length ? users.map(item => <tr key={item.id}><td>{item.name}</td><td>{item.email}</td><td>{roleLabel[item.role] ?? item.role}</td><td>{statusLabel[item.status] ?? item.status}</td><td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</td><td>{(actorRole === 'superadmin' ? ['admin', 'faculty', 'member'] : ['faculty', 'member']).includes(item.role) ? <div className="table-actions">{item.status === 'disabled' ? <button className="button button-light" disabled={working === item.id} onClick={() => void changeStatus(item.id, 'active')}>Enable</button> : <button className="button button-light" disabled={working === item.id} onClick={() => void changeStatus(item.id, 'disabled')}>Disable</button>}<button className="button button-danger" disabled={working === item.id} onClick={() => void deletePermanently(item.id, item.name)}>Delete permanently</button></div> : <span className="muted">—</span>}</td></tr>) : <tr><td colSpan={6}>{loading ? 'Loading users…' : 'No users match these filters.'}</td></tr>}</tbody></table></div>
  </section>
}
