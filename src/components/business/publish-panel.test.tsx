import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// Stub translations to their keys (params appended) so we can assert on the state without the intl
// provider — the same pattern service-unavailable.test uses.
vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string, params?: Record<string, unknown>): string =>
      params ? `${key}:${JSON.stringify(params)}` : key,
}));

import type { BusinessReadiness } from "@/app/api/businesses/route";

import { PublishPanel } from "./publish-panel";

const READY: BusinessReadiness = {
  is_publishable: true,
  requirements: [
    { key: "name", met: true },
    { key: "description", met: true },
    { key: "category", met: true },
    { key: "contactable", met: true },
  ],
};

const NOT_READY: BusinessReadiness = {
  is_publishable: false,
  requirements: [
    { key: "name", met: true },
    { key: "description", met: false },
    { key: "category", met: false },
    { key: "contactable", met: true },
  ],
};

function renderPanel(props: Partial<React.ComponentProps<typeof PublishPanel>>) {
  return render(
    <PublishPanel
      readiness={NOT_READY}
      isPublished={false}
      onPublish={vi.fn()}
      onNavigate={vi.fn()}
      {...props}
    />,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("PublishPanel", () => {
  it("renders nothing once the business is published", () => {
    const { container } = renderPanel({ isPublished: true, readiness: READY });
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when readiness is absent (e.g. a list response)", () => {
    const { container } = renderPanel({ readiness: undefined });
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the checklist with no Publish button while below the bar", () => {
    renderPanel({ readiness: NOT_READY });

    expect(screen.getByText("checklistTitle")).toBeInTheDocument();
    // 2 of 4 met (name + contactable).
    expect(screen.getByText('progress:{"done":2,"total":4}')).toBeInTheDocument();
    // No go-live button in this state.
    expect(screen.queryByRole("button", { name: /cta/ })).toBeNull();
  });

  it("routes an unmet item to the right tab and section", () => {
    const onNavigate = vi.fn();
    renderPanel({ readiness: NOT_READY, onNavigate });

    // The "description" requirement is unmet → its label is a button.
    fireEvent.click(
      screen.getByText("requirements.description.label").closest("button")!,
    );
    expect(onNavigate).toHaveBeenCalledWith("general", "section-basics");

    fireEvent.click(
      screen.getByText("requirements.category.label").closest("button")!,
    );
    expect(onNavigate).toHaveBeenCalledWith("general", "section-categories");
  });

  it("does not make a met requirement clickable", () => {
    renderPanel({ readiness: NOT_READY });
    // "name" is met → shown as plain text, not inside a button.
    expect(
      screen.getByText("requirements.name.label").closest("button"),
    ).toBeNull();
  });

  it("shows the go-live banner and publishes when the bar is met", () => {
    const onPublish = vi.fn();
    renderPanel({ readiness: READY, onPublish });

    expect(screen.getByText("readyTitle")).toBeInTheDocument();
    expect(screen.queryByText("checklistTitle")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "cta" }));
    expect(onPublish).toHaveBeenCalledTimes(1);
  });

  it("disables the Publish button while a publish is in flight", () => {
    renderPanel({ readiness: READY, publishing: true });
    expect(screen.getByRole("button", { name: "cta" })).toBeDisabled();
  });
});
