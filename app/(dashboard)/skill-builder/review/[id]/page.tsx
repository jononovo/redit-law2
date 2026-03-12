"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Save,
  Loader2,
  Eye,
  Copy,
  Check,
  Download,
  Sparkles,
  Award,
  Users,
} from "lucide-react";
import { CHECKOUT_METHOD_LABELS, CAPABILITY_LABELS, CATEGORY_LABELS } from "@/lib/procurement-skills/types";
import type { CheckoutMethod, VendorCapability, VendorCategory } from "@/lib/procurement-skills/types";

type EvidenceItem = {
  id: number;
  field: string;
  source: string;
  url: string | null;
  snippet: string | null;
};

type DraftDetail = {
  id: number;
  vendorUrl: string;
  vendorSlug: string | null;
  vendorData: Record<string, unknown>;
  confidence: Record<string, number>;
  reviewNeeded: string[];
  status: string;
  autoPublish: boolean;
  createdBy: string;
  submitterUid: string | null;
  submitterName: string | null;
  submitterType: string;
  submissionSource: string;
  warnings: string[];
  evidence: EvidenceItem[];
  createdAt: string;
  updatedAt: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending Review", color: "bg-amber-100 text-amber-700 border-amber-200" },
  reviewed: { label: "Reviewed", color: "bg-blue-100 text-blue-700 border-blue-200" },
  published: { label: "Published", color: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200" },
};

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "text-green-600 bg-green-50" : pct >= 60 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";
  return (
    <span className={`${color} text-xs font-bold px-2 py-0.5 rounded-full`}>
      {pct}%
    </span>
  );
}

