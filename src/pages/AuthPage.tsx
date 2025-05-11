
import { useState, useEffect } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { UserIcon } from "lucide-react";
import Logo from "../components/Logo";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Animated } from "@/components/ui/animated";
import { Card } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

const AuthPage = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, setIsGuest } = useAuth();
  const isMobile = useIsMobile();
  
  // Get the redirect path from location state or default to home
  const from = location.state?.from || "/";

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
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error checking session:", error);
          return;
        }
        
        if (session?.user) {
          console.log("Session found:", session);
          setUser(session.user);
        } else {
          console.log("No active session found");
        }
      } catch (e) {
        console.error("Failed to check session:", e);
      }
    };
    
    checkSession();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event, session);
      
      // First do synchronous updates
      setUser(session?.user || null);
      
      // Then defer navigation to avoid potential deadlocks
      if (session?.user) {
        console.log("User authenticated:", session.user, "Redirecting to:", from);
        setTimeout(() => {
          navigate(from);
        }, 0);
      } else {
        console.log("No authenticated user");
      }
    });

    return () => {
      console.log("Cleaning up auth subscriptions");
      subscription.unsubscribe();
    };
  }, [navigate, from]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    console.log("Starting Google sign-in process");
    
    try {
      // Get the current URL origin (e.g., https://example.com)
      const origin = window.location.origin;
      const redirectTo = `${origin}${from}`;
      
      console.log("Sign in with Google - Origin:", origin);
      console.log("Sign in with Google - Redirect URL:", redirectTo);
      
      // Mobile-specific adjustments for Google sign-in
      const options = {
        redirectTo: redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      };
      
      // Log additional information for debugging
      console.log("Device is mobile:", isMobile);
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

  const handleGuestAccess = async () => {
    try {
      // First set the flag in localStorage directly for immediate effect
      localStorage.setItem('isGuestSession', 'true');
      
      // Then update context state
      setIsGuest(true);
      
      toast.success("Continuing as guest with admin access");
      console.log("Guest mode enabled, redirecting to:", from);
      
      // Wait a moment before redirecting to ensure state is properly updated
      setTimeout(() => {
        navigate(from);
      }, 100);
    } catch (error) {
      console.error("Error enabling guest mode:", error);
      toast.error("Failed to enable guest mode");
    }
  };

  if (isAuthenticated) {
    console.log("Already authenticated, redirecting to:", from);
    return <Navigate to={from} />;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Animated type="fade" className="w-full">
          <Card className="p-4 md:p-8 shadow-lg border-0">
            <div className="flex flex-col items-center text-center">
              <Animated type="scale" delay={0.2}>
                <Logo />
              </Animated>
              
              <Animated type="slide-up" delay={0.3} className="mt-6">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sign in to the Streamline Group Portal</h1>
              </Animated>
              
              <Animated type="fade" delay={0.4}>
                <p className="mt-2 text-sm text-muted-foreground">
                  {from !== "/" ? "You'll be redirected back to the page you were trying to access." : ""}
                </p>
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
