import { type ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import type { Entry, Schema } from "./common";
import { formCheckbox, formField, formRadio, type MethodProp, type ValueProp } from "./helper";
import { createRootProxy, type ProxyOf } from "./proxy";

export function useStateRoot<T extends Schema>(schema: T) {
  const ref = useRef<ProxyOf<T>>(null);
  if (!ref.current) {
    ref.current = createRootProxy(schema);
  }
  return ref.current;
}

export function useWatch<T>(entry: Entry<T>) {
  const [value, setValue] = useState(entry.get());
  useEffect(() => entry.subscribe(setValue), [entry]);
  return value;
}

export function useFormField<
  TValue extends ValueProp,
  T extends NonNullable<HTMLInputElement[TValue]>,
  TMethod extends MethodProp,
>(entry: Entry<T>, valueProp: TValue = "value" as TValue, method: TMethod = "onChange" as TMethod) {
  return useMemo(
    () => formField(entry, valueProp, method) satisfies ComponentProps<"input">,
    [entry, valueProp, method],
  );
}

export function useFormCheckbox(entry: Entry<boolean>) {
  return useMemo(() => formCheckbox(entry) satisfies ComponentProps<"input">, [entry]);
}

export function useFormRadio<K extends string>(entry: Entry<K>, option: K) {
  return useMemo(() => formRadio(entry, option) satisfies ComponentProps<"input">, [entry, option]);
}
