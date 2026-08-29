import { BrandDetail } from "@/components/admin/brands/brand-detail";

export default async function AdminBrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <BrandDetail id={id} />;
}
