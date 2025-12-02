import { listen, type PatchValue, peek, type StateValue, type Store, update } from "./core.js";

export type MethodProp = "change" | "input" | "blur";

const isInput = [HTMLInputElement];
const isTextInput = [...isInput, HTMLTextAreaElement, HTMLSelectElement];

function formAny<
  TElement extends HTMLElement,
  T extends StateValue,
  P extends PropertyKey,
  TMethod extends MethodProp = "change",
>(
  store: Store<{ [_ in P]: T }>,
  path: P,
  getter: (element: TElement, prev: T) => PatchValue<T>,
  setter: (element: TElement, value: T) => void,
  allowedTypes: { new (): TElement }[],
  method: TMethod = "change" as TMethod,
) {
  const handler: EventListener = ({ target }) => {
    for (const Type of allowedTypes) {
      if (target instanceof Type) {
        update(store, [path, getter(target, peek(store, path))]);
        break;
      }
    }
  };
  return {
    name: String(path),
    id: String(path),
    ref(node: TElement | null) {
      if (node) {
        node.addEventListener(method, handler);
        const unsubscribe = listen(store, path, (value) => setter(node, value as T), true);
        return () => {
          node.removeEventListener(method, handler);
          unsubscribe();
        };
      }
    },
  };
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
  TValue extends "value" | "valueAsNumber" | "valueAsDate",
  T extends NonNullable<HTMLInputElement[TValue]>,
  P extends PropertyKey,
  TMethod extends MethodProp = "change",
>(store: Store<{ [_ in P]: T }>, path: P, valueProp: TValue, method?: TMethod) {
  return formAny(
    store,
    path,
    (element) => element[valueProp] as T,
    (element, value) => {
      element[valueProp] = value ?? "";
    },
    isInput,
    method,
  );
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
  TMethod extends MethodProp = "change",
>(store: Store<{ [_ in P]: T }>, path: P, method?: TMethod) {
  return formAny<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, T, P, TMethod>(
    store,
    path,
    (element) => element.value as T,
    (element, value) => {
      element.value = value ?? "";
    },
    isTextInput,
    method,
  );
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
    ...formAny(
      store,
      path,
      (element) => element.checked,
      (element, value) => {
        element.checked = Boolean(value);
      },
      isInput,
    ),
    type: "checkbox",
  };
}

/**
 * Creates props for a checkbox input that syncs with an array in the store at the specified path.
 * The checked state reflects whether the option is included in the array.
 * @param store The Store object
 * @param path The path in the store to bind to
 * @param option The option value for this checkbox
 * @returns An object to be spread onto a checkbox input element
 * @example
 * ```tsx
 * <input type="checkbox" {...formCheckboxArray(store, "selectedItems", "item1")} /> Item 1
 * <input type="checkbox" {...formCheckboxArray(store, "selectedItems", "item2")} /> Item 2
 * ```
 */
export function formCheckboxArray<P extends PropertyKey, K extends StateValue>(
  store: Store<{ [_ in P]: K[] }>,
  path: P,
  option: K,
) {
  const name = [path, option].join(":");
  return {
    ...formAny(
      store,
      path,
      (element, prev) =>
        element.checked
          ? Array.from(new Set([...prev, option])).sort()
          : prev.filter((v) => v !== option),
      (element, value) => {
        element.checked = value.includes(option);
      },
      isInput,
    ),
    type: "checkbox",
    name,
    id: name,
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
    ...formAny(
      store,
      path,
      (element) => (element.checked ? option : undefined),
      (element, value) => {
        element.checked = value === option;
      },
      isInput,
    ),
    type: "radio",
    value: option,
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
    ref: formAny(
      store,
      path,
      (element) => element.open,
      (element, value) => {
        if (value) {
          element.showModal();
        } else {
          element.close();
        }
      },
      [HTMLDialogElement],
    ).ref,
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

  test("formCheckboxArray syncs array value", () => {
    const store = createStore({ selected: [] as string[] });
    const propsOption1 = formCheckboxArray(store, "selected", "option1");
    const propsOption2 = formCheckboxArray(store, "selected", "option2");
    const inputOption1 = document.createElement("input");
    Object.assign(inputOption1, propsOption1);
    const inputOption2 = document.createElement("input");
    Object.assign(inputOption2, propsOption2);
    const unsubscribeOption1 = propsOption1.ref(inputOption1);
    const unsubscribeOption2 = propsOption2.ref(inputOption2);
    expect(inputOption1.checked).toBe(false);
    expect(inputOption2.checked).toBe(false);
    patch(store, { selected: ["option2"] });
    expect(inputOption1.checked).toBe(false);
    expect(inputOption2.checked).toBe(true);
    inputOption1.checked = true;
    fireEvent.change(inputOption1);
    expect(peek(store, "selected")).toEqual(["option1", "option2"]);
    inputOption2.checked = false;
    fireEvent.change(inputOption2);
    expect(peek(store, "selected")).toEqual(["option1"]);
    unsubscribeOption1?.();
    unsubscribeOption2?.();
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
    fireEvent.change(inputBlue);
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
