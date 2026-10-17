import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

type Role = 'super_admin' | 'admin' | 'faculty' | 'member'

const testUsers: Array<{ name: string; email: string; password: string; role: Role; department?: string }> = [
  { name: 'Development Super Admin', email: 'superadmin.test@example.com', password: 'DevOnly-SuperAdmin-2026!x7', role: 'super_admin' },
  { name: 'Development Admin', email: 'admin.test@example.com', password: 'DevOnly-Admin-2026!q8', role: 'admin' },
  { name: 'Development Faculty', email: 'faculty.test@example.com', password: 'DevOnly-Faculty-2026!r9', role: 'faculty', department: 'Hydroponics Research' },
  { name: 'Development Member', email: 'member.test@example.com', password: 'DevOnly-Member-2026!s0', role: 'member', department: 'Development Testing' },
]

function assertSafeSeedTarget() {
  const nodeEnv = process.env.NODE_ENV ?? 'development'
  const mongoUri = process.env.MONGODB_URI ?? ''
  if (nodeEnv === 'production') throw new Error('Refusing to seed test users when NODE_ENV=production.')
  if (!['development', 'test'].includes(nodeEnv)) throw new Error('Refusing to seed: NODE_ENV must be development or test.')
  if (!mongoUri) throw new Error('MONGODB_URI is required for the development test-user seed.')

  const normalized = mongoUri.toLowerCase()
  const databaseName = (() => {
    try { return new URL(mongoUri).pathname.replace(/^\//, '').split('/')[0] } catch { return '' }
  })()
  const safeDatabaseName = /^(hydroponics_coe|hydroponics_coe_dev|hydroponics_coe_test|test|development)$/.test(databaseName)
  const productionMarkers = /(production|prod|live|main)/i.test(databaseName) || /production|prod-db|live-db/i.test(normalized)

  if (!safeDatabaseName || productionMarkers) {
    throw new Error('Refusing to seed: MONGODB_URI must target a recognised local development/test database (hydroponics_coe_dev, hydroponics_coe_test, development, or test).')
  }
}

async function seedTestUsers() {
  assertSafeSeedTarget()
  const [{ connectDatabase, disconnectDatabase }, { User }] = await Promise.all([
    import('../config/database'),
    import('../models/user'),
  ])
  await connectDatabase()

  try {
    const results: string[] = []
    for (const account of testUsers) {
    const email = account.email.toLowerCase()
    const existing = await User.exists({ email })
    if (existing) {
      results.push(`already existed: ${email}`)
      continue
    }

    await User.create({
      name: account.name,
      email,
      passwordHash: await bcrypt.hash(account.password, 12),
      role: account.role,
      status: 'active',
      department: account.department,
    })
    results.push(`created: ${email}`)
  }

    console.log(`Development test-user seed complete for ${mongoose.connection.name}.`)
    for (const result of results) console.log(result)
  } finally {
    await disconnectDatabase()
  }
}

seedTestUsers()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })

export { testUsers, assertSafeSeedTarget }
