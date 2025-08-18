import type { Kind, Schema } from "./common";
import { KIND_WIDENING, ReadonlyError, UNCHANGED } from "./common";
import { scalar } from "./scalar";

class ReadonlySetImpl<T> extends Set<T> implements ReadonlySet<T> {
  constructor(values?: readonly T[] | Iterable<T> | null) {
    super();
    for (const value of values || []) {
      super.add(value);
    }
    Object.freeze(this);
  }
  override clear(): void {
    throw new ReadonlyError();
  }
  override delete(_value: T): boolean {
    throw new ReadonlyError();
  }
  override add(_value: T): this {
    throw new ReadonlyError();
  }
  toJSON() {
    return Array.from(this);
  }
}

const SET_EMPTY = new ReadonlySetImpl<never>();
const SET_MEMBER = scalar(false);

type SetMutations<K extends string> = {
  add(key: K): void;
  delete(key: K): void;
  clear(): void;
};

export type SetSchema<K extends string> = Schema<
  ReadonlySet<K>,
  unknown,
  { [key in K]: typeof SET_MEMBER },
  SetMutations<K>
>;

export function set<K extends string>(): SetSchema<K> {
  return {
    __proto__: null,
    compute(entry) {
      const set = new Set<K>();
      for (const [key, member] of entry.members()) {
        if (member.get()) {
          set.add(key);
        }
      }
      if (set.size === 0) {
        return SET_EMPTY;
      }
      return new ReadonlySetImpl(set);
    },
    computeDefault() {
      return SET_EMPTY;
    },
    change(entry, value) {
      for (const [key, member] of entry.members()) {
        if (!value.has(key)) {
          member.set(false); // Clear the member if it is not in the new set
        }
      }
      for (const key of value) {
        entry.member(key).set(true); // Set the member to true if it exists in the new set
      }
      // We allow the members to call invalidate themselves, so we don't need to do anything here
      return UNCHANGED;
    },
    getMember(_key: K) {
      return SET_MEMBER;
    },
    isMemberPermanent() {
      return false;
    },
    mutations(entry) {
      return {
        add: (key: K) => entry.member(key).set(true),
        delete: (key: K) => entry.member(key).set(false),
        clear: () => {
          for (const [_, member] of entry.members()) {
            member.set(false); // Clear all members
          }
        },
      };
    },
    get kind(): Kind {
      return KIND_WIDENING;
    },
    hasValue(entry) {
      for (const [_key, member] of entry.members()) {
        if (member.hasValue()) {
          return true;
        }
      }
      return false;
    },
    unset(entry) {
      for (const [_key, member] of entry.members()) {
        member.unset();
      }
    },
  };
}

/* v8 ignore start -- @preserve */
TEST: if (import.meta.vitest) {
  const { test, expect, vi } = import.meta.vitest;
  const { createRoot } = await import("./");
  vi.useFakeTimers();

  test("get/set round-trip", () => {
    const schema = set<string>();
    const entry = createRoot(schema);
    expect(entry.get()).toBe(SET_EMPTY);
    entry.member("a").set(true);
    expect(entry.get()).toEqual(new ReadonlySetImpl(["a"]));
    entry.member("b").set(true);
    expect(entry.get()).toEqual(new ReadonlySetImpl(["a", "b"]));
    entry.member("a").set(false);
    expect(entry.get()).toEqual(new ReadonlySetImpl(["b"]));
    entry.set(new Set(["c", "d"]));
    expect(entry.get()).toEqual(new ReadonlySetImpl(["c", "d"]));
  });

  test("hasValue/unset", () => {
    const schema = set<string>();
    const entry = createRoot(schema);
    expect(entry.hasValue()).toBe(false);
    entry.member("a").set(true);
    expect(entry.hasValue()).toBe(true);
    entry.unset();
    expect(entry.get()).toEqual(SET_EMPTY);
    expect(entry.hasValue()).toBe(false);
  });

  test("mutations", () => {
    const entry = createRoot(set<string>());
    expect(entry.get()).toBe(SET_EMPTY);
    entry.mutations.add("a");
    expect(entry.get()).toEqual(new ReadonlySetImpl(["a"]));
    entry.mutations.add("b");
    expect(entry.get()).toEqual(new ReadonlySetImpl(["a", "b"]));
    entry.mutations.delete("a");
    expect(entry.get()).toEqual(new ReadonlySetImpl(["b"]));
    entry.mutations.clear();
    expect(entry.get()).toBe(SET_EMPTY);
  });
}
