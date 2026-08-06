import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_DAYS = 30;

export async function createDownloadTokensForOrder(orderId: string) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    include: { product: true, downloadTokens: true },
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TOKEN_TTL_DAYS);

  const created = [];

  for (const item of items) {
    if (!item.product.downloadFilePath) continue;
    if (item.downloadTokens.length > 0) {
      created.push(...item.downloadTokens);
      continue;
    }

    const token = await prisma.downloadToken.create({
      data: {
        token: randomBytes(24).toString("hex"),
        orderItemId: item.id,
        expiresAt,
      },
      include: {
        orderItem: { include: { product: true } },
      },
    });
    created.push(token);
  }

  return created;
}

export async function getOrderDownloads(orderId: string) {
  const tokens = await prisma.downloadToken.findMany({
    where: { orderItem: { orderId } },
    include: { orderItem: { include: { product: true } } },
    orderBy: { createdAt: "asc" },
  });

  return tokens.map((token) => ({
    token: token.token,
    productName: token.orderItem.product.name,
    expiresAt: token.expiresAt,
    downloadCount: token.downloadCount,
  }));
}
