
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect } from "react";

const HamburgerMenu = () => {
  const { isAuthenticated, isAdmin, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
  // Close menu when location changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);
  
  const handleLinkClick = () => {
    setIsOpen(false);
  };

  const handleSignOut = () => {
    signOut();
    setIsOpen(false);
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Menu">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className={isMobile ? "w-[85vw] p-4" : "w-[300px]"} side="left">
        <SheetHeader className="mb-4">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-2">
          <Link 
            to="/" 
            className="text-base hover:text-primary transition-colors px-3 py-3 rounded-md hover:bg-accent"
            onClick={handleLinkClick}
          >
            Home
          </Link>
          <Link 
            to="/map" 
            className="text-base hover:text-primary transition-colors px-3 py-3 rounded-md hover:bg-accent"
            onClick={handleLinkClick}
          >
            State Map
          </Link>
          {isAuthenticated && (
            <Link 
              to="/chat" 
              className="text-base hover:text-primary transition-colors px-3 py-3 rounded-md hover:bg-accent"
              onClick={handleLinkClick}
            >
              AI Chat
            </Link>
          )}
          {isAuthenticated && (
            <Link 
              to="/employees" 
              className="text-base hover:text-primary transition-colors px-3 py-3 rounded-md hover:bg-accent"
              onClick={handleLinkClick}
            >
              Employee Directory
            </Link>
          )}
          {isAdmin && (
            <Link 
              to="/admin" 
              className="text-base hover:text-primary transition-colors px-3 py-3 rounded-md hover:bg-accent"
              onClick={handleLinkClick}
            >
              Admin Dashboard
            </Link>
          )}
          {isAuthenticated && (
            <Link 
              to="/profile" 
              className="text-base hover:text-primary transition-colors px-3 py-3 rounded-md hover:bg-accent"
              onClick={handleLinkClick}
            >
              My Profile
            </Link>
          )}
          <div className="mt-4 pt-4 border-t">
            {isAuthenticated && (
              <Button 
                variant="ghost" 
                onClick={handleSignOut} 
                className="text-base hover:text-primary transition-colors w-full justify-start px-3 py-3 rounded-md hover:bg-accent"
              >
                Sign Out
              </Button>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default HamburgerMenu;
