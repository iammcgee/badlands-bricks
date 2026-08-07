import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  productId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  try {
    const { productId } = schema.parse(await request.json());
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId,
        },
      },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      const favoriteCount = await prisma.favorite.count({ where: { productId } });
      return NextResponse.json({ favorited: false, favoriteCount });
    }

    await prisma.favorite.create({
      data: {
        userId: session.user.id,
        productId,
      },
    });
    const favoriteCount = await prisma.favorite.count({ where: { productId } });
    return NextResponse.json({ favorited: true, favoriteCount });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Favorite failed" }, { status: 500 });
  }
}
