import { NextResponse } from "next/server";
import { z } from "zod";

import { callWithAuth } from "@/lib/api/authed";
import type { ApiError } from "@/lib/api/types";
import { clearSessionCookies } from "@/lib/auth/session";

const bodySchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    // `null` clears the preference (fall back to the device zone); a string sets it.
    timezone: z.string().min(1).nullable().optional(),
    // `YYYY-MM-DD`, or `null` to clear. The api validates the age (13+) and range.
    date_of_birth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    // One of the allowed gender values, or `null` to clear. The api re-validates the enum.
    gender: z
      .enum(["male", "female", "non_binary", "prefer_not_to_say"])
      .nullable()
      .optional(),
    // Display preferences. `null` clears (falls back to defaults); the api re-validates the enums.
    distance_unit: z.enum(["km", "mi"]).nullable().optional(),
    locale: z
      .enum(["en", "es", "fr-CA", "pt-BR", "ja", "it"])
      .nullable()
      .optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.timezone !== undefined ||
      value.date_of_birth !== undefined ||
      value.gender !== undefined ||
      value.distance_unit !== undefined ||
      value.locale !== undefined,
    { message: "empty" },
  );

/**
 * BFF: update the signed-in account's low-sensitivity profile fields — the
 * display name and the timezone preference. A partial PATCH: only the fields
 * sent are applied. Email and password have their own re-authenticated flows.
 */
export async function PATCH(request: Request): Promise<NextResponse> {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<ApiError>({
    method: "PATCH",
    path: "/account",
    body: parsed.data,
  });

  if (response.ok) {
    return NextResponse.json({ status: "ok" });
  }

  return NextResponse.json(
    {
      status: "invalid",
      message: response.data.message,
      errors: response.data.errors,
    },
    { status: 422 },
  );
}

const deleteSchema = z.object({ verification_token: z.string().min(1) });

/**
 * BFF: delete (soft-delete) the signed-in account. Password-gated by the api;
 * on success the account can no longer sign in and every session is revoked, so
 * the local session cookies are cleared too.
 */
export async function DELETE(request: Request): Promise<NextResponse> {
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ status: "invalid" }, { status: 422 });
  }

  const response = await callWithAuth<ApiError>({
    method: "DELETE",
    path: "/account",
    body: parsed.data,
  });

  if (response.ok) {
    await clearSessionCookies();
    return NextResponse.json({ status: "ok" });
  }

  return NextResponse.json(
    { status: "invalid", message: response.data.message },
    { status: 422 },
  );
}
