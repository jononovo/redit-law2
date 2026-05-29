/**
 * CreditClaw Field Detection Script
 *
 * Inject via javascript_tool on a checkout page.
 * Returns a selectors object ready to pass into browser-decrypt.js.
 *
 * Handles: plain inputs, Stripe iframes, Shopify, WooCommerce,
 * custom React dropdowns, and generic label-based detection.
 *
 * Returns JSON:
 * {
 *   status: "detected",
 *   selectors: { number, name, cvv, zip, expiry|exp_month+exp_year, ... },
 *   dropdown_fields: ["exp_month", "exp_year"],  // fields needing click interaction
 *   platform: "shopify"|"stripe"|"woocommerce"|"generic",
 *   iframe: true|false,
 *   submit_selector: "button[type=submit]"
 * }
 */
(() => {
  const result = {
    status: "detected",
    selectors: {},
    dropdown_fields: [],
    platform: "generic",
    iframe: false,
    submit_selector: null
  };

  // --- Platform detection ---
  const html = document.documentElement.innerHTML;
  if (html.includes("cdn.shopify.com") || html.includes("Shopify.theme")) {
    result.platform = "shopify";
  } else if (html.includes("wp-content/plugins/woocommerce")) {
    result.platform = "woocommerce";
  } else if (html.includes("js.stripe.com")) {
    result.platform = "stripe";
  } else if (html.includes("creditclaw.com")) {
    result.platform = "creditclaw";
  }

  // --- Iframe detection ---
  const stripeFrame = document.querySelector('iframe[src*="js.stripe.com"]');
  const adyenFrame = document.querySelector('iframe[src*="adyen"]');
  const braintreeFrame = document.querySelector('iframe[src*="braintreegateway"]');
  if (stripeFrame || adyenFrame || braintreeFrame) {
    result.iframe = true;
  }

  // --- Input field matching ---
  // Score each input by how likely it is to be a card field
  const inputs = document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio])');
  const labels = document.querySelectorAll('label');

  // Build label map: input -> label text
  const labelMap = new Map();
  labels.forEach(lbl => {
    const forId = lbl.getAttribute('for');
    if (forId) {
      const input = document.getElementById(forId);
      if (input) labelMap.set(input, lbl.textContent.trim().toLowerCase());
    }
    // Also check nested inputs
    const nested = lbl.querySelector('input');
    if (nested) labelMap.set(nested, lbl.textContent.trim().toLowerCase());
  });

  // Get context string for an input (label + placeholder + name + id + aria-label)
  const getContext = (el) => {
    const parts = [
      labelMap.get(el) || "",
      (el.placeholder || "").toLowerCase(),
      (el.name || "").toLowerCase(),
      (el.id || "").toLowerCase(),
      (el.getAttribute("aria-label") || "").toLowerCase(),
      (el.getAttribute("autocomplete") || "").toLowerCase()
    ];
    // Walk up to find nearby label text
    let parent = el.parentElement;
    for (let i = 0; i < 3 && parent; i++) {
      const prevLabel = parent.querySelector("label");
      if (prevLabel) parts.push(prevLabel.textContent.trim().toLowerCase());
      parent = parent.parentElement;
    }
    return parts.join(" ");
  };

  const patterns = {
    number: /card.?num|cc.?num|credit.?card|cardnumber|cc-number|autocomplete.*cc-number/,
    name: /cardholder|card.?holder|name.?on.?card|cc-name/,
    cvv: /cvv|cvc|csc|security.?code|card.?code|verification/,
    zip: /zip|postal|post.?code|billing.?zip/,
    expiry: /expir|exp.?date|mm.?\/?.?yy|valid.?thru/,
    exp_month: /exp.?month|month/,
    exp_year: /exp.?year|year/
  };

  const selectorFor = (el) => {
    if (el.id) return "#" + CSS.escape(el.id);
    if (el.name) return 'input[name="' + el.name + '"]';
    if (el.placeholder) return 'input[placeholder="' + el.placeholder + '"]';
    // Fallback: nth-of-type
    const parent = el.parentElement;
    if (parent) {
      const siblings = Array.from(parent.querySelectorAll("input"));
      const idx = siblings.indexOf(el);
      if (idx >= 0) return ":scope > input:nth-of-type(" + (idx + 1) + ")";
    }
    return null;
  };

  // Match inputs to fields
  const matched = {};
  inputs.forEach(el => {
    const ctx = getContext(el);
    for (const [field, pattern] of Object.entries(patterns)) {
      if (pattern.test(ctx) && !matched[field]) {
        const sel = selectorFor(el);
        if (sel) {
          matched[field] = sel;
          result.selectors[field] = sel;
        }
      }
    }
  });

  // --- Dropdown detection (custom comboboxes for expiry) ---
  const comboboxes = document.querySelectorAll('button[role="combobox"], [role="listbox"], select');
  comboboxes.forEach(el => {
    const ctx = (el.textContent + " " + (el.getAttribute("aria-label") || "")).toLowerCase();
    const parentCtx = el.parentElement ? el.parentElement.textContent.toLowerCase() : "";
    const combined = ctx + " " + parentCtx;

    if (/month/.test(combined) && !result.selectors.exp_month) {
      result.selectors.exp_month = selectorFor(el) || "button[role=combobox]:first-of-type";
      result.dropdown_fields.push("exp_month");
    }
    if (/year/.test(combined) && !result.selectors.exp_year) {
      result.selectors.exp_year = selectorFor(el) || "button[role=combobox]:last-of-type";
      result.dropdown_fields.push("exp_year");
    }
  });

  // Also check native <select> elements
  document.querySelectorAll("select").forEach(el => {
    const ctx = getContext(el);
    if (/month/.test(ctx) && !result.selectors.exp_month) {
      result.selectors.exp_month = selectorFor(el);
      result.dropdown_fields.push("exp_month");
    }
    if (/year/.test(ctx) && !result.selectors.exp_year) {
      result.selectors.exp_year = selectorFor(el);
      result.dropdown_fields.push("exp_year");
    }
  });

  // --- Submit button detection ---
  const submitCandidates = [
    ...document.querySelectorAll('button[type="submit"]'),
    ...document.querySelectorAll('input[type="submit"]'),
    ...document.querySelectorAll("button")
  ];
  for (const btn of submitCandidates) {
    const txt = btn.textContent.toLowerCase();
    if (/pay|submit|place.?order|complete|checkout|confirm/.test(txt)) {
      if (btn.id) result.submit_selector = "#" + CSS.escape(btn.id);
      else result.submit_selector = null; // Use find tool instead
      break;
    }
  }

  JSON.stringify(result, null, 2);
})();
