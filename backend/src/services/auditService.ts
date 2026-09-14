import mongoose from 'mongoose';
import { AuditLog } from '../models/AuditLog';

export const logAudit = async (
  action: string,
  resource: string,
  userId?: string | mongoose.Types.ObjectId,
  userRole?: string,
  resourceId?: string,
  details?: Record<string, any>,
  ipAddress?: string
): Promise<void> => {
  try {
    await AuditLog.create({
      userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      userRole,
      action,
      resource,
      resourceId,
      details,
      ipAddress,
      timestamp: new Date(),
    });
  } catch (err: any) {
    console.error('[AuditService] Failed to record audit log:', err.message);
  }
};
