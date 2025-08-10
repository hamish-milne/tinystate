import type { Kind, Schema } from "./common";
import { KIND_WIDENING, ReadonlyError, VALUE_KEEP } from "./common";

class ReadonlyMapImpl<K, V> extends Map<K, V> implements ReadonlyMap<K, V> {
  constructor(entries?: readonly (readonly [K, V])[] | Iterable<readonly [K, V]> | null) {
    super(entries);
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
  set(key: K, value: V): void;
  delete(key: K): void;
  clear(): void;
};

export type MapSchema<K extends string, V extends Schema> = Schema<
  ReadonlyMap<K, V>,
  unknown,
  { [key in K]: V },
  MapMutations<K, V>
>;

export function map<K extends string, V extends Schema>(valueSchema: V): MapSchema<K, V> {
  return {
    compute(entry) {
      const map = new Map<K, V>();
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
    change(entry, value) {
      for (const [key, member] of entry.members()) {
        const newValue = value.get(key);
        if (newValue !== undefined) {
          member.set(newValue);
        } else {
          member.unset();
        }
      }
      // We allow the members to call invalidate themselves, so we don't need to do anything here
      return VALUE_KEEP;
    },
    getMember(_key: K) {
      return valueSchema;
    },
    mutations(entry) {
      return {
        set: (key: K, value: V) => entry.getMember(key).set(value),
        delete: (key: K) => entry.getMember(key).unset(),
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
