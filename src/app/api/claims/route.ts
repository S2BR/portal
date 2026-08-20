import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import { rateLimitedResponse } from "@/lib/api/rate-limit";

/** Where a claim points — a generic, polymorphic target (a business, a community, …). */
export interface ClaimTarget {
  type: string;
  id: string;
  label: string;
}

/** A user's own claim and where it stands. */
export interface MyClaim {
  id: string;
  status: "pending" | "approved" | "rejected" | "auto_approved";
  method: "email_match" | "admin_review";
  target: ClaimTarget;
  created_at: string | null;
}

const bodySchema = z.object({
  type: z.string().min(1).max(64),
  id: z.string().min(1).max(255),
  message: z.string().max(2000).nullish(),
  proof: z.array(z.string().max(1024)).max(6).optional(),
});

/**
 * BFF: submit a claim to own something (a business today, any claimable type tomorrow). Signed-in
 * users only (upstream). A verified email match is auto-approved by the API; otherwise the claim is
 * queued for review. Relays the created claim so the client can reflect its status.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<{
    data?: MyClaim;
    message?: string;
    errors?: Record<string, string[]>;
    retry_after?: number | null;
  }>({
    method: "POST",
    path: "/claims",
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok", claim: response.data.data });
  }
  if (response.status === 429) {
    return rateLimitedResponse(response);
  }
  return NextResponse.json(
    {
      status: "invalid",
      message: response.data.message,
      errors: response.data.errors,
    },
    { status: response.status === 422 ? 422 : 502 },
  );
}

/** BFF: the signed-in user's own ownership claims, newest first. */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<{ data: MyClaim[] }>({
    method: "GET",
    path: "/claims",
  });

  if (response.ok) {
    return NextResponse.json({ data: response.data.data ?? [] });
  }
  return NextResponse.json(
    { data: [] },
    { status: response.status === 401 ? 401 : 200 },
  );
}
