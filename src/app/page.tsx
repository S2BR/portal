import { cookies } from "next/headers";

import { MarketingHome } from "@/components/marketing/marketing-home";
import { SocialHome } from "@/components/social/social-home";
import { REFRESH_COOKIE } from "@/lib/auth/cookies";

/**
 * Facebook-style home: the same `/` URL serves the public landing to logged-out visitors and the
 * social network to logged-in ones. We branch on the refresh-cookie's presence; the social home's
 * current-user context still verifies the real session and redirects to /login if it's dead.
 */
export default async function HomePage() {
  const authenticated = (await cookies()).has(REFRESH_COOKIE);
  return authenticated ? <SocialHome /> : <MarketingHome />;
}
