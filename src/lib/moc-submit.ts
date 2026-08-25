import { sendNotificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export async function createUserMocSubmission(input: {
  userId: string;
  builderName: string;
  builderEmail: string;
  mocName: string;
  theme: string;
  notes?: string | null;
  youtubeUrl?: string | null;
  requestedPriceCents?: number | null;
  photoPaths: string[];
  instructionPaths: string[];
  pdfPaths: string[];
  instructionCount: number;
}) {
  const submission = await prisma.mocSubmission.create({
    data: {
      mocName: input.mocName,
      theme: input.theme,
      builderName: input.builderName,
      builderEmail: input.builderEmail,
      submitterUserId: input.userId,
      notes: input.notes || null,
      youtubeUrl: input.youtubeUrl || null,
      requestedPriceCents:
        typeof input.requestedPriceCents === "number" &&
        input.requestedPriceCents > 0
          ? Math.round(input.requestedPriceCents)
          : null,
      photoPathsJson: JSON.stringify(input.photoPaths),
      instructionPathsJson: JSON.stringify([
        ...input.instructionPaths,
        ...input.pdfPaths,
      ]),
      status: "new",
    },
  });

  const priceLabel =
    submission.requestedPriceCents && submission.requestedPriceCents > 0
      ? `$${(submission.requestedPriceCents / 100).toFixed(2)} (sell request)`
      : "Free listing";

  await sendNotificationEmail({
    subject: `New MOC submission: ${input.mocName}`,
    text: `Builder: ${input.builderName} <${input.builderEmail}>\nTheme: ${input.theme}\nYouTube: ${input.youtubeUrl || "(none)"}\nRequested price: ${priceLabel}\nNotes: ${input.notes || "(none)"}\nPhotos: ${input.photoPaths.length}\nInstruction steps: ${input.instructionCount}\nPDF: ${input.pdfPaths[0] || "(none)"}\nSubmission ID: ${submission.id}\nReview: /admin/mocs/${submission.id}`,
  });

  await sendNotificationEmail({
    to: input.builderEmail,
    subject: `We got your MOC: ${input.mocName}`,
    text: [
      `Hi ${input.builderName},`,
      "",
      `Thanks for submitting "${input.mocName}" to Badlands Bricks.`,
      "Status: Pending review",
      "",
      "Track it anytime here:",
      `${process.env.NEXT_PUBLIC_SITE_URL || "https://badlandsbricks.com"}/my-mocs`,
      "",
      "We'll update you when it's approved, needs changes, or denied.",
      "",
      "— Badlands Bricks",
    ].join("\n"),
  });

  return submission;
}

export function parseUrlList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string =>
      typeof item === "string" && /^https?:\/\//i.test(item),
  );
}
