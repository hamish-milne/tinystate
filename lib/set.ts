import type { Kind, Schema } from "./common";
import { KIND_WIDENING, ReadonlyError, VALUE_KEEP } from "./common";
import { scalar } from "./scalar";

class ReadonlySetImpl<T> extends Set<T> implements ReadonlySet<T> {
  constructor(values?: readonly T[] | Iterable<T> | null) {
    super();
    for (const value of values ?? []) {
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
        entry.$(key).set(true); // Set the member to true if it exists in the new set
      }
      // We allow the members to call invalidate themselves, so we don't need to do anything here
      return VALUE_KEEP;
    },
    getMember(_key: K) {
      return SET_MEMBER;
    },
    mutations(entry) {
      return {
        add: (key: K) => entry.$(key).set(true),
        delete: (key: K) => entry.$(key).set(false),
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
