"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useTenant } from "@/lib/tenants/tenant-context";

export function CopySkillUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const tenant = useTenant();
  const isDark = (tenant.navigation?.header?.variant ?? "light") === "dark";

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={isDark
      ? "bg-neutral-900 rounded-none border border-neutral-800 p-6"
      : "bg-white rounded-2xl border border-neutral-100 p-6 shadow-sm"
    }>
      <h3 className={`font-bold text-sm mb-4 ${isDark ? "text-neutral-100" : "text-neutral-900"}`}>Skill URL</h3>
      <div className={isDark
        ? "bg-neutral-800 rounded-none p-3 mb-3"
        : "bg-neutral-50 rounded-xl p-3 mb-3"
      }>
        <code className={`text-xs font-mono break-all ${isDark ? "text-neutral-300" : "text-neutral-700"}`}>{url}</code>
      </div>
      <Button
        variant="outline"
        size="sm"
        className={`w-full text-xs font-semibold ${isDark
          ? "rounded-none border-neutral-700 text-neutral-300 hover:bg-neutral-800"
          : "rounded-xl"
        }`}
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
