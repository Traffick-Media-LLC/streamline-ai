
import React from "react";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { UserIcon } from "lucide-react";
import { Animated } from "@/components/ui/animated";
import { useGoogleAuth } from "@/hooks/use-google-auth";

interface AuthFormProps {
  from: string;
  loading: boolean;
  onGuestAccess: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ from, loading, onGuestAccess }) => {
  const { loading: googleLoading, handleGoogleSignIn } = useGoogleAuth(from);
  
  return (
    <Animated type="slide-up" delay={0.5} className="mt-8 space-y-4">
      <Button 
        variant="outline" 
        size="lg" 
        className="w-full flex items-center justify-center gap-2 h-12 transition-all duration-300 hover:-translate-y-1 hover:shadow-md" 
        onClick={handleGoogleSignIn} 
        disabled={loading || googleLoading}
      >
        <FcGoogle className="h-5 w-5" />
        {(loading || googleLoading) ? "Signing in..." : "Sign in with Google"}
      </Button>

      <Button 
        variant="secondary" 
        size="lg" 
        className="w-full flex items-center justify-center gap-2 h-12 transition-all duration-300 hover:-translate-y-1 hover:shadow-md" 
        onClick={onGuestAccess}
      >
        <UserIcon className="h-5 w-5" />
        Continue as Guest
      </Button>
    </Animated>
  );
};

export default AuthForm;
