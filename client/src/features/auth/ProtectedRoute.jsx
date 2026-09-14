import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuth from "@/shared/hooks/useAuth";
import EmptyState from "@/shared/components/EmptyState";
import PageLoader from "@/shared/components/PageLoader";

/**
 * Gates a group of routes on a session, and optionally on a role.
 *
 * Decoration, not defence: it stops people clicking into a page that would
 * fail. A direct API call meets exactly the same server-side guards (§18).
 */
function ProtectedRoute({ role }) {
  const { user, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return <PageLoader label="Checking your session" />;
  }

  if (!user) {
    // Remember where they were headed, so login can send them back there.
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (role && user.role !== role) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <EmptyState
          title="You don't have access to this page"
          description="It's only available to administrators."
        />
      </main>
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
