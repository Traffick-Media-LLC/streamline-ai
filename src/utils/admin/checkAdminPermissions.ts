import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logEvent, logError, generateRequestId } from "@/utils/logging";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext"; // Add the missing import

export interface PermissionCheckResult {
  success: boolean;
  error?: string | null;
  data?: unknown;
}
