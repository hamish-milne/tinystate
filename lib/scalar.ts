import type { Empty, Kind, Schema } from "./common";
import { KIND_SCALAR, NotImplementedError, VALUE_KEEP, VALUE_UNSET } from "./common";

type ScalarMutations<T> = {
  set(value: T): void;
};

export type Scalar<T> = Schema<T, unknown, Empty, ScalarMutations<T>>;

export function scalar<T>(
  defaultValue: T,
  compare: (a: T, b: T) => boolean = Object.is,
): Scalar<T> {
  return {
    compute(_entry, value) {
      if (value === VALUE_UNSET) {
        return defaultValue;
      }
      return value;
    },
    change(entry, value) {
      if (compare(value, entry.get())) {
        return VALUE_KEEP;
      }
      entry.invalidate();
      return value;
    },
    getMember(_key: never): never {
      throw new NotImplementedError();
    },
    get kind(): Kind {
      return KIND_SCALAR;
    },
    mutations(entry) {
      return {
        set: (value: T) => entry.set(value),
      };
    },
    hasValue(_entry, value) {
      return value !== VALUE_UNSET && !compare(value, defaultValue);
    },
    unset(entry) {
      entry.set(defaultValue);
    },
  };
}
