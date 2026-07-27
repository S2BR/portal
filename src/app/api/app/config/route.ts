import { NextResponse } from "next/server";

import { getAppConfig } from "@/lib/api/app-config";

/**
 * BFF: expose the portal's public app config to client components (e.g. the OTP
 * digit count). `getAppConfig` is resilient and falls back to safe defaults.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(await getAppConfig());
}
