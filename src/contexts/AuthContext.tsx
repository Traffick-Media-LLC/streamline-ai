import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

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
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  // Track if we've tried to fetch role once already to avoid loops
  const [hasInitializedRole, setHasInitializedRole] = useState(false);

  // Update localStorage when isGuest changes
  useEffect(() => {
    localStorage.setItem('isGuestSession', isGuest ? 'true' : 'false');
  }, [isGuest]);

  const fetchUserRole = async (userId: string) => {
    try {
      console.log("Fetching role for user:", userId);
      
      // Call the is_admin RPC function directly
      const { data: isAdminResult, error: adminCheckError } = await supabase.rpc('is_admin');
      
      if (adminCheckError) {
        console.error('Error checking admin status:', adminCheckError);
      } else {
        console.log("Is admin check result:", isAdminResult);
        setIsAdmin(!!isAdminResult); // Ensure boolean conversion
      }
      
      // Then fetch the actual role
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        toast.error("Failed to fetch user role");
        setUserRole('basic');
        return;
      }
      
      console.log("User role data:", data);
      
      if (data?.role) {
        const role = data.role as AppRole;
        console.log("Setting user role to:", role);
        setUserRole(role);
        
        // Double-check admin status from role
        if (role === 'admin' && !isAdmin) {
          console.log("Setting admin status from role");
          setIsAdmin(true);
        }
      } else {
        console.log("No role found, setting to basic");
        setUserRole('basic');
      }
      
      setHasInitializedRole(true);
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      toast.error("Failed to fetch user role");
      setUserRole('basic');
      setIsAdmin(false);
      setHasInitializedRole(true);
    }
  };

  useEffect(() => {
    console.log("Auth provider initializing");
    let mounted = true;
    
    // First set up the auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log("Auth state changed:", event, "Session:", newSession?.user?.id);
        
        if (mounted) {
          const newUser = newSession?.user ?? null;
          setSession(newSession);
          setUser(newUser);
          
          // Reset role initializaton flag when session changes
          if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
            setHasInitializedRole(false);
          }
          
          if (newUser && !hasInitializedRole) {
            // Use setTimeout to prevent potential auth deadlocks
            setTimeout(() => {
              if (mounted) {
                fetchUserRole(newUser.id);
              }
            }, 10);
          } else if (!newUser && !isGuest) {
            // If logged out and not in guest mode, clear role status
            setUserRole(null);
            setIsAdmin(false);
            setHasInitializedRole(true);
          }
          
          setLoading(false);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(async ({ data: { session: existingSession }, error }) => {
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
        
        if (existingUser && !hasInitializedRole) {
          // Use setTimeout to avoid blocking issues
          setTimeout(async () => {
            if (mounted) {
              await fetchUserRole(existingUser.id);
            }
          }, 10);
        } else {
          setHasInitializedRole(true);
        }
        
        setLoading(false);
      }
    });

    // Set a timeout to ensure we're not stuck in a loading state
    const loadingTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth loading timeout reached, forcing loading state to false");
        setLoading(false);
      }
    }, 5000);

    return () => {
      console.log("Cleaning up auth subscriptions");
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, [hasInitializedRole, loading]);

  useEffect(() => {
    // When isGuest changes, update admin status and role accordingly
    if (isGuest) {
      console.log("Guest mode enabled - granting admin privileges");
      setIsAdmin(true);
      setUserRole('admin');
      setLoading(false);
      setHasInitializedRole(true);
    } else if (!user) {
      // Only reset admin status if not logged in
      console.log("Guest mode disabled - reverting to authenticated status");
      setIsAdmin(false);
      setUserRole(null);
    }
  }, [isGuest, user]);

  const signOut = async () => {
    try {
      setIsGuest(false);
      setIsAdmin(false);
      setUserRole(null);
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
        loading: loading && !isActuallyAuthenticated,
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
