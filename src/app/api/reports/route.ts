import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";
import { REPORT_REASONS } from "@/lib/report-reasons";

const bodySchema = z.object({
  type: z.string().min(1),
  id: z.string().min(1),
  reason: z.enum(REPORT_REASONS),
  details: z.string().max(2000).nullish(),
});

/** BFF: submit an abuse report against any reportable resource. Signed-in users only (upstream). */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<{
    retry_after?: number | null;
    message?: string;
  }>({
    method: "POST",
    path: "/reports",
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json({ status: "reported" });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json(
    { status: "error" },
    { status: response.status === 404 ? 404 : 502 },
  );
}
