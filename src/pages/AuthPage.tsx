
import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { UserIcon } from "lucide-react";
import Logo from "../components/Logo";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";

const AuthPage = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (session?.user) {
        console.log("Session found:", session);
        setUser(session.user);
      } else {
        console.log("No active session found");
      }
    };
    checkSession();

    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event, session);
      setUser(session?.user || null);
      if (session?.user) {
        console.log("User authenticated:", session.user);
        navigate("/");
      } else {
        console.log("No authenticated user");
      }
    });
    return () => {
      console.log("Cleaning up auth subscriptions");
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const {
        error,
        data
      } = await supabase.auth.signInWithOAuth({
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
      toast.error("Sign in failed", {
        description: "An unexpected error occurred"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAccess = () => {
    setUser(null);
    const { setIsGuest } = useAuth();
    setIsGuest(true);
    navigate('/');
  };

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
          <p className="mt-2 text-sm text-muted-foreground"></p>
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

          <Button 
            variant="secondary" 
            size="lg" 
            className="w-full flex items-center justify-center gap-2 h-12" 
            onClick={handleGuestAccess}
          >
            <UserIcon className="h-5 w-5" />
            Continue as Guest
          </Button>
        </div>
        
        <div className="text-center text-sm text-muted-foreground mt-4">
          <p>Secure sign in with your Google account</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
