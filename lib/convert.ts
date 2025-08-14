import type { AnyMembers, Empty, Schema } from "./common";
import { narrowing, VALUE_KEEP } from "./common";

type ConvertSchema<TIn, TOut, TMembers extends AnyMembers> = Schema<TOut, TIn, TMembers, Empty>;

export function convert<TIn, TOut, TMembers extends AnyMembers>(
  getter: (parent: TIn) => TOut,
  setter: (value: TOut) => TIn,
  members: TMembers = {} as TMembers,
): ConvertSchema<TIn, TOut, TMembers> {
  return narrowing({
    compute(entry, _value) {
      return getter(entry.parent.get());
    },
    change(entry, value) {
      entry.parent.set(setter(value));
      return VALUE_KEEP;
    },
    getMember<K extends keyof TMembers>(key: K) {
      return members[key];
    },
  });
}

/* v8 ignore start -- @preserve */
TEST: if (import.meta.vitest) {
  const { test, expect, vi } = import.meta.vitest;
  const { createRoot, scalar, object } = await import("./");
  vi.useFakeTimers();

  test("convert round-trip", () => {
    const schema = convert(
      (parent: { value: number }) => parent.value,
      (value: number) => ({ value }),
      { value: scalar(0) },
    );
    const entry = createRoot(
      object({
        value: scalar(0),
        converted: schema,
      }),
    ).$("converted");
    expect(entry.get()).toEqual(0);
    expect(entry.parent.get()).toEqual({ value: 0 });
    entry.set(42);
    vi.runAllTimers();
    expect(entry.get()).toEqual(42);
    expect(entry.parent.get()).toEqual({ value: 42 });
    entry.parent.set({ value: 100 });
    vi.runAllTimers();
    expect(entry.get()).toEqual(100);
    expect(entry.parent.get()).toEqual({ value: 100 });
  });
}
