import type { AnyMembers, Empty, Kind, Schema } from "./common";
import { KIND_NARROWING, KIND_WIDENING, MEMBERS_UNCHANGED, UNCHANGED } from "./common";

type ObjectValue<TMembers extends AnyMembers> = {
  [K in keyof TMembers]: TMembers[K] extends Schema<infer V, any> ? V : never;
};

export type ObjectSchema<TMembers extends AnyMembers> = Schema<
  ObjectValue<TMembers>,
  unknown,
  TMembers,
  Empty
>;

export function mapObject<T extends {}, TOut>(
  obj: T,
  map: (this: void, value: T[keyof T], key: keyof T, obj: T) => TOut,
  filter?: (this: void, value: T[keyof T], key: keyof T, obj: T) => boolean,
) {
  const result = { __proto__: null } as { [K in keyof T]: TOut };
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (filter && !filter(obj[key], key, obj)) {
      continue;
    }
    result[key] = map(obj[key], key, obj);
  }
  return result;
}

export function object<TMembers extends AnyMembers>(members: TMembers): ObjectSchema<TMembers> {
  const keys = Object.keys(members) as (keyof TMembers)[];
  return {
    __proto__: null,
    compute(entry, _value, flags) {
      const value =
        flags & MEMBERS_UNCHANGED ? { ...entry.default } : ({} as ObjectValue<TMembers>);
      for (const [key, member] of entry.members(flags)) {
        value[key] = member.get();
      }
      return value;
    },
    computeDefault() {
      return Object.freeze(
        mapObject(
          members,
          (member) => member.computeDefault(),
          (member) => member.kind !== KIND_NARROWING,
        ),
      );
    },
    change(entry, value): typeof UNCHANGED {
      for (const key of keys) {
        const member = entry.member(key);
        if (member.kind === KIND_NARROWING) {
          continue; // Skip computed members
        }
        member.set(value[key]);
      }
      // We allow the members to call invalidate themselves, so we don't need to do anything here
      return UNCHANGED;
    },
    getMember<K extends keyof TMembers>(key: K) {
      return members[key];
    },
    mutations(_entry) {
      return {};
    },
    get kind(): Kind {
      return KIND_WIDENING;
    },
    hasValue(entry, _value) {
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
  const { createRoot, object, scalar, MEMBERS_ALL } = await import("./");
  vi.useFakeTimers();

  test("get/set round-trip", () => {
    const schema = object({
      a: scalar(1),
      b: scalar(2),
    });
    const entry = createRoot(schema);
    expect(entry.get(MEMBERS_ALL)).toEqual({ a: 1, b: 2 });
    entry.set({ a: 3, b: 4 });
    expect(entry.get()).toEqual({ a: 3, b: 4 });
    entry.set({ a: 1, b: 2 });
    expect(entry.get()).toEqual({ a: 1, b: 2 });
  });

  test("hasValue/unset", () => {
    const schema = object({
      a: scalar(1),
      b: scalar(2),
    });
    const entry = createRoot(schema);
    expect(entry.hasValue()).toBe(false);
    entry.set({ a: 3, b: 4 });
    expect(entry.hasValue()).toBe(true);
    entry.unset();
    expect(entry.hasValue()).toBe(false);
  });
}
