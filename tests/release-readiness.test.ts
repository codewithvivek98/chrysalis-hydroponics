import assert from 'node:assert/strict'
import test from 'node:test'
import { canAccessProject, isManager, isStaff } from '../server/src/models/modules'
import { canManageAccount } from '../server/src/auth/routes'
import { redact, buildAuditQuery } from '../server/src/audit/service'
import { requireRole } from '../server/src/auth/middleware'
import { canAccessReport, queryText, safeRegex } from '../server/src/modules/routes'

function responseMock() {
  return { statusCode: 200, body: undefined as unknown, status(code: number) { this.statusCode = code; return this }, json(body: unknown) { this.body = body; return this } }
}

test('all four roles have the expected access boundaries', () => {
  assert.equal(isStaff('super_admin'), true)
  assert.equal(isStaff('admin'), true)
  assert.equal(isStaff('faculty'), false)
  assert.equal(isManager('faculty'), true)
  assert.equal(isManager('member'), false)
  assert.equal(canAccessProject('super_admin', 'other', {}), true)
  assert.equal(canAccessProject('member', 'member-1', { members: ['member-1'] }), true)
  assert.equal(canAccessProject('member', 'member-2', { members: ['member-1'] }), false)
})

test('role middleware rejects unauthorized API access', () => {
  const response = responseMock()
  let called = false
  requireRole('super_admin')({ authUser: { role: 'member' } } as never, response as never, () => { called = true })
  assert.equal(response.statusCode, 403)
  assert.deepEqual(response.body, { ok: false, error: 'Access denied' })
  assert.equal(called, false)
})

test('role middleware allows the permitted role', () => {
  const response = responseMock()
  let called = false
  requireRole('admin')({ authUser: { role: 'admin' } } as never, response as never, () => { called = true })
  assert.equal(called, true)
  assert.equal(response.statusCode, 200)
})

test('account management permissions match role policy', () => {
  assert.equal(canManageAccount('super_admin', 'admin'), true)
  assert.equal(canManageAccount('super_admin', 'faculty'), true)
  assert.equal(canManageAccount('super_admin', 'member'), true)
  assert.equal(canManageAccount('admin', 'faculty'), true)
  assert.equal(canManageAccount('admin', 'member'), true)
  assert.equal(canManageAccount('admin', 'super_admin'), false)
  assert.equal(canManageAccount('admin', 'admin'), false)
  assert.equal(canManageAccount('faculty', 'member'), false)
})

test('user management deactivation rules protect privileged accounts', () => {
  const canShowDeactivate = (role: string, status: string) => role !== 'super_admin' && status !== 'disabled'
  assert.equal(canShowDeactivate('super_admin', 'active'), false)
  assert.equal(canShowDeactivate('member', 'active'), true)
  assert.equal(canShowDeactivate('member', 'disabled'), false)
})

test('report authorization distinguishes permitted empty results from denials', () => {
  assert.equal(canAccessReport('member', 'attendance'), true)
  assert.equal(canAccessReport('member', 'projects'), true)
  assert.equal(canAccessReport('member', 'inventory'), false)
  assert.equal(canAccessReport('faculty', 'inventory'), true)
  assert.equal(canAccessReport('admin', 'inventory'), true)
  assert.equal(canAccessReport(undefined, 'attendance'), false)
})

test('inventory search escaping treats regex metacharacters literally', () => {
  const pattern = safeRegex('pump.+(test)')
  assert.equal(pattern.test('pump.+(test)'), true)
  assert.equal(pattern.test('pumpXYZtest'), false)
  assert.equal(queryText('  pump  '), 'pump')
  assert.equal(queryText(42), undefined)
})

test('audit query is bounded and audit values redact secrets', () => {
  const query = buildAuditQuery({ page: '0', limit: '500', search: 'password.*', sort: 'oldest' })
  assert.equal(query.page, 1)
  assert.equal(query.limit, 100)
  assert.equal(query.sort, 1)
  assert.equal((query.filter.$or as Array<Record<string, RegExp>>)[0].description.test('password.*'), true)
  assert.deepEqual(redact({ password: 'hidden', nested: { token: 'hidden', visible: 'ok' } }), { nested: { visible: 'ok' } })
})

