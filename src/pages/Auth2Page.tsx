
import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Animated } from "@/components/ui/animated";
import EmailAuthForm from "@/components/auth/EmailAuthForm";
import EmailAuthHeader from "@/components/auth/EmailAuthHeader";
import PreloadHome from "@/components/auth/PreloadHome";
import { useAuthSession } from "@/hooks/use-auth-session";

const Auth2Page = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { user } = useAuthSession();
  
  // Get the redirect path from location state or default to home
  const from = location.state?.from || "/";

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
