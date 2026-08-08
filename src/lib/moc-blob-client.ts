"use client";

import { upload } from "@vercel/blob/client";
import { formatBytes, MOC_UPLOAD_LIMIT_BYTES } from "@/lib/file-size";
import type { MocMediaItem } from "@/lib/moc-builder";
import { normalizeMocImageFile } from "@/lib/moc-builder";

async function uploadOne(file: File, folder: string) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (file.size > MOC_UPLOAD_LIMIT_BYTES) {
    throw new Error(
      `"${file.name}" is ${formatBytes(file.size)} (limit ${formatBytes(MOC_UPLOAD_LIMIT_BYTES)}). Rebuild the PDF or use fewer/smaller photos.`,
    );
  }
  try {
    const blob = await upload(`moc-submissions/${folder}/${safeName}`, file, {
      access: "public",
      handleUploadUrl: "/api/moc-blob/upload",
      // Avoid the ~20MB single-put ceiling on some Blob plans/tokens.
      multipart: true,
    });
    return blob.url;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/too large|greater than|maximumSizeInBytes|413/i.test(message)) {
      throw new Error(
        `"${file.name}" is ${formatBytes(file.size)} and was rejected by storage (limit ${formatBytes(MOC_UPLOAD_LIMIT_BYTES)}). Rebuild the PDF or remove some photos.`,
      );
    }
    throw error instanceof Error ? error : new Error(message);
  }
}

export async function uploadMocAssets(input: {
  photos: MocMediaItem[];
  steps: MocMediaItem[];
  pdfBlob: Blob;
  mocName: string;
  onProgress?: (label: string) => void;
}) {
  const stamp = Date.now().toString();
  const photoUrls: string[] = [];
  for (let i = 0; i < input.photos.length; i += 1) {
    input.onProgress?.(
      `Preparing photo ${i + 1} of ${input.photos.length}…`,
    );
    const jpeg = await normalizeMocImageFile(input.photos[i].file);
    const named = new File(
      [jpeg],
      `photo-${String(i + 1).padStart(2, "0")}-${jpeg.name}`,
      { type: "image/jpeg" },
    );
    input.onProgress?.(
      `Uploading photo ${i + 1} of ${input.photos.length} (${formatBytes(named.size)})…`,
    );
    photoUrls.push(await uploadOne(named, `${stamp}/photos`));
  }

  const instructionUrls: string[] = [];
  for (let i = 0; i < input.steps.length; i += 1) {
    input.onProgress?.(
      `Preparing step ${i + 1} of ${input.steps.length}…`,
    );
    const jpeg = await normalizeMocImageFile(input.steps[i].file);
    const named = new File(
      [jpeg],
      `step-${String(i + 1).padStart(2, "0")}-${jpeg.name}`,
      { type: "image/jpeg" },
    );
    input.onProgress?.(
      `Uploading step ${i + 1} of ${input.steps.length} (${formatBytes(named.size)})…`,
    );
    instructionUrls.push(await uploadOne(named, `${stamp}/instructions`));
  }

  const pdfName = `${input.mocName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "moc"}-instructions.pdf`;
  const pdfFile = new File([input.pdfBlob], pdfName, {
    type: "application/pdf",
  });
  input.onProgress?.(
    `Uploading instructions PDF (${formatBytes(pdfFile.size)})…`,
  );
  const pdfUrl = await uploadOne(pdfFile, `${stamp}/pdf`);

  return { photoUrls, instructionUrls, pdfUrl };
}
