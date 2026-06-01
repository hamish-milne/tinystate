import { listen as b, update as h } from "./core.js";
const d = [HTMLInputElement], f = [HTMLSelectElement], x = [...d, HTMLTextAreaElement, ...f];
function u(n, o, e, t, s, r = "change") {
  const p = ({ target: c }) => {
    for (const i of s)
      if (c instanceof i) {
        h(n, [o, e(c)]);
        break;
      }
  };
  return {
    name: String(o),
    id: String(o),
    ref(c) {
      if (c) {
        c.addEventListener(r, p);
        const i = b(n, o, (a) => t(c, a), !0);
        return () => {
          c.removeEventListener(r, p), i();
        };
      }
    }
  };
}
function y(n, o, e, t) {
  return u(
    n,
    o,
    (s) => s[e],
    (s, r) => {
      s[e] = r ?? "";
    },
    d,
    t
  );
}
function O(n, o, e) {
  return u(
    n,
    o,
    (t) => t.value,
    (t, s) => {
      t.value = s ?? "";
    },
    x,
    e
  );
}
function T(n, o) {
  return {
    ...u(
      n,
      o,
      (e) => e.checked,
      (e, t) => {
        e.checked = !!t;
      },
      d
    ),
    type: "checkbox"
  };
}
function v(n, o, e) {
  const t = [o, e].join(":");
  return {
    ...u(
      n,
      o,
      (s) => (r) => s.checked ? Array.from(/* @__PURE__ */ new Set([...r, e])).sort() : r.filter((p) => p !== e),
      (s, r) => {
        s.checked = r.includes(e);
      },
      d
    ),
    type: "checkbox",
    name: t,
    id: t
  };
}
function k(n, o, e) {
  return {
    ...u(
      n,
      o,
      (t) => t.checked ? e : void 0,
      (t, s) => {
        t.checked = s === e;
      },
      d
    ),
    type: "radio",
    value: e
  };
}
function B(n, o) {
  return {
    ...u(
      n,
      o,
      (e) => Array.from(e.selectedOptions).map((t) => t.value),
      (e, t) => {
        for (const s of Array.from(e.options))
          s.selected = t.includes(s.value);
      },
      f
    ),
    multiple: !0
  };
}
function P(n, o) {
  return {
    ref: u(
      n,
      o,
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
  P as dialogModal,
  T as formCheckbox,
  v as formCheckboxArray,
  y as formField,
  k as formRadio,
  B as formSelectMultiple,
  O as formText
};
//# sourceMappingURL=form.js.map
