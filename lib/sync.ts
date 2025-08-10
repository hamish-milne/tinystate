import type { Kind } from "./common";
import { KIND_SCALAR, NotImplementedError, VALUE_KEEP } from "./common";
import type { Scalar } from "./scalar";

export function sync<T>(
  getter: () => T,
  setter: (value: T) => void,
  compare: (a: T, b: T) => boolean = Object.is,
): Scalar<T> {
  return {
    compute(_entry) {
      return getter();
    },
    change(_entry, value) {
      if (compare(value, value)) {
        return VALUE_KEEP;
      }
      setter(value);
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
        set: (value: T) => this.change(entry, value),
      };
    },
    hasValue(_entry, _value) {
      return false; // Sync schemas do not store values directly
    },
    unset(_entry) {
      // Sync schemas do not support unset, as they are derived from a getter
    },
  };
}
