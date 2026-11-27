import { auth } from "@/lib/auth";
import { isStaffRole } from "@/lib/admin";
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!user) {
    return new Response("Sign in required", { status: 401 });
  }

  const isStaff = isStaffRole(user.role);
  const hasPlanAccess = isStaff
    ? true
    : await userHasPlanAccess(session.user.id);
  if (!hasPlanAccess) {
    return new Response("Active Badlands Plan required", { status: 403 });
  }

  const { productId } = await context.params;
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      isActive: true,
      // Staff may download any live design; members only get plan exclusives.
      ...(isStaff ? {} : { includedInPlan: true }),
    },
  });

  if (!product?.downloadFilePath) {
    return new Response(
      isStaff ? "Instructions file not available" : "Build not available in the plan",
      { status: 404 },
    );
  }

  return streamProductDownload(product.downloadFilePath);
}
