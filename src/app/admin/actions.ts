"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import {
  ADMIN_COOKIE,
  getAdminPassword,
  requireAdminAccess,
} from "@/lib/admin";
import { sendNotificationEmail } from "@/lib/email";
import { mocStatusLabel } from "@/lib/moc-review";
import {
  publishApprovedMocToBuild,
  unpublishMocFromBuild,
} from "@/lib/moc-publish";
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
  const priceRaw = String(formData.get("priceUsd") || "0").trim();
  const priceUsd = Number.parseFloat(priceRaw);
  const priceCents =
    Number.isFinite(priceUsd) && priceUsd >= 0
      ? Math.round(priceUsd * 100)
      : 0;

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

  let shopSlug: string | null = null;
  let publishFailed = false;
  try {
    if (nextStatus === "approved") {
      const product = await publishApprovedMocToBuild(submission, {
        priceCents,
      });
      shopSlug = product.slug;
    } else if (nextStatus === "denied" || nextStatus === "needs_changes") {
      await unpublishMocFromBuild(id);
    }
  } catch (error) {
    console.error("Failed to sync MOC to Build shop", error);
    publishFailed = true;
  }

  let emailed = false;
  if (sendEmail && submission.builderEmail) {
    const site =
      process.env.NEXT_PUBLIC_SITE_URL || "https://badlandsbricks.com";
    const shopLine =
      nextStatus === "approved" && shopSlug
        ? `It's live in Build: ${site}/build/${shopSlug}`
        : "";
    const result = await sendNotificationEmail({
      to: submission.builderEmail,
      subject: `Badlands Bricks MOC update: ${submission.mocName}`,
      text: [
        `Hi ${submission.builderName || "builder"},`,
        "",
        `Your MOC "${submission.mocName}" was reviewed.`,
        `Status: ${mocStatusLabel(nextStatus)}`,
        shopLine,
        "",
        "Notes from the Badlands Bricks team:",
        body,
        "",
        "Track it anytime here:",
        `${site}/my-mocs/${id}`,
        "",
        "Thanks for building with us!",
        "— Badlands Bricks",
      ]
        .filter(Boolean)
        .join("\n"),
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
  revalidatePath("/my-mocs");
  revalidatePath(`/my-mocs/${id}`);
  revalidatePath("/build");
  revalidatePath("/");
  if (shopSlug) revalidatePath(`/build/${shopSlug}`);
  const params = new URLSearchParams({ saved: "1" });
  if (shopSlug) {
    params.set("published", "1");
    params.set("slug", shopSlug);
  }
  if (publishFailed) params.set("error", "publish");
  if (sendEmail) params.set("emailed", emailed ? "1" : "0");
  redirect(`/admin/mocs/${id}?${params.toString()}`);
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
  revalidatePath("/admin/products");
  revalidatePath("/build");
  redirect("/admin/ops?saved=1");
}

export async function updateProductAction(formData: FormData) {
  try {
    await requireAdminAccess("reviewer");
  } catch {
    redirect("/admin?error=1");
  }

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const slugRaw = String(formData.get("slug") || "").trim().toLowerCase();
  const slug = slugRaw
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const description = String(formData.get("description") || "").trim();
  const youtubeRaw = String(formData.get("youtubeUrl") || "").trim();
  const creatorId = String(formData.get("creatorId") || "").trim();
  const priceUsd = Number.parseFloat(String(formData.get("priceUsd") || "0"));
  const isActive = formData.get("isActive") === "on";

  if (!id || !name || !slug || !description || !creatorId || !Number.isFinite(priceUsd) || priceUsd < 0) {
    redirect(`/admin/products/${id || ""}?error=invalid`);
  }

  const { isValidYoutubeUrl, normalizeYoutubeUrl } = await import("@/lib/youtube");
  if (!isValidYoutubeUrl(youtubeRaw)) {
    redirect(`/admin/products/${id}?error=youtube`);
  }

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) redirect("/admin/products?error=missing");

  const slugTaken = await prisma.product.findFirst({
    where: { slug, NOT: { id } },
    select: { id: true },
  });
  if (slugTaken) {
    redirect(`/admin/products/${id}?error=slug`);
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      name,
      slug,
      description,
      youtubeUrl: normalizeYoutubeUrl(youtubeRaw),
      creatorId,
      priceCents: Math.round(priceUsd * 100),
      isActive,
    },
  });

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/admin/ops");
  revalidatePath("/build");
  revalidatePath(`/build/${existing.slug}`);
  revalidatePath(`/build/${updated.slug}`);
  revalidatePath("/");
  redirect("/admin/products?saved=1");
}

export async function deleteProductAction(formData: FormData) {
  try {
    await requireAdminAccess("reviewer");
  } catch {
    redirect("/admin?error=1");
  }

  const id = String(formData.get("id") || "");
  const confirmed = formData.get("confirm") === "on";
  if (!id || !confirmed) redirect("/admin/products");

  const product = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { orderItems: true } } },
  });
  if (!product) redirect("/admin/products?error=missing");

  if (product._count.orderItems > 0) {
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    revalidatePath("/build");
    revalidatePath(`/build/${product.slug}`);
    revalidatePath("/");
    redirect("/admin/products?error=orders");
  }

  await prisma.product.delete({ where: { id } });

  revalidatePath("/admin/products");
  revalidatePath("/admin/ops");
  revalidatePath("/build");
  revalidatePath(`/build/${product.slug}`);
  revalidatePath("/");
  redirect("/admin/products?deleted=1");
}

export async function resetUserPasswordAction(formData: FormData) {
  try {
    await requireAdminAccess("admin");
  } catch {
    redirect("/admin/team?error=forbidden");
  }

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || password.length < 6) {
    redirect("/admin/team?error=invalid");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    redirect("/admin/team?error=notfound");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  revalidatePath("/admin/team");
  redirect("/admin/team?passwordReset=1");
}

export async function deleteUserAccountAction(formData: FormData) {
  try {
    await requireAdminAccess("admin");
  } catch {
    redirect("/admin/team?error=forbidden");
  }

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  if (!email) {
    redirect("/admin/team?error=invalid");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    redirect("/admin/team?error=notfound");
  }

  await prisma.user.delete({ where: { id: user.id } });

  revalidatePath("/admin/team");
  redirect("/admin/team?deleted=1");
}
