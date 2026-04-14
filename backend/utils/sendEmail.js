// utils/sendEmail.js

const nodemailer = require('nodemailer');
const validator  = require('validator');

/**
 * Sends a confirmation email.
 * @param {string}      toEmail
 * @param {string}      toName
 * @param {object|null} event   – { title, date, venue, ticketId, qrCode?, verificationUrl? }
 * @returns {Promise<boolean>}
 */
async function sendEmail(toEmail, toName = 'User', event = null) {

  // ── 1. Input validation ──────────────────────────────────────────────────
  if (!toEmail || !validator.isEmail(toEmail)) {
    console.error('[Email] ❌ Invalid email address:', toEmail);
    return false;
  }

  if (!toName || typeof toName !== 'string' || toName.trim().length === 0) {
    console.error('[Email] ❌ Invalid recipient name');
    return false;
  }

  // ── 2. Build subject + HTML body ─────────────────────────────────────────
  let subject, htmlBody;

  try {
    if (event) {
      // FIX: removed the `!event.ticketId` guard that was silently returning
      // false when ticketId was generated but not yet persisted.
      if (!event.title) {
        console.error('[Email] ❌ Missing required event.title');
        return false;
      }

      const eventDate = event.date
        ? new Date(event.date).toLocaleDateString('en-IN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })
        : 'TBD';

      subject  = `🎫 Event Registration Confirmed – ${event.title}`;
      htmlBody = `
        <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px;background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#1e293b;margin:0;font-size:24px;">🎉 Registration Confirmed!</h1>
            <p style="color:#64748b;margin:8px 0 0 0;">Welcome to PTU Event Management System</p>
          </div>

          <div style="background:white;border-radius:8px;padding:20px;margin:20px 0;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
            <h2 style="color:#1e293b;margin:0 0 16px 0;font-size:20px;">${event.title}</h2>
            <div style="margin-bottom:16px;">
              <span style="color:#4f46e5;font-size:16px;">📅</span>
              <strong style="color:#374151;font-size:14px;"> Date:</strong>
              <span style="color:#6b7280;font-size:13px;"> ${eventDate}</span>
            </div>
            <div>
              <span style="color:#4f46e5;font-size:16px;">📍</span>
              <strong style="color:#374151;font-size:14px;"> Venue:</strong>
              <span style="color:#6b7280;font-size:13px;"> ${event.venue || 'TBD'}</span>
            </div>
          </div>

          ${event.ticketId ? `
          <div style="background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border:1px solid #f59e0b;border-radius:8px;padding:20px;margin:20px 0;">
            <h3 style="color:#92400e;margin:0 0 12px 0;font-size:18px;">🎫 Your Digital Ticket</h3>
            <div style="background:white;border-radius:6px;padding:12px;margin:12px 0;border:1px solid #e5e7eb;">
              <div style="font-weight:600;color:#374151;font-size:14px;">Ticket ID</div>
              <div style="font-family:monospace;color:#1f2937;font-size:16px;margin-top:4px;word-break:break-all;">${event.ticketId}</div>
            </div>
            ${event.qrCode ? `<div style="text-align:center;margin:16px 0;"><img src="${event.qrCode}" alt="QR Code" style="max-width:150px;border:2px solid #e5e7eb;border-radius:6px;" /></div>` : ''}
            ${event.verificationUrl ? `<p style="text-align:center;margin:12px 0;"><a href="${event.verificationUrl}" style="background:#4f46e5;color:white;padding:8px 16px;text-decoration:none;border-radius:6px;font-size:14px;">Verify Ticket</a></p>` : ''}
          </div>
          ` : ''}

          <div style="background:#f0f9ff;border:1px solid #0ea5e9;border-radius:8px;padding:16px;margin:20px 0;">
            <h4 style="color:#0c4a6e;margin:0 0 8px 0;font-size:16px;">📧 Important Information</h4>
            <ul style="color:#374151;margin:0;padding-left:20px;font-size:14px;">
              <li>Please arrive 15 minutes before the event starts</li>
              <li>Bring a valid ID for verification</li>
              <li>Keep this email for your records</li>
            </ul>
          </div>

          <div style="text-align:center;margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;">
            <p style="color:#64748b;font-size:12px;margin:0;">
              This is an automated message from PTU EMS.<br>
              For support, contact: <a href="mailto:support@ptu.edu.in" style="color:#4f46e5;">support@ptu.edu.in</a>
            </p>
          </div>
        </div>
      `;
    } else {
      // Account registration welcome email
      subject  = '🎓 Welcome to PTU Event Management System!';
      htmlBody = `
        <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e0e0e0;border-radius:12px;background:linear-gradient(135deg,#f8fafc 0%,#f1f5f9 100%);">
          <div style="text-align:center;margin-bottom:24px;">
            <h1 style="color:#1e293b;margin:0;font-size:24px;">🎓 Welcome to PTU EMS!</h1>
            <p style="color:#64748b;margin:8px 0 0 0;">Your account has been created successfully</p>
          </div>
          <div style="background:white;border-radius:8px;padding:24px;margin:20px 0;box-shadow:0 2px 8px rgba(0,0,0,0.1);text-align:center;">
            <h2 style="color:#1e293b;margin:0 0 16px 0;">Hello, ${toName}!</h2>
            <p style="color:#64748b;margin:0 0 20px 0;line-height:1.6;">
              Your account has been created. You can now log in and start registering for campus events.
            </p>
          </div>
          <div style="text-align:center;margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;">
            <p style="color:#64748b;font-size:12px;margin:0;">
              This is an automated message from PTU EMS.<br>
              For support, contact: <a href="mailto:support@ptu.edu.in" style="color:#4f46e5;">support@ptu.edu.in</a>
            </p>
          </div>
        </div>
      `;
    }
  } catch (buildErr) {
    console.error('[Email] ❌ Error building email content:', buildErr);
    return false;
  }

  // ── 3. Test mode (no credentials) ───────────────────────────────────────
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[Email] ℹ️  Test mode – no credentials set. Would have sent to: ${toEmail}`);
    console.log(`[Email] ℹ️  Subject: ${subject}`);
    return true;
  }

  // ── 4. Send via Gmail SMTP ───────────────────────────────────────────────
  // FIX: create transporter inside try so we can handle auth errors clearly.
  // FIX: removed pool:true + transporter.close() – pooled transporter +
  //      close() in finally caused a race where the connection was torn down
  //      before sendMail() finished on slow networks.
  try {
    console.log(`[Email] 📤 Attempting to send to ${toEmail} via ${process.env.EMAIL_USER} …`);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        // FIX: trim() removes stray spaces from .env App Password values
        // e.g.  EMAIL_PASS=rerq lizp tgnn oyim  → nodemailer needs no spaces
        pass: process.env.EMAIL_PASS.replace(/\s+/g, ''),
      },
    });

    // FIX: verify() gives a clear auth error in logs before attempting send
    await transporter.verify();

    // Convert base64 data URL to buffer for inline attachment
const attachments = [];
let htmlBodyFinal = htmlBody;

if (event?.qrCode && event.qrCode.startsWith('data:image/png;base64,')) {
  const base64Data = event.qrCode.replace('data:image/png;base64,', '');
  attachments.push({
    filename: 'qrcode.png',
    content: Buffer.from(base64Data, 'base64'),
    cid: 'qrcode@ptu',  // Content-ID referenced in HTML
  });
  // Replace the base64 src with cid: reference
  htmlBodyFinal = htmlBody.replace(
    `src="${event.qrCode}"`,
    `src="cid:qrcode@ptu"`
  );
}

const info = await transporter.sendMail({
  from: `"PTU EMS" <${process.env.EMAIL_USER}>`,
  to: toEmail,
  subject,
  html: htmlBodyFinal,
  attachments,
});

    console.log(`[Email] ✅ Sent to ${toEmail} | messageId: ${info.messageId}`);
    return true;

  } catch (sendErr) {
    // FIX: expanded error logging with actionable hints per error type
    if (sendErr.code === 'EAUTH' || sendErr.responseCode === 535) {
      console.error('[Email] ❌ AUTH FAILED – check EMAIL_USER / EMAIL_PASS in .env');
      console.error('[Email] ❌ Gmail requires an App Password (not your login password).');
      console.error('[Email] ❌ Generate one at: https://myaccount.google.com/apppasswords');
    } else if (sendErr.code === 'ECONNECTION' || sendErr.code === 'ENOTFOUND') {
      console.error('[Email] ❌ NETWORK ERROR – cannot reach Gmail SMTP. Check internet/firewall.');
    } else {
      console.error(`[Email] ❌ Send failed to ${toEmail}:`, sendErr.message);
    }
    // Return false so callers know it failed but registration flow is not broken
    return false;
  }
}

module.exports = sendEmail;