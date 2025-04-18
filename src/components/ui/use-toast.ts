
// This file should re-export from hooks/use-toast without creating circular dependencies
import { useToast as useToastHook, toast } from "@/hooks/use-toast";

export const useToast = useToastHook;
export { toast };
