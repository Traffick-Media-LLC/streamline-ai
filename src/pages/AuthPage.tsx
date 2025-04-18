
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
  const navigate = useNavigate();

  // Check for existing session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };

    checkSession();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
        if (session?.user) {
          navigate("/");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) {
        toast.error("Sign in failed", {
          description: error.message
        });
      }
    } catch (error) {
      toast.error("Sign in failed", {
        description: "An unexpected error occurred"
      });
    } finally {
      setLoading(false);
    }
  };

  // If user is already authenticated, redirect to home
  if (user) {
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
      </div>
    </div>
  );
};

export default AuthPage;
