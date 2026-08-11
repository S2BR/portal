import { render, screen, act } from "@testing-library/react";
import { useEffect } from "react";
import { expect, it } from "vitest";

import {
  BusinessIdentityProvider,
  useBusinessIdentity,
} from "./business-identity-context";

/** Stands in for the sidebar switcher: shows a business's name + logo, preferring an override. */
function Probe({
  slug,
  name,
  logo,
}: {
  slug: string;
  name: string;
  logo: string | null;
}) {
  const identity = useBusinessIdentity();
  const override = identity?.overrides[slug];
  const displayLogo = override && "logo" in override ? override.logo : logo;
  return (
    <div>
      <span data-testid="name">{override?.name ?? name}</span>
      <span data-testid="logo">{displayLogo ?? "none"}</span>
    </div>
  );
}

let control: ReturnType<typeof useBusinessIdentity> = null;
function Control() {
  const identity = useBusinessIdentity();
  useEffect(() => {
    control = identity;
  }, [identity]);
  return null;
}

it("propagates a live name override to a sibling surface, then reverts when set back", () => {
  render(
    <BusinessIdentityProvider>
      <Probe slug="acme" name="Old Name" logo={null} />
      <Control />
    </BusinessIdentityProvider>,
  );

  expect(screen.getByTestId("name")).toHaveTextContent("Old Name");

  // Live typing pushes each value; the sibling reflects it immediately.
  act(() => control?.setName("acme", "New Nam"));
  act(() => control?.setName("acme", "New Name"));
  expect(screen.getByTestId("name")).toHaveTextContent("New Name");

  // Abandoning the edit sets the name back to the saved value.
  act(() => control?.setName("acme", "Old Name"));
  expect(screen.getByTestId("name")).toHaveTextContent("Old Name");
});

it("reflects a just-uploaded logo on a sibling surface", () => {
  render(
    <BusinessIdentityProvider>
      <Probe slug="acme" name="Acme" logo="https://cdn/old.png" />
      <Control />
    </BusinessIdentityProvider>,
  );

  expect(screen.getByTestId("logo")).toHaveTextContent("https://cdn/old.png");

  act(() => control?.setLogo("acme", "https://cdn/new.png"));
  expect(screen.getByTestId("logo")).toHaveTextContent("https://cdn/new.png");

  // A removed logo (null) is honored, not treated as "no override".
  act(() => control?.setLogo("acme", null));
  expect(screen.getByTestId("logo")).toHaveTextContent("none");
});
