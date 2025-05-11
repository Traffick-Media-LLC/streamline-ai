
import { useState, useEffect } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const useAuthSession = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Error checking session:", error);
          return;
        }
        
        if (session?.user) {
          console.log("Session found:", session);
          setUser(session.user);
        } else {
          console.log("No active session found");
        }
      } catch (e) {
        console.error("Failed to check session:", e);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
  }, []);

  useEffect(() => {
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event, session);
      
      // First do synchronous updates
      setUser(session?.user || null);
      setSession(session);
    });

    return () => {
      console.log("Cleaning up auth subscriptions");
      subscription.unsubscribe();
    };
  }, []);

  return {
    user,
    session,
    loading
  };
};
