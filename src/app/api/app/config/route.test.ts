import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/app-config", () => ({ getAppConfig: vi.fn() }));

import { getAppConfig } from "@/lib/api/app-config";
import type { AppConfig } from "@/lib/api/types";

import { GET } from "./route";

const config: AppConfig = {
  auth_mode: "in_app_only",
  deep_link_email_login: false,
  require_login_otp: true,
  require_email_verification: true,
  captcha: { register: true, login: true },
  password: { min: 10, mixed_case: true, numbers: true, symbols: true },
  otp: { length: 6, ttl: 900, resend_cooldown: 60 },
  hosted_auth: { register_url: "", login_url: "", forgot_url: "" },
  config_url: null,
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/app/config", () => {
  it("returns the portal app config (including the OTP length)", async () => {
    vi.mocked(getAppConfig).mockResolvedValue(config);

    const res = await GET();
    const body = (await res.json()) as AppConfig;

    expect(res.status).toBe(200);
    expect(body.otp.length).toBe(6);
  });
});
