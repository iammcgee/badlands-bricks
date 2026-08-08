import { Resend } from "resend";

export async function sendNotificationEmail(options: {
  subject: string;
  text: string;
  to?: string | string[];
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const to =
    options.to || process.env.CONTACT_TO_EMAIL || "info@badlandsbricks.com";

  if (!apiKey) {
    console.info("[email skipped — no RESEND_API_KEY]", options.subject, to);
    return { skipped: true as const };
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: "Badlands Bricks <onboarding@resend.dev>",
    to,
    subject: options.subject,
    text: options.text,
  });

  return { skipped: false as const };
}
