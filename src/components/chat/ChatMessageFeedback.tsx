
import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessageFeedbackProps {
  messageId: string;
  chatId: string;
  sourceInfo?: {
    source: string;
    found: boolean;
  };
}

const ChatMessageFeedback = ({ messageId, chatId, sourceInfo }: ChatMessageFeedbackProps) => {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (value: "helpful" | "unhelpful") => {
    if (feedback || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("chat_feedback").insert({
        message_id: messageId,
        chat_id: chatId,
        feedback: value,
        source_used: sourceInfo?.source || "unknown"
      });

      if (error) throw error;
      
      setFeedback(value);
      toast.success("Thank you for your feedback!");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (feedback) {
    return (
      <div className="text-xs text-muted-foreground/60 mt-2">
        Thanks for your feedback
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-muted/30">
      <span className="text-xs text-muted-foreground/70">Was this response helpful?</span>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 w-7 p-0 hover:bg-muted/50" 
        onClick={() => handleFeedback("helpful")}
        disabled={isSubmitting}
      >
        <ThumbsUp className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-foreground" />
        <span className="sr-only">Helpful</span>
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 w-7 p-0 hover:bg-muted/50" 
        onClick={() => handleFeedback("unhelpful")}
        disabled={isSubmitting}
      >
        <ThumbsDown className="h-3.5 w-3.5 text-muted-foreground/70 hover:text-foreground" />
        <span className="sr-only">Not helpful</span>
      </Button>
    </div>
  );
};

export default ChatMessageFeedback;
