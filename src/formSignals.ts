import type { Signal } from "@preact/signals";

export type ValueProp = "value" | "valueAsNumber" | "valueAsDate";
export type MethodProp = "onChange" | "onInput" | "onBlur";

function isInputElement(element: EventTarget | null): element is HTMLInputElement {
  return element instanceof HTMLInputElement;
}

/**
 * Creates props for a form field that syncs with a Signal.
 * @param signal A Signal to bind to
 * @param valueProp The property of the input element to bind, allowing for a string, number, or Date value
 * @param method The event method to listen for changes (default is "onChange")
 * @returns An object to be spread onto an input element
 * @example
 * ```tsx
 * <input {...formField(signal, "value", "onBlur")} />
 * ```
 */
export function formField<
  TValue extends ValueProp,
  T extends NonNullable<HTMLInputElement[TValue]>,
  TMethod extends MethodProp | Lowercase<MethodProp> = "onchange",
>(signal: Signal<T>, valueProp: TValue, method: TMethod = "onchange" as TMethod) {
  return {
    value: signal.value,
    [method]({ target }: Event) {
      if (isInputElement(target)) {
        const value = target[valueProp];
        if (value != null) {
          signal.value = value as T;
        }
      }
    },
  };
}

/**
 * Creates props for a text input, textarea, or select element that syncs with a Signal.
 * @param signal A Signal to bind to
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
  TMethod extends MethodProp | Lowercase<MethodProp> = "onchange",
>(signal: Signal<T>, method: TMethod = "onchange" as TMethod) {
  return {
    value: signal.value,
    [method]({ target }: Event) {
      if (
        isInputElement(target) ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        signal.value = target.value as T;
      }
    },
  };
}

/**
 * Creates props for a checkbox input that syncs with a Signal.
 * @param signal A Signal to bind to
 * @returns An object to be spread onto a checkbox input element
 * @example
 * ```tsx
 * <input type="checkbox" {...formCheckbox(signal)} />
 * ```
 */
export function formCheckbox(signal: Signal<boolean>) {
  return {
    checked: signal.value,
    onchange({ target }: Event) {
      if (isInputElement(target)) {
        signal.value = target.checked;
      }
    },
    type: "checkbox",
  };
}

/**
 * Creates props for a radio input that syncs with a Signal.
 * @param signal A Signal to bind to
 * @param option The option value for this radio button
 * @returns An object to be spread onto a radio input element
 * @example
 * ```tsx
 * <input type="radio" {...formRadio(signal, "red")} /> Red
 * <input type="radio" {...formRadio(signal, "blue")} /> Blue
 * ```
 */
export function formRadio<K extends string>(signal: Signal<K>, option: K) {
  return {
    checked: signal.value === option,
    onchange({ target }: Event) {
      if (isInputElement(target) && target.checked) {
        signal.value = option;
      }
    },
    value: option,
    type: "radio",
  };
}

/* v8 ignore start -- @preserve */
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;
  const { signal } = await import("@preact/signals");
  const { fireEvent } = await import("@testing-library/dom");

  test("formField syncs string value", () => {
    const sig = signal("Hello");
    const props = formField(sig, "value");
    const input = document.createElement("input");
    Object.assign(input, props);
    expect(input.value).toBe("Hello");
    input.value = "World";
    fireEvent.change(input);
    expect(sig.value).toBe("World");
  });

  test.for(["input", "select", "textarea"] as const)("formText with %s element", (element) => {
    const sig = signal("Initial");
    const props = formText(sig);
    const input = document.createElement(element);
    if (element === "select") {
      const option1 = document.createElement("option");
      option1.value = "Initial";
      option1.text = "Initial";
      const option2 = document.createElement("option");
      option2.value = "Updated";
      option2.text = "Updated";
      input.appendChild(option1);
      input.appendChild(option2);
    }
    Object.assign(input, props);
    expect(input.value).toBe("Initial");
    input.value = "Updated";
    fireEvent.change(input);
    expect(sig.value).toBe("Updated");
  });

  test("formCheckbox syncs boolean value", () => {
    const sig = signal(false);
    const props = formCheckbox(sig);
    const input = document.createElement("input");
    input.type = "checkbox";
    Object.assign(input, props);
    expect(input.checked).toBe(false);
    input.checked = true;
    fireEvent.change(input);
    expect(sig.value).toBe(true);
  });

  test("formRadio syncs string value", () => {
    const sig = signal("red" as string);
    const propsRed = formRadio(sig, "red");
    const propsBlue = formRadio(sig, "blue");
    const inputRed = document.createElement("input");
    const inputBlue = document.createElement("input");
    Object.assign(inputRed, propsRed);
    Object.assign(inputBlue, propsBlue);
    inputRed.type = "radio";
    inputBlue.type = "radio";
    expect(inputRed.checked).toBe(true);
    expect(inputBlue.checked).toBe(false);
    inputBlue.checked = true;
    fireEvent.change(inputRed);
    fireEvent.change(inputBlue);
    expect(sig.value).toBe("blue");
  });
}
