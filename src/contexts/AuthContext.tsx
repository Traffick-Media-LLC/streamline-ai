
import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
  loading: boolean;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  signOut: async () => {},
  loading: true,
  isAuthenticated: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
    } catch (error) {
      toast.error("Failed to sign out");
      console.error("Sign out error:", error);
    }
  };

  // Check if email domain is allowed
  useEffect(() => {
    const checkDomain = async () => {
      if (!user?.email) return;
      
      // You can implement domain restriction here
      // Example: checking if email ends with specific domain(s)
      const allowedDomains = ["example.com", "yourdomain.com"]; // Configure your allowed domains
      
      // Uncomment to enable domain restriction
      /*
      const userDomain = user.email.split("@")[1];
      const isDomainAllowed = allowedDomains.includes(userDomain);
      
      if (!isDomainAllowed) {
        toast.error("Access denied", {
          description: "Your email domain is not authorized to use this application"
        });
        await signOut();
      }
      */
    };
    
    if (user) {
      checkDomain();
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        signOut,
        loading,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
