
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Animated } from "@/components/ui/animated";
import { useEmailAuth } from "@/hooks/use-email-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, ArrowRight, Mail } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

interface EmailAuthFormProps {
  from: string;
}

// Form validation schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const EmailAuthForm: React.FC<EmailAuthFormProps> = ({ from }) => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const { login, signup, loading } = useEmailAuth(from);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  
  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    const result = await login(values.email, values.password);
    if (!result.success) {
      toast.error("Login failed", {
        description: result.error || "Please check your credentials and try again"
      });
    }
  };
  
  const handleSignup = async (values: z.infer<typeof signupSchema>) => {
    const result = await signup(values.email, values.password);
    if (!result.success) {
      toast.error("Sign up failed", {
        description: result.error || "Please try again with a different email"
      });
    }
  };
  
  return (
    <Animated type="slide-up" delay={0.5} className="mt-8 space-y-4">
      <Tabs defaultValue="login" onValueChange={(value) => setMode(value as "login" | "signup")} className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="login">Log In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        
        <TabsContent value="login" className="mt-4">
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="your@email.com" 
                          type="email"
                          className="pl-10"
                          disabled={loading}
                          {...field} 
                        />
                        <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="••••••••" 
                          type={showPassword ? "text" : "password"} 
                          className="pr-10"
                          disabled={loading}
                          {...field} 
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="absolute right-0 top-0 h-full px-3 py-2"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full h-11 mt-6"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Log In"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </Form>
        </TabsContent>
        
        <TabsContent value="signup" className="mt-4">
          <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
              <FormField
                control={signupForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="your@email.com" 
                          type="email"
                          className="pl-10"
                          disabled={loading}
                          {...field} 
                        />
                        <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={signupForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          placeholder="••••••••" 
                          type={showPassword ? "text" : "password"} 
                          className="pr-10"
                          disabled={loading}
                          {...field} 
                        />
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="absolute right-0 top-0 h-full px-3 py-2"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={signupForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="••••••••" 
                        type={showPassword ? "text" : "password"} 
                        disabled={loading}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full h-11 mt-6"
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Create Account"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </Animated>
  );
};

export default EmailAuthForm;