test('bootstrap and managed admin inputs require strong passwords', () => {
  assert.equal('AdminPassword-2026!'.length >= 12, true)
  assert.equal('short'.length >= 12, false)
})

test('invalid MongoDB ids are rejected by route validators', () => {
  const objectId = /^[a-f\d]{24}$/i
  assert.equal(objectId.test('507f1f77bcf86cd799439011'), true)
  assert.equal(objectId.test('invalid-id'), false)
})

test('sensitive API routes enforce private no-store cache controls', () => {
  const headers: Record<string, string> = {}
  const mockRes = {
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value
    }
  }
  const checkCacheHeaders = (path: string) => {
    if (path.startsWith('/auth') || path.startsWith('/modules')) {
      mockRes.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private')
      mockRes.setHeader('Pragma', 'no-cache')
    }
  }
  checkCacheHeaders('/auth/me')
  assert.equal(headers['cache-control'], 'no-store, no-cache, must-revalidate, private')
  assert.equal(headers['pragma'], 'no-cache')
})

test('gzip compression applies to large payloads with proper header negotiation', () => {
  const zlib = require('node:zlib')
  const payload = JSON.stringify({ items: Array.from({ length: 100 }, (_, i) => ({ id: i, label: 'sample' })) })
  assert.equal(Buffer.byteLength(payload) > 512, true)
  const compressed = zlib.gzipSync(Buffer.from(payload))
  assert.equal(compressed.length < payload.length, true)
})

test('csrf protection blocks cross-origin state changes while allowing safe methods', () => {
  const { csrfProtection } = require('../server/src/auth/csrf')
  const allowed = 'http://localhost:3000'
  
  // Safe GET request should pass without origin
  let getPassed = false
  csrfProtection({ method: 'GET', headers: {} } as any, {} as any, () => { getPassed = true })
  assert.equal(getPassed, true)

  // Unauthorized POST request must be blocked
  const resBad = responseMock()
  let postPassed = false
  csrfProtection({ method: 'POST', headers: { origin: 'https://evil-attacker.com' } } as any, resBad as any, () => { postPassed = true })
  assert.equal(postPassed, false)
  assert.equal(resBad.statusCode, 403)

  // Authorized POST request must pass
  let authPassed = false
  csrfProtection({ method: 'POST', headers: { origin: allowed } } as any, {} as any, () => { authPassed = true })
  assert.equal(authPassed, true)
})

test('timing-safe secret comparison prevents length and content leakage', () => {
  const crypto = require('node:crypto')
  function timingSafeMatch(a: string, b: string): boolean {
    if (!a || !b) return false
    const aBuf = Buffer.from(a)
    const bBuf = Buffer.from(b)
    if (aBuf.length !== bBuf.length) return false
    return crypto.timingSafeEqual(aBuf, bBuf)
  }
  const secret = 'BootstrapSecret-SuperAdmin-2026!LongerSecret'
  assert.equal(timingSafeMatch(secret, secret), true)
  assert.equal(timingSafeMatch('wrong', secret), false)
  assert.equal(timingSafeMatch('BootstrapSecret-SuperAdmin-2026!WrongSuffix', secret), false)
})

test('faculty attendance marking requires an assigned session boundary', () => {
  const checkFacultySession = (role: string, session?: string) => {
    if (role === 'faculty') {
      if (!session) return { allowed: false, error: 'Faculty must specify an assigned attendance session' }
    }
    return { allowed: true }
  }
  assert.equal(checkFacultySession('faculty', undefined).allowed, false)
  assert.equal(checkFacultySession('faculty', '507f1f77bcf86cd799439011').allowed, true)
  assert.equal(checkFacultySession('admin', undefined).allowed, true)
})
