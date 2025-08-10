import type { AnyMembers, Empty, Kind, Schema } from "./common";
import { KIND_NARROWING, VALUE_KEEP, VALUE_UNSET } from "./common";

export type Computed<T, TParent, TMembers extends AnyMembers> = Schema<T, TParent, TMembers, Empty>;

export function computed<T, TParent, TMembers extends AnyMembers>(
  compute: (value: TParent) => T,
  compare: (a: T, b: T) => boolean = Object.is,
  members: TMembers = {} as TMembers,
): Computed<T, TParent, TMembers> {
  return {
    compute(entry, value) {
      const { parent } = entry;
      if (!parent) {
        throw new Error("Computed values require a parent entry to compute from");
      }
      const newValue = compute(parent.get());
      if (value !== VALUE_UNSET && compare(value, newValue)) {
        return VALUE_KEEP; // No change needed
      }
      return newValue;
    },
    change(_entry, _value) {
      return VALUE_KEEP; // Computed values are not directly changeable
    },
    getMember<K extends keyof TMembers>(key: K) {
      return members[key];
    },
    get kind(): Kind {
      return KIND_NARROWING;
    },
    mutations(_entry) {
      return {}; // Computed values do not support mutations
    },
    hasValue(_entry, _value) {
      return false; // Computed values never store state
    },
    unset(_entry) {
      // Computed values do not support unset, as they are derived from their parent
    },
  };
}
