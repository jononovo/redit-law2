// SecureFill — content script. Runs in every frame (isolated world).
//
// In ALL frames: handle detect/apply from the service worker, filling fields
// that exist in this frame. Values arrive only here and are never readable by
// the page's own JavaScript (where the assistant runs).
//
// In the TOP frame only: bridge window.postMessage requests from the page to
// the service worker. Two message namespaces are accepted and treated
// identically, so this is drop-in for either caller:
//   creditclaw-*  (what the secure-checkout / pairing skills post)
//   securefill-*  (neutral general-purpose name)
// The page sends only an opaque reference and receives only a status.
(() => {
  "use strict";
  const VERSION = "2.0.0";

  // --- every frame: detect + apply ---
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "SF_DETECT") {
      const matched = [];
      for (const d of msg.descriptors) {
        if (window.SecureFillDetect.findInput({ token: d.token, selector: d.selector, aliases: d.aliases })) {
          matched.push(d.token);
        }
      }
      sendResponse({ matched });
      return; // synchronous
    }
    if (msg?.type === "SF_APPLY_ONE") {
      const el = window.SecureFillDetect.findInput({ token: msg.token, selector: msg.selector, aliases: msg.aliases });
      if (!el) { sendResponse({ ok: false }); return; }
      sendResponse({ ok: window.SecureFillEngine.fill(el, msg.value, msg.dropdown) });
      return; // synchronous
    }
  });

  // --- top frame only: page <-> worker bridge ---
  if (window.top !== window) return;

  // Normalize both namespaces to a common command.
  function parse(type) {
    for (const ns of ["creditclaw-", "securefill-"]) {
      if (type.startsWith(ns)) return type.slice(ns.length); // ping | fill | status | ...
    }
    return null;
  }

  // Reply on BOTH namespaces so either caller sees its expected message.
  function reply(cmd, payload) {
    window.postMessage(Object.assign({ type: `securefill-${cmd}` }, payload), window.location.origin);
    window.postMessage(Object.assign({ type: `creditclaw-${cmd}` }, payload), window.location.origin);
    // Mirror ONLY fill results to the MAIN-world bridge (property polling).
    if (cmd === "fill-result") {
      window.postMessage({ __sf_channel: "result", payload }, window.location.origin);
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || typeof data.type !== "string") return;
    const cmd = parse(data.type);
    if (!cmd) return;

    switch (cmd) {
      case "ping":
        chrome.runtime.sendMessage({ type: "SF_STATUS" }, (s) => {
          void chrome.runtime.lastError;
          reply("pong", { ready: true, configured: !!(s && s.configured), version: VERSION });
        });
        break;

      case "status":
        chrome.runtime.sendMessage({ type: "SF_STATUS" }, (s) => {
          void chrome.runtime.lastError;
          reply("status-result", s || { configured: false, version: VERSION });
        });
        break;

      case "schema":
      case "tokens":
        // Non-secret: returns the token NAMES this source exposes so the agent
        // knows what to map. Never returns values.
        chrome.runtime.sendMessage({ type: "SF_SCHEMA" }, (r) => {
          void chrome.runtime.lastError;
          reply("schema-result", r || { profile: null, tokens: [] });
        });
        break;

      case "setup":
        // Pairing is agent-driven from page JS. Both field-name conventions
        // are accepted: { credential, encrypted_source } and
        // { api_key, encrypted_blob }. api_base is deliberately NOT forwarded
        // from the page: a page-settable backend URL would let a hostile page
        // redirect the next key fetch (with the real credential) to its own
        // server. The backend URL is settable only from the options page.
        chrome.runtime.sendMessage(
          {
            type: "SF_SETUP",
            credential: data.credential,
            api_key: data.api_key,
            encrypted_source: data.encrypted_source,
            encrypted_blob: data.encrypted_blob,
            profile: data.profile,
          },
          (r) => {
            void chrome.runtime.lastError;
            reply("setup-result", r || { status: "error" });
          }
        );
        break;

      case "clear":
        chrome.runtime.sendMessage({ type: "SF_CLEAR" }, (r) => {
          void chrome.runtime.lastError;
          reply("clear-result", r || { status: "error" });
        });
        break;

      case "fill": {
        // Accept the checkout skill shape {checkout_id, fields, targets} and
        // the neutral shape {ref}. Never accept inline values here.
        const ref = data.ref || data.checkout_id;
        if (!ref) { reply("fill-result", { status: "error", reason: "missing_ref" }); break; }
        // Reset the MAIN-world result property so pollers never read a stale
        // result from a previous fill.
        window.postMessage({ __sf_channel: "fill-start" }, window.location.origin);
        const request = { fields: data.fields, targets: data.targets };
        chrome.runtime.sendMessage({ type: "SF_FILL", ref, request }, (r) => {
          void chrome.runtime.lastError;
          reply("fill-result", r || { status: "error", reason: "no_response" });
        });
        break;
      }
    }
  });

  // Announce presence with real configured state (no round-trip needed for
  // simple detection; the MAIN-world ready flag is set separately).
  chrome.runtime.sendMessage({ type: "SF_STATUS" }, (s) => {
    void chrome.runtime.lastError;
    reply("pong", { ready: true, configured: !!(s && s.configured), version: VERSION });
  });
})();
