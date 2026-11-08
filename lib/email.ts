import 'server-only';

import { createTransport, type SendMailOptions, type Transporter } from 'nodemailer';

export type EmailSendResult = { ok: true } | { ok: false; error: string };

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const isDevelopment = process.env.NODE_ENV === 'development';

let smtpTransporter: Transporter | null = null;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Lazily creates and caches the SMTP transporter. */
function getSmtpTransporter(): Transporter | null {
  if (smtpTransporter) return smtpTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  smtpTransporter = createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return smtpTransporter;
}

/** Logs the email content to stdout so developers can preview it in development. */
function logEmail(opts: SendEmailOptions): void {
  console.log('[email] Development mode — email preview:');
  console.log(`  To: ${opts.to}`);
  console.log(
    `  From: ${process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM || 'noreply@citgroup.example'}`
  );
  console.log(`  Subject: ${opts.subject}`);
  console.log(`  Text: ${opts.text}`);
}

/** Primary transport: Resend HTTP API. */
async function sendViaResend(opts: SendEmailOptions): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    return { ok: false, error: 'Resend is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { ok: false, error: `Resend API responded ${response.status}: ${body}` };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: `Resend request failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/** Fallback transport: SMTP via nodemailer. */
async function sendViaSmtp(opts: SendEmailOptions): Promise<EmailSendResult> {
  const fromEmail = process.env.SMTP_FROM;
  const fromName = process.env.SMTP_FROM_NAME;

  const transporter = getSmtpTransporter();
  if (!transporter) {
    return { ok: false, error: 'SMTP is not fully configured (SMTP_HOST, SMTP_USER, SMTP_PASS)' };
  }

  const mailOptions: SendMailOptions = {
    from: fromName ? { name: fromName, address: fromEmail } : fromEmail,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: `SMTP send failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Sends an email through the best available transport.
 *
 * In development, the email content is always logged to the console so the
 * developer can preview reset links and invitation codes. If SMTP is
 * configured, the email is also sent for real.
 *
 * In production, Resend is tried first, then SMTP. Failures are reported in
 * the result and never thrown — callers decide whether an email failure is
 * fatal.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<EmailSendResult> {
  // Always log in development so developers can preview email content.
  if (isDevelopment) {
    logEmail(opts);

    // Attempt real delivery if SMTP is configured.
    const smtp = await sendViaSmtp(opts);
    if (smtp.ok) {
      return smtp;
    }
    return { ok: true }; // logged successfully, even if SMTP not configured
  }

  // Production: Resend first, then SMTP fallback.
  const resend = await sendViaResend(opts);
  if (resend.ok) return resend;

  console.warn('[email] Resend transport failed, trying SMTP:', resend.error);

  const smtp = await sendViaSmtp(opts);
  if (smtp.ok) return smtp;

  console.error('[email] All email transports failed:', smtp.error);
  return { ok: false, error: `Resend: ${resend.error}; SMTP: ${smtp.error}` };
}

/**
 * Sends a password reset email. Returns `true` when the email was handed to a
 * transport (or logged in development). A failure is logged internally and
 * returns `false` — it must never block the password reset flow.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const subject = 'Reset your password';
  const text = [
    'You requested a password reset for your CitGroup Tenancy account.',
    '',
    `Reset link: ${resetUrl}`,
    '',
    'This link expires in 24 hours.',
    "If you didn't request this reset, you can safely ignore this email.",
  ].join('\n');

  const html = `
    <p>You requested a password reset for your CitGroup Tenancy account.</p>
    <p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p>
    <p>This link expires in 24 hours.</p>
    <p>If you didn't request this reset, you can safely ignore this email.</p>
  `.trim();

  const result = await sendEmail({ to, subject, html, text });
  if (!result.ok) {
    console.error('[email] Password reset email failed:', result.error);
  }
  return result.ok;
}

/**
 * Sends a member invitation email with a temporary password. Returns `true`
 * when the email was handed to a transport (or logged in development). A
 * failure is logged internally and returns `false` — it must never block the
 * invitation flow.
 */
export async function sendInvitationEmail(
  to: string,
  subdomain: string,
  temporaryPassword: string,
  inviteUrl: string
): Promise<boolean> {
  const safeSubdomain = escapeHtml(subdomain);
  const subject = `You're invited to join ${safeSubdomain}`;
  const text = [
    `You've been invited to join the ${subdomain} tenant on CitGroup Tenancy.`,
    '',
    `Log in: ${inviteUrl}`,
    '',
    `Your temporary password is: ${temporaryPassword}`,
    'Please change your password after signing in.',
  ].join('\n');

  const html = `
    <p>You've been invited to join the <strong>${safeSubdomain}</strong> tenant on CitGroup Tenancy.</p>
    <p><a href="${escapeHtml(inviteUrl)}">Log in</a></p>
    <p>Your temporary password is: <strong>${escapeHtml(temporaryPassword)}</strong></p>
    <p>Please change your password after signing in.</p>
  `.trim();

  const result = await sendEmail({ to, subject, html, text });
  if (!result.ok) {
    console.error('[email] Invitation email failed:', result.error);
  }
  return result.ok;
}
