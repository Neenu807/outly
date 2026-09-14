import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "@/shared/hooks/useAuth";
import PageLoader from "@/shared/components/PageLoader";

/**
 * Login, register and forgot-password make no sense to someone signed in.
 * It is also what completes a login: the moment the session exists, this sends
 * the member on to wherever they were originally headed.
 */
function GuestRoute() {
  const { user, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return <PageLoader label="Checking your session" />;
  }

  if (user) {
    return <Navigate to={location.state?.from?.pathname ?? "/"} replace />;
  }

  return <Outlet />;
}

export default GuestRoute;
