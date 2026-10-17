import mongoose, { Schema } from 'mongoose'

export const roles = ['super_admin', 'admin', 'faculty', 'member'] as const
export type Role = (typeof roles)[number]

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: roles, required: true, default: 'member', index: true },
  status: { type: String, enum: ['active', 'pending_approval', 'rejected', 'disabled'], required: true, default: 'active', index: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectionReason: { type: String, trim: true, maxlength: 500, select: false },
  department: { type: String, trim: true, maxlength: 160 },
  profileImage: { type: String, trim: true },
}, { timestamps: true })

userSchema.index({ role: 1 }, { unique: true, partialFilterExpression: { role: 'super_admin' }, name: 'one_super_admin' })

export const User = mongoose.models.User || mongoose.model('User', userSchema)
export type UserDocument = mongoose.InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId }

export function safeUser(user: UserDocument | Record<string, unknown>) {
  const value = user as Record<string, unknown>
  return { id: String(value._id ?? value.id), name: value.name, email: value.email, role: value.role, status: value.status, department: value.department, profileImage: value.profileImage }
}
