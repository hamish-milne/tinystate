function i(e) {
  return e instanceof HTMLInputElement;
}
function r(e, t, n = "onchange") {
  return {
    value: e.value,
    [n]({ target: p }) {
      if (i(p)) {
        const o = p[t];
        o != null && (e.value = o);
      }
    }
  };
}
function d(e, t = "onchange") {
  return {
    value: e.value,
    [t]({ target: n }) {
      (i(n) || n instanceof HTMLTextAreaElement || n instanceof HTMLSelectElement) && (e.value = n.value);
    }
  };
}
function m(e) {
  return {
    checked: e.value,
    onchange({ target: t }) {
      i(t) && (e.value = t.checked);
    },
    type: "checkbox"
  };
}
function v(e, t) {
  return {
    checked: e.value === t,
    onchange({ target: n }) {
      i(n) && n.checked && (e.value = t);
    },
    value: t,
    type: "radio"
  };
}
/* v8 ignore start -- @preserve */
export {
  m as formCheckbox,
  r as formField,
  v as formRadio,
  d as formText
};
//# sourceMappingURL=formSignals.js.map
