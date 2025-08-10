import type { AnyMembers, Empty, Kind, Schema } from "./common";
import { KIND_NARROWING, KIND_WIDENING, VALUE_KEEP } from "./common";

type ObjectValue<TMembers extends AnyMembers> = {
  [K in keyof TMembers]: TMembers[K] extends Schema<infer V, any> ? V : never;
};

export type ObjectSchema<TMembers extends AnyMembers> = Schema<
  ObjectValue<TMembers>,
  unknown,
  TMembers,
  Empty
>;

export function object<TMembers extends AnyMembers>(members: TMembers): ObjectSchema<TMembers> {
  return {
    compute(entry) {
      const value: Partial<ObjectValue<TMembers>> = {};
      for (const [key, member] of entry.members()) {
        if (member.kind === KIND_NARROWING) {
          continue; // Skip computed members
        }
        value[key] = member.get();
      }
      return value as ObjectValue<TMembers>;
    },
    change(entry, value): typeof VALUE_KEEP {
      for (const [key, member] of entry.members()) {
        if (member.kind === KIND_NARROWING) {
          continue; // Skip computed members
        }
        member.set(value[key]);
      }
      // We allow the members to call invalidate themselves, so we don't need to do anything here
      return VALUE_KEEP;
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
        if (member.kind === KIND_NARROWING) {
          continue; // Skip computed members
        }
        if (member.hasValue()) {
          return true;
        }
      }
      return false;
    },
    unset(entry) {
      for (const [_key, member] of entry.members()) {
        if (member.kind === KIND_NARROWING) {
          continue; // Skip computed members
        }
        member.unset();
      }
    },
  };
}
