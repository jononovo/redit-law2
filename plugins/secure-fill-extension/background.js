// SecureFill — service worker.
//
// Resolves an opaque reference into a set of field values, then routes each
// value into the correct frame of the active tab. Values live only here and in
// the isolated content-script world; they are NEVER exposed to the page's own
// JavaScript (where the calling assistant runs). The assistant sends only a
// reference and receives only a status.
//
// Value-type agnostic: a resolved record can hold a login, a token, an
// address, a phone number — anything kept out of the assistant context.
//
// Resolution (filler model): a single encrypted source is held locally; on a
// fill request the worker fetches a one-time key by reference and decrypts.

import { canonicalize, detectAliases, profileTokens, META_ALLOWLIST } from "./profiles.js";

const DEFAULT_API_BASE = "https://creditclaw.com/api/v1";
const VERSION = "2.0.0";

async function getConfig() {
  const { credential, encryptedSource, apiBase, profile } = await chrome.storage.local.get([
    "credential",
    "encryptedSource",
    "apiBase",
    "profile",
  ]);
  return {
    credential: credential || null,
    encryptedSource: encryptedSource || null,
    apiBase: apiBase || DEFAULT_API_BASE,
    profile: profile || "card",
  };
}

// --- byte helpers ---
function hexToBytes(hex) {
  const clean = String(hex).replace(/[^0-9a-fA-F]/g, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}
function b64ToBytes(b64) {
  const bin = atob(String(b64).replace(/\s/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// AES-256-GCM decrypt — matches the backend wire format exactly:
//   source  = base64( ciphertext || 16-byte GCM tag )   [tag inline]
//   key_hex = 32-byte key (hex),  iv_hex = 12-byte IV (hex)
// WebCrypto expects ciphertext||tag, which is precisely the decoded blob, so no
// tag juggling is needed. (The API also returns tag_hex, but it is the same
// bytes already present inline, so it is unused here.)
async function decryptBlob(sourceB64, keyHex, ivHex) {
  const key = await crypto.subtle.importKey("raw", hexToBytes(keyHex), { name: "AES-GCM" }, false, ["decrypt"]);
  const iv = hexToBytes(ivHex);
  const data = b64ToBytes(sourceB64);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, data);
  return new TextDecoder().decode(plainBuf);
}

// Fetch one-time key by reference and decrypt the stored source into a record.
async function resolveRecord(ref) {
  const { credential, encryptedSource, apiBase } = await getConfig();
  if (!credential) throw new Error("not_configured");
  if (!encryptedSource) throw new Error("no_source");

  const res = await fetch(`${apiBase}/bot/rail5/key`, {
    method: "POST",
    headers: { Authorization: `Bearer ${credential}`, "Content-Type": "application/json" },
    body: JSON.stringify({ checkout_id: ref }),
  });
  if (!res.ok) {
    // 409 = key already delivered (single-use); 403 = not approved / not owner.
    throw new Error(`key_fetch_failed_${res.status}`);
  }
  const { key_hex, iv_hex } = await res.json();
  if (!key_hex || !iv_hex) throw new Error("key_material_incomplete");

  let plain;
  try {
    plain = await decryptBlob(encryptedSource, key_hex, iv_hex);
  } catch (_) {
    throw new Error("decrypt_failed");
  }
  try {
    return JSON.parse(plain);
  } catch (_) {
    throw new Error("decrypt_parse_failed");
  }
}

// Build the list of fields to fill from the decrypted record + the request.
//   request.fields  (optional) — names to fill; resolved to record keys via
//                    canonicalize() so an alias resolves to its record key.
//   request.targets (optional) — explicit selector per requested name.
// With no request, every scalar field in the record is filled.
function buildFields(record, request) {
  const out = [];
  const wanted = request && Array.isArray(request.fields) && request.fields.length ? request.fields : null;

  if (wanted) {
    for (const name of wanted) {
      const key = canonicalize(name);
      if (!(key in record) || record[key] == null) continue;
      out.push({
        token: name, // detection primary = requested name (often matches page)
        value: String(record[key]),
        dropdown: false,
        selector: (request.targets && request.targets[name]) || null,
        aliases: detectAliases(key),
      });
    }
  } else {
    for (const [key, val] of Object.entries(record)) {
      if (val == null || typeof val === "object") continue;
      out.push({ token: key, value: String(val), dropdown: false, selector: null, aliases: detectAliases(key) });
    }
  }
  return out;
}

function metaFrom(record) {
  const meta = {};
  for (const k of META_ALLOWLIST) if (record && k in record) meta[k] = record[k];
  return meta;
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

// Ask frames which tokens they can match (names/selectors/aliases only, never
// values). Frames queried in frameId order (top frame is 0), first match wins →
// deterministic routing across cross-origin iframes.
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

async function handleFill(tabId, ref, request) {
  let record;
  try {
    record = await resolveRecord(ref);
  } catch (e) {
    return { status: "error", reason: (e && e.message) || "resolve_failed" };
  }

  const meta = metaFrom(record);
  const fields = buildFields(record, request);
  // Drop the plaintext record reference now that values are copied into fields.
  for (const k of Object.keys(record)) record[k] = null;

  if (!fields.length) { wipe(fields); return { status: "error", reason: "no_fields", ...meta }; }

  const frameMap = await mapTokensToFrames(
    tabId,
    fields.map((f) => ({ token: f.token, selector: f.selector, aliases: f.aliases }))
  );

  const filled = [];
  const notFound = [];
  await Promise.all(
    fields.map(async (f) => {
      const frameId = frameMap[f.token];
      if (frameId === undefined) { notFound.push(f.token); return; }
      const resp = await sendToFrame(tabId, frameId, {
        type: "SF_APPLY_ONE",
        token: f.token,
        value: f.value,
        dropdown: f.dropdown,
        selector: f.selector,
        aliases: f.aliases,
      });
      if (resp && resp.ok) filled.push(f.token);
      else notFound.push(f.token);
    })
  );
  wipe(fields);

  const status = filled.length === fields.length ? "filled" : filled.length ? "partial" : "error";
  return {
    status,
    fields_filled: filled.length,
    filled_tokens: filled,
    errors: notFound.length ? notFound.map((t) => `${t}: field_not_found`) : undefined,
    ...meta, // exp_month / exp_year echo (non-secret)
  };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.type !== "string") return false;

  switch (msg.type) {
    case "SF_FILL": {
      const tabId = sender.tab?.id;
      if (tabId == null) { sendResponse({ status: "error", reason: "no_tab" }); return true; }
      handleFill(tabId, msg.ref, msg.request).then(sendResponse);
      return true;
    }
    // Setup is accepted from the extension's own pages AND from the page
    // bridge (the pairing flow is agent-driven, from page JS). A hostile page
    // can at most disrupt local config — it cannot trigger a fill without a
    // server-approved, single-use reference. Deliberate: no bridge trust model.
    case "SF_SETUP": {
      const credential = msg.credential || msg.api_key || null;
      const encryptedSource = msg.encrypted_source || msg.encrypted_blob || null;
      getConfig().then((existing) => {
        if (!credential && !existing.credential) {
          sendResponse({ status: "error", reason: "missing_credential" });
          return;
        }
        const toSet = {};
        if (credential) toSet.credential = credential;
        if (encryptedSource) toSet.encryptedSource = stripMarkers(encryptedSource);
        // Backend URL override only from the extension's own pages (options /
        // popup have no sender.tab). A tab-originated api_base would let a
        // page redirect the credential-bearing key fetch to its own server.
        if (msg.api_base && !sender.tab) toSet.apiBase = msg.api_base;
        if (msg.profile) toSet.profile = msg.profile;
        chrome.storage.local.set(toSet).then(() => sendResponse({ status: "ready" }));
      });
      return true;
    }
    case "SF_STATUS": {
      getConfig().then((c) =>
        sendResponse({
          configured: !!c.credential,
          has_credential: !!c.credential,
          has_source: !!c.encryptedSource,
          // Aliases for callers using the api_key / blob naming convention.
          has_api_key: !!c.credential,
          has_blob: !!c.encryptedSource,
          profile: c.profile,
          version: VERSION,
        })
      );
      return true;
    }
    // Non-secret introspection: report which token NAMES this source exposes,
    // from its profile schema. No decryption, no values — lets the driving
    // agent know what it is mapping to page fields.
    case "SF_SCHEMA": {
      getConfig().then((c) =>
        sendResponse({ profile: c.profile, tokens: profileTokens(c.profile) })
      );
      return true;
    }
    case "SF_CLEAR": {
      chrome.storage.local.remove(["credential", "encryptedSource"]).then(() => sendResponse({ status: "cleared" }));
      return true;
    }
    default:
      return false;
  }
});

// Accept a source pasted with or without the delivery-file markers.
function stripMarkers(s) {
  const m = String(s).match(/ENCRYPTED_CARD_START([\s\S]*?)ENCRYPTED_CARD_END/);
  return (m ? m[1] : s).replace(/\s/g, "");
}
