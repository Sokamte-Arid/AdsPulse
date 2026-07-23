const Notification = require('../models/Notification');

// ── Helper to create a notification ──────────────────────────────────────────
async function createNotification(userId, { type='info', category='system', title, message, link, meta }) {
  try {
    await Notification.create({ userId, type, category, title, message, link, meta });
  } catch (err) {
    console.error('[Notify] Failed to create notification:', err.message);
  }
}

// ── Common notification templates ─────────────────────────────────────────────
const notify = {
  campaignCreated: (userId, campaignName) =>
    createNotification(userId, {
      type: 'success', category: 'campaign',
      title: 'Campaign created',
      message: `"${campaignName}" has been created successfully.`,
      link: '/campaigns',
    }),

  campaignLaunched: (userId, campaignName) =>
    createNotification(userId, {
      type: 'success', category: 'campaign',
      title: 'Campaign launched',
      message: `"${campaignName}" is now live and running.`,
      link: '/campaigns',
    }),

  platformConnected: (userId, platform) =>
    createNotification(userId, {
      type: 'success', category: 'platform',
      title: `${platform} connected`,
      message: `Your ${platform} account has been connected successfully. Your campaigns will sync shortly.`,
      link: '/connect',
    }),

  platformError: (userId, platform, error) =>
    createNotification(userId, {
      type: 'error', category: 'platform',
      title: `${platform} connection error`,
      message: error || `There was an issue with your ${platform} connection.`,
      link: '/connect',
    }),

  budgetAlert: (userId, campaignName, percent) =>
    createNotification(userId, {
      type: 'warning', category: 'budget',
      title: 'Budget alert',
      message: `"${campaignName}" has used ${percent}% of its budget.`,
      link: '/campaigns',
    }),

  revenueAdded: (userId, amount, currency) =>
    createNotification(userId, {
      type: 'success', category: 'milestone',
      title: 'Revenue recorded',
      message: `${currency} ${amount.toLocaleString()} in revenue has been added.`,
      link: '/roi',
    }),

  syncComplete: (userId, platform, count) =>
    createNotification(userId, {
      type: 'info', category: 'platform',
      title: `${platform} sync complete`,
      message: `${count} campaign${count !== 1 ? 's' : ''} imported from ${platform}.`,
      link: '/campaigns',
    }),
};

module.exports = { createNotification, notify };