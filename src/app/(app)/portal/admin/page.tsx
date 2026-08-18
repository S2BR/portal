import { redirect } from "next/navigation";

/** The admin area opens on the moderation queue (its only surface for now). */
export default function AdminIndexPage() {
  redirect("/portal/admin/reports");
}
