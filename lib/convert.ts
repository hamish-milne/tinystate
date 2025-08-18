import type { Empty, Schema } from "./common";
import { InvalidMemberError, MEMBERS_UNCHANGED, narrowing, VALUE_KEEP } from "./common";

type ConvertSchema<TIn, TOut> = Schema<TOut, TIn, Empty, Empty>;

export function convert<TIn, TOut>(
  getter: (parent: TIn) => TOut,
  setter: (value: TOut) => TIn,
): ConvertSchema<TIn, TOut> {
  return narrowing({
    compute(entry) {
      return getter(entry.parent.get(MEMBERS_UNCHANGED));
    },
    change(entry, value) {
      entry.parent.set(setter(value));
      return VALUE_KEEP;
    },
    getMember(): never {
      throw new InvalidMemberError();
    },
  });
}

/* v8 ignore start -- @preserve */
TEST: if (import.meta.vitest) {
  const { test, expect, vi } = import.meta.vitest;
  const { createRoot, scalar, object, extend } = await import("./");
  vi.useFakeTimers();

  test("convert round-trip", () => {
    const schema = extend(
      convert(
        (parent: { value: number }) => parent.value,
        (value: number) => ({ value }),
      ),
      { value: scalar(0) },
    );
    const entry = createRoot(
      object({
        value: scalar(0),
        converted: schema,
      }),
    ).member("converted");
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
