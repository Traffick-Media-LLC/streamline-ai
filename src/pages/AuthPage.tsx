
import { useState } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Animated } from "@/components/ui/animated";
import AuthForm from "@/components/auth/AuthForm";
import AuthHeader from "@/components/auth/AuthHeader";
import PreloadHome from "@/components/auth/PreloadHome";
import { useAuthSession } from "@/hooks/use-auth-session";

const AuthPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, setIsGuest } = useAuth();
  const { user } = useAuthSession();
  
  // Get the redirect path from location state or default to home
  const from = location.state?.from || "/";

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
            <AuthHeader from={from} />
            <AuthForm 
              from={from}
              loading={loading}
              onGuestAccess={handleGuestAccess}
            />
            
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
