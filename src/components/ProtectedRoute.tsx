
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { logEvent, generateRequestId } from "@/utils/logging";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredRole?: 'admin';
};

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, user, isAdmin, userRole } = useAuth();
  const [authChecked, setAuthChecked] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();
  const requestId = generateRequestId();
  
  // Prevent redirect loops by checking if we're already on the auth page
  const isAuthPage = location.pathname === "/auth" || location.pathname === "/auth2";

  console.log("ProtectedRoute check:", { 
    isAuthenticated, 
    loading, 
    isAdmin,
    requiredRole,
    userRole,
    userId: user?.id,
    path: location.pathname,
    isAuthPage,
    isMobile,
    authChecked,
    permissionChecked
  });

  // Log this access attempt for debugging
  useEffect(() => {
    logEvent({
      requestId,
      userId: user?.id,
      eventType: 'protected_route_access',
      component: 'ProtectedRoute',
      message: `Protected route access attempt: ${location.pathname}`,
      metadata: { 
        isAuthenticated, 
        isAdmin,
        requiredRole,
        userRole,
        path: location.pathname
      }
    });
  }, [user?.id, isAuthenticated, isAdmin, requiredRole, userRole, location.pathname, requestId]);

  // Wait for auth to be checked before making a decision
  useEffect(() => {
    if (!loading) {
      setAuthChecked(true);
      
      // Check permission after auth is confirmed
      if (isAuthenticated && requiredRole === 'admin') {
        // Small delay to ensure role data is loaded
        const timerId = setTimeout(() => {
          setPermissionChecked(true);
        }, 300);
        
        return () => clearTimeout(timerId);
      } else {
        setPermissionChecked(true);
      }
    }
  }, [loading, isAuthenticated, requiredRole]);

  // Show loading state while auth is being checked
  if (loading || !authChecked || (requiredRole === 'admin' && !permissionChecked)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // If not authenticated, redirect to auth - BUT only if not already on auth page
  if (!isAuthenticated && !isAuthPage) {
    console.log("Not authenticated, redirecting to auth page");
    logEvent({
      requestId,
      eventType: 'protected_route_redirect',
      component: 'ProtectedRoute',
      message: `Redirecting to auth from: ${location.pathname}`,
      metadata: { from: location.pathname }
    });
    
    // Add current path as state to redirect back after login
    return <Navigate to="/auth2" state={{ from: location.pathname }} />;
  }

  // If admin role is required but user is not admin
  if (requiredRole === 'admin' && !isAdmin) {
    console.log("Admin role required but user is not admin. User role:", userRole);
    logEvent({
      requestId,
      userId: user?.id,
      eventType: 'admin_access_denied',
      component: 'ProtectedRoute',
      message: 'Admin access denied',
      metadata: { userRole, path: location.pathname },
      severity: 'warning'
    });
    
    return (
      <div className="container mx-auto px-4 py-16 flex flex-col items-center">
        <Alert className="max-w-md" variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to access this page. Admin privileges are required.
          </AlertDescription>
        </Alert>
        
        <div className="mt-4 text-sm text-gray-500">
          <p>Current role: {userRole || 'Unknown'}</p>
          <p>If you believe this is an error, please contact support or try refreshing the page.</p>
        </div>
      </div>
    );
  }

  console.log("Access granted to protected route");
  return <>{children}</>;
};

export default ProtectedRoute;
