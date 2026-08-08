"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  getAdminPassword,
  requireAdminAccess,
} from "@/lib/admin";
import { sendNotificationEmail } from "@/lib/email";
import { mocStatusLabel } from "@/lib/moc-review";
import { prisma } from "@/lib/prisma";

export async function adminPasswordLoginAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  if (password !== getAdminPassword()) {
    redirect("/admin?error=1");
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, password, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  redirect("/admin");
}

export async function adminLogoutAction() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  // Leave the portal, but keep the normal site login session.
  redirect("/");
}

export async function reviewMocAction(formData: FormData) {
  let access;
  try {
    access = await requireAdminAccess("reviewer");
  } catch {
    redirect("/admin?error=1");
  }

  const id = String(formData.get("id") || "");
  const decision = String(formData.get("decision") || "");
  const body = String(formData.get("body") || "").trim();
  const sendEmail = formData.get("sendEmail") === "on";

  if (!id || !body) {
    redirect(`/admin/mocs/${id || ""}?error=missing`);
  }
  if (!["approved", "denied", "needs_changes", "note"].includes(decision)) {
    redirect(`/admin/mocs/${id}?error=decision`);
  }

  const submission = await prisma.mocSubmission.findUnique({ where: { id } });
  if (!submission) redirect("/admin/mocs");

  const nextStatus = decision === "note" ? submission.status : decision;

  const note = await prisma.mocReviewNote.create({
    data: {
      submissionId: id,
      authorUserId: access.userId ?? null,
      authorLabel: access.label,
      body,
      decision,
      emailed: false,
    },
  });

  await prisma.mocSubmission.update({
    where: { id },
    data: {
      status: nextStatus,
      reviewedAt: new Date(),
      reviewedByUserId: access.userId ?? null,
    },
  });

  let emailed = false;
  if (sendEmail && submission.builderEmail) {
    const result = await sendNotificationEmail({
      to: submission.builderEmail,
      subject: `Badlands Bricks MOC update: ${submission.mocName}`,
      text: [
        `Hi ${submission.builderName || "builder"},`,
        "",
        `Your MOC "${submission.mocName}" was reviewed.`,
        `Status: ${mocStatusLabel(nextStatus)}`,
        "",
        "Notes from the Badlands Bricks team:",
        body,
        "",
        "Thanks for building with us!",
        "— Badlands Bricks",
      ].join("\n"),
    });
    emailed = !result.skipped;
    if (emailed) {
      await prisma.mocReviewNote.update({
        where: { id: note.id },
        data: { emailed: true },
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/mocs");
  revalidatePath(`/admin/mocs/${id}`);
  redirect(
    `/admin/mocs/${id}?saved=1${sendEmail ? (emailed ? "&emailed=1" : "&emailed=0") : ""}`,
  );
}

export async function setStaffRoleAction(formData: FormData) {
  try {
    await requireAdminAccess("admin");
  } catch {
    redirect("/admin/team?error=forbidden");
  }

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const role = String(formData.get("role") || "reviewer");
  if (!email || !["admin", "reviewer", "user"].includes(role)) {
    redirect("/admin/team?error=invalid");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    redirect("/admin/team?error=notfound");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role },
  });

  revalidatePath("/admin/team");
  redirect("/admin/team?saved=1");
}

export async function assignCreatorAction(formData: FormData) {
  try {
    await requireAdminAccess("admin");
  } catch {
    redirect("/admin/ops?error=forbidden");
  }

  const productId = String(formData.get("productId") || "");
  const creatorId = String(formData.get("creatorId") || "");
  if (!productId || !creatorId) redirect("/admin/ops");

  await prisma.product.update({
    where: { id: productId },
    data: { creatorId },
  });

  revalidatePath("/admin/ops");
  revalidatePath("/build");
  redirect("/admin/ops?saved=1");
}
