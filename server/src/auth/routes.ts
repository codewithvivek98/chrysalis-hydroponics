import { Router, type Request, type Response } from 'express'

type SessionRequest = Request & { session: { userId?: string; regenerate(callback: (error?: Error) => void): void; destroy(callback: (error?: Error) => void): void } }
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { z } from 'zod'
import { connectDatabase } from '../config/database'
import { env } from '../config/env'
import { User, safeUser } from '../models/user'
import { AuditLog, audit, serialize } from '../models/modules'
import { requireActiveUser, requireAuth, requireRole } from './middleware'

const router = Router()
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false })
const registrationLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false })
const credentials = z.object({ email: z.string().email().transform(v => v.toLowerCase()), password: z.string().min(8).max(200) })
const registrationInput = z.object({ name: z.string().trim().min(2).max(120), email: z.string().email().transform(v => v.toLowerCase()), password: z.string().min(8).max(200), accountType: z.enum(['member', 'faculty']), department: z.string().trim().max(160).optional() })
const managedAccountInput = z.object({ name: z.string().trim().min(2).max(120), email: z.string().email().transform(v => v.toLowerCase()), password: z.string().min(12).max(200), department: z.string().trim().max(160).optional() })
const bootstrapInput = managedAccountInput.extend({ bootstrapSecret: z.string().min(32).max(200) })
const resetTokens = new Map<string, { userId: string; expiresAt: number }>()

router.post('/bootstrap/super-admin', registrationLimit, async (request, response, next) => {
  try {
    const input = bootstrapInput.parse(request.body)
    if (!env.bootstrapSecret || input.bootstrapSecret !== env.bootstrapSecret) return response.status(404).json({ ok: false, error: 'Not found' })
    const database = await connectDatabase()
    if (!database) return response.status(503).json({ ok: false, error: 'Authentication service is unavailable because the database is not configured.' })
    if (await User.exists({ role: 'super_admin' })) return response.status(409).json({ ok: false, error: 'Super Admin has already been bootstrapped.' })
    if (await User.exists({ email: input.email })) return response.status(409).json({ ok: false, error: 'An account with this email already exists' })
    const user = await User.create({ name: input.name, email: input.email, passwordHash: await bcrypt.hash(input.password, 12), role: 'super_admin', status: 'active', department: input.department })
    await audit({ id: String(user._id), name: user.name, email: user.email, role: user.role }, 'bootstrap', 'authentication', String(user._id), undefined, { role: user.role }, { description: 'Initial Super Admin bootstrapped', targetType: 'User' })
    response.status(201).json({ ok: true, user: safeUser(user) })
  } catch (error) { next(error) }
})

router.post('/register', registrationLimit, async (request, response, next) => {
  try {
    const input = registrationInput.parse(request.body)
    const database = await connectDatabase()
    if (!database) return response.status(503).json({ ok: false, error: 'Authentication service is unavailable because the database is not configured.' })
    const exists = await User.exists({ email: input.email })
    if (exists) return response.status(409).json({ ok: false, error: 'An account with this email already exists' })
    const role = input.accountType
    const status = role === 'faculty' ? 'pending_approval' : 'active'
    const user = await User.create({ name: input.name, email: input.email, passwordHash: await bcrypt.hash(input.password, 12), role, status, department: input.department || undefined })
    await audit({ id: String(user._id), name: user.name, email: user.email, role: user.role }, 'create', 'authentication', String(user._id), undefined, { role: user.role, status: user.status }, { description: `${role === 'faculty' ? 'Faculty application' : 'Member account'} registered`, targetType: 'User' })
    response.status(201).json({ ok: true, user: safeUser(user), message: role === 'faculty' ? 'Registration received. Faculty access will be available after an administrator approves your account.' : 'Account created. You can now sign in.' })
  } catch (error) { next(error) }
})

