"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useTenant } from "@/lib/platform-management/tenants/tenant-context";

function useIsDark() {
  const tenant = useTenant();
  return (tenant.navigation?.header?.variant ?? "light") === "dark";
}

export function SkillPreviewPanel({ skillMd, slug }: { skillMd: string; slug: string }) {
  const [showSkillPreview, setShowSkillPreview] = useState(false);
  const isDark = useIsDark();

  const handleDownload = () => {
    const blob = new Blob([skillMd], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-skill.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={isDark
      ? "bg-neutral-900 rounded-none border border-neutral-800 p-6"
      : "bg-white rounded-2xl border border-neutral-100 p-6"
    }>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold flex items-center gap-2 ${isDark ? "text-neutral-100" : "text-neutral-900"}`}>
          SKILL.md Preview
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSkillPreview(!showSkillPreview)}
            className={`text-xs font-semibold ${isDark ? "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800" : ""}`}
            data-testid="button-toggle-preview"
          >
            {showSkillPreview ? "Hide" : "Show"} Preview
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className={`text-xs font-semibold ${isDark ? "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800" : ""}`}
            data-testid="button-download-skill"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Download
          </Button>
        </div>
      </div>
      {showSkillPreview && (
        <pre className={`p-4 text-xs font-mono overflow-x-auto max-h-[600px] overflow-y-auto border ${
          isDark
            ? "bg-neutral-800 rounded-none text-neutral-300 border-neutral-700"
            : "bg-neutral-50 rounded-xl text-neutral-700 border-neutral-100"
        }`} data-testid="preview-skill-md">
          {skillMd}
        </pre>
      )}
    </div>
  );
}

export function SkillJsonPanel({ slug }: { slug: string }) {
  const [showPreview, setShowPreview] = useState(false);
  const [jsonData, setJsonData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const isDark = useIsDark();

  const fetchJson = useCallback(async () => {
    if (jsonData) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/brands/${slug}/skill-json`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setJsonData(JSON.stringify(data, null, 2));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [slug, jsonData]);

  useEffect(() => {
    if (showPreview && !jsonData && !loading) {
      fetchJson();
    }
  }, [showPreview, jsonData, loading, fetchJson]);

  const handleDownload = async () => {
    let data = jsonData;
    if (!data) {
      try {
        const res = await fetch(`/brands/${slug}/skill-json`);
        if (!res.ok) return;
        const parsed = await res.json();
        data = JSON.stringify(parsed, null, 2);
        setJsonData(data);
      } catch {
        return;
      }
    }
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-skill.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={isDark
      ? "bg-neutral-900 rounded-none border border-neutral-800 p-6"
      : "bg-white rounded-2xl border border-neutral-100 p-6"
    }>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold flex items-center gap-2 ${isDark ? "text-neutral-100" : "text-neutral-900"}`}>
          skill.json
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className={`text-xs font-semibold ${isDark ? "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800" : ""}`}
            data-testid="button-toggle-json-preview"
          >
            {showPreview ? "Hide" : "Show"} Preview
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className={`text-xs font-semibold ${isDark ? "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800" : ""}`}
            data-testid="button-download-skill-json"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Download
          </Button>
        </div>
      </div>
      {showPreview && (
        <div>
          {loading && (
            <p className="text-xs text-neutral-400 font-mono py-4">Loading...</p>
          )}
          {error && (
            <p className="text-xs text-red-500 font-mono py-4">Failed to load skill.json</p>
          )}
          {jsonData && (
            <pre className={`p-4 text-xs font-mono overflow-x-auto max-h-[600px] overflow-y-auto border ${
              isDark
                ? "bg-neutral-800 rounded-none text-neutral-300 border-neutral-700"
                : "bg-neutral-50 rounded-xl text-neutral-700 border-neutral-100"
            }`} data-testid="preview-skill-json">
              {jsonData}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
