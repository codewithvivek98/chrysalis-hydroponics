'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight, Loader2, LockKeyhole, Plus, Search } from 'lucide-react'
import { apiBaseUrl } from '@/lib/api'
import { UserManagement } from '@/components/portal/user-management'
import { DashboardCard, EmptyState, ModuleTable, PortalShell, QuickLink, type PortalRole } from '@/components/portal/portal-shell'

const roles: Record<string, PortalRole> = { superadmin: 'superadmin', admin: 'admin', faculty: 'faculty', member: 'member' }
const headings: Record<PortalRole, { eyebrow: string; title: string; copy: string }> = {
  superadmin: { eyebrow: 'SYSTEM OVERVIEW', title: 'Keep the centre growing.', copy: 'A clear view of users, security, and the systems that support HYDROPONICS.' },
  admin: { eyebrow: 'OPERATIONS OVERVIEW', title: 'Good work, well tended.', copy: 'Manage the day-to-day rhythm of the centre from one place.' },
  faculty: { eyebrow: 'FACULTY WORKSPACE', title: 'Your work in focus.', copy: 'Keep track of your students, sessions, and research projects.' },
  member: { eyebrow: 'MEMBER WORKSPACE', title: 'Welcome to your centre.', copy: 'Your attendance, projects, and notices — gathered in one place.' },
}
const modules: Record<string, { title: string; columns: string[] }> = { 'audit-log': { title: 'Audit Log', columns: ['Actor', 'Action', 'Module', 'Timestamp'] }, admins: { title: 'Admin Management', columns: ['Name', 'Email', 'Status', 'Last active'] }, users: { title: 'User Management', columns: ['Name', 'Role', 'Status', 'Last active'] }, attendance: { title: 'Attendance', columns: ['Date', 'Session', 'Present', 'Status'] }, inventory: { title: 'Inventory', columns: ['Item', 'Category', 'Quantity', 'Condition'] }, projects: { title: 'Projects', columns: ['Project', 'Lead', 'Members', 'Status'] }, content: { title: 'Website Content', columns: ['Title', 'Type', 'Status', 'Updated'] }, reports: { title: 'Reports', columns: ['Report', 'Scope', 'Created', 'Status'] }, students: { title: 'My Students', columns: ['Student', 'Programme', 'Attendance', 'Projects'] }, notices: { title: 'Notices', columns: ['Notice', 'Audience', 'Published', 'Status'] }, profile: { title: 'Profile', columns: ['Field', 'Current value', 'Access'] }, settings: { title: 'System Settings', columns: ['Setting', 'Value', 'Access'] } }

function Dashboard({ role, user, stats }: { role: PortalRole; user: { name: string; email: string }; stats?: { totalUsers: number; activeUsers: number; facultyMembers: number; pendingFaculty: number } }) {
  const totalUsers = stats ? String(stats.totalUsers) : '—'
  const activeUsers = stats ? String(stats.activeUsers) : '—'
  const facultyMembers = stats ? String(stats.facultyMembers) : '—'
  const statsLoading = role === 'superadmin' && stats === undefined
  const cardSets: Record<PortalRole, { label: string; value: string; detail: string; tone?: 'default' | 'green' | 'amber'; loading?: boolean }[]> = {
    superadmin: [{ label: 'Total users', value: totalUsers, detail: stats ? 'Accounts in the centre' : statsLoading ? 'Retrieving count…' : 'Database unavailable', loading: statsLoading }, { label: 'Active users', value: activeUsers, detail: stats ? 'Currently active accounts' : statsLoading ? 'Retrieving count…' : 'Database unavailable', tone: 'green', loading: statsLoading }, { label: 'Faculty & members', value: facultyMembers, detail: stats ? `${stats.pendingFaculty} pending faculty approvals` : statsLoading ? 'Retrieving count…' : 'Database unavailable', loading: statsLoading }, { label: 'Security alerts', value: '—', detail: 'No alert feed connected', tone: 'amber' }],
    admin: [{ label: "Today's attendance", value: '—', detail: 'Attendance module pending' }, { label: 'Low-stock items', value: '—', detail: 'Inventory module pending', tone: 'amber' }, { label: 'Faculty & members', value: '—', detail: 'Awaiting user API' }, { label: 'Active projects', value: '—', detail: 'Project module pending', tone: 'green' }],
    faculty: [{ label: 'Assigned students', value: '—', detail: 'Awaiting student API' }, { label: "Today's sessions", value: '—', detail: 'Scheduling module pending', tone: 'green' }, { label: 'Attendance summary', value: '—', detail: 'Attendance module pending' }, { label: 'Active projects', value: '—', detail: 'Project module pending', tone: 'green' }],
    member: [{ label: 'My attendance', value: '—', detail: 'Attendance module pending', tone: 'green' }, { label: 'Active projects', value: '—', detail: 'Project module pending' }, { label: 'Recent notices', value: '—', detail: 'Notices module pending' }, { label: 'Profile status', value: 'Active', detail: 'Verified account', tone: 'green' }],
  }
  const quick: Record<PortalRole, { title: string; description: string; href: string }[]> = { superadmin: [{ title: 'Review audit activity', description: 'Read-only security events', href: '/superadmin/dashboard/audit-log' }, { title: 'Manage administrators', description: 'Accounts and access status', href: '/superadmin/dashboard/admins' }, { title: 'View system settings', description: 'Centre configuration', href: '/superadmin/dashboard/settings' }], admin: [{ title: 'Manage users', description: 'Faculty and member accounts', href: '/admin/dashboard/users' }, { title: 'Review inventory', description: 'Stock and transaction history', href: '/admin/dashboard/inventory' }, { title: 'Open reports', description: 'Attendance, stock, and projects', href: '/admin/dashboard/reports' }], faculty: [{ title: 'View my students', description: 'Assigned student records only', href: '/faculty/dashboard/students' }, { title: 'Review attendance', description: 'Sessions you manage', href: '/faculty/dashboard/attendance' }, { title: 'Update a project', description: 'Your permitted projects', href: '/faculty/dashboard/projects' }], member: [{ title: 'View attendance', description: 'Your personal records', href: '/member/dashboard/attendance' }, { title: 'Open projects', description: 'Projects assigned to you', href: '/member/dashboard/projects' }, { title: 'Read notices', description: 'Updates for members', href: '/member/dashboard/notices' }] }
  return <><div className="portal-page-heading"><div><p className="eyebrow">{headings[role].eyebrow}</p><h1>{headings[role].title}</h1><p>{headings[role].copy}</p></div><button className="portal-action"><Plus size={17} /> Quick action</button></div><div className="dashboard-cards">{cardSets[role].map(card => <DashboardCard key={card.label} {...card} />)}</div><div className="portal-grid"><section className="module-panel activity-panel"><div className="module-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>{role === 'member' ? 'Your latest updates' : 'System activity'}</h2></div><button className="icon-button" aria-label="Search activity"><Search size={18} /></button></div><EmptyState title="Nothing new yet" description="Connected modules will surface recent activity here without placeholder records." /></section><section className="module-panel quick-panel"><div className="module-heading"><div><p className="eyebrow">QUICK LINKS</p><h2>Move things forward.</h2></div></div><div className="quick-list">{quick[role].map(item => <QuickLink key={item.title} {...item} />)}</div></section></div><section className="portal-note"><LockKeyhole size={19} /><div><strong>Access is enforced server-side.</strong><p>Every protected request is checked against your authenticated session and role. Empty modules are intentionally not seeded with fabricated records.</p></div><ArrowRight size={18} /></section></>
}

