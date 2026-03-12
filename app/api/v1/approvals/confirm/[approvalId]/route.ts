import { NextRequest, NextResponse } from "next/server";
import { resolveApproval, verifyHmac } from "@/lib/approvals/service";
import { storage } from "@/server/storage";
import "@/lib/approvals/callbacks";

const RAIL_LABELS: Record<string, string> = {
  rail1: "USDC Wallet",
  rail2: "Commerce Wallet",
  rail4: "Self-Hosted Card",
  rail5: "Sub-Agent Card",
};

const RAIL_DESCRIPTIONS: Record<string, string> = {
  rail1: "This transaction uses your USDC wallet on Base chain.",
  rail2: "This transaction uses your CrossMint commerce wallet.",
  rail4: "Approving will allow the bot to use your self-hosted card details for this purchase.",
  rail5: "Approving will allow the bot to spawn a sub-agent that decrypts and uses the card. The sub-agent is deleted after checkout.",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ approvalId: string }> }
) {
  const { approvalId } = await params;
  const token = request.nextUrl.searchParams.get("token");

  if (!token || !verifyHmac(approvalId, token)) {
    return new NextResponse(renderStatusPage("Invalid Link", "This approval link is invalid or has been tampered with."), {
      status: 403,
      headers: { "Content-Type": "text/html" },
    });
  }

  const approval = await storage.getUnifiedApprovalById(approvalId);
  if (!approval) {
    return new NextResponse(renderStatusPage("Not Found", "This approval request was not found."), {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  if (approval.status !== "pending") {
    const statusMsg = approval.status === "approved"
      ? "This purchase was already approved."
      : approval.status === "denied"
      ? "This purchase was already denied."
      : "This approval request has expired.";
    return new NextResponse(renderStatusPage("Already Decided", statusMsg), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }

  if (new Date() > approval.expiresAt) {
    await storage.decideUnifiedApproval(approvalId, "expired");
    return new NextResponse(renderStatusPage("Expired", "This approval request has expired. The purchase was not completed."), {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  }

  return new NextResponse(renderApprovalPage(approval, token), {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ approvalId: string }> }
) {
  const { approvalId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { action, token } = body;
  if (!action || !["approve", "deny"].includes(action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const result = await resolveApproval(approvalId, action, token);

  if (!result.success) {
    const statusCode = result.error === "invalid_token" ? 403
      : result.error === "not_found" ? 404
      : result.error === "expired" ? 410
      : 409;
    return NextResponse.json({ error: result.error }, { status: statusCode });
  }

  const message = action === "approve"
    ? "Purchase approved. The bot has been notified."
    : "Purchase denied. The bot has been notified.";

  return NextResponse.json({ status: result.approval?.status, message });
}

function renderStatusPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — CreditClaw</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; background: #f8f6f4; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .card { background: white; border-radius: 1rem; padding: 2rem; max-width: 480px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.08); text-align: center; }
    h1 { font-size: 1.5rem; color: #1a1a2e; margin-bottom: 0.75rem; }
    p { color: #666; line-height: 1.6; }
    .logo { font-size: 2rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">\u{1F99E}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

function renderApprovalPage(approval: any, token: string): string {
  const railLabel = RAIL_LABELS[approval.rail] || approval.rail;
  const railDescription = RAIL_DESCRIPTIONS[approval.rail] || "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Approve Purchase — CreditClaw</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; background: #f8f6f4; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .card { background: white; border-radius: 1rem; padding: 2rem; max-width: 480px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .logo { text-align: center; font-size: 2rem; margin-bottom: 1rem; }
    h1 { font-size: 1.25rem; color: #1a1a2e; margin-bottom: 1rem; text-align: center; }
    .badge { display: inline-block; background: #eef2ff; color: #4f46e5; font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.75rem; border-radius: 999px; margin-bottom: 1rem; }
    .details { background: #f8f6f4; border-radius: 0.75rem; padding: 1rem; margin-bottom: 1.5rem; }
    .row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e8e4e0; }
    .row:last-child { border-bottom: none; }
    .label { color: #888; font-size: 0.875rem; }
    .value { color: #1a1a2e; font-weight: 600; font-size: 0.875rem; }
    .amount { font-size: 1.5rem; text-align: center; color: #1a1a2e; font-weight: 700; margin: 1rem 0; }
    .note { font-size: 0.8rem; color: #888; text-align: center; margin-bottom: 1rem; line-height: 1.5; }
    .buttons { display: flex; gap: 0.75rem; }
    button { flex: 1; padding: 0.875rem; border: none; border-radius: 0.75rem; font-size: 1rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
    button:hover { opacity: 0.85; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .approve { background: #22c55e; color: white; }
    .deny { background: #ef4444; color: white; }
    .result { text-align: center; padding: 1rem; margin-top: 1rem; border-radius: 0.75rem; display: none; }
    .result.success { background: #f0fdf4; color: #166534; display: block; }
    .result.error { background: #fef2f2; color: #991b1b; display: block; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">\u{1F99E}</div>
    <h1>Purchase Approval Request</h1>
    <div style="text-align: center;"><span class="badge">${railLabel}</span></div>
    <div class="amount">${approval.amountDisplay}</div>
    <div class="details">
      <div class="row"><span class="label">Bot</span><span class="value">${approval.botName}</span></div>
      <div class="row"><span class="label">Merchant</span><span class="value">${approval.merchantName}</span></div>
      ${approval.itemName ? `<div class="row"><span class="label">Item</span><span class="value">${approval.itemName}</span></div>` : ""}
    </div>
    ${railDescription ? `<p class="note">${railDescription}</p>` : ""}
    <div class="buttons" id="buttons">
      <button class="deny" onclick="decide('deny')">Deny</button>
      <button class="approve" onclick="decide('approve')">Approve</button>
    </div>
    <div id="result"></div>
  </div>
  <script>
    async function decide(action) {
      const buttons = document.querySelectorAll('button');
      buttons.forEach(b => b.disabled = true);
      try {
        const res = await fetch(window.location.pathname, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, token: '${token}' }),
        });
        const data = await res.json();
        const el = document.getElementById('result');
        document.getElementById('buttons').style.display = 'none';
        if (res.ok) {
          el.className = 'result success';
          el.textContent = data.message;
        } else {
          el.className = 'result error';
          el.textContent = data.error === 'expired' ? 'This request has expired.' : (data.message || data.error);
        }
      } catch (e) {
        const el = document.getElementById('result');
        el.className = 'result error';
        el.textContent = 'Something went wrong. Please try again.';
        buttons.forEach(b => b.disabled = false);
      }
    }
  </script>
</body>
</html>`;
}
