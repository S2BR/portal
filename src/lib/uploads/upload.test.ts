import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { uploadFile } from "./upload";

/** A synchronous XMLHttpRequest stand-in that emits progress then a load with `status`. */
class MockXhr {
  static status = 200;
  static last: MockXhr | undefined;

  status = 0;
  method = "";
  url = "";
  headers: Record<string, string> = {};
  sent: unknown;
  private listeners: Record<string, (event: unknown) => void> = {};
  upload = {
    listeners: {} as Record<string, (event: unknown) => void>,
    addEventListener(type: string, cb: (event: unknown) => void) {
      this.listeners[type] = cb;
    },
  };

  constructor() {
    MockXhr.last = this;
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(name: string, value: string) {
    this.headers[name] = value;
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

const signed = {
  url: "https://s2br.s3.amazonaws.com/avatars/1/x.jpg?sig=1",
  headers: { "Content-Type": "image/png", Host: "s3", "x-amz-meta-a": "b" },
  key: "1/x.jpg",
  max_bytes: 5 * 1024 * 1024,
  mime_types: ["image/jpeg", "image/png", "image/webp"],
};

function jsonResponse(ok: boolean, data: unknown) {
  return { ok, json: async () => data } as unknown as Response;
}

function imageFile() {
  return new File(["binary"], "avatar.jpg", { type: "image/jpeg" });
}

beforeEach(() => {
  MockXhr.status = 200;
  MockXhr.last = undefined;
  vi.stubGlobal("XMLHttpRequest", MockXhr);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("uploadFile", () => {
  it("signs, PUTs to S3 with progress, then confirms", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(true, signed))
      .mockResolvedValueOnce(jsonResponse(true, { user: { id: 1 } }));
    vi.stubGlobal("fetch", fetchMock);

    const progress: number[] = [];
    const phases: string[] = [];
    const result = await uploadFile("avatar", imageFile(), {
      onProgress: (percent) => progress.push(percent),
      onPhase: (phase) => phases.push(phase),
    });

    expect(result).toEqual({ ok: true, data: { user: { id: 1 } } });
    expect(progress).toEqual([50, 100]);
    // Phase advances to finalizing only after the PUT completes.
    expect(phases).toEqual(["uploading", "finalizing"]);

    // The PUT went straight to the presigned S3 url.
    expect(MockXhr.last?.method).toBe("PUT");
    expect(MockXhr.last?.url).toBe(signed.url);
    // Content-Type comes from the file; Host is never forwarded; other headers pass through.
    expect(MockXhr.last?.headers["Content-Type"]).toBe("image/jpeg");
    expect(MockXhr.last?.headers["x-amz-meta-a"]).toBe("b");
    expect(MockXhr.last?.headers).not.toHaveProperty("Host");

    // BFF calls: sign then confirm-by-key.
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/uploads/avatar/url");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/uploads/avatar");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      key: "1/x.jpg",
    });
  });

  it("fails at the url step without touching S3", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(false, {}));
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadFile("avatar", imageFile());

    expect(result).toEqual({ ok: false, error: "url" });
    expect(MockXhr.last).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("reports an S3 failure and never confirms", async () => {
    MockXhr.status = 403;
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(true, signed));
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadFile("avatar", imageFile());

    expect(result).toEqual({ ok: false, error: "s3" });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("reports a confirm failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(true, signed))
      .mockResolvedValueOnce(jsonResponse(false, {}));
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadFile("avatar", imageFile());

    expect(result).toEqual({ ok: false, error: "attach" });
  });
});
