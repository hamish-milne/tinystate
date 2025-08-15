import type { Empty, Kind, Schema } from "./common";
import { KIND_SCALAR, NotImplementedError, VALUE_KEEP, VALUE_UNSET } from "./common";

type ScalarMutations<T> = {
  set(value: T): void;
};

export type Scalar<T> = Schema<T, unknown, Empty, ScalarMutations<T>>;

export function scalar<T>(
  defaultValue: T,
  compare: (a: T, b: T) => boolean = Object.is,
): Scalar<T> {
  return {
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
    getMember(_key: never): never {
      throw new NotImplementedError();
    },
    get kind(): Kind {
      return KIND_SCALAR;
    },
    mutations(entry) {
      return {
        set: (value: T) => entry.set(value),
      };
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
