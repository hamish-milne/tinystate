import type { Signal } from "@preact/signals";
export type ValueProp = "value" | "valueAsNumber" | "valueAsDate";
export type MethodProp = "onChange" | "onInput" | "onBlur";
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
export declare function formField<TValue extends ValueProp, T extends NonNullable<HTMLInputElement[TValue]>, TMethod extends MethodProp | Lowercase<MethodProp> = "onchange">(signal: Signal<T>, valueProp: TValue, method?: TMethod): {
    [method]: ({ target }: Event) => void;
    value: T;
};
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
export declare function formText<T extends string, TMethod extends MethodProp | Lowercase<MethodProp> = "onchange">(signal: Signal<T>, method?: TMethod): {
    [method]: ({ target }: Event) => void;
    value: T;
};
/**
 * Creates props for a checkbox input that syncs with a Signal.
 * @param signal A Signal to bind to
 * @returns An object to be spread onto a checkbox input element
 * @example
 * ```tsx
 * <input type="checkbox" {...formCheckbox(signal)} />
 * ```
 */
export declare function formCheckbox(signal: Signal<boolean>): {
    checked: boolean;
    onchange({ target }: Event): void;
    type: string;
};
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
export declare function formRadio<K extends string>(signal: Signal<K>, option: K): {
    checked: boolean;
    onchange({ target }: Event): void;
    value: K;
    type: string;
};
