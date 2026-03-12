"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth-fetch";
import { ArrowLeft, Shield, Activity, Clock, Loader2, RefreshCw, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Rail4CardManager } from "@/components/dashboard/rail4-card-manager";

interface CardDetail {
  configured: boolean;
  card_id: string;
  status: string | null;
  card_name?: string;
  decoy_filename?: string;
  real_profile_index?: number;
  created_at?: string;
}

interface ObfuscationEntry {
  id: number;
  profile_index: number;
  merchant_name: string;
  item_name: string;
  amount_usd: number;
  status: string;
  created_at: string;
}

export default function SelfHostedCardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const cardId = params.cardId as string;

  const [cardDetail, setCardDetail] = useState<CardDetail | null>(null);
  const [events, setEvents] = useState<ObfuscationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);

  const fetchCardStatus = useCallback(async () => {
    try {
      const res = await authFetch(`/api/v1/rail4/status?card_id=${cardId}`);
      if (res.ok) {
        setCardDetail(await res.json());
      }
    } catch {}
  }, [cardId]);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const res = await authFetch(`/api/v1/rail4/obfuscation/history?card_id=${cardId}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch {} finally {
      setEventsLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    Promise.all([fetchCardStatus(), fetchEvents()]).finally(() => {
      setLoading(false);
    });
  }, [fetchCardStatus, fetchEvents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" data-testid="loading-card-detail" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/self-hosted")}
          className="rounded-xl gap-2"
          data-testid="button-back-to-cards"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900" data-testid="text-card-detail-title">
            {cardDetail?.card_name || cardId.slice(0, 12)}
          </h1>
          <p className="text-sm text-neutral-500 font-mono">{cardId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-neutral-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-neutral-500">Status</p>
                <Badge
                  className={`border-0 mt-1 ${
                    cardDetail?.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                  data-testid="badge-detail-status"
                >
                  {cardDetail?.status === "active" ? "Active" : cardDetail?.status || "Unknown"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-neutral-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500">Payment Profiles</p>
                <p className="text-sm font-bold text-neutral-900 mt-1" data-testid="text-detail-filename">
                  {cardDetail?.decoy_filename || "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-neutral-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-neutral-500">Created</p>
                <p className="text-sm font-bold text-neutral-900 mt-1" data-testid="text-detail-created">
                  {cardDetail?.created_at ? new Date(cardDetail.created_at).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Rail4CardManager cardId={cardId} />

      <Card className="rounded-2xl border-neutral-100 shadow-sm" data-testid="card-transaction-ledger">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-bold text-neutral-900">
              <Activity className="w-4 h-4" />
              Transaction Ledger
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-xs text-neutral-500"
              onClick={fetchEvents}
              data-testid="button-refresh-transactions"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
              <p className="text-sm text-neutral-400">No transactions yet for this card.</p>
              <p className="text-xs text-neutral-400 mt-1">Transactions will appear here once your bot starts making purchases.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Profile #</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((entry) => (
                    <TableRow key={entry.id} data-testid={`row-transaction-${entry.id}`}>
                      <TableCell className="text-sm font-medium">{entry.merchant_name}</TableCell>
                      <TableCell className="text-sm text-neutral-600">{entry.item_name}</TableCell>
                      <TableCell className="text-sm font-medium">${entry.amount_usd.toFixed(2)}</TableCell>
                      <TableCell className="text-sm text-neutral-600">#{entry.profile_index}</TableCell>
                      <TableCell>
                        <Badge
                          className={`border-0 text-xs ${
                            entry.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : entry.status === "failed"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                          data-testid={`badge-tx-status-${entry.id}`}
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-neutral-500">
                        {new Date(entry.created_at).toLocaleDateString()}{" "}
                        {new Date(entry.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
