
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { Animated } from "@/components/ui/animated";
import { useGoogleAuth } from "@/hooks/use-google-auth";
import { useEmailAuth } from "@/hooks/use-email-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Mail, Lock } from "lucide-react";

interface AuthFormProps {
  from: string;
  loading: boolean;
}

const AuthForm: React.FC<AuthFormProps> = ({ from, loading: externalLoading }) => {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMethod, setAuthMethod] = useState<"google" | "email">("google");
  const [emailLoading, setEmailLoading] = useState(false);
  
  const { loading: googleLoading, handleGoogleSignIn } = useGoogleAuth(from);
  const { signIn, signUp } = useEmailAuth();
  const isMobile = useIsMobile();

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };
  
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please enter both email and password");
      return;
    }
    
    setEmailLoading(true);
    
    try {
      if (authMode === "signin") {
        // Sign in with email
        const result = await signIn(email, password);
        if (result.success) {
          toast.success("Signed in successfully");
          // Auth context will handle redirection
        } else {
          toast.error(result.message || "Failed to sign in");
        }
      } else {
        // Sign up with email
        if (!email.endsWith('@streamlinevape.com')) {
          toast.error("Access restricted to @streamlinevape.com email addresses");
          setEmailLoading(false);
          return;
        }
        
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          setEmailLoading(false);
          return;
        }
        
        if (password.length < 6) {
          toast.error("Password must be at least 6 characters");
          setEmailLoading(false);
          return;
        }
        
        const result = await signUp(email, password);
        if (result.success) {
          toast.success(result.message || "Account created successfully");
          if (!result.session) {
            // Switch to sign in mode if email verification is required
            setAuthMode("signin");
            resetForm();
          }
          // If session exists, Auth context will handle redirection
        } else {
          toast.error(result.message || "Failed to create account");
        }
      }
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred");
      console.error("Auth error:", error);
    } finally {
      setEmailLoading(false);
    }
  };
  
  const isLoading = externalLoading || googleLoading || emailLoading;
  
  return (
    <Animated type="slide-up" delay={0.5} className="mt-8 space-y-4">
      <Tabs value={authMethod} onValueChange={(value) => setAuthMethod(value as "google" | "email")} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="google">Google</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>
        
        <TabsContent value="google">
          <Button 
            variant="outline" 
            size={isMobile ? "default" : "lg"} 
            className="w-full flex items-center justify-center gap-2 h-12 transition-all duration-300 hover:-translate-y-1 hover:shadow-md" 
            onClick={handleGoogleSignIn} 
            disabled={isLoading}
          >
            <FcGoogle className="h-5 w-5" />
            {isLoading ? "Signing in..." : "Sign in with Google"}
          </Button>
        </TabsContent>
        
        <TabsContent value="email" className="space-y-4">
          <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as "signin" | "signup")}>
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-8"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-8"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 transition-all duration-300 hover:-translate-y-1 hover:shadow-md" 
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-8"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-8"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Password must be at least 6 characters</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-8"
                      disabled={isLoading}
                      required
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 transition-all duration-300 hover:-translate-y-1 hover:shadow-md" 
                  disabled={isLoading}
                >
                  {isLoading ? "Signing up..." : "Sign up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
      
      <p className="text-xs text-center text-muted-foreground mt-4">
        Access restricted to @streamlinevape.com accounts
      </p>
    </Animated>
  );
};

export default AuthForm;
