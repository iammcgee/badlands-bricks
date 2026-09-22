import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_COMMENT_LENGTH = 2000;

const createSchema = z.object({
  productId: z.string().min(1),
  body: z.string().trim().min(1).max(MAX_COMMENT_LENGTH),
});

const deleteSchema = z.object({
  commentId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  try {
    const { productId, body } = createSchema.parse(await request.json());
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, slug: true, isActive: true },
    });
    if (!product || !product.isActive) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const comment = await prisma.productComment.create({
      data: {
        productId,
        userId: session.user.id,
        body,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarMime: true,
            updatedAt: true,
          },
        },
      },
    });

    revalidatePath(`/build/${product.slug}`);

    return NextResponse.json({
      comment: {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        userId: comment.userId,
        authorName: comment.user.name,
        authorImage: comment.user.avatarMime
          ? `/api/avatars/${comment.user.id}?v=${comment.user.updatedAt.getTime()}`
          : null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Comment must be 1–2000 characters" },
        { status: 400 },
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Could not post comment" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  try {
    const { commentId } = deleteSchema.parse(await request.json());
    const comment = await prisma.productComment.findUnique({
      where: { id: commentId },
      include: {
        product: { select: { slug: true } },
        user: { select: { id: true } },
      },
    });
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    const isAuthor = comment.userId === session.user.id;
    const isStaff =
      session.user.role === "admin" || session.user.role === "reviewer";
    if (!isAuthor && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.productComment.delete({ where: { id: commentId } });
    revalidatePath(`/build/${comment.product.slug}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json(
      { error: "Could not delete comment" },
      { status: 500 },
    );
  }
}
