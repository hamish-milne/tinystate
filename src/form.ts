import { getState, type Key, listen, type Store, setState } from "./state";

export type ValueProp = "value" | "valueAsNumber" | "valueAsDate";
export type MethodProp = "onChange" | "onInput" | "onBlur";

export function formField<
  TValue extends ValueProp,
  T extends NonNullable<HTMLInputElement[TValue]>,
  P extends Key,
  TMethod extends MethodProp | Lowercase<MethodProp>,
>(store: Store<{ [_ in P]: T }>, path: P, valueProp: TValue, method: TMethod) {
  return {
    ref(node: HTMLInputElement | null) {
      if (node) {
        node[valueProp] = getState(store, path);
        return listen(store, path, (value) => {
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
        setState(store, path, value as T);
      }
    },
  };
}

export function formCheckbox<P extends Key, TMethod extends MethodProp | Lowercase<MethodProp>>(
  store: Store<{ [_ in P]: boolean }>,
  path: P,
  method: TMethod = "onChange" as TMethod,
) {
  return {
    ref(node: HTMLInputElement | null) {
      if (node) {
        node.checked = getState(store, path);
        return listen(store, path, (value) => {
          node.checked = value;
        });
      }
    },
    [method](event: Event) {
      const { target } = event;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      setState(store, path, target.checked);
    },
    type: "checkbox",
  };
}

export function formRadio<
  P extends Key,
  K extends string,
  TMethod extends MethodProp | Lowercase<MethodProp>,
>(store: Store<{ [_ in P]: K }>, path: P, option: K, method: TMethod = "onChange" as TMethod) {
  return {
    ref(node: HTMLInputElement | null) {
      if (node) {
        node.checked = getState(store, path) === option;
        return listen(store, path, (value) => {
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
        setState(store, path, option);
      }
    },
    value: option,
    type: "radio",
  };
}
