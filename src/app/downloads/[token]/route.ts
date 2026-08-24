import { prisma } from "@/lib/prisma";
import { streamProductDownload } from "@/lib/product-file";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;

  const record = await prisma.downloadToken.findUnique({
    where: { token },
    include: { orderItem: { include: { product: true, order: true } } },
  });

  if (!record) {
    return new Response("Download not found", { status: 404 });
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return new Response("Download link expired", { status: 410 });
  }

  const orderStatus = record.orderItem.order.status;
  if (orderStatus !== "paid" && orderStatus !== "fulfilled") {
    return new Response("Order not paid", { status: 403 });
  }

  const relativePath = record.orderItem.product.downloadFilePath;
  if (!relativePath) {
    return new Response("No file available", { status: 404 });
  }

  await prisma.downloadToken.update({
    where: { id: record.id },
    data: { downloadCount: { increment: 1 } },
  });

  await prisma.order.update({
    where: { id: record.orderItem.orderId },
    data: { status: "fulfilled" },
  });

  return streamProductDownload(relativePath);
}
