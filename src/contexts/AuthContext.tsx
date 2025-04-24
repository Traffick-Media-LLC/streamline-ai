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
  const [isGuest, setIsGuest] = useState(false);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchUserRole = async (userId: string) => {
    try {
      console.log("Fetching role for user:", userId);
      
      // Use our security definer function to check admin status
      const { data: isAdminResult, error: adminCheckError } = await supabase.rpc('is_admin');
      
      if (adminCheckError) {
        console.error('Error checking admin status:', adminCheckError);
      } else {
        console.log("Is admin check result:", isAdminResult);
        setIsAdmin(isAdminResult);
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
      } else {
        console.log("No role found, setting to basic");
        setUserRole('basic');
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      toast.error("Failed to fetch user role");
      setUserRole('basic');
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    console.log("Auth provider initializing");
    let mounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, "Session:", session?.user?.id);
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            // Use setTimeout to prevent potential auth deadlocks
            setTimeout(() => {
              if (mounted) {
                fetchUserRole(session.user.id);
              }
            }, 0);
          } else {
            setUserRole(null);
            setIsAdmin(false);
          }
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log("Got initial session:", session?.user?.id);
      
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserRole(session.user.id);
        }
        setLoading(false);
      }
    });

    return () => {
      console.log("Cleaning up auth subscriptions");
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // When isGuest changes, update admin status and role accordingly
    if (isGuest) {
      setIsAdmin(true);
      setUserRole('admin');
    }
  }, [isGuest]);

  const signOut = async () => {
    try {
      setIsGuest(false);
      setIsAdmin(false);
      setUserRole(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success("Signed out successfully");
    } catch (error: any) {
      toast.error("Failed to sign out");
      console.error("Sign out error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        signOut,
        loading,
        isAuthenticated: !!user || isGuest,
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
