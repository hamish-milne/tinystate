import { type ArraySchema, array } from "./array";
import { type Empty, type Entry, isSchema, type Schema } from "./common";
import { type Computed, computed } from "./computed";
import { convert } from "./convert";
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
  TMethod extends MethodProp | Lowercase<MethodProp>,
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

export function formCheckbox<TMethod extends MethodProp | Lowercase<MethodProp>>(
  entry: Entry<boolean>,
  method: TMethod = "onChange" as TMethod,
) {
  return {
    ref(node: HTMLInputElement | null) {
      if (node) {
        return entry.subscribe((value) => {
          node.checked = value;
        });
      }
    },
    [method](event: Event) {
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

export function formRadio<K extends string, TMethod extends MethodProp | Lowercase<MethodProp>>(
  entry: Entry<K>,
  option: K,
  method: TMethod = "onChange" as TMethod,
) {
  return {
    ref(node: HTMLInputElement | null) {
      if (node) {
        return entry.subscribe((value) => {
          node.checked = value === option;
        });
      }
    },
    [method](event: Event) {
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

export function storage(zone: Storage, key: string, defaultValue: string) {
  return sync(
    () => zone.getItem(key) ?? defaultValue,
    (value) => zone.setItem(key, value),
  );
}

export function fromJsonString<T>() {
  return convert<string, T>(JSON.parse, JSON.stringify);
}

export function toJsonString<T>() {
  return convert<T, string>(JSON.stringify, JSON.parse);
}

/* v8 ignore start -- @preserve */
TEST: if (import.meta.vitest) {
  const { test, expect, vi } = import.meta.vitest;
  const { KIND_SCALAR, KIND_WIDENING, createRoot, scalar, extend, extendDynamic } = await import(
    "./"
  );
  vi.useFakeTimers();

  test("schema of scalar", () => {
    const obj = schema(42);
    expect(obj.kind).toBe(KIND_SCALAR);
  });

  test("schema of object", () => {
    const obj = schema({ a: 1, b: "test" });
    expect(obj.kind).toBe(KIND_WIDENING);
    expect(obj.computeDefault()).toEqual({ a: 1, b: "test" });
  });

  test("schema of array", () => {
    const obj = schema([]);
    expect(obj.kind).toBe(KIND_WIDENING);
  });

  test("form field", () => {
    const entry = createRoot(scalar("test"));
    const field = formField(entry, "value", "oninput");
    expect(field.defaultValue).toBe("test");
    const node = document.createElement("input");
    Object.assign(node, field);
    field.ref(node);
    expect(node.value).toBe("test");
    node.value = "changed";
    node.dispatchEvent(new Event("input"));
    vi.runAllTimers();
    expect(entry.get()).toBe("changed");
  });

  test("form checkbox", () => {
    const entry = createRoot(scalar(false));
    const checkbox = formCheckbox(entry, "onchange");
    const node = document.createElement("input");
    Object.assign(node, checkbox);
    node.type = "checkbox";
    checkbox.ref(node);
    expect(node.checked).toBe(false);
    node.checked = true;
    node.dispatchEvent(new Event("change"));
    vi.runAllTimers();
    expect(entry.get()).toBe(true);
  });

  test("form radio", () => {
    const entry = createRoot(scalar("option1"));
    const radio1 = formRadio(entry, "option1", "onchange");
    const radio2 = formRadio(entry, "option2", "onchange");
    const node1 = document.createElement("input");
    const node2 = document.createElement("input");
    Object.assign(node1, radio1);
    Object.assign(node2, radio2);
    radio1.ref(node1);
    radio2.ref(node2);
    expect(node1.checked).toBe(true);
    expect(node2.checked).toBe(false);
    node2.checked = true;
    node2.dispatchEvent(new Event("change"));
    vi.runAllTimers();
    expect(entry.get()).toBe("option2");
    expect(node1.checked).toBe(false);
    expect(node2.checked).toBe(true);
  });

  test("storage with JSON", () => {
    const obj = { a: 1, b: "test" };
    const zone = window.localStorage;
    zone.clear();
    const schema = extend(storage(zone, "testKey", "{}"), {
      value: extendDynamic(fromJsonString<typeof obj>()),
    });
    const entry = createRoot(schema).value;
    expect(entry.get()).toEqual({});
    entry.set(obj);
    vi.runAllTimers();
    expect(zone.getItem("testKey")).toBe(JSON.stringify(obj));
    expect(entry.get()).toEqual(obj);
    zone.setItem("testKey", JSON.stringify({ a: 2, b: "updated" }));
    entry.parent.invalidate();
    vi.runAllTimers();
    expect(entry.get()).toEqual({ a: 2, b: "updated" });
    expect(entry.b.get()).toBe("updated");
    zone.removeItem("testKey");
    entry.parent.invalidate();
    vi.runAllTimers();
    expect(entry.get()).toEqual({});
  });
}
