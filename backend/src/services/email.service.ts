// Email service — MVP/dev implementation
// In development, logs the email to console (pino).
// Swap the body of sendPasswordResetEmail for a real provider (nodemailer, SendGrid, etc.)
// without changing callers.

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

export function sendPasswordResetEmail(email: string, rawToken: string): void {
  const resetUrl = `${FRONTEND_URL}/reset-password/${rawToken}`;

  // Use pino if available (imported dynamically to avoid hard dependency),
  // otherwise fall back to console.log
  try {
    // Dynamic import to avoid requiring pino in frontend bundles
    // In backend, pino is configured in server.ts — we log directly
    console.log(
      JSON.stringify({
        level: "info",
        msg: "Password reset email (dev)",
        email,
        resetUrl,
      }),
    );
  } catch {
    console.log(`[DEV EMAIL] To: ${email} — Reset link: ${resetUrl}`);
  }
}
