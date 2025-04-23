
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

const HamburgerMenu = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent>
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
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default HamburgerMenu;
