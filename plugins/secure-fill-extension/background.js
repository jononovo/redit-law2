// SecureFill — service worker.
//
// Resolves a reference into a set of field values, then routes each value into
// the correct frame of the active tab. Values live only here and in the
// isolated content-script world; they are never exposed to the page's own
// JavaScript (where the assistant runs).
//
// Two resolution modes:
//   Mode B (client-held encrypted source): a stored encrypted source is
//     decrypted locally after fetching a one-time key by reference.
//   Mode A (server-sourced values): values are fetched directly by reference.
// Mode B is used whenever an encrypted source is configured.

const DEFAULT_API_BASE = "https://creditclaw.com/api/v1";
const VERSION = "1.0.0";

async function getConfig() {
  const { credential, encryptedSource, apiBase } = await chrome.storage.local.get([
    "credential",
    "encryptedSource",
    "apiBase",
  ]);
  return {
    credential: credential || null,
    encryptedSource: encryptedSource || null,
    apiBase: apiBase || DEFAULT_API_BASE,
  };
}

// --- byte helpers ---
function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
function b64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function concat(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

// AES-256-GCM decrypt. The stored source carries the authentication tag as its
// trailing 16 bytes; the one-time key payload also supplies the tag separately.
// WebCrypto expects ciphertext||tag, so we strip the trailing tag and reattach
// the authoritative one from the key payload.
async function decryptSource(encryptedSource, keyHex, ivHex, tagHex) {
  const key = await crypto.subtle.importKey("raw", hexToBytes(keyHex), { name: "AES-GCM" }, false, ["decrypt"]);
  const iv = hexToBytes(ivHex);
  const blob = b64ToBytes(encryptedSource);
  const body = blob.slice(0, -16);
  const cipherWithTag = concat(body, hexToBytes(tagHex));
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, cipherWithTag);
  return new TextDecoder().decode(plainBuf);
}

// Normalize resolved data into [{ token, value, dropdown, selector }].
// Accepts either an explicit { fields: [...] } shape or a flat key/value map
// (keys become tokens). No field semantics are hardcoded here.
function normalizeFields(obj) {
  if (obj && Array.isArray(obj.fields)) {
    return obj.fields.map((f) => ({
      token: String(f.token),
      value: String(f.value ?? ""),
      dropdown: !!f.dropdown,
      selector: f.selector || null,
    }));
  }
  if (obj && typeof obj === "object") {
    return Object.entries(obj)
      .filter(([, v]) => v != null && typeof v !== "object")
      .map(([k, v]) => ({ token: String(k), value: String(v), dropdown: false, selector: null }));
  }
  return [];
}

async function resolveFields(ref) {
  const { credential, encryptedSource, apiBase } = await getConfig();
  if (!credential) throw new Error("not_configured");

  if (encryptedSource) {
    const res = await fetch(`${apiBase}/bot/rail5/key`, {
      method: "POST",
      headers: { Authorization: `Bearer ${credential}`, "Content-Type": "application/json" },
      body: JSON.stringify({ checkout_id: ref }),
    });
    if (!res.ok) throw new Error(`key_fetch_failed_${res.status}`);
    const { key_hex, iv_hex, tag_hex } = await res.json();
    if (!key_hex || !iv_hex || !tag_hex) throw new Error("key_material_incomplete");
    const plain = await decryptSource(encryptedSource, key_hex, iv_hex, tag_hex);
    let parsed;
    try {
      parsed = JSON.parse(plain);
    } catch {
      throw new Error("decrypt_parse_failed");
    }
    return normalizeFields(parsed);
  }

  // Mode A requires a backend values endpoint. Fails explicitly if absent.
  const res = await fetch(`${apiBase}/bot/securefill/values`, {
    method: "POST",
    headers: { Authorization: `Bearer ${credential}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ref }),
  });
  if (!res.ok) throw new Error(`values_fetch_failed_${res.status}`);
  return normalizeFields(await res.json());
}

function wipe(fields) {
  for (const f of fields) {
    if (typeof f.value === "string") f.value = "0".repeat(f.value.length);
    f.value = null;
  }
}

function sendToFrame(tabId, frameId, msg) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, msg, { frameId }, (resp) => {
      void chrome.runtime.lastError;
      resolve(resp || null);
    });
  });
}

// Ask frames which tokens they can match (names only, no values), and record
// one frame per token so each value is sent only to the frame that needs it.
// Frames are queried in frameId order (top frame is 0) and the first match
// wins, so routing is deterministic rather than race-dependent. Descriptors
// carry the selector so detection is selector-aware.
async function mapTokensToFrames(tabId, descriptors) {
  const frames = await chrome.webNavigation.getAllFrames({ tabId }).catch(() => null);
  const map = {};
  if (!frames) return map;
  frames.sort((a, b) => a.frameId - b.frameId);
  for (const fr of frames) {
    const pending = descriptors.filter((d) => !(d.token in map));
    if (!pending.length) break;
    const resp = await sendToFrame(tabId, fr.frameId, { type: "SF_DETECT", descriptors: pending });
    if (resp && Array.isArray(resp.matched)) {
      for (const t of resp.matched) if (!(t in map)) map[t] = fr.frameId;
    }
  }
  return map;
}

async function handleFill(tabId, ref) {
  let fields;
  try {
    fields = await resolveFields(ref);
  } catch (e) {
    return { status: "error", reason: (e && e.message) || "resolve_failed" };
  }
  if (!fields.length) return { status: "error", reason: "no_fields" };

  const frameMap = await mapTokensToFrames(
    tabId,
    fields.map((f) => ({ token: f.token, selector: f.selector }))
  );
  const filled = [];
  await Promise.all(
    fields.map(async (f) => {
      const frameId = frameMap[f.token];
      if (frameId === undefined) return;
      const resp = await sendToFrame(tabId, frameId, {
        type: "SF_APPLY_ONE",
        token: f.token,
        value: f.value,
        dropdown: f.dropdown,
        selector: f.selector,
      });
      if (resp && resp.ok) filled.push(f.token);
    })
  );
  wipe(fields);
  return { status: filled.length ? "filled" : "fill_failed", fields_filled: filled };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "SF_FILL") {
    const tabId = sender.tab?.id;
    if (tabId == null) {
      sendResponse({ status: "error", reason: "no_tab" });
      return true;
    }
    handleFill(tabId, msg.ref).then(sendResponse);
    return true;
  }
  if (msg?.type === "SF_SETUP") {
    const toSet = {};
    if (msg.credential) toSet.credential = msg.credential;
    if (msg.encrypted_source) toSet.encryptedSource = msg.encrypted_source;
    if (msg.api_base) toSet.apiBase = msg.api_base;
    chrome.storage.local.set(toSet).then(() => sendResponse({ status: "ready" }));
    return true;
  }
  if (msg?.type === "SF_STATUS") {
    getConfig().then((c) =>
      sendResponse({
        configured: !!c.credential,
        has_credential: !!c.credential,
        has_source: !!c.encryptedSource,
        version: VERSION,
      })
    );
    return true;
  }
  if (msg?.type === "SF_CLEAR") {
    chrome.storage.local.remove(["credential", "encryptedSource"]).then(() => sendResponse({ status: "cleared" }));
    return true;
  }
});
