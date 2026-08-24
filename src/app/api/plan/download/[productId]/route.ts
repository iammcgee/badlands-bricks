import { auth } from "@/lib/auth";
import { userHasPlanAccess } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { streamProductDownload } from "@/lib/product-file";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Sign in required", { status: 401 });
  }

  const hasAccess = await userHasPlanAccess(session.user.id);
  if (!hasAccess) {
    return new Response("Active Badlands Plan required", { status: 403 });
  }

  const { productId } = await context.params;
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      isActive: true,
      includedInPlan: true,
    },
  });

  if (!product?.downloadFilePath) {
    return new Response("Build not available in the plan", { status: 404 });
  }

  return streamProductDownload(product.downloadFilePath);
}
