import { createReadStream, existsSync, statSync } from "fs";
import { basename, join } from "path";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";

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

  // Scope downloads to product-files/ so the bundler does not trace the whole repo.
  const filename = basename(relativePath);
  const absolutePath = join(
    /* turbopackIgnore: true */ process.cwd(),
    "product-files",
    filename,
  );
  if (!existsSync(absolutePath)) {
    return new Response("File missing on server", { status: 404 });
  }

  await prisma.downloadToken.update({
    where: { id: record.id },
    data: { downloadCount: { increment: 1 } },
  });

  await prisma.order.update({
    where: { id: record.orderItem.orderId },
    data: { status: "fulfilled" },
  });

  const stats = statSync(absolutePath);
  const stream = createReadStream(absolutePath);
  const webStream = Readable.toWeb(stream) as unknown as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(stats.size),
      "Content-Disposition": `attachment; filename="${basename(absolutePath)}"`,
    },
  });
}
