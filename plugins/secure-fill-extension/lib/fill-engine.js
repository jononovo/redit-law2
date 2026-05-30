// SecureFill — fill engine. Writes a value into an input or select and fires the
// events that frameworks (React, Vue, etc.) listen for, so the value is
// registered as genuine user input.
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
          opts.find((o) => (o.textContent || "").trim() === value);
        if (match) el.value = match.value;
        else setNativeValue(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
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
