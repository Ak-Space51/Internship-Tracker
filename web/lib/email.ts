import "server-only";

const FROM = process.env.ALERTS_FROM ?? "TrackInternships <alerts@resend.dev>";

export type SendResult =
  | { ok: true }
  | { ok: false; reason: "unconfigured" | "failed" };

/** Minimal Resend sender for transactional mail sent from the web app.
 *
 * The digest mailer lives in the Python scraper; this exists only for
 * confirmation emails, which have to go out at signup time. */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: "unconfigured" };

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!resp.ok) {
      console.error(`Resend ${resp.status}: ${await resp.text()}`);
      return { ok: false, reason: "failed" };
    }
    return { ok: true };
  } catch (err) {
    console.error("Resend request failed", err);
    return { ok: false, reason: "failed" };
  }
}

export function confirmationEmail(confirmUrl: string, siteUrl: string): string {
  return `
    <h2>Confirm your internship alerts</h2>
    <p>Someone (hopefully you) asked for new-internship digests from
    <a href="${siteUrl}">TrackInternships</a>.</p>
    <p><a href="${confirmUrl}">Confirm this address</a> to start receiving them.</p>
    <p style="color:#71717a;font-size:12px">If this wasn't you, ignore this email —
    nothing will be sent until the link above is used.</p>
  `;
}
