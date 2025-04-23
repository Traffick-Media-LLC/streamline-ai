
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

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setUserRole(data?.role || 'basic');
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole('basic');
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserRole(session.user.id);
        } else {
          setUserRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      setIsGuest(false);
      await supabase.auth.signOut();
      setUserRole(null);
      toast.success("Signed out successfully");
    } catch (error) {
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
        isAdmin: userRole === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
