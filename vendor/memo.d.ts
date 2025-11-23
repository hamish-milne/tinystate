import type * as preact1 from "preact";

export function memo<P = {}>(
  component: preact1.FunctionalComponent<P>,
  comparer?: (prev: P, next: P) => boolean,
): preact1.FunctionComponent<P>;
export function memo<C extends preact1.FunctionalComponent<any>>(
  component: C,
  comparer?: (prev: preact1.ComponentProps<C>, next: preact1.ComponentProps<C>) => boolean,
): C;
