import type { SignalScore } from "../types";

export function scoreAccessAuth(html: string): SignalScore {
  const MAX = 10;
  let score = 0;
  const findings: string[] = [];

  const guestCheckoutIndicators = [
    /guest[_\s-]*checkout/i,
    /checkout[_\s-]*as[_\s-]*guest/i,
    /no[_\s-]*account[_\s-]*(?:needed|required)/i,
    /continue[_\s-]*(?:as[_\s-]*)?guest/i,
    /shop[_\s-]*without[_\s-]*(?:an[_\s-]*)?account/i,
  ];

  for (const pattern of guestCheckoutIndicators) {
    if (pattern.test(html)) {
      score += 5;
      findings.push("Guest checkout available");
      break;
    }
  }

  const checkoutLinks = html.match(/<a[^>]*href\s*=\s*["'][^"']*(?:checkout|cart|basket)[^"']*["'][^>]*>/gi) || [];
  if (checkoutLinks.length > 0) {
    score += 2;
    findings.push("Direct checkout/cart links found");
  }

  const loginWallIndicators = [
    /(?:must|need\s+to|required\s+to)\s+(?:sign\s+in|log\s+in|create\s+an?\s+account)/i,
    /sign\s+in\s+to\s+(?:continue|proceed|checkout)/i,
  ];

  let hasLoginWall = false;
  for (const pattern of loginWallIndicators) {
    if (pattern.test(html)) {
      hasLoginWall = true;
      findings.push("Login wall language detected — may require account");
      break;
    }
  }

  if (!hasLoginWall && score === 0) {
    const hasSignIn = /sign[\s_-]*in|log[\s_-]*in|create[\s_-]*account|register/i.test(html);
    const hasCart = /add[\s_-]*to[\s_-]*cart|buy[\s_-]*now|shop[\s_-]*now/i.test(html);
    if (hasCart) {
      score += 2;
      findings.push("Shopping actions available on homepage");
    }
    if (hasSignIn && hasCart) {
      score += 1;
      findings.push("Both sign-in and cart options present (likely supports guest)");
    }
  }

  if (findings.length === 0) {
    findings.push("Could not determine authentication requirements");
  }

  return {
    key: "access_auth",
    label: "Access & Authentication",
    score: Math.min(score, MAX),
    max: MAX,
    detail: findings.join(". "),
  };
}

export function scoreOrderManagement(html: string): SignalScore {
  const MAX = 10;
  let score = 0;
  const findings: string[] = [];

  const variantSelectors = [
    { pattern: /select[^>]*(?:size|variant|color|colour|quantity)/i, label: "variant selector" },
    { pattern: /data-(?:variant|option|size|color)/i, label: "variant data attributes" },
    { pattern: /(?:choose|select)\s+(?:a\s+)?(?:size|color|colour|variant|option)/i, label: "variant selection prompt" },
  ];

  for (const { pattern, label } of variantSelectors) {
    if (pattern.test(html)) {
      score += 3;
      findings.push(`Product ${label} found`);
      break;
    }
  }

  const cartPatterns = [
    { pattern: /add[\s_-]*to[\s_-]*cart|add[\s_-]*to[\s_-]*bag|add[\s_-]*to[\s_-]*basket/i, label: "Add to cart" },
    { pattern: /buy[\s_-]*now|buy[\s_-]*it[\s_-]*now/i, label: "Buy now" },
  ];

  for (const { pattern, label } of cartPatterns) {
    if (pattern.test(html)) {
      score += 2;
      findings.push(`"${label}" action detected`);
      break;
    }
  }

  const cartUrls = html.match(/href\s*=\s*["'][^"']*\/cart[^"']*["']/gi) || [];
  const basketUrls = html.match(/href\s*=\s*["'][^"']*\/basket[^"']*["']/gi) || [];
  if (cartUrls.length > 0 || basketUrls.length > 0) {
    score += 2;
    findings.push("Predictable cart/basket URL structure");
  }

  const quantityInputs = /(?:type\s*=\s*["']number["'][^>]*(?:quantity|qty))|(?:(?:quantity|qty)[^>]*type\s*=\s*["']number["'])/i;
  if (quantityInputs.test(html)) {
    score += 1;
    findings.push("Quantity input field detected");
  }

  const hasProgrammaticCheckout = /mcp|\.well-known\/mcp|agentic[_-]?commerce/i.test(html);
  if (hasProgrammaticCheckout) {
    score = MAX;
    findings.length = 0;
    findings.push("Programmatic checkout detected — full marks for order management");
  }

  const addressForms = /(?:shipping|delivery)\s*(?:address|info)/i;
  if (addressForms.test(html)) {
    score += 2;
    findings.push("Shipping/delivery address section found");
  }

  if (findings.length === 0) {
    findings.push("Limited order management indicators found on homepage");
  }

  return {
    key: "order_management",
    label: "Order Management",
    score: Math.min(score, MAX),
    max: MAX,
    detail: findings.join(". "),
  };
}

export function scoreCheckoutFlow(html: string): SignalScore {
  const MAX = 10;
  let score = 0;
  const findings: string[] = [];

  const hasProgrammaticCheckout = /mcp|\.well-known\/mcp|agentic[_-]?commerce|programmatic[_-]?checkout/i.test(html);
  if (hasProgrammaticCheckout) {
    score = MAX;
    findings.push("Programmatic checkout detected — full marks for checkout flow");
    return {
      key: "checkout_flow",
      label: "Checkout Flow",
      score,
      max: MAX,
      detail: findings.join(". "),
    };
  }

  const discountIndicators = [
    /(?:promo|coupon|discount|voucher)\s*(?:code|field)?/i,
    /apply[\s_-]*(?:code|coupon|promo|discount)/i,
    /gift[\s_-]*card/i,
  ];

  for (const pattern of discountIndicators) {
    if (pattern.test(html)) {
      score += 2;
      findings.push("Discount/promo code field detected");
      break;
    }
  }

  const paymentMethodIndicators = [
    { pattern: /(?:visa|mastercard|amex|american\s*express|discover|paypal|apple\s*pay|google\s*pay|shop\s*pay)/i, label: "payment methods" },
    { pattern: /(?:credit|debit)\s*card/i, label: "card payment" },
    { pattern: /payment[\s_-]*(?:method|option)s?/i, label: "payment options section" },
  ];

  let paymentFound = false;
  for (const { pattern, label } of paymentMethodIndicators) {
    if (pattern.test(html)) {
      score += 3;
      findings.push(`Clearly labeled ${label} detected`);
      paymentFound = true;
      break;
    }
  }

  const paymentIcons = html.match(/<img[^>]*(?:visa|mastercard|paypal|amex|apple.?pay|google.?pay|shop.?pay)[^>]*>/gi) || [];
  if (paymentIcons.length > 0 && !paymentFound) {
    score += 2;
    findings.push(`${paymentIcons.length} payment method icon(s) found`);
  }

  const shippingIndicators = [
    /(?:free|flat[\s_-]*rate|standard|express|overnight|next[\s_-]*day)\s*(?:shipping|delivery)/i,
    /shipping[\s_-]*(?:method|option|rate)s?/i,
    /delivery[\s_-]*(?:option|method|time)s?/i,
    /estimated[\s_-]*delivery/i,
  ];

  for (const pattern of shippingIndicators) {
    if (pattern.test(html)) {
      score += 3;
      findings.push("Shipping/delivery options described");
      break;
    }
  }

  const loyaltyIndicators = /(?:loyalty|reward|member)\s*(?:point|program|benefit)s?/i;
  if (loyaltyIndicators.test(html)) {
    score += 2;
    findings.push("Loyalty/rewards program mentioned");
  }

  if (findings.length === 0) {
    findings.push("Limited checkout flow information found on homepage");
  }

  return {
    key: "checkout_flow",
    label: "Checkout Flow",
    score: Math.min(score, MAX),
    max: MAX,
    detail: findings.join(". "),
  };
}

export function scoreBotTolerance(robotsTxtContent: string | null, html: string): SignalScore {
  const MAX = 5;
  let score = 0;
  const findings: string[] = [];

  if (robotsTxtContent === null) {
    score += 2;
    findings.push("No robots.txt found (no explicit blocking)");
  } else {
    const lines = robotsTxtContent.split("\n").map(l => l.trim().toLowerCase());
    const hasDisallowAll = lines.some(l => l === "disallow: /");
    const userAgentAll = lines.some(l => l === "user-agent: *");

    const botBlockPatterns = /(?:ai|bot|crawler|spider|scraper|gpt|claude|anthropic|openai|chatgpt)/i;
    const hasAgentSpecificBlocks = lines.some(l =>
      l.startsWith("user-agent:") && botBlockPatterns.test(l)
    );

    if (hasAgentSpecificBlocks) {
      score += 0;
      findings.push("AI/bot-specific user-agent blocks detected in robots.txt");
    } else if (userAgentAll && hasDisallowAll) {
      score += 0;
      findings.push("robots.txt disallows all crawling");
    } else if (userAgentAll && !hasDisallowAll) {
      score += 3;
      findings.push("robots.txt allows general crawling");
    } else {
      score += 2;
      findings.push("robots.txt present with selective rules");
    }

    const crawlDelay = robotsTxtContent.match(/crawl-delay\s*:\s*(\d+)/i);
    if (crawlDelay) {
      const delay = parseInt(crawlDelay[1]);
      if (delay <= 2) {
        score += 1;
        findings.push(`Reasonable crawl-delay: ${delay}s`);
      } else {
        findings.push(`High crawl-delay: ${delay}s`);
      }
    }
  }

  const captchaIndicators = [
    /recaptcha|hcaptcha|captcha|cloudflare[\s_-]*challenge/i,
    /cf-challenge|challenge-platform/i,
    /g-recaptcha|h-captcha/i,
  ];

  let hasCaptcha = false;
  for (const pattern of captchaIndicators) {
    if (pattern.test(html)) {
      hasCaptcha = true;
      break;
    }
  }

  if (hasCaptcha) {
    score = Math.max(0, score - 2);
    findings.push("CAPTCHA/bot challenge detected on homepage");
  } else {
    score += 1;
    findings.push("No CAPTCHA or bot challenge on homepage");
  }

  if (findings.length === 0) {
    findings.push("Bot tolerance could not be assessed");
  }

  return {
    key: "bot_tolerance",
    label: "Bot Tolerance",
    score: Math.min(score, MAX),
    max: MAX,
    detail: findings.join(". "),
  };
}
