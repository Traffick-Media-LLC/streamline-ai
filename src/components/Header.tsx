import { Link, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { useAuth } from "@/contexts/AuthContext";
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MoreHorizontal } from "lucide-react";

const Header = () => {
  const { isAuthenticated, isAdmin, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      try {
        const avatarFromAuth = user.user_metadata?.avatar_url || user.user_metadata?.picture;
        if (avatarFromAuth) {
          setAvatarUrl(avatarFromAuth);
        }

        const nameFromAuth = user.user_metadata?.full_name || 
                           `${user.user_metadata?.given_name || ''} ${user.user_metadata?.family_name || ''}`.trim();
        
        if (nameFromAuth) {
          const [first, ...rest] = nameFromAuth.split(' ');
          setFirstName(first || '');
          setLastName(rest.join(' ') || '');
        } else {
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
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchUserProfile();
  }, [user?.id, user?.user_metadata]);

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
              <Link 
                to="/" 
                className={cn(
                  navigationMenuTriggerStyle(), 
                  "text-black hover:text-black/80"
                )}
              >
                Home
              </Link>
            </NavigationMenuItem>
            
            <NavigationMenuItem>
              <Link 
                to="/map" 
                className={cn(
                  navigationMenuTriggerStyle(), 
                  "text-black hover:text-black/80"
                )}
              >
                State Map
              </Link>
            </NavigationMenuItem>
            
            {isAuthenticated && (
              <NavigationMenuItem>
                <Link 
                  to="/chat" 
                  className={cn(
                    navigationMenuTriggerStyle(), 
                    "text-black hover:text-black/80"
                  )}
                >
                  AI Chat
                </Link>
              </NavigationMenuItem>
            )}

            {isAuthenticated && (
              <NavigationMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className={cn(
                        navigationMenuTriggerStyle(),
                        "text-black hover:text-black/80"
                      )}
                    >
                      <MoreHorizontal className="h-4 w-4 mr-1" />
                      More
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px] bg-white">
                    <DropdownMenuItem asChild>
                      <Link to="/employees" className="w-full">
                        Employee Directory
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 text-black hover:text-black/80"
                >
                  <Avatar className="h-8 w-8">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt="Profile" />}
                    <AvatarFallback>
                      {firstName && lastName 
                        ? `${firstName[0]}${lastName[0]}`
                        : user?.email?.[0].toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-black">
                    {firstName && lastName 
                      ? `${firstName} ${lastName}`
                      : user?.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-black">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="text-black hover:text-black/80">Profile</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="text-black hover:text-black/80">Admin Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/knowledge" className="text-black hover:text-black/80">Knowledge Manager</Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleSignOut} 
                  className="text-black hover:text-black/80"
                >
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              asChild 
              className="text-white hover:text-white/90 bg-black hover:bg-black/90"
            >
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
