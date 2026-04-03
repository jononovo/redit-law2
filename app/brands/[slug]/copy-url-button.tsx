"use client";

import { useState, useCallback } from "react";
import { Copy, CheckCircle2 } from "lucide-react";

export function CopyUrlButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const url = `${window.location.origin}/brands/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [slug]);

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl border border-neutral-200 bg-white text-sm font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
      data-testid="button-copy-url"
    >
      {copied ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          Share
        </>
      )}
    </button>
  );
}
