import { FiltersShowcase } from "@/components/admin/filters-showcase";

// Gated + hidden: lives under the admin layout (super-admin session or 404) and is not linked in nav.
export default function FilterShowcasePage() {
  return <FiltersShowcase />;
}
