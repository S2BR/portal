import { Globe, Mail, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { AddressLines } from "@/components/address/address-lines";
import {
  socialDisplay,
  socialLabel,
} from "@/components/business/business-constants";
import { flagEmoji, formatPhone } from "@/components/business/phone-format";
import { PublicProductCard } from "@/components/business/public/business-catalog";
import { PhotoGallery } from "@/components/business/public/photo-gallery";
import { ProfileMap } from "@/components/business/public/profile-map";
import { ProfileReviews } from "@/components/business/public/profile-reviews";
import { SocialIcon } from "@/components/business/social-icon";
import { ReportDialog } from "@/components/moderation/report-dialog";
import { PreviewRail } from "@/components/ui/preview-rail";
import { formatBusinessAddress } from "@/lib/format-address";
import { externalHref } from "@/lib/url";

import type {
  PublicBusiness,
  PublicCatalogItem,
  PublicReviewsPage,
} from "@/lib/public-business";

/**
 * The Overview body of a business's public profile — everything BELOW the shared header (banner, logo,
 * identity, actions), which the business layout renders and persists across the tabs. This is the
 * "Overview" tab: about, amenities, a highlighted-products strip, the reviews block, the photo gallery,
 * and the info sidebar (hours / location / contact).
 */
export async function BusinessProfile({
  business,
  products,
  reviews,
  locale,
}: {
  business: PublicBusiness;
  products: PublicCatalogItem[];
  reviews: PublicReviewsPage;
  locale: string;
}) {
  const t = await getTranslations("businesses.public");
  const reportT = await getTranslations("moderation.report");

  const main =
    business.addresses.find((address) => address.is_main) ??
    business.addresses[0];
  const phones = business.contacts.filter((c) => c.type === "phone");
  const emails = business.contacts.filter((c) => c.type === "email");
  const websites = business.contacts.filter((c) => c.type === "website");
  // The profile shows only highlighted products; the full catalog lives on the products page.
  const featured = products.filter((product) => product.is_featured);

  // Right-edge scroll-spy rail over the main sections (in DOM order); desktop-only.
  const railItems = [
    ...(business.description ? [{ id: "about", label: t("about") }] : []),
    ...(products.length > 0 ? [{ id: "products", label: t("products") }] : []),
    { id: "reviews", label: t("reviews.title") },
    ...(business.images.length > 0
      ? [{ id: "photos", label: t("photos") }]
      : []),
  ];

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-8">
          {business.description ? (
            <section id="about" className="scroll-mt-24">
              <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {t("about")}
              </h2>
              <p className="mt-3 max-w-prose leading-relaxed whitespace-pre-wrap">
                {business.description}
              </p>
            </section>
          ) : null}

          {business.amenities.length > 0 ? (
            <section>
              <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {t("amenities")}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {business.amenities.map((amenity) => (
                  <span
                    key={amenity.id}
                    className="bg-muted rounded-lg border px-3 py-1.5 text-sm"
                  >
                    {amenity.name}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {products.length > 0 ? (
            <section id="products" className="scroll-mt-24">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  {t("products")}
                </h2>
                <Link
                  href={`/businesses/${business.slug}/products`}
                  className="text-primary text-xs font-medium hover:underline"
                >
                  {t("seeAllProducts")}
                </Link>
              </div>
              {featured.length === 0 ? (
                <p className="text-muted-foreground mt-2 text-sm">
                  {t("browseProducts")}
                </p>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {featured.map((product) => (
                  <PublicProductCard
                    key={product.id}
                    product={product}
                    locale={locale}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <div id="reviews" className="scroll-mt-24">
            <ProfileReviews
              slug={business.slug}
              reviews={reviews}
              locale={locale}
            />
          </div>

          {business.images.length > 0 ? (
            <section id="photos" className="scroll-mt-24">
              <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {t("photos")}
              </h2>
              <PhotoGallery images={business.images} name={business.name} />
            </section>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {main ? (
            <div className="bg-muted/40 rounded-2xl p-5">
              <h2 className="mb-3 text-sm font-semibold">{t("location")}</h2>
              {main.latitude !== null && main.longitude !== null ? (
                <div className="mb-3">
                  <ProfileMap
                    latitude={main.latitude}
                    longitude={main.longitude}
                    label={business.name}
                  />
                </div>
              ) : null}
              <AddressLines lines={formatBusinessAddress(main, locale)} />
            </div>
          ) : null}

          {phones.length +
            emails.length +
            websites.length +
            business.socials.length >
          0 ? (
            <div className="bg-muted/40 rounded-2xl p-5">
              <h2 className="mb-3 text-sm font-semibold">{t("contact")}</h2>
              <ul className="space-y-2.5 text-sm">
                {phones.map((phone) => (
                  <li key={phone.id} className="flex items-center gap-3">
                    <Phone className="text-muted-foreground size-4 shrink-0" />
                    <a href={`tel:${phone.value}`} className="hover:underline">
                      {phone.meta?.country
                        ? `${flagEmoji(phone.meta.country)} `
                        : ""}
                      {formatPhone(phone.value, phone.meta?.country)}
                    </a>
                  </li>
                ))}
                {emails.map((email) => (
                  <li key={email.id} className="flex items-center gap-3">
                    <Mail className="text-muted-foreground size-4 shrink-0" />
                    <a
                      href={`mailto:${email.value}`}
                      className="break-all hover:underline"
                    >
                      {email.value}
                    </a>
                  </li>
                ))}
                {websites.map((website) => (
                  <li key={website.id} className="flex items-center gap-3">
                    <Globe className="text-muted-foreground size-4 shrink-0" />
                    <a
                      href={externalHref(website.value)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all hover:underline"
                    >
                      {website.value.replace(/^https?:\/\//, "")}
                    </a>
                  </li>
                ))}
                {business.socials.map((social) => (
                  <li key={social.id} className="flex items-center gap-3">
                    <SocialIcon
                      platform={social.platform}
                      className="text-muted-foreground size-4"
                    />
                    <a
                      href={socialDisplay(social.platform, social.handle)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {socialLabel(social.platform)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <ReportDialog
          type="business"
          id={business.id}
          label={reportT("reportBusiness")}
        />
      </div>

      {railItems.length > 1 ? <PreviewRail items={railItems} /> : null}
    </>
  );
}
