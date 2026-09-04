import { afterEach, expect, it, vi } from "vitest";

vi.mock("@/lib/public-business", () => ({
  getPublicBusiness: vi.fn(),
  getPublicBusinessProducts: vi.fn(() => Promise.resolve([])),
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));
vi.mock("next-intl/server", () => ({ getLocale: () => Promise.resolve("en") }));
vi.mock("@/components/business/public/business-profile", () => ({
  BusinessProfile: () => null,
}));

import { getPublicBusiness } from "@/lib/public-business";

import PublicBusinessPage from "./page";

const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

afterEach(() => {
  vi.clearAllMocks();
});

it("404s a business that isn't publicly visible", async () => {
  vi.mocked(getPublicBusiness).mockResolvedValue(null);

  await expect(PublicBusinessPage(params("nope"))).rejects.toThrow(
    "NEXT_NOT_FOUND",
  );
});

it("redirects a stale-name slug to the canonical", async () => {
  vi.mocked(getPublicBusiness).mockResolvedValue({
    slug: "padaria-central-fjmi7z",
    name: "Padaria",
  } as never);

  await expect(
    PublicBusinessPage(params("nome-antigo-fjmi7z")),
  ).rejects.toThrow("NEXT_REDIRECT:/businesses/padaria-central-fjmi7z");
});

it("renders the profile when the slug is already canonical", async () => {
  vi.mocked(getPublicBusiness).mockResolvedValue({
    slug: "padaria-central-fjmi7z",
    name: "Padaria",
  } as never);

  const element = await PublicBusinessPage(params("padaria-central-fjmi7z"));

  expect(element).toBeDefined();
});
