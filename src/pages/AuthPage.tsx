
import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import Logo from "../components/Logo";
import { toast } from "@/components/ui/sonner";

const AuthPage = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [debug, setDebug] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check for existing session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        console.log("Session found:", session);
        setUser(session.user);
      } else {
        console.log("No active session found");
      }
    };

    checkSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state change:", event, session);
        setUser(session?.user || null);
        if (session?.user) {
          console.log("User authenticated:", session.user);
          navigate("/");
        } else {
          console.log("No authenticated user");
        }
      }
    );

    return () => {
      console.log("Cleaning up auth subscriptions");
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const currentUrl = window.location.origin;
      setDebug(`Attempting sign-in from: ${currentUrl}`);
      console.log("Sign-in attempt from:", currentUrl);

      const { error, data } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline'
          }
        }
      });

      if (error) {
        console.error("Google sign in error:", error);
        setDebug(`Error: ${error.message}`);
        toast.error("Sign in failed", {
          description: error.message
        });
      }
      
      if (data) {
        console.log("Auth response data:", data);
        console.log("Auth URL:", data.url);
      }
    } catch (error: any) {
      console.error("Unexpected error during sign in:", error);
      setDebug(`Unexpected error: ${error.message || JSON.stringify(error)}`);
      toast.error("Sign in failed", {
        description: "An unexpected error occurred"
      });
    } finally {
      setLoading(false);
    }
  };

  // If user is already authenticated, redirect to home
  if (user) {
    console.log("Redirecting authenticated user to home");
    return <Navigate to="/" />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <Logo />
          <h1 className="mt-6 text-3xl font-bold tracking-tight">
            Sign in to Streamline AI
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your legal assistant for regulated industries
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <Button
            variant="outline"
            size="lg"
            className="w-full flex items-center justify-center gap-2 h-12"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <FcGoogle className="h-5 w-5" />
            {loading ? "Signing in..." : "Sign in with Google"}
          </Button>
        </div>
        
        <div className="text-center text-sm text-muted-foreground mt-4">
          <p>Secure sign in with your Google account</p>
        </div>
        
        {debug && (
          <div className="mt-4 p-4 bg-muted rounded-md overflow-auto max-h-32">
            <p className="text-xs font-mono">{debug}</p>
          </div>
        )}
        
        <div className="mt-4 p-4 bg-muted rounded-md">
          <h3 className="font-medium text-sm mb-2">Troubleshooting Tips:</h3>
          <ul className="text-xs space-y-1 list-disc pl-4">
            <li>Your current URL: {window.location.origin}</li>
            <li>Make sure this URL is added to your Google OAuth authorized origins</li>
            <li>Add this redirect URL in Google Console: {window.location.origin}</li>
            <li>Add this redirect URL in Supabase Auth settings: {window.location.origin}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
