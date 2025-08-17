import type { Empty, Kind, Schema } from "./common";
import { InvalidMemberError, KIND_SCALAR, VALUE_KEEP, VALUE_UNSET } from "./common";

export type Scalar<T> = Schema<T, unknown, Empty, Empty>;

export function scalar<T>(
  defaultValue: T,
  compare: (a: T, b: T) => boolean = Object.is,
): Scalar<T> {
  return {
    __proto__: null,
    compute(_entry, value) {
      if (value === VALUE_UNSET) {
        return defaultValue;
      }
      return VALUE_KEEP;
    },
    computeDefault() {
      return defaultValue;
    },
    change(entry, value, prev) {
      if (prev !== VALUE_UNSET && compare(value, prev)) {
        return VALUE_KEEP;
      }
      entry.invalidate();
      return value;
    },
    getMember(): never {
      throw new InvalidMemberError();
    },
    get kind(): Kind {
      return KIND_SCALAR;
    },
    mutations() {
      return {};
    },
    hasValue(_entry, value) {
      return value !== VALUE_UNSET && !compare(value, defaultValue);
    },
    unset(entry) {
      entry.set(defaultValue);
    },
  };
}

/* v8 ignore start -- @preserve */
TEST: if (import.meta.vitest) {
  const { test, expect, vi } = import.meta.vitest;
  const { createRoot, VALUE_UNSET } = await import("./");
  vi.useFakeTimers();

  test("get/set round-trip", () => {
    const schema = scalar(42);
    const entry = createRoot(schema);
    expect(entry.get()).toBe(42);
    entry.set(100);
    expect(entry.get()).toBe(100);
    entry.set(42);
    expect(entry.get()).toBe(42);
  });

  test("hasValue/unset", () => {
    const schema = scalar(42);
    const entry = createRoot(schema);
    expect(entry.hasValue()).toBe(false);
    entry.set(100);
    expect(entry.hasValue()).toBe(true);
    entry.unset();
    expect(entry.get()).toBe(42);
    expect(entry.hasValue()).toBe(false);
  });

  test("notify on change", () => {
    const schema = scalar(42);
    const entry = createRoot(schema);
    const listener = vi.fn();
    const unsubscribe = entry.subscribe(listener);
    entry.set(100);
    vi.runAllTimers();
    expect(listener).toHaveBeenCalledWith(100, VALUE_UNSET, entry);
    entry.set(100);
    vi.runAllTimers();
    expect(listener).toHaveBeenCalledTimes(1); // No change, no notification
    unsubscribe();
    entry.set(200);
    vi.runAllTimers();
    expect(listener).toHaveBeenCalledTimes(1); // No notification after unsubscribe
  });
}
