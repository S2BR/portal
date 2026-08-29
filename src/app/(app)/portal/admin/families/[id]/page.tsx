import { FamilyDetail } from "@/components/admin/families/family-detail";

export default async function AdminFamilyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <FamilyDetail id={id} />;
}
