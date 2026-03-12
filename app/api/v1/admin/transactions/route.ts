import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/server/db";
import { sql } from "drizzle-orm";

const PAGE_SIZE = 30;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.flags?.includes("admin")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const countResult = await db.execute(sql`
    SELECT
      (SELECT count(*) FROM transactions)::int +
      (SELECT count(*) FROM privy_transactions)::int +
      (SELECT count(*) FROM crossmint_transactions)::int +
      (SELECT count(*) FROM rail5_checkouts)::int +
      (SELECT count(*) FROM checkout_confirmations)::int
    AS total
  `);
  const total = Number(countResult.rows[0]?.total ?? 0);

  const rows = await db.execute(sql`
    (
      SELECT
        t.id,
        'core' AS rail,
        t.type,
        t.amount_cents AS amount_raw,
        'cents' AS amount_unit,
        t.description,
        t.status,
        t.created_at,
        o.email AS owner_email,
        w.bot_id
      FROM transactions t
      LEFT JOIN wallets w ON w.id = t.wallet_id
      LEFT JOIN owners o ON o.uid = w.owner_uid
    )
    UNION ALL
    (
      SELECT
        pt.id,
        'rail1' AS rail,
        pt.type,
        pt.amount_usdc AS amount_raw,
        'micro_usdc' AS amount_unit,
        NULL AS description,
        pt.status,
        pt.created_at,
        o.email AS owner_email,
        pw.bot_id
      FROM privy_transactions pt
      LEFT JOIN privy_wallets pw ON pw.id = pt.wallet_id
      LEFT JOIN owners o ON o.uid = pw.owner_uid
    )
    UNION ALL
    (
      SELECT
        ct.id,
        'rail2' AS rail,
        ct.type,
        ct.amount_usdc AS amount_raw,
        'micro_usdc' AS amount_unit,
        ct.product_name AS description,
        ct.status,
        ct.created_at,
        o.email AS owner_email,
        cw.bot_id
      FROM crossmint_transactions ct
      LEFT JOIN crossmint_wallets cw ON cw.id = ct.wallet_id
      LEFT JOIN owners o ON o.uid = cw.owner_uid
    )
    UNION ALL
    (
      SELECT
        rc.id,
        'rail5' AS rail,
        'checkout' AS type,
        rc.amount_cents AS amount_raw,
        'cents' AS amount_unit,
        rc.item_name AS description,
        rc.status,
        rc.created_at,
        o.email AS owner_email,
        rc.bot_id
      FROM rail5_checkouts rc
      LEFT JOIN owners o ON o.uid = rc.owner_uid
    )
    UNION ALL
    (
      SELECT
        cc.id,
        'rail4' AS rail,
        'checkout' AS type,
        cc.amount_cents AS amount_raw,
        'cents' AS amount_unit,
        cc.merchant_name AS description,
        cc.status,
        cc.created_at,
        o.email AS owner_email,
        cc.bot_id
      FROM checkout_confirmations cc
      LEFT JOIN rail4_cards r4 ON r4.card_id = cc.card_id
      LEFT JOIN owners o ON o.uid = r4.owner_uid
    )
    ORDER BY created_at DESC, rail ASC, id DESC
    LIMIT ${PAGE_SIZE}
    OFFSET ${offset}
  `);

  return NextResponse.json({
    transactions: rows.rows.map((row: any) => ({
      id: row.id,
      rail: row.rail,
      type: row.type,
      amount: row.amount_unit === "cents"
        ? `$${(Number(row.amount_raw) / 100).toFixed(2)}`
        : `$${(Number(row.amount_raw) / 1_000_000).toFixed(2)}`,
      amountRaw: Number(row.amount_raw),
      amountUnit: row.amount_unit,
      description: row.description || null,
      status: row.status || "confirmed",
      createdAt: row.created_at,
      ownerEmail: row.owner_email || "unknown",
      botId: row.bot_id || null,
    })),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
}