function FieldEditor({
  label,
  field,
  value,
  confidence,
  needsReview,
  evidence,
  onUpdate,
}: {
  label: string;
  field: string;
  value: unknown;
  confidence: number | undefined;
  needsReview: boolean;
  evidence: EvidenceItem[];
  onUpdate: (field: string, value: unknown) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(typeof value === "string" ? value : JSON.stringify(value, null, 2));
  const fieldEvidence = evidence.filter(e => e.field === field || e.field.startsWith(field + "."));

  return (
    <div className={`p-4 rounded-xl border ${needsReview ? "border-amber-300 bg-amber-50/30" : "border-neutral-200 bg-white"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{label}</span>
          {needsReview && (
            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Needs Review
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {confidence !== undefined && <ConfidenceBadge value={confidence} />}
          <button
            onClick={() => {
              if (editing) {
                try {
                  const parsed = typeof value === "string" ? editValue : JSON.parse(editValue);
                  onUpdate(field, parsed);
                } catch {
                  // keep raw string
                  onUpdate(field, editValue);
                }
              }
              setEditing(!editing);
            }}
            className="text-xs text-primary font-medium hover:underline"
            data-testid={`button-edit-${field}`}
          >
            {editing ? "Save" : "Edit"}
          </button>
        </div>
      </div>

      {editing ? (
        <textarea
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          className="w-full p-3 text-sm font-mono border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y min-h-[80px]"
          rows={typeof value === "string" ? 2 : Math.min(8, editValue.split("\n").length + 1)}
          data-testid={`input-edit-${field}`}
        />
      ) : (
        <div className="text-sm text-neutral-700">
          {typeof value === "boolean" ? (
            <Badge className={value ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
              {value ? "Yes" : "No"}
            </Badge>
          ) : typeof value === "object" && Array.isArray(value) ? (
            <div className="flex flex-wrap gap-1">
              {(value as string[]).map((v, i) => (
                <Badge key={i} className="bg-neutral-100 text-neutral-600 border-neutral-200 text-xs">{String(v)}</Badge>
              ))}
            </div>
          ) : typeof value === "object" && value !== null ? (
            <pre className="text-xs font-mono bg-neutral-50 p-2 rounded-lg overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
          ) : (
            <span>{String(value ?? "—")}</span>
          )}
        </div>
      )}

      {fieldEvidence.length > 0 && (
        <div className="mt-3 space-y-1">
          {fieldEvidence.map(ev => (
            <div key={ev.id} className="flex items-start gap-2 text-[11px] text-neutral-500">
              <Badge className="bg-neutral-100 text-neutral-500 border-neutral-200 text-[10px] shrink-0">{ev.source}</Badge>
              <span className="line-clamp-2">{ev.snippet}</span>
              {ev.url && (
                <a href={ev.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SkillDraftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [draft, setDraft] = useState<DraftDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewMd, setPreviewMd] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, unknown>>({});

  const fetchDraft = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/skills/drafts/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDraft(data);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => { fetchDraft(); }, [id]);

  const handleFieldUpdate = (field: string, value: unknown) => {
    setPendingUpdates(prev => ({ ...prev, [field]: value }));
    if (draft) {
      const updatedData = { ...(draft.vendorData as Record<string, unknown>) };
      const keys = field.split(".");
      if (keys.length === 1) {
        updatedData[field] = value;
      } else {
        let obj = updatedData;
        for (let i = 0; i < keys.length - 1; i++) {
          if (typeof obj[keys[i]] !== "object" || obj[keys[i]] === null) {
            obj[keys[i]] = {};
          }
          obj = obj[keys[i]] as Record<string, unknown>;
        }
        obj[keys[keys.length - 1]] = value;
      }
      setDraft({ ...draft, vendorData: updatedData });
    }
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/skills/drafts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorData: draft.vendorData, status: "reviewed" }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Draft saved and marked as reviewed" });
        setPendingUpdates({});
        fetchDraft();
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.message || "Save failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    }
    setSaving(false);
  };

  const handlePublish = async () => {
    setPublishing(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/skills/drafts/${id}/publish`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setPreviewMd(data.skillMd);
        setMessage({ type: "success", text: "Published! Copy the SKILL.md below or add the vendor to the registry." });
        fetchDraft();
      } else {
        setMessage({ type: "error", text: data.message || "Publish failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    }
    setPublishing(false);
  };

  const handleReject = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/skills/drafts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Draft rejected" });
        fetchDraft();
      }
    } catch {
      // ignore
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">Draft not found</p>
        <Link href="/skill-builder/review" className="text-primary text-sm mt-2 inline-block">Back to drafts</Link>
      </div>
    );
  }

  const vendorData = draft.vendorData as Record<string, unknown>;
  const statusInfo = STATUS_CONFIG[draft.status] || STATUS_CONFIG.pending;
  const isEditable = draft.status === "pending" || draft.status === "reviewed";

  return (
    <div className="space-y-6" data-testid="draft-detail-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/skill-builder/review" className="p-2 hover:bg-neutral-100 rounded-lg transition-colors" data-testid="link-back">
            <ArrowLeft className="w-5 h-5 text-neutral-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-draft-name">
              {(vendorData.name as string) || draft.vendorSlug || "Draft"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <a href={draft.vendorUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-neutral-400 hover:text-primary flex items-center gap-1">
                {draft.vendorUrl} <ExternalLink className="w-3 h-3" />
              </a>
              <Badge className={`${statusInfo.color} border text-xs`}>{statusInfo.label}</Badge>
              {draft.submissionSource === "community" && (
                draft.submitterType === "official" ? (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs flex items-center gap-0.5">
                    <Award className="w-3 h-3" />
                    Official
                  </Badge>
                ) : (
                  <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs flex items-center gap-0.5">
                    <Users className="w-3 h-3" />
                    Community
                  </Badge>
                )
              )}
              {draft.autoPublish && (
                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Auto-publish eligible
                </Badge>
              )}
              <Link href={`/app/skills/review/${id}/versions`} className="text-xs text-primary font-medium hover:underline flex items-center gap-1" data-testid="link-version-history">
                Version History →
              </Link>
            </div>
          </div>
        </div>
        {isEditable && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleReject} disabled={saving} className="rounded-xl" data-testid="button-reject">
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button variant="outline" onClick={handleSave} disabled={saving} className="rounded-xl" data-testid="button-save">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save & Review
            </Button>
            <Button onClick={handlePublish} disabled={publishing} className="rounded-xl" data-testid="button-publish">
              {publishing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Publish
            </Button>
          </div>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-sm font-medium flex items-center gap-2 ${
          message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`} data-testid="text-message">
          {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {draft.submissionSource === "community" && draft.submitterName && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {draft.submitterName[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <div className="text-sm font-medium">{draft.submitterName}</div>
            <div className="text-xs text-neutral-400">
              Submitted {new Date(draft.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {draft.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-bold text-sm text-amber-700 flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" />
            Warnings ({draft.warnings.length})
          </h3>
          <ul className="space-y-1">
            {draft.warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-600">• {w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FieldEditor
          label="Vendor Name"
          field="name"
          value={vendorData.name}
          confidence={draft.confidence.name}
          needsReview={draft.reviewNeeded.includes("name")}
          evidence={draft.evidence}
          onUpdate={handleFieldUpdate}
        />
        <FieldEditor
          label="Slug"
          field="slug"
          value={vendorData.slug}
          confidence={draft.confidence.slug}
          needsReview={draft.reviewNeeded.includes("slug")}
          evidence={draft.evidence}
          onUpdate={handleFieldUpdate}
        />
        <FieldEditor
          label="Category"
          field="category"
          value={vendorData.category}
          confidence={draft.confidence.category}
          needsReview={draft.reviewNeeded.includes("category")}
          evidence={draft.evidence}
          onUpdate={handleFieldUpdate}
        />
        <FieldEditor
          label="Checkout Methods"
          field="checkoutMethods"
          value={vendorData.checkoutMethods}
          confidence={draft.confidence.checkoutMethods}
          needsReview={draft.reviewNeeded.includes("checkoutMethods")}
          evidence={draft.evidence}
          onUpdate={handleFieldUpdate}
        />
        <FieldEditor
          label="Capabilities"
          field="capabilities"
          value={vendorData.capabilities}
          confidence={draft.confidence.capabilities}
          needsReview={draft.reviewNeeded.includes("capabilities")}
          evidence={draft.evidence}
          onUpdate={handleFieldUpdate}
        />
        <FieldEditor
          label="Search"
          field="search"
          value={vendorData.search}
          confidence={draft.confidence.search}
          needsReview={draft.reviewNeeded.includes("search")}
          evidence={draft.evidence}
          onUpdate={handleFieldUpdate}
        />
        <FieldEditor
          label="Checkout Config"
          field="checkout"
          value={vendorData.checkout}
          confidence={draft.confidence.checkout}
          needsReview={draft.reviewNeeded.includes("checkout")}
          evidence={draft.evidence}
          onUpdate={handleFieldUpdate}
        />
        <FieldEditor
          label="Shipping"
          field="shipping"
          value={vendorData.shipping}
          confidence={draft.confidence.shipping}
          needsReview={draft.reviewNeeded.includes("shipping")}
          evidence={draft.evidence}
          onUpdate={handleFieldUpdate}
        />
        <div className="lg:col-span-2">
          <FieldEditor
            label="Tips"
            field="tips"
            value={vendorData.tips}
            confidence={draft.confidence.tips}
            needsReview={draft.reviewNeeded.includes("tips")}
            evidence={draft.evidence}
            onUpdate={handleFieldUpdate}
          />
        </div>
        <FieldEditor
          label="Method Config"
          field="methodConfig"
          value={vendorData.methodConfig}
          confidence={draft.confidence.methodConfig}
          needsReview={draft.reviewNeeded.includes("methodConfig")}
          evidence={draft.evidence}
          onUpdate={handleFieldUpdate}
        />
        <FieldEditor
          label="Version"
          field="version"
          value={vendorData.version}
          confidence={undefined}
          needsReview={false}
          evidence={[]}
          onUpdate={handleFieldUpdate}
        />
      </div>

      {draft.evidence.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            All Evidence ({draft.evidence.length})
          </h3>
          <div className="space-y-2">
            {draft.evidence.map(ev => (
              <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50 text-sm">
                <Badge className="bg-neutral-100 text-neutral-600 border-neutral-200 text-[10px] shrink-0">{ev.source}</Badge>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-neutral-700">{ev.field}</span>
                  {ev.snippet && <p className="text-neutral-500 text-xs mt-0.5 line-clamp-3">{ev.snippet}</p>}
                </div>
                {ev.url && (
                  <a href={ev.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-neutral-400 hover:text-primary">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {previewMd && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-6" data-testid="skill-preview">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              Generated SKILL.md
            </h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(previewMd);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
              data-testid="button-copy-skill"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-[500px] overflow-y-auto">
            {previewMd}
          </pre>
        </div>
      )}
    </div>
  );
}
