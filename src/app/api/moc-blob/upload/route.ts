import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/admin";
import { auth } from "@/lib/auth";
import { MOC_UPLOAD_LIMIT_BYTES } from "@/lib/file-size";

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
            "image/jpg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/heic",
            "image/heif",
            "application/pdf",
          ],
          addRandomSuffix: true,
          // Match roomy instruction PDFs (~30 steps). Images are compressed client-side first.
          maximumSizeInBytes: MOC_UPLOAD_LIMIT_BYTES,
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
