"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Download,
  CheckCircle2,
  Loader2,
  ExternalLink,
  RefreshCw,
  Package,
  GitCompare,
} from "lucide-react";

type ExportItem = {
  vendorSlug: string;
  vendorName: string;
  currentVersion: string;
  lastExportedVersion: string | null;
  status: "new" | "updated";
  versionId: number;
  files: {
    skillMd: string;
    skillJson: unknown;
    paymentsMd: string | null;
    descriptionMd: string | null;
  };
};

type ExportReport = {
  destination: string;
  newCount: number;
  updatedCount: number;
  newSkills: ExportItem[];
  updatedSkills: ExportItem[];
};

export default function ExportPage() {
  const [destination, setDestination] = useState<"clawhub" | "skills_sh">("clawhub");
  const [report, setReport] = useState<ExportReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);
  const [markSuccess, setMarkSuccess] = useState(false);

  async function loadReport() {
    setLoading(true);
    setMarkSuccess(false);
    try {
      const res = await fetch(`/api/v1/skills/export?destination=${destination}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
        setSelected(new Set());
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, [destination]);

  function toggleSelect(slug: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function selectAll() {
    if (!report) return;
    const allSlugs = [...report.newSkills, ...report.updatedSkills].map(s => s.vendorSlug);
    setSelected(new Set(allSlugs));
  }

  async function markExported() {
    if (!report || selected.size === 0) return;
    setMarking(true);
    try {
      const allItems = [...report.newSkills, ...report.updatedSkills];
      const items = allItems
        .filter(s => selected.has(s.vendorSlug))
        .map(s => ({ vendorSlug: s.vendorSlug, versionId: s.versionId }));

      const res = await fetch("/api/v1/skills/export/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, destination }),
      });

      if (res.ok) {
        setMarkSuccess(true);
        await loadReport();
      }
    } finally {
      setMarking(false);
    }
  }

  function downloadPackage(item: ExportItem) {
    const content = JSON.stringify({
      vendorSlug: item.vendorSlug,
      version: item.currentVersion,
      files: item.files,
    }, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.vendorSlug}-v${item.currentVersion}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const destinationLabels: Record<string, string> = {
    clawhub: "ClawHub.ai",
    skills_sh: "skills.sh",
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/skill-builder/review">
          <Button variant="ghost" size="sm" data-testid="link-back-to-review">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Review
          </Button>
        </Link>
        <h1 className="text-2xl font-bold" data-testid="text-export-title">Skill Export</h1>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Destination:</label>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value as any)}
            className="rounded-lg border px-3 py-1.5 text-sm bg-background"
            data-testid="select-destination"
          >
            <option value="clawhub">ClawHub.ai</option>
            <option value="skills_sh">skills.sh</option>
          </select>
        </div>

        <Button variant="outline" size="sm" onClick={loadReport} disabled={loading} data-testid="button-refresh">
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {markSuccess && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-2" data-testid="text-mark-success">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="text-green-700 text-sm font-medium">
            Selected skills marked as exported to {destinationLabels[destination]}.
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : report ? (
        <>
          {report.newCount === 0 && report.updatedCount === 0 ? (
            <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground" data-testid="text-no-exports">
              All published skills are up to date on {destinationLabels[destination]}. Nothing to export.
            </div>
          ) : (
            <>
              {report.newSkills.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-new-skills-header">
                    <Package className="w-5 h-5 text-blue-600" />
                    New Skills ({report.newCount})
                  </h2>
                  {report.newSkills.map(item => (
                    <ExportItemCard
                      key={item.vendorSlug}
                      item={item}
                      selected={selected.has(item.vendorSlug)}
                      onToggle={() => toggleSelect(item.vendorSlug)}
                      onDownload={() => downloadPackage(item)}
                    />
                  ))}
                </div>
              )}

              {report.updatedSkills.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold flex items-center gap-2" data-testid="text-updated-skills-header">
                    <GitCompare className="w-5 h-5 text-yellow-600" />
                    Updated Skills ({report.updatedCount})
                  </h2>
                  {report.updatedSkills.map(item => (
                    <ExportItemCard
                      key={item.vendorSlug}
                      item={item}
                      selected={selected.has(item.vendorSlug)}
                      onToggle={() => toggleSelect(item.vendorSlug)}
                      onDownload={() => downloadPackage(item)}
                    />
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={selectAll} data-testid="button-select-all">
                  Select All
                </Button>
                <Button
                  onClick={markExported}
                  disabled={marking || selected.size === 0}
                  data-testid="button-mark-exported"
                >
                  {marking ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                  )}
                  Mark Selected as Exported ({selected.size})
                </Button>
              </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

function ExportItemCard({
  item,
  selected,
  onToggle,
  onDownload,
}: {
  item: ExportItem;
  selected: boolean;
  onToggle: () => void;
  onDownload: () => void;
}) {
  return (
    <div
      className={`rounded-xl border bg-card p-4 flex items-center justify-between ${
        selected ? "border-primary bg-primary/5" : ""
      }`}
      data-testid={`card-export-${item.vendorSlug}`}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="rounded"
          data-testid={`checkbox-${item.vendorSlug}`}
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium" data-testid={`text-vendor-name-${item.vendorSlug}`}>{item.vendorName}</span>
            <Badge variant="outline" className="font-mono text-xs" data-testid={`badge-version-${item.vendorSlug}`}>
              v{item.currentVersion}
            </Badge>
            {item.status === "new" && (
              <Badge className="bg-blue-100 text-blue-700">New</Badge>
            )}
            {item.status === "updated" && (
              <Badge className="bg-yellow-100 text-yellow-700">
                {item.lastExportedVersion} → {item.currentVersion}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{item.vendorSlug}</p>
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={onDownload} data-testid={`button-download-${item.vendorSlug}`}>
        <Download className="w-3.5 h-3.5 mr-1" />
        Download
      </Button>
    </div>
  );
}
