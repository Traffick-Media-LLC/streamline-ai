
// To avoid circular dependencies, we re-export the toast from sonner directly
import { toast } from "sonner";

// Re-export toast
export { toast };

// Export useToast hook from @/hooks/use-toast
import { useToast } from "@/hooks/use-toast";
export { useToast };
