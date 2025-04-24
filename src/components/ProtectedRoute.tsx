
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredRole?: 'admin';
};

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, user, isAdmin } = useAuth();

  console.log("ProtectedRoute check:", { 
    isAuthenticated, 
    loading, 
    isAdmin, 
    requiredRole,
    userId: user?.id
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log("Not authenticated, redirecting to auth page");
    return <Navigate to="/auth" />;
  }

  if (requiredRole && requiredRole === 'admin' && !isAdmin) {
    console.log("Admin role required but user is not admin");
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
