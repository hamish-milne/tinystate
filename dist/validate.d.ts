import type { StandardSchemaV1 } from "@standard-schema/spec";
import { type PathMap, type PathOf, type StateConstraint, type StateValue, type Store } from "./core.js";
/**
 * A PathMap representing the result of validating data against a schema.
 */
export type ValidationResult<T extends StateConstraint, V extends StateConstraint> = PathMap<{
    issues: {
        [K in PathOf<T>]: string;
    };
    validated?: V;
}>;
/**
 * A Store containing validation metadata for a specific schema.
 */
export type ValidationStore<TSchema extends StandardSchemaV1<StateValue, StateValue>> = Store<ValidationResult<StandardSchemaV1.InferInput<TSchema>, StandardSchemaV1.InferOutput<TSchema>>>;
/**
 * Validates data against a schema and updates the metaStore with validation results.
 * @param data The data to validate
 * @param metaStore The Store to hold validation metadata
 * @param schema The schema to validate against
 * @returns The validated data if valid, otherwise undefined
 */
export declare function validate<T extends StateConstraint, TResult extends StateConstraint>(data: T, metaStore: Store<ValidationResult<T, TResult>>, schema: StandardSchemaV1<T, TResult>): Promise<TResult | undefined>;
