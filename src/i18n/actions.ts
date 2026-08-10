"use server";

import { cookies } from "next/headers";

import {
  DIRECTION_COOKIE,
  isDirection,
  isLocale,
  LOCALE_COOKIE,
  type Direction,
  type Locale,
} from "./config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Persist the visitor's chosen locale in a cookie (server-side). */
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) {
    return;
  }
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
}

/** Persist the visitor's chosen text direction in a cookie (server-side). */
export async function setDirection(direction: Direction): Promise<void> {
  if (!isDirection(direction)) {
    return;
  }
  (await cookies()).set(DIRECTION_COOKIE, direction, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
}
