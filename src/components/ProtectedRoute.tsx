
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredRole?: 'admin';
};

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, userRole } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
