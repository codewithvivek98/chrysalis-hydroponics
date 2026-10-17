import mongoose from 'mongoose'
import { env, hasMongoConfiguration } from './env'

let connectionPromise: Promise<typeof mongoose> | null = null

export async function connectDatabase() {
  if (!hasMongoConfiguration()) return null
  if (mongoose.connection.readyState === 1) return mongoose
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 })
      .catch((error) => {
        connectionPromise = null
        throw error
      })
  }
  return connectionPromise
}

export async function disconnectDatabase() {
  connectionPromise = null
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
}

export function getDatabaseStatus() {
  switch (mongoose.connection.readyState) {
    case 0: return 'disconnected'
    case 1: return 'connected'
    case 2: return 'connecting'
    case 3: return 'disconnecting'
    default: return 'unknown'
  }
}
