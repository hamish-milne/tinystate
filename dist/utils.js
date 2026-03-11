import { sync as n } from "./core.js";
function c(o, e, s) {
  return n(
    o,
    () => {
      const t = e.getItem(s);
      if (t)
        return JSON.parse(t);
    },
    (t) => {
      e.setItem(s, JSON.stringify(t));
    }
  );
}
/* v8 ignore start -- @preserve */
export {
  c as syncStorage
};
//# sourceMappingURL=utils.js.map
