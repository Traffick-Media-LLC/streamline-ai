
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
import { logEvent, logError, generateRequestId } from "@/utils/logging";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

const Auth2Page = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { user } = useAuthSession();
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authDebugInfo, setAuthDebugInfo] = useState<any | null>(null);
  
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
      
      logError(
        requestId,
        'Auth2Page',
        `Auth redirect error: ${error}`,
        new Error(error),
        {
          error,
          errorDescription,
          url: window.location.href
        },
        undefined,
        undefined, 
        'error',
        'auth'
      );
    }
    
    // Handle any hash params for auth providers
    const handleHashParams = async () => {
      // Check if we have a hash in the URL (typical for OAuth redirects)
      const hashParams = window.location.hash;
      
      if (hashParams && hashParams.includes('access_token')) {
        try {
          setIsLoading(true);
          
          logEvent(
            requestId,
            'Auth2Page',
            'auth_hash_params_detected',
            'Hash params detected in URL, attempting to process authentication',
            {
              hashLength: hashParams.length
            }
          );
          
          const { data, error } = await supabase.auth.getUser();
          
          if (error) {
            logError(
              requestId,
              'Auth2Page',
              'Failed to get user from hash params',
              error,
              {
                hashLength: hashParams.length
              },
              undefined,
              undefined,
              'error',
              'auth'
            );
            
            throw error;
          }
          
          if (data?.user) {
            toast.success("Signed in successfully!");
            console.log("User authenticated via hash params:", data.user.id);
            
            logEvent(
              requestId,
              'Auth2Page',
              'auth_hash_success',
              `User authenticated via hash params: ${data.user.id}`,
              {
                userId: data.user.id,
                email: data.user.email
              }
            );
          }
        } catch (err) {
          console.error("Error processing authentication hash:", err);
          setAuthError("Failed to process authentication");
          
          logError(
            requestId,
            'Auth2Page',
            'Error processing authentication hash',
            err,
            {
              hashLength: hashParams.length
            },
            undefined,
            undefined,
            'error',
            'auth'
          );
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
      
      logEvent(
        requestId,
        'Auth2Page',
        'sandbox_preview_detected',
        `Sandbox preview detected: ${window.location.hostname}`,
        {
          hostname: window.location.hostname,
          from
        }
      );
      
      // Get additional debug info for sandbox
      const getAuthState = async () => {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const { data: userData } = await supabase.auth.getUser();
          
          setAuthDebugInfo({
            hasSession: !!sessionData.session,
            hasUser: !!userData.user,
            sessionExpiry: sessionData.session?.expires_at,
            userEmail: userData.user?.email,
            origin: window.location.origin,
            redirectTo: window.location.origin + from
          });
          
          logEvent(
            requestId,
            'Auth2Page',
            'auth_debug_info',
            'Auth debug info retrieved',
            {
              hasSession: !!sessionData.session,
              hasUser: !!userData.user,
              origin: window.location.origin,
              redirectTo: window.location.origin + from
            }
          );
        } catch (err) {
          console.error("Error getting auth debug info:", err);
          
          logError(
            requestId,
            'Auth2Page',
            'Error getting auth debug info',
            err,
            {
              hostname: window.location.hostname
            },
            undefined,
            undefined,
            'error',
            'auth'
          );
        }
      };
      
      getAuthState();
    }
  }, [isSandboxPreview, from, requestId]);

  if (isAuthenticated || user) {
    console.log("Already authenticated, redirecting to:", from);
    
    logEvent(
      requestId,
      'Auth2Page',
      'auth_already_authenticated',
      `Already authenticated, redirecting to: ${from}`,
      {
        userId: user?.id,
        redirectTo: from
      }
    );
    
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
            
            {authError && (
              <Alert className="mt-4 border-red-200 bg-red-50 text-red-800">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Authentication Error</AlertTitle>
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}
            
            {isSandboxPreview && (
              <div className="mt-4">
                <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Sandbox Preview Environment</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>To make authentication work in the sandbox preview:</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Go to your <strong>Supabase Dashboard</strong> → Authentication → URL Configuration</li>
                      <li>Add this URL to the <strong>Redirect URLs</strong>: {window.location.origin}</li>
                    </ol>
                    
                    {authDebugInfo && (
                      <div className="mt-2 pt-2 border-t border-amber-200">
                        <p className="text-xs font-medium">Debug Information</p>
                        <pre className="mt-1 text-xs overflow-auto p-2 bg-amber-100 rounded">
                          {JSON.stringify(authDebugInfo, null, 2)}
                        </pre>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
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
