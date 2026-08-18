import { AdminBusinessEditor } from "@/components/admin/admin-business-editor";

export default async function AdminBusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminBusinessEditor id={id} />;
}
