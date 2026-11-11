import type React from "react";
import { describe, expect, it } from "vite-plus/test";

import { isImeComposing } from "./keyboard";

describe("isImeComposing", () => {
  it("returns true when nativeEvent.isComposing is true", () => {
    const event = {
      nativeEvent: { isComposing: true },
      keyCode: 13,
    } as unknown as React.KeyboardEvent;
    expect(isImeComposing(event)).toBe(true);
  });

  it("returns true when keyCode is 229 even if isComposing is false", () => {
    const event = {
      nativeEvent: { isComposing: false },
      keyCode: 229,
    } as unknown as React.KeyboardEvent;
    expect(isImeComposing(event)).toBe(true);
  });

  it("returns false for standard key press without IME composition", () => {
    const event = {
      nativeEvent: { isComposing: false },
      keyCode: 13,
    } as unknown as React.KeyboardEvent;
    expect(isImeComposing(event)).toBe(false);
  });
});
