
import { Link, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { useAuth } from "@/contexts/AuthContext";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const Header = () => {
  const { isAuthenticated, isAdmin, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (profile) {
          setFirstName(profile.first_name || '');
          setLastName(profile.last_name || '');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchUserProfile();
  }, [user?.id]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Logo />
        <NavigationMenu className="mx-6">
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link to="/" className={cn(navigationMenuTriggerStyle())}>
                Home
              </Link>
            </NavigationMenuItem>
            
            <NavigationMenuItem>
              <Link to="/map" className={cn(navigationMenuTriggerStyle())}>
                State Map
              </Link>
            </NavigationMenuItem>
            
            {isAuthenticated && (
              <NavigationMenuItem>
                <Link to="/chat" className={cn(navigationMenuTriggerStyle())}>
                  AI Chat
                </Link>
              </NavigationMenuItem>
            )}

            {isAdmin && (
              <NavigationMenuItem>
                <Link to="/admin" className={cn(navigationMenuTriggerStyle())}>
                  Admin
                </Link>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {firstName && lastName 
                        ? `${firstName[0]}${lastName[0]}`
                        : user?.email?.[0].toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline">
                    {firstName && lastName 
                      ? `${firstName} ${lastName}`
                      : user?.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">Admin Dashboard</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
