// SecureFill — field detection. Maps a field descriptor to an input element in
// the current document. Detection is driven entirely by the descriptor (its
// token / selector come from the resolved data), not by any hardcoded field
// semantics.
(() => {
  function isFillable(el) {
    return el && (el.tagName === "INPUT" || el.tagName === "SELECT");
  }
  function isVisible(el) {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function fillableInputs() {
    return Array.from(
      document.querySelectorAll(
        "input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]), select"
      )
    );
  }
  function contextString(el) {
    const parts = [
      (el.getAttribute("autocomplete") || "").toLowerCase(),
      (el.name || "").toLowerCase(),
      (el.id || "").toLowerCase(),
      (el.placeholder || "").toLowerCase(),
      (el.getAttribute("aria-label") || "").toLowerCase(),
    ];
    if (el.labels) for (const l of el.labels) parts.push((l.textContent || "").toLowerCase());
    return parts.join(" ");
  }

  function findInput(descriptor) {
    if (descriptor.selector) {
      try {
        const el = document.querySelector(descriptor.selector);
        if (el && isVisible(el)) return el;
      } catch (_) {
        /* invalid selector — fall through */
      }
    }
    const token = (descriptor.token || "").toLowerCase().trim();
    if (!token) return null;

    // 1) exact autocomplete attribute
    let el = document.querySelector(
      `input[autocomplete="${CSS.escape(token)}"], select[autocomplete="${CSS.escape(token)}"]`
    );
    if (el && isVisible(el)) return el;

    // 2) exact name / id
    try {
      el = document.querySelector(`[name="${CSS.escape(token)}"], #${CSS.escape(token)}`);
      if (el && isFillable(el) && isVisible(el)) return el;
    } catch (_) {
      /* ignore */
    }

    // 3) normalized substring across context attributes
    const needle = token.replace(/[^a-z0-9]/g, "");
    if (needle) {
      for (const cand of fillableInputs()) {
        if (!isVisible(cand)) continue;
        if (contextString(cand).replace(/[^a-z0-9]/g, "").includes(needle)) return cand;
      }
    }
    return null;
  }

  window.SecureFillDetect = { findInput };
})();
