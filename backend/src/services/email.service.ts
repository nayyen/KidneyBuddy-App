// Email service — Resend integration with a dev-safe console fallback.
//
// When RESEND_API_KEY is set, sendPasswordResetEmail sends a real email via
// Resend's API. When unset (e.g. local dev without a key configured),
// it falls back to console-logging the reset URL and never throws — so
// local development never crashes just because no key is configured.
//
// `sender` is dependency-injected (defaulting to the real Resend-backed
// implementation) so this is unit-testable without any live network call —
// tests pass a fake sender/spy. RESEND_API_KEY / RESEND_FROM_EMAIL are read
// at call time (not module load) so tests can toggle them freely.

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

export interface ResendSendParams {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type ResendSender = (params: ResendSendParams) => Promise<unknown>;

/**
 * Real Resend-backed sender. The `resend` package is imported lazily inside
 * the function (not at module top-level) so importing email.service.ts never
 * requires RESEND_API_KEY to be set — only actually calling this function
 * (the RESEND_API_KEY-is-set path) does.
 */
async function realResendSender(params: ResendSendParams): Promise<unknown> {
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  return resend.emails.send(params);
}

export async function sendPasswordResetEmail(
  email: string,
  rawToken: string,
  sender: ResendSender = realResendSender,
): Promise<void> {
  const resetUrl = `${FRONTEND_URL}/reset-password/${rawToken}`;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Dev-safe fallback — never throw; local dev without a key must keep working.
    console.log(
      JSON.stringify({
        level: "info",
        msg: "Password reset email (dev fallback, no RESEND_API_KEY set)",
        email,
        resetUrl,
      }),
    );
    return;
  }

  const fromEmail =
    process.env.RESEND_FROM_EMAIL ?? "KidneyBuddy <onboarding@resend.dev>";
  const subject = "Atur Ulang Password KidneyBuddy";

  await sender({
    from: fromEmail,
    to: email,
    subject,
    html: `<p>Kami menerima permintaan untuk mengatur ulang password akun KidneyBuddy Anda.</p><p>Klik tautan berikut untuk melanjutkan:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Tautan ini berlaku selama 1 jam. Jika Anda tidak meminta ini, abaikan email ini.</p>`,
    text: `Kami menerima permintaan untuk mengatur ulang password akun KidneyBuddy Anda. Klik tautan berikut untuk melanjutkan: ${resetUrl} (berlaku selama 1 jam). Jika Anda tidak meminta ini, abaikan email ini.`,
  });
}
