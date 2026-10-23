import mongoose, { Schema } from 'mongoose'

const objectId = { type: Schema.Types.ObjectId, ref: 'User', required: true }

const attendanceSchema = new Schema({ member: { ...objectId, ref: 'User' }, markedBy: objectId, session: { type: Schema.Types.ObjectId, ref: 'AttendanceSession' }, date: { type: Date, required: true }, checkIn: Date, checkOut: Date, status: { type: String, enum: ['present', 'absent'], required: true }, sessionTitle: { type: String, trim: true, maxlength: 160 } }, { timestamps: true })
attendanceSchema.index({ member: 1, session: 1 }, { unique: true, partialFilterExpression: { session: { $exists: true } } })
attendanceSchema.index({ date: -1 })
attendanceSchema.index({ member: 1, date: -1 })

const sessionSchema = new Schema({ title: { type: String, required: true, trim: true, maxlength: 160 }, date: { type: Date, required: true }, faculty: objectId, details: { type: String, trim: true, maxlength: 1000 } }, { timestamps: true })
sessionSchema.index({ date: -1 })
sessionSchema.index({ faculty: 1, date: -1 })

const inventorySchema = new Schema({ itemId: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 40 }, name: { type: String, required: true, trim: true, maxlength: 160 }, category: { type: String, required: true, trim: true, maxlength: 80 }, quantity: { type: Number, required: true, min: 0 }, unit: { type: String, required: true, trim: true, maxlength: 30 }, location: { type: String, trim: true, maxlength: 120 }, condition: { type: String, trim: true, maxlength: 60 }, minimumStock: { type: Number, min: 0, default: 0 }, lastUpdatedBy: objectId, deletedAt: Date }, { timestamps: true })
inventorySchema.index({ deletedAt: 1, name: 1 })
inventorySchema.index({ category: 1 })

const transactionSchema = new Schema({ item: { type: Schema.Types.ObjectId, ref: 'InventoryItem', required: true }, quantityChange: { type: Number, required: true }, reason: { type: String, required: true, trim: true, maxlength: 300 }, type: { type: String, enum: ['addition', 'removal', 'adjustment'], required: true }, actedBy: objectId }, { timestamps: true })
transactionSchema.index({ item: 1, createdAt: -1 })

const projectSchema = new Schema({ title: { type: String, required: true, trim: true, maxlength: 180 }, description: { type: String, required: true, trim: true, maxlength: 4000 }, supervisingFaculty: { type: Schema.Types.ObjectId, ref: 'User', required: true }, members: [{ type: Schema.Types.ObjectId, ref: 'User' }], status: { type: String, enum: ['planned', 'active', 'on_hold', 'completed', 'cancelled'], default: 'planned' }, startDate: Date, endDate: Date, createdBy: objectId }, { timestamps: true })
projectSchema.index({ updatedAt: -1 })
projectSchema.index({ members: 1, updatedAt: -1 })
projectSchema.index({ supervisingFaculty: 1, updatedAt: -1 })

const projectUpdateSchema = new Schema({ project: { type: Schema.Types.ObjectId, ref: 'Project', required: true }, text: { type: String, required: true, trim: true, maxlength: 2000 }, author: objectId }, { timestamps: true })
projectUpdateSchema.index({ project: 1, createdAt: -1 })

const noticeSchema = new Schema({ title: { type: String, required: true, trim: true, maxlength: 180 }, body: { type: String, required: true, trim: true, maxlength: 5000 }, audience: { type: String, enum: ['all', 'faculty', 'member'], required: true }, publicationDate: { type: Date, default: Date.now }, expiryDate: Date, published: { type: Boolean, default: false }, createdBy: objectId }, { timestamps: true })
noticeSchema.index({ publicationDate: -1 })
noticeSchema.index({ published: 1, audience: 1, publicationDate: -1 })

const auditSchema = new Schema({
  actor: { type: Schema.Types.ObjectId, ref: 'User' },
  actorName: String,
  actorRole: String,
  action: { type: String, required: true, uppercase: true, index: true },
  module: { type: String, required: true, index: true },
  targetType: String,
  targetId: { type: String, index: true },
  description: String,
  oldValue: Schema.Types.Mixed,
  newValue: Schema.Types.Mixed,
  metadata: Schema.Types.Mixed,
  ipAddress: String,
  userAgent: String,
  success: { type: Boolean, default: true },
  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: true })
auditSchema.index({ actor: 1, timestamp: -1 })
auditSchema.index({ module: 1, timestamp: -1 })
auditSchema.index({ targetId: 1, timestamp: -1 })
auditSchema.index({ actorRole: 1, timestamp: -1 })
auditSchema.index({ action: 1, timestamp: -1 })
auditSchema.set('strict', true)

export const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema)
export const AttendanceSession = mongoose.models.AttendanceSession || mongoose.model('AttendanceSession', sessionSchema)
export const InventoryItem = mongoose.models.InventoryItem || mongoose.model('InventoryItem', inventorySchema)
export const InventoryTransaction = mongoose.models.InventoryTransaction || mongoose.model('InventoryTransaction', transactionSchema)
export const Project = mongoose.models.Project || mongoose.model('Project', projectSchema)
export const ProjectUpdate = mongoose.models.ProjectUpdate || mongoose.model('ProjectUpdate', projectUpdateSchema)
export const Notice = mongoose.models.Notice || mongoose.model('Notice', noticeSchema)
export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditSchema)

const sensitiveKey = /password|token|secret|hash|cookie/i
function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([key]) => !sensitiveKey.test(key)).map(([key, item]) => [key, redact(item)]))
}

export async function audit(actor: { id?: string; role?: string; name?: unknown; email?: unknown }, action: string, module: string, recordId?: string, before?: unknown, after?: unknown, context: { description?: string; targetType?: string; metadata?: unknown; ipAddress?: string; userAgent?: string; success?: boolean } = {}) {
  return AuditLog.create({ actor: actor.id || undefined, actorName: actor.name || actor.email, actorRole: actor.role, action: action.toUpperCase(), module, targetId: recordId, description: context.description, targetType: context.targetType, metadata: redact(context.metadata), oldValue: redact(before), newValue: redact(after), ipAddress: context.ipAddress, userAgent: context.userAgent, success: context.success ?? true, timestamp: new Date() })
}

export function canAccessProject(role: string, userId: string, project: { supervisingFaculty?: unknown; members?: unknown[] }) { return role === 'super_admin' || role === 'admin' || String(project.supervisingFaculty) === userId || project.members?.some(member => String(member) === userId) }

export function isStaff(role: string) { return role === 'super_admin' || role === 'admin' }
export function isManager(role: string) { return isStaff(role) || role === 'faculty' }
export function serialize(value: unknown) { return JSON.parse(JSON.stringify(value)) }

export type ModuleActor = { id: string; role: string }

export { mongoose }

export default {}

// Keep model registration explicit for Mongoose hot reloads.
void mongoose
