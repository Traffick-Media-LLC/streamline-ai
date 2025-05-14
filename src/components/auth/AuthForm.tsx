
import React from "react";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { Animated } from "@/components/ui/animated";
import { useGoogleAuth } from "@/hooks/use-google-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "react-router-dom";

interface AuthFormProps {
  from: string;
  loading: boolean;
}

const AuthForm: React.FC<AuthFormProps> = ({ from, loading }) => {
  const { loading: googleLoading, handleGoogleSignIn } = useGoogleAuth(from);
  const isMobile = useIsMobile();
  
  return (
    <Animated type="slide-up" delay={0.5} className="mt-8 space-y-4">
      <Button 
        variant="outline" 
        size={isMobile ? "default" : "lg"} 
        className="w-full flex items-center justify-center gap-2 h-12 transition-all duration-300 hover:-translate-y-1 hover:shadow-md" 
        onClick={handleGoogleSignIn} 
        disabled={loading || googleLoading}
      >
        <FcGoogle className="h-5 w-5" />
        {(loading || googleLoading) ? "Signing in..." : "Sign in with Google"}
      </Button>
      
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>
      
      <Button 
        variant="secondary"
        size={isMobile ? "default" : "lg"}
        className="w-full h-12"
        asChild
      >
        <Link to="/auth2" state={{ from }}>
          Sign in with Email
        </Link>
      </Button>
    </Animated>
  );
};

export default AuthForm;
