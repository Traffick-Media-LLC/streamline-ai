
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
  isGuest: boolean;
  setIsGuest: (value: boolean) => void;
  userRole: AppRole | null;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  signOut: async () => {},
  loading: true,
  isAuthenticated: false,
  isGuest: false,
  setIsGuest: () => {},
  userRole: null,
  isAdmin: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(() => {
    // Initialize from localStorage if available
    return localStorage.getItem('isGuestSession') === 'true';
  });
  const isMobile = useIsMobile();

  // Update localStorage when isGuest changes
  useEffect(() => {
    localStorage.setItem('isGuestSession', isGuest ? 'true' : 'false');
  }, [isGuest]);

  const { userRole, isAdmin, loading: roleLoading } = useUserRole(user?.id, isGuest);

  useEffect(() => {
    console.log("Auth provider initializing", isMobile ? "(mobile)" : "(desktop)");
    let mounted = true;
    
    // First set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("Auth state changed:", event, "Session:", newSession?.user?.id);
        
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
      setIsGuest(false);
      localStorage.removeItem('isGuestSession');
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success("Signed out successfully");
    } catch (error: any) {
      toast.error("Failed to sign out");
      console.error("Sign out error:", error);
    }
  };

  const isActuallyAuthenticated = !!user || isGuest;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        signOut,
        loading: loading || (roleLoading && !isActuallyAuthenticated),
        isAuthenticated: isActuallyAuthenticated,
        isGuest,
        setIsGuest,
        userRole,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
