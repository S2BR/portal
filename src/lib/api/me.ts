import "server-only";

import { callWithAuth } from "./authed";
import {
  flattenResource,
  type AuthUser,
  type JsonApiDocument,
  type UserAttributes,
} from "./types";

/** The authenticated user, or `null` when there is no valid session. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const response = await callWithAuth<JsonApiDocument<UserAttributes>>({
    path: "/account",
  });
  return response.ok ? flattenResource(response.data.data) : null;
}
