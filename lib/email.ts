import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@creditclaw.com";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export async function sendOwnerRegistrationEmail({
  ownerEmail,
  botName,
  claimToken,
  description,
}: {
  ownerEmail: string;
  botName: string;
  claimToken: string;
  description?: string;
}) {
  if (!SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY not set — skipping email send");
    return { sent: false, reason: "no_api_key" };
  }

  const claimUrl = `https://creditclaw.com/claim?token=${claimToken}`;

  const msg = {
    to: ownerEmail,
    from: {
      email: FROM_EMAIL,
      name: "CreditClaw",
    },
    subject: `Your bot "${botName}" just registered on CreditClaw`,
    text: `Hi there!

An AI agent called "${botName}" just registered on CreditClaw using your email address.${description ? `\n\nBot description: ${description}` : ""}

What is CreditClaw?
CreditClaw gives your AI agent a virtual Visa/Mastercard that you fund. You control the spending limits — they handle the rest.

What to do next:
1. Visit ${claimUrl}
2. Sign in or create your CreditClaw account
3. Add a payment method
4. Your bot's wallet activates and they get a funded card

Your claim token: ${claimToken}

If you didn't expect this, you can safely ignore this email. No wallet will be created unless you complete the claim process.

— The CreditClaw Team
Pocket money for your bots!`,
    html: `
<div style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 800; color: #1a1a2e; margin: 0;">CreditClaw</h1>
    <p style="color: #888; font-size: 14px; margin-top: 4px;">Pocket money for your bots!</p>
  </div>

  <div style="background: #f9fafb; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">
    <h2 style="font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px;">Your bot just signed up</h2>
    <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      An AI agent called <strong>"${botName}"</strong> registered on CreditClaw using your email.${description ? ` It describes itself as: <em>"${description}"</em>` : ""}
    </p>

    <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb; text-align: center; margin-bottom: 24px;">
      <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Your Claim Token</p>
      <p style="font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 700; color: #1a1a2e; margin: 0; letter-spacing: 2px;">${claimToken}</p>
    </div>

    <a href="${claimUrl}" style="display: block; background: #1a1a2e; color: white; text-align: center; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px;">
      Claim Your Bot &rarr;
    </a>

    <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #888; font-size: 13px; line-height: 1.6; margin: 0;">
        <strong>What happens next:</strong> Sign in, add a payment method, and your bot gets a funded virtual Visa/Mastercard. You set the spending limits — they handle the purchases.
      </p>
    </div>
  </div>

  <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 24px; line-height: 1.5;">
    If you didn't expect this email, you can safely ignore it.<br/>
    No wallet will be created unless you complete the claim process.
  </p>
</div>`,
  };

  try {
    await sgMail.send(msg);
    return { sent: true };
  } catch (error: any) {
    console.error("SendGrid email failed:", error?.response?.body || error?.message);
    return { sent: false, reason: "send_failed" };
  }
}

export async function sendPurchaseAlertEmail({
  ownerEmail,
  botName,
  amountUsd,
  merchant,
}: {
  ownerEmail: string;
  botName: string;
  amountUsd: number;
  merchant: string;
}) {
  if (!SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY not set — skipping purchase alert email");
    return { sent: false, reason: "no_api_key" };
  }

  const dashboardUrl = "https://creditclaw.com/app";

  const msg = {
    to: ownerEmail,
    from: { email: FROM_EMAIL, name: "CreditClaw" },
    subject: `${botName} just spent $${amountUsd.toFixed(2)} at ${merchant}`,
    text: `Hi there!\n\nYour bot "${botName}" just made a purchase.\n\nAmount: $${amountUsd.toFixed(2)}\nMerchant: ${merchant}\n\nView details on your dashboard: ${dashboardUrl}\n\n— The CreditClaw Team`,
    html: `
<div style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 800; color: #1a1a2e; margin: 0;">CreditClaw</h1>
    <p style="color: #888; font-size: 14px; margin-top: 4px;">Pocket money for your bots!</p>
  </div>
  <div style="background: #f9fafb; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">
    <h2 style="font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px;">Purchase Alert</h2>
    <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      <strong>${botName}</strong> just spent <strong>$${amountUsd.toFixed(2)}</strong> at <strong>${merchant}</strong>.
    </p>
    <a href="${dashboardUrl}" style="display: block; background: #1a1a2e; color: white; text-align: center; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px;">
      View Dashboard &rarr;
    </a>
  </div>
</div>`,
  };

  try {
    await sgMail.send(msg);
    return { sent: true };
  } catch (error: any) {
    console.error("SendGrid purchase alert email failed:", error?.response?.body || error?.message);
    return { sent: false, reason: "send_failed" };
  }
}

