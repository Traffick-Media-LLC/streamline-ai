
import { createContext, useContext, useState, useEffect } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { useUserRole } from "@/hooks/use-user-role";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

  const { userRole, isAdmin, loading: roleLoading } = useUserRole(user?.id);

  useEffect(() => {
    console.log("Auth provider initializing", isMobile ? "(mobile)" : "(desktop)");
    let mounted = true;
    
    // First set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth state changed:", event, "Session:", newSession?.user?.id);
        
        // Non-company emails are allowed to sign in but will be redirected
        // to /restricted by ProtectedRoute
        
        if (mounted) {
          const newUser = newSession?.user ?? null;
          setSession(newSession);
          setUser(newUser);
          setLoading(false);
        }
      }
    );

    // Then check for existing session
    const getSessionPromise = async () => {
      try {
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting session:", error);
          if (mounted) setLoading(false);
          return;
        }
        
        console.log("Got initial session:", existingSession?.user?.id);
        
        if (mounted) {
          const existingUser = existingSession?.user ?? null;
          setSession(existingSession);
          setUser(existingUser);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to get session:", err);
        if (mounted) setLoading(false);
      }
    };

    // Start session checking
    getSessionPromise();

    // Set a timeout to ensure we're not stuck in a loading state
    const loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth loading timeout reached, forcing loading state to false");
        setLoading(false);
      }
    }, 3000); // Reduced timeout for mobile

    return () => {
      console.log("Cleaning up auth subscriptions");
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, [loading, isMobile]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success("Signed out successfully");
    } catch (error: any) {
      toast.error("Failed to sign out");
      console.error("Sign out error:", error);
    }
  };

  const isActuallyAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        signOut,
        loading: loading || (roleLoading && !isActuallyAuthenticated),
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
