export type MocMediaItem = {
  id: string;
  file: File;
  previewUrl: string;
};

export function createMediaItems(fileList: FileList | File[]): MocMediaItem[] {
  return Array.from(fileList)
    .filter((file) => file.type.startsWith("image/"))
    .map((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
}

export function revokeMediaItems(items: MocMediaItem[]) {
  for (const item of items) {
    URL.revokeObjectURL(item.previewUrl);
  }
}

export function moveMediaItem(
  items: MocMediaItem[],
  fromIndex: number,
  toIndex: number,
): MocMediaItem[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

/** Convert any browser-decodable image to JPEG bytes for PDF embedding. */
export async function fileToJpegBytes(
  file: File,
  maxEdge = 1600,
  quality = 0.85,
): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not process image");
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) throw new Error("Could not encode image");
  return new Uint8Array(await blob.arrayBuffer());
}

export async function buildInstructionsPdf(options: {
  mocName: string;
  builderName: string;
  steps: MocMediaItem[];
}): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);

  // Cover page
  {
    const page = pdf.addPage([612, 792]);
    const { width, height } = page.getSize();
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0, 0, 0),
    });
    page.drawText("BADLANDS BRICKS", {
      x: 48,
      y: height - 72,
      size: 18,
      font,
      color: rgb(1, 0.45, 0.1),
    });
    page.drawText(options.mocName || "Custom MOC", {
      x: 48,
      y: height / 2 + 20,
      size: 28,
      font,
      color: rgb(1, 1, 1),
      maxWidth: width - 96,
    });
    page.drawText(`Building instructions by ${options.builderName || "Builder"}`, {
      x: 48,
      y: height / 2 - 20,
      size: 14,
      font: fontRegular,
      color: rgb(0.75, 0.75, 0.75),
      maxWidth: width - 96,
    });
    page.drawText(`${options.steps.length} steps`, {
      x: 48,
      y: 64,
      size: 12,
      font: fontRegular,
      color: rgb(0.6, 0.6, 0.6),
    });
  }

  for (let index = 0; index < options.steps.length; index += 1) {
    const step = options.steps[index];
    const jpeg = await fileToJpegBytes(step.file);
    const image = await pdf.embedJpg(jpeg);
    const pageWidth = 612;
    const pageHeight = 792;
    const page = pdf.addPage([pageWidth, pageHeight]);

    const header = 56;
    const footer = 40;
    const margin = 36;
    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - header - footer;
    const scale = Math.min(maxW / image.width, maxH / image.height);
    const drawW = image.width * scale;
    const drawH = image.height * scale;
    const x = (pageWidth - drawW) / 2;
    const y = footer + (maxH - drawH) / 2;

    page.drawText(`STEP ${index + 1}`, {
      x: margin,
      y: pageHeight - 36,
      size: 14,
      font,
      color: rgb(1, 0.45, 0.1),
    });
    page.drawText(options.mocName || "MOC", {
      x: margin + 90,
      y: pageHeight - 36,
      size: 12,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
      maxWidth: pageWidth - margin * 2 - 90,
    });
    page.drawImage(image, { x, y, width: drawW, height: drawH });
    page.drawText(`${index + 1} / ${options.steps.length}`, {
      x: margin,
      y: 18,
      size: 10,
      font: fontRegular,
      color: rgb(0.45, 0.45, 0.45),
    });
  }

  const bytes = await pdf.save();
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
}
