// backend/utils/sendStatusEmail.js
// Sends approval OR rejection email to the student after admin action.

const { getTransporter } = require('./mailer');

/**
 * @param {{
 *   userEmail:  string,
 *   userName:   string,
 *   paymentId:  number,
 *   eventTitle: string,
 *   utr:        string,
 *   status:     'approved' | 'rejected',
 *   updatedAt:  string,
 * }} params
 * @returns {Promise<boolean>}
 */
async function sendStatusEmail({
  userEmail,
  userName,
  paymentId,
  eventTitle,
  utr,
  status,
  updatedAt,
}) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('[StatusEmail] ℹ️  Email not configured – skipping status notification.');
    return true;
  }

  const isApproved = status === 'approved';

  const actionAt = updatedAt
    ? new Date(updatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  // ── Subject ─────────────────────────────────────────────────────────────────
  const subject = isApproved
    ? `✅ Payment Approved – Registration Confirmed | PTU EMS`
    : `❌ Payment Rejected – Action Required | PTU EMS`;

  // ── Status badge styles ──────────────────────────────────────────────────────
  const badgeBg    = isApproved ? '#d1fae5' : '#fee2e2';
  const badgeColor = isApproved ? '#065f46' : '#991b1b';
  const badgeLabel = isApproved ? '✅ Approved' : '❌ Rejected';

  // ── Header / message copy ────────────────────────────────────────────────────
  const headerEmoji   = isApproved ? '🎉' : '⚠️';
  const headerTitle   = isApproved ? 'Registration Confirmed!' : 'Payment Rejected';
  const headerSubtitle = isApproved
    ? 'Your payment has been verified and your seat is confirmed.'
    : 'Unfortunately, your payment could not be verified.';

  // ── Body message ─────────────────────────────────────────────────────────────
  const bodyMessage = isApproved
    ? `Congratulations <strong>${userName}</strong>! Your payment for <strong>${eventTitle}</strong>
       has been <strong style="color:#065f46;">approved</strong> by our admin team.
       Your event registration is now confirmed. See you at the event! 🚀`
    : `Hi <strong>${userName}</strong>, we were unable to verify your payment UTR
       <strong style="font-family:monospace;">${utr}</strong> for
       <strong>${eventTitle}</strong>. Please re-submit your payment or contact
       <a href="mailto:support@ptu.edu.in" style="color:#dc2626;">support@ptu.edu.in</a>
       with your Payment ID for assistance.`;

  // ── Call-to-action box ───────────────────────────────────────────────────────
  const ctaBox = isApproved
    ? `<div style="background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;
                   padding:14px 18px;margin-top:16px;">
         <p style="margin:0;color:#065f46;font-size:13px;line-height:1.6;">
           🎟️ Your ticket/registration is now <strong>active</strong>.
           Log in to the EMS portal to view your registration details.
         </p>
       </div>`
    : `<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;
                   padding:14px 18px;margin-top:16px;">
         <p style="margin:0;color:#991b1b;font-size:13px;line-height:1.6;">
           ❗ Common reasons for rejection: incorrect UTR, payment to wrong UPI ID,
           or amount mismatch. Please recheck and resubmit, or contact support.
         </p>
       </div>`;

  const html = `
    <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:560px;
                margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px;
                background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);">

      <!-- Header -->
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#1e293b;margin:0;font-size:22px;">${headerEmoji} ${headerTitle}</h1>
        <p style="color:#64748b;margin:8px 0 0 0;">${headerSubtitle}</p>
      </div>

      <!-- Body message -->
      <div style="background:white;border-radius:8px;padding:20px 24px;
                  box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:16px;">
        <p style="color:#374151;font-size:14px;line-height:1.75;margin:0;">
          ${bodyMessage}
        </p>
      </div>

      <!-- Payment details -->
      <div style="background:white;border-radius:8px;padding:20px;
                  box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <h3 style="color:#1e293b;margin:0 0 14px 0;font-size:15px;">📋 Payment Details</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:9px 6px;color:#6b7280;width:42%;">Payment ID</td>
            <td style="padding:9px 6px;color:#1e293b;font-weight:600;">#${paymentId}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:9px 6px;color:#6b7280;">Event</td>
            <td style="padding:9px 6px;color:#1e293b;font-weight:600;">${eventTitle}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:9px 6px;color:#6b7280;">UTR Number</td>
            <td style="padding:9px 6px;font-family:monospace;font-size:15px;
                       color:#4f46e5;font-weight:700;letter-spacing:1px;">${utr}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:9px 6px;color:#6b7280;">Status</td>
            <td style="padding:9px 6px;">
              <span style="background:${badgeBg};color:${badgeColor};padding:2px 10px;
                           border-radius:20px;font-size:12px;font-weight:600;">
                ${badgeLabel}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:9px 6px;color:#6b7280;">Updated At</td>
            <td style="padding:9px 6px;color:#1e293b;">${actionAt} IST</td>
          </tr>
        </table>
      </div>

      ${ctaBox}

      <!-- Footer -->
      <div style="text-align:center;margin-top:24px;padding-top:16px;
                  border-top:1px solid #e2e8f0;">
        <p style="color:#94a3b8;font-size:11px;margin:0;">
          Automated message from PTU EMS · Do not reply to this email.
        </p>
      </div>
    </div>
  `;

  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: `"PTU EMS" <${process.env.EMAIL_USER}>`,
      to:   userEmail,
      subject,
      html,
    });
    console.log(`[StatusEmail] ✅ ${status} email sent to ${userEmail} | messageId: ${info.messageId}`);
    return true;
  } catch (err) {
    if (err.code === 'EAUTH' || err.responseCode === 535) {
      console.error('[StatusEmail] ❌ AUTH FAILED – check EMAIL_USER / EMAIL_PASS in .env');
    } else {
      console.error(`[StatusEmail] ❌ Failed to send ${status} email:`, err.message);
    }
    return false;
  }
}

module.exports = sendStatusEmail;
