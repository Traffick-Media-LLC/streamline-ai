
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredRole?: 'admin';
};

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, user, isAdmin, userRole, isGuest } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const location = useLocation();
  
  // Prevent redirect loops by checking if we're already on the auth page
  const isAuthPage = location.pathname === "/auth";

  console.log("ProtectedRoute check:", { 
    isAuthenticated, 
    loading, 
    isAdmin,
    isGuest,
    requiredRole,
    userRole,
    userId: user?.id,
    path: location.pathname,
    isAuthPage
  });

  // Wait for auth to be checked before making a decision
  useEffect(() => {
    if (!loading) {
      setAuthChecked(true);
    }
  }, [loading]);

  // Show loading state while auth is being checked
  if (loading || !authChecked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // If not authenticated (and not in guest mode), redirect to auth - BUT only if not already on auth page
  if (!isAuthenticated && !isGuest && !isAuthPage) {
    console.log("Not authenticated, redirecting to auth page");
    // Add current path as state to redirect back after login
    return <Navigate to="/auth" state={{ from: location.pathname }} />;
  }

  // If admin role is required but user is not admin
  if (requiredRole === 'admin' && !isAdmin) {
    console.log("Admin role required but user is not admin. User role:", userRole);
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center">
        <Alert className="max-w-md" variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access this page. Admin privileges are required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  console.log("Access granted to protected route");
  return <>{children}</>;
};

export default ProtectedRoute;
