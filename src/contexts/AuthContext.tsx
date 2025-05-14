
import { createContext, useContext, useState, useEffect } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useUserRole } from "@/hooks/use-user-role";
import { useIsMobile } from "@/hooks/use-mobile";
import { logEvent, logError, generateRequestId } from "@/utils/logging";

type AppRole = 'basic' | 'admin';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
  userRole: AppRole | null;
  isAdmin: boolean;
  isGuest: boolean; // Keep this for backward compatibility
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  signOut: async () => {},
  loading: true,
  isAuthenticated: false,
  userRole: null,
  isAdmin: false,
  isGuest: false, // Initialize with false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const isMobile = useIsMobile();

  // Generate a request ID for this component instance for tracing
  const requestId = generateRequestId();

  // Only initialize useUserRole after auth is initialized to prevent race conditions
  const { userRole, isAdmin, loading: roleLoading, error: roleError, retry: retryRoleCheck } = useUserRole(
    authInitialized ? user?.id : undefined
  );

  useEffect(() => {
    console.log("[AuthProvider] Initializing", isMobile ? "(mobile)" : "(desktop)");
    logEvent({
      requestId,
      eventType: 'auth_provider_init',
      component: 'AuthProvider',
      message: `Auth provider initializing - ${isMobile ? "mobile" : "desktop"}`,
      metadata: {}
    });
    
    let mounted = true;
    
    // First set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("[AuthProvider] Auth state changed:", event, "Session:", newSession?.user?.id);
        
        await logEvent({
          requestId,
          userId: newSession?.user?.id,
          eventType: `auth_state_${event}`,
          component: 'AuthProvider',
          message: `Auth state changed: ${event}`,
          metadata: { event, userId: newSession?.user?.id }
        });
        
        if (mounted) {
          const newUser = newSession?.user ?? null;
          setSession(newSession);
          setUser(newUser);
          setLoading(false);
          setAuthInitialized(true);
          
          if (event === 'SIGNED_OUT') {
            // Clear user role data on sign out
            console.log("[AuthProvider] User signed out, clearing role data");
          }
          
          if (event === 'SIGNED_IN') {
            console.log("[AuthProvider] User signed in, role will be fetched");
          }
        }
      }
    );

    // Then check for existing session
    const getSessionPromise = async () => {
      try {
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("[AuthProvider] Error getting session:", error);
          await logError(
            requestId,
            'AuthProvider',
            'Error getting session',
            error,
            {},
            'auth'
          );
          if (mounted) {
            setLoading(false);
            setAuthInitialized(true);
          }
          return;
        }
        
        console.log("[AuthProvider] Got initial session:", existingSession?.user?.id);
        await logEvent({
          requestId,
          userId: existingSession?.user?.id,
          eventType: 'auth_session_init',
          component: 'AuthProvider',
          message: existingSession ? 'Initial session found' : 'No initial session found',
          metadata: { userId: existingSession?.user?.id, hasSession: !!existingSession }
        });
        
        if (mounted) {
          const existingUser = existingSession?.user ?? null;
          setSession(existingSession);
          setUser(existingUser);
          setLoading(false);
          setAuthInitialized(true);
        }
      } catch (err) {
        console.error("[AuthProvider] Failed to get session:", err);
        await logError(
          requestId,
          'AuthProvider',
          'Unexpected error getting session',
          err,
          {},
          'auth'
        );
        if (mounted) {
          setLoading(false);
          setAuthInitialized(true);
        }
      }
    };

    // Start session checking
    getSessionPromise();

    // Set a timeout to ensure we're not stuck in a loading state
    const loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("[AuthProvider] Auth loading timeout reached, forcing loading state to false");
        logEvent({
          requestId,
          eventType: 'auth_loading_timeout',
          component: 'AuthProvider',
          message: 'Auth loading timeout reached',
          severity: 'warning'
        });
        setLoading(false);
        setAuthInitialized(true);
      }
    }, isMobile ? 3000 : 5000); // Adjusted timeout for device type

    return () => {
      console.log("[AuthProvider] Cleaning up auth subscriptions");
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, [isMobile, requestId]);

  // Effect to handle role checking errors
  useEffect(() => {
    if (roleError && user?.id && authInitialized) {
      console.error("[AuthProvider] Role checking error:", roleError);
      logError(
        requestId,
        'AuthProvider',
        'Error checking user role',
        roleError,
        { userId: user.id },
        'auth'
      );
      
      // Retry role check if appropriate
      const retryTimeout = setTimeout(() => {
        console.log("[AuthProvider] Retrying role check after error");
        retryRoleCheck();
      }, 2000);
      
      return () => clearTimeout(retryTimeout);
    }
  }, [roleError, user?.id, authInitialized, requestId, retryRoleCheck]);

  const signOut = async () => {
    try {
      await logEvent({
        requestId,
        userId: user?.id,
        eventType: 'auth_signout_attempt',
        component: 'AuthProvider',
        message: 'User attempting to sign out',
      });
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success("Signed out successfully");
      
      await logEvent({
        requestId,
        userId: user?.id,
        eventType: 'auth_signout_success',
        component: 'AuthProvider',
        message: 'User signed out successfully',
      });
    } catch (error: any) {
      toast.error("Failed to sign out");
      console.error("[AuthProvider] Sign out error:", error);
      
      await logError(
        requestId,
        'AuthProvider',
        'Failed to sign out',
        error,
        { userId: user?.id },
        'auth'
      );
    }
  };

  const isActuallyAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        signOut,
        loading: loading || (roleLoading && isActuallyAuthenticated),
        isAuthenticated: isActuallyAuthenticated,
        userRole,
        isAdmin,
        isGuest: false, // Always false as the guest feature is removed
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
