import { sendNotificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

function siteOrigin() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL || "https://badlandsbricks.com"
  ).replace(/\/$/, "");
}

export async function createAdminNotification(options: {
  type: string;
  title: string;
  body: string;
  href?: string;
  /** Also email the contact inbox (same path as contact form / MOC alerts). */
  email?: boolean;
}) {
  const notification = await prisma.adminNotification.create({
    data: {
      type: options.type,
      title: options.title,
      body: options.body,
      href: options.href ?? null,
    },
  });

  if (options.email !== false) {
    try {
      const link = options.href
        ? `${siteOrigin()}${options.href.startsWith("/") ? "" : "/"}${options.href}`
        : null;
      await sendNotificationEmail({
        subject: `[Admin] ${options.title}`,
        text: link ? `${options.body}\n\nOpen in admin: ${link}` : options.body,
      });
    } catch (error) {
      console.error("[admin notification email failed]", error);
    }
  }

  return notification;
}

export async function notifyNewUserSignup(user: {
  name: string;
  email: string;
}) {
  return createAdminNotification({
    type: "new_user",
    title: `New account: ${user.name}`,
    body: `${user.name} (${user.email}) just signed up for Badlands Bricks.`,
    href: "/admin/team",
  });
}
