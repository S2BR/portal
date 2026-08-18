import type { Business } from "@/app/api/businesses/route";
import type { AdminBusinessOwner } from "@/app/api/admin/businesses/route";

/**
 * A business as the admin editor reads it — the full owner shape (so the reused edit form works
 * unchanged) plus the admin-only facts the operator surface shows.
 */
export interface AdminBusiness extends Business {
  locked_reason: string | null;
  owners: AdminBusinessOwner[];
  is_deleted: boolean;
  deleted_at: string | null;
}

/** One audit-trail entry on a business. */
export interface AdminAuditEntry {
  id: number;
  action: string;
  actor: { name: string | null };
  changes: Record<string, unknown> | null;
  context: Record<string, unknown> | null;
  created_at: string | null;
}

export interface AdminAuditPage {
  data: AdminAuditEntry[];
  meta: { current_page: number; last_page: number; total: number };
}
