import 'server-only';

export type EmailSendResult = { ok: true } | { ok: false; error: string };

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const isDevelopment = process.env.NODE_ENV === 'development';
const nodemailerPkg = 'nodemailer';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Logs the email content to stdout so developers can preview it in development. */
function logEmail(opts: SendEmailOptions): void {
  console.log('[email] Development mode — email would be sent:');
  console.log(`  To: ${opts.to}`);
  console.log(`  From: ${process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM || 'noreply@citgroup.example'}`);
  console.log(`  Subject: ${opts.subject}`);
  console.log(`  Text: ${opts.text}`);
  console.log(`  HTML: ${opts.html}`);
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

/** Fallback transport: SMTP via nodemailer (only when the package is installed). */
async function sendViaSmtp(opts: SendEmailOptions): Promise<EmailSendResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const fromEmail = process.env.SMTP_FROM;
  const fromName = process.env.SMTP_FROM_NAME;

  if (!host || !user || !pass || !fromEmail) {
    return { ok: false, error: 'SMTP is not fully configured' };
  }

  let transport: { sendMail: (mail: unknown) => Promise<unknown> } | null = null;
  try {
    // The specifier is a variable so TypeScript does not require the module to
    // resolve and bundlers do not statically resolve it. When nodemailer is not
    // installed the dynamic import throws at runtime and we fall back below.
    const nm = (await import(nodemailerPkg)) as {
      createTransport: (options: unknown) => { sendMail: (mail: unknown) => Promise<unknown> };
    };
    transport = nm.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  } catch {
    return { ok: false, error: 'nodemailer is not installed' };
  }

  if (!transport) {
    return { ok: false, error: 'nodemailer is not installed' };
  }

  try {
    await transport.sendMail({
      from: fromName ? { name: fromName, address: fromEmail } : fromEmail,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
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
 * Resend is tried first, then SMTP (nodemailer). When neither transport is
 * configured or available the content is logged to the console. In
 * development the content is always logged instead of being sent, so
 * developers can preview emails without a real transport.
 *
 * Failures are reported in the result and never thrown — callers decide
 * whether an email failure is fatal.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<EmailSendResult> {
  if (isDevelopment) {
    logEmail(opts);
    return { ok: true };
  }

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
