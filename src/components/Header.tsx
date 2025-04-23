
import { Link } from "react-router-dom";
import Logo from "./Logo";
import { useAuth } from "@/contexts/AuthContext";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import { navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";

const Header = () => {
  const { isAuthenticated, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Logo />
        <NavigationMenu className="ml-auto">
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link to="/" className={cn(navigationMenuTriggerStyle())}>
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
                <Link to="/products" className={cn(navigationMenuTriggerStyle())}>
                  Products
                </Link>
              </NavigationMenuItem>
            )}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  );
};

export default Header;
