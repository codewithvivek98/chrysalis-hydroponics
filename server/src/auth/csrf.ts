import type { Request, Response, NextFunction } from 'express'
import { env, allowedOrigins } from '../config/env'

export function csrfProtection(request: Request, response: Response, next: NextFunction) {
  // Safe methods (GET, HEAD, OPTIONS) do not alter server state
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return next()
  }

  const originHeader = request.headers.origin as string | undefined
  const refererHeader = request.headers.referer as string | undefined

  let origin = originHeader
  if (!origin && refererHeader) {
    try {
      origin = new URL(refererHeader).origin
    } catch {
      origin = undefined
    }
  }

  if (!origin) {
    // In production, reject state-changing requests lacking Origin/Referer
    if (env.nodeEnv === 'production') {
      return response.status(403).json({ ok: false, error: 'CSRF validation failed: missing origin' })
    }
    return next()
  }

  const normalized = origin.replace(/\/+$/, '')
  if (!allowedOrigins.includes(normalized)) {
    return response.status(403).json({ ok: false, error: 'CSRF validation failed: unauthorized origin' })
  }

  next()
}
