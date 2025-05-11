
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

const HamburgerMenu = () => {
  const { isAuthenticated, isAdmin, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  
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
      <SheetContent className={isMobile ? "w-[85vw]" : "w-[300px]"} side="left">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-4 mt-6">
          <Link 
            to="/" 
            className="text-lg hover:text-primary transition-colors px-2 py-3"
            onClick={handleLinkClick}
          >
            Home
          </Link>
          <Link 
            to="/map" 
            className="text-lg hover:text-primary transition-colors px-2 py-3"
            onClick={handleLinkClick}
          >
            State Map
          </Link>
          {isAuthenticated && (
            <Link 
              to="/chat" 
              className="text-lg hover:text-primary transition-colors px-2 py-3"
              onClick={handleLinkClick}
            >
              AI Chat
            </Link>
          )}
          {isAuthenticated && (
            <Link 
              to="/employees" 
              className="text-lg hover:text-primary transition-colors px-2 py-3"
              onClick={handleLinkClick}
            >
              Employee Directory
            </Link>
          )}
          {isAdmin && (
            <Link 
              to="/admin" 
              className="text-lg hover:text-primary transition-colors px-2 py-3"
              onClick={handleLinkClick}
            >
              Admin Dashboard
            </Link>
          )}
          {isAuthenticated && (
            <Link 
              to="/profile" 
              className="text-lg hover:text-primary transition-colors px-2 py-3"
              onClick={handleLinkClick}
            >
              My Profile
            </Link>
          )}
          <div className="mt-2 pt-2 border-t">
            {isAuthenticated && (
              <Button 
                variant="ghost" 
                onClick={handleSignOut} 
                className="text-lg hover:text-primary transition-colors w-full justify-start px-2 py-3"
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
