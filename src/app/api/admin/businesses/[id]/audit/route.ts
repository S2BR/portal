import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";

import type { AdminAuditPage } from "../types";

const EMPTY: AdminAuditPage = {
  data: [],
  meta: { current_page: 1, last_page: 1, total: 0 },
};

/** BFF: the audit trail for a business (operator actions, newest first). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const page = new URL(request.url).searchParams.get("page");
  const suffix =
    page && page !== "1" ? `?page=${encodeURIComponent(page)}` : "";

  const response = await callWithAuth<AdminAuditPage>({
    method: "GET",
    path: `/admin/businesses/${encodeURIComponent(id)}/audit${suffix}`,
  });

  if (response.ok) {
    return NextResponse.json({
      data: response.data.data,
      meta: response.data.meta,
    });
  }
  return NextResponse.json(EMPTY, {
    status: response.status === 403 ? 403 : 502,
  });
}
