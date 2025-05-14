
import React from "react";
import { Animated } from "@/components/ui/animated";
import Logo from "@/components/Logo";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface EmailAuthHeaderProps {
  from: string;
}

const EmailAuthHeader: React.FC<EmailAuthHeaderProps> = ({ from }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex flex-col items-center text-center">
      <Animated type="scale" delay={0.2}>
        <Logo />
      </Animated>
      
      <Animated type="slide-up" delay={0.3} className="mt-6">
        <h1 className={`${isMobile ? "text-xl" : "text-2xl md:text-3xl"} font-bold tracking-tight`}>
          Sign in with Email
        </h1>
      </Animated>
      
      <Animated type="fade" delay={0.4}>
        <p className="mt-2 text-sm text-muted-foreground">
          {from !== "/" ? "You'll be redirected back to the page you were trying to access." : ""}
        </p>
      </Animated>

      <Animated type="fade" delay={0.5}>
        <p className="mt-4 text-sm">
          Prefer Google? <Link to="/auth" state={{ from }} className="text-primary underline hover:text-primary/80">Sign in with Google</Link>
        </p>
      </Animated>
    </div>
  );
};

export default EmailAuthHeader;
