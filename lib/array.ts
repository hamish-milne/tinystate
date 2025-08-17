import type { Kind, Schema, ValueOf } from "./common";
import { InvalidMemberError, KIND_WIDENING, VALUE_KEEP } from "./common";
import { type Scalar, scalar } from "./scalar";

type ArrayValue<T extends Schema> = readonly ValueOf<T>[];

type ArrayMembers<T extends Schema> = {
  [idx: number]: T;
} & { length: Scalar<number> };

type ArrayMutations<T extends Schema> = {
  push(value: ValueOf<T>): void;
  pop(): void;
  clear(): void;
};

const ArrayLength = scalar(0);
const ARRAY_EMPTY = Object.freeze([]);

export type ArraySchema<T extends Schema> = Schema<
  ArrayValue<T>,
  unknown,
  ArrayMembers<T>,
  ArrayMutations<T>
>;

export function array<T extends Schema>(itemSchema: T): ArraySchema<T> {
  return {
    __proto__: null,
    get kind(): Kind {
      return KIND_WIDENING;
    },
    compute(entry) {
      const length = entry.member("length").get();
      if (length === 0) {
        return ARRAY_EMPTY;
      }
      const value: ArrayValue<T>[number][] = new Array(length);
      for (let i = 0; i < length; i++) {
        value[i] = entry.member(i).get();
      }
      return value;
    },
    computeDefault() {
      return ARRAY_EMPTY;
    },
    change(entry, value): typeof VALUE_KEEP {
      entry.member("length").set(value.length);
      for (let i = 0, l = value.length; i < l; i++) {
        entry.member(i).set(value[i]);
      }
      // We allow the members to call invalidate themselves, so we don't need to do anything here
      return VALUE_KEEP;
    },
    getMember<K extends number | "length">(key: K) {
      if (key === "length") {
        return ArrayLength as ArrayMembers<T>[K];
      }
      if (typeof key === "number" && key >= 0) {
        return itemSchema as ArrayMembers<T>[K];
      }
      throw new InvalidMemberError();
    },
    mutations(entry) {
      return {
        push: (value: ValueOf<T>) => {
          const currentLength = entry.member("length").get();
          entry.member(currentLength).set(value);
          entry.member("length").set(currentLength + 1);
        },
        pop: () => entry.member("length").set(Math.max(0, entry.member("length").get() - 1)),
        clear: () => entry.member("length").set(0),
      };
    },
    hasValue(entry) {
      return entry.member("length").get() > 0;
    },
    unset(entry) {
      entry.member("length").set(0);
    },
  };
}

/* v8 ignore start -- @preserve */
TEST: if (import.meta.vitest) {
  const { test, expect, vi } = import.meta.vitest;
  const { createRoot } = await import("./");
  vi.useFakeTimers();

  test("set/get round-trip", () => {
    const entry = createRoot(array(scalar(666)));
    expect(entry.length.get()).toBe(0);
    entry.set([1, 2, 3]);
    expect(entry.length.get()).toBe(3);
    expect(entry[0].get()).toBe(1);
    expect(entry[1].get()).toBe(2);
    expect(entry[2].get()).toBe(3);
    expect(entry.get()).toEqual([1, 2, 3]);
  });

  test("length change", () => {
    const entry = createRoot(array(scalar(666)));
    entry.length.set(3);
    expect(entry.get()).toEqual([666, 666, 666]);
    entry[4].set(1);
    expect(entry.get()).toEqual([666, 666, 666]);
  });

  test("hasValue/unset", () => {
    const entry = createRoot(array(scalar(666)));
    expect(entry.hasValue()).toBe(false);
    entry.set([1, 2, 3]);
    expect(entry.hasValue()).toBe(true);
    entry.unset();
    expect(entry.hasValue()).toBe(false);
  });

  test("mutations", () => {
    const entry = createRoot(array(scalar(666)));
    expect(entry.get()).toEqual([]);
    entry.push(1);
    expect(entry.get()).toEqual([1]);
    entry.push(2);
    expect(entry.get()).toEqual([1, 2]);
    entry.pop();
    expect(entry.get()).toEqual([1]);
    entry.clear();
    expect(entry.get()).toEqual([]);
  });
}