router.post('/login', loginLimit, async (request, response, next) => {
  try {
    const input = credentials.parse(request.body)
    const sessionRequest = request as SessionRequest
    const database = await connectDatabase()
    if (!database) return response.status(503).json({ ok: false, error: 'Authentication service is unavailable because the database is not configured.' })
    const user = await User.findOne({ email: input.email }).select('+passwordHash')
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      await audit({ email: input.email }, 'login_failed', 'authentication', undefined, undefined, undefined, { description: 'Invalid login credentials', metadata: { email: input.email }, success: false })
      return response.status(401).json({ ok: false, error: 'Invalid email or password' })
    }
    if (user.status === 'pending_approval') return response.status(403).json({ ok: false, error: 'Your faculty registration is pending administrative approval.' })
    if (user.status !== 'active') return response.status(403).json({ ok: false, error: 'This account is not active.' })
    await new Promise<void>((resolve, reject) => sessionRequest.session.regenerate((error?: Error) => error ? reject(error) : resolve()))
    sessionRequest.session.userId = String(user._id)
    await audit({ id: String(user._id), name: user.name, email: user.email, role: user.role }, 'login', 'authentication', String(user._id), undefined, undefined, { description: 'User signed in', targetType: 'User' })
    response.json({ ok: true, user: safeUser(user) })
  } catch (error) { next(error) }
})

router.post('/logout', (request, response, next) => (request as SessionRequest).session.destroy((error?: Error) => error ? next(error) : response.clearCookie('hydro_session').json({ ok: true })))
router.get('/stats', requireAuth, requireActiveUser, async (request, response, next) => {
  try {
    const database = await connectDatabase()
    if (!database) return response.status(503).json({ ok: false, error: 'Statistics service is unavailable because the database is not configured.' })
    const [totalUsers, activeUsers, facultyMembers, pendingFaculty] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ role: { $in: ['faculty', 'member'] } }),
      User.countDocuments({ role: 'faculty', status: 'pending_approval' }),
    ])
    response.json({ ok: true, stats: { totalUsers, activeUsers, facultyMembers, pendingFaculty, role: request.authUser!.role } })
  } catch (error) { next(error) }
})

router.get('/me', requireAuth, requireActiveUser, (request, response) => response.json({ ok: true, user: request.authUser }))

router.post('/forgot-password', async (request, response, next) => {
  try {
    const email = z.object({ email: z.string().email().transform(v => v.toLowerCase()) }).parse(request.body).email
    const database = await connectDatabase()
    if (!database) return response.status(503).json({ ok: false, error: 'Authentication service is unavailable because the database is not configured.' })
    const user = await User.findOne({ email }).select('_id')
    if (user) { const token = crypto.randomBytes(32).toString('hex'); resetTokens.set(crypto.createHash('sha256').update(token).digest('hex'), { userId: String(user._id), expiresAt: Date.now() + 30 * 60 * 1000 }) }
    response.json({ ok: true, message: 'If an account exists, password reset instructions will be sent.' })
  } catch (error) { next(error) }
})

router.post('/reset-password', async (request, response, next) => {
  try {
    const input = z.object({ token: z.string().min(32), password: z.string().min(8).max(200) }).parse(request.body)
    const hash = crypto.createHash('sha256').update(input.token).digest('hex'); const record = resetTokens.get(hash)
    if (!record || record.expiresAt < Date.now()) return response.status(400).json({ ok: false, error: 'Invalid or expired reset token' })
    const database = await connectDatabase()
    if (!database) return response.status(503).json({ ok: false, error: 'Authentication service is unavailable because the database is not configured.' })
    const user = await User.findByIdAndUpdate(record.userId, { passwordHash: await bcrypt.hash(input.password, 12) }, { new: true }).select('_id name email role')
    resetTokens.delete(hash)
    if (user) await audit({ id: String(user._id), name: user.name, email: user.email, role: user.role }, 'password_reset', 'authentication', String(user._id), undefined, undefined, { description: 'Password reset completed', targetType: 'User' })
    response.json({ ok: true })
  } catch (error) { next(error) }
})

