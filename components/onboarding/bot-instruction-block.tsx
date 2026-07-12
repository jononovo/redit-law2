"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

const BOT_INSTRUCTIONS = "Register at creditclaw.com/SKILL.md";

interface BotInstructionBlockProps {
  onCopied?: () => void;
  code?: string;
}

export function BotInstructionBlock({ onCopied, code }: BotInstructionBlockProps) {
  const [copied, setCopied] = useState(false);

  const lines = code ? [BOT_INSTRUCTIONS, `Use code: ${code}`] : [BOT_INSTRUCTIONS];

  function handleCopy() {
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    onCopied?.();
  }

  return (
    <div className="space-y-4">
      <div className={`bg-neutral-900 rounded-xl p-4 transition-opacity duration-300 ${copied ? "opacity-40" : ""}`}>
        <code className="text-sm text-neutral-100 leading-relaxed block text-center" data-testid="text-bot-instructions">
          {lines.map((line) => (
            <span key={line} className="block">{line}</span>
          ))}
        </code>
      </div>
      <Button
        onClick={handleCopy}
        variant={copied ? "outline" : "default"}
        className="w-full gap-2 cursor-pointer rounded-xl h-12 text-base"
        data-testid="button-copy-bot-instructions"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? "Copied | Now paste it into your bot chat" : "Copy"}
      </Button>
    </div>
  );
}
