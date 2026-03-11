import { listen as b, update as f } from "./core.js";
const a = [HTMLInputElement], x = [...a, HTMLTextAreaElement, HTMLSelectElement];
function u(o, n, e, t, r, s = "change") {
  const p = ({ target: c }) => {
    for (const i of r)
      if (c instanceof i) {
        f(o, [n, e(c)]);
        break;
      }
  };
  return {
    name: String(n),
    id: String(n),
    ref(c) {
      if (c) {
        c.addEventListener(s, p);
        const i = b(o, n, (l) => t(c, l), !0);
        return () => {
          c.removeEventListener(s, p), i();
        };
      }
    }
  };
}
function T(o, n, e, t) {
  return u(
    o,
    n,
    (r) => r[e],
    (r, s) => {
      r[e] = s ?? "";
    },
    a,
    t
  );
}
function k(o, n, e) {
  return u(
    o,
    n,
    (t) => t.value,
    (t, r) => {
      t.value = r ?? "";
    },
    x,
    e
  );
}
function B(o, n) {
  return {
    ...u(
      o,
      n,
      (e) => e.checked,
      (e, t) => {
        e.checked = !!t;
      },
      a
    ),
    type: "checkbox"
  };
}
function E(o, n, e) {
  const t = [n, e].join(":");
  return {
    ...u(
      o,
      n,
      (r) => (s) => r.checked ? Array.from(/* @__PURE__ */ new Set([...s, e])).sort() : s.filter((p) => p !== e),
      (r, s) => {
        r.checked = s.includes(e);
      },
      a
    ),
    type: "checkbox",
    name: t,
    id: t
  };
}
function O(o, n, e) {
  return {
    ...u(
      o,
      n,
      (t) => t.checked ? e : void 0,
      (t, r) => {
        t.checked = r === e;
      },
      a
    ),
    type: "radio",
    value: e
  };
}
function v(o, n) {
  return {
    ref: u(
      o,
      n,
      (e) => e.open,
      (e, t) => {
        t ? e.showModal() : e.close();
      },
      [HTMLDialogElement]
    ).ref
  };
}
/* v8 ignore start -- @preserve */
export {
  v as dialogModal,
  B as formCheckbox,
  E as formCheckboxArray,
  T as formField,
  O as formRadio,
  k as formText
};
//# sourceMappingURL=form.js.map