export default function DashboardPage() {
  const params = useParams<{ role: string; section?: string }>()
  const router = useRouter()
  const [user, setUser] = useState<{ name: string; email: string } | null>(null)
  const [stats, setStats] = useState<{ totalUsers: number; activeUsers: number; facultyMembers: number; pendingFaculty: number }>()
  const [denied, setDenied] = useState(false)

  const role = params?.role ? roles[params.role] : undefined
  const moduleKey = params?.section && params.section !== 'dashboard' ? params.section : null

  useEffect(() => {
    if (!role) {
      setDenied(true)
      return
    }
    let cancelled = false

    fetch(`${apiBaseUrl}/api/auth/me`, { credentials: 'include' })
      .then(async response => {
        if (!response.ok) throw new Error('Unauthenticated')
        return response.json()
      })
      .then(data => {
        if (cancelled) return
        const actual = data.user.role === 'super_admin' ? 'superadmin' : data.user.role
        if (actual !== role) {
          setDenied(true)
        } else {
          setUser(data.user)
          return fetch(`${apiBaseUrl}/api/auth/stats`, { credentials: 'include' })
            .then(async statsRes => {
              if (statsRes.ok && !cancelled) {
                const statsData = await statsRes.json()
                setStats(statsData.stats)
              }
            })
            .catch(() => undefined)
        }
      })
      .catch(() => {
        if (!cancelled) router.replace('/login')
      })

    return () => {
      cancelled = true
    }
  }, [role, router])

  async function logout() {
    await fetch(`${apiBaseUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    router.replace('/')
  }

  if (denied) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <p className="eyebrow">ACCESS DENIED</p>
          <h1>This portal is restricted.</h1>
          <p className="muted">Your account does not have permission to view this area.</p>
          <a className="button button-dark" href="/portal">Return to portal</a>
        </div>
      </main>
    )
  }

  if (!user || !role) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="loading-panel">
            <Loader2 className="spinner" size={36} />
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', margin: '6px 0 12px' }}>Loading portal…</h1>
            <p className="muted" style={{ margin: 0 }}>Verifying your centre account.</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <PortalShell role={role} user={user} onLogout={logout}>
      {moduleKey === 'users' && (role === 'admin' || role === 'superadmin') ? (
        <UserManagement actorRole={role} />
      ) : moduleKey ? (
        <ModuleTable
          title={modules[moduleKey]?.title ?? 'Workspace'}
          columns={modules[moduleKey]?.columns ?? ['Name', 'Status', 'Updated']}
        />
      ) : (
        <Dashboard role={role} user={user} stats={stats} />
      )}
    </PortalShell>
  )
}
