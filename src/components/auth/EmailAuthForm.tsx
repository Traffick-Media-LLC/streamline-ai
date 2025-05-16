import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useEmailAuth } from "@/hooks/use-email-auth";
import { logEvent } from "@/utils/logging";

interface EmailAuthFormProps {
  from: string;
}

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(6, "Password must be at least 6 characters")
});

const EmailAuthForm = ({ from }: EmailAuthFormProps) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const { login, signup, loading, requestId } = useEmailAuth(from);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: ""
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const { email, password } = values;
    
    // Log form submission
    logEvent(
      requestId,
      'EmailAuthForm',
      isSignUp ? 'auth_signup_submit' : 'auth_login_submit',
      `Form submitted for ${isSignUp ? 'signup' : 'login'}`,
      {
        email,
        from
      }
    );
    
    if (isSignUp) {
      const result = await signup(email, password);
      if (!result.success) {
        form.setError("root", { 
          message: result.error || "Signup failed" 
        });
      }
    } else {
      const result = await login(email, password);
      if (!result.success) {
        form.setError("root", { 
          message: result.error || "Login failed" 
        });
        
        // Log form error
        logEvent(
          requestId,
          'EmailAuthForm',
          'auth_form_error',
          `Form error: ${result.error}`,
          {
            email,
            error: result.error,
            from
          },
          'warning'
        );
      }
    }
  };

  const toggleAuthMode = () => {
    form.reset();
    setIsSignUp(!isSignUp);
    
    // Log auth mode toggle
    logEvent(
      requestId,
      'EmailAuthForm',
      'auth_mode_toggle',
      `Auth mode toggled to ${!isSignUp ? 'signup' : 'login'}`,
      { from }
    );
  };

  return (
    <div className="mt-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="email@example.com" 
                    {...field} 
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    {...field} 
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {form.formState.errors.root && (
            <div className="text-destructive text-sm">
              {form.formState.errors.root.message}
            </div>
          )}
          
          <div className="space-y-2">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
            </Button>
            
            <div className="text-center text-sm">
              <Button 
                variant="link" 
                type="button" 
                onClick={toggleAuthMode}
                disabled={loading}
                className="p-0 h-auto text-muted-foreground hover:text-primary"
              >
                {isSignUp 
                  ? "Already have an account? Sign In" 
                  : "Don't have an account? Sign Up"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EmailAuthForm;
