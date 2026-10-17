import type { Request } from 'express'
import { AuditLog } from '../models/modules'
import type { Role } from '../models/user'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'PERMISSION_DENIED' | 'ROLE_CHANGE' | 'EXPORT' | 'IMPORT' | 'APPROVE' | 'REJECT' | 'PASSWORD_RESET_REQUEST' | 'PASSWORD_RESET_SUCCESS'

const sensitiveKeys = /password|token|secret|hash|cookie|session/i

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => !sensitiveKeys.test(key)).map(([key, nested]) => [key, redact(nested)]))
}

function requestMetadata(request?: Request) {
  if (!request) return {}
  const forwarded = request.headers['x-forwarded-for']
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : request.ip
  return { ipAddress: ip || undefined, userAgent: request.get('user-agent') || undefined }
}

export async function writeAudit(input: { request?: Request; actor?: { id: string; name?: string; email?: string; role?: string }; action: AuditAction; module: string; targetType?: string; targetId?: string; description: string; oldValue?: unknown; newValue?: unknown; metadata?: unknown }) {
  const actor = input.actor
  return AuditLog.create({ actor: actor?.id, actorName: actor?.name || actor?.email, actorRole: actor?.role as Role | undefined, action: input.action, module: input.module, targetType: input.targetType, targetId: input.targetId, description: input.description, oldValue: redact(input.oldValue), newValue: redact(input.newValue), metadata: redact(input.metadata), ...requestMetadata(input.request), timestamp: new Date() })
}

export function changedFields(before: Record<string, unknown>, after: Record<string, unknown>) {
  const fields = new Set([...Object.keys(before), ...Object.keys(after)])
  return Object.fromEntries([...fields].filter(field => JSON.stringify(before[field]) !== JSON.stringify(after[field])).map(field => [field, { old: redact(before[field]), new: redact(after[field]) }]))
}

export function auditActor(request: Request) { return request.authUser ? { id: request.authUser.id, name: request.authUser.name, email: request.authUser.email, role: request.authUser.role } : undefined }

export function auditFailureMessage(error: unknown) { return error instanceof Error ? error.message.slice(0, 240) : 'Operation failed' }

export async function safeAudit(input: Parameters<typeof writeAudit>[0]) {
  try { return await writeAudit(input) } catch (error) { console.error('[audit] write failed', error); return null }
}

export type AuditQuery = { page: number; limit: number; sort: 1 | -1; filter: Record<string, unknown> }
export function buildAuditQuery(query: Record<string, unknown>): AuditQuery {
  const page = Math.max(1, Math.min(10000, Number(query.page) || 1)); const limit = Math.max(1, Math.min(100, Number(query.limit) || 25)); const filter: Record<string, unknown> = {}
  for (const key of ['actorRole', 'action', 'module', 'targetId']) if (typeof query[key] === 'string' && query[key]) filter[key] = query[key]
  if (typeof query.actor === 'string' && query.actor) filter.actor = query.actor
  if (typeof query.search === 'string' && query.search.trim()) { const escaped = query.search.trim().slice(0, 80).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'); filter.$or = [{ description: new RegExp(escaped, 'i') }, { actorName: new RegExp(escaped, 'i') }] }
  const from = typeof query.from === 'string' ? new Date(query.from) : undefined; const to = typeof query.to === 'string' ? new Date(query.to) : undefined
  if ((from && !Number.isNaN(from.valueOf())) || (to && !Number.isNaN(to.valueOf()))) filter.timestamp = { ...(from && !Number.isNaN(from.valueOf()) ? { $gte: from } : {}), ...(to && !Number.isNaN(to.valueOf()) ? { $lte: to } : {}) }
  return { page, limit, sort: query.sort === 'oldest' ? 1 : -1, filter }
}

export function auditView(value: any) { const item = { ...value, id: String(value._id), actor: value.actor ? String(value.actor) : undefined }; delete item._id; delete item.__v; return item }
