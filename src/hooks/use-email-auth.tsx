
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { logError, logEvent, generateRequestId } from "@/utils/logging";

export const useEmailAuth = (redirectTo: string) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const requestId = generateRequestId();

  const login = async (email: string, password: string) => {
    setLoading(true);
    console.log("Starting email sign-in process");
    
    try {
      // Log the authentication attempt
      logEvent({
        requestId,
        eventType: 'auth_login_attempt',
        component: 'EmailAuthForm',
        message: `Email login attempt: ${email}`,
        metadata: {
          email,
          redirectTo
        }
      });
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error("Email sign in error:", error);
        setLoading(false);
        
        // Log authentication error
        logError({
          requestId,
          component: 'EmailAuthForm',
          message: `Email sign in failed: ${error.message}`,
          error,
          metadata: {
            email,
            errorCode: error.code,
            errorName: error.name,
            redirectTo
          },
          severity: 'error',
          category: 'auth'
        });
        
        return { success: false, error: error.message };
      } 
      
      console.log("Email sign in successful:", data);
      
      // Log successful authentication
      logEvent({
        requestId,
        eventType: 'auth_login_success',
        component: 'EmailAuthForm',
        message: `Email login successful: ${email}`,
        metadata: {
          email,
          userId: data.user?.id,
          redirectTo
        }
      });
      
      toast.success("Signed in successfully!");
      navigate(redirectTo);
      return { success: true };
    } catch (error: any) {
      console.error("Unexpected error during sign in:", error);
      setLoading(false);
      
      // Log unexpected error
      logError({
        requestId,
        component: 'EmailAuthForm',
        message: "Unexpected error during sign in",
        error,
        metadata: {
          email,
          redirectTo
        },
        severity: 'critical',
        category: 'auth'
      });
      
      return { success: false, error: error.message || "An unexpected error occurred" };
    }
  };

  const signup = async (email: string, password: string) => {
    setLoading(true);
    console.log("Starting email sign-up process");
    
    try {
      // Log the signup attempt
      logEvent({
        requestId,
        eventType: 'auth_signup_attempt',
        component: 'EmailAuthForm',
        message: `Email signup attempt: ${email}`,
        metadata: {
          email,
          redirectTo
        }
      });
      
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
        logError({
          requestId,
          component: 'EmailAuthForm',
          message: `Email signup failed: ${error.message}`,
          error,
          metadata: {
            email,
            errorCode: error.code,
            errorName: error.name,
            redirectTo
          },
          severity: 'error',
          category: 'auth'
        });
        
        return { success: false, error: error.message };
      } 
      
      console.log("Sign up successful:", data);
      
      // If email confirmation is enabled, show success message but don't redirect
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        toast.success("Account already exists", {
          description: "Try logging in instead"
        });
        
        // Log account already exists
        logEvent({
          requestId,
          eventType: 'auth_signup_account_exists',
          component: 'EmailAuthForm',
          message: `Account already exists: ${email}`,
          metadata: { email }
        });
        
        setLoading(false);
        return { success: false, error: "Account already exists" };
      }
      
      if (data.user && !data.session) {
        toast.success("Account created! Please check your email to confirm your account.", {
          duration: 6000
        });
        
        // Log account created but needs confirmation
        logEvent({
          requestId,
          eventType: 'auth_signup_confirmation_required',
          component: 'EmailAuthForm',
          message: `Account created, email confirmation required: ${email}`,
          metadata: {
            email,
            userId: data.user.id
          }
        });
        
        setLoading(false);
        return { success: true };
      }
      
      // If email confirmation is not enabled, redirect to the app
      // Log successful signup
      logEvent({
        requestId,
        eventType: 'auth_signup_success',
        component: 'EmailAuthForm',
        message: `Signup successful: ${email}`,
        metadata: {
          email,
          userId: data.user?.id,
          redirectTo
        }
      });
      
      toast.success("Account created successfully!");
      navigate(redirectTo);
      return { success: true };
    } catch (error: any) {
      console.error("Unexpected error during sign up:", error);
      setLoading(false);
      
      // Log unexpected error
      logError({
        requestId,
        component: 'EmailAuthForm',
        message: "Unexpected error during signup",
        error,
        metadata: {
          email,
          redirectTo
        },
        severity: 'critical',
        category: 'auth'
      });
      
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
