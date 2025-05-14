
import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Animated } from "@/components/ui/animated";
import EmailAuthForm from "@/components/auth/EmailAuthForm";
import EmailAuthHeader from "@/components/auth/EmailAuthHeader";
import PreloadHome from "@/components/auth/PreloadHome";
import { useAuthSession } from "@/hooks/use-auth-session";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { logEvent, generateRequestId } from "@/utils/logging";

const Auth2Page = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { user } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authDebugInfo, setAuthDebugInfo] = useState<any>(null);
  const requestId = generateRequestId();
  
  // Get the redirect path from location state or default to home
  const from = location.state?.from || "/";

  // Check for any authentication errors in the URL params (after redirect)
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const error = queryParams.get('error');
    const errorDescription = queryParams.get('error_description');
    
    if (error) {
      console.error("Auth redirect error:", error, errorDescription);
      setAuthError(errorDescription || error);
      toast.error("Authentication error", {
        description: errorDescription || "Please try again"
      });
      
      logEvent({
        requestId,
        eventType: 'auth_redirect_error',
        component: 'Auth2Page',
        message: `Auth redirect error: ${error}`,
        metadata: { error, errorDescription },
        severity: 'error'
      });
    }
    
    // Handle any hash params for auth providers
    const handleHashParams = async () => {
      // Check if we have a hash in the URL (typical for OAuth redirects)
      const hashParams = window.location.hash;
      if (hashParams && hashParams.includes('access_token')) {
        try {
          setIsLoading(true);
          const { data, error } = await supabase.auth.getUser();
          if (error) throw error;
          
          if (data?.user) {
            toast.success("Signed in successfully!");
            console.log("User authenticated via hash params:", data.user.id);
          }
        } catch (err) {
          console.error("Error processing authentication hash:", err);
          setAuthError("Failed to process authentication");
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };
    
    handleHashParams();
  }, [requestId]);
  
  // Detect if we're in a sandbox preview environment
  const isSandboxPreview = window.location.hostname.includes('lovable.dev') || 
                          window.location.hostname.includes('lovable.ai');

  // Get detailed auth state for debugging in sandbox previews
  useEffect(() => {
    if (isSandboxPreview) {
      console.log("Sandbox preview environment detected:", window.location.hostname);
      logEvent({
        requestId,
        eventType: 'sandbox_preview_detected',
        component: 'Auth2Page',
        message: `Sandbox preview detected: ${window.location.hostname}`,
        metadata: { hostname: window.location.hostname, from }
      });
      
      // Get additional debug info for sandbox
      const getAuthState = async () => {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const { data: userData } = await supabase.auth.getUser();
          
          setAuthDebugInfo({
            hasSession: !!sessionData.session,
            hasUser: !!userData.user,
            sessionExpiry: sessionData.session?.expires_at,
            userEmail: userData.user?.email
          });
        } catch (err) {
          console.error("Error getting auth debug info:", err);
        }
      };
      
      getAuthState();
    }
  }, [isSandboxPreview, from, requestId]);

  if (isAuthenticated || user) {
    console.log("Already authenticated, redirecting to:", from);
    return <Navigate to={from} />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {/* Preload homepage assets in the background */}
      <PreloadHome />
      
      <div className="w-full max-w-md">
        <Animated type="fade" className="w-full">
          <Card className="p-4 md:p-8 shadow-lg border-0">
            <EmailAuthHeader from={from} />
            <EmailAuthForm from={from} />
            
            {isSandboxPreview && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-700">
                <p><strong>Note:</strong> You're using a sandbox preview environment.</p>
                <p className="mt-1">If you're having trouble signing in, make sure your Supabase project 
                has <strong>{window.location.origin}</strong> added as an authorized redirect URL.</p>
                
                <div className="mt-2 border-t border-amber-200 pt-2">
                  <p><strong>Important:</strong> For sandbox previews, you need to add the Lovable preview URL to your Supabase project's redirect URLs.</p>
                  <ol className="list-decimal pl-5 mt-1 space-y-1">
                    <li>Go to your Supabase dashboard → Authentication → URL Configuration</li>
                    <li>Add <code className="bg-amber-100 px-1 rounded">{window.location.origin}</code> to the list of redirect URLs</li>
                    <li>Save the changes</li>
                  </ol>
                </div>
              </div>
            )}
            
            {authError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                <p><strong>Authentication error:</strong> {authError}</p>
              </div>
            )}
            
            {isSandboxPreview && authDebugInfo && (
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700">
                <p><strong>Sandbox Auth Debug:</strong></p>
                <pre className="mt-1 whitespace-pre-wrap overflow-auto max-h-24">
                  {JSON.stringify(authDebugInfo, null, 2)}
                </pre>
              </div>
            )}
            
            <Animated type="fade" delay={0.6}>
              <div className="text-center text-sm text-muted-foreground mt-6">
                <p>Secure sign in with your email and password.</p>
              </div>
            </Animated>
          </Card>
        </Animated>
      </div>
    </div>
  );
};

export default Auth2Page;
