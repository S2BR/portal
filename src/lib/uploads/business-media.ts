import type { Business } from "@/app/api/businesses/route";
import {
  putToS3,
  type SignedUpload,
  type UploadOptions,
  type UploadOutcome,
} from "@/lib/uploads/upload";

export type BusinessMediaKind = "logo" | "banner" | "gallery";

type BusinessPayload = { business: Business };

/**
 * Upload a business image (logo, banner, or gallery) direct to S3: mint a presigned PUT from
 * the BFF, PUT the file straight to S3 (with progress — it never touches our server), then
 * confirm it. Returns the updated business. Mirrors {@link uploadFile} but scoped to a business
 * the caller owns plus a media slot.
 */
export async function uploadBusinessMedia(
  slug: string,
  kind: BusinessMediaKind,
  file: File,
  options: UploadOptions = {},
): Promise<UploadOutcome<BusinessPayload>> {
  const base = `/api/businesses/${encodeURIComponent(slug)}`;

  const urlResponse = await fetch(`${base}/media/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, content_type: file.type }),
  });
  if (!urlResponse.ok) {
    return { ok: false, error: "url" };
  }
  const signed = (await urlResponse.json()) as SignedUpload;

  options.onPhase?.("uploading");
  try {
    await putToS3(signed, file, options);
  } catch {
    return { ok: false, error: "s3" };
  }

  options.onPhase?.("finalizing");
  const attachResponse = await fetch(`${base}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, key: signed.key }),
  });
  if (!attachResponse.ok) {
    return { ok: false, error: "attach" };
  }
  return { ok: true, data: (await attachResponse.json()) as BusinessPayload };
}

/** Remove a business logo or banner. Returns the updated business, or null on failure. */
export async function removeBusinessMedia(
  slug: string,
  kind: "logo" | "banner",
): Promise<Business | null> {
  const response = await fetch(
    `/api/businesses/${encodeURIComponent(slug)}/media/${kind}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    return null;
  }
  return ((await response.json()) as BusinessPayload).business;
}

/** Remove a single gallery image by id. Returns the updated business, or null on failure. */
export async function removeBusinessGalleryImage(
  slug: string,
  imageId: number,
): Promise<Business | null> {
  const response = await fetch(
    `/api/businesses/${encodeURIComponent(slug)}/gallery/${imageId}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    return null;
  }
  return ((await response.json()) as BusinessPayload).business;
}
