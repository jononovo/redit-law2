// SecureFill — field detection.
//
// Maps a field descriptor to an input/select element in the current document.
// Detection is driven ENTIRELY by the descriptor (its token / selector, which
// come from the resolved data). No field semantics are hardcoded — a token may
// be "username", "shipping-address", "one-time-code", "cc-number", anything.
(() => {
  function isFillable(el) {
    return el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA");
  }
  function isVisible(el) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none";
  }
  function fillableInputs() {
    return Array.from(
      document.querySelectorAll(
        "input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=image]), select, textarea"
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

  // Try one token: exact autocomplete, then exact name/id, then substring.
  function matchToken(rawToken, allowSubstring) {
    const token = (rawToken || "").toLowerCase().trim();
    if (!token) return null;

    let el = document.querySelector(
      `input[autocomplete="${CSS.escape(token)}"], select[autocomplete="${CSS.escape(token)}"], textarea[autocomplete="${CSS.escape(token)}"]`
    );
    if (el && isVisible(el)) return el;

    try {
      el = document.querySelector(`[name="${CSS.escape(token)}"], #${CSS.escape(token)}`);
      if (el && isFillable(el) && isVisible(el)) return el;
    } catch (_) {
      /* ignore */
    }

    if (allowSubstring) {
      const needle = token.replace(/[^a-z0-9]/g, "");
      if (needle) {
        for (const cand of fillableInputs()) {
          if (!isVisible(cand)) continue;
          if (contextString(cand).replace(/[^a-z0-9]/g, "").includes(needle)) return cand;
        }
      }
    }
    return null;
  }

  function findInput(descriptor) {
    // 1) Explicit selector always wins.
    if (descriptor.selector) {
      try {
        const el = document.querySelector(descriptor.selector);
        if (el && isFillable(el) && isVisible(el)) return el;
      } catch (_) {
        /* invalid selector — fall through */
      }
    }

    // 2) Primary token, including a broad substring pass.
    const primary = matchToken(descriptor.token, true);
    if (primary) return primary;

    // 3) Curated aliases — EXACT attribute matches only (no broad substring),
    // so they add coverage without wrong-field risk.
    if (Array.isArray(descriptor.aliases)) {
      for (const a of descriptor.aliases) {
        const el = matchToken(a, false);
        if (el) return el;
      }
    }
    return null;
  }

  window.SecureFillDetect = { findInput };
})();
