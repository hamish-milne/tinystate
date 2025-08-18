import type { Empty, Schema, ValueOf } from "./common";
import { narrowing, UNCHANGED } from "./common";
import { extend } from "./extend";

export type DynamicSchema<TParent, TKey extends keyof TParent> = Schema<
  TParent[TKey],
  TParent,
  DynamicMembers<TParent[TKey]>,
  Empty
>;

// NOTE: The conditional in DynamicMembers and the two 'as any' casts below are necessary
// to avoid a strange TypeScript issue that otherwise causes the type of DynamicMembers
// to be inferred as `never`.

export type DynamicMembers<T> = T extends unknown[]
  ? { [K in number]: DynamicSchema<T, number> }
  : T extends Record<any, any>
    ? { [K in keyof T]: DynamicSchema<T, K> }
    : Empty;

export function dynamic<TParent extends Record<any, any> | unknown[], TKey extends keyof TParent>(
  key: TKey,
): DynamicMembers<TParent>[TKey] {
  return narrowing<TParent[TKey], TParent, DynamicMembers<TParent[TKey]>>({
    compute(entry) {
      return entry.parent.get()[key];
    },
    change(entry, value) {
      const parent = entry.parent.get();
      if (!parent || typeof parent !== "object") {
        return UNCHANGED; // No change if parent is not an object
      }
      const copy = (Array.isArray(parent) ? [...parent] : { ...parent }) as TParent;
      copy[key] = value;
      entry.parent.set(copy);
      return UNCHANGED;
    },
    getMember: dynamic as any,
    isMemberPermanent() {
      return false; // Dynamic members are not permanent
    },
  }) as any;
}

export function extendDynamic<T extends Schema>(schema: T) {
  return extend<T, DynamicMembers<ValueOf<T>>, Empty>(schema, dynamic);
}

/* v8 ignore start -- @preserve */
TEST: if (import.meta.vitest) {
  const { test, expect, vi } = import.meta.vitest;
  const { createRoot, scalar } = await import(".");
  vi.useFakeTimers();

  test("dynamic object", () => {
    const schema = extendDynamic(scalar({ value: 0 }));
    const entry = createRoot(schema);
    expect(entry.get()).toEqual({ value: 0 });
    entry.value.set(42);
    vi.runAllTimers();
    expect(entry.get()).toEqual({ value: 42 });
    entry.set({ value: 100 });
    vi.runAllTimers();
    expect(entry.member("value").get()).toEqual(100);
  });

  test("dynamic array", () => {
    const schema = extendDynamic(scalar([1, 2, 3]));
    const entry = createRoot(schema);
    expect(entry.get()).toEqual([1, 2, 3]);
    entry[0].set(42);
    vi.runAllTimers();
    expect(entry.get()).toEqual([42, 2, 3]);
    entry.set([100, 200, 300]);
    vi.runAllTimers();
    expect(entry.member(0).get()).toEqual(100);
  });
}
