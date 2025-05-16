
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { logError, logEvent, generateRequestId } from "@/utils/logging";
import { ErrorTracker } from "@/utils/logging/ErrorTracker";

export const useEmailAuth = (redirectTo: string) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const requestId = generateRequestId();
  
  // Create an error tracker for consistent logging
  const errorTracker = new ErrorTracker('EmailAuthHook');

  const login = async (email: string, password: string) => {
    setLoading(true);
    console.log("Starting email sign-in process");
    
    try {
      // Log the authentication attempt
      logEvent(
        requestId,
        'EmailAuthForm',
        'auth_login_attempt',
        `Email login attempt: ${email}`,
        {
          email,
          redirectTo
        }
      );
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error("Email sign in error:", error);
        setLoading(false);
        
        // Log authentication error
        logError(
          requestId,
          'EmailAuthForm',
          `Email sign in failed: ${error.message}`,
          error,
          {
            email,
            errorCode: error.code,
            errorName: error.name,
            redirectTo
          },
          undefined,
          undefined,
          'error',
          'auth'
        );
        
        return { success: false, error: error.message };
      } 
      
      console.log("Email sign in successful:", data);
      
      // Log successful authentication
      logEvent(
        requestId,
        'EmailAuthForm',
        'auth_login_success',
        `Email login successful: ${email}`,
        {
          email,
          userId: data.user?.id,
          redirectTo
        }
      );
      
      toast.success("Signed in successfully!");
      navigate(redirectTo);
      return { success: true };
    } catch (error: any) {
      console.error("Unexpected error during sign in:", error);
      setLoading(false);
      
      // Log unexpected error
      logError(
        requestId,
        'EmailAuthForm',
        "Unexpected error during sign in",
        error,
        {
          email,
          redirectTo
        },
        undefined,
        undefined,
        'critical',
        'auth'
      );
      
      return { success: false, error: error.message || "An unexpected error occurred" };
    }
  };

  const signup = async (email: string, password: string) => {
    setLoading(true);
    console.log("Starting email sign-up process");
    
    try {
      // Log the signup attempt
      logEvent(
        requestId,
        'EmailAuthForm',
        'auth_signup_attempt',
        `Email signup attempt: ${email}`,
        {
          email,
          redirectTo
        }
      );
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + redirectTo
        }
      });
      
      if (error) {
        console.error("Email sign up error:", error);
        setLoading(false);
        
        // Log signup error
        logError(
          requestId,
          'EmailAuthForm',
          `Email signup failed: ${error.message}`,
          error,
          {
            email,
            errorCode: error.code,
            errorName: error.name,
            redirectTo
          },
          undefined,
          undefined,
          'error',
          'auth'
        );
        
        return { success: false, error: error.message };
      } 
      
      console.log("Sign up successful:", data);
      
      // If email confirmation is enabled, show success message but don't redirect
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        toast.success("Account already exists", {
          description: "Try logging in instead"
        });
        
        // Log account already exists
        logEvent(
          requestId,
          'EmailAuthForm',
          'auth_signup_account_exists',
          `Account already exists: ${email}`,
          { email }
        );
        
        setLoading(false);
        return { success: false, error: "Account already exists" };
      }
      
      if (data.user && !data.session) {
        toast.success("Account created! Please check your email to confirm your account.", {
          duration: 6000
        });
        
        // Log account created but needs confirmation
        logEvent(
          requestId,
          'EmailAuthForm',
          'auth_signup_confirmation_required',
          `Account created, email confirmation required: ${email}`,
          {
            email,
            userId: data.user.id
          }
        );
        
        setLoading(false);
        return { success: true };
      }
      
      // If email confirmation is not enabled, redirect to the app
      // Log successful signup
      logEvent(
        requestId,
        'EmailAuthForm',
        'auth_signup_success',
        `Signup successful: ${email}`,
        {
          email,
          userId: data.user?.id,
          redirectTo
        }
      );
      
      toast.success("Account created successfully!");
      navigate(redirectTo);
      return { success: true };
    } catch (error: any) {
      console.error("Unexpected error during sign up:", error);
      setLoading(false);
      
      // Log unexpected error
      logError(
        requestId,
        'EmailAuthForm',
        "Unexpected error during signup",
        error,
        {
          email,
          redirectTo
        },
        undefined,
        undefined,
        'critical',
        'auth'
      );
      
      return { success: false, error: error.message || "An unexpected error occurred" };
    }
  };

  return {
    login,
    signup,
    loading,
    requestId
  };
};
