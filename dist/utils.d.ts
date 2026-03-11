import { type StateConstraint, type StoreOf } from "./core.js";
export declare function syncStorage<T extends StateConstraint>(store: StoreOf<T>, storage: Storage, key: string): () => void;
