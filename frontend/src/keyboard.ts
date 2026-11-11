import type React from "react";

/**
 * Detects whether the keyboard event is part of IME composition.
 *
 * Checks `e.nativeEvent.isComposing` as standard, but also guards against
 * `keyCode === 229` where certain browsers/IMEs fire the Enter key event with
 * `isComposing: false` before clearing the composition session.
 */
export function isImeComposing(e: React.KeyboardEvent): boolean {
  return e.nativeEvent.isComposing || e.keyCode === 229;
}
