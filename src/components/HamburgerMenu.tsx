
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

const HamburgerMenu = () => {
  const { isAuthenticated, isAdmin, signOut } = useAuth();
  const isMobile = useIsMobile();
  
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className={isMobile ? "w-[85%]" : "w-[300px]"}>
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-4 mt-6">
          <Link 
            to="/" 
            className="text-lg hover:text-primary transition-colors"
          >
            Map
          </Link>
          {isAuthenticated && (
            <Link 
              to="/chat" 
              className="text-lg hover:text-primary transition-colors"
            >
              AI Chat
            </Link>
          )}
          {isAdmin && (
            <Link 
              to="/products" 
              className="text-lg hover:text-primary transition-colors"
            >
              Products
            </Link>
          )}
          <div className="mt-2 pt-2 border-t">
            {isAuthenticated && (
              <Button 
                variant="ghost" 
                onClick={signOut} 
                className="text-lg hover:text-primary transition-colors w-full justify-start px-0"
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
