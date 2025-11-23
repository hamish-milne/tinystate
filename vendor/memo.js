import { createElement } from "preact";

/**
 * Check if two objects have a different shape
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
export function shallowDiffers(a, b) {
  for (const i in a) if (i !== "__source" && !(i in b)) return true;
  for (const i in b) if (i !== "__source" && a[i] !== b[i]) return true;
  return false;
}

/**
 * Memoize a component, so that it only updates when the props actually have
 * changed. This was previously known as `React.pure`.
 * @param {import('./internal').FunctionComponent} c functional component
 * @param {(prev: object, next: object) => boolean} [comparer] Custom equality function
 * @returns {import('./internal').FunctionComponent}
 */
export function memo(c, comparer) {
  function shouldUpdate(nextProps) {
    const ref = this.props.ref;
    const updateRef = ref == nextProps.ref;
    if (!updateRef && ref) {
      ref.call ? ref(null) : (ref.current = null);
    }

    if (!comparer) {
      return shallowDiffers(this.props, nextProps);
    }

    return !comparer(this.props, nextProps) || !updateRef;
  }

  function Memoed(props) {
    this.shouldComponentUpdate = shouldUpdate;
    return createElement(c, props);
  }
  Memoed.displayName = "Memo(" + (c.displayName || c.name) + ")";
  Memoed.prototype.isReactComponent = true;
  Memoed.type = c;
  return Memoed;
}
