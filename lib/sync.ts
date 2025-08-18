import type { Kind } from "./common";
import { InvalidMemberError, KIND_SCALAR, NotImplementedError, UNCHANGED } from "./common";
import type { Scalar } from "./scalar";

export function sync<T>(
  getter: () => T,
  setter: (value: T) => void,
  compare: (a: T, b: T) => boolean = Object.is,
): Scalar<T> {
  return {
    __proto__: null,
    compute() {
      return getter();
    },
    computeDefault() {
      throw new NotImplementedError();
    },
    change(entry, value, prev) {
      if (prev !== UNCHANGED && compare(value, prev)) {
        return UNCHANGED;
      }
      setter(value);
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
    hasValue() {
      return false; // Sync schemas do not store values directly
    },
    unset() {
      // Sync schemas do not support unset, as they are derived from a getter
    },
  };
}

/* v8 ignore start -- @preserve */
TEST: if (import.meta.vitest) {
  const { test, expect, vi } = import.meta.vitest;
  const { createRoot } = await import("./");
  vi.useFakeTimers();

  test("sync schema", () => {
    let value = 42;
    const schema = sync(
      () => value,
      (newValue) => {
        value = newValue;
      },
    );
    const entry = createRoot(schema);
    expect(entry.get()).toBe(42);
    entry.set(100);
    vi.runAllTimers();
    expect(entry.get()).toBe(100);
    entry.set(42);
    vi.runAllTimers();
    expect(entry.get()).toBe(42);
  });
}
