"use client";

import { type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";

export interface ExplainerContent {
  title: string;
  icon: ReactNode;
  containerClassName: string;
  iconWrapClassName: string;
  body: ReactNode;
  testId: string;
}

export function ExplainerToggleLink({
  title,
  onOpen,
  testId,
}: {
  title: string;
  onOpen: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid={testId}
      className="group flex items-center gap-1 text-neutral-500 hover:text-neutral-800 transition-colors"
    >
      <span>{title}</span>
      <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
    </button>
  );
}

export function ExplainerBlock({
  content,
  onClose,
}: {
  content: ExplainerContent;
  onClose: () => void;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-6 ${content.containerClassName}`}
      data-testid={content.testId}
    >
      <button
        type="button"
        aria-label="Close explainer"
        onClick={onClose}
        data-testid={`${content.testId}-close`}
        className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${content.iconWrapClassName}`}
        >
          {content.icon}
        </div>
        <div className="pr-6">
          <h3 className="font-bold text-neutral-900 mb-1">{content.title}</h3>
          <p className="text-sm text-neutral-600 leading-relaxed">{content.body}</p>
        </div>
      </div>
    </div>
  );
}
