"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export function CopySkillUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm">
      <h3 className="font-bold text-sm text-neutral-900 mb-4">Skill URL</h3>
      <div className="bg-neutral-50 rounded-xl p-3 mb-3">
        <code className="text-xs font-mono text-neutral-700 break-all">{url}</code>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full rounded-xl text-xs font-semibold"
        onClick={handleCopy}
        data-testid="button-copy-skill-url"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 mr-1" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 mr-1" />
            Copy URL
          </>
        )}
      </Button>
    </div>
  );
}
