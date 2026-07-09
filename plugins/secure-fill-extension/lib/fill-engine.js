// SecureFill — fill engine.
//
// Writes a value into an input/select/textarea and fires the events frameworks
// (React, Vue, Angular, Svelte) listen for, so the value registers as genuine
// user input. Value-type agnostic.
(() => {
  function setNativeValue(el, value) {
    const proto =
      el.tagName === "SELECT"
        ? HTMLSelectElement.prototype
        : el.tagName === "TEXTAREA"
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && desc.set) desc.set.call(el, value);
    else el.value = value;
  }

  function fill(el, value, dropdown) {
    try {
      el.focus();

      if (el.tagName === "SELECT" || dropdown) {
        const opts = Array.from(el.options || []);
        const match =
          opts.find((o) => o.value === value) ||
          opts.find((o) => (o.textContent || "").trim() === value) ||
          opts.find((o) => (o.textContent || "").trim().toLowerCase() === String(value).toLowerCase());
        if (match) el.value = match.value;
        else setNativeValue(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.blur();
        return true;
      }

      // Clear then set, so controlled inputs see a real transition.
      setNativeValue(el, "");
      el.dispatchEvent(new Event("input", { bubbles: true }));
      setNativeValue(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("blur", { bubbles: true }));
      return true;
    } catch (_) {
      return false;
    }
  }

  window.SecureFillEngine = { fill };
})();
