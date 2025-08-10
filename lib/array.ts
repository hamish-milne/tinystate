import type { Entry, Kind, Schema } from "./common";
import { KIND_WIDENING, VALUE_KEEP, type VALUE_UNSET } from "./common";
import { type Scalar, scalar } from "./scalar";

type ArrayValue<T extends Schema> = readonly (T extends Schema<infer V>
  ? V
  : never)[];

type ArrayMembers<T extends Schema> = {
  [idx: number]: T | undefined;
} & { length: Scalar<number> };

type ArrayMutations<T extends Schema> = {
  push(value: T): void;
  pop(): void;
  clear(): void;
};

type ArrayEntry<T extends Schema> = Entry<
  ArrayValue<T>,
  unknown,
  ArrayMembers<T>,
  ArrayMutations<T>
>;

const ArrayLength = scalar(0);
const ARRAY_EMPTY = Object.freeze([]);

export type { ArraySchema };
class ArraySchema<T extends Schema>
  implements Schema<ArrayValue<T>, unknown, ArrayMembers<T>, ArrayMutations<T>>
{
  private readonly _itemSchema: T;

  constructor(itemSchema: T) {
    this._itemSchema = itemSchema;
  }

  get kind(): Kind {
    return KIND_WIDENING;
  }

  compute(entry: ArrayEntry<T>): ArrayValue<T> {
    const length = entry.getMember("length").get();
    if (length === 0) {
      return ARRAY_EMPTY;
    }
    const value = new Array(length) as ArrayValue<T>[number][];
    for (let i = 0; i < length; i++) {
      value[i] = entry.getMember(i).get();
    }
    return value;
  }

  change(entry: ArrayEntry<T>, value: ArrayValue<T>): typeof VALUE_KEEP {
    entry.getMember("length").set(value.length);
    for (let i = 0, l = value.length; i < l; i++) {
      entry.getMember(i).set(value[i]);
    }
    // We allow the members to call invalidate themselves, so we don't need to do anything here
    return VALUE_KEEP;
  }

  getMember<K extends number | "length">(key: K): ArrayMembers<T>[K] {
    if (key === "length") {
      return ArrayLength as ArrayMembers<T>[K];
    }
    if (typeof key === "number" && key >= 0) {
      return this._itemSchema as ArrayMembers<T>[K];
    }
    throw new Error(`Invalid key for ArraySchema: ${key}`);
  }

  mutations(entry: ArrayEntry<T>): ArrayMutations<T> {
    return {
      push: (value: T) => {
        const currentLength = entry.getMember("length").get();
        entry.getMember(currentLength).set(value);
        entry.getMember("length").set(currentLength + 1);
      },
      pop: () =>
        entry
          .getMember("length")
          .set(Math.max(0, entry.getMember("length").get() - 1)),
      clear: () => entry.getMember("length").set(0),
    };
  }

  hasValue(entry: ArrayEntry<T>, _value: ArrayValue<T> | typeof VALUE_UNSET) {
    return entry.getMember("length").get() > 0;
  }

  unset(entry: ArrayEntry<T>) {
    entry.getMember("length").set(0);
  }
}

export function array<T extends Schema>(itemSchema: T) {
  return new ArraySchema<T>(itemSchema);
}
