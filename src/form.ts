import { listen, peek, type Store, update } from "./core.js";

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
  P extends PropertyKey,
  TMethod extends MethodProp | Lowercase<MethodProp> = "onchange",
>(
  store: Store<{ [_ in P]: T }>,
  path: P,
  valueProp: TValue,
  method: TMethod = "onchange" as TMethod,
) {
  return {
    name: String(path),
    id: String(path),
    ref(node: HTMLInputElement | null) {
      if (node) {
        return listen(
          store,
          path,
          (value) => {
            node[valueProp] = value ?? "";
          },
          true,
        );
      }
    },
    [method]({ target }: Event) {
      if (isInputElement(target)) {
        const value = target[valueProp];
        if (value != null) {
          update(store, [path, value as T]);
        }
      }
    },
  };
}

/**
 * Creates props for a text input, textarea, or select element that syncs with the store at the specified path.
 * @param store The Store object
 * @param path The path in the store to bind to
 * @param method The event method to listen for changes (default is "onChange")
 * @returns An object to be spread onto a text input, textarea, or select element
 * @example
 * ```tsx
 * <input type="text" {...formText(store, "firstName")} />
 * <textarea {...formText(store, "bio", "onInput")}></textarea>
 * <select {...formText(store, "country")}>
 *   <option value="us">United States</option>
 *   <option value="ca">Canada</option>
 * </select>
 * ```
 */
export function formText<
  T extends string,
  P extends PropertyKey,
  TMethod extends MethodProp | Lowercase<MethodProp> = "onchange",
>(store: Store<{ [_ in P]: T }>, path: P, method: TMethod = "onchange" as TMethod) {
  return {
    name: String(path),
    id: String(path),
    ref(node: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null) {
      if (node) {
        return listen(
          store,
          path,
          (value) => {
            node.value = value ?? "";
          },
          true,
        );
      }
    },
    [method]({ target }: Event) {
      if (
        isInputElement(target) ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        update(store, [path, target.value as T]);
      }
    },
  };
}

/**
 * Creates props for a checkbox input that syncs with the store at the specified path.
 * @param store The Store object
 * @param path The path in the store to bind to
 * @returns An object to be spread onto a checkbox input element
 * @example
 * ```tsx
 * <input type="checkbox" {...formCheckbox(store, "isSubscribed")} />
 * ```
 */
