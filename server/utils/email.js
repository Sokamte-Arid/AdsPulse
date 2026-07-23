/**
 * Email utility — uses Resend HTTP API (no SMTP, works on any network).
 * Docs: https://resend.com/docs/api-reference/emails/send-email
 */

const FROM = `${process.env.SMTP_FROM_NAME || 'AdsPulse'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`;

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY || process.env.SMTP_PASS;

  if (!apiKey) {
    console.error('[EMAIL] No RESEND_API_KEY set — skipping send');
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`[EMAIL Error] ${data?.message || JSON.stringify(data)}`);
    throw new Error(data?.message || 'Failed to send email');
  }

  console.log(`[EMAIL] → ${to} | ${subject}`);
  return data;
}

module.exports = { sendEmail };
