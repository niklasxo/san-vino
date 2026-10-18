/**
 * Bildvorbereitung vor dem Upload – datensparsam:
 *  - Dateityp & Größe prüfen
 *  - Ausrichtung (EXIF-Orientation) anwenden
 *  - auf max. 2048 px verkleinern und als JPEG neu kodieren
 *    → dabei werden ALLE Metadaten (inkl. GPS-Standort) entfernt
 */
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const MAX_INPUT_BYTES = 30 * 1024 * 1024;
export const MAX_OUTPUT_BYTES = 4.5 * 1024 * 1024;
const MAX_EDGE = 2048;

export class ImageError extends Error {
  constructor(public reason: "type" | "too_large" | "decode") {
    super(reason);
  }
}

export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
  previewUrl: string;
}

export function validateImageFile(file: File) {
  const typeOk = ACCEPTED_TYPES.includes(file.type) || (!file.type && /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name));
  if (!typeOk) throw new ImageError("type");
  if (file.size > MAX_INPUT_BYTES) throw new ImageError("too_large");
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ("createImageBitmap" in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* Fallback unten */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    // Moderne Browser wenden die EXIF-Ausrichtung beim Zeichnen automatisch an.
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageError("decode");
  }
}

function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new ImageError("decode"))), "image/jpeg", quality),
  );
}

export function targetSize(width: number, height: number, maxEdge = MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  validateImageFile(file);
  const decoded = await decode(file);
  try {
    let edge = MAX_EDGE;
    let quality = 0.86;
    for (let attempt = 0; attempt < 4; attempt++) {
      const { width, height } = targetSize(decoded.width, decoded.height, edge);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new ImageError("decode");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(decoded.source, 0, 0, width, height);
      const blob = await encode(canvas, quality);
      if (blob.size <= MAX_OUTPUT_BYTES || attempt === 3) {
        return { blob, width, height, previewUrl: URL.createObjectURL(blob) };
      }
      quality -= 0.08;
      edge = Math.round(edge * 0.8);
    }
    throw new ImageError("decode");
  } finally {
    decoded.close();
  }
}
