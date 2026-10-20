// ============================================================================
// Audit Logging Service
// ============================================================================

import pool from '../config/db.js';

export const logAudit = async ({
  actorType = 'SYSTEM',
  actorId = null,
  action,
  entityType,
  entityId = null,
  details = null,
  ipAddress = null,
  connection = null
}) => {
  const query = `
    INSERT INTO audit_logs (actor_type, actor_id, action, entity_type, entity_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    actorType,
    actorId,
    action,
    entityType,
    entityId,
    details ? JSON.stringify(details) : null,
    ipAddress
  ];

  try {
    const db = connection || pool;
    await db.query(query, params);
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
};

