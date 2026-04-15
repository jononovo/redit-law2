"use client";

import { AGENT_TEST_FIELDS } from "../constants";

interface AgentTestProgressIndicatorProps {
  fieldsFilled: number;
  totalFields: number;
  status: string;
}

const STATUS_LABELS: Record<string, string> = {
  created: "Waiting for agent to start...",
  awaiting_approval: "Approval requested — check your email",
  approved: "Approved! Agent is navigating to checkout...",
  page_loaded: "Agent has loaded the checkout page",
  in_progress: "Agent is filling out the form",
  submitted: "Agent submitted — scoring...",
  scored: "Test complete!",
};

export function AgentTestProgressIndicator({
  fieldsFilled,
  totalFields,
  status,
}: AgentTestProgressIndicatorProps) {
  const label = STATUS_LABELS[status] ?? status;
  const progress = totalFields > 0 ? (fieldsFilled / totalFields) * 100 : 0;

  const statusColor =
    status === "awaiting_approval" ? "text-amber-600" :
    status === "approved" ? "text-blue-600" :
    status === "scored" ? "text-green-600" :
    "text-neutral-600";

  const barColor =
    status === "scored" ? "bg-green-500" :
    status === "awaiting_approval" ? "bg-amber-400" :
    "bg-blue-500";

  return (
    <div className="w-full space-y-2" data-testid="agent-test-progress">
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${statusColor}`} data-testid="progress-status">
          {label}
        </span>
        {status === "in_progress" && (
          <span className="text-xs text-neutral-500" data-testid="progress-count">
            {fieldsFilled}/{totalFields} fields
          </span>
        )}
      </div>

      <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${status === "scored" || status === "submitted" ? 100 : progress}%` }}
          data-testid="progress-bar"
        />
      </div>

      {(status === "in_progress" || status === "page_loaded") && (
        <div className="flex gap-1 mt-1">
          {AGENT_TEST_FIELDS.map((field, i) => (
            <div
              key={field}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < fieldsFilled ? "bg-blue-500" : "bg-neutral-200"
              }`}
              title={field}
              data-testid={`milestone-${field}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
