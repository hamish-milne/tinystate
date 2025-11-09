import { getState, type Key, listen, type Store, setState } from "./state";

export type ValueProp = "value" | "valueAsNumber" | "valueAsDate";
export type MethodProp = "onChange" | "onInput" | "onBlur";

function isInputElement(element: EventTarget | null): element is HTMLInputElement {
  return element instanceof HTMLInputElement;
}

/**
 * Creates props for a form field that syncs with the store at the specified path.
 * @param store The Store object
 * @param path The path in the store to bind to
 * @param valueProp The property of the input element to bind, allowing for a string, number, or Date value
 * @param method The event method to listen for changes (default is "onChange")
 * @returns An object to be spread onto an input element
 * @example
 * ```tsx
 * <input {...formField(store, "username", "value", "onBlur")} />
 * ```
 */
export function formField<
  TValue extends ValueProp,
  T extends NonNullable<HTMLInputElement[TValue]>,
  P extends Key,
  TMethod extends MethodProp | Lowercase<MethodProp>,
>(
  store: Store<{ [_ in P]: T }>,
  path: P,
  valueProp: TValue,
  method: TMethod = "onChange" as TMethod,
) {
  return {
    ref(node: HTMLInputElement | null) {
      if (node) {
        node[valueProp] = getState(store, path);
        return listen(store, path, (value) => {
          node[valueProp] = value;
        });
      }
    },
    [method]({ target }: Event) {
      if (isInputElement(target)) {
        const value = target[valueProp];
        if (value != null) {
          setState(store, path, value as T);
        }
      }
    },
  };
}

/**
 * Creates props for a checkbox input that syncs with the store at the specified path.
 * @param store The Store object
 * @param path The path in the store to bind to
 * @param method The event method to listen for changes (default is "onChange")
 * @returns An object to be spread onto a checkbox input element
 * @example
 * ```tsx
 * <input type="checkbox" {...formCheckbox(store, "isSubscribed")} />
 * ```
 */
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
    [method]({ target }: Event) {
      if (isInputElement(target)) {
        setState(store, path, target.checked);
      }
    },
    type: "checkbox",
  };
}

/**
 * Creates props for a radio input that syncs with the store at the specified path.
 * @param store The Store object
 * @param path The path in the store to bind to
 * @param option The option value for this radio button
 * @param method The event method to listen for changes (default is "onChange")
 * @returns An object to be spread onto a radio input element
 * @example
 * ```tsx
 * <input type="radio" {...formRadio(store, "favoriteColor", "red")} /> Red
 * <input type="radio" {...formRadio(store, "favoriteColor", "blue")} /> Blue
 * ```
 */
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
    [method]({ target }: Event) {
      if (isInputElement(target) && target.checked) {
        setState(store, path, option);
      }
    },
    value: option,
    type: "radio",
  };
}
