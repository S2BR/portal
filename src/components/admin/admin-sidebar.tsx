"use client";

import {
  BadgeCheck,
  Boxes,
  Building2,
  Flag,
  ImageIcon,
  LayoutGrid,
  Package,
  ShieldCheck,
  Tag,
  Tags,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { useCurrentUser } from "@/components/auth/current-user";
import {
  SectionedSidebar,
  type SidebarGroup,
} from "@/components/nav/sectioned-sidebar";

type LeafKey =
  | "reports"
  | "claims"
  | "businesses"
  | "products"
  | "brands"
  | "families"
  | "taxonomy"
  | "uploads";

type GroupKey = "catalog" | "moderation" | "directory" | "media";

type LeafDef = { key: LeafKey; href: string; icon: LucideIcon; requiredRoles?: string[] };
type GroupDef = { key: GroupKey; icon: LucideIcon; items: LeafDef[] };

// The admin sections, grouped like the portal--6 Filament clusters. `requiredRoles` gates a page to
// specific admin roles; a group with no visible pages drops out entirely.
const GROUPS: GroupDef[] = [
  {
    key: "catalog",
    icon: LayoutGrid,
    items: [
      { key: "products", href: "/portal/admin/products", icon: Package },
      { key: "brands", href: "/portal/admin/brands", icon: Tag },
      { key: "families", href: "/portal/admin/families", icon: Boxes },
      { key: "taxonomy", href: "/portal/admin/taxonomy", icon: Tags },
    ],
  },
  {
    key: "moderation",
    icon: ShieldCheck,
    items: [
      { key: "reports", href: "/portal/admin/reports", icon: Flag },
      { key: "claims", href: "/portal/admin/claims", icon: BadgeCheck },
    ],
  },
  {
    key: "directory",
    icon: Building2,
    items: [{ key: "businesses", href: "/portal/admin/businesses", icon: Building2 }],
  },
  {
    key: "media",
    icon: ImageIcon,
    items: [{ key: "uploads", href: "/portal/admin/uploads", icon: ImageIcon }],
  },
];

/**
 * The platform admin rail — a two-level {@see SectionedSidebar}: a group rail (Catalog, Moderation,
 * Directory, Media) that reveals a second rail of pages for multi-item groups. Grouped like the
 * portal--6 Filament clusters; new admin surfaces slot into a group as they're built.
 */
export function AdminSidebar({ pathname }: { pathname?: string } = {}) {
  const t = useTranslations("admin");
  const { user } = useCurrentUser();
  const roles = user?.roles ?? [];

  const groups: SidebarGroup[] = GROUPS.map((group) => ({
    key: group.key,
    label: t(`groups.${group.key}`),
    icon: group.icon,
    items: group.items
      .filter(
        (leaf) =>
          !leaf.requiredRoles ||
          leaf.requiredRoles.some((role) => roles.includes(role)),
      )
      .map((leaf) => ({
        key: leaf.key,
        label: t(`nav.${leaf.key}`),
        href: leaf.href,
        icon: leaf.icon,
      })),
  })).filter((group) => group.items.length > 0);

  return (
    <SectionedSidebar
      title={t("title")}
      titleIcon={ShieldCheck}
      groups={groups}
      pathname={pathname}
    />
  );
}
