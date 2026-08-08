"use client";

import { upload } from "@vercel/blob/client";
import type { MocMediaItem } from "@/lib/moc-builder";

async function uploadOne(file: File, folder: string) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blob = await upload(`moc-submissions/${folder}/${safeName}`, file, {
    access: "public",
    handleUploadUrl: "/api/moc-blob/upload",
  });
  return blob.url;
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
      `Uploading photo ${i + 1} of ${input.photos.length}…`,
    );
    const item = input.photos[i];
    const named = new File(
      [item.file],
      `photo-${String(i + 1).padStart(2, "0")}-${item.file.name}`,
      { type: item.file.type },
    );
    photoUrls.push(await uploadOne(named, `${stamp}/photos`));
  }

  const instructionUrls: string[] = [];
  for (let i = 0; i < input.steps.length; i += 1) {
    input.onProgress?.(
      `Uploading step ${i + 1} of ${input.steps.length}…`,
    );
    const item = input.steps[i];
    const named = new File(
      [item.file],
      `step-${String(i + 1).padStart(2, "0")}-${item.file.name}`,
      { type: item.file.type },
    );
    instructionUrls.push(await uploadOne(named, `${stamp}/instructions`));
  }

  input.onProgress?.("Uploading instructions PDF…");
  const pdfName = `${input.mocName.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "moc"}-instructions.pdf`;
  const pdfFile = new File([input.pdfBlob], pdfName, {
    type: "application/pdf",
  });
  const pdfUrl = await uploadOne(pdfFile, `${stamp}/pdf`);

  return { photoUrls, instructionUrls, pdfUrl };
}