router.post('/protected/admins', requireAuth, requireActiveUser, requireRole('super_admin'), async (request, response, next) => {
  try {
    const input = managedAccountInput.parse(request.body)
    const database = await connectDatabase()
    if (!database) return response.status(503).json({ ok: false, error: 'Authentication service is unavailable because the database is not configured.' })
    if (await User.exists({ email: input.email })) return response.status(409).json({ ok: false, error: 'An account with this email already exists' })
    const user = await User.create({ name: input.name, email: input.email, passwordHash: await bcrypt.hash(input.password, 12), role: 'admin', status: 'active', approvedBy: request.authUser?.id, approvedAt: new Date(), department: input.department })
    await audit(request.authUser!, 'create', 'authentication', String(user._id), undefined, { role: user.role, status: user.status }, { description: 'Admin account created by Super Admin', targetType: 'User' })
    response.status(201).json({ ok: true, user: safeUser(user) })
  } catch (error) { next(error) }
})

router.get('/users', requireAuth, requireActiveUser, requireRole('super_admin', 'admin'), async (request, response, next) => {
  try {
    const query = z.object({ search: z.string().trim().max(120).optional(), role: z.enum(['super_admin', 'admin', 'faculty', 'member']).optional(), status: z.enum(['active', 'pending_approval', 'rejected', 'disabled']).optional() }).parse(request.query)
    const filter: Record<string, unknown> = { _id: { $ne: request.authUser!.id } }
    if (query.role) filter.role = query.role
    if (query.status) filter.status = query.status
    if (query.search) {
      const safe = query.search.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&')
      filter.$or = [{ name: new RegExp(safe, 'i') }, { email: new RegExp(safe, 'i') }]
    }
    const items = await User.find(filter).sort({ createdAt: -1 }).select('name email department role status createdAt approvedBy approvedAt').lean()
    response.json({ ok: true, items: items.map(item => ({ id: String(item._id), name: item.name, email: item.email, department: item.department, role: item.role, status: item.status, createdAt: item.createdAt, approvedBy: item.approvedBy, approvedAt: item.approvedAt })) })
  } catch (error) { next(error) }
})

const targetIdSchema = z.string().regex(/^[a-f\\d]{24}$/i, 'Invalid user id')

export function canManageAccount(actorRole: string, targetRole: string) {
  return actorRole === 'super_admin' ? ['admin', 'faculty', 'member'].includes(targetRole) : actorRole === 'admin' && ['faculty', 'member'].includes(targetRole)
}

async function getManagedUser(request: Request, response: Response) {
  const targetId = targetIdSchema.parse(request.params.id)
  if (targetId === request.authUser!.id) { response.status(400).json({ ok: false, error: 'You cannot manage your own account' }); return null }
  const target = await User.findById(targetId).select('name email role status')
  if (!target) { response.status(404).json({ ok: false, error: 'User not found' }); return null }
  if (!canManageAccount(request.authUser!.role, target.role)) { response.status(403).json({ ok: false, error: 'You cannot manage this account' }); return null }
  return target
}

router.patch('/users/:id/status', requireAuth, requireActiveUser, requireRole('super_admin', 'admin'), async (request, response, next) => {
  try {
    const input = z.object({ status: z.enum(['active', 'disabled']) }).parse(request.body)
    const target = await getManagedUser(request, response)
    if (!target) return
    if (target.status === input.status) return response.status(409).json({ ok: false, error: `Account is already ${input.status}` })
    if (input.status === 'active' && target.status !== 'disabled') return response.status(409).json({ ok: false, error: 'Only disabled accounts can be enabled' })
    if (input.status === 'disabled' && target.status === 'pending_approval') return response.status(409).json({ ok: false, error: 'Pending applications must be approved or rejected' })
    const previousStatus = target.status
    target.status = input.status
    await target.save()
    await audit(request.authUser!, input.status === 'disabled' ? 'deactivate' : 'activate', 'authentication', String(target._id), { status: previousStatus }, { status: input.status }, { description: `User account ${input.status === 'disabled' ? 'disabled' : 'enabled'}`, targetType: 'User' })
    response.json({ ok: true, user: safeUser(target) })
  } catch (error) { next(error) }
})

