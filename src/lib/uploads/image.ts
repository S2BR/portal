export interface NormalizeOptions {
  /** Cap the largest side at this many pixels (only ever downscales). */
  maxSize?: number;
  /** Output mime type — must be one the avatar endpoint accepts. */
  type?: string;
  /** Encoder quality for lossy types (0–1). */
  quality?: number;
}

/** A crop rectangle in the source image's natural pixels. */
export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
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

  const bitmap = await loadBitmap(file);
  if (!bitmap) {
    return file;
  }

  try {
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const blob = await encode(
      width,
      height,
      (context) => context.drawImage(bitmap, 0, 0, width, height),
      type,
      quality,
    );
    return blob ? new File([blob], renameFor(file.name, type), { type }) : file;
  } finally {
    bitmap.close();
  }
}

/**
 * Crop a square region out of the source and re-encode it (same EXIF-stripping, downscaling
 * path as {@link normalizeImage}). `crop` is in the source's natural pixels. Falls back to the
 * original file if the browser can't decode it here.
 */
export async function cropImage(
  file: File,
  crop: PixelCrop,
  options: NormalizeOptions = {},
): Promise<File> {
  const { maxSize, type, quality } = { ...DEFAULTS, ...options };

  const bitmap = await loadBitmap(file);
  if (!bitmap) {
    return file;
  }

  try {
    const out = Math.max(1, Math.min(maxSize, Math.round(crop.width)));
    const blob = await encode(
      out,
      out,
      (context) =>
        context.drawImage(
          bitmap,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          out,
          out,
        ),
      type,
      quality,
    );
    return blob ? new File([blob], renameFor(file.name, type), { type }) : file;
  } finally {
    bitmap.close();
  }
}

/** Decode a file to a bitmap with EXIF orientation baked in; null if unsupported here. */
async function loadBitmap(file: File): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== "function") {
    return null;
  }
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
}

/** Draw onto an offscreen canvas of the given size and encode it to a blob; null if canvas is unavailable. */
async function encode(
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
  type: string,
  quality: number,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }
  draw(context);
  return new Promise((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

/** Swap the extension to match the re-encoded type (e.g. `photo.heic` → `photo.webp`). */
function renameFor(name: string, type: string): string {
  const stem = name.replace(/\.[^./\\]+$/, "");
  const extension =
    type === "image/png" ? ".png" : type === "image/jpeg" ? ".jpg" : ".webp";
  return `${stem || "avatar"}${extension}`;
}