export function formCheckbox<P extends PropertyKey>(store: Store<{ [_ in P]: boolean }>, path: P) {
  return {
    name: String(path),
    id: String(path),
    ref(node: HTMLInputElement | null) {
      if (node) {
        return listen(
          store,
          path,
          (value) => {
            node.checked = value;
          },
          true,
        );
      }
    },
    onchange({ target }: Event) {
      if (isInputElement(target)) {
        update(store, [path, target.checked]);
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
 * @returns An object to be spread onto a radio input element
 * @example
 * ```tsx
 * <input type="radio" {...formRadio(store, "favoriteColor", "red")} /> Red
 * <input type="radio" {...formRadio(store, "favoriteColor", "blue")} /> Blue
 * ```
 */
export function formRadio<P extends PropertyKey, K extends string>(
  store: Store<{ [_ in P]: K }>,
  path: P,
  option: K,
) {
  return {
    name: String(path),
    id: String(path),
    ref(node: HTMLInputElement | null) {
      if (node) {
        return listen(
          store,
          path,
          (value) => {
            node.checked = value === option;
          },
          true,
        );
      }
    },
    onchange({ target }: Event) {
      if (isInputElement(target) && target.checked) {
        update(store, [path, option]);
      }
    },
    value: option,
    type: "radio",
  };
}

/**
 * Creates props for a dialog element that syncs its open state with the store at the specified path.
 * @param store The Store object
 * @param path The path in the store to bind to
 * @returns An object to be spread onto a dialog element
 * @example
 * ```tsx
 * <dialog {...dialogModal(store, "isDialogOpen")}>
 *   <p>This is a modal dialog.</p>
 * </dialog>
 * ```
 */
export function dialogModal<P extends PropertyKey>(store: Store<{ [_ in P]: boolean }>, path: P) {
  return {
    ref(node: HTMLDialogElement | null) {
      if (node) {
        return listen(
          store,
          path,
          (value) => {
            if (value) {
              node.showModal();
            } else {
              node.close();
            }
          },
          true,
        );
      }
    },
    onchange({ target }: Event) {
      if (target instanceof HTMLDialogElement) {
        update(store, [path, target.open]);
      }
    },
  };
}

/* v8 ignore start -- @preserve */
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;
  const { createStore, patch } = await import("./core.js");
  const { fireEvent } = await import("@testing-library/dom");

  test("formField syncs string value", () => {
    const store = createStore({ name: "Alice" });
    const props = formField(store, "name", "value");
    const input = document.createElement("input");
    Object.assign(input, props);
    const unsubscribe = props.ref(input);
    expect(input.value).toBe("Alice");
    update(store, ["name", "Bob"]);
    expect(input.value).toBe("Bob");
    input.value = "Charlie";
    fireEvent.change(input);
    expect(peek(store, "name")).toBe("Charlie");
    update(store, ["name", null as unknown as string]);
    expect(input.value).toBe("");
    unsubscribe?.();
  });

  test.for(["input", "select", "textarea"] as const)("formText with %s element", (element) => {
    const store = createStore({ name: "Alice" });
    const props = formText(store, "name");
    const input = document.createElement(element);
    if (element === "select") {
      for (const option of ["Alice", "Bob", "Charlie"]) {
        const opt = document.createElement("option");
        opt.value = option;
        input.appendChild(opt);
      }
    }
    Object.assign(input, props);
    const unsubscribe = props.ref(input);
    expect(input.value).toBe("Alice");
    update(store, ["name", "Bob"]);
    expect(input.value).toBe("Bob");
    input.value = "Charlie";
    fireEvent.change(input);
    expect(peek(store, "name")).toBe("Charlie");
    update(store, ["name", null as unknown as string]);
    expect(input.value).toBe("");
    unsubscribe?.();
  });

  test("formCheckbox syncs boolean value", () => {
    const store = createStore({ subscribed: false as boolean });
    const props = formCheckbox(store, "subscribed");
    const input = document.createElement("input");
    Object.assign(input, props);
    const unsubscribe = props.ref(input);
    expect(input.checked).toBe(false);
    patch(store, { subscribed: true });
    expect(input.checked).toBe(true);
    input.checked = false;
    fireEvent.change(input);
    expect(peek(store, "subscribed")).toBe(false);
    unsubscribe?.();
  });

  test("formRadio syncs string value", () => {
    const store = createStore({ color: "red" as string });
    const propsRed = formRadio(store, "color", "red");
    const propsBlue = formRadio(store, "color", "blue");
    const inputRed = document.createElement("input");
    Object.assign(inputRed, propsRed);
    const inputBlue = document.createElement("input");
    Object.assign(inputBlue, propsBlue);
    const unsubscribeRed = propsRed.ref(inputRed);
    const unsubscribeBlue = propsBlue.ref(inputBlue);
    expect(inputRed.checked).toBe(true);
    expect(inputBlue.checked).toBe(false);
    patch(store, { color: "blue" });
    expect(inputRed.checked).toBe(false);
    expect(inputBlue.checked).toBe(true);
    inputRed.checked = true;
    fireEvent.change(inputRed);
    expect(peek(store, "color")).toBe("red");
    unsubscribeRed?.();
    unsubscribeBlue?.();
  });

  test("dialogModal syncs dialog open state", () => {
    const store = createStore({ isOpen: false as boolean });
    const props = dialogModal(store, "isOpen");
    const dialog = document.createElement("dialog");
    Object.assign(dialog, props);
    const unsubscribe = props.ref(dialog);
    expect(dialog.open).toBe(false);
    patch(store, { isOpen: true });
    expect(dialog.open).toBe(true);
    dialog.close();
    fireEvent.change(dialog);
    expect(peek(store, "isOpen")).toBe(false);
    unsubscribe?.();
  });
}
