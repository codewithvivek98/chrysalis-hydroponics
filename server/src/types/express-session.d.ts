import type { RequestHandler } from 'express'
import type { Role } from '../models/user'

declare module 'express-session' {
  interface SessionData { userId?: string }
  interface Session { userId?: string; regenerate(callback: (error?: Error) => void): void; destroy(callback: (error?: Error) => void): void }
  interface SessionOptions { [key: string]: unknown }
  const session: (options: SessionOptions) => RequestHandler
  export default session
}

declare global {
  namespace Express {
    interface Request { authUser?: { id: string; name: unknown; email: unknown; role: Role; status: 'active' | 'disabled'; department?: unknown; profileImage?: unknown } }
  }
}
