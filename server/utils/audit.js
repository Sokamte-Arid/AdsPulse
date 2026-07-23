const AuditLog = require('../models/AuditLog');

async function logAction(userId, action, resource, resourceId, details, req, success = true) {
  try {
    await AuditLog.create({
      userId, action, resource, resourceId,
      details,
      ip: req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown',
      userAgent: req?.headers?.['user-agent'] || 'unknown',
      success
    });
  } catch (err) {
    console.error('[AuditLog Error]', err.message);
  }
}

module.exports = { logAction };
