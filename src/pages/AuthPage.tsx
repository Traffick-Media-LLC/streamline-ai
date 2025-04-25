
import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { UserIcon } from "lucide-react";
import Logo from "../components/Logo";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Animated } from "@/components/ui/animated";
import { Card } from "@/components/ui/card";

const AuthPage = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated, setIsGuest } = useAuth();

  useEffect(() => {
    // Preload the homepage assets
    const preloadHomeAssets = async () => {
      try {
        // Preload critical images
        const imageUrls = ["/lovable-uploads/82b6b84f-934d-49af-88ae-b539479ec3a9.png", "/lovable-uploads/84e0fd80-b14f-4f1d-9dd9-b248e7c6014e.png"];
        imageUrls.forEach(url => {
          const img = new Image();
          img.src = url;
        });

        // Preload the homepage component
        await import('../pages/HomePage');
      } catch (error) {
        console.error("Failed to preload assets:", error);
      }
    };

    // Start preloading after the auth page is loaded
    const timer = setTimeout(() => {
      preloadHomeAssets();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
    setIsGuest(true);
    toast.success("Continuing as guest with admin access");
    navigate('/');
  };

  if (isAuthenticated) {
    console.log("Already authenticated, redirecting to home");
    return <Navigate to="/" />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Animated type="fade" className="w-full">
          <Card className="p-8 shadow-lg border-0">
            <div className="flex flex-col items-center text-center">
              <Animated type="scale" delay={0.2}>
                <Logo />
              </Animated>
              
              <Animated type="slide-up" delay={0.3} className="mt-6">
                <h1 className="text-3xl font-bold tracking-tight">Sign in to the Streamline Group Portal</h1>
              </Animated>
              
              <Animated type="fade" delay={0.4}>
                <p className="mt-2 text-sm text-muted-foreground"></p>
              </Animated>
            </div>

            <Animated type="slide-up" delay={0.5} className="mt-8 space-y-4">
              <Button variant="outline" size="lg" className="w-full flex items-center justify-center gap-2 h-12 transition-all duration-300 hover:-translate-y-1 hover:shadow-md" onClick={handleGoogleSignIn} disabled={loading}>
                <FcGoogle className="h-5 w-5" />
                {loading ? "Signing in..." : "Sign in with Google"}
              </Button>

              <Button variant="secondary" size="lg" className="w-full flex items-center justify-center gap-2 h-12 transition-all duration-300 hover:-translate-y-1 hover:shadow-md" onClick={handleGuestAccess}>
                <UserIcon className="h-5 w-5" />
                Continue as Guest
              </Button>
            </Animated>
            
            <Animated type="fade" delay={0.6}>
              <div className="text-center text-sm text-muted-foreground mt-6">
                <p>Secure sign in with your Streamline Google account.</p>
              </div>
            </Animated>
          </Card>
        </Animated>
      </div>
    </div>
  );
};

export default AuthPage;
