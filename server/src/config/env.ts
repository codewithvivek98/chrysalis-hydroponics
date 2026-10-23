import 'dotenv/config'

const port = Number(process.env.PORT ?? 4000)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port number')
}

const nodeEnv = process.env.NODE_ENV ?? 'development'
const sessionSecret = process.env.SESSION_SECRET ?? ''

if (!['development', 'test', 'production'].includes(nodeEnv)) {
  throw new Error('NODE_ENV must be development, test, or production')
}

if (nodeEnv === 'production' && sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be at least 32 characters in production')
}

const clientOrigin =
  process.env.CLIENT_ORIGIN ??
  (nodeEnv === 'production' ? '' : 'http://localhost:3000')

if (nodeEnv === 'production' && !clientOrigin) {
  throw new Error('CLIENT_ORIGIN is required in production')
}

export const env = {
  port,
  nodeEnv,
  mongoUri: process.env.MONGODB_URI ?? '',
  clientOrigin,
  sessionSecret: sessionSecret || 'development-only-change-me',
  bootstrapSecret: process.env.BOOTSTRAP_SECRET ?? '',
} as const

export const allowedOrigins = (clientOrigin || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim().replace(/\/+$/, ''))
  .filter(Boolean)

export function hasMongoConfiguration() {
  return Boolean(env.mongoUri)
}

export function isProduction() {
  return env.nodeEnv === 'production'
}

export function validateStartupConfiguration() {
  if (isProduction() && !hasMongoConfiguration()) {
    throw new Error('MONGODB_URI is required when NODE_ENV=production')
  }

  if (isProduction() && !env.clientOrigin) {
    throw new Error('CLIENT_ORIGIN is required in production')
  }
}

validateStartupConfiguration()