export async function sendBalanceLowEmail({
  ownerEmail,
  botName,
  balanceUsd,
}: {
  ownerEmail: string;
  botName: string;
  balanceUsd: number;
}) {
  if (!SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY not set — skipping balance low email");
    return { sent: false, reason: "no_api_key" };
  }

  const dashboardUrl = "https://creditclaw.com/app";

  const msg = {
    to: ownerEmail,
    from: { email: FROM_EMAIL, name: "CreditClaw" },
    subject: `${botName}'s balance is low — $${balanceUsd.toFixed(2)} remaining`,
    text: `Hi there!\n\nYour bot "${botName}" has a low wallet balance.\n\nCurrent balance: $${balanceUsd.toFixed(2)}\n\nAdd funds on your dashboard: ${dashboardUrl}\n\n— The CreditClaw Team`,
    html: `
<div style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 800; color: #1a1a2e; margin: 0;">CreditClaw</h1>
    <p style="color: #888; font-size: 14px; margin-top: 4px;">Pocket money for your bots!</p>
  </div>
  <div style="background: #fff7ed; border-radius: 16px; padding: 32px; border: 1px solid #fed7aa;">
    <h2 style="font-size: 20px; font-weight: 700; color: #9a3412; margin: 0 0 8px;">Low Balance Warning</h2>
    <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      <strong>${botName}</strong>'s wallet balance has dropped to <strong>$${balanceUsd.toFixed(2)}</strong>. Consider adding funds so it can keep spending.
    </p>
    <a href="${dashboardUrl}" style="display: block; background: #1a1a2e; color: white; text-align: center; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px;">
      Add Funds &rarr;
    </a>
  </div>
</div>`,
  };

  try {
    await sgMail.send(msg);
    return { sent: true };
  } catch (error: any) {
    console.error("SendGrid balance low email failed:", error?.response?.body || error?.message);
    return { sent: false, reason: "send_failed" };
  }
}

export async function sendSuspiciousActivityEmail({
  ownerEmail,
  botName,
  amountUsd,
  merchant,
  reason,
}: {
  ownerEmail: string;
  botName: string;
  amountUsd: number;
  merchant: string;
  reason: string;
}) {
  if (!SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY not set — skipping suspicious activity email");
    return { sent: false, reason: "no_api_key" };
  }

  const dashboardUrl = "https://creditclaw.com/app";

  const msg = {
    to: ownerEmail,
    from: { email: FROM_EMAIL, name: "CreditClaw" },
    subject: `[Action Required] Purchase by ${botName} was declined`,
    text: `Hi there!\n\nA purchase by your bot "${botName}" was declined.\n\nAmount: $${amountUsd.toFixed(2)}\nMerchant: ${merchant}\nReason: ${reason}\n\nReview your bot's spending rules on your dashboard: ${dashboardUrl}\n\n— The CreditClaw Team`,
    html: `
<div style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 800; color: #1a1a2e; margin: 0;">CreditClaw</h1>
    <p style="color: #888; font-size: 14px; margin-top: 4px;">Pocket money for your bots!</p>
  </div>
  <div style="background: #fef2f2; border-radius: 16px; padding: 32px; border: 1px solid #fecaca;">
    <h2 style="font-size: 20px; font-weight: 700; color: #991b1b; margin: 0 0 8px;">Purchase Declined</h2>
    <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
      A purchase by <strong>${botName}</strong> for <strong>$${amountUsd.toFixed(2)}</strong> at <strong>${merchant}</strong> was declined.
    </p>
    <div style="background: white; border-radius: 12px; padding: 16px; border: 1px solid #fecaca; margin-bottom: 24px;">
      <p style="color: #991b1b; font-size: 14px; margin: 0; font-weight: 600;">Reason: ${reason}</p>
    </div>
    <a href="${dashboardUrl}" style="display: block; background: #1a1a2e; color: white; text-align: center; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px;">
      Review Settings &rarr;
    </a>
  </div>
</div>`,
  };

  try {
    await sgMail.send(msg);
    return { sent: true };
  } catch (error: any) {
    console.error("SendGrid suspicious activity email failed:", error?.response?.body || error?.message);
    return { sent: false, reason: "send_failed" };
  }
}

export async function sendTopupRequestEmail({
  ownerEmail,
  botName,
  amountUsd,
  reason,
}: {
  ownerEmail: string;
  botName: string;
  amountUsd: number;
  reason?: string;
}) {
  if (!SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY not set — skipping topup request email");
    return { sent: false, reason: "no_api_key" };
  }

  const dashboardUrl = "https://creditclaw.com/app";

  const msg = {
    to: ownerEmail,
    from: {
      email: FROM_EMAIL,
      name: "CreditClaw",
    },
    subject: `${botName} is requesting a $${amountUsd.toFixed(2)} top-up`,
    text: `Hi there!

Your bot "${botName}" is requesting more funds.

Amount requested: $${amountUsd.toFixed(2)}${reason ? `\nReason: ${reason}` : ""}

To add funds, visit your dashboard: ${dashboardUrl}

— The CreditClaw Team`,
    html: `
<div style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 800; color: #1a1a2e; margin: 0;">CreditClaw</h1>
    <p style="color: #888; font-size: 14px; margin-top: 4px;">Pocket money for your bots!</p>
  </div>

  <div style="background: #f9fafb; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">
    <h2 style="font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0 0 8px;">Top-Up Request</h2>
    <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
      Your bot <strong>"${botName}"</strong> is requesting <strong>$${amountUsd.toFixed(2)}</strong> in additional funds.${reason ? ` <br/><br/><em>"${reason}"</em>` : ""}
    </p>

    <a href="${dashboardUrl}" style="display: block; background: #1a1a2e; color: white; text-align: center; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px;">
      Add Funds &rarr;
    </a>
  </div>

  <p style="color: #aaa; font-size: 12px; text-align: center; margin-top: 24px; line-height: 1.5;">
    You can manage your bot's spending limits from your dashboard.
  </p>
</div>`,
  };

  try {
    await sgMail.send(msg);
    return { sent: true };
  } catch (error: any) {
    console.error("SendGrid topup email failed:", error?.response?.body || error?.message);
    return { sent: false, reason: "send_failed" };
  }
}


