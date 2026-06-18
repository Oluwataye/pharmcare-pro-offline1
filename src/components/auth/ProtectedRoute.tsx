
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/lib/types";
import { usePermissions } from "@/hooks/usePermissions";
import { Spinner } from "@/components/ui/spinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
  adminOnly?: boolean;
}

const ProtectedRoute = ({ children, requiredPermission, adminOnly }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Spinner className="h-10 w-10 text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
