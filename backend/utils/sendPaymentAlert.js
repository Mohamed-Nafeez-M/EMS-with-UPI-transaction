// utils/sendPaymentAlert.js
// Sends an admin notification email whenever a new payment is submitted.

const { getTransporter } = require('./mailer');

/**
 * @param {{ paymentId: number, userId: number, eventId: number,
 *           utr: string, createdAt: string }} payment
 * @returns {Promise<boolean>}
 */
async function sendPaymentAlert({ paymentId, userId, eventId, utr, createdAt }) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('[PaymentAlert] ℹ️  Email not configured – skipping admin notification.');
    return true;
  }

  if (!adminEmail) {
    console.error('[PaymentAlert] ❌ No admin email set (ADMIN_EMAIL or EMAIL_USER).');
    return false;
  }

  const submittedAt = createdAt
    ? new Date(createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const subject = `💳 New Payment Submitted — UTR ${utr}`;

  const html = `
    <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:560px;margin:auto;
                padding:24px;border:1px solid #e0e0e0;border-radius:12px;
                background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);">

      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#1e293b;margin:0;font-size:22px;">💳 New Payment Alert</h1>
        <p style="color:#64748b;margin:8px 0 0 0;">A student has submitted a payment — please verify.</p>
      </div>

      <div style="background:white;border-radius:8px;padding:20px;
                  box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 8px;color:#6b7280;width:40%;">Payment ID</td>
            <td style="padding:10px 8px;color:#1e293b;font-weight:600;">#${paymentId}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 8px;color:#6b7280;">User ID</td>
            <td style="padding:10px 8px;color:#1e293b;font-weight:600;">${userId}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 8px;color:#6b7280;">Event ID</td>
            <td style="padding:10px 8px;color:#1e293b;font-weight:600;">${eventId}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 8px;color:#6b7280;">UTR Number</td>
            <td style="padding:10px 8px;font-family:monospace;font-size:16px;
                       color:#4f46e5;font-weight:700;letter-spacing:1px;">${utr}</td>
          </tr>
          <tr>
            <td style="padding:10px 8px;color:#6b7280;">Submitted At</td>
            <td style="padding:10px 8px;color:#1e293b;">${submittedAt} IST</td>
          </tr>
        </table>
      </div>

      <div style="background:#fef9c3;border:1px solid #fbbf24;border-radius:8px;
                  padding:14px 18px;margin-top:20px;">
        <p style="margin:0;color:#92400e;font-size:13px;">
          ⚠️ Please verify this UTR against your bank statement and update the
          payment status in the admin panel accordingly.
        </p>
      </div>

      <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:11px;margin:0;">
          Automated alert from PTU EMS · Do not reply to this email.
        </p>
      </div>
    </div>
  `;

  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: `"PTU EMS" <${process.env.EMAIL_USER}>`,
      to: adminEmail,
      subject,
      html,
    });
    console.log(`[PaymentAlert] ✅ Admin notified at ${adminEmail} | messageId: ${info.messageId}`);
    return true;
  } catch (err) {
    if (err.code === 'EAUTH' || err.responseCode === 535) {
      console.error('[PaymentAlert] ❌ AUTH FAILED – check EMAIL_USER / EMAIL_PASS in .env');
    } else {
      console.error('[PaymentAlert] ❌ Failed to send admin alert:', err.message);
    }
    return false;
  }
}

module.exports = sendPaymentAlert;
