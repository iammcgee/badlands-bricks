import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { put } from "@vercel/blob";

export function hasBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function uploadsRoot() {
  // Vercel's app filesystem is read-only; only /tmp is writable.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return join("/tmp", "badlands-uploads");
  }
  return join(process.cwd(), "uploads");
}

export async function saveMocFiles(files: File[], folder: string) {
  const paths: string[] = [];
  await mkdir(folder, { recursive: true });

  for (const file of files) {
    if (!file || file.size === 0) continue;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${Date.now()}-${randomBytes(4).toString("hex")}-${safeName}`;
    const absolute = join(folder, filename);
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(absolute, bytes);
    paths.push(absolute);
  }

  return paths;
}

export async function saveMocFilesToBlob(
  files: File[],
  prefix: string,
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    if (!file || file.size === 0) continue;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const pathname = `moc-submissions/${prefix}/${Date.now()}-${randomBytes(4).toString("hex")}-${safeName}`;
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
    });
    urls.push(blob.url);
  }
  return urls;
}

export function collectMocUploadFiles(form: FormData) {
  const photos = form.getAll("photos").filter((f): f is File => f instanceof File);
  const instructions = form
    .getAll("instructions")
    .filter((f): f is File => f instanceof File);
  const instructionPdf = form.get("instructionPdf");
  const pdfFile =
    instructionPdf instanceof File && instructionPdf.size > 0
      ? instructionPdf
      : null;

  return { photos, instructions, pdfFile };
}

export async function persistMocUploads(form: FormData) {
  const { photos, instructions, pdfFile } = collectMocUploadFiles(form);
  if (photos.length === 0 || instructions.length === 0) {
    return {
      error: "Please upload MOC photos and instruction step images" as const,
    };
  }

  const stamp = `${Date.now()}-${randomBytes(3).toString("hex")}`;

  if (hasBlobStorage()) {
    const photoPaths = await saveMocFilesToBlob(photos, `${stamp}/photos`);
    const instructionPaths = await saveMocFilesToBlob(
      instructions,
      `${stamp}/instructions`,
    );
    const pdfPaths = pdfFile
      ? await saveMocFilesToBlob([pdfFile], `${stamp}/pdf`)
      : [];
    return {
      photoPaths,
      instructionPaths,
      pdfPaths,
      instructionCount: instructions.length,
    };
  }

  const base = join(uploadsRoot(), "moc-submissions", stamp);
  const photoPaths = await saveMocFiles(photos, join(base, "photos"));
  const instructionPaths = await saveMocFiles(
    instructions,
    join(base, "instructions"),
  );
  const pdfPaths = pdfFile
    ? await saveMocFiles([pdfFile], join(base, "pdf"))
    : [];

  return {
    photoPaths,
    instructionPaths,
    pdfPaths,
    instructionCount: instructions.length,
  };
}

export function isRemoteMocPath(path: string) {
  return /^https?:\/\//i.test(path);
}
