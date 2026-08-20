import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stageUpload, upload } from "./upload";

/** An XMLHttpRequest stand-in that emits progress then a load with `status`, and returns an ETag. */
class MockXhr {
  static status = 200;
  static etag = '"etag-abc"';
  static calls: MockXhr[] = [];

  status = 0;
  method = "";
  url = "";
  sent: unknown;
  private listeners: Record<string, (event: unknown) => void> = {};
  private responseHeaders: Record<string, string> = { ETag: MockXhr.etag };
  upload = {
    listeners: {} as Record<string, (event: unknown) => void>,
    addEventListener(type: string, cb: (event: unknown) => void) {
      this.listeners[type] = cb;
    },
  };

  constructor() {
    MockXhr.calls.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader() {}

  getResponseHeader(name: string): string | null {
    return this.responseHeaders[name] ?? null;
  }

  addEventListener(type: string, cb: (event: unknown) => void) {
    this.listeners[type] = cb;
  }

  send(body: unknown) {
    this.sent = body;
    this.upload.listeners.progress?.({
      lengthComputable: true,
      loaded: 50,
      total: 100,
    });
    this.upload.listeners.progress?.({
      lengthComputable: true,
      loaded: 100,
      total: 100,
    });
    this.status = MockXhr.status;
    this.listeners.load?.({});
  }

  abort() {
    this.listeners.abort?.({});
  }
}

const postPlan = {
  mode: "post" as const,
  upload: "abc123",
  key: "tmp/x.jpg",
  url: "https://s2br.s3.amazonaws.com",
  fields: { key: "avatars/tmp/x.jpg", Policy: "p", "X-Amz-Signature": "s" },
};

const multipartPlan = {
  mode: "multipart" as const,
  upload: "big456",
  key: "tmp/big.mp4",
  upload_id: "s3-upload-1",
  part_size: 3,
  parts: [
    { number: 1, url: "https://s2br.s3.amazonaws.com/part-1" },
    { number: 2, url: "https://s2br.s3.amazonaws.com/part-2" },
  ],
};

function jsonResponse(ok: boolean, data: unknown) {
  return { ok, json: async () => data } as unknown as Response;
}

function imageFile() {
  return new File(["binary"], "avatar.jpg", { type: "image/jpeg" });
}

beforeEach(() => {
  MockXhr.status = 200;
  MockXhr.calls = [];
  vi.stubGlobal("XMLHttpRequest", MockXhr);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("upload (POST plan)", () => {
  it("plans, POSTs to S3 with progress, then confirms", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(true, postPlan))
      .mockResolvedValueOnce(jsonResponse(true, { user: { id: 1 } }));
    vi.stubGlobal("fetch", fetchMock);

    const progress: number[] = [];
    const phases: string[] = [];
    const result = await upload("avatar", imageFile(), {
      onProgress: (percent) => progress.push(percent),
      onPhase: (phase) => phases.push(phase),
    });

    expect(result).toEqual({ ok: true, data: { user: { id: 1 } } });
    expect(progress).toEqual([50, 100]);
    expect(phases).toEqual(["uploading", "finalizing"]);

    // One POST straight to the presigned S3 url, carrying the signed fields + the file (last).
    expect(MockXhr.calls).toHaveLength(1);
    expect(MockXhr.calls[0]?.method).toBe("POST");
    expect(MockXhr.calls[0]?.url).toBe(postPlan.url);
    const form = MockXhr.calls[0]?.sent as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(form.get("Policy")).toBe("p");
    expect(form.get("file")).toBeInstanceOf(File);

    // BFF calls: plan (with size) then confirm-by-id.
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/uploads/avatar/plan");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      content_type: "image/jpeg",
      size: 6,
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/uploads/avatar/confirm");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      upload: "abc123",
    });
  });

  it("fails at the plan step without touching S3", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(false, {}));
    vi.stubGlobal("fetch", fetchMock);

    const result = await upload("avatar", imageFile());

    expect(result).toEqual({ ok: false, error: "plan" });
    expect(MockXhr.calls).toHaveLength(0);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("reports an S3 failure and never confirms", async () => {
    MockXhr.status = 403;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(true, postPlan));
    vi.stubGlobal("fetch", fetchMock);

    const result = await upload("avatar", imageFile());

    expect(result).toEqual({ ok: false, error: "s3" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("reports a confirm failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(true, postPlan))
      .mockResolvedValueOnce(jsonResponse(false, {}));
    vi.stubGlobal("fetch", fetchMock);

    const result = await upload("avatar", imageFile());

    expect(result).toEqual({ ok: false, error: "confirm" });
  });
});

describe("upload (multipart plan)", () => {
  it("PUTs each part, collects ETags, then confirms with the parts", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(true, multipartPlan))
      .mockResolvedValueOnce(jsonResponse(true, { user: { id: 2 } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await upload("avatar", imageFile());

    expect(result).toEqual({ ok: true, data: { user: { id: 2 } } });

    // One PUT per part, straight to each presigned part url.
    expect(MockXhr.calls).toHaveLength(2);
    expect(MockXhr.calls.map((c) => c.method)).toEqual(["PUT", "PUT"]);
    expect(MockXhr.calls.map((c) => c.url)).toEqual([
      "https://s2br.s3.amazonaws.com/part-1",
      "https://s2br.s3.amazonaws.com/part-2",
    ]);

    // Confirm carries the assembled parts (number + ETag).
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/uploads/avatar/confirm");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      upload: "big456",
      parts: [
        { number: 1, etag: '"etag-abc"' },
        { number: 2, etag: '"etag-abc"' },
      ],
    });
  });
});

describe("stageUpload", () => {
  it("plans + uploads but does NOT confirm, returning the ledger id", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(true, postPlan));
    vi.stubGlobal("fetch", fetchMock);

    const result = await stageUpload("claim-proof", imageFile(), {
      context: { type: "business", id: "acme" },
    });

    expect(result).toEqual({ ok: true, upload: "abc123", key: "tmp/x.jpg" });
    // Only the plan call — no confirm.
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/uploads/claim-proof/plan");
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      content_type: "image/jpeg",
      size: 6,
      context: { type: "business", id: "acme" },
    });
  });

  it("fails at the plan step", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(false, {}));
    vi.stubGlobal("fetch", fetchMock);

    const result = await stageUpload("claim-proof", imageFile());

    expect(result).toEqual({ ok: false, error: "plan" });
    expect(MockXhr.calls).toHaveLength(0);
  });
});
