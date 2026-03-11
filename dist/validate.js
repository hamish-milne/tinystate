import {
  update as l
} from "./core.js";
async function v(i, s, d) {
  const t = await d["~standard"].validate(i);
  if (t.issues) {
    const c = t.issues.map((a) => [
      (a.path || []).map((e) => typeof e == "object" ? e.key : e).join("."),
      a.message
    ]);
    l(
      s,
      ["issues", null],
      ...c.map(([a, e]) => [`issues.${a}`, e]),
      ["validated", null]
    );
    return;
  }
  return l(
    s,
    ["issues", null],
    ["validated", t.value]
  ), t.value;
}
/* v8 ignore start -- @preserve */
export {
  v as validate
};
//# sourceMappingURL=validate.js.map
