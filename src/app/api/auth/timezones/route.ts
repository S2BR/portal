import { NextResponse } from "next/server";

import { callWithAuth } from "@/lib/api/authed";
import { flattenCollection, type JsonApiCollection } from "@/lib/api/types";

/** A selectable timezone: its IANA id, current UTC offset, and display label. */
export interface Timezone {
  id: string;
  offset: string;
  label: string;
}

type TimezoneAttributes = Omit<Timezone, "id">;

/**
 * BFF: the selectable IANA timezones for the account's timezone preference,
 * flattened from the api's JSON:API collection to `{ id, offset, label }`.
 */
export async function GET(): Promise<NextResponse> {
  const response = await callWithAuth<JsonApiCollection<TimezoneAttributes>>({
    path: "/timezones",
  });

  if (!response.ok) {
    return NextResponse.json({ timezones: [] }, { status: 502 });
  }

  return NextResponse.json({ timezones: flattenCollection(response.data) });
}
