import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

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
    paths.push(
      absolute.replace(process.cwd() + "\\", "").replace(process.cwd() + "/", ""),
    );
  }

  return paths;
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

  const base = join(
    process.cwd(),
    "uploads",
    "moc-submissions",
    Date.now().toString(),
  );
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
