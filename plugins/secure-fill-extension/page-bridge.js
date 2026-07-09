/*
 * page-bridge.js — runs in the page's MAIN world, top frame only.
 *
 * Exposes two documented, NON-SENSITIVE touch-points so a caller (e.g. the
 * secure-checkout skill) can detect the extension and observe a fill result
 * without ever receiving field values:
 *
 *   window.__creditclawExtensionReady  -> true
 *   window.__creditclawFillResult      -> { status, fields_filled, exp_month, exp_year, ... }
 *
 * The isolated content script posts status-only "__sf_channel" messages that we
 * mirror onto window.__creditclawFillResult. Plaintext never reaches this world.
 * On fill start the property is reset to null so pollers never read a stale
 * result from a previous fill.
 */
(() => {
  "use strict";
  if (window.top !== window) return;

  window.__creditclawExtensionReady = true;
  window.__creditclawFillResult = null;

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const d = event.data;
    if (!d || typeof d !== "object" || !d.__sf_channel) return;
    if (d.__sf_channel === "fill-start") {
      window.__creditclawFillResult = null;
      return;
    }
    if (d.__sf_channel !== "result") return;
    const { status, fields_filled, filled_tokens, exp_month, exp_year, errors, reason } = d.payload || {};
    window.__creditclawFillResult = {
      status, fields_filled, filled_tokens, exp_month, exp_year, errors, reason,
    };
  });
})();
