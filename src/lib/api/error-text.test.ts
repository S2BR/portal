import { describe, expect, it } from "vitest";

import { apiErrorText } from "./error-text";

describe("apiErrorText", () => {
  it("prefers field-level errors over the generic top-level message", () => {
    const text = apiErrorText({
      message: "The given data was invalid.",
      errors: { email: ["The email has already been taken."] },
    });

    expect(text).toBe("The email has already been taken.");
  });

  it("joins multiple field errors", () => {
    const text = apiErrorText({
      errors: {
        email: ["The email has already been taken."],
        password: ["The password has appeared in a data breach."],
      },
    });

    expect(text).toBe(
      "The email has already been taken. The password has appeared in a data breach.",
    );
  });

  it("falls back to the top-level message when there are no field errors", () => {
    expect(apiErrorText({ message: "Too many attempts." })).toBe(
      "Too many attempts.",
    );
  });

  it("returns null when nothing usable is present", () => {
    expect(apiErrorText({})).toBeNull();
    expect(apiErrorText({ errors: {} })).toBeNull();
  });
});
