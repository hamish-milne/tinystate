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
  TMethod extends MethodProp | Lowercase<MethodProp> = "onChange",
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
export function formCheckbox<
  P extends Key,
  TMethod extends MethodProp | Lowercase<MethodProp> = "onChange",
>(store: Store<{ [_ in P]: boolean }>, path: P, method: TMethod = "onChange" as TMethod) {
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
  TMethod extends MethodProp | Lowercase<MethodProp> = "onChange",
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

/* v8 ignore start -- @preserve */
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;
  const { createStore } = await import("./state");

  test("formField syncs string value", () => {
    const store = createStore({ name: "Alice" });
    const props = formField(store, "name", "value");
    const input = document.createElement("input");
    const unsubscribe = props.ref(input);
    expect(input.value).toBe("Alice");
    setState(store, "name", "Bob");
    expect(input.value).toBe("Bob");
    input.value = "Charlie";
    // biome-ignore lint/suspicious/noExplicitAny: for testing
    (props as any).onChange({ target: input });
    expect(getState(store, "name")).toBe("Charlie");
    unsubscribe?.();
  });

  test("formCheckbox syncs boolean value", () => {
    const store = createStore({ subscribed: false as boolean });
    const props = formCheckbox(store, "subscribed", "onChange");
    const input = document.createElement("input");
    input.type = "checkbox";
    const unsubscribe = props.ref(input);
    expect(input.checked).toBe(false);
    setState(store, "subscribed", true);
    expect(input.checked).toBe(true);
    input.checked = false;
    // biome-ignore lint/suspicious/noExplicitAny: for testing
    (props as any).onChange({ target: input });
    expect(getState(store, "subscribed")).toBe(false);
    unsubscribe?.();
  });

  test("formRadio syncs string value", () => {
    const store = createStore({ color: "red" as string });
    const propsRed = formRadio(store, "color", "red", "onChange");
    const propsBlue = formRadio(store, "color", "blue", "onChange");
    const inputRed = document.createElement("input");
    inputRed.type = "radio";
    const inputBlue = document.createElement("input");
    inputBlue.type = "radio";
    const unsubscribeRed = propsRed.ref(inputRed);
    const unsubscribeBlue = propsBlue.ref(inputBlue);
    expect(inputRed.checked).toBe(true);
    expect(inputBlue.checked).toBe(false);
    setState(store, "color", "blue");
    expect(inputRed.checked).toBe(false);
    expect(inputBlue.checked).toBe(true);
    inputRed.checked = true;
    // biome-ignore lint/suspicious/noExplicitAny: for testing
    (propsRed as any).onChange({ target: inputRed });
    expect(getState(store, "color")).toBe("red");
    unsubscribeRed?.();
    unsubscribeBlue?.();
  });
}
