
import React from "react";
import { Animated } from "@/components/ui/animated";
import Logo from "@/components/Logo";

interface AuthHeaderProps {
  from: string;
}

const AuthHeader: React.FC<AuthHeaderProps> = ({ from }) => {
  return (
    <div className="flex flex-col items-center text-center">
      <Animated type="scale" delay={0.2}>
        <Logo />
      </Animated>
      
      <Animated type="slide-up" delay={0.3} className="mt-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Sign in to the Streamline Group Portal
        </h1>
      </Animated>
      
      <Animated type="fade" delay={0.4}>
        <p className="mt-2 text-sm text-muted-foreground">
          {from !== "/" ? "You'll be redirected back to the page you were trying to access." : ""}
        </p>
      </Animated>
    </div>
  );
};

export default AuthHeader;
