import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@creditclaw.com";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

const RAIL_LABELS: Record<string, string> = {
  rail1: "USDC Wallet",
  rail2: "Commerce Wallet",
  rail4: "Self-Hosted Card",
  rail5: "Sub-Agent Card",
};

export async function sendApprovalEmail({
  ownerEmail,
  botName,
  amountDisplay,
  merchantName,
  itemName,
  approvalUrl,
  ttlMinutes,
  rail,
}: {
  ownerEmail: string;
  botName: string;
  amountDisplay: string;
  merchantName: string;
  itemName?: string | null;
  approvalUrl: string;
  ttlMinutes: number;
  rail: string;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!SENDGRID_API_KEY) {
    console.warn("[Approvals] SENDGRID_API_KEY not set — skipping approval email");
    return { sent: false, reason: "no_api_key" };
  }

  const railLabel = RAIL_LABELS[rail] || rail;

  const msg = {
    to: ownerEmail,
    from: {
      email: FROM_EMAIL,
      name: "CreditClaw",
    },
    subject: `\u{1F99E} ${botName} needs your approval — ${amountDisplay} at ${merchantName}`,
    html: `<div style="max-width: 480px; margin: 0 auto; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; color: #333;">
  <div style="text-align: center; padding: 24px 0;">
    <span style="font-size: 40px;">\u{1F99E}</span>
    <h1 style="font-size: 22px; font-weight: 800; color: #1a1a2e; margin: 8px 0 0;">CreditClaw</h1>
    <p style="color: #888; font-size: 14px; margin-top: 4px;">Purchase Approval Required</p>
  </div>

  <div style="background: #f9fafb; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">
    <div style="text-align: center; margin-bottom: 8px;">
      <span style="display: inline-block; background: #eef2ff; color: #4f46e5; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">${railLabel}</span>
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      <p style="font-size: 36px; font-weight: 800; color: #1a1a2e; margin: 0;">${amountDisplay}</p>
    </div>

    <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #888; font-size: 14px;">Bot</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1a1a2e; font-size: 14px;">${botName}</td>
        </tr>
        <tr style="border-top: 1px solid #f0f0f0;">
          <td style="padding: 8px 0; color: #888; font-size: 14px;">Merchant</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1a1a2e; font-size: 14px;">${merchantName}</td>
        </tr>
        ${itemName ? `<tr style="border-top: 1px solid #f0f0f0;">
          <td style="padding: 8px 0; color: #888; font-size: 14px;">Item</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1a1a2e; font-size: 14px;">${itemName}</td>
        </tr>` : ""}
      </table>
    </div>

    <a href="${approvalUrl}" style="display: block; background: #22c55e; color: white; text-align: center; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px; margin-bottom: 12px;">
      Review &amp; Approve &rarr;
    </a>

    <p style="color: #888; font-size: 12px; text-align: center; margin: 0;">
      This link expires in ${ttlMinutes} minutes. You can also manage approvals from your dashboard.
    </p>
  </div>

  <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 24px; line-height: 1.5;">
    You received this because your bot's spending permissions require your approval.
  </p>
</div>`,
  };

  try {
    await sgMail.send(msg);
    console.log(`[Approvals] Email sent to ${ownerEmail} for ${rail} — ${amountDisplay} at ${merchantName}`);
    return { sent: true };
  } catch (error: any) {
    console.error("[Approvals] SendGrid email failed:", error?.response?.body || error?.message);
    return { sent: false, reason: "send_failed" };
  }
}
