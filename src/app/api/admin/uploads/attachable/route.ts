import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";

interface AttachableOption {
  value: string;
  label: string;
  type?: string;
}

/**
 * BFF: the autocomplete behind the uploads "Attached to" entity filter. Forwards `q` (search) or
 * `refs` (resolve saved labels) to the admin API, which enforces the super_admin role. Degrades to an
 * empty list on any blip so the picker stays usable.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const incoming = new URL(request.url).searchParams;
  const query = new URLSearchParams();
  for (const key of ["q", "refs"] as const) {
    const value = incoming.get(key);
    if (value) {
      query.set(key, value);
    }
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";

  const response = await callWithAuth<{ data: AttachableOption[] }>({
    method: "GET",
    path: `/admin/uploads/attachable${suffix}`,
  });

  if (response.ok) {
    return NextResponse.json({ data: response.data.data });
  }
  return NextResponse.json({ data: [] }, { status: response.status === 403 ? 403 : 502 });
}
