import { redirect } from "next/navigation";

/** The admin area opens on the dashboard. */
export default function AdminIndexPage() {
  redirect("/portal/admin/dashboard");
}
