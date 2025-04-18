
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth();

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

  return <>{children}</>;
};

export default ProtectedRoute;
