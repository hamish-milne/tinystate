import { type StateConstraint, type Store } from "./core.js";
export type MethodProp = "change" | "input" | "blur";
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
export declare function formField<TValue extends "value" | "valueAsNumber" | "valueAsDate", T extends NonNullable<HTMLInputElement[TValue]>, P extends PropertyKey, TMethod extends MethodProp = "change">(store: Store<{
    [_ in P]: T;
}>, path: P, valueProp: TValue, method?: TMethod): {
    name: string;
    id: string;
    ref(node: HTMLInputElement | null): (() => void) | undefined;
};
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
export declare function formText<T extends string, P extends PropertyKey, TMethod extends MethodProp = "change">(store: Store<{
    [_ in P]: T;
}>, path: P, method?: TMethod): {
    name: string;
    id: string;
    ref(node: HTMLSelectElement | HTMLInputElement | HTMLTextAreaElement | null): (() => void) | undefined;
};
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
export declare function formCheckbox<P extends PropertyKey>(store: Store<{
    [_ in P]: boolean;
}>, path: P): {
    type: string;
    name: string;
    id: string;
    ref(node: HTMLInputElement | null): (() => void) | undefined;
};
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
export declare function formCheckboxArray<P extends PropertyKey, K extends StateConstraint>(store: Store<{
    [_ in P]: K[];
}>, path: P, option: K): {
    type: string;
    name: string;
    id: string;
    ref(node: HTMLInputElement | null): (() => void) | undefined;
};
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
export declare function formRadio<P extends PropertyKey, K extends string>(store: Store<{
    [_ in P]: K;
}>, path: P, option: K): {
    type: string;
    value: K;
    name: string;
    id: string;
    ref(node: HTMLInputElement | null): (() => void) | undefined;
};
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
export declare function dialogModal<P extends PropertyKey>(store: Store<{
    [_ in P]: boolean;
}>, path: P): {
    ref: (node: HTMLDialogElement | null) => (() => void) | undefined;
};
