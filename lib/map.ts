import type { Kind, Schema, ValueOf } from "./common";
import { KIND_WIDENING, ReadonlyError, UNCHANGED } from "./common";

class ReadonlyMapImpl<K, V> extends Map<K, V> implements ReadonlyMap<K, V> {
  constructor(entries?: readonly (readonly [K, V])[] | Iterable<readonly [K, V]> | null) {
    super();
    for (const [key, value] of entries || []) {
      super.set(key, value);
    }
    Object.freeze(this);
  }
  override clear(): void {
    throw new ReadonlyError();
  }
  override delete(_key: K): boolean {
    throw new ReadonlyError();
  }
  override set(_key: K, _value: V): this {
    throw new ReadonlyError();
  }
}
const MAP_EMPTY = new ReadonlyMapImpl<never, never>();

type MapMutations<K extends string, V extends Schema> = {
  set(key: K, value: ValueOf<V>): void;
  delete(key: K): void;
  clear(): void;
};

export type MapSchema<K extends string, V extends Schema> = Schema<
  ReadonlyMap<K, ValueOf<V>>,
  unknown,
  { [key in K]: V },
  MapMutations<K, V>
>;

export function map<K extends string, V extends Schema>(valueSchema: V): MapSchema<K, V> {
  return {
    __proto__: null,
    compute(entry) {
      const map = new Map<K, ValueOf<V>>();
      for (const [key, member] of entry.members()) {
        if (!member.hasValue()) {
          continue; // Skip members that do not have a value
        }
        map.set(key, member.get());
      }
      if (map.size === 0) {
        return MAP_EMPTY;
      }
      return new ReadonlyMapImpl(map);
    },
    computeDefault() {
      return MAP_EMPTY;
    },
    change(entry, value) {
      for (const [key, item] of value) {
        entry.member(key).set(item);
      }
      for (const [key, member] of entry.members()) {
        if (!value.has(key)) {
          member.unset(); // Remove members that are not in the new value
        }
      }
      // We allow the members to call invalidate themselves, so we don't need to do anything here
      return UNCHANGED;
    },
    getMember(_key: K) {
      return valueSchema;
    },
    isMemberPermanent() {
      return false;
    },
    mutations(entry) {
      return {
        set: (key: K, value: V) => entry.member(key).set(value),
        delete: (key: K) => entry.member(key).unset(),
        clear: () => {
          for (const [_, member] of entry.members()) {
            member.unset(); // Clear all members
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
  const { createRoot, scalar } = await import("./");
  vi.useFakeTimers();

  test("get/set entries", () => {
    const schema = map(scalar(0));
    const entry = createRoot(schema);
    expect(entry.get()).toEqual(new ReadonlyMapImpl());
    entry.member("key1").set(1);
    expect(entry.get()).toEqual(new ReadonlyMapImpl([["key1", 1]]));
    entry.member("key2").set(2);
    expect(entry.get()).toEqual(
      new ReadonlyMapImpl([
        ["key1", 1],
        ["key2", 2],
      ]),
    );
    entry.member("key1").unset();
    expect(entry.get()).toEqual(new ReadonlyMapImpl([["key2", 2]]));
    entry.member("key2").unset();
    expect(entry.get()).toEqual(new ReadonlyMapImpl());
    entry.set(new Map([["key3", 3]]));
    expect(entry.get()).toEqual(new ReadonlyMapImpl([["key3", 3]]));
  });

  test("hasValue/unset", () => {
    const schema = map(scalar(0));
    const entry = createRoot(schema);
    expect(entry.hasValue()).toBe(false);
    entry.member("key1").set(1);
    expect(entry.hasValue()).toBe(true);
    entry.unset();
    expect(entry.hasValue()).toBe(false);
  });

  test("mutations", () => {
    const schema = map(scalar(0));
    const entry = createRoot(schema);
    expect(entry.get()).toEqual(new ReadonlyMapImpl());
    entry.mutations.set("key1", 1);
    expect(entry.get()).toEqual(new ReadonlyMapImpl([["key1", 1]]));
    entry.mutations.set("key2", 2);
    expect(entry.get()).toEqual(
      new ReadonlyMapImpl([
        ["key1", 1],
        ["key2", 2],
      ]),
    );
    entry.mutations.delete("key1");
    expect(entry.get()).toEqual(new ReadonlyMapImpl([["key2", 2]]));
    entry.mutations.clear();
    expect(entry.get()).toEqual(new ReadonlyMapImpl());
  });
}
