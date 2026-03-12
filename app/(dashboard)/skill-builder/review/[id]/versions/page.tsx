"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Clock,
  RotateCcw,
  GitCompare,
  FileText,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type VersionSummary = {
  id: number;
  version: string;
  changeType: string;
  changeSummary: string | null;
  changedFields: string[] | null;
  isActive: boolean;
  publishedBy: string | null;
  sourceType: string;
  createdAt: string;
};

type FieldDiff = {
  field: string;
  label: string;
  type: "added" | "removed" | "changed";
  oldValue: unknown;
  newValue: unknown;
  severity: "breaking" | "notable" | "minor";
};

type DiffData = {
  from: { id: number; version: string };
  to: { id: number; version: string };
  diff: {
    fromVersion: string;
    toVersion: string;
    fields: FieldDiff[];
    breakingChanges: number;
    totalChanges: number;
    summary: string;
  };
};

const CHANGE_TYPE_STYLES: Record<string, { label: string; color: string }> = {
  initial: { label: "Initial", color: "bg-blue-100 text-blue-700" },
  edit: { label: "Edit", color: "bg-green-100 text-green-700" },
  community_update: { label: "Community", color: "bg-purple-100 text-purple-700" },
  rollback: { label: "Rollback", color: "bg-orange-100 text-orange-700" },
};

const SEVERITY_ICONS: Record<string, { icon: string; color: string }> = {
  breaking: { icon: "🔴", color: "text-red-600" },
  notable: { icon: "🟡", color: "text-yellow-600" },
  minor: { icon: "🟢", color: "text-green-600" },
};

