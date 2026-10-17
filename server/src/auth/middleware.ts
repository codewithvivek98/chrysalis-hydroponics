import type { NextFunction, Request, Response } from 'express'

type SessionRequest = Request & { session: { userId?: string } }
import { User, type Role, safeUser } from '../models/user'
import { audit } from '../models/modules'

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  const sessionRequest = request as SessionRequest
  if (!sessionRequest.session.userId) return response.status(401).json({ ok: false, error: 'Authentication required' })
  try {
    const user = await User.findById(sessionRequest.session.userId).lean()
    if (!user) return response.status(401).json({ ok: false, error: 'Authentication required' })
    request.authUser = safeUser(user) as NonNullable<Request['authUser']>
    next()
  } catch { return response.status(401).json({ ok: false, error: 'Authentication required' }) }
}

export function requireActiveUser(request: Request, response: Response, next: NextFunction) {
  if (request.authUser?.status !== 'active') return response.status(403).json({ ok: false, error: 'Account is disabled' })
  next()
}

export function requireRole(...allowed: Role[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.authUser || !allowed.includes(request.authUser.role as Role)) {
      void audit(request.authUser ?? {}, 'access_denied', 'authorization', undefined, undefined, undefined, { description: `Required role: ${allowed.join(', ')}`, metadata: { path: request.path, method: request.method }, success: false }).catch(() => undefined)
      return response.status(403).json({ ok: false, error: 'Access denied' })
    }
    next()
  }
}
