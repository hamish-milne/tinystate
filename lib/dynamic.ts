import type { Empty, Schema } from "./common";
import { narrowing, VALUE_KEEP } from "./common";

type DynamicSchema<TParent, TKey extends keyof TParent> = Schema<
  TParent[TKey],
  TParent,
  DynamicMembers<TParent[TKey]>,
  Empty
>;
type DynamicMembers<T> = { [K in keyof T]: DynamicSchema<T, K> };

export function dynamic<TParent, TKey extends keyof TParent>(
  key: TKey,
): DynamicSchema<TParent, TKey> {
  return narrowing<TParent[TKey], TParent, DynamicMembers<TParent[TKey]>>({
    compute(entry, _value) {
      return entry.parent.get()[key];
    },
    change(entry, value) {
      const parent = entry.parent.get();
      if (!parent || typeof parent !== "object") {
        return VALUE_KEEP; // No change if parent is not an object
      }
      const copy = (Array.isArray(parent) ? [...parent] : { ...parent }) as TParent;
      copy[key] = value;
      entry.parent.set(copy);
      return VALUE_KEEP;
    },
    getMember: dynamic,
  });
}

/* v8 ignore start -- @preserve */
TEST: if (import.meta.vitest) {
  const { test, expect, vi } = import.meta.vitest;
  const { createRoot, scalar, extend } = await import(".");
  vi.useFakeTimers();

  test("dynamic object", () => {
    const schema = extend(scalar({ value: 0 }), dynamic);
    const entry = createRoot(schema);
    expect(entry.get()).toEqual({ value: 0 });
    entry.$("value").set(42);
    vi.runAllTimers();
    expect(entry.get()).toEqual({ value: 42 });
    entry.set({ value: 100 });
    vi.runAllTimers();
    expect(entry.$("value").get()).toEqual(100);
  });

  test("dynamic array", () => {
    const schema = extend(scalar([1, 2, 3]), dynamic);
    const entry = createRoot(schema);
    expect(entry.get()).toEqual([1, 2, 3]);
    entry.$(0).set(42);
    vi.runAllTimers();
    expect(entry.get()).toEqual([42, 2, 3]);
    entry.set([100, 200, 300]);
    vi.runAllTimers();
    expect(entry.$(0).get()).toEqual(100);
  });
}
