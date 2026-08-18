import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import { decodeUser, USER_COOKIE } from "@/lib/auth/user-cookie";

import { resolveLocale } from "./resolve";

// Neutral, deterministic fallback when we don't know the viewer's timezone (signed out, or an
// account that hasn't set one). Beats defaulting to whatever region the server happens to run in.
const DEFAULT_TIME_ZONE = "UTC";

export default getRequestConfig(async () => {
  const locale = await resolveLocale();

  // Format dates/times in the signed-in user's own timezone (from the display cookie), so a profile
  // timezone change is reflected everywhere `useFormatter()` renders a date — not the server's zone.
  const user = decodeUser((await cookies()).get(USER_COOKIE)?.value);

  return {
    locale,
    timeZone: user?.timezone ?? DEFAULT_TIME_ZONE,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
