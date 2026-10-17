import { createServer } from 'node:http'
import { app } from './app'
import { connectDatabase, disconnectDatabase } from './config/database'
import { env } from './config/env'

async function start() {
  try {
    const database = await connectDatabase()
    console.info(database ? '[api] MongoDB connected' : '[api] MongoDB not configured; running without database')

    const server = createServer(app)
    server.listen(env.port, () => {
      console.info(`[api] listening on http://localhost:${env.port}`)
    })

    const shutdown = async (signal: string) => {
      console.info(`[api] received ${signal}; shutting down`)
      server.close(async () => {
        await disconnectDatabase()
        process.exit(0)
      })
    }

    process.once('SIGINT', () => void shutdown('SIGINT'))
    process.once('SIGTERM', () => void shutdown('SIGTERM'))
  } catch (error) {
    console.error('[api] startup failed', error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}

void start()
