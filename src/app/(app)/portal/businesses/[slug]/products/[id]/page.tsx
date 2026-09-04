import { OwnerProductDetail } from "@/components/business/products/owner-product-detail";

/** One product the business carries — price, currency, and offering status. */
export default async function BusinessProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  return <OwnerProductDetail businessSlug={slug} id={id} />;
}
