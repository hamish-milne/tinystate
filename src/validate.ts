import type { StandardSchemaV1 } from "@standard-schema/spec";
import { type MetadataTree, type PathPair, type StateValue, type Store, update } from "./core.js";

export type ValidationResult<T extends StateValue, V extends StateValue> = MetadataTree<
  T,
  { issue: string },
  { issueKeys: (keyof T extends symbol ? never : T)[]; validated: V | null }
>;

export type ValidationStore<TSchema extends StandardSchemaV1<StateValue, StateValue>> = Store<
  ValidationResult<StandardSchemaV1.InferInput<TSchema>, StandardSchemaV1.InferOutput<TSchema>>
>;

export async function validate<T extends StateValue, TResult extends StateValue>(
  data: T,
  metaStore: Store<ValidationResult<T, TResult>>,
  schema: StandardSchemaV1<T, TResult>,
): Promise<TResult | undefined> {
  const result = await schema["~standard"].validate(data);
  if (result.issues) {
    const issues = result.issues.map<[string, string]>((issue) => [
      (issue.path || [])
        .map((segment) => (typeof segment === "object" ? segment.key : segment))
        .join("."),
      issue.message,
    ]);
    const issueKeys = issues.map(([path]) => path as keyof T);
    update(
      metaStore,
      ...([
        ...issues.map(([path, issue]) => [path, { issue }] as const),
        ["issueKeys", issueKeys] as const,
        ["validated", null] as const,
      ] as PathPair<ValidationResult<T, TResult>>[]),
    );
    return undefined;
  }
  update(metaStore, ["validated", result.value] as const as PathPair<ValidationResult<T, TResult>>);
  return result.value;
}

/* v8 ignore start -- @preserve */
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;
  const { createStore, peek } = await import("./core.js");
  const { object, string, number, minValue, pipe } = await import("valibot");

  const schema = object({
    name: string(),
    age: pipe(number(), minValue(0)),
  });

  test("validate updates meta store with issues", async () => {
    const dataStore = createStore({ name: "Alice", age: -5 });
    const metaStore = createStore({}) as ValidationStore<typeof schema>;

    const result = await validate(peek(dataStore, ""), metaStore, schema);
    expect(result).toBeUndefined();
    expect(peek(metaStore, "issueKeys")).toEqual(["age"]);
    expect(peek(metaStore, "age")?.issue).toBe("Invalid value: Expected >=0 but received -5");
  });

  test("validate updates meta store with validated data", async () => {
    const dataStore = createStore({ name: "Bob", age: 30 });
    const metaStore = createStore({}) as ValidationStore<typeof schema>;

    const result = await validate(peek(dataStore, ""), metaStore, schema);
    expect(result).toEqual({ name: "Bob", age: 30 });
    expect(peek(metaStore, "issueKeys")).toBeUndefined();
    expect(peek(metaStore, "validated")).toEqual({ name: "Bob", age: 30 });
  });

  test("validate works when issue has no path", async () => {
    const testSchema: StandardSchemaV1<{ foo: string }, { foo: string }> = {
      "~standard": {
        async validate(_data: { foo: string }) {
          return {
            issues: [{ message: "General error" }],
          };
        },
        // biome-ignore lint/suspicious/noExplicitAny: for testing
      } as any,
    };
    const dataStore = createStore({ foo: "bar" });
    const metaStore = createStore({}) as ValidationStore<typeof testSchema>;
    const result = await validate(peek(dataStore, ""), metaStore, testSchema);
    expect(result).toBeUndefined();
    expect(peek(metaStore, "issueKeys")).toEqual([""]);
    expect(peek(metaStore, "").issue).toBe("General error");
  });

  test("validate works when paths are strings", async () => {
    const testSchema: StandardSchemaV1<{ foo: string }, { foo: string }> = {
      "~standard": {
        async validate(_data: { foo: string }) {
          return {
            issues: [{ message: "General error", path: ["foo"] }],
          };
        },
        // biome-ignore lint/suspicious/noExplicitAny: for testing
      } as any,
    };
    const dataStore = createStore({ foo: "bar" });
    const metaStore = createStore({}) as ValidationStore<typeof testSchema>;
    const result = await validate(peek(dataStore, ""), metaStore, testSchema);
    expect(result).toBeUndefined();
    expect(peek(metaStore, "issueKeys")).toEqual(["foo"]);
    expect(peek(metaStore, "foo").issue).toBe("General error");
  });
}
