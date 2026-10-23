import cors from 'cors'
import express, { type ErrorRequestHandler, type Request, type Response, type NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import { createGzip } from 'node:zlib'
import { ZodError } from 'zod'
import mongoose from 'mongoose'
// @ts-expect-error express-session ships JavaScript types in this stack
import session from 'express-session'
import MongoStore from 'connect-mongo'
import { authRouter } from './auth/routes'
import { csrfProtection } from './auth/csrf'
import { env, allowedOrigins } from './config/env'
import { connectDatabase, getDatabaseStatus } from './config/database'
import { moduleRouter } from './modules/routes'

export const app = express()

app.disable('x-powered-by')
app.set('trust proxy', 1)

// Standard HTTP Security Headers
app.use((_request: Request, response: Response, next: NextFunction) => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.setHeader('X-XSS-Protection', '0')
  if (env.nodeEnv === 'production') {
    response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  next()
})

// General API rate limiter to protect server from automated denial-of-service
const generalApiLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests. Please try again later.' },
})

function compressionMiddleware(req: Request, res: Response, next: NextFunction) {
  const acceptEncoding = (req.headers['accept-encoding'] as string) || ''
  if (!acceptEncoding || req.method === 'HEAD' || !/\bgzip\b/.test(acceptEncoding)) {
    return next()
  }

  const originalSend = res.send.bind(res)
  ;(res as any).send = function (body: any) {
    if (!body || res.headersSent) return originalSend(body)

    const contentType = (res.getHeader('content-type') as string) || ''
    const isCompressible = /json|text|javascript|css/i.test(contentType)
    const buffer = Buffer.isBuffer(body)
      ? body
      : typeof body === 'string'
      ? Buffer.from(body)
      : Buffer.from(JSON.stringify(body))

    if (!isCompressible || buffer.length < 512) {
      return originalSend(body)
    }

    res.removeHeader('content-length')
    res.setHeader('content-encoding', 'gzip')
    res.setHeader('vary', 'accept-encoding')
    const gzip = createGzip()
    const chunks: Buffer[] = []
    gzip.on('data', chunk => chunks.push(chunk))
    gzip.on('end', () => originalSend(Buffer.concat(chunks)))
    gzip.on('error', () => originalSend(buffer))
    gzip.end(buffer)
    return res
  }
  next()
}

app.use(compressionMiddleware)
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
      callback(null, true)
    } else {
      callback(null, false)
    }
  },
  credentials: true,
}))
app.use(csrfProtection)
app.use(express.json({ limit: '1mb' }))
app.use('/api', generalApiLimit)

if (env.nodeEnv !== 'test') {
  app.use((request, _response, next) => {
    console.info(`[api] ${request.method} ${request.originalUrl}`)
    next()
  })
}

app.use(session({
  name: 'hydro_session',
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: env.nodeEnv === 'production' ? 'none' : 'lax', secure: env.nodeEnv === 'production', maxAge: 1000 * 60 * 60 * 8 },
  ...(env.mongoUri && env.nodeEnv !== 'test' ? { store: MongoStore.create({ clientPromise: connectDatabase().then(m => m ? (m.connection.getClient() as any) : undefined), ttl: 60 * 60 * 8 }) } : {}),
}))

// Sensitive API routes must never be cached by intermediaries or browsers
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth') || req.path.startsWith('/modules')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    res.setHeader('Pragma', 'no-cache')
  }
  next()
})

app.use('/api/auth', authRouter)
app.use('/api/modules', moduleRouter)

app.get('/api/health', (_request, response) => {
  response.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=30')
  response.json({ ok: true, service: 'hydroponics-coe-api', environment: env.nodeEnv })
})

app.get('/api/health/db', (_request, response) => {
  const status = getDatabaseStatus()
  const connected = status === 'connected'
  response.status(connected ? 200 : 503).json({ ok: connected, database: status })
})

app.use('/api', (_request, response) => {
  response.status(404).json({ ok: false, error: 'API route not found' })
})

app.use(((error, _request, response, _next) => {
  if (error instanceof ZodError) {
    return response.status(400).json({ ok: false, error: 'Invalid request', details: error.flatten().fieldErrors })
  }

  if (error instanceof mongoose.Error.CastError) {
    return response.status(400).json({ ok: false, error: 'Invalid record id' })
  }

  console.error('[api] request failed', error instanceof Error ? error.message : 'Unknown error')
  return response.status(500).json({ ok: false, error: 'Internal server error' })
}) satisfies ErrorRequestHandler)
