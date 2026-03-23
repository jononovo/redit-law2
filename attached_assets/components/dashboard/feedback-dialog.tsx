"use client";

import { useState } from "react";
import { LifeBuoy, Send, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type FeedbackType = "bug" | "feature" | "billing" | "technical" | "general";

const feedbackTypes: { value: FeedbackType; label: string }[] = [
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "billing", label: "Billing Question" },
  { value: "technical", label: "Technical Support" },
  { value: "general", label: "General Feedback" },
];

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [feedbackType, setFeedbackType] = useState<string>("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!feedbackType || !message.trim()) {
      toast({
        title: "Missing fields",
        description: "Please select a feedback type and enter a message.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: feedbackType, message: message.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send feedback");
      }

      toast({
        title: "Feedback sent",
        description: "Thank you for your feedback! We'll get back to you soon.",
      });
      setFeedbackType("");
      setMessage("");
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to send feedback",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="dialog-feedback">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-feedback-title">
            <LifeBuoy className="h-5 w-5 text-primary" />
            Support
          </DialogTitle>
          <DialogDescription data-testid="text-feedback-description">
            Have a question, found a bug, or want to request a feature? We'd love to hear from you.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="feedback-type" className="text-sm font-medium">
              Type
            </label>
            <Select value={feedbackType} onValueChange={setFeedbackType}>
              <SelectTrigger id="feedback-type" data-testid="select-feedback-type">
                <SelectValue placeholder="Select feedback type" />
              </SelectTrigger>
              <SelectContent>
                {feedbackTypes.map((type) => (
                  <SelectItem
                    key={type.value}
                    value={type.value}
                    data-testid={`select-item-feedback-type-${type.value}`}
                  >
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label htmlFor="feedback-message" className="text-sm font-medium">
              Message
            </label>
            <Textarea
              id="feedback-message"
              rows={4}
              placeholder="Tell us what's on your mind..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              data-testid="textarea-feedback-message"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-feedback-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!feedbackType || !message.trim() || isSubmitting}
            data-testid="button-feedback-submit"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
