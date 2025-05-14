
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { logEvent, logError, generateRequestId } from "@/utils/logging";

export const useEmailAuth = (redirectTo: string) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const login = async (email: string, password: string) => {
    setLoading(true);
    const requestId = generateRequestId();
    console.log("Starting email sign-in process");
    
    logEvent({
      requestId,
      eventType: 'email_login_attempt',
      component: 'useEmailAuth',
      message: `Login attempt with email: ${email.slice(0, 3)}***@${email.split('@')[1]}`,
    });
    
    try {
      // Check if we're in a sandbox preview
      const isSandboxPreview = window.location.hostname.includes('lovable.dev') || 
                                window.location.hostname.includes('lovable.ai');
                                
      // Add site URL option for sandbox previews
      const options = isSandboxPreview ? {
        redirectTo: window.location.origin + redirectTo
      } : undefined;
      
      if (isSandboxPreview) {
        console.log("Using redirectTo for sandbox preview:", window.location.origin + redirectTo);
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        ...(options && { options })
      });
      
      if (error) {
        console.error("Email sign in error:", error);
        logError(
          requestId,
          'useEmailAuth',
          'Login failed',
          error,
          { emailDomain: email.split('@')[1] }
        );
        setLoading(false);
        return { success: false, error: error.message };
      } 
      
      console.log("Email sign in successful:", data);
      logEvent({
        requestId,
        eventType: 'email_login_success',
        component: 'useEmailAuth',
        message: 'Login successful',
      });
      
      toast.success("Signed in successfully!");
      navigate(redirectTo);
      return { success: true };
    } catch (error: any) {
      console.error("Unexpected error during sign in:", error);
      logError(
        requestId,
        'useEmailAuth',
        'Unexpected login error',
        error,
        { isMobile, isSandbox: window.location.hostname.includes('lovable') }
      );
      setLoading(false);
      return { success: false, error: error.message || "An unexpected error occurred" };
    }
  };

  const signup = async (email: string, password: string) => {
    setLoading(true);
    const requestId = generateRequestId();
    console.log("Starting email sign-up process");
    
    logEvent({
      requestId,
      eventType: 'email_signup_attempt',
      component: 'useEmailAuth',
      message: `Signup attempt with email: ${email.slice(0, 3)}***@${email.split('@')[1]}`,
    });
    
    try {
      // Get origin for proper redirect URL
      const origin = window.location.origin;
      const fullRedirectTo = origin + redirectTo;
      
      console.log("Using signup redirect URL:", fullRedirectTo);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: fullRedirectTo
        }
      });
      
      if (error) {
        console.error("Email sign up error:", error);
        logError(
          requestId,
          'useEmailAuth',
          'Signup failed',
          error,
          { emailDomain: email.split('@')[1] }
        );
        setLoading(false);
        return { success: false, error: error.message };
      } 
      
      console.log("Sign up successful:", data);
      
      // If email confirmation is enabled, show success message but don't redirect
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        toast.success("Account already exists", {
          description: "Try logging in instead"
        });
        setLoading(false);
        return { success: false, error: "Account already exists" };
      }
      
      if (data.user && !data.session) {
        toast.success("Account created! Please check your email to confirm your account.", {
          duration: 6000
        });
        setLoading(false);
        logEvent({
          requestId,
          eventType: 'email_signup_confirm_required',
          component: 'useEmailAuth',
          message: 'Signup successful, confirmation email sent',
        });
        return { success: true };
      }
      
      // If email confirmation is not enabled, redirect to the app
      toast.success("Account created successfully!");
      logEvent({
        requestId,
        eventType: 'email_signup_success',
        component: 'useEmailAuth',
        message: 'Signup and login successful',
      });
      navigate(redirectTo);
      return { success: true };
    } catch (error: any) {
      console.error("Unexpected error during sign up:", error);
      logError(
        requestId,
        'useEmailAuth',
        'Unexpected signup error',
        error,
        { isMobile }
      );
      setLoading(false);
      return { success: false, error: error.message || "An unexpected error occurred" };
    }
  };

  return {
    login,
    signup,
    loading
  };
};
