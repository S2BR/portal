import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";

/** A user's own claim and where it stands. */
export interface MyClaim {
  id: string;
  status: "pending" | "approved" | "rejected" | "auto_approved";
  method: "email_match" | "admin_review";
  business: { id: string; name: string; slug: string };
  created_at: string | null;
}

/** BFF: the signed-in user's own business ownership claims, newest first. */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<{ data: MyClaim[] }>({
    method: "GET",
    path: "/business-claims",
  });

  if (response.ok) {
    return NextResponse.json({ data: response.data.data ?? [] });
  }
  return NextResponse.json(
    { data: [] },
    { status: response.status === 401 ? 401 : 200 },
  );
}
