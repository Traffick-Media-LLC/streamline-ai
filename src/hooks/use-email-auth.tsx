
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { logError, logEvent, generateRequestId } from "@/utils/logging";
import { Session } from "@supabase/supabase-js";

interface EmailAuthResult {
  success: boolean;
  message?: string;
  session?: Session | null;
}

export const useEmailAuth = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [session, setSession] = useState<Session | null>(null);

  // Initialize auth on mount
  useEffect(() => {
    const requestId = generateRequestId();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      
      logEvent({
        requestId,
        userId: session?.user?.id,
        eventType: 'auth_state_change',
        component: 'useEmailAuth',
        message: `Auth state changed: ${event}`
      });
    });
    
    // Check for initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      logEvent({
        requestId,
        userId: session?.user?.id,
        eventType: 'init_session_check',
        component: 'useEmailAuth',
        message: `Initial session check: ${session ? 'Found' : 'None'}`
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string): Promise<EmailAuthResult> => {
    try {
      setLoading(true);
      const requestId = generateRequestId();

      logEvent({
        requestId,
        userId: null,
        eventType: 'signup_attempt',
        component: 'useEmailAuth',
        message: `Signup attempt for ${email}`
      });

      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (error) {
        logError(
          requestId,
          'useEmailAuth',
          'Signup failed',
          error
        );
        
        return {
          success: false,
          message: error.message || 'An error occurred during signup'
        };
      }

      logEvent({
        requestId,
        userId: data.user?.id,
        eventType: 'signup_success',
        component: 'useEmailAuth',
        message: `Signup successful for ${email}`
      });

      // If email confirmation is required
      if (data.user && !data.session) {
        toast.success('Please check your email for confirmation link');
        return {
          success: true,
          message: 'Please check your email for confirmation link',
        };
      }

      // If auto-confirmed
      return {
        success: true,
        session: data.session,
        message: 'Signup successful'
      };
    } catch (error: any) {
      const requestId = generateRequestId();
      logError(
        requestId,
        'useEmailAuth',
        'Unexpected signup error',
        error
      );
      
      return {
        success: false,
        message: error.message || 'An unexpected error occurred'
      };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<EmailAuthResult> => {
    try {
      setLoading(true);
      const requestId = generateRequestId();
      
      logEvent({
        requestId,
        userId: null,
        eventType: 'signin_attempt',
        component: 'useEmailAuth',
        message: `Login attempt for ${email}`
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        logError(
          requestId,
          'useEmailAuth',
          'Login failed',
          error
        );
        
        return {
          success: false,
          message: error.message || 'Invalid login credentials'
        };
      }

      logEvent({
        requestId,
        userId: data.user?.id,
        eventType: 'signin_success',
        component: 'useEmailAuth',
        message: `Login successful for ${email}`
      });

      return {
        success: true,
        session: data.session,
        message: 'Login successful'
      };
    } catch (error: any) {
      const requestId = generateRequestId();
      logError(
        requestId,
        'useEmailAuth',
        'Unexpected login error',
        error
      );
      
      return {
        success: false,
        message: error.message || 'An unexpected error occurred'
      };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string): Promise<EmailAuthResult> => {
    try {
      setLoading(true);
      const requestId = generateRequestId();
      
      logEvent({
        requestId,
        userId: null,
        eventType: 'password_reset_attempt',
        component: 'useEmailAuth',
        message: `Password reset attempt for ${email}`
      });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        logError(
          requestId,
          'useEmailAuth',
          'Password reset failed',
          error
        );
        
        return {
          success: false,
          message: error.message || 'Password reset failed'
        };
      }

      logEvent({
        requestId,
        userId: null,
        eventType: 'password_reset_email_sent',
        component: 'useEmailAuth',
        message: `Password reset email sent to ${email}`
      });

      return {
        success: true,
        message: 'Check your email for the password reset link'
      };
    } catch (error: any) {
      const requestId = generateRequestId();
      logError(
        requestId,
        'useEmailAuth',
        'Unexpected password reset error',
        error
      );
      
      return {
        success: false,
        message: error.message || 'An unexpected error occurred'
      };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<EmailAuthResult> => {
    try {
      setLoading(true);
      const requestId = generateRequestId();
      const userId = session?.user?.id;
      
      logEvent({
        requestId,
        userId,
        eventType: 'signout_attempt',
        component: 'useEmailAuth',
        message: `Signout attempt`
      });

      const { error } = await supabase.auth.signOut();

      if (error) {
        logError(
          requestId,
          'useEmailAuth',
          'Signout failed',
          error
        );
        
        return {
          success: false,
          message: error.message || 'Signout failed'
        };
      }

      logEvent({
        requestId,
        userId,
        eventType: 'signout_success',
        component: 'useEmailAuth',
        message: `Signout successful`
      });

      return {
        success: true,
        message: 'You have been signed out'
      };
    } catch (error: any) {
      const requestId = generateRequestId();
      logError(
        requestId,
        'useEmailAuth',
        'Unexpected signout error',
        error
      );
      
      return {
        success: false,
        message: error.message || 'An unexpected error occurred'
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    signUp,
    signIn,
    signOut,
    resetPassword,
    loading,
    session,
    isAuthenticated: !!session
  };
};
