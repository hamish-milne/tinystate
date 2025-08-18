import type { Empty, Schema } from "./common";
import { InvalidMemberError, MEMBERS_UNCHANGED, narrowing, UNCHANGED } from "./common";

export type Computed<T, TParent> = Schema<T, TParent, Empty, Empty>;

export function computed<T, TParent>(
  compute: (value: TParent) => T,
  compare: (a: T, b: T) => boolean = Object.is,
): Computed<T, TParent> {
  return narrowing({
    compute(entry, value) {
      const newValue = compute(entry.parent.get(MEMBERS_UNCHANGED));
      if (value !== UNCHANGED && compare(value, newValue)) {
        return UNCHANGED; // No change needed
      }
      return newValue;
    },
    change(_entry, _value) {
      return UNCHANGED; // Computed values are not directly changeable
    },
    getMember() {
      throw new InvalidMemberError();
    },
  });
}

/* v8 ignore start -- @preserve */
TEST: if (import.meta.vitest) {
  const { test, expect, vi } = import.meta.vitest;
  const { createRoot, object, scalar } = await import("./");
  vi.useFakeTimers();

  test("get value", async () => {
    const schema = object({
      a: scalar(3),
      b: scalar(4),
      sum: computed((parent) => parent.a + parent.b),
    });
    const entry = createRoot(schema);
    expect(entry.sum.get()).toBe(7);
    entry.a.set(5);
    vi.runAllTimers();
    expect(entry.sum.get()).toBe(9);
    entry.b.set(2);
    vi.runAllTimers();
    expect(entry.sum.get()).toBe(7);
    entry.sum.set(10);
    vi.runAllTimers();
    expect(entry.sum.get()).toBe(7);
  });
}
