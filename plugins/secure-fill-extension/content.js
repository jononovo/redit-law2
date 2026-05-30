// SecureFill — content script. Runs in every frame.
//
// In ALL frames: handles detect/apply requests from the service worker, filling
// fields that exist in this frame. Values arrive only here (isolated world) and
// are never readable by the page's own JavaScript.
//
// In the TOP frame only: bridges window.postMessage requests from the page
// (where the assistant runs) to the service worker. The assistant only ever
// sends an opaque reference; it never sends or receives field values.
(() => {
  const VERSION = "1.0.0";

  // --- every frame: detect + apply ---
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "SF_DETECT") {
      const matched = [];
      for (const d of msg.descriptors) {
        if (window.SecureFillDetect.findInput({ token: d.token, selector: d.selector })) matched.push(d.token);
      }
      sendResponse({ matched });
      return; // synchronous
    }
    if (msg?.type === "SF_APPLY_ONE") {
      const el = window.SecureFillDetect.findInput({ token: msg.token, selector: msg.selector });
      if (!el) {
        sendResponse({ ok: false });
        return;
      }
      sendResponse({ ok: window.SecureFillEngine.fill(el, msg.value, msg.dropdown) });
      return; // synchronous
    }
  });

  // --- top frame only: page <-> worker bridge ---
  if (window.top !== window) return;

  function post(type, payload) {
    window.postMessage(Object.assign({ type }, payload), window.location.origin);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || typeof data.type !== "string" || !data.type.startsWith("securefill-")) return;

    switch (data.type) {
      case "securefill-ping":
        chrome.runtime.sendMessage({ type: "SF_STATUS" }, (s) => {
          void chrome.runtime.lastError;
          post("securefill-pong", { ready: true, configured: !!(s && s.configured), version: VERSION });
        });
        break;
      case "securefill-status":
        chrome.runtime.sendMessage({ type: "SF_STATUS" }, (s) => {
          void chrome.runtime.lastError;
          post("securefill-status-result", s || { configured: false, version: VERSION });
        });
        break;
      case "securefill-setup":
        chrome.runtime.sendMessage(
          { type: "SF_SETUP", credential: data.credential, encrypted_source: data.encrypted_source, api_base: data.api_base },
          (r) => {
            void chrome.runtime.lastError;
            post("securefill-setup-result", r || { status: "error" });
          }
        );
        break;
      case "securefill-fill":
        if (!data.ref) {
          post("securefill-fill-result", { status: "error", reason: "missing_ref" });
          break;
        }
        chrome.runtime.sendMessage({ type: "SF_FILL", ref: data.ref }, (r) => {
          void chrome.runtime.lastError;
          post("securefill-fill-result", r || { status: "error", reason: "no_response" });
        });
        break;
      case "securefill-clear":
        chrome.runtime.sendMessage({ type: "SF_CLEAR" }, (r) => {
          void chrome.runtime.lastError;
          post("securefill-clear-result", r || { status: "error" });
        });
        break;
    }
  });

  // Announce presence so the page can detect the extension without a round-trip.
  post("securefill-pong", { ready: true, configured: false, version: VERSION });
})();
