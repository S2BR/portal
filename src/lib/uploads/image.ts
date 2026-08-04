export interface NormalizeOptions {
  /** Cap the largest side at this many pixels (only ever downscales). */
  maxSize?: number;
  /** Output mime type — must be one the avatar endpoint accepts. */
  type?: string;
  /** Encoder quality for lossy types (0–1). */
  quality?: number;
}

const DEFAULTS: Required<NormalizeOptions> = {
  maxSize: 512,
  type: "image/webp",
  quality: 0.85,
};

/**
 * Downscale + re-encode an image entirely in the browser before upload. Fixes EXIF
 * orientation, caps the largest side at `maxSize`, and re-encodes — which also strips all
 * metadata, including any EXIF GPS location the camera embedded. Returns a fresh File; if the
 * browser can't decode it here, returns the original untouched and lets the server validate.
 */
export async function normalizeImage(
  file: File,
  options: NormalizeOptions = {},
): Promise<File> {
  const { maxSize, type, quality } = { ...DEFAULTS, ...options };

  if (typeof createImageBitmap !== "function") {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, type, quality);
    });
    if (!blob) {
      return file;
    }

    return new File([blob], renameFor(file.name, type), { type });
  } finally {
    bitmap.close();
  }
}

/** Swap the extension to match the re-encoded type (e.g. `photo.heic` → `photo.webp`). */
function renameFor(name: string, type: string): string {
  const stem = name.replace(/\.[^./\\]+$/, "");
  const extension =
    type === "image/png" ? ".png" : type === "image/jpeg" ? ".jpg" : ".webp";
  return `${stem || "avatar"}${extension}`;
}
