import { createReadStream, existsSync, statSync } from "fs";
import { basename, join } from "path";
import { Readable } from "stream";

/** Stream a product instruction PDF from Blob URL or local product-files/. */
export async function streamProductDownload(
  relativePath: string,
): Promise<Response> {
  if (/^https?:\/\//i.test(relativePath)) {
    const upstream = await fetch(relativePath);
    if (!upstream.ok || !upstream.body) {
      return new Response("File missing upstream", { status: 404 });
    }
    const filename =
      basename(new URL(relativePath).pathname) || "instructions.pdf";
    return new Response(upstream.body, {
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") || "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const filename = basename(relativePath);
  const absolutePath = join(
    /* turbopackIgnore: true */ process.cwd(),
    "product-files",
    filename,
  );
  if (!existsSync(absolutePath)) {
    return new Response("File missing on server", { status: 404 });
  }

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
