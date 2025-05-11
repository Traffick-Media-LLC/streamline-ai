
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useIsMobile } from "@/hooks/use-mobile";

export const useGoogleAuth = (redirectTo: string) => {
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    console.log("Starting Google sign-in process");
    
    try {
      // Get the current URL origin (e.g., https://example.com)
      const origin = window.location.origin;
      const fullRedirectTo = `${origin}${redirectTo}`;
      
      console.log("Sign in with Google - Origin:", origin);
      console.log("Sign in with Google - Redirect URL:", fullRedirectTo);
      console.log("Device is mobile:", isMobile);
      
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
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: options
      });
      
      if (error) {
        console.error("Google sign in error:", error);
        toast.error("Sign in failed", {
          description: error.message
        });
        setLoading(false);
      } else {
        console.log("Google sign in initiated successfully:", data);
      }
    } catch (error) {
      console.error("Unexpected error during sign in:", error);
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
