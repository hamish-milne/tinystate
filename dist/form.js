import {
  listen as T,
  update as h
} from "./core.js";
const d = [HTMLInputElement], m = [HTMLSelectElement], b = [
  ...d,
  HTMLTextAreaElement,
  ...m
];
function a(n, o, e, t, s, r = "change") {
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
        const i = T(n, o, (l) => t(c, l), !0);
        return () => {
          c.removeEventListener(r, p), i();
        };
      }
    }
  };
}
const S = {
  valueAsNumber: NaN,
  valueAsDate: null,
  value: ""
};
function O(n, o, e, t) {
  return a(
    n,
    o,
    (s) => s[e],
    (s, r = S[e]) => {
      s[e] = r;
    },
    d,
    t
  );
}
function v(n, o, e) {
  return a(
    n,
    o,
    (t) => t.value,
    (t, s = "") => {
      t.value = s;
    },
    b,
    e
  );
}
function g(n, o) {
  return {
    ...a(
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
function E(n, o, e) {
  const t = `${String(o)}:${String(e)}`;
  return {
    ...a(
      n,
      o,
      (s) => (r = []) => s.checked ? Array.from(/* @__PURE__ */ new Set([...r, e])).sort() : r.filter((p) => p !== e),
      (s, r = []) => {
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
    ...a(
      n,
      o,
      (t) => t.checked ? e : void 0,
      (t, s) => {
        t.checked = s === e;
      },
      d
    ),
    type: "radio",
    value: String(e)
  };
}
function B(n, o) {
  return {
    ...a(
      n,
      o,
      (e) => Array.from(e.selectedOptions).map((t) => t.value),
      (e, t = []) => {
        for (const s of Array.from(e.options))
          s.selected = t.includes(s.value);
      },
      m
    ),
    multiple: !0
  };
}
function A(n, o) {
  return {
    ref: a(
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
  A as dialogModal,
  g as formCheckbox,
  E as formCheckboxArray,
  O as formField,
  k as formRadio,
  B as formSelectMultiple,
  v as formText
};
//# sourceMappingURL=form.js.map
