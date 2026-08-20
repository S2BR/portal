/** An upload type's client-facing limits, from the API — the frontend hardcodes none of these. */
export interface UploadConfig {
  max_bytes: number;
  mime_types: string[];
  /** How many objects the target may hold, or null for a single-object kind (avatar, logo). */
  max_files: number | null;
  /** Chunk size (bytes) for a multipart upload, so the client slices from the same source of truth. */
  part_size: number;
}

/** A completed multipart part: its number and the `ETag` S3 returned for it. */
interface Part {
  number: number;
  etag: string;
}

/** The plan the API returns for a file, discriminated by `mode`. The client never branches on size. */
interface PostPlan {
  mode: "post";
  upload: string;
  key: string;
  /** The S3 endpoint the browser POSTs the form to. */
  url: string;
  /** The signed form fields (policy, signature, key, …) posted alongside the file. */
  fields: Record<string, string>;
}
interface MultipartPlan {
  mode: "multipart";
  upload: string;
  key: string;
  upload_id: string;
  part_size: number;
  /** One presigned `UploadPart` url per chunk, in order. */
  parts: { number: number; url: string }[];
}
type UploadPlan = PostPlan | MultipartPlan;

export interface UploadOutcome<T> {
  ok: boolean;
  data?: T;
  /** Where it failed: minting the plan, the S3 upload itself, or the confirm step. */
  error?: "plan" | "s3" | "confirm";
}

/** The result of staging an upload (plan + S3) without confirming — for confirm-elsewhere kinds. */
export interface StageOutcome {
  ok: boolean;
  /** The ledger id to reference later (e.g. as a claim proof), confirmed by whoever owns it. */
  upload?: string;
  key?: string;
  error?: "plan" | "s3";
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
 * Fetch an upload type's limits (accepted types, size cap, file-count cap, part size) from the API —
 * the source of truth — so the picker never hardcodes them and an API change applies with no
 * frontend edit. Returns null on any failure (the caller falls back to letting the API enforce).
 */
export async function fetchUploadConfig(
  type: string,
): Promise<UploadConfig | null> {
  try {
    const response = await fetch(`/api/uploads/${type}/config`);
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as UploadConfig;
  } catch {
    return null;
  }
}

/**
 * Upload a file for an upload type, direct to S3, and confirm it. One facade for every kind: ask the
 * API for a plan, run it (a single presigned POST, or a resumable multipart upload — the caller never
 * branches), then confirm. Returns the confirm payload (e.g. `{ user }`).
 */
export async function upload<T = unknown>(
  type: string,
  file: File,
  options: UploadOptions = {},
): Promise<UploadOutcome<T>> {
  const plan = await requestPlan(type, file, options);
  if (!plan) {
    return { ok: false, error: "plan" };
  }

  options.onPhase?.("uploading");
  let parts: Part[];
  try {
    parts = await sendToS3(plan, file, options);
  } catch {
    return { ok: false, error: "s3" };
  }

  options.onPhase?.("finalizing");
  return confirmUpload<T>(type, plan.upload, parts, options);
}

/**
 * Stage a file for an upload type whose object is confirmed ELSEWHERE — e.g. a claim proof, confirmed
 * when the claim is submitted. Asks for a plan and runs it (POST or multipart), then returns the
 * ledger `upload` id to reference; there is no confirm step here.
 */
export async function stageUpload(
  type: string,
  file: File,
  options: UploadOptions = {},
): Promise<StageOutcome> {
  const plan = await requestPlan(type, file, options);
  if (!plan) {
    return { ok: false, error: "plan" };
  }

  options.onPhase?.("uploading");
  try {
    await sendToS3(plan, file, options);
  } catch {
    return { ok: false, error: "s3" };
  }
  return { ok: true, upload: plan.upload, key: plan.key };
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

/** Ask the API for an upload plan for this file. Returns null on any non-OK response. */
async function requestPlan(
  type: string,
  file: File,
  options: UploadOptions,
): Promise<UploadPlan | null> {
  const response = await fetch(`/api/uploads/${type}/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content_type: file.type,
      size: file.size,
      ...(options.context ? { context: options.context } : {}),
    }),
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as UploadPlan;
}

/** Confirm a staged upload with the API, returning its payload. */
async function confirmUpload<T>(
  type: string,
  upload: string,
  parts: Part[],
  options: UploadOptions,
): Promise<UploadOutcome<T>> {
  const response = await fetch(`/api/uploads/${type}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      upload,
      ...(parts.length > 0 ? { parts } : {}),
      ...(options.context ? { context: options.context } : {}),
    }),
  });
  if (!response.ok) {
    return { ok: false, error: "confirm" };
  }
  return { ok: true, data: (await response.json()) as T };
}

/** Run a plan against S3: a single POST, or one PUT per multipart chunk (collecting ETags). */
function sendToS3(
  plan: UploadPlan,
  file: File,
  options: UploadOptions,
): Promise<Part[]> {
  if (plan.mode === "post") {
    return postToS3(plan, file, options).then(() => []);
  }
  return uploadParts(plan, file, options);
}

/**
 * POST the file to S3 as multipart/form-data. The signed `fields` go first and the file LAST (S3
 * requires it); S3's policy rejects an oversize or wrong-mime body at the edge. XHR, for progress.
 */
function postToS3(
  plan: PostPlan,
  file: File,
  options: UploadOptions,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const form = new FormData();
    for (const [name, value] of Object.entries(plan.fields)) {
      form.append(name, value);
    }
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", plan.url);
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

    xhr.send(form);
  });
}

/**
 * Upload a large file as S3 multipart: slice it into the plan's parts, PUT each to its presigned url
 * (in order), and collect the `ETag` S3 returns for each so the confirm step can assemble them.
 * Aggregate progress across parts. (The bucket must expose the `ETag` response header via CORS.)
 */
async function uploadParts(
  plan: MultipartPlan,
  file: File,
  options: UploadOptions,
): Promise<Part[]> {
  const parts: Part[] = [];
  const loadedByPart = new Map<number, number>();
  const report = () => {
    const loaded = [...loadedByPart.values()].reduce((sum, n) => sum + n, 0);
    options.onProgress?.(Math.round((loaded / file.size) * 100));
  };

  for (const part of plan.parts) {
    const start = (part.number - 1) * plan.part_size;
    const chunk = file.slice(start, Math.min(start + plan.part_size, file.size));
    const etag = await putPart(part.url, chunk, part.number, loadedByPart, report, options.signal);
    parts.push({ number: part.number, etag });
  }

  return parts;
}

/** PUT one multipart chunk to its presigned url and resolve with the object's `ETag`. */
function putPart(
  url: string,
  chunk: Blob,
  number: number,
  loadedByPart: Map<number, number>,
  report: () => void,
  signal: AbortSignal | undefined,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        loadedByPart.set(number, event.loaded);
        report();
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        loadedByPart.set(number, chunk.size);
        report();
        if (etag) {
          resolve(etag);
        } else {
          reject(new Error("S3 part response had no ETag"));
        }
      } else {
        reject(new Error(`S3 responded ${xhr.status}`));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("S3 request failed")));
    xhr.addEventListener("abort", () => reject(new Error("aborted")));
    signal?.addEventListener("abort", () => xhr.abort());

    xhr.send(chunk);
  });
}
