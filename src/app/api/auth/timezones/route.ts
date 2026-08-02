import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";

/** A selectable timezone: its IANA id, current UTC offset, and display label. */
export interface Timezone {
  id: string;
  offset: string;
  label: string;
}

/** BFF: the selectable IANA timezones for the account's timezone preference. */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<{ timezones: Timezone[] }>({
    path: "/timezones",
  });

  if (!response.ok) {
    return NextResponse.json({ timezones: [] }, { status: 502 });
  }

  return NextResponse.json({ timezones: response.data.timezones });
}
