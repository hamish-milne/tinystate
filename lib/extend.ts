import type { AnyMembers, AnyMutations, EntryOf, Schema } from "./common";

export type ExtendSchema<
  T extends Schema,
  TMembers extends AnyMembers,
  TMutations extends AnyMutations,
> = T extends Schema<infer TValue, infer TParent>
  ? Schema<TValue, TParent, TMembers, TMutations>
  : never;

export function extend<
  T extends Schema,
  TMembers extends AnyMembers,
  TMutations extends AnyMutations,
>(
  schema: T,
  members?: TMembers | (<K extends keyof TMembers>(key: K) => TMembers[K]),
  mutations?: TMutations | ((entry: EntryOf<T>) => TMutations),
) {
  return {
    __proto__: schema,
    ...(members
      ? {
          getMember:
            typeof members === "function"
              ? members
              : <K extends keyof TMembers>(key: K): TMembers[K] => members[key],
        }
      : null),
    ...(mutations
      ? { mutations: typeof mutations === "function" ? mutations : () => mutations }
      : null),
  } as ExtendSchema<T, TMembers, TMutations>;
}
