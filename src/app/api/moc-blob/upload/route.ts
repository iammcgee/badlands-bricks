import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/admin";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await auth();
        const admin = await getAdminAccess();
        if (!session?.user?.id && !admin) {
          throw new Error("Not authenticated");
        }

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "application/pdf",
          ],
          addRandomSuffix: true,
          maximumSizeInBytes: 20 * 1024 * 1024,
          tokenPayload: JSON.stringify({
            userId: session?.user?.id ?? admin?.userId ?? null,
            admin: Boolean(admin),
          }),
        };
      },
      onUploadCompleted: async () => {
        // Submission metadata is saved later by /api/submit-moc.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
