import { NextResponse } from "next/server";
import { z } from "zod";
import sgMail from "@sendgrid/mail";
import { getSessionUser } from "@/lib/auth/session";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@creditclaw.com";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "billing", "technical", "general"]),
  message: z.string().min(1, "Message is required").max(5000, "Message is too long"),
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const typeLabels: Record<string, string> = {
  bug: "Bug Report",
  feature: "Feature Request",
  billing: "Billing Question",
  technical: "Technical Support",
  general: "General Feedback",
};

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { type, message } = parsed.data;
  const typeLabel = typeLabels[type] || type;
  const userName = user.displayName || "Unknown User";
  const userEmail = user.email || "No email";

  const safeUserName = escapeHtml(userName);
  const safeUserEmail = escapeHtml(userEmail);
  const safeMessage = escapeHtml(message);
  const safeUid = escapeHtml(user.uid);

  const subject = `[${typeLabel}] Feedback from ${userName}`;

  const htmlContent = `
<div style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 24px; font-weight: 800; color: #1a1a2e; margin: 0;">CreditClaw</h1>
    <p style="color: #888; font-size: 14px; margin-top: 4px;">User Feedback</p>
  </div>

  <div style="background: #f9fafb; border-radius: 16px; padding: 32px; border: 1px solid #e5e7eb;">
    <h2 style="font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0 0 20px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb;">${typeLabel}</h2>

    <div style="background: #f3f4f6; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 14px; color: #666;">
        <tr><td style="padding: 4px 0; font-weight: 600; color: #374151;">From</td><td style="padding: 4px 0;">${safeUserName}</td></tr>
        <tr><td style="padding: 4px 0; font-weight: 600; color: #374151;">Email</td><td style="padding: 4px 0;">${safeUserEmail}</td></tr>
        <tr><td style="padding: 4px 0; font-weight: 600; color: #374151;">User ID</td><td style="padding: 4px 0;">${safeUid}</td></tr>
      </table>
    </div>

    <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e5e7eb;">
      <p style="color: #1a1a2e; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${safeMessage}</p>
    </div>

    <p style="color: #888; font-size: 13px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
      Reply directly to this email to respond to ${safeUserName}.
    </p>
  </div>
</div>`;

  const textContent = `${typeLabel}
${"=".repeat(typeLabel.length)}

From: ${userName}
Email: ${userEmail}
User ID: ${user.uid}

Message:
${message}

---
Reply directly to this email to respond to ${userName}.`;

  if (!SENDGRID_API_KEY) {
    console.warn("SENDGRID_API_KEY not set — skipping feedback email send");
    return NextResponse.json({ success: true });
  }

  try {
    await sgMail.send({
      to: SUPPORT_EMAIL,
      from: { email: "support@creditclaw.com", name: "CreditClaw Feedback" },
      replyTo: userEmail !== "No email" ? { email: userEmail, name: userName } : undefined,
      subject,
      text: textContent,
      html: htmlContent,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("SendGrid feedback email failed:", error?.response?.body || error?.message);
    return NextResponse.json(
      { error: "Failed to send feedback. Please try again later." },
      { status: 500 }
    );
  }
}
