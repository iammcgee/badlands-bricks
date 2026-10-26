import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  COMMENT_COOLDOWN_MS,
  COMMENT_MAX_LENGTH,
  COMMENT_MIN_LENGTH,
  commentAuthorSelect,
  toCommentView,
} from "@/lib/comments";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  productId: z.string().min(1),
  body: z
    .string()
    .trim()
    .min(COMMENT_MIN_LENGTH, "Comment cannot be empty")
    .max(COMMENT_MAX_LENGTH, `Comment must be ${COMMENT_MAX_LENGTH} characters or less`),
});

export async function GET(request: Request) {
  const productId = new URL(request.url).searchParams.get("productId")?.trim();
  if (!productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, isActive: true },
  });
  if (!product || !product.isActive) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const comments = await prisma.productComment.findMany({
    where: { productId },
    include: { user: { select: commentAuthorSelect } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ comments: comments.map(toCommentView) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  try {
    const { productId, body } = createSchema.parse(await request.json());
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true },
    });
    if (!product || !product.isActive) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const recent = await prisma.productComment.findFirst({
      where: {
        userId: session.user.id,
        createdAt: { gt: new Date(Date.now() - COMMENT_COOLDOWN_MS) },
      },
      select: { id: true },
    });
    if (recent) {
      return NextResponse.json(
        { error: "Please wait a few seconds before posting another comment." },
        { status: 429 },
      );
    }

    const comment = await prisma.productComment.create({
      data: {
        productId,
        userId: session.user.id,
        body,
      },
      include: { user: { select: commentAuthorSelect } },
    });

    return NextResponse.json({ comment: toCommentView(comment) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues[0]?.message || "Invalid request";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Comment failed" }, { status: 500 });
  }
}
