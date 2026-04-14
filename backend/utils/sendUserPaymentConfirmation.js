// utils/sendUserPaymentConfirmation.js
// Sends "payment received, under verification" email to the student.

const { getTransporter } = require('./mailer');

/**
 * @param {{ userEmail: string, userName: string, paymentId: number,
 *           eventId: number, utr: string, createdAt: string }} params
 * @returns {Promise<boolean>}
 */
async function sendUserPaymentConfirmation({
  userEmail,
  userName,
  paymentId,
  eventId,
  utr,
  createdAt,
}) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('[UserPaymentMail] ℹ️  Email not configured – skipping user confirmation.');
    return true;
  }

  const submittedAt = createdAt
    ? new Date(createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const subject = '✅ Payment Received – Under Verification | PTU EMS';

  const html = `
    <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:560px;
                margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px;
                background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);">

      <!-- Header -->
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#1e293b;margin:0;font-size:22px;">✅ Payment Received!</h1>
        <p style="color:#64748b;margin:8px 0 0 0;">
          Your payment is being verified by our team.
        </p>
      </div>

      <!-- Greeting -->
      <div style="background:white;border-radius:8px;padding:20px 24px;
                  box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:16px;">
        <p style="color:#374151;font-size:15px;margin:0 0 12px 0;">
          Hi <strong>${userName}</strong>,
        </p>
        <p style="color:#6b7280;font-size:14px;line-height:1.7;margin:0;">
          We have received your payment submission. Our admin team will verify
          your UTR number against the bank records and confirm your registration
          shortly. You will receive another email once the verification is complete.
        </p>
      </div>

      <!-- Payment details -->
      <div style="background:white;border-radius:8px;padding:20px;
                  box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <h3 style="color:#1e293b;margin:0 0 14px 0;font-size:15px;">
          📋 Payment Details
        </h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:9px 6px;color:#6b7280;width:42%;">Payment ID</td>
            <td style="padding:9px 6px;color:#1e293b;font-weight:600;">#${paymentId}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:9px 6px;color:#6b7280;">Event ID</td>
            <td style="padding:9px 6px;color:#1e293b;font-weight:600;">${eventId}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:9px 6px;color:#6b7280;">UTR Number</td>
            <td style="padding:9px 6px;font-family:monospace;font-size:15px;
                       color:#4f46e5;font-weight:700;letter-spacing:1px;">${utr}</td>
          </tr>
          <tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:9px 6px;color:#6b7280;">Status</td>
            <td style="padding:9px 6px;">
              <span style="background:#fef9c3;color:#92400e;padding:2px 10px;
                           border-radius:20px;font-size:12px;font-weight:600;">
                Under Verification
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:9px 6px;color:#6b7280;">Submitted At</td>
            <td style="padding:9px 6px;color:#1e293b;">${submittedAt} IST</td>
          </tr>
        </table>
      </div>

      <!-- Info box -->
      <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;
                  padding:14px 18px;margin-top:16px;">
        <p style="margin:0;color:#1e40af;font-size:13px;line-height:1.6;">
          ℹ️ Verification usually takes <strong>a few hours</strong> on working days.
          If you have any questions, contact
          <a href="mailto:support@ptu.edu.in" style="color:#2563eb;">support@ptu.edu.in</a>
          with your Payment ID.
        </p>
      </div>

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
      to: userEmail,
      subject,
      html,
    });
    console.log(`[UserPaymentMail] ✅ Confirmation sent to ${userEmail} | messageId: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error('[UserPaymentMail] ❌ Failed to send user confirmation:', err.message);
    return false;
  }
}

module.exports = sendUserPaymentConfirmation;
