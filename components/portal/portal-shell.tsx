'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, ChevronDown, Leaf, LogOut, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiBaseUrl } from '@/lib/api'

export type PortalRole = 'superadmin' | 'admin' | 'faculty' | 'member'

const roleLabels: Record<PortalRole, string> = { superadmin: 'Super Admin', admin: 'Admin', faculty: 'Faculty', member: 'Member' }
const navItems: Record<PortalRole, { label: string; href: string; icon: string }[]> = {
  superadmin: [{ label: 'Dashboard', href: 'dashboard', icon: '⌂' }, { label: 'Audit Log', href: 'audit-log', icon: '◷' }, { label: 'Admin Management', href: 'admins', icon: '⊙' }, { label: 'User Management', href: 'users', icon: '♙' }, { label: 'Attendance', href: 'attendance', icon: '✓' }, { label: 'Inventory', href: 'inventory', icon: '▦' }, { label: 'Projects', href: 'projects', icon: '◈' }, { label: 'Website Content', href: 'content', icon: '□' }, { label: 'Reports', href: 'reports', icon: '▥' }, { label: 'System Settings', href: 'settings', icon: '⚙' }],
  admin: [{ label: 'Dashboard', href: 'dashboard', icon: '⌂' }, { label: 'Users', href: 'users', icon: '♙' }, { label: 'Attendance', href: 'attendance', icon: '✓' }, { label: 'Inventory', href: 'inventory', icon: '▦' }, { label: 'Projects', href: 'projects', icon: '◈' }, { label: 'Website Content', href: 'content', icon: '□' }, { label: 'Reports', href: 'reports', icon: '▥' }],
  faculty: [{ label: 'Dashboard', href: 'dashboard', icon: '⌂' }, { label: 'My Students', href: 'students', icon: '♙' }, { label: 'Attendance', href: 'attendance', icon: '✓' }, { label: 'Projects', href: 'projects', icon: '◈' }, { label: 'Inventory', href: 'inventory', icon: '▦' }, { label: 'Reports', href: 'reports', icon: '▥' }],
  member: [{ label: 'Dashboard', href: 'dashboard', icon: '⌂' }, { label: 'Attendance', href: 'attendance', icon: '✓' }, { label: 'Projects', href: 'projects', icon: '◈' }, { label: 'Notices', href: 'notices', icon: '□' }, { label: 'Profile', href: 'profile', icon: '♙' }],
}

export function PortalShell({ role, user, children, onLogout }: { role: PortalRole; user: { name: string; email: string }; children: ReactNode; onLogout: () => void }) {
  const [open, setOpen] = useState(false); const pathname = usePathname(); const items = navItems[role]
  return <div className="portal-app"><aside className={open ? 'portal-sidebar open' : 'portal-sidebar'}><div className="portal-brand"><span className="portal-logo"><Leaf size={19} fill="currentColor" /></span><span>HYDRO<span>PONICS</span></span><button className="sidebar-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={18} /></button></div><div className="portal-context"><span className="portal-context-dot" /> {roleLabels[role]} access</div><nav className="portal-nav" aria-label="Portal navigation">{items.map(item => <Link key={item.href} href={`/${role}/dashboard${item.href === 'dashboard' ? '' : `/${item.href}`}`} className={pathname.endsWith(item.href) || (item.href === 'dashboard' && pathname.endsWith('/dashboard')) ? 'active' : ''} onClick={() => setOpen(false)}><span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}</Link>)}</nav><button className="portal-logout" onClick={onLogout}><LogOut size={17} /> Sign out</button></aside><div className="portal-main"><header className="portal-topbar"><button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></button><div className="portal-breadcrumb">HYDROPONICS <span>/</span> {roleLabels[role]}</div><div className="portal-user"><button className="notification" aria-label="Notifications"><Bell size={18} /><span /></button><div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div><div className="user-copy"><strong>{user.name}</strong><small>{roleLabels[role]}</small></div><ChevronDown size={16} className="user-chevron" /></div></header><main className="portal-content">{children}</main></div></div>
}

export { roleLabels }

export function EmptyState({ title, description = 'This module is ready for integration when the supporting API is available.' }: { title: string; description?: string }) { return <div className="portal-empty"><div className="empty-mark"><Leaf size={22} /></div><h3>{title}</h3><p>{description}</p><span className="empty-status">Integration pending</span></div> }

export function DashboardCard({ label, value, detail, tone = 'default' }: { label: string; value: string; detail: string; tone?: 'default' | 'green' | 'amber' }) { return <div className={`dashboard-card ${tone}`}><div className="card-label"><span>{label}</span><span className="card-dot" /></div><strong>{value}</strong><p>{detail}</p></div> }

export function ModuleTable({ title, columns }: { title: string; columns: string[] }) {
  const [state, setState] = useState<{ loading: boolean; error?: string; items: Record<string, unknown>[] }>({ loading: true, items: [] })
  const endpoint = title.toLowerCase().includes('attendance') ? 'attendance' : title.toLowerCase().includes('inventory') ? 'inventory' : title.toLowerCase().includes('project') ? 'projects' : title.toLowerCase().includes('notice') ? 'notices' : title.toLowerCase().includes('audit') ? 'audit-log' : null
  useEffect(() => { if (!endpoint) { setState({ loading: false, items: [] }); return }; let cancelled = false; fetch(`${apiBaseUrl}/api/modules/${endpoint}`, { credentials: 'include' }).then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Unable to load module'); return body }).then(body => { if (!cancelled) setState({ loading: false, items: body.items ?? [] }) }).catch(error => { if (!cancelled) setState({ loading: false, items: [], error: error instanceof Error ? error.message : 'Unable to load module' }) }); return () => { cancelled = true } }, [endpoint])
  const valueFor = (item: Record<string, unknown>, column: string) => { const key = column.toLowerCase().replace(/[^a-z]/g, ''); const match = Object.entries(item).find(([name]) => name.toLowerCase().replace(/[^a-z]/g, '') === key); return match?.[1] == null ? '—' : typeof match[1] === 'object' ? JSON.stringify(match[1]) : String(match[1]) }
  return <section className="module-panel"><div className="module-heading"><div><p className="eyebrow">WORKSPACE MODULE</p><h2>{title}</h2></div><span className="module-badge">{state.loading ? 'Loading' : `${state.items.length} records`}</span></div>{state.error ? <div className="portal-empty"><h3>Unable to load records</h3><p>{state.error}</p></div> : <div className="table-wrap"><table><thead><tr>{columns.map(column => <th key={column}>{column}</th>)}</tr></thead><tbody>{state.items.length ? state.items.map((item, index) => <tr key={String(item._id ?? item.id ?? index)}>{columns.map(column => <td key={column}>{valueFor(item, column)}</td>)}</tr>) : <tr><td colSpan={columns.length}><EmptyState title={state.loading ? 'Loading records' : endpoint ? 'No records to display' : 'This module is coming soon'} description={endpoint ? 'This view reflects the authenticated data available to your role.' : 'The supporting API is not part of this module yet.'} /></td></tr>}</tbody></table></div>}</section>
}

export function QuickLink({ title, description, href }: { title: string; description: string; href: string }) { return <Link href={href} className="quick-link"><span><strong>{title}</strong><small>{description}</small></span><span className="quick-arrow">↗</span></Link> }

export { roleLabels as portalRoleLabels }
export { navItems }

