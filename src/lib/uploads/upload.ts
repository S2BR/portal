export interface SignedUpload {
  url: string;
  headers: Record<string, string>;
  key: string;
}

export interface UploadOutcome<T> {
  ok: boolean;
  data?: T;
  /** Where it failed: minting the url, the S3 PUT, or the confirm step. */
  error?: "url" | "s3" | "attach";
}

export interface UploadOptions {
  onProgress?: (percent: number) => void;
  /**
   * Coarse stage of the upload: `uploading` while the file streams to S3, `finalizing` during
   * the confirm round-trip (when progress is already at 100% but there's still work to do).
   */
  onPhase?: (phase: "uploading" | "finalizing") => void;
  signal?: AbortSignal;
  /**
   * Target for a scoped upload kind (e.g. `{ business: slug }` for a business logo). Passed
   * through to the API's upload type; user-scoped kinds like the avatar omit it.
   */
  context?: Record<string, unknown>;
}

/**
 * Upload a file for an upload type, direct to S3: mint a presigned PUT url from the BFF, PUT
 * the file straight to S3 (with progress — the file never touches our server), then confirm
 * it. Returns the confirm payload (e.g. `{ user }`). Reusable for every upload type.
 */
export async function uploadFile<T = unknown>(
  type: string,
  file: File,
  options: UploadOptions = {},
): Promise<UploadOutcome<T>> {
  const urlResponse = await fetch(`/api/uploads/${type}/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content_type: file.type,
      ...(options.context ? { context: options.context } : {}),
    }),
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
  const attachResponse = await fetch(`/api/uploads/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: signed.key,
      ...(options.context ? { context: options.context } : {}),
    }),
  });
  if (!attachResponse.ok) {
    return { ok: false, error: "attach" };
  }
  return { ok: true, data: (await attachResponse.json()) as T };
}

/**
 * Remove the current object of an upload type. Pass `context` for scoped kinds (e.g.
 * `{ business: slug }`, or `{ business: slug, image: id }` to drop one gallery image); the
 * avatar and other user-scoped kinds omit it. Returns the type's remove payload.
 */
export async function removeUpload<T = unknown>(
  type: string,
  context?: Record<string, unknown>,
): Promise<{ ok: boolean; data?: T }> {
  const response = await fetch(`/api/uploads/${type}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: context ? JSON.stringify({ context }) : undefined,
  });
  if (!response.ok) {
    return { ok: false };
  }
  return { ok: true, data: (await response.json()) as T };
}

/** PUT the file straight to the presigned S3 url. XHR, not fetch, for upload progress. */
export function putToS3(
  signed: SignedUpload,
  file: File,
  options: UploadOptions,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signed.url);
    // The presigned signature pins the content type; send it back so it matches.
    xhr.setRequestHeader("Content-Type", file.type);
    for (const [name, value] of Object.entries(signed.headers ?? {})) {
      const lower = name.toLowerCase();
      // Host is a forbidden header (browser ignores it); Content-Type is set above.
      if (lower !== "host" && lower !== "content-type") {
        xhr.setRequestHeader(name, value);
      }
    }

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        options.onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 responded ${xhr.status}`));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("S3 request failed")));
    xhr.addEventListener("abort", () => reject(new Error("aborted")));
    options.signal?.addEventListener("abort", () => xhr.abort());

    xhr.send(file);
  });
}