router.delete('/users/:id', requireAuth, requireActiveUser, requireRole('super_admin', 'admin'), async (request, response, next) => {
  try {
    const target = await getManagedUser(request, response)
    if (!target) return
    const deleted = await User.findOneAndDelete({ _id: target._id, role: target.role })
    if (!deleted) return response.status(409).json({ ok: false, error: 'Account changed before deletion; refresh and try again' })
    await audit(request.authUser!, 'delete', 'authentication', String(target._id), { name: target.name, email: target.email, role: target.role, status: target.status }, undefined, { description: 'User account permanently deleted; audit history retained', targetType: 'User' })
    response.json({ ok: true, deletedId: String(target._id) })
  } catch (error) { next(error) }
})

router.get('/registrations', requireAuth, requireActiveUser, requireRole('super_admin', 'admin'), async (_request, response, next) => {
  try {
    const items = await User.find({ role: 'faculty', status: 'pending_approval' }).sort({ createdAt: 1 }).select('name email department role status createdAt').lean()
    response.json({ ok: true, items: items.map(item => ({ id: String(item._id), name: item.name, email: item.email, department: item.department, role: item.role, status: item.status, createdAt: item.createdAt })) })
  } catch (error) { next(error) }
})

router.post('/registrations/:id/:decision', requireAuth, requireActiveUser, requireRole('super_admin', 'admin'), async (request, response, next) => {
  try {
    const decision = z.enum(['approve', 'reject']).parse(request.params.decision)
    const update = decision === 'approve' ? { status: 'active', approvedBy: request.authUser?.id, approvedAt: new Date(), $unset: { rejectionReason: 1 } } : { status: 'rejected', approvedBy: request.authUser?.id, approvedAt: new Date() }
    const item = await User.findOneAndUpdate({ _id: request.params.id, role: 'faculty', status: 'pending_approval' }, update, { new: true }).select('name email role status')
    if (!item) return response.status(409).json({ ok: false, error: 'Application is no longer pending or does not exist' })
    await audit(request.authUser!, decision, 'authentication', String(item._id), { status: 'pending_approval' }, { status: item.status }, { description: `Faculty application ${decision}d`, targetType: 'User' })
    response.json({ ok: true, user: safeUser(item) })
  } catch (error) { next(error) }
})

router.get('/protected/admin', requireAuth, requireActiveUser, requireRole('super_admin', 'admin'), (_req, res) => res.json({ ok: true }))
router.get('/protected/audit-log', requireAuth, requireActiveUser, requireRole('super_admin'), async (request, response, next) => {
  try {
    const query = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25), search: z.string().trim().max(120).optional(), actor: z.string().regex(/^[a-f\\d]{24}$/i).optional(), role: z.enum(['super_admin', 'admin', 'faculty', 'member']).optional(), action: z.string().trim().max(40).optional(), module: z.string().trim().max(40).optional(), targetId: z.string().trim().max(80).optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional(), sort: z.enum(['newest', 'oldest']).default('newest') }).parse(request.query)
    const filter: Record<string, unknown> = {}
    if (query.actor) filter.actor = query.actor
    if (query.role) filter.actorRole = query.role
    if (query.action) filter.action = query.action.toUpperCase()
    if (query.module) filter.module = query.module
    if (query.targetId) filter.targetId = query.targetId
    if (query.from || query.to) filter.timestamp = { ...(query.from ? { $gte: query.from } : {}), ...(query.to ? { $lte: query.to } : {}) }
    if (query.search) { const safe = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); filter.$or = [{ actorName: new RegExp(safe, 'i') }, { description: new RegExp(safe, 'i') }, { targetId: new RegExp(safe, 'i') }] }
    const sort = query.sort === 'oldest' ? 1 : -1
    const [items, total] = await Promise.all([AuditLog.find(filter).sort({ timestamp: sort }).skip((query.page - 1) * query.limit).limit(query.limit).lean(), AuditLog.countDocuments(filter)])
    response.json({ ok: true, items: serialize(items), pagination: { page: query.page, limit: query.limit, total, pages: Math.ceil(total / query.limit) } })
  } catch (error) { next(error) }
})

export { router as authRouter }
