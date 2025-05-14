
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { logEvent, logError, generateRequestId } from "@/utils/logging";

export const useGoogleAuth = (redirectTo: string) => {
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const requestId = generateRequestId();
    console.log("Starting Google sign-in process");
    
    try {
      // Get the current URL origin (e.g., https://example.com)
      const origin = window.location.origin;
      const fullRedirectTo = `${origin}${redirectTo}`;
      
      console.log("Sign in with Google - Origin:", origin);
      console.log("Sign in with Google - Redirect URL:", fullRedirectTo);
      console.log("Device is mobile:", isMobile);
      
      // Log the sign-in attempt
      await logEvent({
        requestId,
        eventType: 'google_auth_attempt',
        component: 'useGoogleAuth',
        message: `Google sign-in attempt from origin: ${origin}`,
        metadata: { redirectTo: fullRedirectTo, isMobile }
      });
      
      // Mobile-specific adjustments for Google sign-in
      const options = {
        redirectTo: fullRedirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        },
        skipBrowserRedirect: false // Ensure browser is redirected properly
      };
      
      // Log additional information for debugging
      console.log("Google sign-in options:", JSON.stringify(options));
      
      // Check if we're in a sandbox preview
      const isSandboxPreview = window.location.hostname.includes('lovable.dev') || 
                              window.location.hostname.includes('lovable.ai');
      
      if (isSandboxPreview) {
        console.log("Sandbox preview detected for Google auth:", window.location.hostname);
        toast.info("Starting Google authentication", {
          description: "You'll be redirected to Google to sign in"
        });
      }
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: options
      });
      
      if (error) {
        console.error("Google sign in error:", error);
        await logError(
          requestId,
          'useGoogleAuth',
          'Google sign-in failed',
          error,
          { isMobile, isSandbox: isSandboxPreview }
        );
        
        toast.error("Sign in failed", {
          description: error.message
        });
        setLoading(false);
      } else {
        console.log("Google sign in initiated successfully:", data);
        await logEvent({
          requestId,
          eventType: 'google_auth_initiated',
          component: 'useGoogleAuth',
          message: 'Google sign-in initiated successfully',
          metadata: { provider: "google" }
        });
      }
    } catch (error: any) {
      console.error("Unexpected error during sign in:", error);
      await logError(
        requestId,
        'useGoogleAuth',
        'Unexpected error during Google sign-in',
        error,
        { isMobile }
      );
      
      toast.error("Sign in failed", {
        description: "An unexpected error occurred"
      });
      setLoading(false);
    }
  };

  return {
    loading,
    handleGoogleSignIn
  };
};
