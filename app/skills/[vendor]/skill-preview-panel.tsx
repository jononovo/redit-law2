"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function SkillPreviewPanel({ skillMd, slug }: { skillMd: string; slug: string }) {
  const [showSkillPreview, setShowSkillPreview] = useState(false);

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
    <div className="bg-white rounded-2xl border border-neutral-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-neutral-900 flex items-center gap-2">
          SKILL.md Preview
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSkillPreview(!showSkillPreview)}
            className="text-xs font-semibold"
            data-testid="button-toggle-preview"
          >
            {showSkillPreview ? "Hide" : "Show"} Preview
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-xs font-semibold"
            data-testid="button-download-skill"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Download
          </Button>
        </div>
      </div>
      {showSkillPreview && (
        <pre className="bg-neutral-50 rounded-xl p-4 text-xs font-mono text-neutral-700 overflow-x-auto max-h-[600px] overflow-y-auto border border-neutral-100" data-testid="preview-skill-md">
          {skillMd}
        </pre>
      )}
    </div>
  );
}