export default function VersionHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorSlug, setVendorSlug] = useState<string>("");
  const [diffData, setDiffData] = useState<DiffData | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState<number | null>(null);

  useEffect(() => {
    async function loadDraft() {
      try {
        const draftRes = await fetch(`/api/v1/skills/drafts/${id}`);
        if (!draftRes.ok) return;
        const draft = await draftRes.json();
        const slug = draft.vendorSlug || (draft.vendorData as Record<string, string>)?.slug || "";
        setVendorSlug(slug);

        if (slug) {
          const versionsRes = await fetch(`/api/v1/skills/versions?vendor=${slug}`);
          if (versionsRes.ok) {
            const data = await versionsRes.json();
            setVersions(data.versions || []);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    loadDraft();
  }, [id]);

  async function loadDiff(versionId: number, compareId?: number) {
    setDiffLoading(true);
    setDiffData(null);
    try {
      const url = compareId
        ? `/api/v1/skills/versions/${versionId}/diff?compare=${compareId}`
        : `/api/v1/skills/versions/${versionId}/diff`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDiffData(data);
      }
    } finally {
      setDiffLoading(false);
    }
  }

  async function handleRollback(versionId: number) {
    const reason = prompt("Reason for rollback:");
    if (!reason) return;

    setRollbackLoading(versionId);
    try {
      const res = await fetch(`/api/v1/skills/versions/${versionId}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        const versionsRes = await fetch(`/api/v1/skills/versions?vendor=${vendorSlug}`);
        if (versionsRes.ok) {
          const data = await versionsRes.json();
          setVersions(data.versions || []);
        }
        setDiffData(null);
      }
    } finally {
      setRollbackLoading(null);
    }
  }

  function formatValue(val: unknown): string {
    if (val === null || val === undefined) return "—";
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "boolean") return val ? "Yes" : "No";
    return String(val);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/app/skills/review/${id}`}>
          <Button variant="ghost" size="sm" data-testid="link-back-to-draft">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Draft
          </Button>
        </Link>
        <h1 className="text-2xl font-bold" data-testid="text-version-title">
          Version History — {vendorSlug || `Draft #${id}`}
        </h1>
      </div>

      {versions.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground" data-testid="text-no-versions">
          No versions published yet. Publish this draft to create the first version.
        </div>
      ) : (
        <div className="space-y-3">
          {versions.map((v, idx) => {
            const style = CHANGE_TYPE_STYLES[v.changeType] || { label: v.changeType, color: "bg-gray-100 text-gray-700" };
            const isExpanded = expandedVersion === v.id;

            return (
              <div
                key={v.id}
                className={`rounded-xl border bg-card p-4 space-y-3 ${v.isActive ? "border-green-300 bg-green-50/30" : ""}`}
                data-testid={`card-version-${v.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-lg" data-testid={`text-version-number-${v.id}`}>
                      v{v.version}
                    </span>
                    {v.isActive && (
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200" data-testid={`badge-active-${v.id}`}>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                      </Badge>
                    )}
                    <Badge className={style.color} data-testid={`badge-change-type-${v.id}`}>
                      {style.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(v.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {v.changeSummary && (
                  <p className="text-sm text-muted-foreground" data-testid={`text-change-summary-${v.id}`}>
                    {v.changeSummary}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedVersion(isExpanded ? null : v.id)}
                    data-testid={`button-view-${v.id}`}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    {isExpanded ? "Hide" : "View"}
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                  </Button>

                  {idx < versions.length - 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadDiff(v.id)}
                      disabled={diffLoading}
                      data-testid={`button-diff-${v.id}`}
                    >
                      <GitCompare className="w-3.5 h-3.5 mr-1" />
                      Diff with previous
                    </Button>
                  )}

                  {!v.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRollback(v.id)}
                      disabled={rollbackLoading === v.id}
                      data-testid={`button-rollback-${v.id}`}
                    >
                      {rollbackLoading === v.id ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      )}
                      Rollback
                    </Button>
                  )}
                </div>

                {isExpanded && (
                  <VersionDetail versionId={v.id} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {diffLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Computing diff...</span>
        </div>
      )}

      {diffData && (
        <div className="rounded-xl border bg-card p-6 space-y-4" data-testid="card-diff-view">
          <h2 className="text-lg font-bold">
            v{diffData.diff.fromVersion} → v{diffData.diff.toVersion}
          </h2>
          <p className="text-sm text-muted-foreground" data-testid="text-diff-summary">
            {diffData.diff.summary}
          </p>

          {diffData.diff.fields.length === 0 ? (
            <p className="text-muted-foreground">No changes detected.</p>
          ) : (
            <div className="space-y-3">
              {diffData.diff.fields.map((field, idx) => {
                const sev = SEVERITY_ICONS[field.severity] || { icon: "⚪", color: "text-gray-600" };
                return (
                  <div key={idx} className="border rounded-lg p-3 space-y-1" data-testid={`diff-field-${field.field}`}>
                    <div className="flex items-center gap-2">
                      <span>{sev.icon}</span>
                      <span className={`font-medium ${sev.color}`}>{field.label}</span>
                      <Badge variant="outline" className="text-xs">{field.severity}</Badge>
                    </div>
                    {field.type === "added" && (
                      <p className="text-sm text-green-600">+ Added: {formatValue(field.newValue)}</p>
                    )}
                    {field.type === "removed" && (
                      <p className="text-sm text-red-600">- Removed: {formatValue(field.oldValue)}</p>
                    )}
                    {field.type === "changed" && (
                      <div className="text-sm space-y-0.5">
                        <p className="text-red-600">- {formatValue(field.oldValue)}</p>
                        <p className="text-green-600">+ {formatValue(field.newValue)}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VersionDetail({ versionId }: { versionId: number }) {
  const [files, setFiles] = useState<Record<string, string | object | null> | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("SKILL.md");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/skills/versions/${versionId}/files`);
        if (res.ok) {
          const data = await res.json();
          setFiles(data.files);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [versionId]);

  if (loading) {
    return <div className="p-4"><Loader2 className="w-4 h-4 animate-spin" /></div>;
  }

  if (!files) return null;

  const tabs = ["SKILL.md", "skill.json", "payments.md", "description.md"];
  const content = files[activeTab];
  const displayContent = typeof content === "object" ? JSON.stringify(content, null, 2) : (content || "");

  return (
    <div className="border rounded-lg overflow-hidden mt-2" data-testid={`version-files-${versionId}`}>
      <div className="flex border-b bg-muted/50">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary bg-background"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab(tab)}
            data-testid={`tab-${tab}`}
          >
            {tab}
          </button>
        ))}
      </div>
      <pre className="p-4 text-xs overflow-auto max-h-[400px] bg-muted/20 whitespace-pre-wrap" data-testid={`text-file-content-${versionId}`}>
        {displayContent}
      </pre>
    </div>
  );
}
