import type { Kind } from "./common";
import { KIND_SCALAR, NotImplementedError, VALUE_KEEP, VALUE_UNSET } from "./common";
import type { Scalar } from "./scalar";

export function sync<T>(
  getter: () => T,
  setter: (value: T) => void,
  compare: (a: T, b: T) => boolean = Object.is,
): Scalar<T> {
  return {
    compute(_entry) {
      return getter();
    },
    computeDefault() {
      throw new NotImplementedError();
    },
    change(entry, value, prev) {
      if (prev !== VALUE_UNSET && compare(value, prev)) {
        return VALUE_KEEP;
      }
      setter(value);
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
    hasValue(_entry, _value) {
      return false; // Sync schemas do not store values directly
    },
    unset(_entry) {
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
    entry.mutations.set(42);
    vi.runAllTimers();
    expect(entry.get()).toBe(42);
  });
}
