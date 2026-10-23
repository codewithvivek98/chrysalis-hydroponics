import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import mongoose from 'mongoose'
// @ts-expect-error express-session ships JavaScript types in this stack
import session from 'express-session'
import MongoStore from 'connect-mongo'
import { authRouter } from './auth/routes'
import { env } from './config/env'
import { getDatabaseStatus } from './config/database'
import { moduleRouter } from './modules/routes'

export const app = express()

app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(cors({ origin: env.clientOrigin, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(session({
  name: 'hydro_session',
  secret: env.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: env.nodeEnv === 'production' ? 'none' : 'lax', secure: env.nodeEnv === 'production', maxAge: 1000 * 60 * 60 * 8 },
  ...(env.mongoUri ? { store: MongoStore.create({ mongoUrl: env.mongoUri, ttl: 60 * 60 * 8 }) } : {}),
}))

app.use('/api/auth', authRouter)
app.use('/api/modules', moduleRouter)

if (env.nodeEnv !== 'test') {
  app.use((request, _response, next) => {
    console.info(`[api] ${request.method} ${request.originalUrl}`)
    next()
  })
}

app.get('/api/health', (_request, response) => {
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
