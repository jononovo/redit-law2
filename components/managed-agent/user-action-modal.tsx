"use client";

import { formatMmSs } from "@/lib/managed-agent-checkouts";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface JsonSchemaProperty {
  type?: string;
  enum?: Array<string | number | boolean>;
  description?: string;
  title?: string;
}

interface UserActionModalProps {
  action: {
    id: string;
    response_schema: unknown;
    expires_at: string | null;
  };
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

function schemaProperties(schema: unknown): Record<string, JsonSchemaProperty> | null {
  if (!schema || typeof schema !== "object") return null;
  const props = (schema as { properties?: unknown }).properties;
  if (!props || typeof props !== "object" || Object.keys(props).length === 0) return null;
  return props as Record<string, JsonSchemaProperty>;
}

// "shipping_option" / "shippingOption" → "Shipping option"
function prettifyName(name: string): string {
  const spaced = name.replace(/[_-]+/g, " ").replace(/([a-z\d])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}


export function UserActionModal({ action, onSubmit, onCancel }: UserActionModalProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [freeText, setFreeText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const properties = useMemo(() => schemaProperties(action.response_schema), [action.response_schema]);
  const fields = useMemo(() => (properties ? Object.entries(properties) : []), [properties]);
  // A lone enum field submits on click — no separate Submit button needed.
  const singleEnumField = fields.length === 1 && Array.isArray(fields[0][1].enum);

  useEffect(() => {
    if (!action.expires_at) return;
    const target = new Date(action.expires_at).getTime();
    const tick = () => setRemaining(Math.max(0, Math.floor((target - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [action.expires_at]);

  const doSubmit = async (vals: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await onSubmit(vals);
    } finally {
      setSubmitting(false);
    }
  };

  const allChosen = fields.every(([name, prop]) =>
    Array.isArray(prop.enum) || prop.type === "boolean" ? values[name] !== undefined : true
  );

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !submitting) onCancel();
      }}
    >
      <DialogContent onInteractOutside={(e) => e.preventDefault()} data-testid="user-action-modal">
        <DialogHeader>
          <DialogTitle>The agent needs your input</DialogTitle>
          <DialogDescription>Answer below to keep the checkout moving.</DialogDescription>
        </DialogHeader>

        {remaining !== null && (
          <p className="text-xs text-neutral-400" data-testid="text-action-countdown">
            Expires in {formatMmSs(remaining)}
          </p>
        )}

        {properties ? (
          <div className="flex flex-col gap-5">
            {fields.map(([name, prop]) => (
              <div key={name} className="flex flex-col gap-2">
                <Label>{prop.title || prettifyName(name)}</Label>
                {prop.description && <p className="text-xs text-neutral-400">{prop.description}</p>}

                {Array.isArray(prop.enum) ? (
                  <div className="flex flex-col gap-2">
                    {prop.enum.map((option, i) => (
                      <Button
                        key={i}
                        type="button"
                        variant="outline"
                        disabled={submitting}
                        className={cn(
                          "w-full justify-start",
                          values[name] === option && "border-primary bg-primary/5"
                        )}
                        onClick={() => {
                          setValues((v) => ({ ...v, [name]: option }));
                          if (singleEnumField) void doSubmit({ [name]: option });
                        }}
                        data-testid={`button-action-option-${name}-${i}`}
                      >
                        {String(option)}
                      </Button>
                    ))}
                  </div>
                ) : prop.type === "boolean" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={submitting}
                      className={cn(values[name] === true && "border-primary bg-primary/5")}
                      onClick={() => setValues((v) => ({ ...v, [name]: true }))}
                      data-testid={`button-action-${name}-yes`}
                    >
                      Yes
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={submitting}
                      className={cn(values[name] === false && "border-primary bg-primary/5")}
                      onClick={() => setValues((v) => ({ ...v, [name]: false }))}
                      data-testid={`button-action-${name}-no`}
                    >
                      No
                    </Button>
                  </div>
                ) : (
                  <Input
                    value={typeof values[name] === "string" ? (values[name] as string) : ""}
                    onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                    disabled={submitting}
                    data-testid={`input-action-${name}`}
                  />
                )}
              </div>
            ))}

            {!singleEnumField && (
              <Button
                onClick={() => void doSubmit(values)}
                disabled={submitting || !allChosen}
                data-testid="button-action-submit"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
              </Button>
            )}
            {singleEnumField && submitting && (
              <div className="flex justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <pre className="bg-neutral-50 border border-neutral-100 rounded-xl p-3 text-xs font-mono overflow-x-auto">
              {JSON.stringify(action.response_schema, null, 2)}
            </pre>
            <Input
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Your answer"
              disabled={submitting}
              data-testid="input-action-answer"
            />
            <Button
              onClick={() => void doSubmit({ answer: freeText })}
              disabled={submitting || !freeText.trim()}
              data-testid="button-action-submit"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send answer"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
