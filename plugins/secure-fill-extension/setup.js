"use strict";
const $ = (id) => document.getElementById(id);

function refresh() {
  chrome.runtime.sendMessage({ type: "SF_STATUS" }, (s) => {
    void chrome.runtime.lastError;
    const on = !!(s && s.configured);
    $("dot").className = "dot " + (on ? "on" : "off");
    $("statusText").textContent = on
      ? "Connected" + (s.has_source ? " · source loaded" : " · no source")
      : "Not connected";
    $("version").textContent = s ? "v" + s.version : "—";
    $("form").classList.toggle("hide", on);
    $("disconnect").classList.toggle("hide", !on);
  });
}

$("save").addEventListener("click", () => {
  const credential = $("credential").value.trim();
  const encrypted_source = $("source").value.trim();
  const api_base = $("apiBase").value.trim();
  const profile = $("profile").value;
  if (!credential) { $("statusText").textContent = "Enter a credential"; return; }
  const payload = { type: "SF_SETUP", credential, profile };
  if (encrypted_source) payload.encrypted_source = encrypted_source;
  if (api_base) payload.api_base = api_base;
  chrome.runtime.sendMessage(payload, (r) => {
    void chrome.runtime.lastError;
    if (r && r.status === "ready") {
      $("credential").value = ""; $("source").value = "";
    } else {
      $("statusText").textContent = (r && r.reason) || "Setup failed";
    }
    refresh();
  });
});

$("disconnect").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "SF_CLEAR" }, () => { void chrome.runtime.lastError; refresh(); });
});

refresh();
