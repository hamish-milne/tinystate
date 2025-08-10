import { type ArraySchema, array } from "./array";
import { type Empty, type Entry, isSchema, type Schema } from "./common";
import { type Computed, computed } from "./computed";
import { type ObjectSchema, object } from "./object";
import { type Scalar, scalar } from "./scalar";
import { sync } from "./sync";

type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true
  : false;

type IsWritable<O extends Record<any, any>, P extends keyof O> = Equals<
  { [_ in P]: O[P] },
  { -readonly [_ in P]: O[P] }
>;

// We need to wrap the type parameter in a tuple to ensure it is treated non-distributively.
// https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
// biome-ignore format: keep this big ternary chain nicely lined up
export type SchemaOf<T> =
  [T] extends [Schema] ? T :
  [T] extends [boolean | string | number | null | undefined | symbol] ? Scalar<T> :
  [T] extends [readonly (infer V)[]] ? ArraySchema<SchemaOf<V>> :
  [T] extends [Map<any, any>] ? never:
  [T] extends [Set<any>] ? never :
  [T] extends [Record<any, any>] ? ObjectSchema<{
    [K in keyof T]: IsWritable<T, K> extends true ? SchemaOf<T[K]> : Computed<T[K], T, Empty>
  }> :
  never;

export function schema<T>(defaultValue: T): SchemaOf<T>;
export function schema(defaultValue: unknown): Schema {
  switch (typeof defaultValue) {
    case "object":
      if (defaultValue === null) {
        return scalar(null);
      } else if (isSchema(defaultValue)) {
        return defaultValue;
      } else if (Array.isArray(defaultValue)) {
        return array(scalar(defaultValue[0]));
      } else {
        return object(
          Object.fromEntries(
            Object.entries(defaultValue).map<[string, Schema]>(([key, value]) => {
              const { get, set } = Object.getOwnPropertyDescriptor(defaultValue, key) ?? {};
              if (get && set) {
                return [key, sync(get.bind(defaultValue), set.bind(defaultValue))];
              } else if (get) {
                return [key, computed(Function.call.bind(get))];
              } else {
                return [key, schema<unknown>(value)];
              }
            }),
          ),
        );
      }
    default:
      return scalar(defaultValue);
  }
}

export type ValueProp = "value" | "valueAsNumber" | "valueAsDate";
export type MethodProp = "onChange" | "onInput" | "onBlur";

export function formField<
  TValue extends ValueProp,
  T extends NonNullable<HTMLInputElement[TValue]>,
  TMethod extends MethodProp,
>(entry: Entry<T>, valueProp: TValue, method: TMethod) {
  return {
    ref(node: HTMLInputElement | null) {
      if (node) {
        return entry.subscribe((value) => {
          node[valueProp] = value;
        });
      }
    },
    [method](event: Event) {
      const { target } = event;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      const value = target[valueProp];
      if (value != null) {
        entry.set(value as T);
      }
    },
    defaultValue: String(entry.get()),
  };
}

export function formCheckbox(entry: Entry<boolean>) {
  return {
    ref(node: HTMLInputElement | null) {
      if (node) {
        return entry.subscribe((value) => {
          node.checked = value;
        });
      }
    },
    onChange(event: Event) {
      const { target } = event;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      entry.set(target.checked);
    },
    defaultChecked: entry.get(),
    type: "checkbox",
  };
}

export function formRadio<K extends string>(entry: Entry<K>, option: K) {
  return {
    ref(node: HTMLInputElement | null) {
      if (node) {
        return entry.subscribe((value) => {
          if (option === value) {
            node.checked = true;
          }
        });
      }
    },
    onChange(event: Event) {
      const { target } = event;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      if (target.checked) {
        entry.set(option);
      }
    },
    defaultChecked: entry.get() === option,
    value: option,
    type: "radio",
  };
}
