import { NextResponse } from "next/server";
import { isStaffRole } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { id } = await params;
  const comment = await prisma.productComment.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const canDelete =
    comment.userId === session.user.id || isStaffRole(session.user.role);
  if (!canDelete) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  await prisma.productComment.delete({ where: { id: comment.id } });
  return NextResponse.json({ ok: true });
}
